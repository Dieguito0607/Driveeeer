import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { useBackgroundGeolocation } from './hooks/useBackgroundGeolocation'
import { useWakeLock } from './hooks/useWakeLock'
import LoginCedula from './components/LoginCedula'
import BotonJornada from './components/BotonJornada'
import EstadoGPS from './components/EstadoGPS'
import OnboardingBateria from './components/OnboardingBateria'
import HistorialJornadas from './components/HistorialJornadas'
import PerfilConductor from './components/PerfilConductor'

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

  const jornadaActiva = Boolean(jornadaId && conductorInfo)
  const conductorId = conductorInfo?.id ?? null

  // 📍 HOOK DE SEGUNDO PLANO: Rastreo continuo e inserción directa en Supabase
  const { posicion, error: errorGPS, ultimaActualizacion, puntosEnviados } = useBackgroundGeolocation(
    jornadaActiva, 
    jornadaId
  )

  // Mantiene encendida la pantalla en primer plano
  useWakeLock(jornadaActiva)

  useEffect(() => {
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
    try {
      const { data, error } = await supabase
        .from('jornadas')
        .insert({ conductor_id: conductorId, activa: true })
        .select('id')
        .single()

      if (error) throw error
      setJornadaId(data.id)
    } catch (err) {
      setMensajeError(`No se pudo iniciar la jornada: ${err.message || 'Error de conexión'}`)
    } finally {
      setProcesando(false)
    }
  }

  async function finalizarJornada() {
    if (!jornadaId) return
    setMensajeError(null)
    setProcesando(true)
    try {
      const { error } = await supabase
        .from('jornadas')
        .update({ activa: false, finalizada_en: new Date().toISOString() })
        .eq('id', jornadaId)

      if (error) throw error
      setJornadaId(null)
    } catch (err) {
      setMensajeError(`No se pudo finalizar la jornada: ${err.message || 'Error de conexión'}`)
    } finally {
      setProcesando(false)
    }
  }

  const formatearFechaIngreso = (isoString) => {
    if (!isoString) return ''
    const fecha = new Date(isoString)
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <>
      <OnboardingBateria />
      <div className="app">
        <header className="app-header">
          <div className="header-col-left">
            <div className="header-logos-stack">
              <img src="/ALCALDIA.png" alt="Logo Alcaldía" className="header-logo" />
              <img src="/IAMTIC.png" alt="Logo IAMTIC" className="header-logo" />
            </div>
          </div>

          <div className="header-col-center">
            <div className="app-logo-container">
              <img src="/logo-app.png" alt="BusTrack Logo" className="app-logo-img" />
            </div>
            <h1>SICVITT</h1>
            <small>App del Conductor</small>
          </div>

          <div className="header-col-right">
            <div className="header-ultimo-ingreso">
              <small>Último ingreso:</small>
              <strong>{formatearFechaIngreso(ultimoIngreso)}</strong>
            </div>
          </div>
        </header>

        <main className="app-main">
          {!conductorInfo ? (
            <LoginCedula
              onLogin={handleLogin}
              deshabilitado={false}
              conductorInfo={null}
            />
          ) : (
            <>
              <LoginCedula
                onLogin={handleLogin}
                deshabilitado={jornadaActiva}
                conductorInfo={conductorInfo}
              />

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
            ? 'Jornada en curso — rastreo en segundo plano activo'
            : conductorInfo
            ? 'Selecciona un módulo o inicia tu jornada'
            : 'Ingresa tu cédula para continuar'}
        </footer>
      </div>
    </>
  )
}