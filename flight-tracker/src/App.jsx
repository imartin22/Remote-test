import { useState, useEffect } from 'react'
import './App.css'

// Tus vuelos a monitorear
const YOUR_FLIGHTS = [
  { 
    flight_number: 'AR1685', 
    route: 'BRC → AEP',
    origin: 'BRC',
    originName: 'Bariloche',
    destination: 'AEP',
    destinationName: 'Aeroparque',
    routeName: 'Bariloche → Aeroparque',
    date: '2 Feb'
  },
  { 
    flight_number: 'AR1484', 
    route: 'AEP → TUC',
    origin: 'AEP',
    originName: 'Aeroparque',
    destination: 'TUC',
    destinationName: 'Tucumán',
    routeName: 'Aeroparque → Tucumán',
    date: '2 Feb'
  }
]

function formatTime(isoString) {
  if (!isoString || isoString === 'N/A') return '-'
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}

function formatDate(isoString) {
  if (!isoString) return '-'
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  } catch {
    return '-'
  }
}

function formatRelativeTime(isoString) {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `hace ${diffMins}m`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays < 7) return `hace ${diffDays}d`
    return formatDate(isoString)
  } catch {
    return ''
  }
}

function getStatusClass(status) {
  const statusMap = {
    'Programado': 'scheduled',
    'En vuelo': 'active',
    'Activo': 'active',
    'Aterrizó': 'landed',
    'Llegó': 'landed',
    'Demorado': 'delayed',
    'Cancelado': 'cancelled',
    'Sin información': 'unknown'
  }
  return statusMap[status] || 'unknown'
}

function getStatusIcon(status) {
  const icons = {
    'Programado': '🕐',
    'En vuelo': '✈️',
    'Activo': '✈️',
    'Aterrizó': '🛬',
    'Llegó': '✅',
    'Demorado': '⏳',
    'Cancelado': '❌',
    'Sin información': '❓'
  }
  return icons[status] || '❓'
}

function ApiStatus({ status }) {
  if (!status) return null
  
  const getStatusColor = () => {
    if (status.remainingToday === 0) return '#dc2626'
    if (status.remainingToday <= 5) return '#d97706'
    return '#16a34a'
  }
  
  return (
    <div className="api-status" role="status" aria-live="polite">
      <div 
        className="api-status-badge" 
        style={{ backgroundColor: getStatusColor() }}
        aria-label={`API calls remaining: ${status.remainingToday} of ${status.maxDaily}`}
      >
        API: {status.remainingToday}/{status.maxDaily}
      </div>
    </div>
  )
}

function YourFlightsSection({ flights, apiFlights }) {
  const getFlightData = (flightNumber) => {
    return apiFlights.find(f => f.flight_number === flightNumber)
  }
  
  return (
    <section className="your-flights-section" aria-labelledby="your-flights-heading">
      <h2 id="your-flights-heading" className="your-flights-header">✨ Tus Vuelos</h2>
      
      {/* Mobile: Cards */}
      <div className="your-flights-cards">
        {flights.map(yourFlight => {
          const apiData = getFlightData(yourFlight.flight_number)
          const status = apiData ? apiData.status : 'Sin información'
          const statusClass = getStatusClass(status)
          
          return (
            <div key={yourFlight.flight_number} className="your-flight-card">
              <div className="your-flight-card-header">
                <span className="your-flight-number">{yourFlight.flight_number}</span>
                <span className={`status-badge status-${statusClass}`}>
                  {getStatusIcon(status)} {status}
                </span>
              </div>
              <div className="your-flight-route">
                <div className="your-flight-airport">
                  <div className="your-flight-airport-code">{yourFlight.origin}</div>
                  <div className="your-flight-airport-name">{yourFlight.originName}</div>
                </div>
                <span className="your-flight-arrow" aria-hidden="true">→</span>
                <div className="your-flight-airport">
                  <div className="your-flight-airport-code">{yourFlight.destination}</div>
                  <div className="your-flight-airport-name">{yourFlight.destinationName}</div>
                </div>
              </div>
              <div className="your-flight-details">
                <span>📅 {apiData ? formatDate(apiData.departure?.scheduled) : yourFlight.date}</span>
                <span>
                  {apiData ? `${formatTime(apiData.departure?.scheduled)} → ${formatTime(apiData.arrival?.scheduled)}` : 'Horario pendiente'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Desktop: Table */}
      <div className="table-wrapper">
        <table className="your-flights-table">
          <thead>
            <tr>
              <th>Vuelo</th>
              <th>Ruta</th>
              <th>Fecha</th>
              <th>Salida</th>
              <th>Llegada</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {flights.map(yourFlight => {
              const apiData = getFlightData(yourFlight.flight_number)
              const status = apiData ? apiData.status : 'Sin información'
              const statusClass = getStatusClass(status)
              
              return (
                <tr key={yourFlight.flight_number}>
                  <td className="flight-number-cell">{yourFlight.flight_number}</td>
                  <td>{yourFlight.routeName}</td>
                  <td>{apiData ? formatDate(apiData.departure?.scheduled) : yourFlight.date}</td>
                  <td>
                    {apiData ? (
                      <>
                        <span className="time">{formatTime(apiData.departure?.scheduled)}</span>
                        {apiData.departure?.delay && (
                          <span className="delay-indicator">+{apiData.departure.delay}min</span>
                        )}
                      </>
                    ) : '-'}
                  </td>
                  <td>
                    {apiData ? (
                      <span className="time">{formatTime(apiData.arrival?.scheduled)}</span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`status-badge status-${statusClass}`}>
                      {getStatusIcon(status)} {status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function FlightTable({ flights, routeName, routeEmoji }) {
  const sectionId = routeName.replace(/\s+/g, '-').toLowerCase()
  if (flights.length === 0) {
    return (
      <section className="route-section" aria-labelledby={sectionId}>
        <div className="route-header">
          <h3 id={sectionId} className="route-title">
            <span aria-hidden="true">{routeEmoji}</span> {routeName}
          </h3>
          <span className="route-count">0 vuelos</span>
        </div>
        <p className="no-route-flights">No hay vuelos cargados aún para esta ruta</p>
      </section>
    )
  }
  
  return (
    <section className="route-section" aria-labelledby={sectionId}>
      <div className="route-header">
        <h3 id={sectionId} className="route-title">
          <span aria-hidden="true">{routeEmoji}</span> {routeName}
        </h3>
        <span className="route-count">{flights.length} vuelos</span>
      </div>
      
      {/* Mobile: Cards */}
      <div className="flight-cards">
        {flights.map((flight, index) => {
          const statusClass = getStatusClass(flight.status)
          const isYourFlight = YOUR_FLIGHTS.some(yf => yf.flight_number === flight.flight_number)
          
          return (
            <div 
              key={`card-${flight.flight_number}-${index}`} 
              className="flight-card"
              style={isYourFlight ? { borderColor: 'var(--blue-500)', borderWidth: '2px' } : {}}
            >
              <div className="flight-card-header">
                <div>
                  <span className="flight-card-number">{flight.flight_number}</span>
                  {isYourFlight && <span className="your-flight-tag">Tu vuelo</span>}
                </div>
                <span className={`status-badge status-${statusClass}`}>
                  {getStatusIcon(flight.status)} {flight.status}
                </span>
              </div>
              <div className="flight-card-route">
                <div className="flight-card-airport">
                  <div className="flight-card-airport-code">{flight.departure?.airport}</div>
                  <div className="flight-card-airport-time">{formatTime(flight.departure?.scheduled)}</div>
                  <div className="flight-card-airport-name">{flight.departure?.city?.split(' ')[0] || ''}</div>
                </div>
                <span className="flight-card-arrow" aria-hidden="true">✈</span>
                <div className="flight-card-airport arrival">
                  <div className="flight-card-airport-code">{flight.arrival?.airport}</div>
                  <div className="flight-card-airport-time">{formatTime(flight.arrival?.scheduled)}</div>
                  <div className="flight-card-airport-name">{flight.arrival?.city?.split(' ')[0] || ''}</div>
                </div>
              </div>
              <div className="flight-card-footer">
                <span>{formatDate(flight.departure?.scheduled)}</span>
                {flight.departure?.delay && (
                  <span className="delay-indicator">+{flight.departure.delay}min delay</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Desktop: Table */}
      <div className="table-wrapper">
        <table className="flight-table">
          <thead>
            <tr>
              <th>Vuelo</th>
              <th>Fecha</th>
              <th>Origen</th>
              <th>Salida</th>
              <th>Destino</th>
              <th>Llegada</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((flight, index) => {
              const statusClass = getStatusClass(flight.status)
              const isYourFlight = YOUR_FLIGHTS.some(yf => yf.flight_number === flight.flight_number)
              
              return (
                <tr key={`row-${flight.flight_number}-${index}`} style={isYourFlight ? { background: '#eff6ff' } : {}}>
                  <td>
                    <span className="flight-number">{flight.flight_number}</span>
                    {isYourFlight && <span className="your-flight-tag">Tu vuelo</span>}
                  </td>
                  <td>{formatDate(flight.departure?.scheduled)}</td>
                  <td>
                    <span className="airport-code">{flight.departure?.airport}</span>
                    <span className="airport-name">{flight.departure?.city?.split(' - ')[0] || ''}</span>
                  </td>
                  <td>
                    <span className="time">{formatTime(flight.departure?.scheduled)}</span>
                    {flight.departure?.delay && (
                      <span className="delay-indicator">+{flight.departure.delay}min</span>
                    )}
                  </td>
                  <td>
                    <span className="airport-code">{flight.arrival?.airport}</span>
                    <span className="airport-name">{flight.arrival?.city?.split(' - ')[0] || ''}</span>
                  </td>
                  <td>
                    <span className="time">{formatTime(flight.arrival?.scheduled)}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${statusClass}`}>
                      {getStatusIcon(flight.status)} {flight.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function NewsCard({ news }) {
  if (!news) return null
  
  const getRelevanceColor = (relevance) => {
    if (relevance >= 20) return '#dc2626'
    if (relevance >= 10) return '#d97706'
    return '#64748b'
  }
  
  const getRelevanceLabel = (relevance) => {
    if (relevance >= 20) return '🚨'
    if (relevance >= 10) return '⚠️'
    return '📰'
  }
  
  return (
    <a href={news.link} target="_blank" rel="noopener noreferrer" className="news-card">
      <div className="news-card-header">
        <span 
          className="news-relevance" 
          style={{ backgroundColor: getRelevanceColor(news.relevance) }}
          aria-label={news.relevance >= 20 ? 'Urgente' : news.relevance >= 10 ? 'Alerta' : 'Información'}
        >
          {getRelevanceLabel(news.relevance)}
        </span>
        <span className="news-time">{formatRelativeTime(news.pubDate)}</span>
      </div>
      <h3 className="news-title">{news.title}</h3>
      <span className="news-source">{news.source}</span>
    </a>
  )
}

function NewsSection({ news, loading, onRefresh }) {
  return (
    <div className="news-section">
      <div className="news-section-header">
        <h2>
          <span className="section-icon" aria-hidden="true">📢</span>
          Alertas de Paros
        </h2>
        <button 
          onClick={onRefresh} 
          className="refresh-btn-small" 
          disabled={loading}
          aria-label="Actualizar noticias"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>
      
      <p className="news-subtitle">
        Monitoreando: paro ATE, huelgas aeropuertos, cancelaciones
      </p>
      
      {loading && news.length === 0 ? (
        <div className="news-loading" role="status" aria-live="polite">Buscando noticias…</div>
      ) : news.length === 0 ? (
        <div className="news-empty">
          ✅ No hay alertas de paros activas
        </div>
      ) : (
        <div className="news-grid">
          {news.slice(0, 5).map((item, index) => (
            <NewsCard key={index} news={item} />
          ))}
        </div>
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
      const flightInterval = setInterval(() => fetchFlights(false), 5 * 60000)
      const newsInterval = setInterval(fetchNews, 5 * 60000)
      return () => {
        clearInterval(flightInterval)
        clearInterval(newsInterval)
      }
    }
  }, [autoRefresh])
  
  const handleForceRefresh = () => {
    if (apiStatus && apiStatus.remainingToday === 0) {
      setError('Límite diario alcanzado')
      return
    }
    fetchFlights(true)
  }

  const brcToAepFlights = flights.filter(f => f.route === 'BRC → AEP')
  const aepToTucFlights = flights.filter(f => f.route === 'AEP → TUC')

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>
            <span className="header-icon">✈️</span>
            Flight Tracker
          </h1>
          <p className="subtitle">Aerolíneas Argentinas • 2 de Febrero 2026</p>
        </div>
        <div className="header-controls">
          <ApiStatus status={apiStatus} />
          <button 
            onClick={handleForceRefresh} 
            className="refresh-btn"
            disabled={loading || refreshing || (apiStatus && apiStatus.remainingToday === 0)}
            aria-label="Actualizar datos de vuelos"
          >
            {refreshing ? '⏳ Actualizando…' : '🔄 Actualizar'}
          </button>
          <label className="auto-refresh">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto
          </label>
        </div>
      </header>

      <main className="main">
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}
        
        {/* Tus vuelos siempre visibles */}
        <YourFlightsSection flights={YOUR_FLIGHTS} apiFlights={flights} />
        
        {loading && flights.length === 0 ? (
          <div className="loading" role="status" aria-live="polite">
            <div className="loading-spinner" aria-hidden="true">✈️</div>
            <p>Cargando información de vuelos…</p>
          </div>
        ) : (
          <>
            <FlightTable 
              flights={brcToAepFlights} 
              routeName="Bariloche → Aeroparque" 
              routeEmoji="🏔️"
            />
            <FlightTable 
              flights={aepToTucFlights} 
              routeName="Aeroparque → Tucumán" 
              routeEmoji="🌄"
            />
          </>
        )}
        
        {lastUpdate && (
          <div className="last-update">
            Última actualización: {lastUpdate.toLocaleTimeString('es-AR')}
            {autoRefresh && <span className="auto-badge">Auto-refresh cada 5min</span>}
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
          {flights.length > 0 
            ? `✅ Conectado a AviationStack • ${flights.length} vuelos monitoreados`
            : '📋 Esperando datos de vuelos...'
          }
        </p>
      </footer>
    </div>
  )
}

export default App
