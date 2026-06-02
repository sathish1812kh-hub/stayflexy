'use client'

import React, { useState, useEffect } from 'react'
import DashboardShell from '../components/DashboardShell'
import { Activity, ShieldAlert, Cpu, RefreshCw, Radio, HardDrive, WifiOff, Clock, Terminal } from 'lucide-react'

interface ServiceHealth {
  name: string
  port: string
  ping: number
  status: 'HEALTHY' | 'LATENCY_SPIKE' | 'OFFLINE'
}

export default function MonitoringPage() {
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: 'auth-service', port: '3001', ping: 12, status: 'HEALTHY' },
    { name: 'organization-service', port: '3002', ping: 8, status: 'HEALTHY' },
    { name: 'hotel-service', port: '3003', ping: 15, status: 'HEALTHY' },
    { name: 'inventory-service', port: '3004', ping: 19, status: 'HEALTHY' },
    { name: 'booking-service', port: '3005', ping: 22, status: 'HEALTHY' },
    { name: 'payment-service', port: '3006', ping: 14, status: 'HEALTHY' },
    { name: 'ota-service', port: '3007', ping: 45, status: 'HEALTHY' },
    { name: 'analytics-service', port: '3008', ping: 38, status: 'HEALTHY' },
    { name: 'notification-service', port: '3009', ping: 9, status: 'HEALTHY' },
    { name: 'workflow-service', port: '3010', ping: 11, status: 'HEALTHY' },
  ])

  // Chaos Injection state
  const [latencyActive, setLatencyActive] = useState(false)
  const [dbDropActive, setDbDropActive] = useState(false)
  const [overbookingActive, setOverbookingActive] = useState(false)
  const [logFeed, setLogFeed] = useState<string[]>([
    "[SYSTEM] Telemetry observer initialized on Federated supergraph.",
    "[SYSTEM] 10 microservices fully handshaking on active ports.",
    "[METRIC] PostgreSQL pool connections status: 8 active / 20 capacity."
  ])

  // Sync log updates
  const addLog = (msg: string) => {
    setLogFeed(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15))
  }

  // Trigger latency simulation
  const toggleLatencyChaos = () => {
    const newState = !latencyActive
    setLatencyActive(newState)
    
    if (newState) {
      addLog("⚠️ CHAOS INJECTED: Network latency latency delay +600ms applied globally!")
      setServices(prev => prev.map(s => ({ ...s, ping: s.ping + 620, status: 'LATENCY_SPIKE' })))
      localStorage.setItem('sf_chaos_latency', 'true')
    } else {
      addLog("✅ RESOLVED: Latency injection disabled. Port ping restored to normal.")
      setServices(prev => prev.map(s => ({ ...s, ping: Math.floor(8 + Math.random() * 25), status: 'HEALTHY' })))
      localStorage.removeItem('sf_chaos_latency')
    }
  }

  // Trigger Database Drop simulation
  const toggleDbDropChaos = () => {
    const newState = !dbDropActive
    setDbDropActive(newState)

    if (newState) {
      addLog("🔥 CHAOS INJECTED: PostgreSQL connection pool dropped! Federated gateway offline.")
      setServices(prev => prev.map(s => s.name === 'hotel-service' ? { ...s, ping: 999, status: 'OFFLINE' } : s))
      // Trigger dataClient mock fallback status in storage
      localStorage.setItem('sf_chaos_db_offline', 'true')
      window.dispatchEvent(new Event('storage')) // Notify client
    } else {
      addLog("✅ RESOLVED: DB instances restored. Client gracefully synchronizing mock records to SQL.")
      setServices(prev => prev.map(s => s.name === 'hotel-service' ? { ...s, ping: 14, status: 'HEALTHY' } : s))
      localStorage.removeItem('sf_chaos_db_offline')
      window.dispatchEvent(new Event('storage'))
    }
  }

  // Trigger Overbooking Overload simulation
  const toggleOverbookingChaos = () => {
    const newState = !overbookingActive
    setOverbookingActive(newState)

    if (newState) {
      addLog("🚨 CHAOS INJECTED: Room Type capacity lock failure! Simulating overbooking storm.")
      localStorage.setItem('sf_chaos_overbooking', 'true')
    } else {
      addLog("✅ RESOLVED: Capacity validation rules active. Inventory synchronization fuzed.")
      localStorage.removeItem('sf_chaos_overbooking')
    }
  }

  return (
    <DashboardShell
      activeTab="monitoring"
      title="Telemetry & Chaos Injection"
      subtitle="Supergraph real-time telemetry observation and disaster recovery chaos stress-tests"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
        
        {/* Left Column: Health Ping grids & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Microservices health grid */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Federated Port Pings</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status polling interval: 2s</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {services.map(s => (
                <div 
                  key={s.name}
                  style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Port assignment <code>:{s.port}</code></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: s.status === 'HEALTHY' ? '#10b981' : s.status === 'LATENCY_SPIKE' ? '#f59e0b' : '#ef4444' }}>
                      {s.ping}ms
                    </span>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: s.status === 'HEALTHY' ? '#10b981' : s.status === 'LATENCY_SPIKE' ? '#f59e0b' : '#ef4444',
                      boxShadow: `0 0 10px ${s.status === 'HEALTHY' ? '#10b981' : s.status === 'LATENCY_SPIKE' ? '#f59e0b' : '#ef4444'}`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry log outputs */}
          <div className="glass-card" style={{ padding: '24px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Terminal style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Telemetry Console Log Feed</h3>
            </div>
            
            <div style={{
              background: '#040710',
              fontFamily: 'monospace',
              fontSize: '11px',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid var(--border-card)',
              height: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              color: '#8b9bb4'
            }}>
              {logFeed.map((log, i) => (
                <div key={i} style={{
                  color: log.includes('⚠️') ? '#f59e0b' : log.includes('🔥') ? '#ef4444' : log.includes('✅') ? '#10b981' : 'inherit',
                  whiteSpace: 'pre-wrap'
                }}>
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Chaos control dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ShieldAlert style={{ width: '18px', height: '18px', color: '#ef4444' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444' }}>Disaster Chaos Room</h3>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
              Trigger mock chaos rules on bounded contexts to verify the dashboard's offline **resilient local-storage state manager fallbacks**.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Latency chaos toggle */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-card)',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock style={{ width: '18px', height: '18px', color: latencyActive ? '#f59e0b' : 'var(--text-muted)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Network Latency delay</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Applies artificial +600ms latency</span>
                  </div>
                </div>
                
                <button 
                  onClick={toggleLatencyChaos}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    background: latencyActive ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${latencyActive ? '#f59e0b' : 'var(--border-card)'}`,
                    color: latencyActive ? '#060913' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  {latencyActive ? 'LATENCY ACTIVE' : 'INJECT'}
                </button>
              </div>

              {/* DB outage chaos toggle */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-card)',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <WifiOff style={{ width: '18px', height: '18px', color: dbDropActive ? '#ef4444' : 'var(--text-muted)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>SQL Connection Outage</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Forces client offline-mock fallback</span>
                  </div>
                </div>
                
                <button 
                  onClick={toggleDbDropChaos}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    background: dbDropActive ? '#ef4444' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${dbDropActive ? '#ef4444' : 'var(--border-card)'}`,
                    color: dbDropActive ? '#fff' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  {dbDropActive ? 'DB DISCONNECTED' : 'INJECT'}
                </button>
              </div>

              {/* Overbooking overload toggle */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-card)',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert style={{ width: '18px', height: '18px', color: overbookingActive ? '#ef4444' : 'var(--text-muted)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Capacity Lock Failure</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Simulates overbooking request storm</span>
                  </div>
                </div>
                
                <button 
                  onClick={toggleOverbookingChaos}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    background: overbookingActive ? '#ef4444' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${overbookingActive ? '#ef4444' : 'var(--border-card)'}`,
                    color: overbookingActive ? '#fff' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  {overbookingActive ? 'STORM INJECTED' : 'INJECT'}
                </button>
              </div>

            </div>

            {/* Status indicator note */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '6px',
              padding: '12px 14px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              lineHeight: '1.4',
              marginTop: '20px',
              border: '1px solid var(--border-card)'
            }}>
              💡 <strong style={{ color: '#fff' }}>Resilience Alert:</strong> When SQL Outage is injected, the client immediately switches to local `localStorage` mock sync. Creating hotels, room types, and status updates will still work seamlessly inside the dashboard, maintaining high operational continuity.
            </div>

          </div>

        </div>

      </div>
    </DashboardShell>
  )
}
