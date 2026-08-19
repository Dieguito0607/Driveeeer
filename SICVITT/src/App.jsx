import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { useGeolocation } from './hooks/useGeolocation'
import { useWakeLock } from './hooks/useWakeLock'
import LoginCedula from './components/LoginCedula'
import BotonJornada from './components/BotonJornada'
import EstadoGPS from './components/EstadoGPS'
import OnboardingBateria from './components/OnboardingBateria'
import HistorialJornadas from './components/HistorialJornadas'
import PerfilConductor from './components/PerfilConductor'

const INTERVALO_MS = 1000

export default function App() {
  const [conductorInfo, setConductorInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('bustrack_conductorInfo')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [jornadaId, setJornadaId] = useState(() => localStorage.getItem('bustrack_jornadaId') || null)
  const [procesando, setProcesando] = useState(false)
  const [mensajeError, setMensajeError] = useState(null)
  const [puntosEnviados, setPuntosEnviados] = useState(0)

  // Registro del último ingreso a la app
  const [ultimoIngreso, setUltimoIngreso] = useState(() => {
    const guardado = localStorage.getItem('bustrack_ultimoIngreso')
    if (guardado) return guardado
    const fechaActual = new Date().toISOString()
    localStorage.setItem('bustrack_ultimoIngreso', fechaActual)
    return fechaActual
  })

  // Módulo activo: 'jornada' | 'perfil'
  const [moduloActivo, setModuloActivo] = useState('jornada')

  const jornadaActiva = jornadaId !== null
  const conductorId = conductorInfo?.id ?? null

  const { posicion, error: errorGPS, ultimaActualizacion } = useGeolocation(jornadaActiva, INTERVALO_MS)
  useWakeLock(jornadaActiva)

  const jornadaIdRef = useRef(jornadaId)

  useEffect(() => {
    jornadaIdRef.current = jornadaId
    if (jornadaId) localStorage.setItem('bustrack_jornadaId', jornadaId)
    else localStorage.removeItem('bustrack_jornadaId')
  }, [jornadaId])

  useEffect(() => {
    if (conductorInfo) localStorage.setItem('bustrack_conductorInfo', JSON.stringify(conductorInfo))
    else localStorage.removeItem('bustrack_conductorInfo')
  }, [conductorInfo])

  function handleLogin(info) {
    if (!info) {
      setConductorInfo(null)
      setJornadaId(null)
      return
    }
    const nuevaFecha = new Date().toISOString()
    localStorage.setItem('bustrack_ultimoIngreso', nuevaFecha)
    setUltimoIngreso(nuevaFecha)
    setConductorInfo(info)
  }

  async function iniciarJornada() {
    setMensajeError(null)
    if (!conductorId) { setMensajeError('Ingresa tu cédula primero.'); return }

    setProcesando(true)
    const { data, error } = await supabase
      .from('jornadas')
      .insert({ conductor_id: conductorId, activa: true })
      .select('id')
      .single()

    setProcesando(false)
    if (error) { setMensajeError(`No se pudo iniciar la jornada: ${error.message}`); return }
    setJornadaId(data.id)
    setPuntosEnviados(0)
  }

  async function finalizarJornada() {
    if (!jornadaId) return
    setMensajeError(null)
    setProcesando(true)
    const { error } = await supabase
      .from('jornadas')
      .update({ activa: false, finalizada_en: new Date().toISOString() })
      .eq('id', jornadaId)

    setProcesando(false)
    if (error) { setMensajeError(`No se pudo finalizar la jornada: ${error.message}`); return }
    setJornadaId(null)
  }

  useEffect(() => {
    if (!posicion || !jornadaIdRef.current) return
    const jid = jornadaIdRef.current
    let cancelado = false

    supabase.from('ubicaciones').insert({
      jornada_id: jid,
      lat: posicion.lat,
      lng: posicion.lng,
      velocidad: posicion.velocidad,
      precision_metros: posicion.precision_metros,
    }).then(({ error }) => {
      if (cancelado) return
      if (error) setMensajeError(`Error al guardar ubicación: ${error.message}`)
      else setPuntosEnviados((n) => n + 1)
    })

    return () => { cancelado = true }
  }, [posicion])

  // Formateador de fecha
// Formateador de fecha en formato 12 horas (AM/PM)
const formatearFechaIngreso = (isoString) => {
  if (!isoString) return ''
  const fecha = new Date(isoString)
  return fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true // <--- Cambia a formato 12 horas (am/pm)
  })
}

  return (
    <>
      <OnboardingBateria />
      <div className="app">
        <header className="app-header">
          {/* Columna Izquierda: Logos superpuestos/apilados */}
          <div className="header-col-left">
            <div className="header-logos-stack">
              <img 
                src="/ALCALDIA.png" 
                alt="Logo 1" 
                className="header-logo" 
              />
              <img 
                src="/IAMTIC.png" 
                alt="Logo 2" 
                className="header-logo" 
              />
            </div>
          </div>

          {/* Columna Central: Contenido Principal */}
          <div className="header-col-center">
            <div className="app-logo-container">
              <img src="/logo-app.png" alt="BusTrack Logo" className="app-logo-img" />
            </div>
            <h1>SICVITT</h1>
            <small>App del Conductor</small>
          </div>

          {/* Columna Derecha: Último ingreso */}
          <div className="header-col-right">
            <div className="header-ultimo-ingreso">
              <small>Último ingreso:</small>
              <strong>{formatearFechaIngreso(ultimoIngreso)}</strong>
            </div>
          </div>
          </header>

        <main className="app-main">
          {/* Pantalla de login si no hay conductor identificado */}
          {!conductorInfo ? (
            <LoginCedula
              onLogin={handleLogin}
              deshabilitado={false}
              conductorInfo={null}
            />
          ) : (
            <>
              {/* Encabezado con datos del usuario e identificador */}
              <LoginCedula
                onLogin={handleLogin}
                deshabilitado={jornadaActiva}
                conductorInfo={conductorInfo}
              />

              {/* Navegación por Módulos (Tabs) */}
              <nav className="modulos-nav">
                <button
                  className={`tab-btn ${moduloActivo === 'jornada' ? 'tab-btn--activo' : ''}`}
                  onClick={() => setModuloActivo('jornada')}
                >
                  📍 Jornadas
                </button>
                <button
                  className={`tab-btn ${moduloActivo === 'perfil' ? 'tab-btn--activo' : ''}`}
                  onClick={() => setModuloActivo('perfil')}
                >
                  👤 Datos Conductor
                </button>
              </nav>

              {mensajeError && <div className="estado estado--error">{mensajeError}</div>}

              {/* MÓDULO 1: JORNADA Y HISTORIAL */}
              {moduloActivo === 'jornada' && (
                <div className="modulo-contenido">
                  <BotonJornada
                    jornadaActiva={jornadaActiva}
                    onIniciar={iniciarJornada}
                    onFinalizar={finalizarJornada}
                    deshabilitado={false}
                    procesando={procesando}
                  />

                  {jornadaActiva && (
                    <EstadoGPS
                      posicion={posicion}
                      error={errorGPS}
                      ultimaActualizacion={ultimaActualizacion}
                      puntosEnviados={puntosEnviados}
                    />
                  )}

                  <HistorialJornadas
                    conductorId={conductorId}
                    jornadaActivaId={jornadaId}
                  />
                </div>
              )}

              {/* MÓDULO 2: DATOS DEL CONDUCTOR */}
              {moduloActivo === 'perfil' && (
                <div className="modulo-contenido">
                  <PerfilConductor conductorInfo={conductorInfo} />
                </div>
              )}
            </>
          )}
        </main>

        <footer className="app-footer">
          {jornadaActiva
            ? 'Jornada en curso — mantén la pantalla encendida'
            : conductorInfo
            ? 'Selecciona un módulo o inicia tu jornada'
            : 'Ingresa tu cédula para continuar'}
        </footer>
      </div>
    </>
  )
}