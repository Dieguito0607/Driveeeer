import { useEffect, useRef, useState, useCallback } from 'react'

// ===== Filtros anti-jitter GPS =====
const PRECISION_MAX_METROS = 35
const DISTANCIA_MINIMA_METROS = 5   // 5m: detecta movimiento lento en tráfico denso
const SALTO_IMPOSIBLE_METROS = 300

// ===== Filtro de Kalman para suavizar el ruido del GPS =====
// Mismo algoritmo que usa Google Maps / Waze para el punto azul.
// Predice dónde debería estar el vehículo y combina esa predicción
// con la lectura real del GPS para eliminar los saltos bruscos.
class KalmanFilter {
  constructor() {
    // Q: ruido del proceso (qué tanto puede cambiar la posición real entre muestras).
    // Un valor pequeño = el filtro confía más en la predicción y suaviza más.
    this.Q = 0.00001
    // R: ruido de la medición (incertidumbre del sensor GPS).
    // Un valor mayor = el filtro desconfía más del GPS crudo y suaviza más.
    this.R = 0.0001
    // P: covarianza del error de estimación (empieza alta — no sabemos nada)
    this.P = 1
    // x: estimación actual del estado (null = sin inicializar)
    this.x = null
  }

  filter(measurement) {
    // Primera lectura: inicializar directamente
    if (this.x === null) {
      this.x = measurement
      return measurement
    }

    // --- Paso de Predicción ---
    // El modelo asume que la posición no cambia sola (velocidad no modelada),
    // pero el error de estimación crece por el ruido del proceso.
    this.P = this.P + this.Q

    // --- Paso de Actualización ---
    // Kalman Gain: ¿cuánto peso le damos a la nueva medición vs nuestra predicción?
    const K = this.P / (this.P + this.R)
    // Actualizar la estimación combinando predicción y medición
    this.x = this.x + K * (measurement - this.x)
    // Reducir la covarianza del error
    this.P = (1 - K) * this.P

    return this.x
  }

  reset() {
    this.P = 1
    this.x = null
  }
}

/**
 * Hook que captura la ubicación GPS continuamente usando navigator.geolocation.watchPosition.
 *
 * Características:
 * - Solo se activa cuando `activo` es true (mientras hay jornada activa).
 * - Throttle: solo emite una nueva posición cada `intervaloMs` milisegundos.
 * - Filtros anti-jitter:
 *   1) Descarta lecturas con precisión > PRECISION_MAX_METROS
 *   2) Descarta lecturas que no superen DISTANCIA_MINIMA_METROS desde la última emitida
 *   3) Descarta saltos imposibles (> SALTO_IMPOSIBLE_METROS en poco tiempo)
 * - Filtro de Kalman: suaviza el ruido residual del GPS en lat y lng.
 *
 * @param {boolean} activo - si true, comienza a escuchar el GPS; si false, se detiene.
 * @param {number} intervaloMs - intervalo mínimo entre emisiones de posición.
 */
export function useGeolocation(activo = false, intervaloMs = 1500) {
  const [posicion, setPosicion] = useState(null)
  const [error, setError] = useState(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const [descartadas, setDescartadas] = useState(0)

  const watchIdRef = useRef(null)
  const ultimaEmisionRef = useRef(0)
  const ultimaPosEmitidaRef = useRef(null)

  // Dos instancias de Kalman: una para latitud y otra para longitud
  const kalmanLatRef = useRef(new KalmanFilter())
  const kalmanLngRef = useRef(new KalmanFilter())

  // Distancia entre dos puntos GPS (fórmula de Haversine, en metros)
  function distanciaMetros(lat1, lng1, lat2, lng2) {
    const R = 6371000
    const toRad = (deg) => (deg * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(a))
  }

  const onSuccess = useCallback(
    (pos) => {
      const cruda = pos.coords

      // ===== FILTRO 1: precisión =====
      if (cruda.accuracy != null && cruda.accuracy > PRECISION_MAX_METROS) {
        setDescartadas((n) => n + 1)
        return
      }

      // ===== FILTRO DE KALMAN: suavizar lat y lng =====
      // Se aplica ANTES de los filtros de distancia para que la posición
      // filtrada sea la que se compara y la que se guarda.
      const latFiltrada = kalmanLatRef.current.filter(cruda.latitude)
      const lngFiltrada = kalmanLngRef.current.filter(cruda.longitude)

      const nuevaPos = {
        lat: latFiltrada,
        lng: lngFiltrada,
        velocidad: cruda.speed,
        precision_metros: cruda.accuracy,
      }

      // ===== FILTROS 2 y 3: comparar con la última emitida =====
      const ultima = ultimaPosEmitidaRef.current
      if (ultima) {
        const dist = distanciaMetros(ultima.lat, ultima.lng, nuevaPos.lat, nuevaPos.lng)

        // Salto imposible → error GPS, descartar
        if (dist > SALTO_IMPOSIBLE_METROS) {
          setDescartadas((n) => n + 1)
          return
        }

        // No se movió lo suficiente → descartar (anti-jitter)
        if (dist < DISTANCIA_MINIMA_METROS) {
          setDescartadas((n) => n + 1)
          return
        }
      }

      // ===== Throttle de tiempo =====
      const ahora = Date.now()
      if (ahora - ultimaEmisionRef.current < intervaloMs) {
        return
      }

      // Pasó todos los filtros → emitir posición suavizada
      ultimaEmisionRef.current = ahora
      ultimaPosEmitidaRef.current = nuevaPos
      setPosicion(nuevaPos)
      setUltimaActualizacion(new Date())
    },
    [intervaloMs]
  )

  const onError = useCallback((err) => {
    setError({
      code: err.code,
      mensaje:
        err.code === 1
          ? 'Permiso de ubicación denegado. Actívalo en los ajustes del navegador.'
          : err.code === 2
          ? 'Ubicación no disponible. Revisa que el GPS esté encendido.'
          : err.code === 3
          ? 'El GPS tardó demasiado en responder.'
          : 'Error desconocido del GPS.',
    })
  }, [])

  // Iniciar / detener watcher según `activo`
  useEffect(() => {
    if (!activo) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!('geolocation' in navigator)) {
      setError({ code: -1, mensaje: 'Este dispositivo/navegador no soporta geolocalización.' })
      return
    }

    setError(null)

    const options = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 30000,
    }

    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, options)

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [activo, onSuccess, onError])

  // Reset cuando se desactiva (incluyendo los filtros de Kalman)
  useEffect(() => {
    if (!activo) {
      ultimaEmisionRef.current = 0
      ultimaPosEmitidaRef.current = null
      kalmanLatRef.current.reset()
      kalmanLngRef.current.reset()
    }
  }, [activo])

  const limpiarError = useCallback(() => setError(null), [])

  return { posicion, error, ultimaActualizacion, descartadas, limpiarError }
}
