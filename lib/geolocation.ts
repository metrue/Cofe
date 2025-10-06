export interface LocationData {
  latitude: number
  longitude: number
  city?: string
  street?: string
}

export async function getCurrentLocation(): Promise<LocationData | null> {
  if (!navigator.geolocation) {
    console.log('Geolocation is not supported by this browser')
    return null
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      })
    })

    const { latitude, longitude } = position.coords
    
    // Reverse geocoding using Nominatim (OpenStreetMap)
    const locationDetails = await reverseGeocode(latitude, longitude)
    
    return {
      latitude,
      longitude,
      city: locationDetails?.city,
      street: locationDetails?.street
    }
  } catch (error) {
    console.error('Error getting location:', error)
    return null
  }
}

interface GeocodeResult {
  city?: string
  street?: string
}

async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Cofe Blog App'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to reverse geocode')
    }

    const data = await response.json()
    
    // Extract city and street from the response
    const address = data.address || {}
    const city = address.city || address.town || address.village || address.municipality || address.county || ''
    const street = address.road || address.street || address.highway || ''

    return {
      city: city,
      street: street
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}