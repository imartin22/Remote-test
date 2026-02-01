import { useState, useEffect } from 'react'
import './App.css'

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

function FlightCard({ flight }) {
  if (!flight) return null
  
  const statusColor = getStatusColor(flight.status)
  const statusIcon = getStatusIcon(flight.status)
  
  return (
    <div className="flight-card">
      <div className="flight-header">
        <div className="flight-number">
          <span className="airline-logo">🇦🇷</span>
          <div>
            <h2>{flight.flight_number}</h2>
            <span className="airline-name">{flight.airline}</span>
          </div>
        </div>
        <div className="flight-status" style={{ backgroundColor: statusColor }}>
          <span className="status-icon">{statusIcon}</span>
          <span>{flight.status}</span>
        </div>
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

function App() {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchFlights = async () => {
    try {
      const response = await fetch('/api/flights')
      if (!response.ok) throw new Error('Error al cargar vuelos')
      const data = await response.json()
      setFlights(data.flights || [])
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlights()
    
    if (autoRefresh) {
      const interval = setInterval(fetchFlights, 30000) // Actualizar cada 30 segundos
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

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
          <button 
            onClick={fetchFlights} 
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'} Actualizar
          </button>
          <label className="auto-refresh">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
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
        ) : (
          <div className="flights-grid">
            {flights.map(flight => (
              <FlightCard key={flight.flight_number} flight={flight} />
            ))}
          </div>
        )}
        
        {lastUpdate && (
          <div className="last-update">
            Última actualización: {lastUpdate.toLocaleTimeString('es-AR')}
            {autoRefresh && <span className="auto-badge">Auto-refresh activo</span>}
          </div>
        )}
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
