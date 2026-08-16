import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Pantalla de login por cédula.
 * Llama a la función RPC segura de Supabase: nunca expone la tabla completa.
 *
 * Props:
 *  - onLogin: ({ id, nombre, apellido, linea_id, linea_nombre, linea_color, autobus_identificador }) => void
 *  - deshabilitado: boolean — true cuando ya hay jornada activa
 *  - conductorInfo: object | null — datos del conductor logueado
 */
export default function LoginCedula({ onLogin, deshabilitado, conductorInfo }) {
  const [cedula, setCedula] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const cedulaLimpia = cedula.trim()
    if (!cedulaLimpia) return

    setCargando(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('buscar_conductor_por_cedula', {
        cedula_input: cedulaLimpia,
      })

      if (rpcError) {
        console.error('Error RPC:', rpcError)
        setError('Error al conectar con el servidor. Intenta de nuevo.')
        setCargando(false)
        return
      }

      if (!data) {
        setError('Cédula no encontrada. Verifica el número o contacta a tu supervisor.')
        setCargando(false)
        return
      }

      // El RPC devuelve un objeto o array, normalizar
      const conductor = Array.isArray(data) ? data[0] : data
      
      if (!conductor) {
        setError('Cédula no encontrada. Verifica el número.')
        setCargando(false)
        return
      }

      // Llamar al callback con los datos del conductor
// Llamar al callback con los datos del conductor
onLogin({
  id: conductor.id,
  // Si la RPC no devuelve conductor.cedula, toma lo que el usuario escribió en el input:
  cedula: conductor.cedula || cedulaLimpia, 
  nombre: conductor.nombre,
  apellido: conductor.apellido || '',
  linea_id: conductor.linea_id,
  linea_nombre: conductor.linea_nombre,
  linea_color: conductor.linea_color || '#94a3b8',
  autobus_identificador: conductor.autobus_identificador,
})
    } catch (err) {
      console.error('Error inesperado:', err)
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  // Si ya está identificado, mostrar bienvenida
  if (conductorInfo) {
    return (
      <div className="bienvenida-card">
        <div className="bienvenida-avatar">👤</div>
        <div style={{ flex: 1 }}>
          <p className="bienvenida-label">Identificado como</p>
          <p className="bienvenida-nombre">{conductorInfo.nombre} {conductorInfo.apellido}</p>
          {conductorInfo.linea_nombre && (
            <p className="bienvenida-meta">
              <span
                className="bienvenida-punto"
                style={{ backgroundColor: conductorInfo.linea_color || '#94a3b8' }}
              />
              {conductorInfo.linea_nombre}
              {conductorInfo.autobus_identificador && (
                <span className="bienvenida-bus"> · 🚌 {conductorInfo.autobus_identificador}</span>
              )}
            </p>
          )}
        </div>
        {!deshabilitado && (
          <button
            className="btn-salir"
            onClick={() => onLogin(null)}
            title="Cambiar conductor"
          >
            ✕
          </button>
        )}
      </div>
    )
  }

  // Formulario de login
  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="campo">
        <span className="campo-label">Cédula de identidad</span>
        <input
          className="input-cedula"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Ingrese la cedula"
          value={cedula}
          onChange={(e) => {
            setError(null)
            setCedula(e.target.value.replace(/\D/g, ''))
          }}
          disabled={cargando}
          maxLength={10}
          autoComplete="off"
          autoFocus
        />
      </label>

      {error && <div className="estado estado--error">{error}</div>}

      <button
        type="submit"
        className="btn-login"
        disabled={cargando || cedula.trim().length < 5}
      >
        {cargando ? 'Verificando…' : 'Ingresar →'}
      </button>
    </form>
  )
}