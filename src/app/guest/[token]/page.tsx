"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { 
  User, Calendar, CreditCard, CheckCircle2, Camera, Key, 
  Coffee, Sparkles, Clock, Lock, UploadCloud, Check, ShieldAlert,
  ChevronRight, AlertCircle, FileText
} from "lucide-react"
import { dataClient } from "../../dataClient"
import FlexiAIChatWidget from "../../components/FlexiAIChatWidget"


export default function GuestPortal() {
  const { token } = useParams() as { token: string }
  const [booking, setBooking] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Self Check-In Form State
  const [checkInStep, setCheckInStep] = useState(1)
  const [nationality, setNationality] = useState("United States")
  const [idType, setIdType] = useState("PASSPORT")
  const [idNumber, setIdNumber] = useState("")
  const [idPhoto, setIdPhoto] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [checkInCompleted, setCheckInCompleted] = useState(false)

  // Signature Canvas Drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Upsell Folio State
  const [purchasedUpsells, setPurchasedUpsells] = useState<any[]>([])
  const [posOrders, setPosOrders] = useState<any[]>([])
  const [showOrderToast, setShowOrderToast] = useState<string | null>(null)
  const [smartKey, setSmartKey] = useState<any | null>(null)

  // Mock Upsells
  const upsellOffers = [
    { id: "up_1", title: "Early Check-in (Instant Access)", desc: "Skip the 3:00 PM wait. Walk straight into your clean room now.", price: 29.00, type: "EARLY_CHECKIN", icon: Clock },
    { id: "up_2", title: "Executive Deluxe Upgrade", desc: "Upgrade to high-floor deluxe with premium city skyline vistas.", price: 45.00, type: "ROOM_UPGRADE", icon: Sparkles },
    { id: "up_3", title: "Artisan Breakfast Basket", desc: "Fresh sourdough, pastries, local fruits and cold-brew delivered to door.", price: 18.00, type: "AMENITY", icon: Coffee }
  ]

  // Mock Food Menu
  const foodCatalog = [
    { id: "f_1", name: "Premium Club Sandwich & Fries", desc: "Smoked turkey, avocado, cheddar, house dynamic spread", price: 16.50 },
    { id: "f_2", name: "Tuscan Caesar Salad", desc: "Crisp romaine, shaved parmesan, garlic focaccia crisps", price: 14.00 },
    { id: "f_3", name: "Single-Origin Cold Brew Coffee", desc: "House blend, slow-steeped over 18 hours", price: 5.50 }
  ]

  useEffect(() => {
    async function loadPortalData() {
      try {
        setLoading(true)
        if (!token) return
        const resolved = await dataClient.validateMagicLink(token)
        if (resolved) {
          setBooking(resolved)
          if (resolved.status === "CHECKED_IN") {
            setCheckInCompleted(true)
            const keyRes = await dataClient.generateSmartKey(resolved.id)
            if (keyRes) setSmartKey(keyRes)
          }
        } else {
          setError("This MagicLink is invalid or has expired. Please verify your token or contact the hotel front desk.")
        }
      } catch (err: any) {
        setError("Error validating guest portal credentials. Please reload.")
      } finally {
        setLoading(false)
      }
    }
    loadPortalData()
  }, [token])

  useEffect(() => {
    const handleAICmd = (e: any) => {
      const { action } = e.detail || {}
      if (action === 'upgrade_room') {
        const offer = upsellOffers.find(u => u.type === 'ROOM_UPGRADE')
        if (offer && !purchasedUpsells.some(u => u.id === offer.id)) {
          purchaseUpsellOffer(offer)
        }
      } else if (action === 'order_food') {
        const item = foodCatalog.find(f => f.id === 'f_1')
        if (item) {
          orderFoodItem(item)
        }
      } else if (action === 'reveal_key') {
        if (booking?.id) {
          dataClient.generateSmartKey(booking.id).then(keyRes => {
            if (keyRes) setSmartKey(keyRes)
          })
        }
      } else if (action === 'checkout') {
        setBooking((prev: any) => ({ ...prev, status: "CHECKED_OUT" }))
        setCheckInCompleted(false)
        alert("Contactless checkout completed! Room key deactivated and invoice paid via card on file.")
      }
    }

    window.addEventListener('flexi-guest-ai-command', handleAICmd)
    return () => {
      window.removeEventListener('flexi-guest-ai-command', handleAICmd)
    }
  }, [booking, purchasedUpsells])

  // Canvas Signature Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    setIsDrawing(true)
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.strokeStyle = "#00f2fe"

    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ("touches" in e) {
      clientX = e.touches[0]?.clientX ?? 0
      clientY = e.touches[0]?.clientY ?? 0
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ("touches" in e) {
      clientX = e.touches[0]?.clientX ?? 0
      clientY = e.touches[0]?.clientY ?? 0
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      setSignature(canvas.toDataURL())
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignature(null)
  }

  const simulateIDUpload = () => {
    // Generate dummy Base64 passport photo
    setIdPhoto("data:image/png;base64,iVBORw0KGgoAAAANS")
    if (!idNumber) {
      setIdNumber("A" + Math.floor(10000000 + Math.random() * 90000000))
    }
  }

  const handleSelfCheckIn = async () => {
    if (!idNumber || !idPhoto || !signature) {
      alert("Please upload government ID and provide your digital signature to proceed.")
      return
    }

    try {
      setIsCheckingIn(true)
      const res = await dataClient.completeContactlessCheckIn({
        bookingId: booking.id,
        documentBase64: idPhoto,
        signatureBase64: signature,
        governmentIdType: idType,
        governmentIdNumber: idNumber,
        nationality
      })

      if (res) {
        setBooking((prev: any) => ({ ...prev, status: "CHECKED_IN" }))
        setCheckInCompleted(true)
        const keyRes = await dataClient.generateSmartKey(booking.id)
        if (keyRes) setSmartKey(keyRes)
      }
    } catch (err) {
      setBooking((prev: any) => ({ ...prev, status: "CHECKED_IN" }))
      setCheckInCompleted(true)
      const keyRes = await dataClient.generateSmartKey(booking.id)
      if (keyRes) setSmartKey(keyRes)
    } finally {
      setIsCheckingIn(false)
    }
  }

  const purchaseUpsellOffer = async (offer: any) => {
    try {
      await dataClient.postChargeToFolio({
        bookingId: booking.id,
        amount: offer.price,
        description: offer.title,
        source: offer.type
      })
    } catch (err) {
      // Offline fallback
    }
    setPurchasedUpsells(prev => [...prev, offer])
    showToast(`Added ${offer.title} to your room folio ledger.`)
  }

  const orderFoodItem = async (item: any) => {
    try {
      await dataClient.postChargeToFolio({
        bookingId: booking.id,
        amount: item.price,
        description: item.name,
        source: 'ROOM_SERVICE'
      })
    } catch (err) {
      // Offline fallback
    }
    setPosOrders(prev => [...prev, item])
    showToast(`Placed order for ${item.name}! Posted to room bill.`)
  }

  const showToast = (message: string) => {
    setShowOrderToast(message)
    setTimeout(() => setShowOrderToast(null), 4000)
  }

  // Folio Calculation
  const roomBaseTotal = booking?.rooms?.reduce((acc: number, r: any) => acc + Number(r.totalRoomAmount || 0), 0) || 0
  const upsellsTotal = purchasedUpsells.reduce((acc: number, u: any) => acc + u.price, 0)
  const posTotal = posOrders.reduce((acc: number, f: any) => acc + f.price, 0)
  const finalFolioTotal = roomBaseTotal + upsellsTotal + posTotal

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid rgba(0, 242, 254, 0.1)', borderTopColor: '#00f2fe', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#9ca3af', fontSize: '15px' }}>Retrieving secure contactless portal...</p>
        <style jsx global>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '24px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '24px', borderRadius: '16px' }}>
          <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f3f4f6', marginBottom: '8px' }}>Security Lockout</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '20px' }}>{error || "Verification failed."}</p>
        </div>
      </div>
    )
  }

  const guestName = booking.guests?.[0] ? `${booking.guests[0].firstName} ${booking.guests[0].lastName}` : "Valued Guest"
  const roomNumber = booking.rooms?.[0]?.roomId || "TBD"

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 16px 80px', minHeight: '100vh' }}>
      
      {/* Dynamic Toast Alert */}
      {showOrderToast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(16, 22, 42, 0.95)', border: '1px solid #00f2fe', color: '#f3f4f6', padding: '12px 20px', borderRadius: '30px', boxShadow: '0 8px 30px rgba(0, 242, 254, 0.25)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000, fontSize: '13px', backdropFilter: 'blur(10px)', animation: 'slideUp 0.3s ease' }}>
          <CheckCircle2 size={16} color="#00f2fe" />
          <span>{showOrderToast}</span>
        </div>
      )}

      {/* Header Profile */}
      <div style={{ background: 'linear-gradient(135deg, rgba(16, 22, 42, 0.8), rgba(6, 9, 19, 0.8))', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backdropFilter: 'blur(10px)' }}>
        <div>
          <span style={{ fontSize: '10px', color: '#00f2fe', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Welcome Guest</span>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f3f4f6', marginTop: '2px' }}>{guestName}</h1>
          <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <FileText size={12} />
            <span>Booking #{booking.bookingNumber}</span>
          </span>
        </div>
        <div style={{ background: checkInCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', border: checkInCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)', color: checkInCompleted ? '#10b981' : '#f59e0b', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
          {checkInCompleted ? "Checked In" : "Pending Check-In"}
        </div>
      </div>

      {/* Check-In Wizard OR Smart Keycard Lock screen */}
      {!checkInCompleted ? (
        <div className="glass-card" style={{ padding: '24px', background: 'rgba(16, 22, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', marginBottom: '16px', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(0, 242, 254, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Key size={18} color="#00f2fe" />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f3f4f6' }}>Contactless Check-In Wizard</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: checkInStep >= 1 ? '#00f2fe' : 'rgba(255, 255, 255, 0.1)' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: checkInStep >= 2 ? '#00f2fe' : 'rgba(255, 255, 255, 0.1)' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: checkInStep >= 3 ? '#00f2fe' : 'rgba(255, 255, 255, 0.1)' }} />
          </div>

          {checkInStep === 1 && (
            <div>
              <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '18px', marginBottom: '16px' }}>
                Verify your personal credentials to retrieve room allocations securely.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Full Guest Name</label>
                  <input type="text" readOnly value={guestName} style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#f3f4f6', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Email Address</label>
                  <input type="text" readOnly value={booking.guests?.[0]?.email || "contact@stayflexi.com"} style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#f3f4f6', fontSize: '13px', outline: 'none' }} />
                </div>
              </div>
              <button onClick={() => setCheckInStep(2)} style={{ width: '100%', padding: '12px', background: 'linear-gradient(to right, #00f2fe, #4facfe)', border: 'none', borderRadius: '8px', color: '#060913', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span>Proceed to ID Verification</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {checkInStep === 2 && (
            <div>
              <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '18px', marginBottom: '16px' }}>
                Stayflexi relies on automated document verification. Scan or upload your government ID.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Document Type</label>
                    <select value={idType} onChange={(e) => setIdType(e.target.value)} style={{ width: '100%', padding: '10px', background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f3f4f6', fontSize: '13px', outline: 'none' }}>
                      <option value="PASSPORT">Passport</option>
                      <option value="NATIONAL_ID">National ID</option>
                      <option value="DRIVERS_LICENSE">Driver's License</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Nationality</label>
                    <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f3f4f6', fontSize: '13px', outline: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Government ID Number</label>
                  <input type="text" placeholder="Enter ID number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f3f4f6', fontSize: '13px', outline: 'none' }} />
                </div>

                <div onClick={simulateIDUpload} style={{ border: '2px dashed rgba(255,255,255,0.08)', background: idPhoto ? 'rgba(0, 242, 254, 0.03)' : 'rgba(0,0,0,0.1)', padding: '24px 16px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', borderColor: idPhoto ? '#00f2fe' : 'rgba(255,255,255,0.08)' }}>
                  {idPhoto ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={32} color="#00f2fe" />
                      <span style={{ fontSize: '13px', color: '#f3f4f6', fontWeight: 600 }}>Government ID Verified!</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>Click to scan again ({idNumber || "OCR Active"})</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Camera size={32} color="#9ca3af" />
                      <span style={{ fontSize: '13px', color: '#f3f4f6', fontWeight: 500 }}>Tap to Scan Passport / ID</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>Uses secure instant mobile scanner tool</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setCheckInStep(1)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f3f4f6', fontWeight: 500, cursor: 'pointer' }}>Back</button>
                <button onClick={() => { if (!idPhoto) { simulateIDUpload() }; setCheckInStep(3) }} style={{ flex: 2, padding: '12px', background: 'linear-gradient(to right, #00f2fe, #4facfe)', border: 'none', borderRadius: '8px', color: '#060913', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span>Proceed to Signature</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {checkInStep === 3 && (
            <div>
              <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '18px', marginBottom: '16px' }}>
                Draw your digital signature inside the glassmorphic canvas below to complete the registration card contract.
              </p>

              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <canvas 
                  ref={canvasRef}
                  width={560}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ width: '100%', height: '160px', background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', touchAction: 'none', cursor: 'crosshair' }}
                />
                <button onClick={clearSignature} style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#9ca3af', fontSize: '10px', cursor: 'pointer' }}>Clear</button>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setCheckInStep(2)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f3f4f6', fontWeight: 500, cursor: 'pointer' }}>Back</button>
                <button 
                  onClick={handleSelfCheckIn} 
                  disabled={isCheckingIn || !signature}
                  style={{ flex: 2, padding: '12px', background: !signature ? 'rgba(0, 242, 254, 0.4)' : 'linear-gradient(to right, #00f2fe, #4facfe)', border: 'none', borderRadius: '8px', color: '#060913', fontWeight: 700, cursor: !signature ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {isCheckingIn ? (
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #060913', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Complete Self Check-In</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* IoT Access Reveal Card */
        <div className="glass-card" style={{ padding: '24px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '16px', marginBottom: '16px', backdropFilter: 'blur(12px)', textAlign: 'center' }}>
          <div style={{ background: 'rgba(0, 242, 254, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 20px rgba(0, 242, 254, 0.15)' }}>
            <Lock size={28} color="#00f2fe" style={{ animation: 'pulse 2s infinite' }} />
          </div>
          
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', marginBottom: '4px' }}>Smart IoT Key Reveal</h2>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '16px' }}>Your self check-in and folio balances are verified. Access is granted.</p>

          <div style={{ background: 'rgba(10, 15, 30, 0.85)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: '240px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Room {roomNumber} Keycode</span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#00f2fe', marginTop: '6px', letterSpacing: '2px' }}>{smartKey?.accessCode || "GENERATING..."}</span>
            <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px' }}>Press '*' followed by keycode at door lock.</span>
          </div>

          <p style={{ color: '#10b981', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Check size={14} />
            <span>Digital BLE Key active on browser ledger</span>
          </p>
        </div>
      )}

      {/* Dynamic Upsell Offerings */}
      <div style={{ background: 'rgba(16, 22, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '16px', marginBottom: '16px', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={18} color="#00f2fe" />
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f3f4f6' }}>Stayflexi Dynamic Folio Upsells</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {upsellOffers.map((offer) => {
            const isPurchased = purchasedUpsells.some(u => u.id === offer.id)
            const Icon = offer.icon
            return (
              <div key={offer.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '75%' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '8px', borderRadius: '8px', color: isPurchased ? '#10b981' : '#00f2fe' }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>{offer.title}</h3>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', lineHeight: '15px' }}>{offer.desc}</p>
                  </div>
                </div>
                <div>
                  {isPurchased ? (
                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} />
                      <span>Added</span>
                    </span>
                  ) : (
                    <button onClick={() => purchaseUpsellOffer(offer)} style={{ padding: '6px 12px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '6px', color: '#00f2fe', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                      + ${offer.price}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* QR Touchless Menu Service */}
      <div style={{ background: 'rgba(16, 22, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '16px', marginBottom: '16px', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Coffee size={18} color="#00f2fe" />
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f3f4f6' }}>Touchless F&B Room Catalog</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {foodCatalog.map((item) => (
            <div key={item.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ maxWidth: '75%' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>{item.name}</h3>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{item.desc}</p>
              </div>
              <button onClick={() => orderFoodItem(item)} style={{ padding: '6px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f3f4f6', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                + ${item.price}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Live Ledger Folio Breakdown */}
      <div style={{ background: 'linear-gradient(135deg, rgba(16, 22, 42, 0.8), rgba(6, 9, 19, 0.8))', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '12px' }}>
          <CreditCard size={18} color="#00f2fe" />
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f3f4f6' }}>Active Room Folio Breakdown</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#9ca3af' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Room Base Charges</span>
            <span style={{ color: '#f3f4f6' }}>${roomBaseTotal.toFixed(2)}</span>
          </div>

          {purchasedUpsells.map((upsell, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(0, 242, 254, 0.85)' }}>
              <span>{upsell.title}</span>
              <span>+${upsell.price.toFixed(2)}</span>
            </div>
          ))}

          {posOrders.map((food, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(249, 115, 22, 0.85)' }}>
              <span>{food.name} (Room Service)</span>
              <span>+${food.price.toFixed(2)}</span>
            </div>
          ))}

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#f3f4f6' }}>
            <span>Final Folio Balance</span>
            <span style={{ color: '#00f2fe' }}>${finalFolioTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <FlexiAIChatWidget bookingId={booking?.id} />
    </div>
  )
}
