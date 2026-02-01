import { useState, useEffect } from 'react'
import './App.css'

function formatRelativeTime(isoString) {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `hace ${diffMins} min`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays < 7) return `hace ${diffDays}d`
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

function formatTime(isoString) {
  if (!isoString || isoString === 'N/A') return '-'
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return isoString
  }
}

function formatDate(isoString) {
  if (!isoString || isoString === 'N/A') return '-'
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

function getStatusColor(status) {
  const colors = {
    'En vuelo': '#22c55e',
    'Programado': '#3b82f6',
    'Aterrizó': '#10b981',
    'Llegó': '#10b981',
    'Demorado': '#f59e0b',
    'Cancelado': '#ef4444',
    'Desviado': '#f97316',
    'Embarcando': '#8b5cf6',
    'Despegó': '#22c55e'
  }
  return colors[status] || '#6b7280'
}

function getStatusIcon(status) {
  const icons = {
    'En vuelo': '✈️',
    'Programado': '🕐',
    'Aterrizó': '🛬',
    'Llegó': '✅',
    'Demorado': '⏳',
    'Cancelado': '❌',
    'Desviado': '↩️',
    'Embarcando': '🚶',
    'Despegó': '🛫'
  }
  return icons[status] || '❓'
}

function NewsCard({ news }) {
  if (!news) return null
  
  const getRelevanceColor = (relevance) => {
    if (relevance >= 20) return '#ef4444' // Rojo - muy relevante
    if (relevance >= 10) return '#f59e0b' // Amarillo - relevante
    return '#6b7280' // Gris - normal
  }
  
  const getRelevanceLabel = (relevance) => {
    if (relevance >= 20) return '🚨 Urgente'
    if (relevance >= 10) return '⚠️ Importante'
    return '📰 Info'
  }
  
  return (
    <a 
      href={news.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="news-card"
    >
      <div className="news-header">
        <span 
          className="news-relevance"
          style={{ backgroundColor: getRelevanceColor(news.relevance) }}
        >
          {getRelevanceLabel(news.relevance)}
        </span>
        <span className="news-time">{formatRelativeTime(news.pubDate)}</span>
      </div>
      <h3 className="news-title">{news.title}</h3>
      <div className="news-footer">
        <span className="news-source">{news.source}</span>
        <span className="news-link-icon">↗</span>
      </div>
    </a>
  )
}

function NewsSection({ news, loading, onRefresh }) {
  return (
    <div className="news-section">
      <div className="news-section-header">
        <h2>
          <span className="section-icon">📢</span>
          Alertas de Paros y Disrupciones
        </h2>
        <button onClick={onRefresh} className="refresh-btn-small" disabled={loading}>
          {loading ? '⏳' : '🔄'}
        </button>
      </div>
      
      <p className="news-subtitle">
        Monitoreando: paro ATE, huelgas aeropuertos, cancelaciones
      </p>
      
      {loading && news.length === 0 ? (
        <div className="news-loading">Buscando noticias...</div>
      ) : news.length === 0 ? (
        <div className="news-empty">
          ✅ No hay alertas de paros activas
        </div>
      ) : (
        <div className="news-grid">
          {news.map((item, index) => (
            <NewsCard key={index} news={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function formatFlightDate(isoString) {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString('es-AR', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short' 
    })
  } catch {
    return ''
  }
}

function FlightCard({ flight, isHighlighted }) {
  if (!flight) return null
  
  const statusColor = getStatusColor(flight.status)
  const statusIcon = getStatusIcon(flight.status)
  
  // Verificar si es uno de los vuelos objetivo
  const isTargetFlight = flight.flight_number === 'AR1685' || flight.flight_number === 'AR1484'
  
  return (
    <div className={`flight-card ${isHighlighted ? 'highlighted' : ''} ${isTargetFlight ? 'target-flight' : ''}`}>
      <div className="flight-header">
        <div className="flight-number">
          <span className="airline-logo">🇦🇷</span>
          <div>
            <h2>{flight.flight_number}</h2>
            <span className="airline-name">{flight.airline}</span>
            {isTargetFlight && <span className="your-flight-badge">✨ Tu vuelo</span>}
          </div>
        </div>
        <div className="flight-status" style={{ backgroundColor: statusColor }}>
          <span className="status-icon">{statusIcon}</span>
          <span>{flight.status}</span>
        </div>
      </div>
      
      <div className="flight-date-badge">
        📅 {formatFlightDate(flight.departure?.scheduled)} 
        {flight.departure?.delay && <span className="delay-badge">⚠️ +{flight.departure.delay} min</span>}
      </div>
      
      <div className="flight-route">
        <div className="airport departure">
          <div className="airport-code">{flight.departure.airport}</div>
          <div className="airport-city">{flight.departure.city}</div>
          <div className="time-info">
            <div className="time-scheduled">
              <span className="label">Programado</span>
              <span className="time">{formatTime(flight.departure.scheduled)}</span>
            </div>
            {flight.departure.actual && (
              <div className="time-actual">
                <span className="label">Real</span>
                <span className="time">{formatTime(flight.departure.actual)}</span>
              </div>
            )}
          </div>
          <div className="gate-info">
            <span>Terminal {flight.departure.terminal}</span>
            <span>Gate {flight.departure.gate}</span>
          </div>
        </div>
        
        <div className="route-line">
          <div className="plane-icon">✈️</div>
          <div className="dashed-line"></div>
          {flight.live && (
            <div className="live-info">
              <span>Alt: {flight.live.altitude?.toLocaleString() || '-'} ft</span>
              <span>Vel: {flight.live.speed || '-'} km/h</span>
            </div>
          )}
        </div>
        
        <div className="airport arrival">
          <div className="airport-code">{flight.arrival.airport}</div>
          <div className="airport-city">{flight.arrival.city}</div>
          <div className="time-info">
            <div className="time-scheduled">
              <span className="label">Programado</span>
              <span className="time">{formatTime(flight.arrival.scheduled)}</span>
            </div>
            <div className="time-estimated">
              <span className="label">Estimado</span>
              <span className="time">{formatTime(flight.arrival.estimated)}</span>
            </div>
          </div>
          <div className="gate-info">
            <span>Terminal {flight.arrival.terminal}</span>
            <span>Gate {flight.arrival.gate}</span>
          </div>
        </div>
      </div>
      
      <div className="flight-footer">
        <span className="aircraft">🛩️ {flight.aircraft}</span>
        <span className="date">{formatDate(flight.departure.scheduled)}</span>
        {flight.source === 'demo' && (
          <span className="demo-badge">Demo</span>
        )}
      </div>
    </div>
  )
}

function ApiStatus({ status }) {
  if (!status) return null
  
  const getStatusColor = () => {
    if (status.remainingToday === 0) return '#ef4444'
    if (status.remainingToday <= 1) return '#f59e0b'
    return '#22c55e'
  }
  
  return (
    <div className="api-status">
      <div className="api-status-badge" style={{ backgroundColor: getStatusColor() }}>
        <span>API: {status.remainingToday}/{status.maxDaily} hoy</span>
      </div>
      {status.remainingToday === 0 && (
        <span className="api-warning">⚠️ Límite alcanzado - usando cache</span>
      )}
    </div>
  )
}

function App() {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [apiStatus, setApiStatus] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Estado para noticias
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)

  const fetchFlights = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    try {
      const url = forceRefresh ? '/api/flights/refresh' : '/api/flights'
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 429) {
          setError('Límite diario de API alcanzado')
          return
        }
        throw new Error('Error al cargar vuelos')
      }
      const data = await response.json()
      setFlights(data.flights || [])
      setApiStatus(data.apiStatus)
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchNews = async () => {
    setNewsLoading(true)
    try {
      const response = await fetch('/api/news')
      if (!response.ok) throw new Error('Error al cargar noticias')
      const data = await response.json()
      setNews(data.news || [])
    } catch (err) {
      console.error('Error fetching news:', err)
    } finally {
      setNewsLoading(false)
    }
  }

  useEffect(() => {
    fetchFlights()
    fetchNews()
    
    if (autoRefresh) {
      // Vuelos: refrescar cada 5 minutos (usa cache, no consume API)
      const flightInterval = setInterval(() => fetchFlights(false), 5 * 60000)
      // Noticias: cada 5 minutos
      const newsInterval = setInterval(fetchNews, 5 * 60000)
      return () => {
        clearInterval(flightInterval)
        clearInterval(newsInterval)
      }
    }
  }, [autoRefresh])
  
  const handleForceRefresh = () => {
    if (apiStatus && apiStatus.remainingToday === 0) {
      setError('Límite diario alcanzado. Intenta mañana.')
      return
    }
    fetchFlights(true)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>
            <span className="header-icon">🛫</span>
            Flight Tracker
          </h1>
          <p className="subtitle">Aerolíneas Argentinas - Estado en tiempo real</p>
        </div>
        <div className="header-controls">
          <ApiStatus status={apiStatus} />
          <button 
            onClick={handleForceRefresh} 
            className="refresh-btn"
            disabled={loading || refreshing || (apiStatus && apiStatus.remainingToday === 0)}
            title={apiStatus?.remainingToday === 0 ? 'Límite diario alcanzado' : 'Actualizar desde API (consume 1 llamada)'}
          >
            {refreshing ? '⏳' : '🔄'} {apiStatus?.remainingToday === 0 ? 'Sin cuota' : 'Actualizar'}
          </button>
          <label className="auto-refresh">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto (cache)
          </label>
        </div>
      </header>

      <main className="main">
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}
        
        {loading && flights.length === 0 ? (
          <div className="loading">
            <div className="loading-spinner">✈️</div>
            <p>Cargando información de vuelos...</p>
          </div>
        ) : flights.length === 0 ? (
          <div className="no-flights">
            <p>📭 No se encontraron vuelos para las rutas monitoreadas.</p>
            <p>Rutas: BRC → AEP y AEP → TUC</p>
            <p>Los vuelos de mañana podrían aparecer más tarde.</p>
          </div>
        ) : (
          <>
            {/* Vuelos Bariloche → Aeroparque */}
            <div className="route-section">
              <h2 className="route-title">
                <span>🏔️</span> Bariloche → Aeroparque
                <span className="route-count">
                  {flights.filter(f => f.route === 'BRC → AEP').length} vuelos
                </span>
              </h2>
              <div className="flights-grid">
                {flights
                  .filter(f => f.route === 'BRC → AEP')
                  .map(flight => (
                    <FlightCard key={`${flight.flight_number}-${flight.flight_date}`} flight={flight} />
                  ))}
                {flights.filter(f => f.route === 'BRC → AEP').length === 0 && (
                  <p className="no-route-flights">No hay vuelos cargados aún para esta ruta</p>
                )}
              </div>
            </div>
            
            {/* Vuelos Aeroparque → Tucumán */}
            <div className="route-section">
              <h2 className="route-title">
                <span>🌄</span> Aeroparque → Tucumán
                <span className="route-count">
                  {flights.filter(f => f.route === 'AEP → TUC').length} vuelos
                </span>
              </h2>
              <div className="flights-grid">
                {flights
                  .filter(f => f.route === 'AEP → TUC')
                  .map(flight => (
                    <FlightCard key={`${flight.flight_number}-${flight.flight_date}`} flight={flight} />
                  ))}
                {flights.filter(f => f.route === 'AEP → TUC').length === 0 && (
                  <p className="no-route-flights">No hay vuelos cargados aún para esta ruta</p>
                )}
              </div>
            </div>
          </>
        )}
        
        {lastUpdate && (
          <div className="last-update">
            Última actualización: {lastUpdate.toLocaleTimeString('es-AR')}
            {autoRefresh && <span className="auto-badge">Auto-refresh activo</span>}
          </div>
        )}
        
        <NewsSection 
          news={news} 
          loading={newsLoading} 
          onRefresh={fetchNews}
        />
      </main>

      <footer className="footer">
        <p>Desarrollado 100% en remoto desde iPad con Cursor Cloud</p>
        <p className="tech-note">
          {flights.some(f => f.source === 'demo') 
            ? '📋 Mostrando datos de demostración - Configura API keys para datos reales'
            : '✅ Conectado a API de vuelos en tiempo real'
          }
        </p>
      </footer>
    </div>
  )
}

export default App
