import { useEffect, useRef } from 'react'

export function useWakeLock(activo) {
  const wakeLockRef = useRef(null)

  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
          console.log('Screen Wake Lock is active')
        }
      } catch (err) {
        console.error(`WakeLock error: ${err.name}, ${err.message}`)
      }
    }

    if (activo) {
      requestWakeLock()
    } else {
      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }

    // El sistema operativo libera el bloqueo cuando minimizas la app, 
    // así que debemos solicitarlo de nuevo cuando el conductor vuelva a la app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activo) {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }
  }, [activo])
}
