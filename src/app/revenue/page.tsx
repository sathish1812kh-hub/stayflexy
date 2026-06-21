// FILE: src/app/revenue/page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  User,
  Sliders,
  Check,
  X,
  Plus,
  RefreshCw,
  Trash2,
  DollarSign,
  AlertTriangle,
  History,
  ShieldAlert,
  Percent,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react'

// Mock categories for competitor segments
const PRICING_SEGMENTS = ['budget', 'mid-market', 'premium', 'family-stay', 'near-temple']
const IMPORTANCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW']

export default function RevenueIntelligencePage() {
  const [hotels, setHotels] = useState<any[]>([])
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState<string>('')
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('')
  const [checkInDate, setCheckInDate] = useState<string>(new Date().toISOString().split('T')[0]!)

  // Tab State
  const [activeTab, setActiveTab] = useState<'recommendations' | 'comparison' | 'competitors' | 'history' | 'settings'>('recommendations')

  // Lists & Data States
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [comparison, setComparison] = useState<any | null>(null)
  const [competitors, setCompetitors] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])

  // UI States
  const [loading, setLoading] = useState<boolean>(false)
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Competitor CRUD Form State
  const [compName, setCompName] = useState('')
  const [compLocation, setCompLocation] = useState('')
  const [compStars, setCompStars] = useState(3)
  const [compSegment, setCompSegment] = useState('mid-market')
  const [compImportance, setCompImportance] = useState('MEDIUM')

  // Manual Upload Form State
  const [uploadCompId, setUploadCompId] = useState('')
  const [uploadRoomType, setUploadRoomType] = useState('')
  const [uploadPrice, setUploadPrice] = useState('')
  const [uploadCheckIn, setUploadCheckIn] = useState(new Date().toISOString().split('T')[0]!)

  // Trigger auto-dismiss alerts
  const showAlert = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlertMsg({ text, type })
    setTimeout(() => setAlertMsg(null), 5000)
  }

  // Load Initial Hotels list
  const loadHotels = async () => {
    try {
      const res = await fetch('/api/v1/hotels')
      const data = await res.json()
      if (data && Array.isArray(data.data)) {
        setHotels(data.data)
        if (data.data.length > 0) {
          setSelectedHotelId(data.data[0].id)
        }
      }
    } catch (err) {
      showAlert('Failed to load hotels list', 'error')
    }
  }

  // Load Room Types for Selected Hotel
  const loadRoomTypes = useCallback(async (hotelId: string) => {
    try {
      const res = await fetch(`/api/v1/room-types?hotelId=${hotelId}`)
      const data = await res.json()
      if (data && Array.isArray(data.data)) {
        setRoomTypes(data.data)
        if (data.data.length > 0) {
          setSelectedRoomTypeId(data.data[0].id)
        }
      }
    } catch (err) {
      showAlert('Failed to load room types', 'error')
    }
  }, [])

  // ─── Data Loaders ────────────────────────────────────────────────────────────

  const loadRecommendations = useCallback(async (hotelId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/revenue/recommendations?hotelId=${hotelId}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setRecommendations(data.data)
      } else {
        setRecommendations([])
      }
    } catch (err) {
      showAlert('Failed to load recommendations', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadComparison = useCallback(async (hotelId: string, roomTypeId: string, date: string) => {
    if (!roomTypeId) return
    try {
      const res = await fetch(`/api/v1/revenue/comparison?hotelId=${hotelId}&roomTypeId=${roomTypeId}&checkInDate=${date}`)
      const data = await res.json()
      if (data.success) {
        setComparison(data.data)
      } else {
        setComparison(null)
      }
    } catch (err) {
      showAlert('Failed to load pricing comparisons', 'error')
    }
  }, [])

  const loadCompetitors = useCallback(async (hotelId: string) => {
    try {
      const res = await fetch(`/api/v1/revenue/competitors?hotelId=${hotelId}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setCompetitors(data.data)
      } else {
        setCompetitors([])
      }
    } catch (err) {
      showAlert('Failed to load competitor master list', 'error')
    }
  }, [])

  const loadHistory = useCallback(async (hotelId: string) => {
    try {
      const res = await fetch(`/api/v1/revenue/pricing-history?hotelId=${hotelId}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setHistory(data.data)
      } else {
        setHistory([])
      }
    } catch (err) {
      showAlert('Failed to load pricing history log', 'error')
    }
  }, [])

  // Trigger Seeding of Mock recommendations and prices
  const handleSeedMockData = async () => {
    if (!selectedHotelId) return
    setLoading(true)
    try {
      // 1. Generate Mock Recommendations
      const res1 = await fetch('/api/v1/revenue/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: selectedHotelId })
      })

      // 2. Add some competitor hotels if competitor set is empty
      if (competitors.length === 0) {
        const defaultComps = [
          { name: 'Tirumala Heritage Inn', location: 'Near Temple Road', pricingSegment: 'budget', importance: 'HIGH', starRating: 3 },
          { name: 'Srinivasa Residency', location: 'Railway Station Road', pricingSegment: 'mid-market', importance: 'MEDIUM', starRating: 3 },
          { name: 'Fortune Grand Tirupati', location: 'Bypass Road', pricingSegment: 'premium', importance: 'LOW', starRating: 4 }
        ]
        for (const comp of defaultComps) {
          await fetch('/api/v1/revenue/competitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hotelId: selectedHotelId,
              name: comp.name,
              location: comp.location,
              pricingSegment: comp.pricingSegment,
              importance: comp.importance,
              starRating: comp.starRating,
              isActive: true
            })
          })
        }
        await loadCompetitors(selectedHotelId)
      }

      // 3. Upload mock prices for the competitors we have
      if (competitors.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0]!
        const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]!
        
        const mockPrices: any[] = []
        for (const comp of competitors) {
          const compBase = comp.pricingSegment === 'premium' ? 3200 : comp.pricingSegment === 'budget' ? 1800 : 2400
          
          roomTypes.forEach(rt => {
            const rtOffset = rt.name.toLowerCase().includes('deluxe') ? 400 : rt.name.toLowerCase().includes('suite') ? 1000 : 0
            mockPrices.push({
              competitorHotelId: comp.id,
              roomType: rt.name,
              listedPrice: compBase + rtOffset + Math.round(Math.random() * 200 - 100),
              taxesIncluded: true,
              availability: true,
              checkInDate: todayStr,
              checkOutDate: tomorrowStr,
              sourcePlatform: 'Booking.com'
            })
          })
        }

        await fetch('/api/v1/revenue/competitors/prices/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prices: mockPrices })
        })
      }

      showAlert('Simulated market prices and recommendations generated successfully!')
      loadRecommendations(selectedHotelId)
      if (selectedRoomTypeId) {
        loadComparison(selectedHotelId, selectedRoomTypeId, checkInDate)
      }
      loadHistory(selectedHotelId)
    } catch (err) {
      showAlert('Failed to generate mock data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const handleApproveRecommendation = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/revenue/recommendations/${id}/approve`, {
        method: 'POST'
      })
      if (res.ok) {
        showAlert('Pricing recommendation approved and applied successfully!')
        loadRecommendations(selectedHotelId)
        loadHistory(selectedHotelId)
        if (selectedRoomTypeId) {
          loadComparison(selectedHotelId, selectedRoomTypeId, checkInDate)
        }
      }
    } catch (err) {
      showAlert('Failed to approve recommendation', 'error')
    }
  }

  const handleRejectRecommendation = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/revenue/recommendations/${id}/reject`, {
        method: 'POST'
      })
      if (res.ok) {
        showAlert('Pricing recommendation rejected and cleared.', 'info')
        loadRecommendations(selectedHotelId)
      }
    } catch (err) {
      showAlert('Failed to reject recommendation', 'error')
    }
  }

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!compName || !compLocation) return
    try {
      const res = await fetch('/api/v1/revenue/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: selectedHotelId,
          name: compName,
          location: compLocation,
          starRating: compStars,
          pricingSegment: compSegment,
          importance: compImportance,
          isActive: true
        })
      })
      if (res.ok) {
        showAlert('Competitor hotel added to set successfully!')
        setCompName('')
        setCompLocation('')
        loadCompetitors(selectedHotelId)
      }
    } catch (err) {
      showAlert('Failed to add competitor', 'error')
    }
  }

  const handleDeleteCompetitor = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/revenue/competitors/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showAlert('Competitor hotel removed from set.', 'info')
        loadCompetitors(selectedHotelId)
      }
    } catch (err) {
      showAlert('Failed to delete competitor', 'error')
    }
  }

  const handleUploadPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadCompId || !uploadRoomType || !uploadPrice) return
    try {
      const checkOut = new Date(uploadCheckIn)
      checkOut.setDate(checkOut.getDate() + 1)
      
      const res = await fetch('/api/v1/revenue/competitors/prices/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prices: [{
            competitorHotelId: uploadCompId,
            roomType: uploadRoomType,
            listedPrice: Number(uploadPrice),
            taxesIncluded: true,
            availability: true,
            checkInDate: uploadCheckIn,
            checkOutDate: checkOut.toISOString().split('T')[0]!,
            sourcePlatform: 'Manual Upload'
          }]
        })
      })
      if (res.ok) {
        showAlert('Competitor price upload recorded successfully!')
        setUploadPrice('')
        if (selectedRoomTypeId) {
          loadComparison(selectedHotelId, selectedRoomTypeId, checkInDate)
        }
      }
    } catch (err) {
      showAlert('Failed to upload price record', 'error')
    }
  }

  // Effect Loop
  useEffect(() => {
    loadHotels()
  }, [])

  useEffect(() => {
    if (selectedHotelId) {
      loadRoomTypes(selectedHotelId)
      loadCompetitors(selectedHotelId)
      loadRecommendations(selectedHotelId)
      loadHistory(selectedHotelId)
    }
  }, [selectedHotelId, loadRoomTypes, loadCompetitors, loadRecommendations, loadHistory])

  useEffect(() => {
    if (selectedHotelId && selectedRoomTypeId && checkInDate) {
      loadComparison(selectedHotelId, selectedRoomTypeId, checkInDate)
    }
  }, [selectedHotelId, selectedRoomTypeId, checkInDate, loadComparison])

  return (
    <div style={{ padding: '30px', minHeight: '100vh', background: '#070a14' }}>
      {/* Alert toast notification */}
      {alertMsg && (
        <div
          id="toast-notification"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#fff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            borderLeft: '4px solid',
            background: 'rgba(16,22,42,0.95)',
            borderColor: alertMsg.type === 'success' ? '#10b981' : alertMsg.type === 'error' ? '#ef4444' : '#3b82f6'
          }}
        >
          {alertMsg.type === 'success' ? <Check size={16} color="#10b981" /> : <AlertTriangle size={16} color="#ef4444" />}
          {alertMsg.text}
        </div>
      )}

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 id="pricing-page-title" style={{ fontSize: '26px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
            📊 Revenue Intelligence & Dynamic Pricing
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Analyze market benchmarks, configure competitor mappings, and adjust room rates in real-time.
          </p>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Hotel Switcher */}
          <select
            id="hotel-switcher"
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value)}
            style={{
              background: 'rgba(16, 22, 42, 0.8)',
              border: '1px solid var(--border-card)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                🏨 {h.name}
              </option>
            ))}
          </select>

          {/* Seed Button */}
          <button
            id="btn-seed-simulation"
            onClick={handleSeedMockData}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid var(--primary)',
              borderRadius: '8px',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            Simulate Market Data
          </button>
        </div>
      </div>

      {/* Dashboard Sub-Tabs switcher */}
      <div className="tab-container" style={{ display: 'flex', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px' }}>
        <button
          id="tab-recommendations"
          className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
          style={{ padding: '12px 4px', fontSize: '13px', fontWeight: 600, borderBottom: activeTab === 'recommendations' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'recommendations' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
        >
          💡 Today's Price Recommendations
        </button>
        <button
          id="tab-comparison"
          className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
          style={{ padding: '12px 4px', fontSize: '13px', fontWeight: 600, borderBottom: activeTab === 'comparison' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'comparison' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
        >
          🔍 Competitor Comparison
        </button>
        <button
          id="tab-competitors"
          className={`tab-button ${activeTab === 'competitors' ? 'active' : ''}`}
          onClick={() => setActiveTab('competitors')}
          style={{ padding: '12px 4px', fontSize: '13px', fontWeight: 600, borderBottom: activeTab === 'competitors' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'competitors' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
        >
          ⚙️ Competitor Master
        </button>
        <button
          id="tab-history"
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{ padding: '12px 4px', fontSize: '13px', fontWeight: 600, borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
        >
          📜 Price Change Logs
        </button>
        <button
          id="tab-settings"
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{ padding: '12px 4px', fontSize: '13px', fontWeight: 600, borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
        >
          🛡️ Safeguards & Rules
        </button>
      </div>

      {/* Main Tab Panels Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* TAB 1: RECOMMENDATIONS */}
        {activeTab === 'recommendations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Active Pricing Strategies & Suggestions</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Generated by Yield Optimizer Service</span>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading pricing suggestions...</div>
            ) : recommendations.length === 0 ? (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                <ShieldAlert style={{ color: 'var(--text-muted)', marginBottom: '12px' }} size={32} />
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>No Price Recommendations Available</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px', maxWidth: '400px', margin: '6px auto 0' }}>
                  Please seed simulator pricing data to generate dynamic pricing strategies for standard rooms and suites.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recommendations.map((rec) => {
                  const offset = rec.recommendedPrice - rec.currentPrice
                  const offsetPct = Math.round((offset / rec.currentPrice) * 100)
                  const isIncrease = offset > 0
                  
                  return (
                    <div
                      key={rec.id}
                      className="glass-card"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '20px',
                        background: 'rgba(16,22,42,0.65)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        {/* Icon Gauge indicator */}
                        <div
                          style={{
                            background: isIncrease ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${isIncrease ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isIncrease ? '#10b981' : '#ef4444'
                          }}
                        >
                          <TrendingUp size={18} style={{ transform: isIncrease ? 'none' : 'rotate(180deg)' }} />
                        </div>

                        {/* Title details */}
                        <div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <strong style={{ fontSize: '14px' }}>{rec.roomTypeName}</strong>
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              📅 Check-in: {rec.targetDate}
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', maxWidth: '500px' }}>
                            💡 {rec.rationale}
                          </p>
                        </div>
                      </div>

                      {/* Pricing comparisons and Actions */}
                      <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                        {/* Comparison box */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Current Rate: ₹{rec.currentPrice}</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', justifyContent: 'flex-end' }}>
                            <strong style={{ fontSize: '18px', color: 'var(--primary)' }}>₹{rec.recommendedPrice}</strong>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: isIncrease ? '#10b981' : '#ef4444'
                              }}
                            >
                              {isIncrease ? '+' : ''}{offsetPct}%
                            </span>
                          </div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Confidence: {Math.round(rec.confidenceScore * 100)}%</span>
                        </div>

                        {/* Actions Panel */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {rec.appliedAt ? (
                            <span
                              style={{
                                padding: '6px 12px',
                                background: 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.3)',
                                color: '#10b981',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px'
                              }}
                            >
                              Applied
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApproveRecommendation(rec.id)}
                                style={{
                                  padding: '8px 12px',
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  border: 'none',
                                  color: '#fff',
                                  fontWeight: 600,
                                  fontSize: '11px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectRecommendation(rec.id)}
                                style={{
                                  padding: '8px',
                                  background: 'rgba(239,68,68,0.1)',
                                  border: '1px solid rgba(239,68,68,0.2)',
                                  color: '#ef4444',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMPARISON DASHBOARD */}
        {activeTab === 'comparison' && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' }}>
            {/* Main Comparison Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Rate Shopper & Comparison Matrix</h3>
                  
                  {/* Selector panel */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={selectedRoomTypeId}
                      onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-card)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    >
                      {roomTypes.map(rt => (
                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-card)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                  </div>
                </div>

                {!comparison ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No pricing comparison data is available for this room type and check-in date. Seed simulated data to populate stats.
                  </div>
                ) : (
                  <div>
                    {/* Metrics grid comparison */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Our Rate</span>
                        <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0', color: 'var(--primary)' }}>₹{comparison.ourCurrentPrice}</div>
                        <span className={`status-badge ${comparison.status === 'Overpriced' ? 'occupied' : comparison.status === 'Underpriced' ? 'outoforder' : 'available'}`}>
                          {comparison.status}
                        </span>
                      </div>
                      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Market Avg</span>
                        <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0' }}>₹{comparison.marketAvg}</div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Low: ₹{comparison.marketMin}</span>
                      </div>
                      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Market Median</span>
                        <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0' }}>₹{comparison.marketMedian}</div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Diff: {comparison.differencePercentage}%</span>
                      </div>
                      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suggested Range</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0', color: '#f59e0b' }}>
                          ₹{comparison.suggestedPriceRange.min} - ₹{comparison.suggestedPriceRange.max}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Based on Median</span>
                      </div>
                    </div>

                    {/* Competitor price details table */}
                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Market Shopper Results</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '10px' }}>Competitor Hotel</th>
                          <th style={{ padding: '10px' }}>Pricing Segment</th>
                          <th style={{ padding: '10px' }}>Tirupathi Importance</th>
                          <th style={{ padding: '10px' }}>Channel</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Scraped Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.competitors.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No pricing points recorded.</td>
                          </tr>
                        ) : (
                          comparison.competitors.map((c: any, index: number) => (
                            <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '10px', fontWeight: 600 }}>{c.competitorName}</td>
                              <td style={{ padding: '10px' }}>
                                <span style={{ textTransform: 'capitalize', fontSize: '11px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {c.pricingSegment}
                                </span>
                              </td>
                              <td style={{ padding: '10px' }}>
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: c.importance === 'HIGH' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: c.importance === 'HIGH' ? '#ef4444' : '#fff' }}>
                                  {c.importance}
                                </span>
                              </td>
                              <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{c.sourcePlatform}</td>
                              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>₹{c.listedPrice}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Price Upload Panel Side */}
            <div className="glass-card" style={{ padding: '20px', height: 'fit-content' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '15px' }}>➕ Record Scraped Rate</h3>
              <form onSubmit={handleUploadPrice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Select Competitor</label>
                  <select
                    value={uploadCompId}
                    onChange={(e) => setUploadCompId(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-card)',
                      color: '#fff',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      width: '100%',
                      marginTop: '4px'
                    }}
                    required
                  >
                    <option value="">-- select hotel --</option>
                    {competitors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Room Type Name</label>
                  <select
                    value={uploadRoomType}
                    onChange={(e) => setUploadRoomType(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-card)',
                      color: '#fff',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      width: '100%',
                      marginTop: '4px'
                    }}
                    required
                  >
                    <option value="">-- select room type --</option>
                    {roomTypes.map(rt => (
                      <option key={rt.id} value={rt.name}>{rt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Listed Price (₹)</label>
                  <input
                    type="number"
                    value={uploadPrice}
                    onChange={(e) => setUploadPrice(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-card)',
                      color: '#fff',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      width: '100%',
                      marginTop: '4px'
                    }}
                    placeholder="2499"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Check-in Date</label>
                  <input
                    type="date"
                    value={uploadCheckIn}
                    onChange={(e) => setUploadCheckIn(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-card)',
                      color: '#fff',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      width: '100%',
                      marginTop: '4px'
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#060913',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  Record Rate point
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: COMPETITOR MASTER */}
        {activeTab === 'competitors' && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr', gap: '20px' }}>
            {/* Competitor lists */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Competitor Set Master</h3>
              
              {competitors.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No competitor hotels configured for this stayflexi hotel property. Configure a competitor mapping on the right.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {competitors.map((comp) => (
                    <div
                      key={comp.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '8px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px' }}>{comp.name}</strong>
                          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>
                            {comp.pricingSegment}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                          📍 {comp.location} | {comp.starRating ? `${comp.starRating}★ rating` : 'no rating'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: comp.importance === 'HIGH' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: comp.importance === 'HIGH' ? '#ef4444' : '#fff', fontWeight: 600 }}>
                          {comp.importance} IMPORTANCE
                        </span>

                        <button
                          onClick={() => handleDeleteCompetitor(comp.id)}
                          style={{
                            padding: '6px',
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Competitor Panel */}
            <div className="glass-card" style={{ padding: '20px', height: 'fit-content' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '15px' }}>⚙️ Add Competitor Hotel</h3>
              <form onSubmit={handleAddCompetitor} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hotel Name</label>
                  <input
                    type="text"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-card)',
                      color: '#fff',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      width: '100%',
                      marginTop: '4px'
                    }}
                    placeholder="Marriott Executive Apartments"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Location/Distance description</label>
                  <input
                    type="text"
                    value={compLocation}
                    onChange={(e) => setCompLocation(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-card)',
                      color: '#fff',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      width: '100%',
                      marginTop: '4px'
                    }}
                    placeholder="1.2 km from temple, Alipiri bypass"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Star Rating</label>
                    <select
                      value={compStars}
                      onChange={(e) => setCompStars(Number(e.target.value))}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid var(--border-card)',
                        color: '#fff',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        width: '100%',
                        marginTop: '4px'
                      }}
                    >
                      <option value="2">2 Star</option>
                      <option value="3">3 Star</option>
                      <option value="4">4 Star</option>
                      <option value="5">5 Star</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Segment</label>
                    <select
                      value={compSegment}
                      onChange={(e) => setCompSegment(e.target.value)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid var(--border-card)',
                        color: '#fff',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        width: '100%',
                        marginTop: '4px'
                      }}
                    >
                      {PRICING_SEGMENTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Competitor Relevance</label>
                  <select
                    value={compImportance}
                    onChange={(e) => setCompImportance(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-card)',
                      color: '#fff',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      width: '100%',
                      marginTop: '4px'
                    }}
                  >
                    {IMPORTANCE_LEVELS.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#060913',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} /> Add to competitor set
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOG HISTORY */}
        {activeTab === 'history' && (
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Pricing Change Audit Log</h3>
            
            {history.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No rate recommendations have been approved or applied yet. Approved rates will log audit trails here.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Target Date</th>
                    <th style={{ padding: '10px' }}>Action Type</th>
                    <th style={{ padding: '10px' }}>Old Rate</th>
                    <th style={{ padding: '10px' }}>New Approved Rate</th>
                    <th style={{ padding: '10px' }}>Performed By</th>
                    <th style={{ padding: '10px' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => {
                    const diff = Number(log.newPrice) - Number(log.previousPrice)
                    const diffColor = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#fff'
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{log.targetDate}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(0, 242, 254, 0.08)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600 }}>
                            {log.actionType}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>₹{Number(log.previousPrice).toFixed(2)}</td>
                        <td style={{ padding: '10px', fontWeight: 700, color: diffColor }}>
                          ₹{Number(log.newPrice).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{log.performedBy || 'System/yield'}</td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 5: SAFEGUARDS & RULES */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Floor and ceiling controls */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>🛡️ Rate Safeguards (Floor & Ceiling protection)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>
                System-suggested price recommendations will never cross these boundaries unless explicitly override-approved by an owner.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {roomTypes.map(rt => {
                  const base = rt.basePrice.toNumber()
                  return (
                    <div
                      key={rt.id}
                      style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '8px'
                      }}
                    >
                      <strong style={{ fontSize: '13px' }}>{rt.name}</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '12px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Floor Price (Min)</label>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>₹{Math.round(base * 0.8)}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Normal Price</label>
                          <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px' }}>₹{base}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ceiling Price (Max)</label>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>₹{Math.round(base * 2.0)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Active strategies and weekend config */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>⚙️ Yield Rules & Configurations</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Pricing Execution Mode</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                      <input type="radio" name="yield-mode" defaultChecked />
                      <span><strong>Advisory Mode</strong> (System suggests rates, managers approve/reject before update)</span>
                    </label>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <input type="radio" name="yield-mode" disabled />
                      <span><strong>Approval Mode</strong> (System syncs to Stayflexi channels after approval)</span>
                    </label>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <input type="radio" name="yield-mode" disabled />
                      <span><strong>Auto-Pricing Mode</strong> (System updates prices automatically within safe rules)</span>
                    </label>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Active Strategic Yield Rules</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span>Rule 1: Underpriced protection</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>ACTIVE</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span>Rule 2: Low occupancy discount</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>ACTIVE</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span>Rule 3: High occupancy surge</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>ACTIVE</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span>Rule 4: Weekend premium</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>ACTIVE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
