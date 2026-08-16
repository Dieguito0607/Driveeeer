/**
 * Muestra el estado del GPS y de la última posición recibida.
 *
 * Props:
 *  - posicion: { lat, lng, velocidad, precision_metros } | null
 *  - error: { code, mensaje } | null
 *  - ultimaActualizacion: Date | null
 *  - puntosEnviados: number
 */
export default function EstadoGPS({ posicion, error, ultimaActualizacion, puntosEnviados }) {
  if (error) {
    return (
      <div className="estado estado--error">
        <strong>⚠ {error.mensaje}</strong>
      </div>
    )
  }

  if (!posicion) {
    return (
      <div className="estado">
        <span className="estado-spinner" /> Esperando señal del GPS…
      </div>
    )
  }

  const hora = ultimaActualizacion
    ? ultimaActualizacion.toLocaleTimeString('es-VE')
    : '--:--:--'

  const velocidadKmh =
    posicion.velocidad != null && posicion.velocidad >= 0
      ? (posicion.velocidad * 3.6).toFixed(1)
      : null

  return (
    <div className="estado estado--ok">
      <div className="estado-fila">
        <span className="estado-check">✓</span>
        <strong>GPS activo</strong>
      </div>
      <div className="estado-grid">
        <div>
          <small>Latitud</small>
          <span>{posicion.lat.toFixed(5)}</span>
        </div>
        <div>
          <small>Longitud</small>
          <span>{posicion.lng.toFixed(5)}</span>
        </div>
        <div>
          <small>Precisión</small>
          <span>±{posicion.precision_metros?.toFixed(0) ?? '--'} m</span>
        </div>
        <div>
          <small>Velocidad</small>
          <span>{velocidadKmh != null ? `${velocidadKmh} km/h` : '--'}</span>
        </div>
        <div>
          <small>Última lectura</small>
          <span>{hora}</span>
        </div>
        <div>
          <small>Puntos enviados</small>
          <span>{puntosEnviados}</span>
        </div>
      </div>
    </div>
  )
}
