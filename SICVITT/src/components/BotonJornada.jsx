/**
 * Botón grande de iniciar / finalizar jornada.
 *
 * Props:
 *  - jornadaActiva: boolean
 *  - onIniciar: () => void
 *  - onFinalizar: () => void
 *  - deshabilitado: boolean (ej: conductor no seleccionado)
 *  - procesando: boolean (petición en curso)
 */
export default function BotonJornada({
  jornadaActiva,
  onIniciar,
  onFinalizar,
  deshabilitado,
  procesando,
}) {
  const activo = jornadaActiva

  return (
    <button
      className={`btn-jornada ${activo ? 'btn-jornada--activa' : ''}`}
      onClick={activo ? onFinalizar : onIniciar}
      disabled={deshabilitado || procesando}
    >
      {procesando ? (
        <span>Procesando…</span>
      ) : activo ? (
        <>
          <span className="btn-jornada-punto">⏺</span> FINALIZAR JORNADA
        </>
      ) : (
        <>▶ INICIAR JORNADA</>
      )}
    </button>
  )
}
