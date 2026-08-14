import { useAutobuses } from '../hooks/useAutobuses'

export default function SelectorAutobus({ autobusId, onChange, deshabilitado }) {
  const { autobuses, cargando, error } = useAutobuses()

  if (cargando) {
    return <p className="estado-linea">Cargando autobuses…</p>
  }

  if (error) {
    return (
      <div className="estado-error">
        <strong>No se pudo cargar la lista de autobuses.</strong>
        <br />
        <small>{error}</small>
      </div>
    )
  }

  if (autobuses.length === 0) {
    return (
      <div className="estado-error">
        No hay autobuses registrados. Inserta alguno en Supabase (tabla <code>autobuses</code>).
      </div>
    )
  }

  return (
    <label className="campo">
      <span className="campo-label">Autobús</span>
      <select
        className="select"
        value={autobusId ?? ''}
        disabled={deshabilitado}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="" disabled>
          — Selecciona tu autobús —
        </option>
        {autobuses.map((a) => (
          <option key={a.id} value={a.id}>
            {a.identificador} ({a.lineas?.nombre})
          </option>
        ))}
      </select>
    </label>
  )
}
