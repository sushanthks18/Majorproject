// Calculate distance between two coordinates using Haversine formula
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => {
  return (value * Math.PI) / 180;
};

// Get user's current location
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    
    console.log('🌍 Requesting location...');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        console.log('✅ Location captured:', { lat, lng });
        
        // Try to get address using reverse geocoding
        let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          
          if (response.ok) {
            const data = await response.json();
            address = data.display_name || address;
            console.log('📍 Address:', address);
          }
        } catch (error) {
          console.log('ℹ️ Using coordinates as address');
        }
        
        resolve({
          lat,
          lng,
          address
        });
      },
      (error) => {
        console.error('❌ Location error:', error);
        
        let errorMessage = 'Unable to capture location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your GPS/WiFi.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location.';
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

// Format date to readable string
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Service labels
export const serviceLabels = {
  plowing: 'Plowing',
  sowing: 'Sowing',
  irrigation: 'Irrigation',
  spraying: 'Spraying',
  harvesting: 'Harvesting',
  weeding: 'Weeding',
  fertilizing: 'Fertilizing',
  pestControl: 'Pest Control'
};

// Status colors
export const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800'
};
