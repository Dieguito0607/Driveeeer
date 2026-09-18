import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Muestra una tabla con el historial de jornadas iniciadas y finalizadas del conductor.
 *
 * Props:
 *  - conductorId: string
 *  - jornadaActivaId: string | null (para refrescar cuando cambie)
 */
export default function HistorialJornadas({ conductorId, jornadaActivaId }) {
  const [jornadas, setJornadas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarHistorial = useCallback(async () => {
    if (!conductorId) {
      setJornadas([])
      setCargando(false)
      return
    }
    
    setCargando(true)
    setError(null)

    try {
      // Usamos 'created_at' que es el campo que se llena automáticamente al insertar
      const { data, error: err } = await supabase
        .from('jornadas')
        .select('id, created_at, iniciada_en, finalizada_en, activa')
        .eq('conductor_id', conductorId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (err) {
        console.error('Error detallado de Supabase:', err)
        setError(`Error: ${err.message}`)
      } else {
        console.log('📋 Jornadas cargadas:', data) // Debug
        setJornadas(data || [])
      }
    } catch (err) {
      console.error('Error inesperado:', err)
      setError('Error al cargar el historial')
    } finally {
      setCargando(false)
    }
  }, [conductorId])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial, jornadaActivaId])

  function formatearFecha(fechaIso) {
    if (!fechaIso) return '—'
    try {
      const d = new Date(fechaIso)
      return d.toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return fechaIso
    }
  }

  if (!conductorId) {
    return null
  }

  return (
    <div className="historial-card">
      <div className="historial-header">
        <h3>📋 Historial de Jornadas</h3>
        <button className="btn-refrescar" onClick={cargarHistorial} title="Actualizar">
          🔄
        </button>
      </div>

      {cargando ? (
        <p className="estado-linea">Cargando historial…</p>
      ) : error ? (
        <div className="estado estado--error">{error}</div>
      ) : jornadas.length === 0 ? (
        <p className="historial-vacio">No hay jornadas registradas aún.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla-jornadas">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Finalización</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {jornadas.map((j) => {
                // Usar created_at o iniciada_en como fecha de inicio
                const fechaInicio = j.created_at || j.iniciada_en
                return (
                  <tr key={j.id} className={j.activa ? 'fila-activa' : ''}>
                    <td>{formatearFecha(fechaInicio)}</td>
                    <td>{j.activa ? '—' : formatearFecha(j.finalizada_en)}</td>
                    <td>
                      <span className={`badge ${j.activa ? 'badge--activa' : 'badge--finalizada'}`}>
                        {j.activa ? '🟢 Activa' : '✅ Finalizada'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}