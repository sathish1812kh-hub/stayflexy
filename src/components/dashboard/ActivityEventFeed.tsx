'use client'

import React from 'react'
import { Card, Badge, BadgeStatus } from '../ui'
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'

export interface EventFeedItem {
  id: string
  eventType: string
  serviceName: string
  correlationId: string
  timestamp: string
  summary: string
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'RETRYING'
}

export interface ActivityEventFeedProps {
  events?: EventFeedItem[]
  maxItems?: number
  isLive?: boolean
}

export const ActivityEventFeed: React.FC<ActivityEventFeedProps> = ({
  events = [
    {
      id: 'evt-01',
      eventType: 'booking.created',
      serviceName: 'booking-service',
      correlationId: 'req-98f1-abc',
      timestamp: 'Just now',
      summary: 'Deluxe Suite #304 reserved for Guest Alex Rivera (2 nights)',
      status: 'SUCCESS',
    },
    {
      id: 'evt-02',
      eventType: 'payment.authorized',
      serviceName: 'payment-service',
      correlationId: 'req-98f1-abc',
      timestamp: '1m ago',
      summary: 'Stripe webhook authorized $450.00 ledger lock',
      status: 'SUCCESS',
    },
    {
      id: 'evt-03',
      eventType: 'inventory.lock.acquired',
      serviceName: 'inventory-service',
      correlationId: 'req-98f1-abc',
      timestamp: '2m ago',
      summary: 'Distributed lock acquired on room-304 (TTL: 300s)',
      status: 'SUCCESS',
    },
    {
      id: 'evt-04',
      eventType: 'ota.channel.synced',
      serviceName: 'ota-service',
      correlationId: 'sync-88a2',
      timestamp: '5m ago',
      summary: 'Booking.com & Expedia inventory allocations synced',
      status: 'SUCCESS',
    },
    {
      id: 'evt-05',
      eventType: 'room.cleaning.completed',
      serviceName: 'hotel-service',
      correlationId: 'hk-102-clean',
      timestamp: '8m ago',
      summary: 'Room #102 inspected and marked READY',
      status: 'SUCCESS',
    },
  ],
  maxItems = 5,
  isLive = true,
}) => {
  const displayEvents = events.slice(0, maxItems)

  const getStatusBadge = (status: EventFeedItem['status']): BadgeStatus => {
    switch (status) {
      case 'SUCCESS':
        return 'available'
      case 'FAILED':
        return 'occupied'
      case 'PENDING':
      case 'RETRYING':
        return 'maintenance'
    }
  }

  return (
    <Card
      variant="glass"
      title="Real-Time Event & Saga Stream"
      subtitle="Kafka Distributed Event Mesh & Telemetry"
      icon={<Activity size={18} />}
      action={
        isLive && (
          <Badge status="available" pulse size="sm">
            <span style={{ fontSize: '10px' }}>LIVE STREAM</span>
          </Badge>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {displayEvents.map((evt) => (
          <div
            key={evt.id}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'background 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
              <div
                style={{
                  marginTop: '2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(0, 242, 254, 0.1)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00f2fe',
                  flexShrink: 0,
                }}
              >
                <Zap size={12} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#f3f4f6' }}>
                    {evt.eventType}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#9ca3af',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    {evt.serviceName}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#d1d5db', margin: 0 }}>{evt.summary}</p>
                <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>
                  cid: {evt.correlationId}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '4px',
                flexShrink: 0,
              }}
            >
              <Badge status={getStatusBadge(evt.status)} size="sm">
                {evt.status}
              </Badge>
              <span
                style={{
                  fontSize: '10px',
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Clock size={10} /> {evt.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
