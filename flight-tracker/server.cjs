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
