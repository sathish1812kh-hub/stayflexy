'use client'

import React, { useState } from 'react'
import { Drawer, Button, Badge } from '../ui'
import {
  User,
  Mail,
  Phone,
  Calendar,
  BedDouble,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'

export interface BookingCreationDrawerProps {
  isOpen: boolean
  onClose: () => void
  availableRooms: { id: string; roomNumber: string; typeName: string; price: number }[]
  onSubmitBooking: (bookingData: {
    guestName: string
    email: string
    phone: string
    roomId: string
    roomNumber: string
    checkIn: string
    checkOut: string
    amount: number
  }) => Promise<void>
}

export const BookingCreationDrawer: React.FC<BookingCreationDrawerProps> = ({
  isOpen,
  onClose,
  availableRooms,
  onSubmitBooking,
}) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState(availableRooms[0]?.id || '')
  const [checkInDate, setCheckInDate] = useState('2026-05-30')
  const [checkOutDate, setCheckOutDate] = useState('2026-06-02')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const selectedRoom = availableRooms.find((r) => r.id === selectedRoomId) || availableRooms[0]
  const estimatedNights = 3
  const totalAmount = selectedRoom ? selectedRoom.price * estimatedNights : 450

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !selectedRoom) return

    setIsSubmitting(true)
    try {
      await onSubmitBooking({
        guestName: `${firstName} ${lastName}`,
        email,
        phone,
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.roomNumber,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        amount: totalAmount,
      })
      setIsSuccess(true)
      setTimeout(() => {
        setIsSuccess(false)
        onClose()
      }, 1500)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Reservation"
      subtitle="Distributed Saga Orchestration & Real-Time Inventory Lock"
      width="520px"
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block' }}>
              Total Estimate ({estimatedNights} Nights)
            </span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#00f2fe' }}>
              ${totalAmount.toFixed(2)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              loadingText="Authorizing Saga..."
              onClick={handleSubmit as any}
            >
              Confirm Reservation
            </Button>
          </div>
        </div>
      }
    >
      {isSuccess ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              margin: '0 auto 16px',
            }}
          >
            <CheckCircle2 size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f3f4f6', margin: '0 0 6px' }}>
            Reservation Confirmed!
          </h3>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Inventory locked on Room #{selectedRoom?.roomNumber}. Saga completed successfully.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Section: Guest Details */}
          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#00f2fe',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              1. Guest Information
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  First Name *
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Last Name *
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rostova"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Email
                </span>
                <input
                  type="email"
                  placeholder="elena.r@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Phone
                </span>
                <input
                  type="tel"
                  placeholder="+1 555-0192"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section: Room & Rate Selection */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#00f2fe',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              2. Room & Schedule
            </label>
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Select Available Room *
              </span>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  borderRadius: '6px',
                  color: '#f3f4f6',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room #{r.roomNumber} &mdash; {r.typeName} (${r.price}/night)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Check-In Date
                </span>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Check-Out Date
                </span>
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section: S2S & Lock Security Guarantee */}
          <div
            style={{
              background: 'rgba(0, 242, 254, 0.05)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <ShieldCheck size={20} color="#00f2fe" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.4 }}>
              Two-Phase Commit Saga will atomically lock Room #{selectedRoom?.roomNumber} and mint a
              ledger reservation event across the distributed mesh.
            </span>
          </div>
        </form>
      )}
    </Drawer>
  )
}
