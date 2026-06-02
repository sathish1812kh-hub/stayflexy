'use client'

import React, { useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import dataClient from '../dataClient'
import { Terminal, Shield, Cpu, RefreshCw, Play, Layers } from 'lucide-react'

export default function ReviewConsolePage() {
  const [activeSegment, setActiveSegment] = useState<'topology' | 'graphify' | 'graphql'>('topology')
  const [gqlQuery, setGqlQuery] = useState('query GetHotels {\n  hotels {\n    id\n    name\n    city\n    status\n  }\n}')
  const [gqlVariables, setGqlVariables] = useState('{}')
  const [gqlResponse, setGqlResponse] = useState('{\n  "data": null\n}')
  const [executing, setExecuting] = useState(false)

  const executeMockQuery = async (queryType: 'hotels' | 'roomTypes' | 'rooms' | 'updateRoom') => {
    setExecuting(true)
    
    // Smooth delay simulation
    await new Promise(resolve => setTimeout(resolve, 350))
    
    try {
      if (queryType === 'hotels') {
        setGqlQuery('query GetHotels {\n  hotels {\n    id\n    name\n    city\n    status\n  }\n}')
        const h = await dataClient.getHotels()
        setGqlResponse(JSON.stringify({ data: { hotels: h } }, null, 2))
      } else if (queryType === 'roomTypes') {
        setGqlQuery('query GetRoomTypes {\n  roomTypes {\n    id\n    name\n    basePrice\n    maxOccupancy\n  }\n}')
        const rt = await dataClient.getRoomTypes()
        setGqlResponse(JSON.stringify({ data: { roomTypes: rt } }, null, 2))
      } else if (queryType === 'rooms') {
        setGqlQuery('query GetRooms {\n  rooms {\n    id\n    roomNumber\n    status\n  }\n}')
        const r = await dataClient.getRooms()
        setGqlResponse(JSON.stringify({ data: { rooms: r } }, null, 2))
      } else if (queryType === 'updateRoom') {
        setGqlQuery('mutation UpdateRoomStatus($roomId: String!, $status: RoomStatus!) {\n  updateRoomStatus(roomId: $roomId, status: $status) {\n    id\n    roomNumber\n    status\n  }\n}')
        const updated = await dataClient.updateRoomStatus('r-101', 'OCCUPIED', 'Front Desk checkin')
        setGqlResponse(JSON.stringify({ data: { updateRoomStatus: updated } }, null, 2))
      }
    } catch (err: any) {
      setGqlResponse(JSON.stringify({ errors: [{ message: err.message || 'Execution error' }] }, null, 2))
    } finally {
      setExecuting(false)
    }
  }

  return (
    <DashboardShell
      activeTab="console"
      title="System Architecture & GraphQL Console"
      subtitle="Interactive analysis console displaying microservice boundaries and live query execution"
    >
      {/* Selector Navigation */}
      <div className="tab-container">
        <button className={`tab-button ${activeSegment === 'topology' ? 'active' : ''}`} onClick={() => setActiveSegment('topology')}>
          Service Catalog & Ports
        </button>
        <button className={`tab-button ${activeSegment === 'graphify' ? 'active' : ''}`} onClick={() => setActiveSegment('graphify')}>
          Graphify AST Core Analysis
        </button>
        <button className={`tab-button ${activeSegment === 'graphql' ? 'active' : ''}`} onClick={() => setActiveSegment('graphql')}>
          Supergraph Executer console
        </button>
      </div>

      {activeSegment === 'topology' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Microservices Port catalog */}
          <div className="glass-card">
            <h2 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '16px' }}>Stayflexi Microservice Port Assignments</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>#</th>
                    <th style={{ padding: '12px' }}>Microservice</th>
                    <th style={{ padding: '12px' }}>Port</th>
                    <th style={{ padding: '12px' }}>Bounded Domain Responsibility</th>
                    <th style={{ padding: '12px' }}>Primary Table Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 1, name: 'auth-service', port: '3001', desc: 'Authentication, JWT issue, token revocation', db: 'User, Role, Permission' },
                    { id: 2, name: 'organization-service', port: '3002', desc: 'Organization and member setups', db: 'Organization, Subscription' },
                    { id: 3, name: 'hotel-service', port: '3003', desc: 'Hotel, room type, physical room crud', db: 'Hotel, RoomType, Room' },
                    { id: 4, name: 'inventory-service', port: '3004', desc: 'Live occupancy matrices, dynamic rules', db: 'RoomInventory, DynamicRate' },
                    { id: 5, name: 'booking-service', port: '3005', desc: 'Booking creation, check-in, check-out sagas', db: 'Booking, GuestProfile' },
                    { id: 6, name: 'payment-service', port: '3006', desc: 'Payment charging, refunds, invoicing', db: 'Payment, Refund, Invoice' },
                    { id: 7, name: 'ota-service', port: '3007', desc: 'Agoda/Expedia sync pipelines, mappings', db: 'OTAMapping, SyncJob' },
                    { id: 8, name: 'analytics-service', port: '3008', desc: 'Occupancy reports, operational insights', db: 'RevenueMetric, Snapshots' },
                    { id: 9, name: 'notification-service', port: '3009', desc: 'Email, SMS delivery queues and templates', db: 'Notification, Template' },
                    { id: 10, name: 'workflow-service', port: '3010', desc: 'Automation rule engine, chaos, compliance', db: 'AutomationRule, SecurityEvent' },
                  ].map(srv => (
                    <tr key={srv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px', color: 'var(--primary)' }}>{srv.id}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{srv.name}</td>
                      <td style={{ padding: '12px', color: 'var(--secondary)' }}><code>:{srv.port}</code></td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{srv.desc}</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}><code>{srv.db}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSegment === 'graphify' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* God Nodes */}
          <div className="glass-card">
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
              <span>Ast Core: God Nodes</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Elected by AST graph parsing metrics (in-degree connection weight) representing the project's most heavily referenced abstractions.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { name: 'handleRouteError()', weight: 187, desc: 'Central routing error wrapper' },
                { name: 'Logger', weight: 155, desc: 'Enterprise logger interfaces' },
                { name: 'fromPrismaError()', weight: 128, desc: 'Prisma DB mapping parser' },
                { name: 'wrapZod()', weight: 108, desc: 'Strict API request input guard' },
                { name: 'SuccessResponse', weight: 101, desc: 'Normalized payload envelope' },
              ].map((node, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div>
                    <code style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>{node.name}</code>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{node.desc}</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--secondary)' }}>{node.weight} Edges</span>
                </div>
              ))}
            </div>
          </div>

          {/* Surprising Connections */}
          <div className="glass-card">
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield style={{ width: '18px', height: '18px', color: '#a855f7' }} />
              <span>Surprising Ast Dependencies</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Obscure dependencies compiled from cross-module references and shared event patterns.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { from: 'services/workflow-service/src/index.ts', to: 'infrastructure/gateway/src/app.ts', link: 'main() → createGatewayApp() [INFERRED]' },
                { from: 'infrastructure/gateway/src/config.ts', to: 'packages/shared-config/src/index.ts', link: 'loadGatewayConfig() → requireEnv() [INFERRED]' },
                { from: 'platform-validation/src/tests/integration.test.ts', to: 'infrastructure/observability/src/tests/metrics.test.ts', link: 'simulateConsumer() → handler [INFERRED]' },
                { from: 'src/modules/infrastructure/middleware/rateLimiter.ts', to: 'infrastructure/observability/src/tests/metrics.test.ts', link: 'createRateLimitMiddleware() → handler [INFERRED]' },
              ].map((conn, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#a855f7', marginBottom: '6px' }}>{conn.link}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <div>From: <code>{conn.from}</code></div>
                    <div>To: <code>{conn.to}</code></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSegment === 'graphql' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left panel: Query Editor */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
              <span>GraphQL Playground Editor</span>
            </h3>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-card)', boxShadow: 'none' }} onClick={() => executeMockQuery('hotels')}>
                Query Hotels
              </button>
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-card)', boxShadow: 'none' }} onClick={() => executeMockQuery('roomTypes')}>
                Query Room Types
              </button>
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-card)', boxShadow: 'none' }} onClick={() => executeMockQuery('rooms')}>
                Query Rooms
              </button>
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-card)', boxShadow: 'none' }} onClick={() => executeMockQuery('updateRoom')}>
                Mutation (Update Status)
              </button>
            </div>
            
            <div style={{ flexGrow: 1, minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>GraphQL Query</label>
              <textarea 
                className="input-field" 
                style={{ flexGrow: 1, fontFamily: 'monospace', fontSize: '12px', padding: '16px', background: '#030712', border: '1px solid var(--border-card)', resize: 'none' }}
                value={gqlQuery}
                onChange={e => setGqlQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-primary" onClick={() => executeMockQuery('hotels')} disabled={executing}>
                <Play style={{ width: '14px', height: '14px' }} />
                <span>{executing ? 'Executing Query...' : 'Execute Schema'}</span>
              </button>
            </div>
          </div>

          {/* Right panel: Query Response Output */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              Composed JSON Response
            </h3>
            
            <div style={{ flexGrow: 1, minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Execution Result</label>
              <pre style={{ flexGrow: 1, fontFamily: 'monospace', fontSize: '12px', padding: '16px', background: '#030712', border: '1px solid var(--border-card)', overflow: 'auto', borderRadius: '8px', color: 'var(--primary)' }}>
                {gqlResponse}
              </pre>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
