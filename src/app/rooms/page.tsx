'use client'

import React, { useEffect, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import dataClient, { Room, Hotel, RoomType } from '../dataClient'
import { KeyRound, Plus, Settings, MessageSquarePlus, RefreshCw } from 'lucide-react'

type StatusType = Room['status']

export default function RoomsGridPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  
  const [selectedHotelId, setSelectedHotelId] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  // Add Room Form State
  const [addRoomNumber, setAddRoomNumber] = useState('')
  const [addRoomTypeId, setAddRoomTypeId] = useState('')
  const [addFloor, setAddFloor] = useState('1')
  const [addNotes, setAddNotes] = useState('')
  const [addWing, setAddWing] = useState('')
  const [addZone, setAddZone] = useState('')
  const [addWifiSSID, setAddWifiSSID] = useState('')
  const [addWifiPassword, setAddWifiPassword] = useState('')
  const [addArrivalNotes, setAddArrivalNotes] = useState('')
  const [addLockVendor, setAddLockVendor] = useState('')
  const [addLockDeviceId, setAddLockDeviceId] = useState('')
  const [addLockSecret, setAddLockSecret] = useState('')
  const [addConnectingRoomId, setAddConnectingRoomId] = useState('')
  const [addParentRoomId, setAddParentRoomId] = useState('')

  // Update Status Form State
  const [updateStatus, setUpdateStatus] = useState<StatusType>('AVAILABLE')
  const [updateReason, setUpdateReason] = useState('')

  async function loadData() {
    const r = await dataClient.getRooms()
    const h = await dataClient.getHotels()
    const rt = await dataClient.getRoomTypes()
    
    setRooms(r)
    setHotels(h)
    setRoomTypes(rt)
    
    if (h.length > 0 && !selectedHotelId && h[0]?.id) {
      setSelectedHotelId(h[0].id)
    }
    if (rt.length > 0 && !addRoomTypeId && rt[0]?.id) {
      setAddRoomTypeId(rt[0].id)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHotelId || !addRoomTypeId || !addRoomNumber) return

    const newRoom = await dataClient.createRoom({
      hotelId: selectedHotelId,
      roomTypeId: addRoomTypeId,
      roomNumber: addRoomNumber,
      floor: parseInt(addFloor, 10),
      notes: addNotes || null,
      wing: addWing || null,
      zone: addZone || null,
      wifiSSID: addWifiSSID || null,
      wifiPassword: addWifiPassword || null,
      arrivalNotes: addArrivalNotes || null,
      lockVendor: addLockVendor || null,
      lockDeviceId: addLockDeviceId || null,
      lockSecret: addLockSecret || null,
      connectingRoomId: addConnectingRoomId || null,
      parentRoomId: addParentRoomId || null,
    })

    setRooms([...rooms, newRoom])
    setShowAddForm(false)
    setAddRoomNumber('')
    setAddNotes('')
    setAddWing('')
    setAddZone('')
    setAddWifiSSID('')
    setAddWifiPassword('')
    setAddArrivalNotes('')
    setAddLockVendor('')
    setAddLockDeviceId('')
    setAddLockSecret('')
    setAddConnectingRoomId('')
    setAddParentRoomId('')
  }

  const handleOpenUpdate = (room: Room) => {
    setSelectedRoom(room)
    setUpdateStatus(room.status)
    setUpdateReason('')
    setShowUpdateModal(true)
  }

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoom) return

    const updated = await dataClient.updateRoomStatus(selectedRoom.id, updateStatus, updateReason)
    if (updated) {
      setRooms(rooms.map(r => r.id === selectedRoom.id ? updated : r))
      setShowUpdateModal(false)
      setSelectedRoom(null)
    }
  }

  const filteredRooms = rooms.filter(r => r.hotelId === selectedHotelId)
  const currentHotel = hotels.find(h => h.id === selectedHotelId)

  return (
    <DashboardShell
      activeTab="rooms"
      title="Physical Rooms Grid"
      subtitle="Interactive real-time state operations board for on-site property tracking"
    >
      {/* Property Selector & Header actions */}
      <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Focus Property:</span>
          <select 
            className="input-field" 
            style={{ width: '280px' }}
            value={selectedHotelId}
            onChange={e => setSelectedHotelId(e.target.value)}
          >
            {hotels.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-card)' }} onClick={loadData}>
            <RefreshCw style={{ width: '16px', height: '16px' }} />
          </button>
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus style={{ width: '18px', height: '18px' }} />
            <span>{showAddForm ? 'Close Form' : 'Register Room'}</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '16px' }}>Register New Room</h2>
          <form onSubmit={handleCreateRoom} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ gridColumn: 'span 3', borderBottom: '1px solid var(--border-card)', paddingBottom: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>General Info</span>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Room Number *</label>
              <input type="text" className="input-field" required value={addRoomNumber} onChange={e => setAddRoomNumber(e.target.value)} placeholder="e.g. 104" />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Associate Category *</label>
              <select className="input-field" required value={addRoomTypeId} onChange={e => setAddRoomTypeId(e.target.value)}>
                {roomTypes.filter(rt => rt.hotelId === selectedHotelId).map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Floor *</label>
              <input type="number" className="input-field" required value={addFloor} onChange={e => setAddFloor(e.target.value)} placeholder="e.g. 1" />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Wing / Block</label>
              <input type="text" className="input-field" value={addWing} onChange={e => setAddWing(e.target.value)} placeholder="e.g. East Wing" />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Housekeeping Zone</label>
              <input type="text" className="input-field" value={addZone} onChange={e => setAddZone(e.target.value)} placeholder="e.g. Zone 2-B" />
            </div>

            <div style={{ gridColumn: 'span 3', borderBottom: '1px solid var(--border-card)', paddingBottom: '6px', marginTop: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>IoT Smart Lock Credentials</span>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Lock Vendor / System</label>
              <select className="input-field" value={addLockVendor} onChange={e => setAddLockVendor(e.target.value)}>
                <option value="">No Smart Lock</option>
                <option value="TTLOCK">TTLock SDK</option>
                <option value="SALTO">Salto Cloud</option>
                <option value="IGLOOHOME">Igloohome API</option>
                <option value="PIN_CODE">Static Pin Box</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Lock Device ID / MAC</label>
              <input type="text" className="input-field" value={addLockDeviceId} onChange={e => setAddLockDeviceId(e.target.value)} placeholder="e.g. 00:1A:2B:3C:4D:5E" disabled={!addLockVendor} />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Lock Security Token / Secret</label>
              <input type="password" className="input-field" value={addLockSecret} onChange={e => setAddLockSecret(e.target.value)} placeholder="••••••••••••" disabled={!addLockVendor} />
            </div>

            <div style={{ gridColumn: 'span 3', borderBottom: '1px solid var(--border-card)', paddingBottom: '6px', marginTop: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>Guest Self Service Portal Info (Wi-Fi & arrival instructions)</span>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Room Wi-Fi Network (SSID)</label>
              <input type="text" className="input-field" value={addWifiSSID} onChange={e => setAddWifiSSID(e.target.value)} placeholder="e.g. Stayflexi_104" />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Room Wi-Fi Password</label>
              <input type="text" className="input-field" value={addWifiPassword} onChange={e => setAddWifiPassword(e.target.value)} placeholder="e.g. guestpwd104" />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Connecting / Adjoining Room ID</label>
              <input type="text" className="input-field" value={addConnectingRoomId} onChange={e => setAddConnectingRoomId(e.target.value)} placeholder="UUID of connecting unit" />
            </div>

            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Self Check-in / Room Entry Directions</label>
              <textarea className="input-field" style={{ minHeight: '50px', resize: 'vertical' }} value={addArrivalNotes} onChange={e => setAddArrivalNotes(e.target.value)} placeholder="e.g. Exit the elevator, take a sharp right, use lockbox on the side handle..." />
            </div>

            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>General Notes</label>
              <input type="text" className="input-field" value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="e.g. Needs double pillows" />
            </div>

            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary">Register Room</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of rooms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        {filteredRooms.map(room => {
          const associatedRt = roomTypes.find(rt => rt.id === room.roomTypeId)
          
          let color = 'var(--status-blocked)'
          if (room.status === 'AVAILABLE') color = 'var(--status-available)'
          else if (room.status === 'OCCUPIED') color = 'var(--status-occupied)'
          else if (room.status === 'HOUSEKEEPING') color = 'var(--status-housekeeping)'
          else if (room.status === 'MAINTENANCE') color = 'var(--status-maintenance)'
          else if (room.status === 'OUT_OF_ORDER') color = 'var(--status-outoforder)'

          return (
            <div 
              key={room.id} 
              className="glass-card" 
              style={{ 
                borderLeft: `5px solid ${color}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleOpenUpdate(room)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700 }}>Room {room.roomNumber}</span>
                <span className={`status-badge ${room.status.toLowerCase()}`}>
                  {room.status}
                </span>
              </div>
              
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {associatedRt ? associatedRt.name : 'Unknown Category'}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11px', borderTop: '1px solid var(--border-card)', paddingTop: '10px', color: 'var(--text-muted)' }}>
                <span>Floor {room.floor} {room.wing ? `(${room.wing})` : ''}</span>
                <span>{room.zone ? `Zone: ${room.zone}` : 'Active'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filteredRooms.length === 0 && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <KeyRound style={{ width: '48px', height: '48px', margin: '0 auto 16px auto', color: 'var(--border-card-active)' }} />
          <div>No active rooms registered under this property yet.</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>Use the "Register Room" action to add one!</div>
        </div>
      )}

      {/* Frosted Status Modifier Modal Popup */}
      {showUpdateModal && selectedRoom && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '450px', background: 'rgba(10, 15, 30, 0.95)', border: '1px solid var(--primary)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Update Room {selectedRoom.roomNumber} Status</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Adjust on-site service matrix, dispatching triggers inside the event stream</p>
            
            <form onSubmit={handleUpdateStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Select Target State</label>
                <select className="input-field" value={updateStatus} onChange={e => setUpdateStatus(e.target.value as StatusType)}>
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="HOUSEKEEPING">Housekeeping</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OUT_OF_ORDER">Out of Order</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>State Adjustment Reason</label>
                <input type="text" className="input-field" value={updateReason} onChange={e => setUpdateReason(e.target.value)} placeholder="e.g. Checked in guest Pradeep K." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-card)', color: '#fff' }} onClick={() => setShowUpdateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Commit State
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
