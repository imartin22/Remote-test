/**
 * Vercel Serverless Function - Flight API
 * Consulta AviationStack para vuelos de Aerolíneas Argentinas
 */

const AVIATIONSTACK_KEY = process.env.AVIATIONSTACK_KEY;

const ROUTES_TO_MONITOR = [
  { dep: 'BRC', arr: 'AEP', name: 'Bariloche → Aeroparque' },
  { dep: 'AEP', arr: 'TUC', name: 'Aeroparque → Tucumán' }
];

const TARGET_DATE = '2026-02-02';
const AIRLINE = 'AR';

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

async function getFlightsByRoute(depIata, arrIata) {
  if (!AVIATIONSTACK_KEY) return [];
  
  try {
    const url = new URL('http://api.aviationstack.com/v1/flights');
    url.searchParams.set('access_key', AVIATIONSTACK_KEY);
    url.searchParams.set('dep_iata', depIata);
    url.searchParams.set('arr_iata', arrIata);
    url.searchParams.set('airline_iata', AIRLINE);
    url.searchParams.set('limit', '50');
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data && data.data) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      return data.data
        .filter(f => {
          const flightDate = f.flight_date;
          return flightDate === today || flightDate === tomorrow || flightDate === TARGET_DATE;
        })
        .map(f => ({
          flight_number: f.flight.iata,
          airline: f.airline?.name || 'Aerolíneas Argentinas',
          status: mapStatus(f.flight_status),
          flight_date: f.flight_date,
          departure: {
            airport: f.departure?.iata || depIata,
            city: f.departure?.airport || depIata,
            scheduled: f.departure?.scheduled || null,
            estimated: f.departure?.estimated || f.departure?.scheduled || null,
            actual: f.departure?.actual || null,
            delay: f.departure?.delay || null,
            terminal: f.departure?.terminal || '-',
            gate: f.departure?.gate || '-'
          },
          arrival: {
            airport: f.arrival?.iata || arrIata,
            city: f.arrival?.airport || arrIata,
            scheduled: f.arrival?.scheduled || null,
            estimated: f.arrival?.estimated || f.arrival?.scheduled || null,
            actual: f.arrival?.actual || null,
            delay: f.arrival?.delay || null,
            terminal: f.arrival?.terminal || '-',
            gate: f.arrival?.gate || '-'
          },
          aircraft: f.aircraft?.iata || f.aircraft?.icao || 'N/A',
          live: f.live ? {
            latitude: f.live.latitude,
            longitude: f.live.longitude,
            altitude: f.live.altitude,
            speed: f.live.speed_horizontal,
            heading: f.live.direction
          } : null,
          source: 'aviationstack',
          route: `${depIata} → ${arrIata}`
        }));
    }
  } catch (error) {
    console.error(`Error fetching route ${depIata}-${arrIata}:`, error.message);
  }
  return [];
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Cache por 5 minutos en Vercel Edge
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  
  try {
    if (!AVIATIONSTACK_KEY) {
      return res.status(500).json({ 
        error: 'API key not configured',
        flights: [],
        apiStatus: { configured: false }
      });
    }
    
    // Obtener vuelos de todas las rutas
    const allFlights = [];
    for (const route of ROUTES_TO_MONITOR) {
      const flights = await getFlightsByRoute(route.dep, route.arr);
      allFlights.push(...flights);
    }
    
    // Ordenar por fecha y hora de salida
    allFlights.sort((a, b) => {
      const dateA = new Date(a.departure.scheduled || 0);
      const dateB = new Date(b.departure.scheduled || 0);
      return dateA - dateB;
    });
    
    return res.status(200).json({
      flights: allFlights,
      routes: ROUTES_TO_MONITOR,
      targetDate: TARGET_DATE,
      lastUpdate: new Date().toISOString(),
      apiStatus: {
        configured: true,
        remainingToday: 'N/A (serverless)'
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error fetching flights',
      flights: [],
      message: error.message
    });
  }
}
