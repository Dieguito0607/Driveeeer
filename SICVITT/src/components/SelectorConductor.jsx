import { useConductores } from '../hooks/useConductores'

/**
 * Dropdown para elegir conductor (sin login).
 * Muestra "Nombre — BUS-XXX" y emite el id del conductor seleccionado hacia el padre.
 *
 * Props:
 *  - conductorId: string | null
 *  - onChange: (id) => void
 *  - deshabilitado: boolean (true cuando hay jornada activa)
 */
export default function SelectorConductor({ conductorId, onChange, deshabilitado }) {
  const { conductores, cargando, error } = useConductores()

  if (cargando) {
    return <p className="estado-linea">Cargando conductores…</p>
  }

  if (error) {
    return (
      <div className="estado-error">
        <strong>No se pudo cargar la lista de conductores.</strong>
        <br />
        <small>{error}</small>
      </div>
    )
  }

  if (conductores.length === 0) {
    return (
      <div className="estado-error">
        No hay conductores registrados. Inserta alguno en Supabase (tabla <code>conductores</code>).
      </div>
    )
  }

  return (
    <label className="campo">
      <span className="campo-label">Conductor</span>
      <select
        className="select"
        value={conductorId ?? ''}
        disabled={deshabilitado}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="" disabled>
          — Selecciona tu nombre —
        </option>
        {conductores.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}
