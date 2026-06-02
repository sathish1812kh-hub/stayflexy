"use client"

import React, { useState, useEffect } from 'react'
import DashboardShell from '../components/DashboardShell'
import dataClient, { Room, RoomType } from '../dataClient'
import { 
  Calendar, User, Bed, Clock, ClipboardList, CheckSquare, PlusCircle,
  Mail, Phone, Globe, ShieldAlert, CreditCard, Percent, FileText, Sparkles,
  KeyRound, X
} from 'lucide-react'

interface ChargeItem {
  name: string
  amount: number
  timestamp: string
}

interface PaymentItem {
  method: 'CASH' | 'CARD' | 'ONLINE'
  amount: number
  timestamp: string
  txnId?: string
}

interface Reservation {
  id: string
  guestName: string
  roomNumber: string
  roomId: string
  checkIn: string
  checkOut: string
  status: 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'
  amount: number
  notes: string
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
}

const parseMetaField = (notes: string, key: string): string => {
  const match = notes?.match(new RegExp(`${key}:([^|]+)`))
  return match ? match[1]!.trim() : ''
}

const parseSafeDateTime = (val: string, timePart?: string): Date => {
  if (val.includes('T')) {
    return new Date(val)
  }
  const parts = val.split('-')
  const time = timePart || '12:00'
  const timeParts = time.split(':')
  if (parts.length === 3 && timeParts.length >= 2) {
    return new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      Number(timeParts[0]),
      Number(timeParts[1])
    )
  }
  return new Date(val)
}

const getExactDates = (res: Reservation) => {
  const hourlyIn = parseMetaField(res.notes, 'IN')
  const hourlyOut = parseMetaField(res.notes, 'OUT')
  
  let checkInDate: Date
  let checkOutDate: Date
  
  if (hourlyIn) {
    checkInDate = new Date(hourlyIn)
  } else {
    checkInDate = parseSafeDateTime(res.checkIn, '14:00')
  }
  
  if (hourlyOut) {
    checkOutDate = new Date(hourlyOut)
  } else {
    checkOutDate = parseSafeDateTime(res.checkOut, '11:00')
  }
  
  return { checkInDate, checkOutDate }
}

const DEFAULT_RESERVATIONS: Reservation[] = [
  {
    id: "res-1",
    guestName: "Alice Vance",
    roomNumber: "102",
    roomId: "r-102",
    checkIn: "2026-05-22",
    checkOut: "2026-05-25",
    status: "CHECKED_IN",
    amount: 450.00,
    notes: "EMAIL:alice.vance@example.com | PHONE:+1 555-0199 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P829103 | DOB:1988-04-12 | RATE:150.00 | DISCOUNT:0.00 | TAX:54.00 | Requires late checkout at 1:00 PM.",
    email: "alice.vance@example.com",
    phone: "+1 555-0199",
    nationality: "United States",
    idType: "PASSPORT",
    idNumber: "P829103",
    dob: "1988-04-12",
    baseRate: 150.00,
    discount: 0.00,
    tax: 54.00
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
    notes: "EMAIL:robert.d@example.com | PHONE:+91 9988223311 | NATIONALITY:India | ID_TYPE:NATIONAL_ID | ID_NUMBER:IN-A8291 | DOB:1991-08-25 | RATE:110.00 | DISCOUNT:0.00 | TAX:92.40 | Corporate account booking from Socifyy.",
    email: "robert.d@example.com",
    phone: "+91 9988223311",
    nationality: "India",
    idType: "NATIONAL_ID",
    idNumber: "IN-A8291",
    dob: "1991-08-25",
    baseRate: 110.00,
    discount: 0.00,
    tax: 92.40
  },
  {
    id: "res-3",
    guestName: "Clara Oswald",
    roomNumber: "101",
    roomId: "r-101",
    checkIn: "2026-05-21",
    checkOut: "2026-05-24",
    status: "PENDING",
    amount: 450.00,
    notes: "EMAIL:clara@tardis.org | PHONE:+44 7911 123456 | NATIONALITY:United Kingdom | ID_TYPE:DRIVERS_LICENSE | ID_NUMBER:DL-UK829 | DOB:1993-02-14 | RATE:150.00 | DISCOUNT:0.00 | TAX:54.00 | Prefers high floor room. Poolside delivery requested.",
    email: "clara@tardis.org",
    phone: "+44 7911 123456",
    nationality: "United Kingdom",
    idType: "DRIVERS_LICENSE",
    idNumber: "DL-UK829",
    dob: "1993-02-14",
    baseRate: 150.00,
    discount: 0.00,
    tax: 54.00
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
    notes: "EMAIL:danny.pink@school.edu | PHONE:+44 7911 987654 | NATIONALITY:United Kingdom | ID_TYPE:PASSPORT | ID_NUMBER:P001928 | DOB:1989-11-05 | RATE:150.00 | DISCOUNT:0.00 | TAX:72.00 | Anniversary celebration. Complementary setup.",
    email: "danny.pink@school.edu",
    phone: "+44 7911 987654",
    nationality: "United Kingdom",
    idType: "PASSPORT",
    idNumber: "P001928",
    dob: "1989-11-05",
    baseRate: 150.00,
    discount: 0.00,
    tax: 72.00
  },
  {
    id: "res-101-default",
    guestName: "Guest101 Room101",
    roomNumber: "101",
    roomId: "r-101",
    checkIn: "2026-06-01",
    checkOut: "2026-06-08",
    status: "PENDING",
    amount: 1176.00,
    notes: "EMAIL:guest.101@example.com | PHONE:+1 555-0101 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P-ID-101 | DOB:1990-01-01 | RATE:150.00 | DISCOUNT:0.00 | TAX:126.00",
    email: "guest.101@example.com",
    phone: "+1 555-0101",
    nationality: "United States",
    idType: "PASSPORT",
    idNumber: "P-ID-101",
    dob: "1990-01-01",
    baseRate: 150.00,
    discount: 0.00,
    tax: 126.00
  },
  {
    id: "res-102-default",
    guestName: "Guest102 Room102",
    roomNumber: "102",
    roomId: "r-102",
    checkIn: "2026-06-01",
    checkOut: "2026-06-08",
    status: "PENDING",
    amount: 1176.00,
    notes: "EMAIL:guest.102@example.com | PHONE:+1 555-0102 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P-ID-102 | DOB:1990-01-01 | RATE:150.00 | DISCOUNT:0.00 | TAX:126.00",
    email: "guest.102@example.com",
    phone: "+1 555-0102",
    nationality: "United States",
    idType: "PASSPORT",
    idNumber: "P-ID-102",
    dob: "1990-01-01",
    baseRate: 150.00,
    discount: 0.00,
    tax: 126.00
  },
  {
    id: "res-103-default",
    guestName: "Guest103 Room103",
    roomNumber: "103",
    roomId: "r-103",
    checkIn: "2026-06-01",
    checkOut: "2026-06-08",
    status: "PENDING",
    amount: 1176.00,
    notes: "EMAIL:guest.103@example.com | PHONE:+1 555-0103 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P-ID-103 | DOB:1990-01-01 | RATE:150.00 | DISCOUNT:0.00 | TAX:126.00",
    email: "guest.103@example.com",
    phone: "+1 555-0103",
    nationality: "United States",
    idType: "PASSPORT",
    idNumber: "P-ID-103",
    dob: "1990-01-01",
    baseRate: 150.00,
    discount: 0.00,
    tax: 126.00
  },
  {
    id: "res-201-default",
    guestName: "Guest201 Room201",
    roomNumber: "201",
    roomId: "r-201",
    checkIn: "2026-06-01",
    checkOut: "2026-06-08",
    status: "PENDING",
    amount: 1176.00,
    notes: "EMAIL:guest.201@example.com | PHONE:+1 555-0201 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P-ID-201 | DOB:1990-01-01 | RATE:150.00 | DISCOUNT:0.00 | TAX:126.00",
    email: "guest.201@example.com",
    phone: "+1 555-0201",
    nationality: "United States",
    idType: "PASSPORT",
    idNumber: "P-ID-201",
    dob: "1990-01-01",
    baseRate: 150.00,
    discount: 0.00,
    tax: 126.00
  },
  {
    id: "res-202-default",
    guestName: "Guest202 Room202",
    roomNumber: "202",
    roomId: "r-202",
    checkIn: "2026-06-01",
    checkOut: "2026-06-08",
    status: "PENDING",
    amount: 1176.00,
    notes: "EMAIL:guest.202@example.com | PHONE:+1 555-0202 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P-ID-202 | DOB:1990-01-01 | RATE:150.00 | DISCOUNT:0.00 | TAX:126.00",
    email: "guest.202@example.com",
    phone: "+1 555-0202",
    nationality: "United States",
    idType: "PASSPORT",
    idNumber: "P-ID-202",
    dob: "1990-01-01",
    baseRate: 150.00,
    discount: 0.00,
    tax: 126.00
  },
  {
    id: "res-301-default",
    guestName: "Guest301 Room301",
    roomNumber: "301",
    roomId: "r-301",
    checkIn: "2026-06-01",
    checkOut: "2026-06-08",
    status: "PENDING",
    amount: 1176.00,
    notes: "EMAIL:guest.301@example.com | PHONE:+1 555-0301 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P-ID-301 | DOB:1990-01-01 | RATE:150.00 | DISCOUNT:0.00 | TAX:126.00",
    email: "guest.301@example.com",
    phone: "+1 555-0301",
    nationality: "United States",
    idType: "PASSPORT",
    idNumber: "P-ID-301",
    dob: "1990-01-01",
    baseRate: 150.00,
    discount: 0.00,
    tax: 126.00
  },
  {
    id: "res-901-default",
    guestName: "Guest901 Room901",
    roomNumber: "901",
    roomId: "r-901",
    checkIn: "2026-06-01",
    checkOut: "2026-06-08",
    status: "PENDING",
    amount: 1176.00,
    notes: "EMAIL:guest.901@example.com | PHONE:+1 555-0901 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P-ID-901 | DOB:1990-01-01 | RATE:150.00 | DISCOUNT:0.00 | TAX:126.00",
    email: "guest.901@example.com",
    phone: "+1 555-0901",
    nationality: "United States",
    idType: "PASSPORT",
    idNumber: "P-ID-901",
    dob: "1990-01-01",
    baseRate: 150.00,
    discount: 0.00,
    tax: 126.00
  },
  {
    id: "res-902-default",
    guestName: "Guest902 Room902",
    roomNumber: "902",
    roomId: "r-902",
    checkIn: "2026-06-01",
    checkOut: "2026-06-08",
    status: "PENDING",
    amount: 1176.00,
    notes: "EMAIL:guest.902@example.com | PHONE:+1 555-0902 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P-ID-902 | DOB:1990-01-01 | RATE:150.00 | DISCOUNT:0.00 | TAX:126.00",
    email: "guest.902@example.com",
    phone: "+1 555-0902",
    nationality: "United States",
    idType: "PASSPORT",
    idNumber: "P-ID-902",
    dob: "1990-01-01",
    baseRate: 150.00,
    discount: 0.00,
    tax: 126.00
  }
]

export default function BookingsGanttPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)

  // Folio incidentals and payments states
  const [incidentalName, setIncidentalName] = useState('')
  const [incidentalAmount, setIncidentalAmount] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE'>('CASH')

  // Date editors states
  const [isEditingDates, setIsEditingDates] = useState(false)
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  
  // Timeline Navigation and Scale States
  const [calendarStartDate, setCalendarStartDate] = useState<string>('2026-06-01')
  const [viewScale, setViewScale] = useState<'DAY' | 'WEEK' | 'TWO_WEEKS' | 'MONTH'>('TWO_WEEKS')

  const [now, setNow] = useState(new Date())
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRoomTypeId, setFilterRoomTypeId] = useState('')
  const [filterRoomStatus, setFilterRoomStatus] = useState('')

  // Unassigned Queue & Reallocation States
  const [showUnassignedTray, setShowUnassignedTray] = useState(true)
  const [allocatingResId, setAllocatingResId] = useState<string | null>(null)
  
  // Create booking form states (Standard + Advanced)
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('United States')
  const [idType, setIdType] = useState('PASSPORT')
  const [idNumber, setIdNumber] = useState('')
  const [dob, setDob] = useState('1990-01-01')
  
  const [roomId, setRoomId] = useState('')
  const [checkIn, setCheckIn] = useState('2026-05-25')
  const [checkOut, setCheckOut] = useState('2026-05-28')
  const [notes, setNotes] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [isHourly, setIsHourly] = useState(false)
  const [checkInHour, setCheckInHour] = useState('10:00')
  const [durationHours, setDurationHours] = useState('6')

  // Financial Calculator states
  const [baseRate, setBaseRate] = useState<string>('150')
  const [discount, setDiscount] = useState<string>('0')
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState<string>('0')
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE'>('CASH')
  const [creationTransactionId, setCreationTransactionId] = useState<string>('')

  async function loadData() {
    const activeHotelId = typeof window !== 'undefined' ? localStorage.getItem('sf_selected_hotel') || 'h1-resort-goa' : 'h1-resort-goa'
    const physicalRooms = await dataClient.getRooms()
    setRooms(physicalRooms)
    
    const types = await dataClient.getRoomTypes()
    setRoomTypes(types)
    
    const remoteBookings = await dataClient.getBookings(activeHotelId)
    
    if (remoteBookings && remoteBookings.length > 0) {
      const mapped: Reservation[] = remoteBookings.map((b: any) => {
        const primaryGuest = b.guests?.find((g: any) => g.isPrimary) || b.guests?.[0]
        const guestName = primaryGuest ? `${primaryGuest.firstName} ${primaryGuest.lastName}` : 'Guest Stayflexi'
        
        const room = b.rooms?.[0]
        const roomId = room?.roomId || ''
        const checkIn = room?.checkInDate ? room.checkInDate.split('T')[0] || '' : ''
        const checkOut = room?.checkOutDate ? room.checkOutDate.split('T')[0] || '' : ''
        
        const physicalRoom = physicalRooms.find(r => r.id === roomId)
        const roomNumber = physicalRoom ? physicalRoom.roomNumber : '101'
        
        const notesStr = b.specialRequests || ''
        const parsedEmail = parseMetaField(notesStr, 'EMAIL')
        const parsedPhone = parseMetaField(notesStr, 'PHONE')
        const parsedNationality = parseMetaField(notesStr, 'NATIONALITY')
        const parsedIdType = parseMetaField(notesStr, 'ID_TYPE')
        const parsedIdNumber = parseMetaField(notesStr, 'ID_NUMBER')
        const parsedDob = parseMetaField(notesStr, 'DOB')
        const parsedBaseRate = parseFloat(parseMetaField(notesStr, 'RATE') || '150')
        const parsedDiscount = parseFloat(parseMetaField(notesStr, 'DISCOUNT') || '0')
        const parsedTax = parseFloat(parseMetaField(notesStr, 'TAX') || '18')

        return {
          id: b.id,
          guestName,
          roomNumber,
          roomId,
          checkIn,
          checkOut,
          status: b.status === 'PENDING' ? 'PENDING' : b.status === 'CHECKED_IN' ? 'CHECKED_IN' : b.status === 'CHECKED_OUT' ? 'CHECKED_OUT' : 'CANCELLED',
          amount: b.rooms?.reduce((acc: number, r: any) => acc + (r.totalRoomAmount || 0), 0) || 120.00,
          notes: b.specialRequests || '',
          email: parsedEmail,
          phone: parsedPhone,
          nationality: parsedNationality,
          idType: parsedIdType,
          idNumber: parsedIdNumber,
          dob: parsedDob,
          baseRate: parsedBaseRate,
          discount: parsedDiscount,
          tax: parsedTax
        }
      })
      setReservations(mapped)
    } else {
      const savedRes = typeof window !== 'undefined' ? localStorage.getItem('sf_reservations') : null
      if (savedRes) {
        try {
          const list = JSON.parse(savedRes) as Reservation[]
          const filtered = list.filter(r => !(!r.id?.endsWith("-default") && r.checkIn?.startsWith("2026-06")))
          setReservations(filtered)
        } catch (e) {
          setReservations([])
        }
      } else {
        setReservations(DEFAULT_RESERVATIONS)
        if (typeof window !== 'undefined') {
          localStorage.setItem('sf_reservations', JSON.stringify(DEFAULT_RESERVATIONS))
        }
      }
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      if (savedRes) {
        try {
          let list = JSON.parse(savedRes) as any[]
          const filtered = list.filter(r => !(!r.id?.endsWith("-default") && r.checkIn?.startsWith("2026-06")))
          if (filtered.length !== list.length) {
            localStorage.setItem('sf_reservations', JSON.stringify(filtered))
            list = filtered
          }
          const defaultIds = new Set(DEFAULT_RESERVATIONS.map(r => r.id))
          const listIds = new Set(list.map(r => r.id))
          const missingAnyDefault = DEFAULT_RESERVATIONS.some(r => !listIds.has(r.id))
          if (missingAnyDefault) {
            const customBookings = list.filter(r => !defaultIds.has(r.id))
            const mergedList = [...DEFAULT_RESERVATIONS, ...customBookings]
            localStorage.setItem('sf_reservations', JSON.stringify(mergedList))
            localStorage.removeItem('sf_rooms')
          }
        } catch (e) {
          // ignore
        }
      }
    }
    loadData()
  }, [])

  const handleAddIncidental = (resId: string) => {
    if (!incidentalName || !incidentalAmount) return
    const amt = parseFloat(incidentalAmount)
    if (isNaN(amt) || amt <= 0) return

    const updated = reservations.map(r => {
      if (r.id === resId) {
        const charges = r.charges || []
        const newCharges = [...charges, { name: incidentalName, amount: amt, timestamp: new Date().toISOString() }]
        const newRes = { ...r, charges: newCharges }
        if (selectedRes && selectedRes.id === resId) setSelectedRes(newRes)
        return newRes
      }
      return r
    })

    setReservations(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_reservations', JSON.stringify(updated))
    }
    setIncidentalName('')
    setIncidentalAmount('')
  }

  const handleRemoveIncidental = (resId: string, idx: number) => {
    const updated = reservations.map(r => {
      if (r.id === resId) {
        const charges = r.charges || []
        const newCharges = charges.filter((_: ChargeItem, i: number) => i !== idx)
        const newRes = { ...r, charges: newCharges }
        if (selectedRes && selectedRes.id === resId) setSelectedRes(newRes)
        return newRes
      }
      return r
    })

    setReservations(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_reservations', JSON.stringify(updated))
    }
  }

  const handlePostPayment = (resId: string) => {
    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) return

    const updated = reservations.map(r => {
      if (r.id === resId) {
        const payments = r.payments || []
        const newPayments = [...payments, { method: paymentMethod, amount: amt, timestamp: new Date().toISOString() }]
        const newRes = { ...r, payments: newPayments }
        if (selectedRes && selectedRes.id === resId) setSelectedRes(newRes)
        return newRes
      }
      return r
    })

    setReservations(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_reservations', JSON.stringify(updated))
    }
    setPaymentAmount('')
  }

  const handleClearOutstandingDue = (resId: string, amount: number) => {
    if (amount <= 0) return

    const updated = reservations.map(r => {
      if (r.id === resId) {
        const payments = r.payments || []
        const newPayments: PaymentItem[] = [...payments, { method: 'CASH' as const, amount, timestamp: new Date().toISOString(), txnId: 'MANUAL-SETTLEMENT' }]
        const newRes = { ...r, payments: newPayments }
        if (selectedRes && selectedRes.id === resId) setSelectedRes(newRes)
        return newRes
      }
      return r
    })

    setReservations(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_reservations', JSON.stringify(updated))
    }
  }

  const handleSwapRoom = async (resId: string, targetRoomId: string) => {
    const targetRoom = rooms.find(r => r.id === targetRoomId)
    if (!targetRoom) return

    const currentRes = reservations.find(r => r.id === resId)
    if (!currentRes) return
    const hasConflict = reservations.some(r => {
      if (r.id === resId || r.roomId !== targetRoomId || r.status === 'CANCELLED') return false
      const r1 = new Date(r.checkIn)
      const r2 = new Date(r.checkOut)
      const d1 = new Date(currentRes.checkIn)
      const d2 = new Date(currentRes.checkOut)
      return !(d2 <= r1 || d1 >= r2)
    })
    if (hasConflict) {
      alert("Error: The target room is already booked during this reservation's dates!")
      return
    }

    const success = await dataClient.reassignRoom(resId, targetRoomId)
    if (success) {
      const updated = reservations.map(r => {
        if (r.id === resId) {
          const newRes = { ...r, roomId: targetRoomId, roomNumber: targetRoom.roomNumber }
          if (selectedRes && selectedRes.id === resId) setSelectedRes(newRes)
          return newRes
        }
        return r
      })

      setReservations(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sf_reservations', JSON.stringify(updated))
      }
      alert(`Successfully swapped room to Room ${targetRoom.roomNumber}!`)
    }
  }

  const handleSaveEditedDates = (resId: string) => {
    if (!editCheckIn || !editCheckOut) return
    const d1 = new Date(editCheckIn)
    const d2 = new Date(editCheckOut)
    if (d1 >= d2) {
      alert("Error: Check-out must be after check-in!")
      return
    }

    // Check conflicts: does any OTHER reservation in the same room block this time range?
    const currentRes = reservations.find(r => r.id === resId)
    if (!currentRes) return

    const hasConflict = reservations.some(r => {
      if (r.id === resId || r.roomId !== currentRes.roomId || r.status === 'CANCELLED') return false
      const r1 = new Date(r.checkIn)
      const r2 = new Date(r.checkOut)
      return !(d2 <= r1 || d1 >= r2)
    })

    if (hasConflict) {
      alert("Error: Date modification collides with an existing reservation in this room!")
      return
    }

    const updated = reservations.map(r => {
      if (r.id === resId) {
        const newRes = { ...r, checkIn: editCheckIn, checkOut: editCheckOut }
        if (selectedRes && selectedRes.id === resId) setSelectedRes(newRes)
        return newRes
      }
      return r
    })

    setReservations(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_reservations', JSON.stringify(updated))
    }
    setIsEditingDates(false)
    alert("Successfully extended/shortened reservation dates!")
  }

  const handleSwapReservations = async (resIdA: string, resIdB: string) => {
    const resA = reservations.find(r => r.id === resIdA)
    const resB = reservations.find(r => r.id === resIdB)
    if (!resA || !resB) return

    const roomA_id = resA.roomId
    const roomA_number = resA.roomNumber
    const roomB_id = resB.roomId
    const roomB_number = resB.roomNumber

    // If either is unassigned, we can't swap rooms, but we can assign resA to B's room
    if (!roomA_id || !roomB_id) {
      alert("Error: Both reservations must be assigned to physical rooms to swap them!")
      return
    }

    // Call dataClient reassignRoom for both
    const successA = await dataClient.reassignRoom(resIdA, roomB_id)
    const successB = await dataClient.reassignRoom(resIdB, roomA_id)

    if (successA && successB) {
      const updated = reservations.map(r => {
        if (r.id === resIdA) {
          return { ...r, roomId: roomB_id, roomNumber: roomB_number }
        }
        if (r.id === resIdB) {
          return { ...r, roomId: roomA_id, roomNumber: roomA_number }
        }
        return r
      })

      setReservations(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sf_reservations', JSON.stringify(updated))
      }
      setTimeout(() => {
        alert(`Successfully swapped rooms! ${resA.guestName} is now in Room ${roomB_number}, and ${resB.guestName} is in Room ${roomA_number}.`)
      }, 300)
    }
  }

  const handleGridDrop = async (bookingId: string, targetRoomId: string, targetRoomNumber: string, day: string) => {
    const targetRoom = rooms.find(r => r.id === targetRoomId)
    if (!targetRoom) return

    const res = reservations.find(r => r.id === bookingId)
    if (!res) return

    // If it's already in this room and starts on this date, do nothing
    if (res.roomId === targetRoomId && res.checkIn === day) {
      return
    }

    // Calculate original duration in nights
    const startOrig = new Date(res.checkIn)
    const endOrig = new Date(res.checkOut)
    const nights = Math.max(1, Math.round((endOrig.getTime() - startOrig.getTime()) / (1000 * 60 * 60 * 24)))

    // Calculate new check-in and check-out dates
    let newCheckIn = day
    let newCheckOut = day
    if (viewScale === 'DAY') {
      // In 24-hour mode, day is "08:00", "10:00", etc. 
      // Let's get the active start date
      const activeDateStr = calendarStartDate // "2026-05-20"
      const targetTimeStr = `${activeDateStr}T${day}:00`
      const targetDate = new Date(targetTimeStr)
      newCheckIn = targetDate.toISOString()
      
      const hourlyDurationHours = Number(parseMetaField(res.notes, 'Duration') || '6')
      const endMs = targetDate.getTime() + (hourlyDurationHours * 60 * 60 * 1000)
      newCheckOut = new Date(endMs).toISOString()
    } else {
      const d1 = new Date(day)
      const d2 = new Date(d1)
      d2.setDate(d2.getDate() + nights)
      newCheckIn = day
      newCheckOut = d2.toISOString().split('T')[0] || ''
    }

    // Check conflicts: does any OTHER reservation in the same target room block this new time range?
    const hasConflict = reservations.some(r => {
      if (r.id === bookingId || r.roomId !== targetRoomId || r.status === 'CANCELLED') return false
      const r1 = new Date(r.checkIn)
      const r2 = new Date(r.checkOut)
      const n1 = new Date(newCheckIn)
      const n2 = new Date(newCheckOut)
      return !(n2 <= r1 || n1 >= r2)
    })

    if (hasConflict) {
      // Find the conflicting reservation(s)
      const conflictingRes = reservations.find(r => {
        if (r.id === bookingId || r.roomId !== targetRoomId || r.status === 'CANCELLED') return false
        const r1 = new Date(r.checkIn)
        const r2 = new Date(r.checkOut)
        const n1 = new Date(newCheckIn)
        const n2 = new Date(newCheckOut)
        return !(n2 <= r1 || n1 >= r2)
      })

      if (conflictingRes) {
        const confirmSwap = window.confirm(
          `Conflict detected! Room ${targetRoomNumber} is already booked by ${conflictingRes.guestName} during this period.\n\nDo you want to SWAP the rooms of these two bookings?`
        )
        if (confirmSwap) {
          await handleSwapReservations(bookingId, conflictingRes.id)
        }
        return
      } else {
        alert("Error: Visual collision! The target room is occupied.")
        return
      }
    }

    // Perform reassignment
    const success = await dataClient.reassignRoom(bookingId, targetRoomId)
    if (success) {
      const updated = reservations.map(r => {
        if (r.id === bookingId) {
          // If hourly, we also update the notes field with the new arrival/checkout details
          let updatedNotes = r.notes
          if (r.notes?.includes('HOURLY_STAY')) {
            updatedNotes = r.notes
              .replace(/IN:\S+/, `IN:${newCheckIn}`)
              .replace(/OUT:\S+/, `OUT:${newCheckOut}`)
          }
          return {
            ...r,
            roomId: targetRoomId,
            roomNumber: targetRoomNumber,
            checkIn: newCheckIn.includes('T') ? newCheckIn.split('T')[0] || '' : newCheckIn,
            checkOut: newCheckOut.includes('T') ? newCheckOut.split('T')[0] || '' : newCheckOut,
            notes: updatedNotes
          }
        }
        return r
      })

      setReservations(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sf_reservations', JSON.stringify(updated))
      }
    }
  }


  // Live dynamic calculations
  let stayDuration = 1
  if (isHourly) {
    stayDuration = Number(durationHours)
  } else {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    stayDuration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const rateValue = parseFloat(baseRate) || 0
  const subtotalAmount = rateValue * (isHourly ? 1 : stayDuration) // Hourly base is flat, Daily is rate * nights
  const discountValue = parseFloat(discount) || 0
  const discountedSubtotal = Math.max(0, subtotalAmount - discountValue)
  const taxValue = discountedSubtotal * 0.12 // 12% standard Room Tax
  const finalLedgerTotal = discountedSubtotal + taxValue

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestFirstName || !guestLastName || !roomId) return

    if (roomId && roomId !== 'UNASSIGNED') {
      const hasConflict = reservations.some(r => {
        if (r.roomId !== roomId || r.status === 'CANCELLED') return false
        const r1 = new Date(r.checkIn)
        const r2 = new Date(r.checkOut)
        const d1 = new Date(checkIn)
        const d2 = new Date(checkOut)
        return !(d2 <= r1 || d1 >= r2)
      })
      if (hasConflict) {
        alert("Validation Failed: The selected room is already booked for one or more of the requested dates.")
        return
      }
    }

    const advancePaid = parseFloat(advancePaymentAmount) || 0
    if (advancePaid < finalLedgerTotal / 2) {
      alert(`Validation Failed: At least 50% of the total amount must be paid to confirm this reservation.\nTotal stay cost: $${finalLedgerTotal.toFixed(2)}\nMinimum required payment: $${(finalLedgerTotal / 2).toFixed(2)}\nProvided payment: $${advancePaid.toFixed(2)}`)
      return
    }

    const targetRoom = rooms.find(r => r.id === roomId)
    if (!targetRoom && roomId !== 'UNASSIGNED') return

    const activeHotelId = typeof window !== 'undefined' ? localStorage.getItem('sf_selected_hotel') || 'h1-resort-goa' : 'h1-resort-goa'
    const combinedGuestName = `${guestFirstName} ${guestLastName}`

    const allocatedRoomId = roomId === 'UNASSIGNED' ? '' : roomId
    const allocatedRoomTypeId = targetRoom ? targetRoom.roomTypeId : (roomTypes[0]?.id || '')

    // Metadata payload packing
    const metadataStr = `FIRST_NAME:${guestFirstName} | LAST_NAME:${guestLastName} | EMAIL:${email} | PHONE:${phone} | NATIONALITY:${nationality} | ID_TYPE:${idType} | ID_NUMBER:${idNumber} | DOB:${dob} | RATE:${rateValue.toFixed(2)} | DISCOUNT:${discountValue.toFixed(2)} | TAX:${taxValue.toFixed(2)} | CATEGORY_ID:${allocatedRoomTypeId}`
    const combinedNotes = notes ? `${notes} | ${metadataStr}` : metadataStr

    let newRes
    if (isHourly) {
      const startTime = `${checkIn}T${checkInHour}:00.000Z`
      const startMs = new Date(startTime).getTime()
      const endMs = startMs + (Number(durationHours) * 60 * 60 * 1000)
      const endTime = new Date(endMs).toISOString()
      
      newRes = await dataClient.createHourlyBooking({
        hotelId: activeHotelId,
        firstName: guestFirstName,
        lastName: guestLastName,
        email: email || undefined,
        phone: phone || undefined,
        nationality: nationality || undefined,
        idType: idType || undefined,
        idNumber: idNumber || undefined,
        dob: dob || undefined,
        roomTypeId: allocatedRoomTypeId,
        startTime,
        endTime,
        baseRate: rateValue,
        discount: discountValue,
        notes: `HOURLY_STAY Duration: ${durationHours} hours | ${combinedNotes}`
      })
    } else {
      newRes = await dataClient.createBooking({
        hotelId: activeHotelId,
        firstName: guestFirstName,
        lastName: guestLastName,
        email: email || undefined,
        phone: phone || undefined,
        nationality: nationality || undefined,
        idType: idType || undefined,
        idNumber: idNumber || undefined,
        dob: dob || undefined,
        roomTypeId: allocatedRoomTypeId,
        roomId: allocatedRoomId || undefined,
        checkIn,
        checkOut,
        baseRate: rateValue,
        discount: discountValue,
        notes: combinedNotes
      })
    }

    if (newRes) {
      // Sync detailed fields to offline localStorage representation if remote fallback occurs
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sf_reservations')
        if (saved) {
          const list = JSON.parse(saved) as Reservation[]
          const matchIndex = list.findIndex(r => r.id === newRes.id || r.guestName === combinedGuestName)
          if (matchIndex !== -1 && list[matchIndex]) {
            list[matchIndex] = {
              ...list[matchIndex]!,
              roomId: allocatedRoomId || list[matchIndex]!.roomId,
              roomNumber: targetRoom ? targetRoom.roomNumber : list[matchIndex]!.roomNumber,
              email,
              phone,
              nationality,
              idType,
              idNumber,
              dob,
              baseRate: rateValue,
              discount: discountValue,
              tax: taxValue,
              amount: finalLedgerTotal,
              notes: combinedNotes,
              payments: advancePaid > 0 ? [{ method: advancePaymentMethod, amount: advancePaid, timestamp: new Date().toISOString(), txnId: creationTransactionId }] : []
            }
            localStorage.setItem('sf_reservations', JSON.stringify(list))
          }
        }
      }

      await loadData()
      setGuestFirstName('')
      setGuestLastName('')
      setEmail('')
      setPhone('')
      setNationality('United States')
      setIdType('PASSPORT')
      setIdNumber('')
      setDob('1990-01-01')
      setBaseRate('150')
      setDiscount('0')
      setAdvancePaymentAmount('0')
      setAdvancePaymentMethod('CASH')
      setCreationTransactionId('')
      setNotes('')
      setShowAddForm(false)
    }
  }

  const handleSeedAllBookings = async () => {
    const defaultRooms = [
      {
        id: "r-101",
        hotelId: "h1-resort-goa",
        organizationId: "org-stayflexi",
        roomTypeId: "rt-deluxe",
        roomNumber: "101",
        floor: 1,
        status: "AVAILABLE",
        isActive: true,
        notes: "Regular guest pre-check requested poolside delivery.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "r-102",
        hotelId: "h1-resort-goa",
        organizationId: "org-stayflexi",
        roomTypeId: "rt-deluxe",
        roomNumber: "102",
        floor: 1,
        status: "AVAILABLE",
        isActive: true,
        notes: "Guest checking out late tomorrow at 1:00 PM.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "r-103",
        hotelId: "h1-resort-goa",
        organizationId: "org-stayflexi",
        roomTypeId: "rt-executive",
        roomNumber: "103",
        floor: 1,
        status: "AVAILABLE",
        isActive: true,
        notes: "Deep cleaning session needed. VIP guest arrivals scheduled.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "r-201",
        hotelId: "h1-resort-goa",
        organizationId: "org-stayflexi",
        roomTypeId: "rt-deluxe",
        roomNumber: "201",
        floor: 2,
        status: "AVAILABLE",
        isActive: true,
        notes: "Air conditioning filter recently serviced.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "r-202",
        hotelId: "h1-resort-goa",
        organizationId: "org-stayflexi",
        roomTypeId: "rt-executive",
        roomNumber: "202",
        floor: 2,
        status: "AVAILABLE",
        isActive: true,
        notes: "Balcony sliding door track needs repair replacement.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "r-301",
        hotelId: "h1-resort-goa",
        organizationId: "org-stayflexi",
        roomTypeId: "rt-presidential",
        roomNumber: "301",
        floor: 3,
        status: "AVAILABLE",
        isActive: true,
        notes: "Held exclusively for state department delegation.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "r-901",
        hotelId: "h2-suites-blr",
        organizationId: "org-stayflexi",
        roomTypeId: "rt-business-std",
        roomNumber: "901",
        floor: 9,
        status: "AVAILABLE",
        isActive: true,
        notes: "Dual monitors workspace initialized.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "r-902",
        hotelId: "h2-suites-blr",
        organizationId: "org-stayflexi",
        roomTypeId: "rt-business-std",
        roomNumber: "902",
        floor: 9,
        status: "AVAILABLE",
        isActive: true,
        notes: "Corporate account booking from Socifyy.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    const seededReservations = defaultRooms.map(room => {
      const rate = 150;
      const tax = 126;
      const total = 1176;
      return {
        id: `res-${room.roomNumber}-seeded`,
        guestName: `Guest${room.roomNumber} Room${room.roomNumber}`,
        roomNumber: room.roomNumber,
        roomId: room.id,
        checkIn: "2026-06-01",
        checkOut: "2026-06-08",
        status: "PENDING" as const,
        amount: total,
        notes: `EMAIL:guest.${room.roomNumber}@example.com | PHONE:+1 555-0${room.roomNumber} | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:P-ID-${room.roomNumber} | DOB:1990-01-01 | RATE:${rate.toFixed(2)} | DISCOUNT:0.00 | TAX:${tax.toFixed(2)}`,
        email: `guest.${room.roomNumber}@example.com`,
        phone: `+1 555-0${room.roomNumber}`,
        nationality: "United States",
        idType: "PASSPORT",
        idNumber: `P-ID-${room.roomNumber}`,
        dob: "1990-01-01",
        baseRate: rate,
        discount: 0,
        tax: tax
      };
    });

    localStorage.setItem("sf_rooms", JSON.stringify(defaultRooms));
    localStorage.setItem("sf_reservations", JSON.stringify(seededReservations));
    localStorage.setItem("sf_selected_hotel", "h1-resort-goa");
    setCalendarStartDate("2026-06-01");
    
    await loadData();
    alert("Successfully seeded all 8 rooms with 7-day bookings starting 2026-06-01!");
  };

  const processCheckIn = async (res: Reservation) => {
    const success = await dataClient.checkInGuest(res.id, res.roomId)
    if (success) {
      await loadData()
      setSelectedRes(null)
    }
  }

  const processCheckOut = async (res: Reservation) => {
    const success = await dataClient.checkOutGuest(res.id)
    if (success) {
      await loadData()
      setSelectedRes(null)
    }
  }

  const cancelReservation = async (res: Reservation) => {
    const success = await dataClient.cancelBooking(res.id, "Guest requested cancellation")
    if (success) {
      await loadData()
      setSelectedRes(null)
    }
  }

  const handleCellClick = async (targetRoomId: string, targetRoomNumber: string, day: string) => {
    if (!allocatingResId) return

    const res = reservations.find(r => r.id === allocatingResId)
    if (!res) return

    const success = await dataClient.reassignRoom(res.id, targetRoomId)
    if (success) {
      const updatedList = reservations.map(r => {
        if (r.id === res.id) {
          return { ...r, roomId: targetRoomId, roomNumber: targetRoomNumber }
        }
        return r
      })
      
      setReservations(updatedList)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sf_reservations', JSON.stringify(updatedList))
      }
      
      setAllocatingResId(null)
      alert(`Successfully allocated ${res.guestName} to Room ${targetRoomNumber}!`)
    }
  }

  const handleCellDoubleClick = (targetRoomId: string, targetRoomNumber: string, day: string) => {
    setGuestFirstName('')
    setGuestLastName('')
    setEmail('')
    setPhone('')
    setNationality('United States')
    setIdType('PASSPORT')
    setIdNumber('')
    setDob('1990-01-01')
    
    setRoomId(targetRoomId)
    
    if (viewScale === 'DAY') {
      setCheckIn(calendarStartDate)
      setIsHourly(true)
      const validHours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
      if (validHours.includes(day)) {
        setCheckInHour(day)
      } else {
        setCheckInHour('12:00')
      }
      setDurationHours('3')
    } else {
      setCheckIn(day)
      setIsHourly(false)
      try {
        const d = new Date(day + 'T00:00:00')
        d.setDate(d.getDate() + 1)
        setCheckOut(d.toISOString().split('T')[0]!)
      } catch {
        setCheckOut(day)
      }
    }
    
    setBaseRate('150')
    setDiscount('0')
    setAdvancePaymentAmount('0')
    setAdvancePaymentMethod('CASH')
    setCreationTransactionId('')
    setShowAddForm(true)
  }

  const timelineDays = viewScale === 'DAY'
    ? Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)
    : Array.from(
        { length: viewScale === 'WEEK' ? 7 : viewScale === 'TWO_WEEKS' ? 14 : 30 },
        (_, i) => {
          const start = new Date(calendarStartDate)
          start.setDate(start.getDate() + i)
          return start.toISOString().split('T')[0] || ''
        }
      )

  const getDayLabel = (dateStr: string) => {
    if (viewScale === 'DAY') {
      return dateStr
    }
    try {
      const d = new Date(dateStr)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${months[d.getMonth()]} ${d.getDate()}`
    } catch {
      return dateStr
    }
  }

  // Calculate red line percentage for current time indicator
  const getRedLineConfig = () => {
    try {
      const currentMs = now.getTime()
      const startMs = new Date(calendarStartDate + 'T00:00:00').getTime()
      
      let durationMs = 0
      if (viewScale === 'DAY') {
        durationMs = 24 * 60 * 60 * 1000
      } else {
        const totalDays = viewScale === 'WEEK' ? 7 : viewScale === 'TWO_WEEKS' ? 14 : 30
        durationMs = totalDays * 24 * 60 * 60 * 1000
      }
      
      const percent = ((currentMs - startMs) / durationMs) * 100
      return {
        show: percent >= 0 && percent <= 100,
        percent
      }
    } catch {
      return { show: false, percent: 0 }
    }
  }
  const { show: showRedLine, percent: redLinePercent } = getRedLineConfig()

  // Live filter streams
  const filteredRooms = rooms.filter(room => {
    if (filterRoomTypeId && room.roomTypeId !== filterRoomTypeId) return false
    if (filterRoomStatus && room.status !== filterRoomStatus) return false
    return true
  })

  const filteredReservations = reservations.filter(res => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = res.guestName.toLowerCase().includes(query)
      const matchesRoom = res.roomNumber.toLowerCase().includes(query)
      return matchesName || matchesRoom
    }
    return true
  })

  return (
    <DashboardShell
      activeTab="bookings"
      title="Bookings Gantt Scheduler"
      subtitle="Interactive reservation allocations fuzed live with physical rooms status matrix"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Active Reservation Timelines</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Visualize occupancy overlaps and process arrival schedules</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={handleSeedAllBookings}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              <Sparkles style={{ width: '15px', height: '15px' }} />
              <span>Seed 7-Day Bookings</span>
            </button>

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
              <span>Create Booking</span>
            </button>
          </div>
        </div>

        {/* Dynamic Filters & Navigation Controls Panel */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-card)', borderRadius: '12px' }}>
          {/* Row 1: Search & Dropdown Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Search Bookings</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search guest name or room..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Filter Room Category</label>
              <select 
                className="input-field"
                value={filterRoomTypeId}
                onChange={e => setFilterRoomTypeId(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 12px', background: '#0e1424', cursor: 'pointer' }}
              >
                <option value="">All Categories</option>
                {roomTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Filter Room Status</label>
              <select 
                className="input-field"
                value={filterRoomStatus}
                onChange={e => setFilterRoomStatus(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 12px', background: '#0e1424', cursor: 'pointer' }}
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="HOUSEKEEPING">Housekeeping</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OUT_OF_ORDER">Out Of Order</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                className="btn-primary" 
                onClick={() => {
                  setSearchQuery('')
                  setFilterRoomTypeId('')
                  setFilterRoomStatus('')
                }}
                style={{ width: '100%', padding: '7px 12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-card)', fontSize: '12px' }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }} />

          {/* Row 2: Navigation & View Modes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-card)', color: '#fff', fontSize: '12px' }}
                onClick={() => {
                  const start = new Date(calendarStartDate)
                  const shift = viewScale === 'DAY' ? 1 : viewScale === 'WEEK' ? 7 : viewScale === 'TWO_WEEKS' ? 14 : 30
                  start.setDate(start.getDate() - shift)
                  setCalendarStartDate(start.toISOString().split('T')[0]!)
                }}
              >
                ◀ Prev
              </button>
              <button 
                className="btn-primary" 
                style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-card)', color: '#fff', fontSize: '12px' }}
                onClick={() => setCalendarStartDate('2026-05-20')}
              >
                Today
              </button>
              <button 
                className="btn-primary" 
                style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-card)', color: '#fff', fontSize: '12px' }}
                onClick={() => {
                  const start = new Date(calendarStartDate)
                  const shift = viewScale === 'DAY' ? 1 : viewScale === 'WEEK' ? 7 : viewScale === 'TWO_WEEKS' ? 14 : 30
                  start.setDate(start.getDate() + shift)
                  setCalendarStartDate(start.toISOString().split('T')[0]!)
                }}
              >
                Next ▶
              </button>
              <input 
                type="date" 
                className="input-field" 
                style={{ width: '130px', padding: '5px 10px', fontSize: '12px' }}
                value={calendarStartDate} 
                onChange={e => setCalendarStartDate(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <button 
                style={{ padding: '6px 14px', borderRadius: '6px', background: viewScale === 'DAY' ? 'var(--primary)' : 'transparent', color: viewScale === 'DAY' ? '#060913' : '#cbd5e1', border: 'none', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                onClick={() => setViewScale('DAY')}
                type="button"
              >
                24-Hour
              </button>
              <button 
                style={{ padding: '6px 14px', borderRadius: '6px', background: viewScale === 'WEEK' ? 'var(--primary)' : 'transparent', color: viewScale === 'WEEK' ? '#060913' : '#cbd5e1', border: 'none', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                onClick={() => setViewScale('WEEK')}
                type="button"
              >
                Weekly
              </button>
              <button 
                style={{ padding: '6px 14px', borderRadius: '6px', background: viewScale === 'TWO_WEEKS' ? 'var(--primary)' : 'transparent', color: viewScale === 'TWO_WEEKS' ? '#060913' : '#cbd5e1', border: 'none', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                onClick={() => setViewScale('TWO_WEEKS')}
                type="button"
              >
                14-Days
              </button>
              <button 
                style={{ padding: '6px 14px', borderRadius: '6px', background: viewScale === 'MONTH' ? 'var(--primary)' : 'transparent', color: viewScale === 'MONTH' ? '#060913' : '#cbd5e1', border: 'none', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                onClick={() => setViewScale('MONTH')}
                type="button"
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Add Reservation Wizard Form Drawer */}
        {showAddForm && (
          <div 
            className="slide-in-right-drawer"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '100%',
              maxWidth: '560px',
              height: '100vh',
              background: 'rgba(10, 15, 30, 0.98)',
              borderLeft: '1px solid rgba(0, 242, 254, 0.25)',
              boxShadow: '-10px 0 35px rgba(0,0,0,0.7)',
              zIndex: 1000,
              overflowY: 'auto',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Advanced Booking Creation Wizard</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Step 1: Detailed Guest Profiles */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '12px' }}>
                  1. Guest Registration Profile
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>First Name</label>
                    <input 
                      type="text" required value={guestFirstName} onChange={e => setGuestFirstName(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      placeholder="e.g. John"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Last Name</label>
                    <input 
                      type="text" required value={guestLastName} onChange={e => setGuestLastName(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      placeholder="e.g. Doe"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Email Address</label>
                    <input 
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      placeholder="e.g. john.doe@example.com"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Phone Number</label>
                    <input 
                      type="text" required value={phone} onChange={e => setPhone(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      placeholder="e.g. +1 555-0100"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Nationality</label>
                    <input 
                      type="text" required value={nationality} onChange={e => setNationality(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      placeholder="e.g. United States"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Gov ID Type</label>
                    <select 
                      value={idType} onChange={e => setIdType(e.target.value)}
                      style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="PASSPORT">Passport</option>
                      <option value="NATIONAL_ID">National ID</option>
                      <option value="DRIVERS_LICENSE">Drivers License</option>
                      <option value="OTHER">Other Form</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Gov ID Number</label>
                    <input 
                      type="text" required value={idNumber} onChange={e => setIdNumber(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      placeholder="e.g. P1892019"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Date of Birth</label>
                    <input 
                      type="date" required value={dob} onChange={e => setDob(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Room Placement & Allocation Type */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '12px' }}>
                  2. Room Placement & Stay Scheduling
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Physical Room Allocation</label>
                    <select 
                      value={roomId} required onChange={e => setRoomId(e.target.value)}
                      style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Select Physical Room</option>
                      <option value="UNASSIGNED">Unassigned (Queue in Tray)</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.status})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Stay Category Model</label>
                    <select 
                      value={isHourly ? "HOURLY" : "DAILY"} onChange={e => setIsHourly(e.target.value === "HOURLY")}
                      style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="DAILY">Standard Daily Stay</option>
                      <option value="HOURLY">Hourly Flexible Stay</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Check-In Date</label>
                    <input 
                      type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                  
                  {!isHourly ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Check-Out Date</label>
                      <input 
                        type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Arrival Hour</label>
                        <select 
                          value={checkInHour} onChange={e => setCheckInHour(e.target.value)}
                          style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="08:00">08:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="12:00">12:00 PM</option>
                          <option value="14:00">02:00 PM</option>
                          <option value="16:00">04:00 PM</option>
                          <option value="18:00">06:00 PM</option>
                          <option value="20:00">08:00 PM</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Duration</label>
                        <select 
                          value={durationHours} onChange={e => setDurationHours(e.target.value)}
                          style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="3">3 Hours</option>
                          <option value="6">6 Hours</option>
                          <option value="12">12 Hours</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Pricing Calculator Console */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '12px' }}>
                  3. Dynamic Price & Discount Calculator
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
                  {/* Left Side: Overrides */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CreditCard size={12} color="var(--primary)" /> Base Stay Rate ($)
                      </label>
                      <input 
                        type="number" value={baseRate} onChange={e => setBaseRate(e.target.value)}
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                        placeholder="150"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Percent size={12} color="var(--secondary)" /> Custom Discount ($)
                      </label>
                      <input 
                        type="number" value={discount} onChange={e => setDiscount(e.target.value)}
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Middle Side: Live Ledgers breakdown panel */}
                  <div className="glass-card" style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--border-card)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: '#9ca3af' }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '12px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
                      Ledger Summary Preview
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Stay Duration:</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{stayDuration} {isHourly ? 'Hours' : 'Nights'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>${subtotalAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                      <span>Flat Discount:</span>
                      <span>-${discountValue.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Room Tax (12%):</span>
                      <span style={{ color: '#fff' }}>+${taxValue.toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                      <span>Total Amount:</span>
                      <span>${finalLedgerTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                      <span>Advance Paid:</span>
                      <span>-${(parseFloat(advancePaymentAmount) || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                      <span>Due Balance:</span>
                      <span>${Math.max(0, finalLedgerTotal - (parseFloat(advancePaymentAmount) || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Additional Special Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Additional Special Requests & Notes</label>
                  <textarea 
                    value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Prefers high floor rooms. Late checkout requested."
                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none', height: '80px', resize: 'none' }}
                  />
                </div>
              </div>

              {/* Step 4: Advance Payment Settle */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '12px' }}>
                  4. Advance Payment (At least 50% Required to Confirm)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Advance Payment Made ($)</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        type="number" required value={advancePaymentAmount} onChange={e => setAdvancePaymentAmount(e.target.value)}
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none', flex: 1 }}
                        placeholder="0.00"
                      />
                      <button
                        type="button"
                        onClick={() => setAdvancePaymentAmount((finalLedgerTotal / 2).toFixed(2))}
                        style={{ padding: '0 8px', borderRadius: '6px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Min (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdvancePaymentAmount(finalLedgerTotal.toFixed(2))}
                        style={{ padding: '0 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Full (100%)
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Payment Method</label>
                    <select 
                      value={advancePaymentMethod} onChange={e => setAdvancePaymentMethod(e.target.value as any)}
                      style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="ONLINE">Online Portal</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Transaction Reference ID</label>
                    <input 
                      type="text" value={creationTransactionId} onChange={e => setCreationTransactionId(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      placeholder="e.g. TXN-CARD-901828"
                    />
                  </div>
                </div>
              </div>

              {/* Controls triggers */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                <button 
                  type="button" onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '10px 20px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#fff',
                    border: '1px solid var(--border-card)', cursor: 'pointer', fontSize: '12px', fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{
                    padding: '10px 24px', borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: '#060913', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '12px',
                    boxShadow: '0 0 15px rgba(0, 242, 254, 0.25)'
                  }}
                >
                  Confirm Reservation
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Visual Matrix & Sidebars Wrapper */}
        <div style={{ display: 'grid', gridTemplateColumns: showUnassignedTray ? '1fr 280px' : '1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* Visual Gantt Timeline Matrix */}
          <div className="glass-card" style={{ padding: '24px', overflowX: 'auto', border: '1px solid var(--border-card)', borderRadius: '12px' }}>
            <div style={{ minWidth: '1000px', position: 'relative' }}>
              {/* Red Line indicator for current date/time */}
              {isMounted && showRedLine && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `calc(120px + (${redLinePercent} * (100% - 120px) / 100))`,
                    width: '2px',
                    backgroundColor: '#ef4444',
                    zIndex: 10,
                    pointerEvents: 'none',
                    boxShadow: '0 0 8px #ef4444'
                  }}
                  title={`Current Time: ${now.toLocaleString()}`}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    boxShadow: '0 0 6px #ef4444'
                  }} />
                </div>
              )}
              {/* Timeline Header Row */}
              <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${timelineDays.length}, 1fr)`, borderBottom: '1px solid var(--border-card)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Physical Room</div>
                {timelineDays.map(day => (
                  <div key={day} style={{ fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {getDayLabel(day)}
                  </div>
                ))}
              </div>

              {/* Timeline Rooms Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredRooms.map((room, roomIdx) => {
                  // Find all reservations matching this specific room
                  const roomRes = filteredReservations.filter(res => res.roomId === room.id && res.status !== 'CANCELLED')
                  
                  // Calculate layout parameters and lanes for each reservation to resolve visual overlaps
                  const mappedRes = roomRes.map(res => {
                    let actualStart = 0
                    let span = 0
                    let isVisible = false
                    
                    if (viewScale === 'DAY') {
                      const focusStart = parseSafeDateTime(calendarStartDate, '00:00')
                      const focusEnd = parseSafeDateTime(calendarStartDate, '24:00')
                      const { checkInDate, checkOutDate } = getExactDates(res)
                      
                      if (checkOutDate > focusStart && checkInDate < focusEnd) {
                        isVisible = true
                        const startFraction = Math.max(0, (checkInDate.getTime() - focusStart.getTime()) / (1000 * 60 * 60))
                        const endFraction = Math.min(24, (checkOutDate.getTime() - focusStart.getTime()) / (1000 * 60 * 60))
                        actualStart = startFraction
                        span = Math.max(0.5, endFraction - startFraction)
                      }
                    } else {
                      const focusStart = parseSafeDateTime(timelineDays[0]!, '00:00')
                      const focusEnd = parseSafeDateTime(timelineDays[timelineDays.length - 1]!, '24:00')
                      const d1 = parseSafeDateTime(res.checkIn, '00:00')
                      const d2 = parseSafeDateTime(res.checkOut, '00:00')
                      
                      if (d2 > focusStart && d1 < focusEnd) {
                        isVisible = true
                        const startCol = d1 < focusStart ? 0 : Math.floor((d1.getTime() - focusStart.getTime()) / (1000 * 60 * 60 * 24))
                        const endCol = d2 > focusEnd ? timelineDays.length : Math.ceil((d2.getTime() - focusStart.getTime()) / (1000 * 60 * 60 * 24))
                        actualStart = startCol
                        span = Math.max(1, endCol - startCol)
                      }
                    }
                    
                    return {
                      res,
                      actualStart,
                      span,
                      isVisible,
                      endCol: actualStart + span
                    }
                  }).filter(item => item.isVisible)

                  // Assign each reservation to a visual lane
                  const sortedMapped = [...mappedRes].sort((a, b) => a.actualStart - b.actualStart)
                  const lanes: number[] = []
                  const resLanes = new Map<string, number>()

                  sortedMapped.forEach(item => {
                    let assignedLane = 0
                    while (true) {
                      const lastEnd = lanes[assignedLane]
                      if (lastEnd === undefined || lastEnd <= item.actualStart) {
                        lanes[assignedLane] = item.endCol
                        resLanes.set(item.res.id, assignedLane)
                        break
                      }
                      assignedLane++
                    }
                  })

                  const totalLanes = Math.max(1, lanes.length)

                  return (
                    <div 
                      key={room.id} 
                      data-testid={`room-row-${room.roomNumber}`}
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: `120px repeat(${timelineDays.length}, 1fr)`, 
                        alignItems: 'stretch', 
                        minHeight: '36px',
                        height: `${totalLanes * 32 + 8}px`,
                        background: 'rgba(255,255,255,0.01)', 
                        borderRadius: '6px',
                        transition: 'height 0.2s'
                      }}
                    >
                      
                      {/* Room Identifier */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                        <Bed style={{ width: '13px', height: '13px', color: 'var(--primary)' }} />
                        <span>{room.roomNumber}</span>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: room.status === 'AVAILABLE' ? '#10b981' : room.status === 'OCCUPIED' ? '#ef4444' : '#a855f7' }} />
                      </div>

                      {/* Timeline linear block mapping */}
                      <div style={{ gridColumn: `2 / span ${timelineDays.length}`, position: 'relative', borderRadius: '4px', display: 'grid', gridTemplateColumns: `repeat(${timelineDays.length}, 1fr)` }}>
                        {/* Interactive grid cells for allocation */}
                        {timelineDays.map((day, idx) => (
                          <div 
                            key={day} 
                            data-testid={`cell-${room.roomNumber}-${idx}`}
                            onClick={() => handleCellClick(room.id, room.roomNumber, day)}
                            onDoubleClick={() => handleCellDoubleClick(room.id, room.roomNumber, day)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.background = 'rgba(0, 242, 254, 0.15)';
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.currentTarget.style.background = 'transparent';
                              const draggedResId = e.dataTransfer.getData('text/plain');
                              if (!draggedResId) return;
                              await handleGridDrop(draggedResId, room.id, room.roomNumber, day);
                            }}
                            style={{
                              borderLeft: idx > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                              background: allocatingResId ? 'rgba(0, 242, 254, 0.03)' : 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            title={allocatingResId ? `Allocate guest here: Room ${room.roomNumber} - ${getDayLabel(day)}` : 'Double-click to create reservation for this room & date'}
                          />
                        ))}
                        
                        {sortedMapped.map(item => {
                          const { res, actualStart, span } = item
                          const totalCols = viewScale === 'DAY' ? 24 : timelineDays.length
                          let tooltipAlignClass = ""
                          if (actualStart < 2) {
                            tooltipAlignClass += " align-left"
                          } else if (actualStart + span > totalCols - 2) {
                            tooltipAlignClass += " align-right"
                          }
                          if (roomIdx === 0) {
                            tooltipAlignClass += " align-bottom"
                          }
                          const lane = resLanes.get(res.id) || 0

                          let statusClass = 'res-pending'
                          if (res.status === 'CHECKED_IN') statusClass = 'res-checked-in'
                          if (res.status === 'CHECKED_OUT') statusClass = 'res-checked-out'
                          if (res.status === 'CANCELLED') statusClass = 'res-cancelled'

                          const guestInitials = res.guestName
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()

                          const parsedRate = res.baseRate || parseFloat(parseMetaField(res.notes, 'RATE') || '150')
                          const isHourlyRes = res.notes?.includes('HOURLY_STAY')

                          return (
                            <div 
                              key={res.id}
                              data-testid={`res-block-${res.id}`}
                              onClick={() => setSelectedRes(res)}
                              className={`reservation-block ${statusClass} res-tooltip`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', res.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const draggedResId = e.dataTransfer.getData('text/plain');
                                if (!draggedResId || draggedResId === res.id) return;
                                await handleSwapReservations(draggedResId, res.id);
                              }}
                              style={{
                                left: `${(actualStart / (viewScale === 'DAY' ? 24 : timelineDays.length)) * 100}%`,
                                width: `${(span / (viewScale === 'DAY' ? 24 : timelineDays.length)) * 100}%`,
                                top: `${lane * 32 + 4}px`,
                                height: '26px',
                                position: 'absolute',
                                cursor: 'grab'
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: 'rgba(255, 255, 255, 0.12)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '8px',
                                  fontWeight: 700,
                                  flexShrink: 0
                                }}>
                                  {guestInitials}
                                </div>
                                {isHourlyRes && <Clock style={{ width: '10px', height: '10px', color: '#00f2fe', flexShrink: 0 }} />}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.guestName}</span>
                              </span>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                {res.status === 'CHECKED_IN' && <div className="pulse-dot" />}
                                <span style={{ fontSize: '8px', opacity: 0.8 }}>
                                  {isHourlyRes ? 'Hourly' : `(${res.status})`}
                                </span>
                              </div>

                              {/* Advanced Hover Tooltip */}
                              <span className={`res-tooltip-text${tooltipAlignClass}`}>
                                <strong style={{ color: 'var(--primary)', fontSize: '12px' }}>{res.guestName}</strong>
                                <br />
                                <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
                                <span style={{ 
                                  color: res.status === 'CHECKED_IN' ? '#10b981' : res.status === 'PENDING' ? '#f59e0b' : '#a855f7',
                                  fontWeight: 700 
                                }}>{res.status}</span>
                                <br />
                                <span style={{ color: 'var(--text-muted)' }}>Dates:</span> {res.checkIn} to {res.checkOut}
                                <br />
                                <span style={{ color: 'var(--text-muted)' }}>Room:</span> Room {res.roomNumber} ({isHourlyRes ? 'Hourly' : 'Daily'})
                                <br />
                                <span style={{ color: 'var(--text-muted)' }}>Folio Amt:</span> ${res.amount?.toFixed(2)} (${parsedRate}/base)
                                {res.notes && (
                                  <>
                                    <br />
                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                      "{res.notes.split(' | ')[0]}"
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                    </div>
                  )
                })}
              </div>

            </div>
          </div>

          {/* Collapsible Unassigned Tray Sidebar */}
          {showUnassignedTray && (
            <div className="glass-card" style={{ padding: '20px', border: '1px solid var(--border-card)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Unassigned Queue</span>
                <span style={{ fontSize: '10px', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  {filteredReservations.filter(res => !res.roomId && res.status !== 'CANCELLED').length} Stays
                </span>
              </div>

              {allocatingResId && (
                <div style={{ fontSize: '11px', color: 'var(--primary)', background: 'rgba(0, 242, 254, 0.05)', padding: '8px', borderRadius: '6px', border: '1px dashed var(--primary)', animation: 'pulse 2s infinite' }}>
                  <strong>Allocation Mode Active:</strong> Click any empty date cell on the room grid to allocate this booking.
                  <button 
                    onClick={() => setAllocatingResId(null)}
                    style={{ display: 'block', marginTop: '6px', fontSize: '10px', background: 'transparent', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                  >
                    Cancel Placement
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                {filteredReservations.filter(res => !res.roomId && res.status !== 'CANCELLED').map(res => {
                  const isSelected = allocatingResId === res.id
                  const matchedRt = roomTypes.find(rt => rt.id === res.roomId || rt.id === parseMetaField(res.notes, 'CATEGORY_ID'))
                  return (
                    <div 
                      key={res.id}
                      data-testid={`unassigned-card-${res.id}`}
                      onClick={() => setAllocatingResId(isSelected ? null : res.id)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', res.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      style={{
                        padding: '12px',
                        background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-card)',
                        borderRadius: '8px',
                        cursor: 'grab',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{res.guestName}</span>
                        <span style={{ fontSize: '10px', color: 'var(--primary)' }}>{isSelected ? 'Cancel' : 'Select'}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Dates: {getDayLabel(res.checkIn)} - {getDayLabel(res.checkOut)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Category: {matchedRt ? matchedRt.name : 'Standard Room'}
                      </div>
                    </div>
                  )
                })}

                {filteredReservations.filter(res => !res.roomId && res.status !== 'CANCELLED').length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    All reservations have room numbers allocated.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Sheet Drawer for Guest Management */}
        {selectedRes && (
          <div 
            onClick={() => setSelectedRes(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              justifyContent: 'flex-end',
              zIndex: 1000
            }}
          >
            <style>{`
              @keyframes slideInRight {
                from {
                  transform: translateX(100%);
                }
                to {
                  transform: translateX(0);
                }
              }
              .slide-in-right-drawer {
                animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
            `}</style>
            <div 
              className="glass-card slide-in-right-drawer" 
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '480px',
                height: '100%',
                maxHeight: '100vh',
                overflowY: 'auto',
                padding: '32px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px 0 0 16px',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: '#070c19'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Guest Reservation Card</h3>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: selectedRes.status === 'CHECKED_IN' ? '#10b981' : selectedRes.status === 'PENDING' ? '#f59e0b' : '#a855f7', color: '#fff', fontWeight: 600 }}>
                  {selectedRes.status}
                </span>
              </div>

              {/* Guest Card Content */}
              {(() => {
                const emailVal = selectedRes.email || parseMetaField(selectedRes.notes, 'EMAIL')
                const phoneVal = selectedRes.phone || parseMetaField(selectedRes.notes, 'PHONE')
                const nationalityVal = selectedRes.nationality || parseMetaField(selectedRes.notes, 'NATIONALITY') || 'United States'
                const idTypeVal = selectedRes.idType || parseMetaField(selectedRes.notes, 'ID_TYPE') || 'PASSPORT'
                const idNumberVal = selectedRes.idNumber || parseMetaField(selectedRes.notes, 'ID_NUMBER') || 'CONTACTLESS_OCR'
                const dobVal = selectedRes.dob || parseMetaField(selectedRes.notes, 'DOB') || '1990-01-01'

                const rateValSelected = selectedRes.baseRate || parseFloat(parseMetaField(selectedRes.notes, 'RATE') || '150')
                const discountValSelected = selectedRes.discount || parseFloat(parseMetaField(selectedRes.notes, 'DISCOUNT') || '0')
                const taxValSelected = selectedRes.tax || parseFloat(parseMetaField(selectedRes.notes, 'TAX') || '18')
                const finalValSelected = selectedRes.amount || parseFloat(parseMetaField(selectedRes.notes, 'FINAL') || '168')

                const charges = selectedRes.charges || []
                const payments = selectedRes.payments || []
                const roomCharge = finalValSelected
                const totalCharges = roomCharge + charges.reduce((acc: number, c: ChargeItem) => acc + c.amount, 0)
                const totalPayments = payments.reduce((acc: number, p: PaymentItem) => acc + p.amount, 0)
                const balanceDue = totalCharges - totalPayments

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Banners for Verification */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1, padding: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 600 }}>
                        <span>✓ OCR ID VERIFIED</span>
                      </div>
                      <div style={{ flex: 1, padding: '6px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '6px', fontSize: '10px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 600 }}>
                        <span>✓ SIGNATURE COLLECTED</span>
                      </div>
                    </div>

                    {/* Guest General Profile */}
                    <div className="glass-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        <User style={{ width: '14px', height: '14px', color: 'var(--primary)' }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Guest Identity Profile</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{selectedRes.guestName}</div>
                      {emailVal && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <Mail size={12} /> <span>{emailVal}</span>
                        </div>
                      )}
                      {phoneVal && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <Phone size={12} /> <span>{phoneVal}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <Globe size={12} /> <span>{nationalityVal} ({idTypeVal}: {idNumberVal})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <Calendar size={12} /> <span>DOB: {dobVal}</span>
                      </div>
                    </div>

                    {/* Signature Preview */}
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Digital Signature (MAGICLINK REGISTRATION)</span>
                      <div style={{ fontFamily: 'cursive', fontSize: '18px', color: 'var(--primary)', letterSpacing: '1px', padding: '2px 0', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                        {selectedRes.guestName}
                      </div>
                    </div>

                    {/* Room Allocator & Dates Detail */}
                    <div className="glass-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      
                      {/* Room Swap Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Room (Quick Swap/Upgrade)</label>
                        <select 
                          value={selectedRes.roomId}
                          onChange={(e) => handleSwapRoom(selectedRes.id, e.target.value)}
                          className="input-field"
                          style={{ padding: '4px 8px', fontSize: '12px', background: '#0e1424', border: '1px solid var(--border-card)', cursor: 'pointer' }}
                        >
                          <option value={selectedRes.roomId}>Room {selectedRes.roomNumber} (Current)</option>
                          {rooms.filter(r => r.status === 'AVAILABLE' && r.id !== selectedRes.roomId).map(r => (
                            <option key={r.id} value={r.id}>Room {r.roomNumber} ({roomTypes.find(rt => rt.id === r.roomTypeId)?.name || 'Standard'})</option>
                          ))}
                        </select>
                      </div>

                      {/* Stay Dates Extension */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Stay Schedule</label>
                        {!isEditingDates ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{selectedRes.checkIn} to {selectedRes.checkOut}</span>
                            <button 
                              onClick={() => {
                                setEditCheckIn(selectedRes.checkIn)
                                setEditCheckOut(selectedRes.checkOut)
                                setIsEditingDates(true)
                              }}
                              style={{ fontSize: '10px', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                            >
                              Modify Dates
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input type="date" className="input-field" style={{ padding: '3px 6px', fontSize: '11px', width: '110px' }} value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)} />
                            <span style={{ fontSize: '11px' }}>to</span>
                            <input type="date" className="input-field" style={{ padding: '3px 6px', fontSize: '11px', width: '110px' }} value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)} />
                            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                              <button onClick={() => handleSaveEditedDates(selectedRes.id)} style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--primary)', color: '#060913', border: 'none', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                              <button onClick={() => setIsEditingDates(false)} style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-card)', fontSize: '10px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* IoT Access Card */}
                    <div className="glass-card" style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <KeyRound size={14} color="var(--primary)" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>IoT Door PIN Access</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>
                            *{selectedRes.roomNumber}*{selectedRes.id.slice(-4)}#
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '10px' }}>
                        <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Wi-Fi</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>Stayflexi_{selectedRes.roomNumber}</span>
                      </div>
                    </div>

                    {/* Interactive Folio Ledger Invoice Breakdown */}
                    <div className="glass-card" style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.02)', border: '1px solid rgba(0, 242, 254, 0.1)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#9ca3af' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 242, 254, 0.15)', paddingBottom: '4px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CreditCard style={{ width: '14px', height: '14px', color: 'var(--primary)' }} />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Financial Ledger invoice</span>
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: balanceDue <= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: balanceDue <= 0 ? '#10b981' : '#ef4444' }}>
                          {balanceDue <= 0 ? 'FOLIO SETTLED' : `BALANCE DUE: $${balanceDue.toFixed(2)}`}
                        </span>
                      </div>

                      {/* Line Items List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto', paddingRight: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Base Room Charge (incl. tax/disc):</span>
                          <span style={{ color: '#fff' }}>${roomCharge.toFixed(2)}</span>
                        </div>
                        {charges.map((c: ChargeItem, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>• {c.name}:</span>
                              <button 
                                onClick={() => handleRemoveIncidental(selectedRes.id, idx)}
                                style={{ fontSize: '9px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                              >
                                remove
                              </button>
                            </span>
                            <span style={{ color: '#fff' }}>+${c.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        {payments.map((p: PaymentItem, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                            <span>• Settle Payment ({p.method}):</span>
                            <span>-${p.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                        <span style={{ color: '#fff' }}>Total Folio Charges:</span>
                        <span style={{ color: '#fff' }}>${totalCharges.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
                        <span>Total Payments Made:</span>
                        <span>-${totalPayments.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: balanceDue <= 0.01 ? '#10b981' : '#ef4444', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                        <span>Folio Net Balance (Due):</span>
                        <span>${balanceDue.toFixed(2)}</span>
                      </div>

                      {/* Inline forms for charges & payments */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {balanceDue > 0.01 && (
                          <button 
                            onClick={() => handleClearOutstandingDue(selectedRes.id, balanceDue)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid #10b981',
                              color: '#10b981',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              marginBottom: '6px',
                              boxShadow: '0 0 10px rgba(16, 185, 129, 0.1)',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#060913'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; e.currentTarget.style.color = '#10b981'; }}
                          >
                            Clear Remaining Due (${balanceDue.toFixed(2)})
                          </button>
                        )}
                        {/* Form 1: Add Charge */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input type="text" className="input-field" style={{ padding: '3px 6px', fontSize: '11px', flex: 2, height: '24px' }} placeholder="Incidental description" value={incidentalName} onChange={e => setIncidentalName(e.target.value)} />
                          <input type="number" className="input-field" style={{ padding: '3px 6px', fontSize: '11px', flex: 1, height: '24px' }} placeholder="Price" value={incidentalAmount} onChange={e => setIncidentalAmount(e.target.value)} />
                          <button onClick={() => handleAddIncidental(selectedRes.id)} style={{ padding: '0 8px', height: '24px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.3)', color: 'var(--primary)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>+ Charge</button>
                        </div>
                        {/* Form 2: Post Payment */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <select className="input-field" style={{ padding: '3px 6px', fontSize: '11px', flex: 1, height: '24px', background: '#0e1424' }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                            <option value="ONLINE">Online Stripe</option>
                          </select>
                          <input type="number" className="input-field" style={{ padding: '3px 6px', fontSize: '11px', flex: 1, height: '24px' }} placeholder="Amount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                          <button onClick={() => handlePostPayment(selectedRes.id)} style={{ padding: '0 8px', height: '24px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>Post Pay</button>
                        </div>
                      </div>
                    </div>

                    {/* Staff Notes */}
                    {selectedRes.notes && (
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <ClipboardList size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ fontStyle: 'italic' }}>"{selectedRes.notes.split(' | ')[0]}"</span>
                      </div>
                    )}

                    {/* Action Buttons Matrix */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                      {selectedRes.status === 'PENDING' && (
                        <button 
                          onClick={() => processCheckIn(selectedRes)}
                          style={{
                            padding: '10px',
                            borderRadius: '6px',
                            background: 'var(--status-available)',
                            color: '#060913',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Check In Guest (Set Occupied)
                        </button>
                      )}

                      {selectedRes.status === 'CHECKED_IN' && (
                        <button 
                          onClick={() => {
                            if (balanceDue > 0.01) {
                              alert(`Outstanding Balance Due: $${balanceDue.toFixed(2)}. Please clear the due balance to check out the guest.`)
                              return
                            }
                            processCheckOut(selectedRes)
                          }}
                          disabled={balanceDue > 0.01}
                          style={{
                            padding: '10px',
                            borderRadius: '6px',
                            background: balanceDue > 0.01 ? 'rgba(255, 255, 255, 0.05)' : 'var(--primary)',
                            color: balanceDue > 0.01 ? 'var(--text-muted)' : '#060913',
                            fontWeight: 700,
                            border: 'none',
                            cursor: balanceDue > 0.01 ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            boxShadow: balanceDue > 0.01 ? 'none' : '0 0 10px rgba(0, 242, 254, 0.25)',
                            transition: 'all 0.2s'
                          }}
                          title={balanceDue > 0.01 ? 'Settle all outstanding balances to check out' : 'Check out guest'}
                        >
                          {balanceDue > 0.01 ? `Check Out Locked ($${balanceDue.toFixed(2)} Due)` : 'Check Out Guest (Trigger Housekeeping)'}
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          const guestLink = `${window.location.origin}/guest/${selectedRes.id}`
                          navigator.clipboard.writeText(guestLink)
                          alert(`MagicLink copied to clipboard!\nShare with guest: ${guestLink}`)
                        }}
                        style={{
                          padding: '10px',
                          borderRadius: '6px',
                          background: 'rgba(0, 242, 254, 0.1)',
                          border: '1px solid rgba(0, 242, 254, 0.3)',
                          color: '#00f2fe',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}
                      >
                        <PlusCircle style={{ width: '14px', height: '14px' }} />
                        <span>Copy Contactless MagicLink</span>
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {selectedRes.status === 'PENDING' && (
                          <button 
                            onClick={() => cancelReservation(selectedRes)}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Cancel Booking
                          </button>
                        )}
                        <button 
                          onClick={() => setSelectedRes(null)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-card)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Close Sheet
                        </button>
                      </div>
                    </div>

                  </div>
                )
              })()}

            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  )
}
