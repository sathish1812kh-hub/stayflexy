'use client'

import React, { useState, useEffect } from 'react'
import DashboardShell from '../components/DashboardShell'
import { CreditCard, CheckCircle2, DollarSign, Award, ShieldAlert, Terminal, Receipt, Sparkles } from 'lucide-react'
import dataClient from '../dataClient'

interface Invoice {
  id: string
  guestName: string
  roomNumber: string
  amount: number
  date: string
  status: 'PAID' | 'UNPAID' | 'REFUNDED'
}

const DEFAULT_INVOICES: Invoice[] = [
  { id: "inv-2001", guestName: "Alice Vance", roomNumber: "102", amount: 450.00, date: "2026-05-24", status: "PAID" },
  { id: "inv-2002", guestName: "Robert Dowson", roomNumber: "902", amount: 770.00, date: "2026-05-23", status: "PAID" },
  { id: "inv-2003", guestName: "Clara Oswald", roomNumber: "101", amount: 320.00, date: "2026-05-24", status: "UNPAID" }
]

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedBookingId, setSelectedBookingId] = useState<string>('direct-desk')
  const [chargeAmount, setChargeAmount] = useState<number>(150.00)
  
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242')
  const [cardHolder, setCardHolder] = useState('Pradeep Kumar')
  const [expiry, setExpiry] = useState('12/28')
  const [cvc, setCvc] = useState('***')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'STANDARD' | 'PRO' | 'ENTERPRISE'>('PRO')

  const loadInvoices = async () => {
    try {
      const activeBookings = await dataClient.getBookings("h1-resort-goa")
      const allInvoices: Invoice[] = []

      // 1. Fetch invoices for each active reservation
      await Promise.all(
        activeBookings.map(async (b: any) => {
          const bookingInvoices = await dataClient.getInvoices(b.id)
          if (bookingInvoices && bookingInvoices.length > 0) {
            bookingInvoices.forEach((inv: any) => {
              const primaryGuest = b.guests?.find((g: any) => g.isPrimary)
              const guestName = primaryGuest ? `${primaryGuest.firstName} ${primaryGuest.lastName}` : "Guest"
              const room = b.rooms?.[0]
              const roomNo = room?.roomId ? room.roomId.replace("r-", "") : "101"
              allInvoices.push({
                id: inv.id || inv.invoiceNumber,
                guestName,
                roomNumber: roomNo,
                amount: inv.totalAmount || inv.subtotal || 150.00,
                date: inv.issuedAt ? new Date(inv.issuedAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
                status: inv.invoiceStatus === 'PAID' ? 'PAID' : inv.invoiceStatus === 'REFUNDED' ? 'REFUNDED' : 'UNPAID'
              })
            })
          }
        })
      )

      // 2. Fetch default/standalone invoices from local storage as well
      const savedInvoicesRaw = localStorage.getItem('sf_invoices')
      const savedInvoices = savedInvoicesRaw ? JSON.parse(savedInvoicesRaw) : DEFAULT_INVOICES
      if (!savedInvoicesRaw) {
        localStorage.setItem('sf_invoices', JSON.stringify(DEFAULT_INVOICES))
      }

      savedInvoices.forEach((inv: any) => {
        if (!allInvoices.some(ai => ai.id === inv.id)) {
          allInvoices.push({
            id: inv.id,
            guestName: inv.guestName || "Direct Desk Billing",
            roomNumber: inv.roomNumber || "Desk Terminal",
            amount: inv.amount || inv.totalAmount || 150.00,
            date: inv.date || (inv.issuedAt ? new Date(inv.issuedAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10)),
            status: inv.status || inv.invoiceStatus || "PAID"
          })
        }
      })

      // Sort chronological
      allInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setInvoices(allInvoices)
    } catch (err) {
      console.error("Error loading invoices: ", err)
    }
  }

  useEffect(() => {
    const initPage = async () => {
      try {
        const activeBookings = await dataClient.getBookings("h1-resort-goa")
        setBookings(activeBookings)
      } catch (err) {
        console.error("Error fetching bookings: ", err)
      }
      await loadInvoices()
    }
    initPage()
  }, [])

  const handleChargeMockCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setSuccess(false)

    try {
      const bookingIdToCharge = selectedBookingId === 'direct-desk' ? `direct-${Math.random().toString(36).substr(2, 9)}` : selectedBookingId
      
      await dataClient.initiatePayment(
        "h1-resort-goa",
        bookingIdToCharge,
        "STRIPE_TERMINAL",
        chargeAmount
      )

      // Refresh data list
      await loadInvoices()
      
      setProcessing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Payment swipe failed", err)
      setProcessing(false)
    }
  }

  return (
    <DashboardShell
      activeTab="billing"
      title="Financial Ledger & SaaS Subscription"
      subtitle="Federated billing metrics, payment terminal simulators, and corporate subscription plans"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
        
        {/* Left column: Invoices Ledger & Plan Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SaaS Tier Plan Selector */}
          <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Stayflexi Subscription Tier</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              
              {/* Standard */}
              <div 
                onClick={() => setSelectedPlan('STANDARD')}
                style={{
                  border: `1px solid ${selectedPlan === 'STANDARD' ? 'var(--primary)' : 'var(--border-card)'}`,
                  background: 'rgba(255,255,255,0.01)',
                  padding: '20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Standard Lite</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>$49<span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/mo</span></div>
                <ul style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', paddingLeft: '14px', lineHeight: '1.6' }}>
                  <li>Max 2 Property Scopes</li>
                  <li>Basic GraphQL Access</li>
                  <li>Standard PMS Grid</li>
                </ul>
              </div>

              {/* Pro (Recommended) */}
              <div 
                onClick={() => setSelectedPlan('PRO')}
                style={{
                  border: `2px solid ${selectedPlan === 'PRO' ? 'var(--primary)' : 'var(--border-card)'}`,
                  background: 'rgba(0, 242, 254, 0.03)',
                  padding: '20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', top: '-10px', right: '10px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#060913', fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>Active</div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Supergraph Pro</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>$129<span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/mo</span></div>
                <ul style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', paddingLeft: '14px', lineHeight: '1.6' }}>
                  <li>Max 10 Property Scopes</li>
                  <li>Full AST Graphify Map</li>
                  <li>resilient Mock fallback</li>
                </ul>
              </div>

              {/* Enterprise */}
              <div 
                onClick={() => setSelectedPlan('ENTERPRISE')}
                style={{
                  border: `1px solid ${selectedPlan === 'ENTERPRISE' ? 'var(--primary)' : 'var(--border-card)'}`,
                  background: 'rgba(255,255,255,0.01)',
                  padding: '20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Enterprise Suite</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>$399<span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/mo</span></div>
                <ul style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', paddingLeft: '14px', lineHeight: '1.6' }}>
                  <li>Unlimited Properties</li>
                  <li>24/7 dedicated support</li>
                  <li>Chaos injection console</li>
                </ul>
              </div>

            </div>
          </div>

          {/* Invoices Ledger Table */}
          <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Billing Transactions Ledger</h3>
              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>Auto-Generated on Supergraph</span>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 24px' }}>Invoice ID</th>
                  <th style={{ padding: '12px 24px' }}>Guest/Reference</th>
                  <th style={{ padding: '12px 24px' }}>Allocation</th>
                  <th style={{ padding: '12px 24px' }}>Ledger Date</th>
                  <th style={{ padding: '12px 24px' }}>Total Amount</th>
                  <th style={{ padding: '12px 24px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--primary)' }}>{inv.id}</td>
                    <td style={{ padding: '12px 24px' }}>{inv.guestName}</td>
                    <td style={{ padding: '12px 24px' }}>Room {inv.roomNumber}</td>
                    <td style={{ padding: '12px 24px', color: 'var(--text-muted)' }}>{inv.date}</td>
                    <td style={{ padding: '12px 24px', fontWeight: 600 }}>${inv.amount.toFixed(2)}</td>
                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                      <span style={{
                        fontSize: '9px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        background: inv.status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: inv.status === 'PAID' ? '#10b981' : '#ef4444'
                      }}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right column: Stripe Mock Terminal Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card" style={{ padding: '24px', position: 'relative', border: '1px solid var(--border-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <CreditCard style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Desk Swipe Terminal</h3>
            </div>

            {/* Virtual Credit Card View */}
            <div style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--secondary) 100%)',
              borderRadius: '12px',
              padding: '24px',
              color: '#fff',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(127, 0, 255, 0.3)',
              marginBottom: '24px',
              minHeight: '160px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em' }}>Stayflexi Swipe Ledger</span>
                <Sparkles style={{ width: '18px', height: '18px', color: '#fff' }} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.1em', margin: '20px 0' }}>
                {cardNumber}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Card Holder</span>
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>{cardHolder}</div>
                </div>
                <div>
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Expires</span>
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>{expiry}</div>
                </div>
              </div>
            </div>

            {/* Processing State alerts */}
            {success && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                <span>Encrypted transaction complete. Invoice created!</span>
              </div>
            )}

            {/* Payment Terminal Form */}
            <form onSubmit={handleChargeMockCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Select Reservation to Charge</label>
                <select
                  value={selectedBookingId}
                  onChange={e => {
                    const bid = e.target.value
                    setSelectedBookingId(bid)
                    if (bid !== 'direct-desk') {
                      const booking = bookings.find(b => b.id === bid)
                      if (booking && booking.rooms?.[0]) {
                        setChargeAmount(booking.rooms[0].totalRoomAmount || 150.00)
                      }
                    } else {
                      setChargeAmount(150.00)
                    }
                  }}
                  style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="direct-desk">Direct Desk Billing (No Reservation)</option>
                  {bookings.map((b: any) => {
                    const guest = b.guests?.find((g: any) => g.isPrimary)
                    const guestName = guest ? `${guest.firstName} ${guest.lastName}` : 'Guest'
                    const roomNo = b.rooms?.[0]?.roomId ? b.rooms[0].roomId.replace("r-", "") : "101"
                    const amount = b.rooms?.[0]?.totalRoomAmount || 0
                    return (
                      <option key={b.id} value={b.id}>
                        Room {roomNo} - {guestName} (${amount.toFixed(2)})
                      </option>
                    )
                  })}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Amount to Charge ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={chargeAmount} 
                  onChange={e => setChargeAmount(parseFloat(e.target.value) || 0)}
                  style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Mock Credit Card Number</label>
                <input 
                  type="text" 
                  value={cardNumber} 
                  onChange={e => setCardNumber(e.target.value)}
                  style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Cardholder Name</label>
                <input 
                  type="text" 
                  value={cardHolder} 
                  onChange={e => setCardHolder(e.target.value)}
                  style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Expiration Date</label>
                  <input 
                    type="text" 
                    value={expiry} 
                    onChange={e => setExpiry(e.target.value)}
                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>CVC Security</label>
                  <input 
                    type="text" 
                    value={cvc} 
                    onChange={e => setCvc(e.target.value)}
                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: '#060913',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0, 242, 254, 0.2)'
                }}
              >
                {processing ? (
                  <span>Processing Swipe...</span>
                ) : (
                  <>
                    <Receipt style={{ width: '15px', height: '15px' }} />
                    <span>Swipe & Charge ${chargeAmount.toFixed(2)}</span>
                  </>
                )}
              </button>
            </form>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px', fontSize: '10px', color: 'var(--text-muted)', justifyContent: 'center' }}>
              <Terminal style={{ width: '12px', height: '12px' }} />
              <span>Gateway SSL sandbox enabled.</span>
            </div>

          </div>

        </div>

      </div>
    </DashboardShell>
  )
}
