/**
 * Backend para Flight Tracker - AR 1685 y AR 1484
 * Consulta APIs de vuelos en tiempo real
 */
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Configuración de APIs (puedes agregar tu API key aquí)
const AVIATIONSTACK_KEY = process.env.AVIATIONSTACK_KEY || '';
const AIRLABS_KEY = process.env.AIRLABS_KEY || '';

// Cache para no exceder límites de API
let flightCache = {};
let lastUpdate = null;
const CACHE_DURATION = 60000; // 1 minuto

/**
 * Obtiene datos de vuelo desde AirLabs API (tiene plan gratis)
 */
async function getFlightFromAirLabs(flightNumber) {
  if (!AIRLABS_KEY) return null;
  
  try {
    const response = await axios.get('https://airlabs.co/api/v9/flight', {
      params: {
        api_key: AIRLABS_KEY,
        flight_iata: flightNumber
      },
      timeout: 10000
    });
    
    if (response.data && response.data.response) {
      const f = response.data.response;
      return {
        flight_number: flightNumber,
        airline: 'Aerolíneas Argentinas',
        status: mapStatus(f.status),
        departure: {
          airport: f.dep_iata || 'N/A',
          city: f.dep_city || 'N/A',
          scheduled: f.dep_time || 'N/A',
          estimated: f.dep_estimated || f.dep_time || 'N/A',
          actual: f.dep_actual || null,
          terminal: f.dep_terminal || '-',
          gate: f.dep_gate || '-'
        },
        arrival: {
          airport: f.arr_iata || 'N/A',
          city: f.arr_city || 'N/A',
          scheduled: f.arr_time || 'N/A',
          estimated: f.arr_estimated || f.arr_time || 'N/A',
          actual: f.arr_actual || null,
          terminal: f.arr_terminal || '-',
          gate: f.arr_gate || '-'
        },
        aircraft: f.aircraft_icao || 'N/A',
        live: f.lat ? {
          latitude: f.lat,
          longitude: f.lng,
          altitude: f.alt,
          speed: f.speed,
          heading: f.dir
        } : null,
        source: 'airlabs'
      };
    }
  } catch (error) {
    console.error('AirLabs API error:', error.message);
  }
  return null;
}

/**
 * Obtiene datos de vuelo desde AviationStack API
 */
async function getFlightFromAviationStack(flightNumber) {
  if (!AVIATIONSTACK_KEY) return null;
  
  try {
    const response = await axios.get('http://api.aviationstack.com/v1/flights', {
      params: {
        access_key: AVIATIONSTACK_KEY,
        flight_iata: flightNumber
      },
      timeout: 10000
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const f = response.data.data[0];
      return {
        flight_number: flightNumber,
        airline: f.airline?.name || 'Aerolíneas Argentinas',
        status: mapStatus(f.flight_status),
        departure: {
          airport: f.departure?.iata || 'N/A',
          city: f.departure?.airport || 'N/A',
          scheduled: f.departure?.scheduled || 'N/A',
          estimated: f.departure?.estimated || f.departure?.scheduled || 'N/A',
          actual: f.departure?.actual || null,
          terminal: f.departure?.terminal || '-',
          gate: f.departure?.gate || '-'
        },
        arrival: {
          airport: f.arrival?.iata || 'N/A',
          city: f.arrival?.airport || 'N/A',
          scheduled: f.arrival?.scheduled || 'N/A',
          estimated: f.arrival?.estimated || f.arrival?.scheduled || 'N/A',
          actual: f.arrival?.actual || null,
          terminal: f.arrival?.terminal || '-',
          gate: f.arrival?.gate || '-'
        },
        aircraft: f.aircraft?.registration || 'N/A',
        live: f.live ? {
          latitude: f.live.latitude,
          longitude: f.live.longitude,
          altitude: f.live.altitude,
          speed: f.live.speed_horizontal,
          heading: f.live.direction
        } : null,
        source: 'aviationstack'
      };
    }
  } catch (error) {
    console.error('AviationStack API error:', error.message);
  }
  return null;
}

/**
 * Mapea estados de vuelo a español
 */
function mapStatus(status) {
  const statusMap = {
    'scheduled': 'Programado',
    'active': 'En vuelo',
    'en-route': 'En vuelo',
    'landed': 'Aterrizó',
    'arrived': 'Llegó',
    'cancelled': 'Cancelado',
    'diverted': 'Desviado',
    'delayed': 'Demorado',
    'boarding': 'Embarcando',
    'departed': 'Despegó'
  };
  return statusMap[status?.toLowerCase()] || status || 'Desconocido';
}

/**
 * Genera datos simulados para demo (cuando no hay API key)
 */
function getSimulatedFlight(flightNumber) {
  const now = new Date();
  const flights = {
    'AR1685': {
      flight_number: 'AR1685',
      airline: 'Aerolíneas Argentinas',
      status: 'En vuelo',
      departure: {
        airport: 'EZE',
        city: 'Buenos Aires - Ezeiza',
        scheduled: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        estimated: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        actual: new Date(now.getTime() - 1.9 * 60 * 60 * 1000).toISOString(),
        terminal: 'A',
        gate: '12'
      },
      arrival: {
        airport: 'MIA',
        city: 'Miami International',
        scheduled: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
        estimated: new Date(now.getTime() + 5.8 * 60 * 60 * 1000).toISOString(),
        actual: null,
        terminal: 'N',
        gate: '42'
      },
      aircraft: 'Boeing 737-800',
      live: {
        latitude: -15.5,
        longitude: -47.8,
        altitude: 35000,
        speed: 890,
        heading: 340
      },
      source: 'demo'
    },
    'AR1484': {
      flight_number: 'AR1484',
      airline: 'Aerolíneas Argentinas',
      status: 'Programado',
      departure: {
        airport: 'AEP',
        city: 'Buenos Aires - Aeroparque',
        scheduled: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        estimated: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        actual: null,
        terminal: 'A',
        gate: '5'
      },
      arrival: {
        airport: 'COR',
        city: 'Córdoba - Pajas Blancas',
        scheduled: new Date(now.getTime() + 4.5 * 60 * 60 * 1000).toISOString(),
        estimated: new Date(now.getTime() + 4.5 * 60 * 60 * 1000).toISOString(),
        actual: null,
        terminal: '-',
        gate: '-'
      },
      aircraft: 'Embraer E190',
      live: null,
      source: 'demo'
    }
  };
  
  return flights[flightNumber] || null;
}

/**
 * Obtiene información de un vuelo
 */
async function getFlightInfo(flightNumber) {
  // Intentar APIs reales primero
  let flight = await getFlightFromAirLabs(flightNumber);
  if (!flight) {
    flight = await getFlightFromAviationStack(flightNumber);
  }
  
  // Si no hay APIs configuradas, usar datos simulados
  if (!flight) {
    flight = getSimulatedFlight(flightNumber);
  }
  
  return flight;
}

// API Endpoints
app.get('/api/flights', async (req, res) => {
  const now = Date.now();
  
  // Usar cache si es reciente
  if (lastUpdate && (now - lastUpdate) < CACHE_DURATION && Object.keys(flightCache).length > 0) {
    return res.json({
      flights: Object.values(flightCache),
      lastUpdate: new Date(lastUpdate).toISOString(),
      cached: true
    });
  }
  
  try {
    const flightNumbers = ['AR1685', 'AR1484'];
    const flights = await Promise.all(
      flightNumbers.map(fn => getFlightInfo(fn))
    );
    
    flightCache = {};
    flights.filter(Boolean).forEach(f => {
      flightCache[f.flight_number] = f;
    });
    lastUpdate = now;
    
    res.json({
      flights: Object.values(flightCache),
      lastUpdate: new Date(lastUpdate).toISOString(),
      cached: false
    });
  } catch (error) {
    console.error('Error fetching flights:', error);
    res.status(500).json({ error: 'Error al obtener datos de vuelos' });
  }
});

app.get('/api/flight/:flightNumber', async (req, res) => {
  try {
    const flight = await getFlightInfo(req.params.flightNumber.toUpperCase());
    if (flight) {
      res.json(flight);
    } else {
      res.status(404).json({ error: 'Vuelo no encontrado' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener datos del vuelo' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    apis: {
      airlabs: AIRLABS_KEY ? 'configured' : 'not configured',
      aviationstack: AVIATIONSTACK_KEY ? 'configured' : 'not configured'
    }
  });
});

// Serve React app for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛫 Flight Tracker server running on http://localhost:${PORT}`);
  console.log(`APIs configured: AirLabs=${!!AIRLABS_KEY}, AviationStack=${!!AVIATIONSTACK_KEY}`);
  if (!AIRLABS_KEY && !AVIATIONSTACK_KEY) {
    console.log('⚠️  No API keys configured - using simulated data');
  }
});
