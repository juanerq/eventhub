/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get user's current position using Geolocation API
 * @returns Promise with coordinates {latitude, longitude} or null if denied/unavailable
 */
export function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Geocode an address to coordinates using Nominatim (OpenStreetMap)
 * Uses structured search for better accuracy in Colombia
 * @param address Full address string
 * @param city City name (optional, improves accuracy)
 * @param country Country name (defaults to Colombia)
 * @returns Promise with coordinates or null
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  country: string = 'Colombia'
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // If address is too generic (single word, common place name), prioritize city
    const isGenericAddress = address.split(/\s+/).length <= 2 && 
      /^(parque|plaza|iglesia|centro|estadio|colegio|escuela|hospital)$/i.test(address.trim());

    // Strategy 1: If generic term + city, search "term city country"
    if (isGenericAddress && city) {
      const cityContextResult = await geocodeWithCityContext(address, city, country);
      if (cityContextResult) return cityContextResult;
    }

    // Strategy 2: Try structured search first (more accurate)
    if (city && !isGenericAddress) {
      const structuredResult = await geocodeStructured(address, city, country);
      if (structuredResult) return structuredResult;
    }

    // Strategy 3: Try full address with country code
    const fullAddress = city 
      ? `${address}, ${city}, ${country}`
      : `${address}, ${country}`;
    
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json` +
      `&q=${encodedAddress}` +
      `&countrycodes=co` + // Limit to Colombia
      `&addressdetails=1` + // Get detailed address info
      `&limit=1`,
      {
        headers: {
          'User-Agent': 'EventHub/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }

    // Strategy 4: Fallback to city-only search if full address fails
    if (city && address) {
      const cityOnlyResult = await geocodeCityOnly(city, country);
      if (cityOnlyResult) return cityOnlyResult;
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Geocode with city context for generic terms (e.g., "parque" in "Calarca")
 * @param term Generic place term
 * @param city City name
 * @param country Country name
 * @returns Promise with coordinates or null
 */
async function geocodeWithCityContext(
  term: string,
  city: string,
  country: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Search for "term" in "city, country" with bounded search
    const searchQuery = `${term} ${city} ${country}`;
    const params = new URLSearchParams({
      format: 'json',
      q: searchQuery,
      countrycodes: 'co',
      addressdetails: '1',
      bounded: '1', // Prioritize results in bounded area
      limit: '1'
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'EventHub/1.0',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      
      // Validate that result is actually in the specified city
      const resultCity = result.address?.city || 
                         result.address?.town || 
                         result.address?.municipality ||
                         result.address?.village;
      
      if (resultCity && resultCity.toLowerCase().includes(city.toLowerCase())) {
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('City context geocoding error:', error);
    return null;
  }
}

/**
 * Geocode using structured search (more accurate)
 * @param street Street address
 * @param city City name
 * @param country Country name
 * @returns Promise with coordinates or null
 */
async function geocodeStructured(
  street: string,
  city: string,
  country: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      street: street,
      city: city,
      country: country,
      countrycodes: 'co',
      addressdetails: '1',
      limit: '1'
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'EventHub/1.0',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error('Structured geocoding error:', error);
    return null;
  }
}

/**
 * Geocode city only (fallback when full address fails)
 * @param city City name
 * @param country Country name
 * @returns Promise with coordinates or null
 */
async function geocodeCityOnly(
  city: string,
  country: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      city: city,
      country: country,
      countrycodes: 'co',
      limit: '1'
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'EventHub/1.0',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error('City geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address using Nominatim
 * @param latitude Latitude
 * @param longitude Longitude
 * @returns Promise with address string or null
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'User-Agent': 'EventHub/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed');
    }

    const data = await response.json();

    if (data && data.display_name) {
      return data.display_name;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to structured address
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with structured address data or null
 */
export async function reverseGeocodeDetailed(
  latitude: number,
  longitude: number
): Promise<{
  displayName: string;
  address: string;
  city: string;
  locationName: string;
} | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'EventHub/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed');
    }

    const data = await response.json();

    if (data && data.address) {
      const addr = data.address;
      
      // Debug: log address data to understand structure
      console.log('Reverse geocode data:', {
        full: data.display_name,
        address: addr,
        name: data.name
      });
      
      // Extract street address (road, street, or house number + road)
      const road = addr.road || addr.street || '';
      const houseNumber = addr.house_number || '';
      const address = houseNumber && road ? `${road} ${houseNumber}` : road;

      // Extract city (try multiple fields with expanded priority)
      // Prioritize municipality and town over generic county
      const city = addr.municipality || addr.city || addr.town || addr.village || 
                   addr.hamlet || addr.locality || '';

      // Extract location name (prioritize specific POIs, avoid generic suburb/neighbourhood names)
      // Only use name if it's a specific amenity, tourism spot, or building
      let locationName = '';
      if (addr.amenity || addr.tourism || addr.shop || addr.leisure) {
        // If it's a POI (restaurant, park, shop, etc.), use the name
        locationName = data.name || '';
      } else if (addr.building && data.name && data.name !== addr.road) {
        // If it's a named building (not just the street name), use it
        locationName = data.name;
      }
      // Don't use suburb, neighbourhood, or quarter as location name

      return {
        displayName: data.display_name || '',
        address: address,
        city: city,
        locationName: locationName,
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
