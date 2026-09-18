import { useEffect, useState, useRef, useCallback } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabaseClient';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

// ===== Filtros anti-jitter GPS =====
const PRECISION_MAX_METROS = 35;
const DISTANCIA_MINIMA_METROS = 5;
const SALTO_IMPOSIBLE_METROS = 300;

class KalmanFilter {
  constructor() {
    this.Q = 0.00001;
    this.R = 0.0001;
    this.P = 1;
    this.x = null;
  }

  filter(measurement) {
    if (this.x === null) {
      this.x = measurement;
      return measurement;
    }
    this.P = this.P + this.Q;
    const K = this.P / (this.P + this.R);
    this.x = this.x + K * (measurement - this.x);
    this.P = (1 - K) * this.P;
    return this.x;
  }

  reset() {
    this.P = 1;
    this.x = null;
  }
}

export function useBackgroundGeolocation(jornadaActiva, jornadaId, intervaloMs = 1500) {
  const [posicion, setPosicion] = useState(null);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [puntosEnviados, setPuntosEnviados] = useState(0);

  const kalmanLatRef = useRef(new KalmanFilter());
  const kalmanLngRef = useRef(new KalmanFilter());
  const ultimaPosEmitidaRef = useRef(null);
  const ultimaEmisionRef = useRef(0);

  function distanciaMetros(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  const procesarYEnviarUbicacion = useCallback(
    async (latCruda, lngCruda, velocidad, precision) => {
      // 1. Filtro de Precisión
      if (precision != null && precision > PRECISION_MAX_METROS) return;

      // 2. Filtro de Kalman
      const latFiltrada = kalmanLatRef.current.filter(latCruda);
      const lngFiltrada = kalmanLngRef.current.filter(lngCruda);

      const nuevaPos = {
        lat: latFiltrada,
        lng: lngFiltrada,
        velocidad: velocidad ?? 0,
        precision_metros: precision ?? 0,
      };

      // 3. Filtros de Distancia
      const ultima = ultimaPosEmitidaRef.current;
      if (ultima) {
        const dist = distanciaMetros(ultima.lat, ultima.lng, nuevaPos.lat, nuevaPos.lng);
        if (dist > SALTO_IMPOSIBLE_METROS || dist < DISTANCIA_MINIMA_METROS) return;
      }

      // 4. Throttle de tiempo
      const ahora = Date.now();
      if (ahora - ultimaEmisionRef.current < intervaloMs) return;

      ultimaEmisionRef.current = ahora;
      ultimaPosEmitidaRef.current = nuevaPos;

      setPosicion(nuevaPos);
      setUltimaActualizacion(new Date());

      // Inserción en Supabase
      const { error: errSupabase } = await supabase.from('ubicaciones').insert({
        jornada_id: jornadaId,
        lat: nuevaPos.lat,
        lng: nuevaPos.lng,
        velocidad: nuevaPos.velocidad,
        precision_metros: nuevaPos.precision_metros,
      });

      if (!errSupabase) {
        setError(null);
        setPuntosEnviados((prev) => prev + 1);
      } else {
        setError(`Error al guardar en Supabase: ${errSupabase.message}`);
      }
    },
    [jornadaId, intervaloMs]
  );

  useEffect(() => {
    if (!jornadaActiva || !jornadaId) {
      kalmanLatRef.current.reset();
      kalmanLngRef.current.reset();
      ultimaPosEmitidaRef.current = null;
      ultimaEmisionRef.current = 0;
      return;
    }

    // 💻 MODO WEB
    if (!Capacitor.isNativePlatform()) {
      if (!('geolocation' in navigator)) {
        setError('Navegador no soporta geolocalización.');
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          procesarYEnviarUbicacion(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.speed,
            pos.coords.accuracy
          );
        },
        (err) => setError(err.message),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }

    // 📱 MODO NATIVO (Capacitor Background Geolocation)
    let watcherId = null;

    const iniciarRastreoNativo = async () => {
      try {
        watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'SICVITT está registrando el recorrido en segundo plano.',
            backgroundTitle: 'Rastreo GPS Activo',
            requestPermissions: true,
            stale: false,
            distanceFilter: 5,
          },
          (location, err) => {
            if (err) {
              setError('Error capturando ubicación nativa.');
              return;
            }

            if (location) {
              procesarYEnviarUbicacion(
                location.latitude,
                location.longitude,
                location.speed,
                location.accuracy
              );
            }
          }
        );
      } catch (e) {
        setError('Error al iniciar el servicio GPS de segundo plano.');
      }
    };

    iniciarRastreoNativo();

    return () => {
      if (watcherId) {
        BackgroundGeolocation.removeWatcher({ id: watcherId });
      }
    };
  }, [jornadaActiva, jornadaId, procesarYEnviarUbicacion]);

  return { posicion, error, ultimaActualizacion, puntosEnviados };
}