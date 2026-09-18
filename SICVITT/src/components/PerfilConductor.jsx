/**
 * Muestra el módulo con los datos detallados del conductor.
 *
 * Props:
 *  - conductorInfo: { id, nombre, apellido, cedula, linea_nombre, linea_color, autobus_identificador }
 */
export default function PerfilConductor({ conductorInfo }) {
  if (!conductorInfo) return null

  // Evaluamos únicamente el campo 'cedula' proveniente de Supabase
  const cedulaRaw = conductorInfo.cedula || conductorInfo.cedula_identidad || conductorInfo.ci

  // Formateador con puntos de miles (ej: 28.123.456)
  const formatearCedula = (val) => {
    if (!val) return null
    const num = String(val).replace(/\D/g, '')
    return num ? new Intl.NumberFormat('es-VE').format(num) : null
  }

  const cedulaFormateada = formatearCedula(cedulaRaw)

  return (
    <div className="perfil-card">
      <div className="perfil-header">
        <div className="perfil-avatar">👤</div>
        <h2>{conductorInfo.nombre} {conductorInfo.apellido}</h2>
        <span className="badge badge--conductor">Conductor Registrado</span>
      </div>

      <div className="perfil-detalles">
        <div className="perfil-item">
          <small>Cédula de Identidad</small>
          <strong>
            {cedulaFormateada
              ? `V- ${cedulaFormateada}`
              : 'No posee cédula'}
          </strong>
        </div>

        <div className="perfil-item">
          <small>Línea / Ruta Asignada</small>
          <strong>
            {conductorInfo.linea_nombre ? (
              <>
                <span
                  className="bienvenida-punto"
                  style={{ backgroundColor: conductorInfo.linea_color || '#0b3d91' }}
                />
                {' '}{conductorInfo.linea_nombre}
              </>
            ) : (
              'Sin línea asignada'
            )}
          </strong>
        </div>

        <div className="perfil-item">
          <small>Unidad / Autobús</small>
          <strong>
            {conductorInfo.autobus_identificador
              ? `🚌 ${conductorInfo.autobus_identificador}`
              : 'Sin unidad asignada'}
          </strong>
        </div>
      </div>
    </div>
  )
}