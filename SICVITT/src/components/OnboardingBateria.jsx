import { useState } from 'react'

const CLAVE_LS = 'bustrack:onboarding_visto'

/**
 * Muestra una sola vez (localStorage) las instrucciones para excluir la app
 * de la optimización agresiva de batería en Xiaomi/MIUI, Huawei, Samsung.
 * Es crítica para que el tracking no se corte cuando la pantalla se apaga.
 *
 * Props:
 *  - onCerrar: () => void
 */
export default function OnboardingBateria({ onCerrar }) {
  const [visto, setVisto] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_LS) === '1'
    } catch {
      return false
    }
  })

  if (visto) return null

  function cerrar() {
    try {
      localStorage.setItem(CLAVE_LS, '1')
    } catch {
      /* ignore */
    }
    setVisto(true)
    onCerrar?.()
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <h2>🔋 Antes de empezar</h2>
        <p>
          Tu teléfono (especialmente si es <strong>Xiaomi, Huawei o Samsung</strong>) puede
          <strong> pausar la app </strong>y cortar el envío de ubicación, aunque la pantalla
          esté encendida.
        </p>
        <p>Para evitarlo, haz lo siguiente <strong>una sola vez</strong>:</p>
        <ol>
          <li>
            Ve a <strong>Ajustes → Apps → BusTrack (o Chrome)</strong>
          </li>
          <li>
            Busca <strong>“Optimización de batería”</strong> o <strong>“Uso de batería en segundo plano”</strong>
          </li>
          <li>
            Selecciona <strong>“Sin restricciones”</strong> o <strong>“No optimizar”</strong>
          </li>
        </ol>
        <p className="onboarding-tip">
          💡 Recomendado: mantén la pantalla encendida mientras dure la jornada. Puedes
          bajar el brillo para ahorrar batería.
        </p>
        <button className="btn-jornada" onClick={cerrar}>
          Entendido
        </button>
      </div>
    </div>
  )
}
