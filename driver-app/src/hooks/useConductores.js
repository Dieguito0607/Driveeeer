import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Hook que carga la lista de conductores activos desde la tabla `conductores`.
 * Se ejecuta una sola vez al montar el componente.
 */
export function useConductores() {
  const [conductores, setConductores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      const { data, error } = await supabase
        .from('conductores')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (cancelado) return

      if (error) {
        setError(error.message)
      } else {
        setConductores(data ?? [])
      }
      setCargando(false)
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [])

  return { conductores, cargando, error }
}
