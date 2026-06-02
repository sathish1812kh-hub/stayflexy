'use client'

import React, { useState, useEffect } from 'react'
import DashboardShell from '../components/DashboardShell'
import { GitFork, ToggleLeft, Play, PlusCircle, CheckCircle2, Cpu, Sparkles, Mail, Sliders, Activity, RefreshCw, Globe, Layers, Wifi, AlertCircle } from 'lucide-react'
import dataClient from '../dataClient'

interface WorkflowRule {
  id: string
  name: string
  trigger: string
  action: string
  service: string
  isActive: boolean
}

const DEFAULT_RULES: WorkflowRule[] = [
  {
    id: "wf-1",
    name: "Late Arrival Notification",
    trigger: "If check-in hour is after 8:00 PM",
    action: "Send late-arrival SMS to guest profile",
    service: "notification-service",
    isActive: true
  },
  {
    id: "wf-2",
    name: "VIP Welcome Upgrade Check",
    trigger: "If guest type is Repeat and roomType is Presidential",
    action: "Trigger priority welcome amenities dispatch",
    service: "hotel-service",
    isActive: true
  },
  {
    id: "wf-3",
    name: "Agoda Rate Alignment Trigger",
    trigger: "If basePrice of roomType is updated in PMS",
    action: "Initiate full OTA synchronizer task",
    service: "ota-service",
    isActive: false
  }
]

export default function WorkflowsPage() {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('If check-in status changes to OCCUPIED')
  const [action, setAction] = useState('Send complimentary welcome email')
  const [service, setService] = useState('notification-service')
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // OTA Channel Manager States
  const [otaProviders, setOtaProviders] = useState<any[]>([])
  const [otaMappings, setOtaMappings] = useState<any[]>([])
  const [syncJobs, setSyncJobs] = useState<any[]>([])
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [activeProviderSyncing, setActiveProviderSyncing] = useState<string | null>(null)

  // OTA Connection Form States
  const [connectingOta, setConnectingOta] = useState(false)
  const [extHotelId, setExtHotelId] = useState('agoda-101')
  const [extRoomTypeId, setExtRoomTypeId] = useState('agoda-rt-deluxe')
  const [selRoomTypeId, setSelRoomTypeId] = useState('rt-deluxe')
  const [selProviderId, setSelProviderId] = useState('prov-agoda')

  const loadOtaData = async () => {
    try {
      const providers = await dataClient.getOtaProviders()
      const mappings = await dataClient.getOtaMappings("h1-resort-goa")
      const jobs = await dataClient.getSyncJobs("h1-resort-goa")
      const rts = await dataClient.getRoomTypes()
      
      setOtaProviders(providers)
      setOtaMappings(mappings)
      setSyncJobs(jobs)
      setRoomTypes(rts.filter(rt => rt.hotelId === "h1-resort-goa"))
    } catch (err) {
      console.error("Error loading OTA data: ", err)
    }
  }

  const loadRules = async () => {
    try {
      const list = await dataClient.getWorkflowRules("h1-resort-goa")
      const mapped = list.map((r: any) => {
        let actType = "Send welcome email"
        let svc = "notification-service"
        try {
          if (r.actionPayload) {
            const parsed = typeof r.actionPayload === 'string' ? JSON.parse(r.actionPayload) : r.actionPayload
            actType = parsed.type || actType
            svc = parsed.params?.service || svc
          }
        } catch {
          // Fallback
        }
        return {
          id: r.id,
          name: r.ruleName,
          trigger: r.triggerType,
          action: actType,
          service: svc,
          isActive: r.ruleStatus === 'ACTIVE'
        }
      })
      setRules(mapped)
    } catch (err) {
      console.error("Error loading workflow rules: ", err)
    }
  }

  useEffect(() => {
    loadRules()
    loadOtaData()
  }, [])

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setSaving(true)

    try {
      await dataClient.createWorkflowRule({
        hotelId: "h1-resort-goa",
        name,
        trigger,
        action,
        service
      })
      await loadRules()
      setName('')
      setShowAddForm(false)
    } catch (err) {
      console.error("Deploy workflow rule failed: ", err)
    } finally {
      setSaving(false)
    }
  }

  const toggleRule = async (id: string, currentActive: boolean) => {
    try {
      await dataClient.toggleWorkflowRule(id, !currentActive)
      await loadRules()
    } catch (err) {
      console.error("Toggle rule failed: ", err)
    }
  }

  const handleDryRunRule = async (id: string, ruleName: string) => {
    try {
      const res = await dataClient.dryRunWorkflowRule(id)
      alert(`Dry Run completed!\nStatus: [${res.executionStatus}]\nRule: ${ruleName}\nExecution ID: ${res.id}`)
    } catch (err) {
      console.error("Dry run execution failed: ", err)
    }
  }

  const handleTriggerOtaSync = async (providerId: string, type: string) => {
    setActiveProviderSyncing(providerId + "-" + type)
    try {
      await dataClient.triggerSync("h1-resort-goa", providerId, type)
      await loadOtaData()
    } catch (err) {
      console.error("Sync trigger failed: ", err)
    } finally {
      setActiveProviderSyncing(null)
    }
  }

  const handleConnectOta = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnectingOta(true)
    try {
      await dataClient.connectOta(
        "h1-resort-goa",
        selProviderId,
        extHotelId,
        [{ roomTypeId: selRoomTypeId, externalRoomTypeId: extRoomTypeId }]
      )
      await loadOtaData()
      // Reset form placeholders
      if (selProviderId === 'prov-agoda') {
        setExtHotelId('agoda-101')
        setExtRoomTypeId('agoda-rt-deluxe')
      } else {
        setExtHotelId('exp-202')
        setExtRoomTypeId('exp-rt-deluxe')
      }
    } catch (err) {
      console.error("Connect OTA failed: ", err)
    } finally {
      setConnectingOta(false)
    }
  }

  return (
    <DashboardShell
      activeTab="workflows"
      title="Automation Rule Engine"
      subtitle="Configure if-this-then-that operational recipes and microservices trigger hooks"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Controls Panel */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Operational Automation Flows</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Fuses events between property managers and messaging nodes</p>
          </div>
          
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#060913',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px'
            }}
          >
            <PlusCircle style={{ width: '15px', height: '15px' }} />
            <span>Create Rule</span>
          </button>
        </div>

        {/* Create rule Form */}
        {showAddForm && (
          <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--primary)' }}>Define Operational Trigger</h3>
            <form onSubmit={handleCreateRule} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', gap: '16px', alignItems: 'end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rule Description</label>
                <input 
                  type="text" 
                  required
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  placeholder="e.g. VIP Champagne Dispatch"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Event Trigger (IF)</label>
                <select 
                  value={trigger}
                  onChange={e => setTrigger(e.target.value)}
                  style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="If check-in status changes to OCCUPIED">If status changes to OCCUPIED</option>
                  <option value="If billing ledger has UNPAID invoice">If invoice is UNPAID</option>
                  <option value="If basePrice of roomType is updated">If basePrice changes</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action Pipeline (THEN)</label>
                <select 
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="Send complimentary welcome email">Send welcome email</option>
                  <option value="Dispatch push-message template to staff">Dispatch mobile notification</option>
                  <option value="Initiate full OTA synchronizer task">Trigger OTA sync pipeline</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: 'var(--primary)',
                    color: '#060913',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {saving ? 'Saving...' : 'Deploy'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    border: '1px solid var(--border-card)',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Live Rules Catalog */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {rules.map(rule => (
            <div 
              key={rule.id} 
              className="glass-card" 
              style={{ 
                padding: '24px', 
                border: '1px solid var(--border-card)', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                opacity: rule.isActive ? 1 : 0.65
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu style={{ width: '15px', height: '15px', color: 'var(--primary)' }} />
                    <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {rule.service}
                    </span>
                  </div>
                  <button 
                    onClick={() => toggleRule(rule.id, rule.isActive)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: rule.isActive ? '#10b981' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                  >
                    {rule.isActive ? 'Rule Active' : 'Suspended'}
                  </button>
                </div>
                
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: '#fff' }}>{rule.name}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <div>
                    <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>IF:</span> {rule.trigger}
                  </div>
                  <div>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>THEN:</span> {rule.action}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>AST Edge: Bounded Hook</span>
                <button 
                  onClick={() => handleDryRunRule(rule.id, rule.name)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-card)',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Play style={{ width: '10px', height: '10px' }} />
                  <span>Dry Run</span>
                </button>
              </div>

            </div>
          ))}
        </div>

        {/* Informational Section */}
        <div className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(127, 0, 255, 0.02)', border: '1px solid rgba(127, 0, 255, 0.1)' }}>
          <Sparkles style={{ width: '24px', height: '24px', color: 'var(--accent)' }} />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <strong style={{ color: '#fff' }}>Ast Rule propagation:</strong> Rules configured here are compiled directly to visual AST dependencies inside the <code>workflow-service</code> node, mapping relationships with downstream event channels.
          </div>
        </div>

        {/* Neon Separator */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0, 242, 254, 0) 0%, rgba(0, 242, 254, 0.3) 50%, rgba(0, 242, 254, 0) 100%)', margin: '20px 0' }} />

        {/* OTA Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
              <span>OTA Direct Channel Manager</span>
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Synchronize inventory, pricing tables, and reservations directly with Agoda and Expedia
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--primary)', fontWeight: 600, padding: '4px 10px', background: 'rgba(0, 242, 254, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
            <Wifi style={{ width: '12px', height: '12px' }} />
            <span>Downstream GraphQL Gateway Connection Active</span>
          </div>
        </div>

        {/* OTA Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Mappings & Connectivity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Connection Mapping Form */}
            <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Layers style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Bind PMS Room to OTA Distribution</h3>
              </div>

              <form onSubmit={handleConnectOta} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>OTA Provider Channel</label>
                  <select 
                    value={selProviderId}
                    onChange={e => {
                      const pid = e.target.value
                      setSelProviderId(pid)
                      if (pid === 'prov-agoda') {
                        setExtHotelId('agoda-101')
                        setExtRoomTypeId('agoda-rt-deluxe')
                      } else {
                        setExtHotelId('exp-202')
                        setExtRoomTypeId('exp-rt-deluxe')
                      }
                    }}
                    style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                  >
                    {otaProviders.map(p => (
                      <option key={p.id} value={p.id}>{p.providerName}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Local PMS Room Type</label>
                  <select 
                    value={selRoomTypeId}
                    onChange={e => setSelRoomTypeId(e.target.value)}
                    style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                  >
                    {roomTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>{rt.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>External OTA Property ID</label>
                  <input 
                    type="text"
                    required
                    value={extHotelId}
                    onChange={e => setExtHotelId(e.target.value)}
                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>External OTA Room ID</label>
                  <input 
                    type="text"
                    required
                    value={extRoomTypeId}
                    onChange={e => setExtRoomTypeId(e.target.value)}
                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={connectingOta}
                  style={{
                    gridColumn: 'span 2',
                    marginTop: '8px',
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: '#060913',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {connectingOta ? 'Connecting Channel...' : 'Activate Direct Mapping Bind'}
                </button>
              </form>
            </div>

            {/* Mappings Table */}
            <div className="glass-card" style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Active Channel Mappings</h3>
                <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Connected</span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 16px' }}>Channel</th>
                    <th style={{ padding: '10px 16px' }}>Local Room Type</th>
                    <th style={{ padding: '10px 16px' }}>External IDs</th>
                    <th style={{ padding: '10px 16px' }}>Sync</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {otaMappings.map((m: any) => {
                    const provider = otaProviders.find(p => p.id === m.providerId)
                    const providerName = provider ? provider.providerName : 'Agoda'
                    const localRt = roomTypes.find(rt => rt.id === m.roomTypeId)
                    const localRtName = localRt ? localRt.name : 'Deluxe Room'
                    
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--primary)' }}>{providerName}</td>
                        <td style={{ padding: '10px 16px' }}>{localRtName}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '11px' }}>
                          Prop: {m.externalHotelId}<br/>Room: {m.externalRoomTypeId}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            background: m.syncStatus === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: m.syncStatus === 'SUCCESS' ? '#10b981' : '#ef4444'
                          }}>{m.syncStatus}</span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              disabled={activeProviderSyncing !== null}
                              onClick={() => handleTriggerOtaSync(m.providerId, 'RATE_PUSH')}
                              style={{ padding: '3px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <RefreshCw style={{ width: '8px', height: '8px', animation: activeProviderSyncing === `${m.providerId}-RATE_PUSH` ? 'spin 1s linear' : 'none' }} />
                              <span>Rate</span>
                            </button>
                            <button
                              disabled={activeProviderSyncing !== null}
                              onClick={() => handleTriggerOtaSync(m.providerId, 'INVENTORY_PUSH')}
                              style={{ padding: '3px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <RefreshCw style={{ width: '8px', height: '8px', animation: activeProviderSyncing === `${m.providerId}-INVENTORY_PUSH` ? 'spin 1s linear' : 'none' }} />
                              <span>Inv</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Right Column: Synchronizer Logs Telemetry Console */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid var(--border-card)', minHeight: '445px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity style={{ width: '16px', height: '16px', color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Synchronizer Live Telemetry Logs</h3>
                </div>
                <button 
                  onClick={loadOtaData}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                >
                  <RefreshCw style={{ width: '10px', height: '10px' }} />
                  <span>Refresh logs</span>
                </button>
              </div>

              {/* Logs Stream Panel */}
              <div style={{
                background: '#040711',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.85)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                flex: 1,
                overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.03)',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {syncJobs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>
                    No sync records found. Trigger inventory synchronization.
                  </div>
                ) : (
                  syncJobs.map((j: any) => {
                    const isSuccess = j.syncStatus === 'SUCCESS'
                    const provider = otaProviders.find(p => p.id === j.providerId)
                    const providerName = provider ? provider.providerName : 'Agoda'
                    const dateText = new Date(j.startedAt).toLocaleTimeString()
                    
                    return (
                      <div key={j.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: isSuccess ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                            ● [{j.syncStatus}] {j.syncType}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{dateText}</span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
                          Channel: <strong style={{ color: '#fff' }}>{providerName}</strong> | Retry: {j.retryCount}/{j.maxRetries}
                          <br />
                          Idempotency: <span style={{ color: 'var(--primary)' }}>{j.idempotencyKey.slice(0, 30)}...</span>
                          {j.errorMessage && (
                            <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', padding: '4px 8px', borderRadius: '4px', marginTop: '4px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                              <AlertCircle style={{ width: '10px', height: '10px', display: 'inline', marginRight: '4px' }} />
                              Error: {j.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </DashboardShell>
  )
}
