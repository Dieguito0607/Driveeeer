import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAutobuses() {
  const [autobuses, setAutobuses] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('autobuses')
        .select('id, identificador, lineas(nombre)')
        .eq('activo', true)
        .order('identificador')

      if (error) {
        setError(error.message)
      } else {
        setAutobuses(data || [])
      }
      setCargando(false)
    }
    cargar()
  }, [])

  return { autobuses, cargando, error }
}
