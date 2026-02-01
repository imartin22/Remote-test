/**
 * Backend para Flight Tracker - AR 1685 y AR 1484
 * Consulta APIs de vuelos en tiempo real
 * Incluye seguimiento de noticias sobre paros
 */
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const Parser = require('rss-parser');

const app = express();
const PORT = 5000;
const rssParser = new Parser({
  customFields: {
    item: ['source']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Configuración de APIs
const AVIATIONSTACK_KEY = process.env.AVIATIONSTACK_KEY || '50dc6b7b80c96d901a18fd169ebf32c0';
const AIRLABS_KEY = process.env.AIRLABS_KEY || '';

// ============== SISTEMA DE CACHE INTELIGENTE ==============
// Con 100 consultas/mes, necesitamos ~3 consultas/día máximo
// Estrategia: Cache de 30 minutos + límite diario de consultas

let flightCache = {};
let lastUpdate = null;
let apiCallsToday = 0;
let lastApiCallDate = new Date().toDateString();

// Cache de 30 minutos para datos de API real
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

// Uso temporal: 50 llamadas por día (tienes 100/mes y solo usarás 2 días)
const MAX_DAILY_API_CALLS = 50;

// Estadísticas de uso
let apiStats = {
  totalCalls: 0,
  lastReset: new Date().toISOString(),
  callHistory: []
};

/**
 * Verifica si podemos hacer una llamada a la API
 */
function canMakeApiCall() {
  const today = new Date().toDateString();
  
  // Reset contador si es un nuevo día
  if (lastApiCallDate !== today) {
    apiCallsToday = 0;
    lastApiCallDate = today;
  }
  
  return apiCallsToday < MAX_DAILY_API_CALLS;
}

/**
 * Registra una llamada a la API
 */
function registerApiCall() {
  apiCallsToday++;
  apiStats.totalCalls++;
  apiStats.callHistory.push({
    timestamp: new Date().toISOString(),
    remaining: MAX_DAILY_API_CALLS - apiCallsToday
  });
  
  // Mantener solo últimas 50 entradas
  if (apiStats.callHistory.length > 50) {
    apiStats.callHistory = apiStats.callHistory.slice(-50);
  }
  
  console.log(`📊 API Call #${apiStats.totalCalls} - Remaining today: ${MAX_DAILY_API_CALLS - apiCallsToday}/${MAX_DAILY_API_CALLS}`);
}

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

// ============== CONFIGURACIÓN DE RUTAS A MONITOREAR ==============
const ROUTES_TO_MONITOR = [
  { dep: 'BRC', arr: 'AEP', name: 'Bariloche → Aeroparque' },
  { dep: 'AEP', arr: 'TUC', name: 'Aeroparque → Tucumán' }
];

const TARGET_DATE = '2026-02-02'; // Fecha de los vuelos a monitorear
const AIRLINE = 'AR'; // Aerolíneas Argentinas

/**
 * Obtiene todos los vuelos de una ruta desde AviationStack
 */
async function getFlightsByRoute(depIata, arrIata) {
  if (!AVIATIONSTACK_KEY) return [];
  
  try {
    const response = await axios.get('http://api.aviationstack.com/v1/flights', {
      params: {
        access_key: AVIATIONSTACK_KEY,
        dep_iata: depIata,
        arr_iata: arrIata,
        airline_iata: AIRLINE,
        limit: 50
      },
      timeout: 15000
    });
    
    registerApiCall();
    
    if (response.data && response.data.data) {
      return response.data.data
        .filter(f => {
          // Filtrar por fecha (hoy y mañana)
          const flightDate = f.flight_date;
          const today = new Date().toISOString().split('T')[0];
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
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

/**
 * Obtiene todos los vuelos de todas las rutas monitoreadas
 */
async function getAllRouteFlights(forceRefresh = false) {
  const now = Date.now();
  const cacheKey = 'all_routes';
  
  // Verificar cache
  if (!forceRefresh && flightCache[cacheKey]) {
    const cacheAge = now - flightCache[cacheKey].timestamp;
    if (cacheAge < CACHE_DURATION) {
      console.log(`📦 Cache hit for routes (age: ${Math.round(cacheAge/1000)}s)`);
      return {
        flights: flightCache[cacheKey].data,
        fromCache: true,
        cacheAge: Math.round(cacheAge / 1000)
      };
    }
  }
  
  // Verificar si podemos hacer llamadas a la API
  if (!canMakeApiCall()) {
    console.log('⚠️ Daily API limit reached');
    if (flightCache[cacheKey]) {
      return {
        flights: flightCache[cacheKey].data,
        fromCache: true,
        limitReached: true
      };
    }
    return { flights: [], limitReached: true };
  }
  
  console.log('🔄 Fetching flights from API...');
  
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
  
  // Guardar en cache
  flightCache[cacheKey] = {
    data: allFlights,
    timestamp: now
  };
  
  console.log(`✅ Cached ${allFlights.length} flights from ${ROUTES_TO_MONITOR.length} routes`);
  
  return { flights: allFlights, fromCache: false };
}

/**
 * Obtiene información de un vuelo (con cache inteligente)
 */
async function getFlightInfo(flightNumber, forceRefresh = false) {
  // Verificar cache primero
  const cached = flightCache[flightNumber];
  const now = Date.now();
  
  if (cached && !forceRefresh) {
    const cacheAge = now - cached.timestamp;
    if (cacheAge < CACHE_DURATION) {
      console.log(`📦 Cache hit for ${flightNumber} (age: ${Math.round(cacheAge/1000)}s)`);
      return { ...cached.data, fromCache: true, cacheAge: Math.round(cacheAge/1000) };
    }
  }
  
  // Si no podemos hacer llamadas a la API, usar cache viejo o simulado
  if (!canMakeApiCall() && !forceRefresh) {
    console.log(`⚠️ Daily API limit reached, using cached/simulated data for ${flightNumber}`);
    if (cached) {
      return { ...cached.data, fromCache: true, limitReached: true };
    }
    return { ...getSimulatedFlight(flightNumber), limitReached: true };
  }
  
  // Intentar APIs reales
  let flight = null;
  
  if (AIRLABS_KEY) {
    flight = await getFlightFromAirLabs(flightNumber);
  }
  
  if (!flight && AVIATIONSTACK_KEY) {
    flight = await getFlightFromAviationStack(flightNumber);
    if (flight) {
      registerApiCall(); // Solo contar llamadas exitosas a AviationStack
    }
  }
  
  // Si no hay datos de API, usar simulados
  if (!flight) {
    flight = getSimulatedFlight(flightNumber);
  } else {
    // Guardar en cache
    flightCache[flightNumber] = {
      data: flight,
      timestamp: now
    };
    console.log(`✅ Cached ${flightNumber} from ${flight.source}`);
  }
  
  return flight;
}

// API Endpoints
app.get('/api/flights', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  
  try {
    const result = await getAllRouteFlights(forceRefresh);
    
    if (!result.fromCache && result.flights.length > 0) {
      lastUpdate = Date.now();
    }
    
    res.json({
      flights: result.flights,
      routes: ROUTES_TO_MONITOR,
      targetDate: TARGET_DATE,
      lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null,
      fromCache: result.fromCache || false,
      cacheAge: result.cacheAge || null,
      apiStatus: {
        callsToday: apiCallsToday,
        maxDaily: MAX_DAILY_API_CALLS,
        remainingToday: MAX_DAILY_API_CALLS - apiCallsToday,
        cacheDuration: CACHE_DURATION / 60000 + ' minutos',
        canRefresh: canMakeApiCall(),
        limitReached: result.limitReached || false
      }
    });
  } catch (error) {
    console.error('Error fetching flights:', error);
    res.status(500).json({ error: 'Error al obtener datos de vuelos' });
  }
});

// Endpoint para forzar refresh (usa llamadas de API)
app.get('/api/flights/refresh', async (req, res) => {
  if (!canMakeApiCall()) {
    return res.status(429).json({ 
      error: 'Límite diario de API alcanzado',
      remainingToday: 0,
      nextReset: 'mañana'
    });
  }
  
  try {
    const result = await getAllRouteFlights(true);
    lastUpdate = Date.now();
    
    res.json({
      flights: result.flights,
      routes: ROUTES_TO_MONITOR,
      lastUpdate: new Date(lastUpdate).toISOString(),
      message: `Datos actualizados: ${result.flights.length} vuelos encontrados`,
      apiStatus: {
        callsToday: apiCallsToday,
        remainingToday: MAX_DAILY_API_CALLS - apiCallsToday
      }
    });
  } catch (error) {
    console.error('Error refreshing flights:', error);
    res.status(500).json({ error: 'Error al actualizar vuelos' });
  }
});

// Endpoint de estadísticas de API
app.get('/api/stats', (req, res) => {
  res.json({
    apiStats,
    today: {
      calls: apiCallsToday,
      remaining: MAX_DAILY_API_CALLS - apiCallsToday,
      limit: MAX_DAILY_API_CALLS
    },
    cache: {
      duration: CACHE_DURATION / 60000 + ' minutos',
      flights: Object.keys(flightCache).length,
      lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null
    },
    config: {
      aviationstack: AVIATIONSTACK_KEY ? 'configured' : 'not configured',
      airlabs: AIRLABS_KEY ? 'configured' : 'not configured',
      monthlyLimit: 100,
      recommendedDaily: MAX_DAILY_API_CALLS
    }
  });
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

// ============== NOTICIAS SOBRE PAROS ==============

// Cache para noticias
let newsCache = [];
let newsLastUpdate = null;
const NEWS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Keywords para buscar noticias relevantes
const NEWS_KEYWORDS = [
  'paro ATE',
  'paro aeropuertos argentina',
  'huelga aerolineas argentinas',
  'paro aeronavegantes',
  'paro APLA',
  'paro pilotos argentina',
  'cancelacion vuelos argentina',
  'demora vuelos ezeiza',
  'paro trabajadores aereos'
];

/**
 * Busca noticias en Google News RSS
 */
async function searchGoogleNews(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=es-419&gl=AR&ceid=AR:es-419`;
    
    const feed = await rssParser.parseURL(url);
    
    return feed.items.slice(0, 5).map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      source: extractSource(item.title),
      snippet: item.contentSnippet || item.content || '',
      query: query
    }));
  } catch (error) {
    console.error(`Error fetching news for "${query}":`, error.message);
    return [];
  }
}

/**
 * Extrae el nombre de la fuente del título de Google News
 */
function extractSource(title) {
  if (!title) return 'Desconocido';
  const match = title.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : 'Desconocido';
}

/**
 * Limpia el título removiendo la fuente
 */
function cleanTitle(title) {
  if (!title) return '';
  return title.replace(/ - [^-]+$/, '').trim();
}

/**
 * Calcula la relevancia de una noticia
 */
function calculateRelevance(news) {
  const title = news.title.toLowerCase();
  let score = 0;
  
  // Palabras de alta relevancia
  const highRelevance = ['paro', 'huelga', 'cancelacion', 'cancelan', 'suspenden'];
  const mediumRelevance = ['demora', 'afecta', 'vuelos', 'aeropuerto', 'aerolineas'];
  const contextRelevance = ['ate', 'apla', 'ezeiza', 'aeroparque', 'argentina'];
  
  highRelevance.forEach(word => {
    if (title.includes(word)) score += 10;
  });
  
  mediumRelevance.forEach(word => {
    if (title.includes(word)) score += 5;
  });
  
  contextRelevance.forEach(word => {
    if (title.includes(word)) score += 3;
  });
  
  // Bonus por fecha reciente
  const pubDate = new Date(news.pubDate);
  const now = new Date();
  const hoursAgo = (now - pubDate) / (1000 * 60 * 60);
  
  if (hoursAgo < 6) score += 15;
  else if (hoursAgo < 24) score += 10;
  else if (hoursAgo < 48) score += 5;
  
  return score;
}

/**
 * Obtiene y procesa todas las noticias
 */
async function fetchAllNews() {
  const now = Date.now();
  
  // Usar cache si es reciente
  if (newsLastUpdate && (now - newsLastUpdate) < NEWS_CACHE_DURATION && newsCache.length > 0) {
    return { news: newsCache, cached: true, lastUpdate: new Date(newsLastUpdate).toISOString() };
  }
  
  console.log('Fetching news from Google News RSS...');
  
  // Buscar con diferentes keywords
  const allResults = await Promise.all(
    NEWS_KEYWORDS.slice(0, 4).map(keyword => searchGoogleNews(keyword))
  );
  
  // Aplanar y deduplicar por título
  const seenTitles = new Set();
  let allNews = [];
  
  allResults.flat().forEach(news => {
    const cleanedTitle = cleanTitle(news.title);
    if (!seenTitles.has(cleanedTitle) && cleanedTitle.length > 10) {
      seenTitles.add(cleanedTitle);
      allNews.push({
        ...news,
        title: cleanedTitle,
        relevance: calculateRelevance({ ...news, title: cleanedTitle })
      });
    }
  });
  
  // Ordenar por relevancia y fecha
  allNews.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return new Date(b.pubDate) - new Date(a.pubDate);
  });
  
  // Limitar a las 10 más relevantes
  newsCache = allNews.slice(0, 10);
  newsLastUpdate = now;
  
  return { 
    news: newsCache, 
    cached: false, 
    lastUpdate: new Date(newsLastUpdate).toISOString(),
    keywords: NEWS_KEYWORDS
  };
}

// Endpoint de noticias
app.get('/api/news', async (req, res) => {
  try {
    const result = await fetchAllNews();
    res.json(result);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Error al obtener noticias', news: [] });
  }
});

// Endpoint para buscar noticias con query personalizado
app.get('/api/news/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Se requiere parámetro q' });
  }
  
  try {
    const news = await searchGoogleNews(query);
    res.json({ 
      news: news.map(n => ({ ...n, title: cleanTitle(n.title) })),
      query 
    });
  } catch (error) {
    console.error('Error searching news:', error);
    res.status(500).json({ error: 'Error al buscar noticias' });
  }
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
