'use client'

import { useState, useEffect } from 'react'
import { getCurrentLocation, LocationData } from '@/lib/geolocation'

export function useGeolocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const locationData = await getCurrentLocation()
      if (locationData) {
        setLocation(locationData)
      } else {
        setError('Could not get location')
      }
    } catch (err) {
      setError('Failed to get location')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-request location on mount
  useEffect(() => {
    requestLocation()
  }, [])

  return {
    location,
    loading,
    error,
    requestLocation
  }
}