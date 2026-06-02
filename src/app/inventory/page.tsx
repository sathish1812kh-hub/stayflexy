'use client'

import React, { useState, useEffect } from 'react'
import DashboardShell from '../components/DashboardShell'
import dataClient, { RoomType, Room } from '../dataClient'
import { 
  Calendar, Layers, ShieldAlert, Trash, RefreshCw, Check, ArrowRight, Ban, Unlock,
  User, Bed, Clock, ClipboardList, CheckSquare, PlusCircle, Mail, Phone, Globe, CreditCard, Percent, FileText, Sparkles
} from 'lucide-react'

interface CalendarDay {
  date: string
  roomTypeId: string
  totalCapacity: number
  availableCount: number
  reservedCount: number
  blockedCount: number
  basePrice: number
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
}

const parseMetaField = (notes: string, key: string): string => {
  const match = notes?.match(new RegExp(`${key}:([^|]+)`))
  return match ? match[1]!.trim() : ''
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

export default function InventoryRatesPage() {
  const [activeSubTab, setActiveSubTab] = useState<'rates' | 'bookings'>('rates')
  const [calendar, setCalendar] = useState<CalendarDay[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [hotelId, setHotelId] = useState('')
  const [loading, setLoading] = useState(true)

  // Block Form State
  const [blockRoomTypeId, setBlockRoomTypeId] = useState('')
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formError, setFormError] = useState('')

  // Unblock Form State
  const [unblockRoomTypeId, setUnblockRoomTypeId] = useState('')
  const [unblockStart, setUnblockStart] = useState('')
  const [unblockEnd, setUnblockEnd] = useState('')

  // Bookings Gantt States
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)
  
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

  // Generate 7-day schedule range starting today
  const todayStr = new Date().toISOString().split('T')[0] || ''
  const endDateObj = new Date()
  endDateObj.setDate(endDateObj.getDate() + 6)
  const endStr = endDateObj.toISOString().split('T')[0] || ''

  const getTimelineDays = () => {
    const days = []
    const temp = new Date()
    for (let i = 0; i < 7; i++) {
      days.push(temp.toISOString().split('T')[0] || '')
      temp.setDate(temp.getDate() + 1)
    }
    return days
  }

  const timelineDays = getTimelineDays()

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return {
      day: weekdays[d.getDay()] || '',
      date: `${months[d.getMonth()]} ${d.getDate()}`
    }
  }

  // Generate 14-day timeline range for bookings tab
  const timelineDaysBookings = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(2026, 4, 20 + i) // May 20th onwards
    return d.toISOString().split('T')[0] || ''
  })

  const getDayLabelBookings = (dateStr: string) => {
    const parts = dateStr.split('-')
    const day = parts[2] || ''
    return `May ${day}`
  }

  async function loadData() {
    setLoading(true)
    setFormSuccess('')
    setFormError('')
    
    const activeHotelId = typeof window !== 'undefined' ? localStorage.getItem('sf_selected_hotel') || 'h1-resort-goa' : 'h1-resort-goa'
    setHotelId(activeHotelId)

    const rts = await dataClient.getRoomTypes()
    const activeRts = rts.filter(rt => rt.hotelId === activeHotelId)
    setRoomTypes(activeRts)

    const rms = await dataClient.getRooms()
    const physicalRooms = rms.filter(rm => rm.hotelId === activeHotelId)
    setRooms(physicalRooms)

    if (activeRts.length > 0 && activeRts[0]) {
      setBlockRoomTypeId(activeRts[0].id)
      setUnblockRoomTypeId(activeRts[0].id)
    }

    // Load dynamic calendar logs
    const calendarLogs = await dataClient.getAvailabilityCalendar(activeHotelId, todayStr, endStr)
    setCalendar(calendarLogs)

    // Load bookings
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

    setLoading(false)
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
    setBlockStart(todayStr)
    setBlockEnd(todayStr)
    setUnblockStart(todayStr)
    setUnblockEnd(todayStr)

    const current = new Date()
    setCheckIn(current.toISOString().split('T')[0] || '')
    const checkoutDate = new Date()
    checkoutDate.setDate(checkoutDate.getDate() + 3)
    setCheckOut(checkoutDate.toISOString().split('T')[0] || '')
  }, [])

  useEffect(() => {
    const handleReload = () => {
      loadData()
    }
    window.addEventListener('sf-reload-inventory', handleReload)
    return () => {
      window.removeEventListener('sf-reload-inventory', handleReload)
    }
  }, [])

  const handleBlockInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blockRoomTypeId || !blockStart || !blockEnd) return

    setLoading(true)
    const res = await dataClient.blockInventory(hotelId, blockRoomTypeId, blockStart, blockEnd, blockReason)
    if (res?.success) {
      setFormSuccess(res.message || 'Inventory blocked successfully!')
      setBlockReason('')
      await loadData()
    } else {
      setFormError('Failed to commit inventory block transaction.')
    }
    setLoading(false)
  }

  const handleUnblockInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unblockRoomTypeId || !unblockStart || !unblockEnd) return

    setLoading(true)
    const res = await dataClient.unblockInventory(hotelId, unblockRoomTypeId, unblockStart, unblockEnd)
    if (res?.success) {
      setFormSuccess(res.message || 'Inventory released successfully!')
      await loadData()
    } else {
      setFormError('Failed to release inventory block.')
    }
    setLoading(false)
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
  const subtotalAmount = rateValue * (isHourly ? 1 : stayDuration)
  const discountValue = parseFloat(discount) || 0
  const discountedSubtotal = Math.max(0, subtotalAmount - discountValue)
  const taxValue = discountedSubtotal * 0.12
  const finalLedgerTotal = discountedSubtotal + taxValue

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestFirstName || !guestLastName || !roomId) return

    const targetRoom = rooms.find(r => r.id === roomId)
    if (!targetRoom) return

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

    const activeHotelId = typeof window !== 'undefined' ? localStorage.getItem('sf_selected_hotel') || 'h1-resort-goa' : 'h1-resort-goa'
    const combinedGuestName = `${guestFirstName} ${guestLastName}`

    // Metadata payload packing
    const metadataStr = `FIRST_NAME:${guestFirstName} | LAST_NAME:${guestLastName} | EMAIL:${email} | PHONE:${phone} | NATIONALITY:${nationality} | ID_TYPE:${idType} | ID_NUMBER:${idNumber} | DOB:${dob} | RATE:${rateValue.toFixed(2)} | DISCOUNT:${discountValue.toFixed(2)} | TAX:${taxValue.toFixed(2)} | FINAL:${finalLedgerTotal.toFixed(2)}`
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
        roomTypeId: targetRoom.roomTypeId,
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
        roomTypeId: targetRoom.roomTypeId,
        roomId: targetRoom.id,
        checkIn,
        checkOut,
        baseRate: rateValue,
        discount: discountValue,
        notes: combinedNotes
      })
    }

    if (newRes) {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sf_reservations')
        if (saved) {
          const list = JSON.parse(saved) as Reservation[]
          const matchIndex = list.findIndex(r => r.id === newRes.id || r.guestName === combinedGuestName)
          if (matchIndex !== -1 && list[matchIndex]) {
            list[matchIndex] = {
              ...list[matchIndex]!,
              roomId: targetRoom.id,
              roomNumber: targetRoom.roomNumber,
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
              notes: combinedNotes
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
      setNotes('')
      setShowAddForm(false)
    }
  }

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

  return (
    <DashboardShell
      activeTab="rooms" // Using rooms tab context
      title="Live Calendar & Rates"
      subtitle="Federated inventory matrices, base pricing models, and physical room block managers"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Indicators Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(0, 242, 254, 0.1)', padding: '12px', borderRadius: '8px', color: 'var(--primary)' }}>
              <Layers style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lodging Categories</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{roomTypes.length} Active</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', color: '#10b981' }}>
              <Check style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Physical Rooms</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{rooms.length} Units</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', color: '#ef4444' }}>
              <ShieldAlert style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Composed Endpoint</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginTop: '4px' }}>inventory-service:3004</div>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-card)', paddingBottom: '1px', gap: '24px', marginBottom: '8px' }}>
          <button
            onClick={() => setActiveSubTab('rates')}
            style={{
              padding: '10px 4px',
              background: 'none',
              border: 'none',
              borderBottom: activeSubTab === 'rates' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeSubTab === 'rates' ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Live Calendar & Rates
          </button>
          <button
            onClick={() => setActiveSubTab('bookings')}
            style={{
              padding: '10px 4px',
              background: 'none',
              border: 'none',
              borderBottom: activeSubTab === 'bookings' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeSubTab === 'bookings' ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              outline: 'none'
            }}
          >
            <Calendar size={14} />
            <span>Inventory Bookings Gantt</span>
          </button>
        </div>

        {activeSubTab === 'rates' ? (
          <>
            {/* Live Matrix Calendar */}
            <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600 }}>7-Day Occupancy & Base Pricing</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dynamically queried allocations with local cache resilience fallbacks</p>
                </div>
                
                <button 
                  onClick={loadData}
                  disabled={loading}
                  className="btn-primary" 
                  style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', fontSize: '12px' }}
                >
                  <RefreshCw style={{ width: '13px', height: '13px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Refresh Matrix</span>
                </button>
              </div>

              <div style={{ minWidth: '900px' }}>
                {/* Timeline Day Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '220px repeat(7, 1fr)', borderBottom: '1px solid var(--border-card)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Lodging Category</div>
                  {timelineDays.map(day => {
                    const label = getDayLabel(day)
                    return (
                      <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700 }}>{label.day}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label.date}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Matrix Data Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {roomTypes.map(rt => {
                    return (
                      <div key={rt.id} style={{ display: 'grid', gridTemplateColumns: '220px repeat(7, 1fr)', alignItems: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', padding: '8px 0' }}>
                        
                        {/* Left label details */}
                        <div style={{ paddingRight: '16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>{rt.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '2px' }}>Base price: ${rt.basePrice}/nt</div>
                        </div>

                        {/* Mapped Timeline Cells */}
                        {timelineDays.map(day => {
                          const dayLog = calendar.find(c => c.date === day && c.roomTypeId === rt.id)
                          
                          const capacity = dayLog?.totalCapacity || 5
                          const available = dayLog?.availableCount !== undefined ? dayLog.availableCount : 5
                          const reserved = dayLog?.reservedCount || 0
                          const blocked = dayLog?.blockedCount || 0
                          const rate = dayLog?.basePrice || rt.basePrice

                          const occPercentage = Math.round(((capacity - available) / capacity) * 100)

                          // Determine colors based on availability
                          let availableColor = '#10b981'
                          if (available === 0) availableColor = '#ef4444'
                          else if (available <= 2) availableColor = '#f59e0b'

                          return (
                            <div 
                              key={day} 
                              style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border-card)',
                                borderRadius: '6px',
                                margin: '0 4px',
                                padding: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s',
                              }}
                            >
                              <div style={{ fontSize: '13px', fontWeight: 700, color: availableColor }}>
                                {available} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>/ {capacity}</span>
                              </div>
                              
                              {/* Mini visual indicator bar */}
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${occPercentage}%`, height: '100%', background: availableColor }} />
                              </div>

                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                ${rate}
                              </div>

                              {blocked > 0 && (
                                <span style={{ fontSize: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
                                  {blocked} BLOCKED
                                </span>
                              )}
                            </div>
                          )
                        })}

                      </div>
                    )
                  })}
                </div>

              </div>
            </div>

            {/* Success/Error Alerts */}
            {formSuccess && (
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <Check style={{ width: '16px', height: '16px' }} />
                <span>{formSuccess}</span>
              </div>
            )}
            {formError && (
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <Ban style={{ width: '16px', height: '16px' }} />
                <span>{formError}</span>
              </div>
            )}

            {/* Bottom Transaction Actions Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Block Inventory Action Card */}
              <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Ban style={{ width: '18px', height: '18px', color: '#ef4444' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Block Room Inventory</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Temporarily freeze allotments for maintenance, online channels, or special holds</p>

                <form onSubmit={handleBlockInventory} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Room Category</label>
                    <select 
                      className="input-field" 
                      value={blockRoomTypeId} 
                      onChange={e => setBlockRoomTypeId(e.target.value)}
                      style={{ background: '#0e1424', outline: 'none' }}
                    >
                      {roomTypes.map(rt => (
                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Start Date</label>
                      <input type="date" className="input-field" value={blockStart} onChange={e => setBlockStart(e.target.value)} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>End Date</label>
                      <input type="date" className="input-field" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} required />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reason / Notes</label>
                    <input type="text" className="input-field" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. AC Filter maintenance hold" />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn-primary" 
                    style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px', fontWeight: 600, cursor: 'pointer', marginTop: '10px', fontSize: '13px' }}
                  >
                    {loading ? 'Processing Transaction...' : 'Commit Inventory Block'}
                  </button>
                </form>
              </div>

              {/* Release / Unblock Action Card */}
              <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Unlock style={{ width: '18px', height: '18px', color: '#10b981' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Release Room Blocks</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Instantly release active blocks, restoring units back to the live public calendar</p>

                <form onSubmit={handleUnblockInventory} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Room Category</label>
                    <select 
                      className="input-field" 
                      value={unblockRoomTypeId} 
                      onChange={e => setUnblockRoomTypeId(e.target.value)}
                      style={{ background: '#0e1424', outline: 'none' }}
                    >
                      {roomTypes.map(rt => (
                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Start Date</label>
                      <input type="date" className="input-field" value={unblockStart} onChange={e => setUnblockStart(e.target.value)} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>End Date</label>
                      <input type="date" className="input-field" value={unblockEnd} onChange={e => setUnblockEnd(e.target.value)} required />
                    </div>
                  </div>

                  <div style={{ height: '58px' }} /> {/* Spacer matching reason block height */}

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn-primary" 
                    style={{ background: '#10b981', color: '#060913', border: 'none', padding: '10px', fontWeight: 600, cursor: 'pointer', marginTop: '10px', fontSize: '13px' }}
                  >
                    {loading ? 'Processing Transaction...' : 'Release Active Allotments'}
                  </button>
                </form>
              </div>

            </div>
          </>
        ) : (
          <>
            {/* Bookings Gantt view - Copied attributes & properties of http://localhost:3000/bookings but advanced! */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Active Reservation Timelines</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Visualize occupancy overlaps and process arrival schedules</p>
              </div>
              
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

            {/* Add Reservation Wizard Form */}
            {showAddForm && (
              <div className="glass-card" style={{ padding: '28px', border: '1px solid rgba(0, 242, 254, 0.25)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Sparkles size={16} color="var(--primary)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Advanced Booking Creation Wizard</h3>
                </div>
                
                <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Step 1: Detailed Guest Profiles */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '12px' }}>
                      1. Guest Registration Profile
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
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
                          placeholder="e.g. +1 555-0199"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Nationality</label>
                        <select 
                          value={nationality} onChange={e => setNationality(e.target.value)}
                          style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                        >
                          <option value="United States">United States</option>
                          <option value="India">India</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Canada">Canada</option>
                          <option value="Germany">Germany</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>ID Type</label>
                        <select 
                          value={idType} onChange={e => setIdType(e.target.value)}
                          style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                        >
                          <option value="PASSPORT">Passport</option>
                          <option value="NATIONAL_ID">National ID</option>
                          <option value="DRIVERS_LICENSE">Driver's License</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>ID Document Number</label>
                        <input 
                          type="text" required value={idNumber} onChange={e => setIdNumber(e.target.value)}
                          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                          placeholder="ID Number"
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

                  {/* Step 2: Supergraph Resource Placement */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '12px', marginTop: '4px' }}>
                      2. Supergraph Resource Placement
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Assign Room</label>
                        <select 
                          required value={roomId} onChange={e => setRoomId(e.target.value)}
                          style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                        >
                          <option value="">-- Choose Room --</option>
                          {rooms.map(r => (
                            <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.roomTypeId.replace('rt-', '').toUpperCase()})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Check-In Date</label>
                        <input 
                          type="date" required value={checkIn} onChange={e => setCheckIn(e.target.value)}
                          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Check-Out Date</label>
                        <input 
                          type="date" required disabled={isHourly} value={checkOut} onChange={e => setCheckOut(e.target.value)}
                          style={{ padding: '8px 12px', background: isHourly ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: isHourly ? '#666' : '#fff', fontSize: '12px', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Special Requests</label>
                        <input 
                          type="text" value={notes} onChange={e => setNotes(e.target.value)}
                          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                          placeholder="e.g. Feather pillows, late arrival"
                        />
                      </div>
                    </div>

                    {/* Hourly toggle settings */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" checked={isHourly} onChange={e => setIsHourly(e.target.checked)}
                          style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }}
                        />
                        <span>Enable Hourly Stay Allotment (Micro-stays / Dayuse)</span>
                      </label>
                      
                      {isHourly && (
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Start Hour</span>
                            <input 
                              type="time" value={checkInHour} onChange={e => setCheckInHour(e.target.value)}
                              style={{ padding: '4px 8px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Duration</span>
                            <select 
                              value={durationHours} onChange={e => setDurationHours(e.target.value)}
                              style={{ padding: '4px 8px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
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

                  {/* Step 3: Ledger Pricing Override */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '12px', marginTop: '4px' }}>
                      3. Ledger Pricing Override
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Base Nightly/Hourly Rate ($)</label>
                        <input 
                          type="number" required value={baseRate} onChange={e => setBaseRate(e.target.value)}
                          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Custom Discount Flat ($)</label>
                        <input 
                          type="number" required value={discount} onChange={e => setDiscount(e.target.value)}
                          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Folio Ledger invoice preview */}
                  <div style={{ background: 'rgba(0, 242, 254, 0.02)', border: '1px solid rgba(0, 242, 254, 0.15)', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--primary)', fontWeight: 600, fontSize: '12px' }}>
                      <CreditCard size={14} />
                      <span>Live Booking Ledger Summary</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', fontSize: '11px', color: '#cbd5e1' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Units Count/Stay:</span>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                          {stayDuration} {isHourly ? 'Hours' : 'Nights'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Base Price Subtotal:</span>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                          ${subtotalAmount.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Ledger Discount Override:</span>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
                          -${discountValue.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Dynamic Supergraph Tax (12%):</span>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                          +${taxValue.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--primary)' }}>Final Folio Balance Due:</span>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                          ${finalLedgerTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowAddForm(false)}
                      style={{
                        padding: '10px 24px', borderRadius: '6px', background: 'none', color: '#fff',
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

            {/* Visual Gantt Timeline Matrix */}
            <div className="glass-card" style={{ padding: '24px', overflowX: 'auto', border: '1px solid var(--border-card)' }}>
              <div style={{ minWidth: '1000px' }}>
                {/* Timeline Header Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(14, 1fr)', borderBottom: '1px solid var(--border-card)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Physical Room</div>
                  {timelineDaysBookings.map(day => (
                    <div key={day} style={{ fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {getDayLabelBookings(day)}
                    </div>
                  ))}
                </div>

                {/* Timeline Rooms Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {rooms.map((room, roomIdx) => {
                    const roomRes = reservations.filter(res => res.roomId === room.id && res.status !== 'CANCELLED')
                    
                    return (
                      <div key={room.id} style={{ display: 'grid', gridTemplateColumns: '120px repeat(14, 1fr)', alignItems: 'center', height: '36px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                        
                        {/* Room Identifier */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                          <Bed style={{ width: '13px', height: '13px', color: 'var(--primary)' }} />
                          <span>{room.roomNumber}</span>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: room.status === 'AVAILABLE' ? '#10b981' : room.status === 'OCCUPIED' ? '#ef4444' : '#a855f7' }} />
                        </div>

                        {/* Timeline linear block mapping */}
                        <div style={{ gridColumn: '2 / span 14', position: 'relative', height: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          {roomRes.map(res => {
                            const startIndex = timelineDaysBookings.indexOf(res.checkIn)
                            const endIndex = timelineDaysBookings.indexOf(res.checkOut)
                            
                            if (startIndex === -1 && endIndex === -1) return null
                            
                            const actualStart = startIndex === -1 ? 0 : startIndex
                            const actualEnd = endIndex === -1 ? 14 : endIndex
                            const span = Math.max(1, actualEnd - actualStart)
                            
                            const totalCols = 14
                            let tooltipAlignClass = ""
                            if (actualStart < 2) {
                              tooltipAlignClass += " align-left"
                            } else if (actualStart + span > totalCols - 2) {
                              tooltipAlignClass += " align-right"
                            }
                            if (roomIdx === 0) {
                              tooltipAlignClass += " align-bottom"
                            }

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
                                onClick={() => setSelectedRes(res)}
                                className={`reservation-block ${statusClass} res-tooltip`}
                                style={{
                                  left: `${(actualStart / 14) * 100}%`,
                                  width: `${(span / 14) * 100}%`,
                                  height: '100%'
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
          </>
        )}

      </div>

      {/* Modal Action Sheet Drawer for Guest Management */}
      {selectedRes && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Guest Reservation Sheet</h3>
              <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: selectedRes.status === 'CHECKED_IN' ? '#10b981' : '#f59e0b', color: '#fff', fontWeight: 600 }}>
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

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  
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

                  {/* Room & Timeline Detail */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="glass-card" style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Room</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Bed size={13} color="var(--primary)" /> Room {selectedRes.roomNumber}
                      </div>
                    </div>
                    <div className="glass-card" style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Stay Schedule</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} color="var(--primary)" /> {selectedRes.checkIn} to {selectedRes.checkOut}
                      </div>
                    </div>
                  </div>

                  {/* Financial Ledger Invoice Breakdown */}
                  <div className="glass-card" style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.02)', border: '1px solid rgba(0, 242, 254, 0.1)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#9ca3af' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0, 242, 254, 0.15)', paddingBottom: '4px', marginBottom: '4px' }}>
                      <CreditCard style={{ width: '14px', height: '14px', color: 'var(--primary)' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Financial Ledger invoice</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Base Night/Hour Rate:</span>
                      <span style={{ color: '#fff' }}>${rateValSelected.toFixed(2)}</span>
                    </div>
                    {discountValSelected > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                        <span>Flat Discount Applied:</span>
                        <span>-${discountValSelected.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Standard Taxes (12%):</span>
                      <span style={{ color: '#fff' }}>+${taxValSelected.toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                      <span>Folio Balance Total:</span>
                      <span>${finalValSelected.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Staff Notes */}
                  {selectedRes.notes && (
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <ClipboardList size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span style={{ fontStyle: 'italic' }}>"{selectedRes.notes.split(' | ')[0]}"</span>
                    </div>
                  )}

                </div>
              )
            })()}

            {/* Action Buttons Matrix */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    fontSize: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  Confirm Physical Check-In
                </button>
              )}
              
              {selectedRes.status === 'CHECKED_IN' && (
                <button 
                  onClick={() => processCheckOut(selectedRes)}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    background: '#a855f7',
                    color: '#fff',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  Complete Folio Check-Out
                </button>
              )}

              {selectedRes.status !== 'CANCELLED' && selectedRes.status !== 'CHECKED_OUT' && (
                <button 
                  onClick={() => cancelReservation(selectedRes)}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancel Booking
                </button>
              )}

              <button 
                onClick={() => setSelectedRes(null)}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-card)',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Close Drawer Panel
              </button>
            </div>

          </div>
        </div>
      )}
    </DashboardShell>
  )
}
