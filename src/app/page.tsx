'use client'

import React, { useEffect, useState } from 'react'
import DashboardShell from './components/DashboardShell'
import dataClient, { Hotel, Room, RoomType } from './dataClient'
import { 
  Building2, 
  Bed, 
  ArrowRight, 
  Settings, 
  Calendar,
  Layers, 
  FileCheck2,
  TrendingUp,
  Terminal,
  RefreshCw,
  User,
  Check,
  AlertTriangle,
  Sparkles,
  Clock,
  Activity,
  DollarSign,
  CheckCircle2,
  Bell,
  ArrowUpRight,
  Lock,
  Globe,
  Mail,
  Phone,
  HelpCircle,
  QrCode
} from 'lucide-react'
import Link from 'next/link'

// Simulated current PMS date
const SIMULATED_TODAY = '2026-05-30'

// Types
interface ChargeItem {
  name: string
  amount: number
  timestamp: string
}

interface PaymentItem {
  method: 'CASH' | 'CARD' | 'ONLINE'
  amount: number
  timestamp: string
  txnId: string
}

interface Reservation {
  id: string
  guestName: string
  roomNumber: string
  roomId: string
  checkIn: string
  checkOut: string
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'ON_HOLD' | 'NO_SHOW'
  amount: number
  notes?: string
  email?: string
  phone?: string
  nationality?: string
  idType?: string
  idNumber?: string
  dob?: string
  baseRate?: number
  discount?: number
  tax?: number
  charges?: ChargeItem[]
  payments?: PaymentItem[]
  // Magick Check-In Flow flags
  isMagicLinkCheckIn?: boolean
  ocrStatus?: 'PENDING' | 'VERIFIED' | 'FAILED'
  signatureCollected?: boolean
  selfieVerified?: boolean
}

export default function DashboardPage() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [otaMappings, setOtaMappings] = useState<any[]>([])
  const [syncJobs, setSyncJobs] = useState<any[]>([])
  
  // UI Tabs & Filters
  const [activeOpsTab, setActiveOpsTab] = useState<
    'arrivals' | 'inhouse' | 'departures' | 'cancelled' | 'onhold' | 'noshow' | 'magiclist'
  >('arrivals')
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | '10days'>('daily')
  const [timeframe, setTimeframe] = useState<'7' | '30'>('7')
  const [loadingKpis, setLoadingKpis] = useState<boolean>(true)
  const [kpis, setKpis] = useState<any>(null)
  
  // Action states
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null)
  const [isCompacting, setIsCompacting] = useState<boolean>(false)
  const [aiInsightSuccess, setAiInsightSuccess] = useState<string | null>(null)
  
  // New Booking Wizard Form States
  const [showNewBookingModal, setShowNewBookingModal] = useState<boolean>(false)
  const [newBookingForm, setNewBookingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    checkIn: SIMULATED_TODAY,
    checkOut: '2026-06-02',
    roomTypeId: 'rt-deluxe',
    amount: 150.00,
    status: 'PENDING' as 'PENDING' | 'ON_HOLD'
  })

  useEffect(() => {
    async function loadData() {
      const h = await dataClient.getHotels()
      const r = await dataClient.getRooms()
      const rt = await dataClient.getRoomTypes()
      setHotels(h)
      setRooms(r)
      setRoomTypes(rt)
      
      // Load OTA mappings & jobs
      const mappings = await dataClient.getOtaMappings("h1-resort-goa")
      setOtaMappings(mappings)
      const jobs = await dataClient.getSyncJobs("h1-resort-goa")
      setSyncJobs(jobs)
    }
    loadData()
  }, [])

  // Load and sync reservations
  useEffect(() => {
    function loadReservations() {
      if (typeof window !== 'undefined') {
        const savedRes = localStorage.getItem('sf_reservations')
        if (savedRes) {
          try {
            const list = JSON.parse(savedRes) as Reservation[]
            const filtered = list.filter(r => !(!r.id?.endsWith("-default") && r.checkIn?.startsWith("2026-06")))
            if (filtered.length !== list.length) {
              localStorage.setItem('sf_reservations', JSON.stringify(filtered))
            }
            setReservations(filtered)
          } catch (e) {
            setReservations([])
          }
        } else {
          const defaults: Reservation[] = [
            // High-fidelity pre-populated list ensuring daily view has elements
            {
              id: "res-1",
              guestName: "Alice Vance",
              roomNumber: "102",
              roomId: "r-102",
              checkIn: "2026-05-22",
              checkOut: "2026-05-25",
              status: "CHECKED_IN",
              amount: 450.00,
              email: "alice.vance@example.com",
              phone: "+1 555-0199",
              nationality: "United States",
              idType: "PASSPORT",
              idNumber: "P829103",
              dob: "1988-04-12",
              baseRate: 150.00,
              discount: 0.00,
              tax: 54.00,
              payments: [{ method: 'CASH', amount: 300.00, timestamp: new Date().toISOString(), txnId: 'TX-INIT' }],
              charges: []
            },
            {
              id: "res-2",
              guestName: "Robert Dowson",
              roomNumber: "902",
              roomId: "r-902",
              checkIn: "2026-05-20",
              checkOut: "2026-05-27",
              status: "CHECKED_IN",
              amount: 770.00,
              email: "robert.d@example.com",
              phone: "+91 9988223311",
              nationality: "India",
              idType: "NATIONAL_ID",
              idNumber: "IN-A8291",
              dob: "1991-08-25",
              baseRate: 110.00,
              discount: 0.00,
              tax: 92.40,
              payments: [{ method: 'CARD', amount: 770.00, timestamp: new Date().toISOString(), txnId: 'TX-FULL' }],
              charges: []
            },
            {
              id: "res-today-arr",
              guestName: "John Watson",
              roomNumber: "101",
              roomId: "r-101",
              checkIn: SIMULATED_TODAY,
              checkOut: "2026-06-01",
              status: "PENDING",
              amount: 200.00,
              email: "john.watson@bakerstreet.com",
              phone: "+44 7911 556677",
              nationality: "United Kingdom",
              idType: "DRIVERS_LICENSE",
              idNumber: "DL-WAT77",
              dob: "1984-07-07",
              baseRate: 100.00,
              discount: 0.00,
              tax: 24.00,
              payments: [],
              charges: [],
              isMagicLinkCheckIn: true,
              ocrStatus: 'VERIFIED',
              signatureCollected: true,
              selfieVerified: true
            },
            {
              id: "res-today-dep",
              guestName: "Sherlock Holmes",
              roomNumber: "201",
              roomId: "r-201",
              checkIn: "2026-05-28",
              checkOut: SIMULATED_TODAY,
              status: "CHECKED_IN",
              amount: 600.00,
              email: "sherlock@bakerstreet.com",
              phone: "+44 7911 002211",
              nationality: "United Kingdom",
              idType: "PASSPORT",
              idNumber: "P892019",
              dob: "1980-01-06",
              baseRate: 200.00,
              discount: 0.00,
              tax: 72.00,
              payments: [{ method: 'ONLINE', amount: 450.00, timestamp: new Date().toISOString(), txnId: 'TX-ADV' }],
              charges: []
            },
            {
              id: "res-today-hold",
              guestName: "Mycroft Holmes",
              roomNumber: "",
              roomId: "",
              checkIn: SIMULATED_TODAY,
              checkOut: "2026-06-01",
              status: "ON_HOLD",
              amount: 250.00,
              email: "mycroft@diogenes.gov.uk",
              phone: "+44 7911 999111",
              nationality: "United Kingdom",
              idType: "NATIONAL_ID",
              idNumber: "GOV-001",
              dob: "1975-03-24",
              baseRate: 250.00,
              discount: 0.00,
              tax: 30.00,
              payments: [],
              charges: []
            },
            {
              id: "res-today-cancel",
              guestName: "Irene Adler",
              roomNumber: "",
              roomId: "",
              checkIn: SIMULATED_TODAY,
              checkOut: "2026-06-03",
              status: "CANCELLED",
              amount: 600.00,
              notes: "CANCEL_REASON:Change of schedules | Cancelled via Agoda API",
              email: "irene@adler.org",
              phone: "+1 555-0810",
              nationality: "Czech Republic",
              idType: "PASSPORT",
              idNumber: "CZ-82910",
              dob: "1989-10-10",
              baseRate: 200.00,
              discount: 0.00,
              tax: 72.00,
              payments: [],
              charges: []
            },
            {
              id: "res-3",
              guestName: "Clara Oswald",
              roomNumber: "103",
              roomId: "r-103",
              checkIn: "2026-05-21",
              checkOut: "2026-05-24",
              status: "PENDING", // checkIn has passed today ('2026-05-30'), marks as No Show!
              amount: 450.00,
              email: "clara@tardis.org",
              phone: "+44 7911 123456",
              nationality: "United Kingdom",
              idType: "DRIVERS_LICENSE",
              idNumber: "DL-UK829",
              dob: "1993-02-14",
              baseRate: 150.00,
              discount: 0.00,
              tax: 54.00,
              payments: [],
              charges: []
            },
            {
              id: "res-4",
              guestName: "Danny Pink",
              roomNumber: "202",
              roomId: "r-202",
              checkIn: "2026-05-28",
              checkOut: "2026-06-01",
              status: "PENDING",
              amount: 600.00,
              email: "danny.pink@school.edu",
              phone: "+44 7911 987654",
              nationality: "United Kingdom",
              idType: "PASSPORT",
              idNumber: "P001928",
              dob: "1989-11-05",
              baseRate: 150.00,
              discount: 0.00,
              tax: 72.00,
              payments: [],
              charges: []
            }
          ]
          setReservations(defaults)
          localStorage.setItem('sf_reservations', JSON.stringify(defaults))
        }
      }
    }
    loadReservations()
  }, [])

  useEffect(() => {
    async function loadAnalytics() {
      setLoadingKpis(true)
      try {
        const endDateStr = new Date().toISOString().substring(0, 10)
        const daysToSubtract = timeframe === '7' ? 7 : 30
        const startDateStr = new Date(Date.now() - daysToSubtract * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
        const metrics = await dataClient.getRevenueMetrics("h1-resort-goa", startDateStr, endDateStr)
        setKpis(metrics)
      } catch (err) {
        console.error("Error loading analytics metrics: ", err)
      } finally {
        setLoadingKpis(false)
      }
    }
    loadAnalytics()
  }, [timeframe])

  const saveAndReloadReservations = (updated: Reservation[]) => {
    setReservations(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_reservations', JSON.stringify(updated))
    }
  }

  // Calculate live statistics
  const activeHotels = hotels.filter(h => h.status === 'ACTIVE').length
  const totalRooms = rooms.length
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length
  const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length
  const housekeepingRooms = rooms.filter(r => r.status === 'HOUSEKEEPING').length
  
  const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
  const availablePercentage = totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0

  // Helper to calculate total reservation net balance
  const getBookingDues = (r: Reservation) => {
    const charges = r.charges || []
    const payments = r.payments || []
    const base = r.baseRate || r.amount
    const totalCharges = base + charges.reduce((sum, c) => sum + c.amount, 0)
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
    return {
      totalCharges,
      totalPayments,
      balanceDue: Math.max(0, totalCharges - totalPayments)
    }
  }

  // Date Filtering Helper
  const filterReservationsByDate = (list: Reservation[], range: 'daily' | 'weekly' | 'monthly' | '10days') => {
    const today = new Date(SIMULATED_TODAY)
    
    return list.filter(res => {
      const checkInDate = new Date(res.checkIn)
      const checkOutDate = new Date(res.checkOut)
      
      if (range === 'daily') {
        return (res.checkIn === SIMULATED_TODAY || res.checkOut === SIMULATED_TODAY || (checkInDate <= today && checkOutDate >= today))
      } else if (range === 'weekly') {
        const nextWeek = new Date(today)
        nextWeek.setDate(nextWeek.getDate() + 7)
        return (checkInDate <= nextWeek && checkOutDate >= today)
      } else if (range === 'monthly') {
        const nextMonth = new Date(today)
        nextMonth.setDate(nextMonth.getDate() + 30)
        return (checkInDate <= nextMonth && checkOutDate >= today)
      } else if (range === '10days') {
        const past10 = new Date(today)
        past10.setDate(past10.getDate() - 10)
        return (checkInDate <= today && checkOutDate >= past10)
      }
      return true
    })
  }

  // Filtered reservations logic for the current selected tab
  const getTabReservations = () => {
    const dateFiltered = filterReservationsByDate(reservations, timeFilter)
    const today = new Date(SIMULATED_TODAY)

    switch (activeOpsTab) {
      case 'arrivals':
        // arrivals checkin matching simulated dates (status PENDING/CONFIRMED)
        return dateFiltered.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED')
      case 'inhouse':
        // currently in-house checked-in guests
        return dateFiltered.filter(r => r.status === 'CHECKED_IN')
      case 'departures':
        // expected checkout (currently checked-in)
        return dateFiltered.filter(r => r.status === 'CHECKED_IN')
      case 'cancelled':
        // cancelled bookings
        return dateFiltered.filter(r => r.status === 'CANCELLED')
      case 'onhold':
        // bookings on hold / tentative
        return dateFiltered.filter(r => r.status === 'ON_HOLD')
      case 'noshow':
        // arrivals checkin date is in the past and they are still pending, or marked explicitly as no-show
        return dateFiltered.filter(r => {
          if (r.status === 'NO_SHOW') return true
          if (r.status === 'PENDING' || r.status === 'CONFIRMED') {
            const checkInD = new Date(r.checkIn)
            return checkInD < today
          }
          return false
        })
      case 'magiclist':
        // remote contactless checkins
        return dateFiltered.filter(r => r.isMagicLinkCheckIn)
      default:
        return dateFiltered
    }
  }

  // Front Desk Check-in operation
  const handleCheckIn = async (bookingId: string, roomId: string) => {
    if (!roomId) {
      alert("Please assign a room number first.")
      return
    }

    const updated = reservations.map(r => {
      if (r.id === bookingId) {
        return { ...r, status: 'CHECKED_IN' as const }
      }
      return r
    })
    saveAndReloadReservations(updated)
    
    // Call dataClient to program smartlock and update room status
    await dataClient.updateRoomStatus(roomId, 'OCCUPIED', `Checked in guest via PMS Operations Console`)
    const updatedRooms = await dataClient.getRooms()
    setRooms([...updatedRooms])
    
    alert("Guest checked in successfully! Smart key code programmed and sent to user device.")
  }

  // Front Desk Check-out operation
  const handleCheckOut = async (bookingId: string, roomId: string) => {
    const booking = reservations.find(r => r.id === bookingId)
    if (!booking) return

    const { balanceDue } = getBookingDues(booking)
    if (balanceDue > 0.01) {
      alert(`Guest has an outstanding balance of $${balanceDue.toFixed(2)}. Please settle dues first.`)
      return
    }

    const updated = reservations.map(r => {
      if (r.id === bookingId) {
        return { ...r, status: 'CHECKED_OUT' as const }
      }
      return r
    })
    saveAndReloadReservations(updated)

    // Call dataClient to update room to Housekeeping (dirty)
    if (roomId) {
      await dataClient.updateRoomStatus(roomId, 'HOUSEKEEPING', `Checked out guest via PMS Operations Console`)
      const updatedRooms = await dataClient.getRooms()
      setRooms([...updatedRooms])
    }

    alert("Check-out complete! Room released for cleaning.")
  }

  // Settle reservation dues
  const handleSettleDues = (bookingId: string) => {
    const booking = reservations.find(r => r.id === bookingId)
    if (!booking) return

    const { balanceDue } = getBookingDues(booking)
    if (balanceDue <= 0.01) return

    const updated = reservations.map(r => {
      if (r.id === bookingId) {
        const currentPayments = r.payments || []
        const newPayments: PaymentItem[] = [
          ...currentPayments,
          {
            method: 'CASH' as const,
            amount: balanceDue,
            timestamp: new Date().toISOString(),
            txnId: `TX-DASH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
          }
        ]
        return { ...r, payments: newPayments }
      }
      return r
    })

    saveAndReloadReservations(updated)
    alert(`Successfully settled balance due of $${balanceDue.toFixed(2)} for ${booking.guestName}.`);
  }

  // Extend booking stay by 1 night
  const handleExtendStay = (bookingId: string) => {
    const booking = reservations.find(r => r.id === bookingId)
    if (!booking) return

    const currentCheckOut = new Date(booking.checkOut)
    currentCheckOut.setDate(currentCheckOut.getDate() + 1)
    const newCheckOutStr = currentCheckOut.toISOString().substring(0, 10)

    const currentCharges = booking.charges || []
    const updatedCharges = [
      ...currentCharges,
      {
        name: 'Extra Night Stay Extension',
        amount: 150.00,
        timestamp: new Date().toISOString()
      }
    ]

    const updated = reservations.map(r => {
      if (r.id === bookingId) {
        return {
          ...r,
          checkOut: newCheckOutStr,
          charges: updatedCharges
        }
      }
      return r
    })

    saveAndReloadReservations(updated)
    alert(`Stay extended for ${booking.guestName} to ${newCheckOutStr}. Charge of $150.0 post to folio.`);
  }

  // Confirm booking from ON_HOLD status
  const handleConfirmHold = (bookingId: string) => {
    const updated = reservations.map(r => {
      if (r.id === bookingId) {
        return { ...r, status: 'PENDING' as const }
      }
      return r
    })
    saveAndReloadReservations(updated)
    alert(`Tentative hold confirmed for reservation #${bookingId.toUpperCase()}. Moved to expected arrivals list.`);
  }

  // Release booking hold or cancel booking
  const handleCancelBooking = (bookingId: string) => {
    const updated = reservations.map(r => {
      if (r.id === bookingId) {
        return { ...r, status: 'CANCELLED' as const }
      }
      return r
    })
    saveAndReloadReservations(updated)
    alert(`Reservation #${bookingId.toUpperCase()} has been cancelled.`);
  }

  // Mark pending booking as No-Show
  const handleMarkNoShow = (bookingId: string) => {
    const updated = reservations.map(r => {
      if (r.id === bookingId) {
        return { ...r, status: 'NO_SHOW' as const }
      }
      return r
    })
    saveAndReloadReservations(updated)
    alert(`Reservation #${bookingId.toUpperCase()} marked as NO-SHOW. Mapped room released.`);
  }

  // Toggle dynamic check-in verifications in Magick List
  const handleToggleVerification = (bookingId: string, field: 'ocrStatus' | 'signatureCollected' | 'selfieVerified') => {
    const updated = reservations.map((r): Reservation => {
      if (r.id === bookingId) {
        if (field === 'ocrStatus') {
          return { ...r, ocrStatus: r.ocrStatus === 'VERIFIED' ? 'PENDING' : 'VERIFIED' }
        } else if (field === 'signatureCollected') {
          return { ...r, signatureCollected: !r.signatureCollected }
        } else if (field === 'selfieVerified') {
          return { ...r, selfieVerified: !r.selfieVerified }
        }
      }
      return r
    })
    saveAndReloadReservations(updated)
  }

  // Change room assignment directly from dropdown
  const handleRoomReassign = async (bookingId: string, targetRoomId: string) => {
    if (!targetRoomId) return
    const targetRoom = rooms.find(rm => rm.id === targetRoomId)
    if (!targetRoom) return

    const updated = reservations.map(r => {
      if (r.id === bookingId) {
        return {
          ...r,
          roomId: targetRoomId,
          roomNumber: targetRoom.roomNumber
        }
      }
      return r
    })
    saveAndReloadReservations(updated)

    await dataClient.reassignRoom(bookingId, targetRoomId)
    const updatedRooms = await dataClient.getRooms()
    setRooms([...updatedRooms])
    alert(`Room assigned successfully. Updated to Room ${targetRoom.roomNumber}.`);
  }

  // Handle Housekeeping status toggle
  const updateRoomState = async (roomId: string, newStatus: Room['status']) => {
    await dataClient.updateRoomStatus(roomId, newStatus)
    const updatedRooms = await dataClient.getRooms()
    setRooms([...updatedRooms])
  }

  // Trigger OTA Sync
  const handleChannelSync = async (providerId: string, providerName: string) => {
    setSyncingProviderId(providerId)
    await new Promise(resolve => setTimeout(resolve, 1500))
    try {
      await dataClient.triggerSync("h1-resort-goa", providerId, "FULL_SYNC")
      const updatedJobs = await dataClient.getSyncJobs("h1-resort-goa")
      setSyncJobs(updatedJobs)
      alert(`Channel synced successfully! Rates, inventories, and bookings matched to ${providerName}.`);
    } catch (err) {
      console.error(err)
      alert(`Error synchronizing ${providerName}.`);
    } finally {
      setSyncingProviderId(null)
    }
  }

  // Send pre-check-in Magic Link to guest
  const handleSendMagicLink = (guestName: string, email?: string) => {
    alert(`Pre-check-in link dispatched to ${email || 'guest@example.com'} for guest ${guestName}. Guest can upload ID documents and sign contactless agreements via mobile.`);
  }

  // Submit booking wizard
  const handleCreateNewBookingSubmit = () => {
    const { firstName, lastName, email, phone, checkIn, checkOut, roomTypeId, amount, status } = newBookingForm
    if (!firstName || !lastName || !checkIn || !checkOut) {
      alert("Please fill in first name, last name, check-in, and check-out dates.")
      return
    }

    const newId = `res-${Math.random().toString(36).substring(2, 7)}`
    
    // Choose first available matching room type
    const room = rooms.find(rm => rm.roomTypeId === roomTypeId && rm.status === 'AVAILABLE')
    const assignedRoomId = room ? room.id : ''
    const assignedRoomNumber = room ? room.roomNumber : ''

    const newRes: Reservation = {
      id: newId,
      guestName: `${firstName} ${lastName}`,
      roomNumber: assignedRoomNumber,
      roomId: assignedRoomId,
      checkIn,
      checkOut,
      status,
      amount,
      email,
      phone,
      nationality: 'India',
      idType: 'PASSPORT',
      idNumber: `PP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      dob: '1990-01-01',
      baseRate: amount,
      discount: 0,
      tax: amount * 0.12,
      payments: [],
      charges: [],
      isMagicLinkCheckIn: Math.random() > 0.4, // 60% chance to join contactless magick queue
      ocrStatus: 'PENDING',
      signatureCollected: false,
      selfieVerified: false
    }

    const updated = [newRes, ...reservations]
    saveAndReloadReservations(updated)
    setShowNewBookingModal(false)

    // Reset Form
    setNewBookingForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      checkIn: SIMULATED_TODAY,
      checkOut: '2026-06-02',
      roomTypeId: roomTypes[0]?.id || 'rt-deluxe',
      amount: 150.00,
      status: 'PENDING'
    })

    alert(`Successfully registered reservation #${newId.toUpperCase()} for ${firstName} ${lastName}!`);
  }

  // Dynamic Alerts engine
  const alertsList: any[] = []
  
  // 1. Unpaid Dues Warning
  reservations.forEach(r => {
    if (r.status !== 'CANCELLED' && r.status !== 'CHECKED_OUT') {
      const { balanceDue } = getBookingDues(r)
      if (balanceDue > 50.00) {
        alertsList.push({
          id: `alert-due-${r.id}`,
          type: 'PAYMENT',
          severity: 'warning',
          message: `Folio Overdue: ${r.guestName} (${r.id.toUpperCase()}) has $${balanceDue.toFixed(2)} unpaid dues.`,
          actionLabel: 'Settle Dues',
          action: () => handleSettleDues(r.id)
        })
      }
    }
  })

  // 2. Housekeeping Mismatch Warning (Expected arrivals checking in to dirty rooms)
  reservations.forEach(r => {
    if (r.status === 'PENDING' || r.status === 'CONFIRMED') {
      const room = rooms.find(rm => rm.id === r.roomId)
      if (room && room.status === 'HOUSEKEEPING') {
        alertsList.push({
          id: `alert-dirty-${r.id}`,
          type: 'HOUSEKEEPING',
          severity: 'error',
          message: `Dirty Room Mismatch: Room ${room.roomNumber} is dirty for arriving guest ${r.guestName}.`,
          actionLabel: 'Clean Room Now',
          action: () => updateRoomState(room.id, 'AVAILABLE')
        })
      }
    }
  })

  // 3. Late Check-out Request Info
  reservations.forEach(r => {
    if (r.status === 'CHECKED_IN' && r.notes?.toLowerCase().includes('late checkout')) {
      alertsList.push({
        id: `alert-late-${r.id}`,
        type: 'OPERATIONS',
        severity: 'info',
        message: `Late Check-out request: Room ${r.roomNumber} (${r.guestName}) has requested stay extension.`,
        actionLabel: 'Extend 1 Night',
        action: () => handleExtendStay(r.id)
      })
    }
  })

  // 4. Overbooking / Double-booking Alert
  const roomReservations: { [roomId: string]: Reservation[] } = {}
  reservations.forEach(r => {
    if (r.status !== 'CANCELLED' && r.status !== 'CHECKED_OUT' && r.roomId) {
      const roomId = r.roomId
      if (!roomReservations[roomId]) {
        roomReservations[roomId] = []
      }
      roomReservations[roomId].push(r)
    }
  })

  Object.entries(roomReservations).forEach(([roomId, resList]) => {
    const room = rooms.find(rm => rm.id === roomId)
    const roomNum = room ? room.roomNumber : 'Unknown'
    
    for (let i = 0; i < resList.length; i++) {
      for (let j = i + 1; j < resList.length; j++) {
        const r1 = resList[i]
        const r2 = resList[j]
        if (!r1 || !r2) continue
        
        if (r1.checkIn < r2.checkOut && r2.checkIn < r1.checkOut) {
          const customRes = !r1.id?.endsWith('-default') ? r1 : (!r2.id?.endsWith('-default') ? r2 : null)
          const targetRes = customRes || r1
          if (!targetRes) continue
          
          const alertId = `alert-overbook-${targetRes.id}`
          if (!alertsList.some(a => a.id === alertId)) {
            alertsList.push({
              id: alertId,
              type: 'OVERBOOKING',
              severity: 'error',
              message: `Double Booking Alert: Room ${roomNum} has overlapping bookings between ${r1.guestName} and ${r2.guestName} (${r1.checkIn} to ${r1.checkOut} vs ${r2.checkIn} to ${r2.checkOut}).`,
              actionLabel: 'Resolve Overbooking',
              action: () => {
                const updated = reservations.filter(r => r.id !== targetRes.id)
                saveAndReloadReservations(updated)
                alert(`Double booking resolved: Removed duplicate booking for ${targetRes.guestName}.`)
              }
            })
          }
        }
      }
    }
  })

  // Pre-calculate counts for each tab based on current date filter
  const dateFilteredRes = filterReservationsByDate(reservations, timeFilter)
  const todayVal = new Date(SIMULATED_TODAY)

  const arrivalsCount = dateFilteredRes.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED').length
  const inHouseCount = dateFilteredRes.filter(r => r.status === 'CHECKED_IN').length
  const departuresCount = dateFilteredRes.filter(r => r.status === 'CHECKED_IN').length
  const cancelledCount = dateFilteredRes.filter(r => r.status === 'CANCELLED').length
  const onHoldCount = dateFilteredRes.filter(r => r.status === 'ON_HOLD').length
  const noShowCount = dateFilteredRes.filter(r => {
    if (r.status === 'NO_SHOW') return true
    if (r.status === 'PENDING' || r.status === 'CONFIRMED') {
      const checkInD = new Date(r.checkIn)
      return checkInD < todayVal
    }
    return false
  }).length
  const magicListCount = dateFilteredRes.filter(r => r.isMagicLinkCheckIn).length

  const dirtyRooms = rooms.filter(r => r.status === 'HOUSEKEEPING')

  // Generate Occupancy Forecast
  const getOccupancyForecast = () => {
    const forecast = []
    const today = new Date(SIMULATED_TODAY)
    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date(today)
      forecastDate.setDate(today.getDate() + i)
      const dateStr = forecastDate.toISOString().substring(0, 10)
      
      const occupiedOnDate = reservations.filter(r => {
        if (r.status === 'CANCELLED' || r.status === 'CHECKED_OUT') return false
        const checkIn = new Date(r.checkIn)
        const checkOut = new Date(r.checkOut)
        return (checkIn <= forecastDate && checkOut > forecastDate)
      }).length
      
      const rate = totalRooms > 0 ? Math.round((occupiedOnDate / totalRooms) * 100) : 0
      forecast.push({ date: dateStr, occupied: occupiedOnDate, rate })
    }
    return forecast
  }

  // Render Room selection dropdown
  const renderRoomSelector = (res: Reservation) => {
    if (res.status === 'CHECKED_IN' || res.status === 'CHECKED_OUT') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
          Room {res.roomNumber}
        </span>
      )
    }

    return (
      <select
        value={res.roomId}
        onChange={(e) => handleRoomReassign(res.id, e.target.value)}
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid var(--border-card)',
          color: '#fff',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        <option value="">-- Assign Room --</option>
        {rooms.map(rm => {
          const rtName = roomTypes.find(t => t.id === rm.roomTypeId)?.name || rm.roomTypeId
          return (
            <option key={rm.id} value={rm.id}>
              Room {rm.roomNumber} ({rtName}) - {rm.status}
            </option>
          )
        })}
      </select>
    )
  }

  return (
    <DashboardShell 
      activeTab="dashboard"
      title="Dashboard Overview"
      subtitle="Real-time operations matrix across the Stayflexi property supergraph"
    >
      {/* 4 Premium metrics grid */}
      <section className="metrics-grid">
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span className="metric-title">Occupancy Rate</span>
            <TrendingUp style={{ color: '#10b981', width: '18px', height: '18px' }} />
          </div>
          <div className="metric-value">{occupancyPercentage}%</div>
          <div className="metric-trend up">
            <span>Live status matrix</span>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span className="metric-title">Available Rooms</span>
            <Bed style={{ color: '#00f2fe', width: '18px', height: '18px' }} />
          </div>
          <div className="metric-value">{availableRooms} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ {totalRooms}</span></div>
          <div className="metric-trend" style={{ color: '#00f2fe' }}>
            <span>{availablePercentage}% immediate allocation</span>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span className="metric-title">Active Properties</span>
            <Building2 style={{ color: '#a855f7', width: '18px', height: '18px' }} />
          </div>
          <div className="metric-value">{activeHotels} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ {hotels.length}</span></div>
          <div className="metric-trend" style={{ color: '#a855f7' }}>
            <span>{hotels.filter(h => h.status === 'UNDER_RENOVATION').length} under renovation</span>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span className="metric-title">Room Categories</span>
            <Layers style={{ color: '#f59e0b', width: '18px', height: '18px' }} />
          </div>
          <div className="metric-value">{roomTypes.length}</div>
          <div className="metric-trend" style={{ color: '#f59e0b' }}>
            <span>Stitched in Supergraph</span>
          </div>
        </div>
      </section>

      {/* Supergraph Performance Analytics Console */}
      <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(0, 242, 254, 0.15)', background: 'linear-gradient(to bottom, var(--bg-card), rgba(0, 242, 254, 0.01))', marginTop: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Supergraph Financial Analytics Console</h3>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setTimeframe('7')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                background: timeframe === '7' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: timeframe === '7' ? '#060913' : '#fff',
                border: '1px solid var(--border-card)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              7 Days
            </button>
            <button 
              onClick={() => setTimeframe('30')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                background: timeframe === '30' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: timeframe === '30' ? '#060913' : '#fff',
                border: '1px solid var(--border-card)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Aggregate KPI Badges Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Period Revenue</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              {loadingKpis ? '...' : `$${kpis?.totalRevenue?.toLocaleString() || '0'}`}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Average ADR</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
              {loadingKpis ? '...' : `$${kpis?.adr?.toFixed(2) || '0.00'}`}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Average RevPAR</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--secondary)', marginTop: '4px' }}>
              {loadingKpis ? '...' : `$${kpis?.revpar?.toFixed(2) || '0.00'}`}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Occupancy Avg</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {loadingKpis ? '...' : `${kpis?.occupancyRate?.toFixed(1) || '0.0'}%`}
            </div>
          </div>
        </div>

        {/* Dynamic Responsive SVG Line Chart */}
        <div style={{ height: '220px', position: 'relative', width: '100%', overflow: 'hidden' }}>
          {loadingKpis ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite', display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              <span>Querying historical subgraphs...</span>
            </div>
          ) : (
            <svg viewBox="0 0 500 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              {/* Chart Line Path */}
              {(() => {
                const points = kpis?.dailyMetrics || []
                if (points.length === 0) return null
                
                const widthStep = 500 / Math.max(1, points.length - 1)
                const maxVal = Math.max(...points.map((p: any) => p.totalRevenue), 300)
                
                const coordinates = points.map((p: any, idx: number) => {
                  const x = idx * widthStep
                  const y = 135 - (p.totalRevenue / maxVal) * 110
                  return { x, y }
                })
                
                const dPath = coordinates.reduce((path: string, p: any, idx: number) => 
                  path + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, ''
                )
                
                const fillPath = dPath + ` L ${coordinates[coordinates.length - 1].x} 140 L 0 140 Z`
                
                return (
                  <>
                    <path d={fillPath} fill="url(#chartGrad)" />
                    <path d={dPath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {coordinates.map((p: any, idx: number) => (
                      <circle 
                        key={idx} 
                        cx={p.x} 
                        cy={p.y} 
                        r="4" 
                        fill="#060913" 
                        stroke="var(--primary)" 
                        strokeWidth="2.5" 
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </>
                )
              })()}
            </svg>
          )}
        </div>
      </div>

      {/* Main Workspace Body Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Operations & Channels sync */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Real-time PMS Operations Console */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Activity style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
                <span>PMS Operational Center</span>
              </h2>
              
              {/* New Booking Wizard Launch Button */}
              <button
                onClick={() => setShowNewBookingModal(true)}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: '#060913',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0, 242, 254, 0.2)'
                }}
              >
                <PlusIcon /> New Booking
              </button>
            </div>

            {/* Dynamic Filter selector row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', fontWeight: 600, marginRight: '4px', textTransform: 'uppercase' }}>
                Period Filter:
              </span>
              <button 
                onClick={() => setTimeFilter('daily')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: timeFilter === 'daily' ? 'var(--primary)' : 'transparent',
                  color: timeFilter === 'daily' ? '#060913' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Daily (Today)
              </button>
              <button 
                onClick={() => setTimeFilter('weekly')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: timeFilter === 'weekly' ? 'var(--primary)' : 'transparent',
                  color: timeFilter === 'weekly' ? '#060913' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Weekly (7 Days)
              </button>
              <button 
                onClick={() => setTimeFilter('10days')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: timeFilter === '10days' ? 'var(--primary)' : 'transparent',
                  color: timeFilter === '10days' ? '#060913' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Last 10 Days
              </button>
              <button 
                onClick={() => setTimeFilter('monthly')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: timeFilter === 'monthly' ? 'var(--primary)' : 'transparent',
                  color: timeFilter === 'monthly' ? '#060913' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Monthly (30 Days)
              </button>
            </div>

            {/* PMS Operations Status tab list (ALL 7 options as cards with numbers) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {/* Arrivals Card */}
              <div 
                onClick={() => setActiveOpsTab('arrivals')}
                style={getCardTabStyle(activeOpsTab === 'arrivals', '#f59e0b')}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Arrivals</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: activeOpsTab === 'arrivals' ? '#f59e0b' : '#fff', marginTop: '6px' }}>{arrivalsCount}</div>
              </div>

              {/* In House Card */}
              <div 
                onClick={() => setActiveOpsTab('inhouse')}
                style={getCardTabStyle(activeOpsTab === 'inhouse', '#10b981')}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>In House</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: activeOpsTab === 'inhouse' ? '#10b981' : '#fff', marginTop: '6px' }}>{inHouseCount}</div>
              </div>

              {/* Departures Card */}
              <div 
                onClick={() => setActiveOpsTab('departures')}
                style={getCardTabStyle(activeOpsTab === 'departures', '#ef4444')}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Departures</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: activeOpsTab === 'departures' ? '#ef4444' : '#fff', marginTop: '6px' }}>{departuresCount}</div>
              </div>

              {/* Magick List Card */}
              <div 
                onClick={() => setActiveOpsTab('magiclist')}
                style={getCardTabStyle(activeOpsTab === 'magiclist', '#a855f7', true)}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Sparkles size={11} style={{ flexShrink: 0 }} /> Magick List
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: activeOpsTab === 'magiclist' ? '#a855f7' : '#fff', marginTop: '6px' }}>{magicListCount}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {/* On Hold Card */}
              <div 
                onClick={() => setActiveOpsTab('onhold')}
                style={getCardTabStyle(activeOpsTab === 'onhold', '#f59e0b')}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Hold</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: activeOpsTab === 'onhold' ? '#f59e0b' : '#fff', marginTop: '6px' }}>{onHoldCount}</div>
              </div>

              {/* No Show Card */}
              <div 
                onClick={() => setActiveOpsTab('noshow')}
                style={getCardTabStyle(activeOpsTab === 'noshow', '#ef4444')}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>No Show</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: activeOpsTab === 'noshow' ? '#ef4444' : '#fff', marginTop: '6px' }}>{noShowCount}</div>
              </div>

              {/* Cancellations Card */}
              <div 
                onClick={() => setActiveOpsTab('cancelled')}
                style={getCardTabStyle(activeOpsTab === 'cancelled', '#6b7280')}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cancelled</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: activeOpsTab === 'cancelled' ? '#6b7280' : '#fff', marginTop: '6px' }}>{cancelledCount}</div>
              </div>
            </div>

            {/* Dynamic Operations Content Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getTabReservations().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No reservations matched this filter criteria.
                </div>
              ) : (
                getTabReservations().map(res => {
                  const dues = getBookingDues(res)
                  const room = rooms.find(rm => rm.id === res.roomId)
                  const isDirty = room && room.status === 'HOUSEKEEPING'
                  
                  return (
                    <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{res.guestName}</span>
                          <span style={{ 
                            fontSize: '9px', 
                            background: 
                              res.status === 'CHECKED_IN' ? 'rgba(16, 185, 129, 0.15)' : 
                              res.status === 'CHECKED_OUT' ? 'rgba(59, 130, 246, 0.15)' :
                              res.status === 'ON_HOLD' ? 'rgba(245, 158, 11, 0.15)' :
                              res.status === 'NO_SHOW' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)', 
                            color: 
                              res.status === 'CHECKED_IN' ? '#10b981' : 
                              res.status === 'CHECKED_OUT' ? '#3b82f6' :
                              res.status === 'ON_HOLD' ? '#f59e0b' :
                              res.status === 'NO_SHOW' ? '#ef4444' : '#fff',
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontWeight: 700 
                          }}>
                            {res.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {res.checkIn} to {res.checkOut} • Total Ledger: ${res.amount.toFixed(2)}
                        </div>
                        {res.notes && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Note: {res.notes}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Room selection block */}
                        {activeOpsTab !== 'cancelled' && activeOpsTab !== 'noshow' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Room Assignment</span>
                            {renderRoomSelector(res)}
                            {isDirty && (
                              <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                ⚠️ Dirty Room
                              </span>
                            )}
                          </div>
                        )}

                        {/* Status specific actions */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {activeOpsTab === 'arrivals' && (
                            <>
                              <button
                                onClick={() => handleCheckIn(res.id, res.roomId)}
                                style={actionBtnStyle('green')}
                              >
                                Check-In
                              </button>
                              <button
                                onClick={() => handleSendMagicLink(res.guestName, res.email)}
                                style={actionBtnStyle('purple')}
                              >
                                <Sparkles size={11} /> Magic Link
                              </button>
                            </>
                          )}

                          {activeOpsTab === 'inhouse' && (
                            <>
                              <button 
                                onClick={() => handleExtendStay(res.id)}
                                style={actionBtnStyle('gray')}
                              >
                                Extend 1 Night
                              </button>
                              {dues.balanceDue > 0.01 && (
                                <button 
                                  onClick={() => handleSettleDues(res.id)}
                                  style={actionBtnStyle('green')}
                                >
                                  Settle ${dues.balanceDue.toFixed(0)}
                                </button>
                              )}
                            </>
                          )}

                          {activeOpsTab === 'departures' && (
                            <>
                              {dues.balanceDue > 0.01 && (
                                <button
                                  onClick={() => handleSettleDues(res.id)}
                                  style={actionBtnStyle('green')}
                                >
                                  Settle Dues
                                </button>
                              )}
                              <button
                                onClick={() => handleCheckOut(res.id, res.roomId)}
                                disabled={dues.balanceDue > 0.01}
                                style={actionBtnStyle(dues.balanceDue > 0.01 ? 'disabled' : 'red')}
                              >
                                Checkout
                              </button>
                            </>
                          )}

                          {activeOpsTab === 'onhold' && (
                            <>
                              <button
                                onClick={() => handleConfirmHold(res.id)}
                                style={actionBtnStyle('green')}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => handleCancelBooking(res.id)}
                                style={actionBtnStyle('red')}
                              >
                                Release Hold
                              </button>
                            </>
                          )}

                          {activeOpsTab === 'cancelled' && (
                            <button
                              onClick={() => {
                                const updated = reservations.map(r => r.id === res.id ? { ...r, status: 'PENDING' as const } : r)
                                saveAndReloadReservations(updated)
                                alert("Booking reactivated. Moved back to expected arrivals.")
                              }}
                              style={actionBtnStyle('green')}
                            >
                              Re-activate
                            </button>
                          )}

                          {activeOpsTab === 'noshow' && (
                            <>
                              {res.status !== 'NO_SHOW' && (
                                <button
                                  onClick={() => handleMarkNoShow(res.id)}
                                  style={actionBtnStyle('red')}
                                >
                                  Mark No-Show
                                </button>
                              )}
                              <button
                                onClick={() => handleCheckIn(res.id, res.roomId)}
                                style={actionBtnStyle('green')}
                              >
                                Force Check-in
                              </button>
                            </>
                          )}

                          {activeOpsTab === 'magiclist' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {/* Remote verification logs */}
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={res.ocrStatus === 'VERIFIED'}
                                    onChange={() => handleToggleVerification(res.id, 'ocrStatus')}
                                  />
                                  <span style={{ color: res.ocrStatus === 'VERIFIED' ? '#10b981' : 'var(--text-muted)' }}>OCR ID</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={res.signatureCollected}
                                    onChange={() => handleToggleVerification(res.id, 'signatureCollected')}
                                  />
                                  <span style={{ color: res.signatureCollected ? '#10b981' : 'var(--text-muted)' }}>Sign</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={res.selfieVerified}
                                    onChange={() => handleToggleVerification(res.id, 'selfieVerified')}
                                  />
                                  <span style={{ color: res.selfieVerified ? '#10b981' : 'var(--text-muted)' }}>Selfie</span>
                                </label>
                              </div>
                              <button
                                onClick={() => handleCheckIn(res.id, res.roomId)}
                                style={actionBtnStyle(res.ocrStatus === 'VERIFIED' && res.signatureCollected && res.selfieVerified ? 'green' : 'gray')}
                              >
                                Instant Self Check-in
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Bidirectional OTA Channel Manager Synchronization Board */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
              <span>Bidirectional OTA Channel Manager Synchronization Center</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {/* Booking.com */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Booking.com Direct</span>
                  <span className="status-badge available" style={{ fontSize: '9px', padding: '2px 6px' }}>SYNCED</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Rates, room mappings, and calendar modifications synced in real time. Webhook active.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Last synced: 2 mins ago</span>
                  <button 
                    onClick={() => handleChannelSync('prov-booking', 'Booking.com')}
                    disabled={syncingProviderId === 'prov-booking'}
                    style={{
                      background: syncingProviderId === 'prov-booking' ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                      color: syncingProviderId === 'prov-booking' ? 'var(--text-muted)' : '#060913',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: syncingProviderId === 'prov-booking' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {syncingProviderId === 'prov-booking' ? (
                      <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : 'Sync Now'}
                  </button>
                </div>
              </div>

              {/* Agoda */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Agoda Connect</span>
                  <span className="status-badge available" style={{ fontSize: '9px', padding: '2px 6px' }}>SYNCED</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Dynamic allocations and room availability synced automatically. Webhook active.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Last synced: 5 mins ago</span>
                  <button 
                    onClick={() => handleChannelSync('prov-agoda', 'Agoda')}
                    disabled={syncingProviderId === 'prov-agoda'}
                    style={{
                      background: syncingProviderId === 'prov-agoda' ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                      color: syncingProviderId === 'prov-agoda' ? 'var(--text-muted)' : '#060913',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: syncingProviderId === 'prov-agoda' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {syncingProviderId === 'prov-agoda' ? (
                      <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : 'Sync Now'}
                  </button>
                </div>
              </div>

              {/* Expedia */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Expedia Partner</span>
                  <span className="status-badge available" style={{ fontSize: '9px', padding: '2px 6px' }}>SYNCED</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Rate policies, extra guest configurations and minimum stay limits aligned.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Last synced: 10 mins ago</span>
                  <button 
                    onClick={() => handleChannelSync('prov-expedia', 'Expedia')}
                    disabled={syncingProviderId === 'prov-expedia'}
                    style={{
                      background: syncingProviderId === 'prov-expedia' ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                      color: syncingProviderId === 'prov-expedia' ? 'var(--text-muted)' : '#060913',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: syncingProviderId === 'prov-expedia' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {syncingProviderId === 'prov-expedia' ? (
                      <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : 'Sync Now'}
                  </button>
                </div>
              </div>

              {/* Airbnb */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Airbnb Syncer</span>
                  <span className="status-badge available" style={{ fontSize: '9px', padding: '2px 6px' }}>SYNCED</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Calendar import / export mappings synced successfully. Webhook active.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Last synced: 1 hour ago</span>
                  <button 
                    onClick={() => handleChannelSync('prov-airbnb', 'Airbnb')}
                    disabled={syncingProviderId === 'prov-airbnb'}
                    style={{
                      background: syncingProviderId === 'prov-airbnb' ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                      color: syncingProviderId === 'prov-airbnb' ? 'var(--text-muted)' : '#060913',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: syncingProviderId === 'prov-airbnb' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {syncingProviderId === 'prov-airbnb' ? (
                      <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : 'Sync Now'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sync Jobs history */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Dynamic OTA Sync Jobs History</h4>
                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>● CHANNEL GATEWAY ACTIVE</span>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Job ID</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>OTA Provider</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Operation</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Completed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncJobs.slice(0, 5).map((job, idx) => {
                      const providerName = job.providerId === 'prov-booking' ? 'Booking.com' :
                                           job.providerId === 'prov-agoda' ? 'Agoda' :
                                           job.providerId === 'prov-expedia' ? 'Expedia' :
                                           job.providerId === 'prov-airbnb' ? 'Airbnb' : 'OTA Channel'
                      return (
                        <tr key={job.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--primary)' }}>#{job.id?.toUpperCase() || `JOB-${idx}`}</td>
                          <td style={{ padding: '8px 12px' }}>{providerName}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <code style={{ background: 'rgba(255,255,255,0.03)', padding: '2px 4px', borderRadius: '4px', color: 'var(--primary)' }}>
                              {job.syncType}
                            </code>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ 
                              color: job.syncStatus === 'SUCCESS' ? '#10b981' : '#ef4444',
                              fontWeight: 600,
                              fontSize: '10px'
                            }}>
                              ● {job.syncStatus}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {new Date(job.completedAt || job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Properties Performance Matrix */}
          <div className="glass-card">
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building2 style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
              <span>Properties Performance Matrix</span>
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {hotels.map((hotel) => {
                const hotelRooms = rooms.filter(r => r.hotelId === hotel.id)
                const hotelOccupied = hotelRooms.filter(r => r.status === 'OCCUPIED').length
                const pct = hotelRooms.length > 0 ? Math.round((hotelOccupied / hotelRooms.length) * 100) : 0
                
                return (
                  <div key={hotel.id} style={{ borderBottom: '1px solid var(--border-card)', paddingBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{hotel.name}</span>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{hotel.city}, {hotel.country}</div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <span className={`status-badge ${hotel.status === 'ACTIVE' ? 'available' : 'blocked'}`}>
                          {hotel.status === 'ACTIVE' ? 'ACTIVE' : 'RENOVATING'}
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {hotelRooms.length} rooms ({pct}% full)
                        </div>
                      </div>
                    </div>
                    
                    {/* Linear Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(to right, #00f2fe, #4facfe)', borderRadius: '3px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Quick Console Actions */}
          <div className="glass-card">
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Quick Supergraph Operations</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <Link href="/bookings" style={{ display: 'block' }}>
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', textAlign: 'center', cursor: 'pointer' }}>
                  <Bed style={{ width: '24px', height: '24px', color: 'var(--primary)', margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Manage Rooms</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Change live statuses</div>
                </div>
              </Link>
              
              <Link href="/console" style={{ display: 'block' }}>
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', textAlign: 'center', cursor: 'pointer' }}>
                  <Terminal style={{ width: '24px', height: '24px', color: '#a855f7', margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>GraphQL Review</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Analyze GraphQL schema</div>
                </div>
              </Link>
              
              <Link href="/hotels" style={{ display: 'block' }}>
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', textAlign: 'center', cursor: 'pointer' }}>
                  <Building2 style={{ width: '24px', height: '24px', color: '#f59e0b', margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Add Property</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Register new hotel</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Alerts feed, AI Smart Co-Pilot, Housekeeping and Occupancy Forecasting */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PMS Live Alerts Center */}
          <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(239, 68, 68, 0.15)', background: 'linear-gradient(to bottom, var(--bg-card), rgba(239, 68, 68, 0.02))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Bell style={{ width: '16px', height: '16px', color: '#f87171' }} />
                <span>PMS Live Alerts Center</span>
              </h3>
              {alertsList.length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  {alertsList.length} Active
                </span>
              )}
            </div>
            
            {alertsList.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '12px 0', textAlign: 'center' }}>
                ✓ No active alerts. All systems running optimally.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                {alertsList.map((alertItem) => (
                  <div 
                    key={alertItem.id} 
                    style={{ 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      fontSize: '11px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      background: alertItem.severity === 'error' ? 'rgba(239, 68, 68, 0.08)' : alertItem.severity === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                      border: `1px solid ${alertItem.severity === 'error' ? 'rgba(239, 68, 68, 0.2)' : alertItem.severity === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <AlertTriangle 
                        size={12} 
                        style={{ 
                          color: alertItem.severity === 'error' ? '#ef4444' : alertItem.severity === 'warning' ? '#f59e0b' : '#3b82f6',
                          flexShrink: 0,
                          marginTop: '2px'
                        }} 
                      />
                      <span style={{ 
                        color: alertItem.severity === 'error' ? '#f87171' : alertItem.severity === 'warning' ? '#fbbf24' : '#60a5fa',
                        lineHeight: '1.4'
                      }}>
                        {alertItem.message}
                      </span>
                    </div>
                    {alertItem.action && (
                      <button 
                        onClick={alertItem.action}
                        style={{
                          alignSelf: 'flex-end',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {alertItem.actionLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic 7-day Occupancy Forecast widget */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
              <span>7-Day Occupancy Forecast</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {getOccupancyForecast().map((f, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{(() => {
                      const dateParts = f.date.split('-').map(Number);
                      const y = dateParts[0] ?? 2026;
                      const m = dateParts[1] ?? 6;
                      const d = dateParts[2] ?? 1;
                      const date = new Date(Date.UTC(y, m - 1, d));
                      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `${weekdays[date.getUTCDay()!] || ''}, ${months[date.getUTCMonth()!] || ''} ${d}`;
                    })()}</span>
                    <span style={{ fontWeight: 600, color: f.rate > 70 ? '#10b981' : f.rate > 40 ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {f.occupied} Rooms Booked ({f.rate}%)
                    </span>
                  </div>
                  {/* Mini visual progress bar */}
                  <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${f.rate}%`, height: '100%', background: f.rate > 70 ? 'linear-gradient(to right, #10b981, #059669)' : 'linear-gradient(to right, var(--primary), var(--secondary))', borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick QR checkin portal widget */}
          <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(to bottom, var(--bg-card), rgba(0, 242, 254, 0.02))', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <QrCode size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Desk Mobile Self Check-In QR</span>
            </div>
            <div style={{ background: '#fff', width: '110px', height: '110px', margin: '12px auto', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
              {/* Fake QR representation */}
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                <rect x="0" y="0" width="30" height="30" fill="#000" />
                <rect x="5" y="5" width="20" height="20" fill="#fff" />
                <rect x="10" y="10" width="10" height="10" fill="#000" />
                <rect x="70" y="0" width="30" height="30" fill="#000" />
                <rect x="75" y="5" width="20" height="20" fill="#fff" />
                <rect x="80" y="10" width="10" height="10" fill="#000" />
                <rect x="0" y="70" width="30" height="30" fill="#000" />
                <rect x="5" y="75" width="20" height="20" fill="#fff" />
                <rect x="10" y="80" width="10" height="10" fill="#000" />
                <rect x="40" y="40" width="20" height="20" fill="#000" />
                <rect x="45" y="45" width="10" height="10" fill="#fff" />
                <rect x="70" y="70" width="10" height="10" fill="#000" />
                <rect x="80" y="80" width="10" height="10" fill="#000" />
                <rect x="90" y="70" width="10" height="10" fill="#000" />
                <rect x="40" y="10" width="10" height="20" fill="#000" />
                <rect x="10" y="40" width="20" height="10" fill="#000" />
              </svg>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Have guests scan QR at the front desk to open remote check-in details sheet on their personal mobile devices.
            </div>
          </div>

          {/* Flexi AI Property Co-Pilot */}
          <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(168, 85, 247, 0.15)', background: 'linear-gradient(to bottom, var(--bg-card), rgba(168, 85, 247, 0.02))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Sparkles style={{ width: '16px', height: '16px', color: '#c084fc' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Flexi AI Property Co-Pilot</h3>
            </div>

            {aiInsightSuccess && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '11px', padding: '8px 10px', borderRadius: '6px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{aiInsightSuccess}</span>
                <button onClick={() => setAiInsightSuccess(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>×</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Compaction Compactor */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Calendar Auto-Compactor</div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '8px' }}>
                  Optimize layout configurations to close 3 single-day gaps in Deluxe Category. Re-arrange non-checked-in slots.
                </p>
                <button
                  onClick={async () => {
                    setIsCompacting(true)
                    await new Promise(resolve => setTimeout(resolve, 1500))
                    setIsCompacting(false)
                    setAiInsightSuccess("AI Tetris successfully reshuffled allocations! Opened Room 101 for a continuous 4-day reservation slot.")
                  }}
                  disabled={isCompacting}
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: isCompacting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isCompacting ? <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} /> : 'Run AI Compactor'}
                </button>
              </div>

              {/* Transit micro-stays */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Transit Day-Use Slots</div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '8px' }}>
                  2 suites are empty today between 10:00 AM and 3:00 PM. AI recommends enabling a 3-hour micro-stay rate of $45.00.
                </p>
                <button
                  onClick={() => {
                    setAiInsightSuccess("Micro-stay rate slots pushed successfully to Booking.com, Agoda and Airbnb!")
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-card)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Push Micro-Stay Rate
                </button>
              </div>

              {/* Parity Price Optimization */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Parity Rate Optimization</div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '8px' }}>
                  Goa regional search indexes show 40% uptick in deluxe room inquiries. AI suggests raising weekend rate to $180.
                </p>
                <button
                  onClick={() => {
                    setAiInsightSuccess("Parity rate optimization applied! New rates synced to Booking.com and direct engines.")
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-card)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Optimize Rates
                </button>
              </div>
            </div>
          </div>

          {/* State Distribution & Housekeeping Duty Board */}
          <div className="glass-card">
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>State Distribution</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                  <span>Available</span>
                </span>
                <span style={{ fontWeight: 600 }}>{availableRooms}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                  <span>Occupied</span>
                </span>
                <span style={{ fontWeight: 600 }}>{occupiedRooms}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a855f7' }} />
                  <span>Housekeeping</span>
                </span>
                <span style={{ fontWeight: 600 }}>{housekeepingRooms}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} />
                  <span>Maintenance</span>
                </span>
                <span style={{ fontWeight: 600 }}>{rooms.filter(r => r.status === 'MAINTENANCE').length}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6b7280' }} />
                  <span>Blocked</span>
                </span>
                <span style={{ fontWeight: 600 }}>{rooms.filter(r => r.status === 'BLOCKED').length}</span>
              </div>
            </div>

            {/* Housekeeping Board Duty Desk */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-card)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Housekeeping Duty Desk</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dirtyRooms.length} dirty rooms</span>
              </div>
              
              {dirtyRooms.length === 0 ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981' }}>
                  <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span>All rooms cleaned & inspected!</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {dirtyRooms.map(rm => {
                    const rtName = roomTypes.find(t => t.id === rm.roomTypeId)?.name || rm.roomTypeId
                    return (
                      <div key={rm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>Room {rm.roomNumber}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginLeft: '6px' }}>({rtName})</span>
                        </div>
                        <button
                          onClick={() => updateRoomState(rm.id, 'AVAILABLE')}
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Mark Clean
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* System Gateway Details */}
          <div className="glass-card" style={{ background: 'linear-gradient(to bottom, var(--bg-card), rgba(79, 172, 254, 0.05))' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <FileCheck2 style={{ width: '16px', height: '16px' }} />
              <span>Gateway Status</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '8px' }}>
              The dynamic Apollo Federated Supergraph composed successfully, exposing combined entities under a type-safe schema layer.
            </p>
            
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-card)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>GraphQL Entry:</span>
                <code style={{ color: 'var(--primary)' }}>/graphql</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Composer Version:</span>
                <span>Federation v2.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Booking Wizard Dialog Modal */}
      {showNewBookingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '550px',
            padding: '28px',
            border: '1px solid var(--border-card-active)',
            boxShadow: '0 0 30px rgba(0, 242, 254, 0.15)',
            background: '#0a0f1d'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', background: 'linear-gradient(to right, #ffffff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 20px 0' }}>
              Create New Reservation Wizard
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Guest Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>First Name</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. John"
                    value={newBookingForm.firstName}
                    onChange={e => setNewBookingForm({...newBookingForm, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Last Name</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Doe"
                    value={newBookingForm.lastName}
                    onChange={e => setNewBookingForm({...newBookingForm, lastName: e.target.value})}
                  />
                </div>
              </div>

              {/* Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Email Address</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    placeholder="john.doe@example.com"
                    value={newBookingForm.email}
                    onChange={e => setNewBookingForm({...newBookingForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Phone Number</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="+91 99999 88888"
                    value={newBookingForm.phone}
                    onChange={e => setNewBookingForm({...newBookingForm, phone: e.target.value})}
                  />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Check-In Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={newBookingForm.checkIn}
                    onChange={e => setNewBookingForm({...newBookingForm, checkIn: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Check-Out Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={newBookingForm.checkOut}
                    onChange={e => setNewBookingForm({...newBookingForm, checkOut: e.target.value})}
                  />
                </div>
              </div>

              {/* Room type & Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Room Type Category</label>
                  <select 
                    className="input-field"
                    value={newBookingForm.roomTypeId}
                    onChange={e => setNewBookingForm({...newBookingForm, roomTypeId: e.target.value})}
                    style={{ cursor: 'pointer' }}
                  >
                    {roomTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>{rt.name} (${rt.basePrice}/night)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Base Rate ($)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={newBookingForm.amount}
                    onChange={e => setNewBookingForm({...newBookingForm, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              {/* Held Status */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Initial Booking Hold Status</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="initialStatus"
                      checked={newBookingForm.status === 'PENDING'}
                      onChange={() => setNewBookingForm({...newBookingForm, status: 'PENDING'})}
                    />
                    <span>Confirm Booking (Moves to Arrivals)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="initialStatus"
                      checked={newBookingForm.status === 'ON_HOLD'}
                      onChange={() => setNewBookingForm({...newBookingForm, status: 'ON_HOLD'})}
                    />
                    <span>Place Tentative Hold (Moves to On Hold)</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
              <button 
                onClick={() => setShowNewBookingModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-card)',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Wizard
              </button>
              <button 
                onClick={handleCreateNewBookingSubmit}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: '#060913',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 242, 254, 0.25)'
                }}
              >
                Create Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

// Helpers for visual actions & styling
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline' }}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const getTabStyle = (isActive: boolean, isSparkle = false): React.CSSProperties => ({
  padding: '8px 14px',
  background: isActive ? (isSparkle ? 'rgba(168, 85, 247, 0.18)' : 'rgba(0, 242, 254, 0.12)') : 'transparent',
  color: isActive ? (isSparkle ? '#c084fc' : 'var(--primary)') : 'var(--text-muted)',
  border: `1px solid ${isActive ? (isSparkle ? 'rgba(168, 85, 247, 0.4)' : 'rgba(0, 242, 254, 0.3)') : 'transparent'}`,
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '12px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s ease',
  boxShadow: isActive ? (isSparkle ? '0 0 10px rgba(168, 85, 247, 0.1)' : '0 0 10px rgba(0, 242, 254, 0.1)') : 'none'
})

const actionBtnStyle = (colorType: 'green' | 'red' | 'gray' | 'purple' | 'disabled'): React.CSSProperties => {
  const isDisable = colorType === 'disabled'
  let bg = 'rgba(255,255,255,0.03)'
  let color = '#fff'
  let border = '1px solid var(--border-card)'

  if (colorType === 'green') {
    bg = 'linear-gradient(135deg, #10b981, #059669)'
    color = '#fff'
    border = 'none'
  } else if (colorType === 'red') {
    bg = 'linear-gradient(135deg, #ef4444, #dc2626)'
    color = '#fff'
    border = 'none'
  } else if (colorType === 'purple') {
    bg = 'rgba(168, 85, 247, 0.15)'
    color = '#c084fc'
    border = '1px solid rgba(168, 85, 247, 0.3)'
  } else if (isDisable) {
    bg = 'rgba(255,255,255,0.02)'
    color = 'var(--text-muted)'
    border = '1px solid rgba(255,255,255,0.04)'
  }

  return {
    background: bg,
    color,
    border,
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: isDisable ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: (colorType === 'green' || colorType === 'red') ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
    transition: 'all 0.15s ease'
  }
}

const getCardTabStyle = (isActive: boolean, activeColor: string, isSparkle = false): React.CSSProperties => {
  return {
    background: isActive 
      ? 'linear-gradient(to bottom, rgba(16, 22, 42, 0.95), rgba(16, 22, 42, 0.75))' 
      : 'rgba(255,255,255,0.01)',
    border: `1.5px solid ${isActive ? activeColor : 'rgba(255, 255, 255, 0.04)'}`,
    padding: '14px 10px',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: isActive ? `0 0 12px ${activeColor}25` : 'none',
    transform: isActive ? 'translateY(-2px)' : 'none',
  }
}
