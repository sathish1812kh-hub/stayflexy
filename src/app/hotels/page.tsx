'use client'

import React, { useEffect, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import dataClient, { Hotel } from '../dataClient'
import { Building2, Plus, Globe, Phone, Mail, Navigation } from 'lucide-react'

export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('IND')
  const [address, setAddress] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [starRating, setStarRating] = useState('5')

  useEffect(() => {
    async function load() {
      const result = await dataClient.getHotels()
      setHotels(result)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !city || !country) return

    const newHotel = await dataClient.createHotel({
      name,
      city,
      country,
      address: address || null,
      state: state || null,
      postalCode: null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      starRating: parseInt(starRating, 10),
      timezone: 'IST',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      status: 'ACTIVE'
    })

    setHotels([...hotels, newHotel])
    setShowAddForm(false)
    
    // Reset Form
    setName('')
    setCity('')
    setCountry('IND')
    setAddress('')
    setState('')
    setPhone('')
    setEmail('')
    setWebsite('')
    setStarRating('5')
  }

  return (
    <DashboardShell
      activeTab="hotels"
      title="Hotel Properties"
      subtitle="Register and manage hotel assets mapped within the supergraph network"
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus style={{ width: '18px', height: '18px' }} />
          <span>{showAddForm ? 'Close Form' : 'Register Property'}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="glass-card" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Register New Hotel Property</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Hotel Name *</label>
              <input type="text" className="input-field" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Stayflexi Grand Lodge" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>City *</label>
              <input type="text" className="input-field" required value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Bangalore" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Country *</label>
              <input type="text" className="input-field" required value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. IND" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>State / Region</label>
              <input type="text" className="input-field" value={state} onChange={e => setState(e.target.value)} placeholder="e.g. Karnataka" />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Address</label>
              <input type="text" className="input-field" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 15 Main Road, Sector 3" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Contact Phone</label>
              <input type="text" className="input-field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +91 80 49112233" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email Address</label>
              <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. contact@hotel.com" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Website Domain</label>
              <input type="text" className="input-field" value={website} onChange={e => setWebsite(e.target.value)} placeholder="e.g. https://stayflexi.com" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Star Rating</label>
              <select className="input-field" value={starRating} onChange={e => setStarRating(e.target.value)}>
                <option value="5">5 Star Deluxe</option>
                <option value="4">4 Star Premium</option>
                <option value="3">3 Star Executive</option>
                <option value="2">2 Star Economy</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" className="btn-primary">Submit Registration</button>
            </div>
          </form>
        </div>
      )}

      {/* Properties List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {hotels.map(hotel => (
          <div key={hotel.id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 180px', gap: '20px', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', height: '70px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 style={{ width: '32px', height: '32px', color: 'var(--primary)' }} />
            </div>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{hotel.name}</span>
                <span className={`status-badge ${hotel.status === 'ACTIVE' ? 'available' : 'blocked'}`}>
                  {hotel.status}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                {hotel.address && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Navigation style={{ width: '13px', height: '13px' }} />
                    <span>{hotel.address}, {hotel.city}</span>
                  </span>
                )}
                {hotel.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone style={{ width: '13px', height: '13px' }} />
                    <span>{hotel.phone}</span>
                  </span>
                )}
                {hotel.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail style={{ width: '13px', height: '13px' }} />
                    <span>{hotel.email}</span>
                  </span>
                )}
                {hotel.website && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Globe style={{ width: '13px', height: '13px' }} />
                    <span>{hotel.website}</span>
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                {hotel.starRating} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>★ Rating</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                ID: {hotel.id}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  )
}
