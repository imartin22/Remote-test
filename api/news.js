/**
 * Vercel Serverless Function - News API
 * Busca noticias sobre paros en Google News RSS
 */

const NEWS_KEYWORDS = [
  'paro ATE',
  'paro aeropuertos argentina',
  'huelga aerolineas argentinas',
  'paro aeronavegantes'
];

async function parseRSS(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // Simple RSS parser
    const items = [];
    const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    for (const itemXml of itemMatches.slice(0, 5)) {
      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
      
      items.push({ title, link, pubDate });
    }
    
    return items;
  } catch (error) {
    console.error('Error parsing RSS:', error);
    return [];
  }
}

function extractSource(title) {
  if (!title) return 'Desconocido';
  const match = title.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : 'Desconocido';
}

function cleanTitle(title) {
  if (!title) return '';
  return title.replace(/ - [^-]+$/, '').trim();
}

function calculateRelevance(news) {
  const title = news.title.toLowerCase();
  let score = 0;
  
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

async function searchGoogleNews(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=es-419&gl=AR&ceid=AR:es-419`;
  
  const items = await parseRSS(url);
  
  return items.map(item => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    source: extractSource(item.title),
    query: query
  }));
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Cache por 5 minutos
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  
  try {
    // Buscar con diferentes keywords
    const allResults = await Promise.all(
      NEWS_KEYWORDS.map(keyword => searchGoogleNews(keyword))
    );
    
    // Aplanar y deduplicar
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
    
    // Ordenar por fecha (más nuevas primero)
    allNews.sort((a, b) => {
      const dateA = new Date(a.pubDate);
      const dateB = new Date(b.pubDate);
      if (dateB - dateA !== 0) return dateB - dateA;
      return b.relevance - a.relevance;
    });
    
    return res.status(200).json({
      news: allNews.slice(0, 10),
      lastUpdate: new Date().toISOString(),
      keywords: NEWS_KEYWORDS
    });
    
  } catch (error) {
    console.error('Error fetching news:', error);
    return res.status(500).json({ 
      error: 'Error fetching news',
      news: [],
      message: error.message
    });
  }
}
