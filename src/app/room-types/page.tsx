'use client'

import React, { useEffect, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import dataClient, { RoomType, Hotel } from '../dataClient'
import { Layers, Plus, Tag, ShieldAlert } from 'lucide-react'

export default function RoomTypesPage() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  // Form State
  const [hotelId, setHotelId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [maxOccupancy, setMaxOccupancy] = useState('2')
  const [maxAdults, setMaxAdults] = useState('2')
  const [maxChildren, setMaxChildren] = useState('0')
  const [maxInfants, setMaxInfants] = useState('1')
  const [minChildAge, setMinChildAge] = useState('7')
  const [maxChildAge, setMaxChildAge] = useState('12')
  const [minInfantAge, setMinInfantAge] = useState('0')
  const [maxInfantAge, setMaxInfantAge] = useState('6')
  const [minOccupancy, setMinOccupancy] = useState('1')
  const [absoluteMax, setAbsoluteMax] = useState('3')
  const [hourlyPrice, setHourlyPrice] = useState('')
  const [extraBedPrice, setExtraBedPrice] = useState('0')
  const [extraGuestPrice, setExtraGuestPrice] = useState('0')
  const [maxExtraBeds, setMaxExtraBeds] = useState('0')
  const [amenities, setAmenities] = useState('')

  useEffect(() => {
    async function load() {
      const rt = await dataClient.getRoomTypes()
      const h = await dataClient.getHotels()
      setRoomTypes(rt)
      setHotels(h)
      if (h.length > 0 && h[0]?.id) setHotelId(h[0].id)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hotelId || !name || !basePrice) return

    const newRt = await dataClient.createRoomType({
      hotelId,
      name,
      description: description || null,
      basePrice: parseFloat(basePrice),
      maxOccupancy: parseInt(maxOccupancy, 10),
      maxAdults: parseInt(maxAdults, 10),
      maxChildren: parseInt(maxChildren, 10),
      maxInfants: parseInt(maxInfants, 10),
      minChildAge: parseInt(minChildAge, 10),
      maxChildAge: parseInt(maxChildAge, 10),
      minInfantAge: parseInt(minInfantAge, 10),
      maxInfantAge: parseInt(maxInfantAge, 10),
      minOccupancy: parseInt(minOccupancy, 10),
      absoluteMax: parseInt(absoluteMax, 10),
      hourlyPrice: hourlyPrice ? parseFloat(hourlyPrice) : null,
      extraBedPrice: parseFloat(extraBedPrice),
      extraGuestPrice: parseFloat(extraGuestPrice),
      maxExtraBeds: parseInt(maxExtraBeds, 10),
      amenities: amenities ? amenities.split(',').map(s => s.trim()) : null
    })

    setRoomTypes([...roomTypes, newRt])
    setShowAddForm(false)

    // Reset Form
    setName('')
    setDescription('')
    setBasePrice('')
    setMaxOccupancy('2')
    setMaxAdults('2')
    setMaxChildren('0')
    setMaxInfants('1')
    setMinChildAge('7')
    setMaxChildAge('12')
    setMinInfantAge('0')
    setMaxInfantAge('6')
    setMinOccupancy('1')
    setAbsoluteMax('3')
    setHourlyPrice('')
    setExtraBedPrice('0')
    setExtraGuestPrice('0')
    setMaxExtraBeds('0')
    setAmenities('')
  }

  return (
    <DashboardShell
      activeTab="room-types"
      title="Room Categories"
      subtitle="Expose and configure structural lodging categories within the supergraph schema"
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus style={{ width: '18px', height: '18px' }} />
          <span>{showAddForm ? 'Close Form' : 'Add Room Category'}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="glass-card" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Add New Room Category</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ gridColumn: 'span 3', borderBottom: '1px solid var(--border-card)', paddingBottom: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>General Details</span>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Associate to Property *</label>
              <select className="input-field" required value={hotelId} onChange={e => setHotelId(e.target.value)}>
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Category Name *</label>
              <input type="text" className="input-field" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Superior Garden View" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Base Price (USD/night) *</label>
              <input type="number" className="input-field" required value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="e.g. 199.00" />
            </div>

            <div style={{ gridColumn: 'span 3', borderBottom: '1px solid var(--border-card)', paddingBottom: '8px', marginTop: '16px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>Occupancy Limits & Age Thresholds</span>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Max Occupancy (Total) *</label>
              <input type="number" className="input-field" required value={maxOccupancy} onChange={e => setMaxOccupancy(e.target.value)} placeholder="e.g. 4" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Max Adults *</label>
              <input type="number" className="input-field" required value={maxAdults} onChange={e => setMaxAdults(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Max Children</label>
              <input type="number" className="input-field" required value={maxChildren} onChange={e => setMaxChildren(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Max Infants</label>
              <input type="number" className="input-field" required value={maxInfants} onChange={e => setMaxInfants(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Child Age (Min - Max)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" className="input-field" style={{ width: '50%' }} value={minChildAge} onChange={e => setMinChildAge(e.target.value)} placeholder="Min (7)" />
                <input type="number" className="input-field" style={{ width: '50%' }} value={maxChildAge} onChange={e => setMaxChildAge(e.target.value)} placeholder="Max (12)" />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Infant Age (Min - Max)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" className="input-field" style={{ width: '50%' }} value={minInfantAge} onChange={e => setMinInfantAge(e.target.value)} placeholder="Min (0)" />
                <input type="number" className="input-field" style={{ width: '50%' }} value={maxInfantAge} onChange={e => setMaxInfantAge(e.target.value)} placeholder="Max (6)" />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Min Occupant Count *</label>
              <input type="number" className="input-field" required value={minOccupancy} onChange={e => setMinOccupancy(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Absolute Max Limit *</label>
              <input type="number" className="input-field" required value={absoluteMax} onChange={e => setAbsoluteMax(e.target.value)} placeholder="e.g. 5" />
            </div>

            <div style={{ gridColumn: 'span 3', borderBottom: '1px solid var(--border-card)', paddingBottom: '8px', marginTop: '16px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>Flexible stay & Rates Surcharges</span>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Hourly Price (USD/hour)</label>
              <input type="number" className="input-field" value={hourlyPrice} onChange={e => setHourlyPrice(e.target.value)} placeholder="e.g. 25.00" />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Extra Guest Surcharge (USD)</label>
              <input type="number" className="input-field" value={extraGuestPrice} onChange={e => setExtraGuestPrice(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Extra Bed Cost & Max Beds</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" className="input-field" style={{ width: '60%' }} value={extraBedPrice} onChange={e => setExtraBedPrice(e.target.value)} placeholder="Price ($)" />
                <input type="number" className="input-field" style={{ width: '40%' }} value={maxExtraBeds} onChange={e => setMaxExtraBeds(e.target.value)} placeholder="Max (e.g. 1)" />
              </div>
            </div>

            <div style={{ gridColumn: 'span 3', borderBottom: '1px solid var(--border-card)', paddingBottom: '8px', marginTop: '16px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>Description & Amenities</span>
            </div>

            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Description</label>
              <textarea className="input-field" style={{ minHeight: '60px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide high-level lodging benefits..." />
            </div>

            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Amenities (Comma-separated)</label>
              <input type="text" className="input-field" value={amenities} onChange={e => setAmenities(e.target.value)} placeholder="e.g. Ocean view, Balcony, Mini Bar, Free Wi-Fi" />
            </div>

            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" className="btn-primary">Add Category</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        {roomTypes.map(rt => {
          const associatedHotel = hotels.find(h => h.id === rt.hotelId)
          return (
            <div key={rt.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>{rt.name}</span>
                  <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {associatedHotel ? associatedHotel.name : 'Unknown Hotel'}
                  </div>
                </div>
                
                <div style={{ background: 'rgba(0,242,254,0.15)', color: 'var(--primary)', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', fontSize: '15px' }}>
                  ${rt.basePrice} <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)' }}>/ nt</span>
                </div>
              </div>

              {rt.description && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px', flexGrow: 1 }}>
                  {rt.description}
                </p>
              )}

              {/* Extended Occupancy and Pricing Info */}
              <div style={{ marginBottom: '16px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Max Capacity:</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>
                    {rt.maxAdults ?? 2} Adults / {rt.maxChildren ?? 0} Child / {rt.maxInfants ?? 1} Inf
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Age limits:</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Kids ({rt.minChildAge ?? 7}-{rt.maxChildAge ?? 12}) \| Inf ({rt.minInfantAge ?? 0}-{rt.maxInfantAge ?? 6})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-card)', paddingTop: '6px' }}>
                  <span>Hourly Rate:</span>
                  <span style={{ fontWeight: 600, color: rt.hourlyPrice ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {rt.hourlyPrice ? `$${rt.hourlyPrice}/hr` : 'N/A'}
                  </span>
                </div>
                {(rt.extraBedPrice || rt.extraGuestPrice) ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Extra Bed / Guest:</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      ${rt.extraBedPrice ?? 0} (Max {rt.maxExtraBeds ?? 0}) / ${rt.extraGuestPrice ?? 0}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Amenities pill box */}
              {rt.amenities && rt.amenities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid var(--border-card)', paddingTop: '14px' }}>
                  {rt.amenities.map((amenity, idx) => (
                    <span key={idx} style={{ background: 'rgba(255,255,255,0.04)', fontSize: '11px', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-card)' }}>
                      {amenity}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </DashboardShell>
  )
}
