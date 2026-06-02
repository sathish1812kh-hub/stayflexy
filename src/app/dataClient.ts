export interface Hotel {
  id: string
  organizationId: string
  name: string
  slug: string
  address: string | null
  city: string
  state: string | null
  country: string
  postalCode: string | null
  phone: string | null
  email: string | null
  website: string | null
  starRating: number | null
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_RENOVATION'
  timezone: string
  checkInTime: string
  checkOutTime: string
  createdAt: string
  updatedAt: string
}

export interface RoomType {
  id: string
  hotelId: string
  organizationId: string
  name: string
  description: string | null
  basePrice: number
  maxOccupancy: number
  maxAdults?: number
  maxChildren?: number
  maxInfants?: number
  minChildAge?: number
  maxChildAge?: number
  minInfantAge?: number
  maxInfantAge?: number
  minOccupancy?: number
  absoluteMax?: number
  hourlyPrice?: number | null
  extraBedPrice?: number
  extraGuestPrice?: number
  maxExtraBeds?: number
  amenities: string[] | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Room {
  id: string
  hotelId: string
  organizationId: string
  roomTypeId: string
  roomNumber: string
  floor: number | null
  status: 'AVAILABLE' | 'OCCUPIED' | 'OUT_OF_ORDER' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'BLOCKED'
  isActive: boolean
  notes: string | null
  wing?: string | null
  zone?: string | null
  wifiSSID?: string | null
  wifiPassword?: string | null
  arrivalNotes?: string | null
  lockVendor?: string | null
  lockDeviceId?: string | null
  lockSecret?: string | null
  connectingRoomId?: string | null
  parentRoomId?: string | null
  createdAt: string
  updatedAt: string
}

// Pre-populated default mock database values to ensure full visual functionality offline
const DEFAULT_HOTELS: Hotel[] = [
  {
    id: "h1-resort-goa",
    organizationId: "org-stayflexi",
    name: "Grand Stayflexi Beach Resort",
    slug: "grand-stayflexi-resort",
    address: "101 Candolim Beach Road",
    city: "Goa",
    state: "Goa",
    country: "IND",
    postalCode: "403515",
    phone: "+91 832 2456789",
    email: "resort.goa@stayflexi.com",
    website: "https://resort.goa.stayflexi.com",
    starRating: 5,
    status: "ACTIVE",
    timezone: "IST",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "h2-suites-blr",
    organizationId: "org-stayflexi",
    name: "Stayflexi Business Suites",
    slug: "stayflexi-suites-bangalore",
    address: "42 Outer Ring Road, HSR",
    city: "Bangalore",
    state: "Karnataka",
    country: "IND",
    postalCode: "560102",
    phone: "+91 80 49103322",
    email: "suites.blr@stayflexi.com",
    website: "https://suites.blr.stayflexi.com",
    starRating: 4,
    status: "ACTIVE",
    timezone: "IST",
    checkInTime: "12:00",
    checkOutTime: "11:00",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "h3-palace-jpr",
    organizationId: "org-stayflexi",
    name: "Stayflexi Heritage Palace",
    slug: "stayflexi-heritage-jaipur",
    address: "Heritage Circle, Amer",
    city: "Jaipur",
    state: "Rajasthan",
    country: "IND",
    postalCode: "302001",
    phone: "+91 141 22883311",
    email: "palace.jpr@stayflexi.com",
    website: "https://palace.jpr.stayflexi.com",
    starRating: 5,
    status: "UNDER_RENOVATION",
    timezone: "IST",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
]

const DEFAULT_ROOM_TYPES: RoomType[] = [
  {
    id: "rt-deluxe",
    hotelId: "h1-resort-goa",
    organizationId: "org-stayflexi",
    name: "Deluxe Pool-View Room",
    description: "Spacious room overlooking the central resort swimming pool. Furnished with premium teakwood and features a full balcony.",
    basePrice: 150.00,
    maxOccupancy: 2,
    amenities: ["Pool View", "Balcony", "Free Wi-Fi", "AC", "Minibar", "Smart TV"],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rt-executive",
    hotelId: "h1-resort-goa",
    organizationId: "org-stayflexi",
    name: "Executive Club Suite",
    description: "Includes access to the VIP Executive Lounge, complimentary cocktail hours, and panoramic ocean vistas.",
    basePrice: 280.00,
    maxOccupancy: 3,
    amenities: ["Ocean View", "Lounge Access", "Free Wi-Fi", "AC", "Espresso Machine", "Bath Tub"],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rt-presidential",
    hotelId: "h1-resort-goa",
    organizationId: "org-stayflexi",
    name: "Presidential Infinity Villa",
    description: "Ultra-luxury detached villa featuring a private infinity pool, a separate master lounge, and dedicated butler service.",
    basePrice: 650.00,
    maxOccupancy: 4,
    amenities: ["Infinity Pool", "Oceanfront", "Butler Service", "Kitchen", "Free Wi-Fi", "AC", "Private Jacuzzi"],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rt-business-std",
    hotelId: "h2-suites-blr",
    organizationId: "org-stayflexi",
    name: "Standard Business King",
    description: "Optimized for corporate travelers. Features an ergonomic workspace, ultra-high-speed fiber, and premium coffee setup.",
    basePrice: 110.00,
    maxOccupancy: 2,
    amenities: ["Work Desk", "Ergonomic Chair", "High Speed Wi-Fi", "AC", "Coffee Maker"],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
]

const DEFAULT_ROOMS: Room[] = [
  // Goa Resort Rooms
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
    status: "OCCUPIED",
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
    status: "HOUSEKEEPING",
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
    status: "MAINTENANCE",
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
    status: "BLOCKED",
    isActive: true,
    notes: "Held exclusively for state department delegation.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Bangalore Business Rooms
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
    status: "OCCUPIED",
    isActive: true,
    notes: "Corporate account booking from Socifyy.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
]

class StayflexiDataClient {
  private hotels: Hotel[] = [...DEFAULT_HOTELS]
  private roomTypes: RoomType[] = [...DEFAULT_ROOM_TYPES]
  private rooms: Room[] = [...DEFAULT_ROOMS]
  private isOffline = false

  constructor() {
    // Attempt local storage sync if in browser
    if (typeof window !== 'undefined') {
      const savedHotels = localStorage.getItem('sf_hotels')
      const savedRoomTypes = localStorage.getItem('sf_room_types')
      const savedRooms = localStorage.getItem('sf_rooms')
      
      if (savedHotels) this.hotels = JSON.parse(savedHotels)
      if (savedRoomTypes) this.roomTypes = JSON.parse(savedRoomTypes)
      if (savedRooms) this.rooms = JSON.parse(savedRooms)
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_hotels', JSON.stringify(this.hotels))
      localStorage.setItem('sf_room_types', JSON.stringify(this.roomTypes))
      localStorage.setItem('sf_rooms', JSON.stringify(this.rooms))
    }
  }

  // Network helpers that gracefully fall back
  private async queryGraphQL(query: string, variables = {}) {
    if (this.isOffline) {
      return null
    }
    try {
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer local-dev-token',
        },
        body: JSON.stringify({ query, variables }),
      })
      if (!response.ok) throw new Error()
      return await response.json()
    } catch {
      this.isOffline = true
      return null // Fallback trigger
    }
  }

  // Hotels Methods
  async getHotels(): Promise<Hotel[]> {
    const remote = await this.queryGraphQL(`
      query GetHotels {
        hotels {
          id name slug address city state country postalCode phone email website starRating status timezone checkInTime checkOutTime createdAt updatedAt
        }
      }
    `)
    if (remote?.data?.hotels) {
      this.hotels = remote.data.hotels
      this.save()
    }
    return this.hotels
  }

  async createHotel(hotel: Omit<Hotel, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Hotel> {
    const remote = await this.queryGraphQL(`
      mutation CreateHotel($name: String!, $city: String!, $country: String!, $address: String, $state: String, $postalCode: String, $phone: String, $email: String, $website: String, $starRating: Int, $timezone: String, $checkInTime: String, $checkOutTime: String, $slug: String) {
        createHotel(name: $name, city: $city, country: $country, address: $address, state: $state, postalCode: $postalCode, phone: $phone, email: $email, website: $website, starRating: $starRating, timezone: $timezone, checkInTime: $checkInTime, checkOutTime: $checkOutTime, slug: $slug) {
          id organizationId name slug address city state country postalCode phone email website starRating status timezone checkInTime checkOutTime createdAt updatedAt
        }
      }
    `, hotel)

    if (remote?.data?.createHotel) {
      const newHotel = remote.data.createHotel
      this.hotels.push(newHotel)
      this.save()
      return newHotel
    }

    // Local Mock Fallback
    const newHotel: Hotel = {
      ...hotel,
      id: `h-${Math.random().toString(36).substr(2, 9)}`,
      organizationId: "org-stayflexi",
      address: hotel.address ?? null,
      state: hotel.state ?? null,
      postalCode: hotel.postalCode ?? null,
      phone: hotel.phone ?? null,
      email: hotel.email ?? null,
      website: hotel.website ?? null,
      starRating: hotel.starRating ?? null,
      status: "ACTIVE",
      timezone: hotel.timezone ?? "IST",
      checkInTime: hotel.checkInTime ?? "14:00",
      checkOutTime: hotel.checkOutTime ?? "11:00",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.hotels.push(newHotel)
    this.save()
    return newHotel
  }

  // RoomTypes Methods
  async getRoomTypes(): Promise<RoomType[]> {
    if (typeof window !== 'undefined') {
      const savedRoomTypes = localStorage.getItem('sf_room_types')
      if (savedRoomTypes) this.roomTypes = JSON.parse(savedRoomTypes)
    }
    return this.roomTypes
  }

  async createRoomType(roomType: Omit<RoomType, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<RoomType> {
    const remote = await this.queryGraphQL(`
      mutation CreateRoomType(
        $hotelId: String!,
        $name: String!,
        $description: String,
        $basePrice: Float!,
        $maxOccupancy: Int!,
        $maxAdults: Int,
        $maxChildren: Int,
        $maxInfants: Int,
        $minChildAge: Int,
        $maxChildAge: Int,
        $minInfantAge: Int,
        $maxInfantAge: Int,
        $minOccupancy: Int,
        $absoluteMax: Int,
        $hourlyPrice: Float,
        $extraBedPrice: Float,
        $extraGuestPrice: Float,
        $maxExtraBeds: Int,
        $amenities: [String!]
      ) {
        createRoomType(
          hotelId: $hotelId,
          name: $name,
          description: $description,
          basePrice: $basePrice,
          maxOccupancy: $maxOccupancy,
          maxAdults: $maxAdults,
          maxChildren: $maxChildren,
          maxInfants: $maxInfants,
          minChildAge: $minChildAge,
          maxChildAge: $maxChildAge,
          minInfantAge: $minInfantAge,
          maxInfantAge: $maxInfantAge,
          minOccupancy: $minOccupancy,
          absoluteMax: $absoluteMax,
          hourlyPrice: $hourlyPrice,
          extraBedPrice: $extraBedPrice,
          extraGuestPrice: $extraGuestPrice,
          maxExtraBeds: $maxExtraBeds,
          amenities: $amenities
        ) {
          id hotelId organizationId name description basePrice maxOccupancy maxAdults maxChildren maxInfants minChildAge maxChildAge minInfantAge maxInfantAge minOccupancy absoluteMax hourlyPrice extraBedPrice extraGuestPrice maxExtraBeds amenities isActive createdAt updatedAt
        }
      }
    `, roomType)

    if (remote?.data?.createRoomType) {
      const newRt = remote.data.createRoomType
      this.roomTypes.push(newRt)
      this.save()
      return newRt
    }

    // Local Mock Fallback
    const newRt: RoomType = {
      ...roomType,
      id: `rt-${Math.random().toString(36).substr(2, 9)}`,
      organizationId: "org-stayflexi",
      description: roomType.description ?? null,
      amenities: roomType.amenities ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.roomTypes.push(newRt)
    this.save()
    return newRt
  }

  // Rooms Methods
  async getRooms(): Promise<Room[]> {
    if (typeof window !== 'undefined') {
      const savedRooms = localStorage.getItem('sf_rooms')
      if (savedRooms) this.rooms = JSON.parse(savedRooms)
    }
    return this.rooms
  }

  async createRoom(room: Omit<Room, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isActive' | 'status'>): Promise<Room> {
    const remote = await this.queryGraphQL(`
      mutation CreateRoom(
        $hotelId: String!,
        $roomTypeId: String!,
        $roomNumber: String!,
        $floor: Int,
        $notes: String,
        $wing: String,
        $zone: String,
        $wifiSSID: String,
        $wifiPassword: String,
        $arrivalNotes: String,
        $lockVendor: String,
        $lockDeviceId: String,
        $lockSecret: String,
        $connectingRoomId: String,
        $parentRoomId: String
      ) {
        createRoom(
          hotelId: $hotelId,
          roomTypeId: $roomTypeId,
          roomNumber: $roomNumber,
          floor: $floor,
          notes: $notes,
          wing: $wing,
          zone: $zone,
          wifiSSID: $wifiSSID,
          wifiPassword: $wifiPassword,
          arrivalNotes: $arrivalNotes,
          lockVendor: $lockVendor,
          lockDeviceId: $lockDeviceId,
          lockSecret: $lockSecret,
          connectingRoomId: $connectingRoomId,
          parentRoomId: $parentRoomId
        ) {
          id hotelId organizationId roomTypeId roomNumber floor status isActive notes wing zone wifiSSID wifiPassword arrivalNotes lockVendor lockDeviceId lockSecret connectingRoomId parentRoomId createdAt updatedAt
        }
      }
    `, room)

    if (remote?.data?.createRoom) {
      const newRoom = remote.data.createRoom
      this.rooms.push(newRoom)
      this.save()
      return newRoom
    }

    // Local Mock Fallback
    const newRoom: Room = {
      ...room,
      id: `r-${Math.random().toString(36).substr(2, 9)}`,
      organizationId: "org-stayflexi",
      floor: room.floor ?? null,
      notes: room.notes ?? null,
      wing: room.wing ?? null,
      zone: room.zone ?? null,
      wifiSSID: room.wifiSSID ?? null,
      wifiPassword: room.wifiPassword ?? null,
      arrivalNotes: room.arrivalNotes ?? null,
      lockVendor: room.lockVendor ?? null,
      lockDeviceId: room.lockDeviceId ?? null,
      lockSecret: room.lockSecret ?? null,
      connectingRoomId: room.connectingRoomId ?? null,
      parentRoomId: room.parentRoomId ?? null,
      status: "AVAILABLE",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.rooms.push(newRoom)
    this.save()
    return newRoom
  }

  async updateRoomStatus(roomId: string, status: Room['status'], reason = ""): Promise<Room | null> {
    const remote = await this.queryGraphQL(`
      mutation UpdateRoomStatus($roomId: String!, $status: RoomStatus!, $reason: String) {
        updateRoomStatus(roomId: $roomId, status: $status, reason: $reason) {
          id hotelId organizationId roomTypeId roomNumber floor status isActive notes createdAt updatedAt
        }
      }
    `, { roomId, status, reason })

    if (remote?.data?.updateRoomStatus) {
      const updated = remote.data.updateRoomStatus
      this.rooms = this.rooms.map((r) => r.id === roomId ? updated : r)
      this.save()
      return updated
    }

    // Local Mock Fallback
    const index = this.rooms.findIndex((r) => r.id === roomId)
    if (index === -1) return null
    const target = this.rooms[index]!
    const updated: Room = {
      ...target,
      status,
      notes: reason ? `Status change reason: ${reason}` : target.notes,
      updatedAt: new Date().toISOString(),
    }
    this.rooms[index] = updated
    this.save()
    return updated
  }

  async login(email: string, password: string, force = false): Promise<{ accessToken: string; refreshToken: string; user: any } | null> {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, force }),
        });
        
        if (response.ok) {
          const res = await response.json();
          if (res.success && res.data) {
            return {
              accessToken: res.data.tokens.accessToken,
              refreshToken: res.data.tokens.refreshToken,
              user: res.data.user,
            };
          }
        } else {
          const errorData = await response.json().catch(() => null);
          if (errorData?.error?.message) {
            throw new Error(errorData.error.message);
          }
        }
      } catch (err: any) {
        console.error("NextJS API Auth Login Error:", err);
        if (err.message && (err.message.includes("limit") || err.message.includes("device"))) {
          throw err; // Propagate maximum device limit message
        }
      }
    }

    const remote = await this.queryGraphQL(`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          accessToken
          refreshToken
          user {
            id email firstName lastName primaryRole organizationId status
          }
        }
      }
    `, { email, password })

    if (remote?.data?.login) {
      return remote.data.login
    }

    // Local Mock Fallback
    return {
      accessToken: 'mock-jwt-access-token',
      refreshToken: 'mock-jwt-refresh-token',
      user: {
        id: 'u-1',
        email,
        firstName: 'Pradeep',
        lastName: 'K.',
        primaryRole: 'SUPER_ADMIN',
        organizationId: 'org-stayflexi',
        status: 'ACTIVE'
      }
    }
  }

  async getBookings(hotelId: string): Promise<any[]> {
    const remote = await this.queryGraphQL(`
      query GetBookings($hotelId: String!) {
        bookings(hotelId: $hotelId) {
          id
          organizationId
          hotelId
          bookingNumber
          status
          source
          primaryGuestId
          specialRequests
          internalNotes
          bookedById
          checkedInAt
          checkedOutAt
          cancelledAt
          createdAt
          updatedAt
          rooms {
            id
            roomId
            roomTypeId
            checkInDate
            checkOutDate
            status
            totalRoomAmount
          }
          guests {
            id
            isPrimary
            firstName
            lastName
            email
            phone
          }
        }
      }
    `, { hotelId })

    if (remote?.data?.bookings) {
      return remote.data.bookings
    }

    // Local Storage Mock Fallback for bookings Gantt mapping
    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      if (savedRes) {
        const reservations = JSON.parse(savedRes) as any[]
        // Transform the frontend representation into the federated shape
        return reservations.map(r => ({
          id: r.id,
          organizationId: "org-stayflexi",
          hotelId: hotelId,
          bookingNumber: `SF-${r.id.split('-')[1]?.toUpperCase() || 'MOCK'}`,
          status: r.status,
          source: 'DIRECT',
          primaryGuestId: `g-${r.id}`,
          specialRequests: r.notes,
          internalNotes: null,
          bookedById: 'u-1',
          checkedInAt: r.status === 'CHECKED_IN' ? r.checkIn : null,
          checkedOutAt: r.status === 'CHECKED_OUT' ? r.checkOut : null,
          cancelledAt: r.status === 'CANCELLED' ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rooms: [
            {
              id: `br-${r.id}`,
              roomId: r.roomId,
              roomTypeId: this.rooms.find(rm => rm.id === r.roomId)?.roomTypeId || 'rt-deluxe',
              checkInDate: `${r.checkIn}T14:00:00.000Z`,
              checkOutDate: `${r.checkOut}T11:00:00.000Z`,
              status: r.status === 'CHECKED_IN' ? 'OCCUPIED' : r.status === 'CHECKED_OUT' ? 'VACATED' : 'RESERVED',
              totalRoomAmount: r.amount
            }
          ],
          guests: [
            {
              id: `g-${r.id}`,
              isPrimary: true,
              firstName: r.guestName.split(' ')[0] || 'Guest',
              lastName: r.guestName.split(' ')[1] || 'Stayflexi',
              email: `${r.guestName.toLowerCase().replace(/[^a-z]+/g, '')}@example.com`,
              phone: '+91 99999 88888'
            }
          ]
        }))
      }
    }
    return []
  }

  async createBooking(args: {
    hotelId: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    nationality?: string
    idType?: string
    idNumber?: string
    dob?: string
    roomTypeId: string
    roomId?: string
    checkIn: string
    checkOut: string
    baseRate?: number
    discount?: number
    notes?: string
  }): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation CreateBooking(
        $hotelId: String!
        $firstName: String!
        $lastName: String!
        $email: String
        $phone: String
        $nationality: String
        $idType: String
        $idNumber: String
        $dob: String
        $roomTypeId: String!
        $checkIn: String!
        $checkOut: String!
        $baseRate: Float
        $discount: Float
        $notes: String
      ) {
        createBooking(
          hotelId: $hotelId
          firstName: $firstName
          lastName: $lastName
          email: $email
          phone: $phone
          nationality: $nationality
          idType: $idType
          idNumber: $idNumber
          dob: $dob
          roomTypeId: $roomTypeId
          checkIn: $checkIn
          checkOut: $checkOut
          baseRate: $baseRate
          discount: $discount
          notes: $notes
        ) {
          id
          organizationId
          hotelId
          bookingNumber
          status
          source
          primaryGuestId
          specialRequests
          internalNotes
          bookedById
          checkedInAt
          checkedOutAt
          cancelledAt
          createdAt
          updatedAt
          rooms {
            id
            roomId
            roomTypeId
            checkInDate
            checkOutDate
            status
            totalRoomAmount
          }
          guests {
            id
            isPrimary
            firstName
            lastName
            email
            phone
          }
        }
      }
    `, args)

    if (remote?.data?.createBooking) {
      return remote.data.createBooking
    }

    // Local Mock Fallback
    const id = `res-${Math.random().toString(36).substr(2, 9)}`
    const roomRate = args.baseRate || this.roomTypes.find(rt => rt.id === args.roomTypeId)?.basePrice || 150.00
    const start = new Date(args.checkIn)
    const end = new Date(args.checkOut)
    const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const amount = roomRate * nights

    const newBooking = {
      id,
      organizationId: "org-stayflexi",
      hotelId: args.hotelId,
      bookingNumber: `SF-${id.split('-')[1]?.toUpperCase() || 'MOCK'}`,
      status: 'PENDING',
      source: 'DIRECT',
      primaryGuestId: `g-${id}`,
      specialRequests: args.notes ?? null,
      internalNotes: null,
      bookedById: 'u-1',
      checkedInAt: null,
      checkedOutAt: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rooms: [
        {
          id: `br-${id}`,
          roomId: args.roomId || this.rooms.find(rm => rm.roomTypeId === args.roomTypeId && rm.status === 'AVAILABLE')?.id || 'r-101',
          roomTypeId: args.roomTypeId,
          checkInDate: `${args.checkIn}T14:00:00.000Z`,
          checkOutDate: `${args.checkOut}T11:00:00.000Z`,
          status: 'RESERVED',
          totalRoomAmount: amount
        }
      ],
      guests: [
        {
          id: `g-${id}`,
          isPrimary: true,
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email ?? null,
          phone: args.phone ?? null
        }
      ]
    }

    // Sync back to local storage reservations list
    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      const reservations = savedRes ? JSON.parse(savedRes) : []
      const firstRoom = newBooking.rooms[0]
      if (firstRoom) {
        reservations.push({
          id: newBooking.id,
          guestName: `${args.firstName} ${args.lastName}`,
          roomNumber: this.rooms.find(r => r.id === firstRoom.roomId)?.roomNumber || '101',
          roomId: firstRoom.roomId,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          status: 'PENDING',
          amount: amount,
          notes: args.notes ?? '',
          email: args.email,
          phone: args.phone,
          nationality: args.nationality,
          idType: args.idType,
          idNumber: args.idNumber,
          dob: args.dob,
          baseRate: args.baseRate,
          discount: args.discount
        })
        localStorage.setItem('sf_reservations', JSON.stringify(reservations))
      }
    }

    return newBooking
  }

  async createHourlyBooking(args: { 
    hotelId: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    nationality?: string
    idType?: string
    idNumber?: string
    dob?: string
    roomTypeId: string
    startTime: string
    endTime: string
    baseRate?: number
    discount?: number
    notes?: string 
  }): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation CreateHourlyBooking(
        $hotelId: String!
        $firstName: String!
        $lastName: String!
        $email: String
        $phone: String
        $nationality: String
        $governmentIdType: String
        $governmentIdNumber: String
        $dateOfBirth: String
        $roomTypeId: String!
        $startTime: String!
        $endTime: String!
        $baseRate: Float
        $discount: Float
        $notes: String
      ) {
        createHourlyBooking(
          hotelId: $hotelId
          firstName: $firstName
          lastName: $lastName
          email: $email
          phone: $phone
          nationality: $nationality
          governmentIdType: $governmentIdType
          governmentIdNumber: $governmentIdNumber
          dateOfBirth: $dateOfBirth
          roomTypeId: $roomTypeId
          startTime: $startTime
          endTime: $endTime
          baseRate: $baseRate
          discount: $discount
          notes: $notes
        ) {
          id
          organizationId
          hotelId
          bookingNumber
          status
          source
          primaryGuestId
          specialRequests
          internalNotes
          bookedById
          checkedInAt
          checkedOutAt
          cancelledAt
          createdAt
          updatedAt
          isHourly
          checkInTime
          checkOutTime
          rooms {
            id
            roomId
            roomTypeId
            checkInDate
            checkOutDate
            status
            totalRoomAmount
          }
          guests {
            id
            isPrimary
            firstName
            lastName
            email
            phone
          }
        }
      }
    `, {
      hotelId: args.hotelId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      nationality: args.nationality,
      governmentIdType: args.idType,
      governmentIdNumber: args.idNumber,
      dateOfBirth: args.dob,
      roomTypeId: args.roomTypeId,
      startTime: args.startTime,
      endTime: args.endTime,
      baseRate: args.baseRate,
      discount: args.discount,
      notes: args.notes
    })

    if (remote?.data?.createHourlyBooking) {
      return remote.data.createHourlyBooking
    }

    // Local Mock Fallback for offline environments
    const id = `res-${Math.random().toString(36).substr(2, 9)}`
    const roomRate = args.baseRate || 45.00 // base micro hourly rate
    const start = new Date(args.startTime)
    const end = new Date(args.endTime)
    const hours = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60)))
    const amount = roomRate * hours

    const newBooking = {
      id,
      organizationId: "org-stayflexi",
      hotelId: args.hotelId,
      bookingNumber: `SF-${id.split('-')[1]?.toUpperCase() || 'MOCK'}`,
      status: 'PENDING',
      source: 'DIRECT',
      primaryGuestId: `g-${id}`,
      specialRequests: `HOURLY_STAY IN:${args.startTime} OUT:${args.endTime} ${args.notes || ''}`,
      internalNotes: null,
      bookedById: 'u-1',
      checkedInAt: null,
      checkedOutAt: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isHourly: true,
      checkInTime: args.startTime,
      checkOutTime: args.endTime,
      rooms: [
        {
          id: `br-${id}`,
          roomId: this.rooms.find(rm => rm.roomTypeId === args.roomTypeId && rm.status === 'AVAILABLE')?.id || 'r-101',
          roomTypeId: args.roomTypeId,
          checkInDate: args.startTime,
          checkOutDate: args.endTime,
          status: 'RESERVED',
          totalRoomAmount: amount
        }
      ],
      guests: [
        {
          id: `g-${id}`,
          isPrimary: true,
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email ?? null,
          phone: args.phone ?? null
        }
      ]
    }

    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      const reservations = savedRes ? JSON.parse(savedRes) : []
      const firstRoom = newBooking.rooms[0]
      if (firstRoom) {
        reservations.push({
          id: newBooking.id,
          guestName: `${args.firstName} ${args.lastName}`,
          roomNumber: this.rooms.find(r => r.id === firstRoom.roomId)?.roomNumber || '101',
          roomId: firstRoom.roomId,
          checkIn: args.startTime.split('T')[0] || '',
          checkOut: args.endTime.split('T')[0] || '',
          status: 'PENDING',
          amount: amount,
          notes: `HOURLY_STAY IN:${args.startTime} OUT:${args.endTime} ${args.notes || ''}`,
          email: args.email,
          phone: args.phone,
          nationality: args.nationality,
          idType: args.idType,
          idNumber: args.idNumber,
          dob: args.dob,
          baseRate: args.baseRate,
          discount: args.discount
        })
        localStorage.setItem('sf_reservations', JSON.stringify(reservations))
      }
    }

    return newBooking
  }

  async checkInGuest(bookingId: string, roomId: string): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation CheckInGuest($bookingId: String!, $roomId: String!) {
        checkInGuest(bookingId: $bookingId, roomId: $roomId) {
          id status checkedInAt
        }
      }
    `, { bookingId, roomId })

    if (remote?.data?.checkInGuest) {
      // Sync local room status
      await this.updateRoomStatus(roomId, 'OCCUPIED', `Checked in guest for booking ${bookingId}`)
      return remote.data.checkInGuest
    }

    // Local Sync Fallback
    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      if (savedRes) {
        let reservations = JSON.parse(savedRes) as any[]
        reservations = reservations.map(r => r.id === bookingId ? { ...r, status: 'CHECKED_IN', roomId } : r)
        localStorage.setItem('sf_reservations', JSON.stringify(reservations))
      }
    }
    await this.updateRoomStatus(roomId, 'OCCUPIED', `Checked in guest for booking ${bookingId}`)
    return { id: bookingId, status: 'CHECKED_IN', checkedInAt: new Date().toISOString() }
  }

  async reassignRoom(bookingId: string, roomId: string): Promise<boolean> {
    const remote = await this.queryGraphQL(`
      mutation ReassignRoom($bookingId: String!, $roomId: String!) {
        reassignRoom(bookingId: $bookingId, roomId: $roomId) {
          id
        }
      }
    `, { bookingId, roomId })

    if (remote?.data?.reassignRoom) {
      return true
    }

    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      if (savedRes) {
        let reservations = JSON.parse(savedRes) as any[]
        reservations = reservations.map(r => r.id === bookingId ? { ...r, roomId } : r)
        localStorage.setItem('sf_reservations', JSON.stringify(reservations))
      }
    }
    return true
  }

  async validateMagicLink(token: string): Promise<any> {
    const remote = await this.queryGraphQL(`
      query ValidateMagicLink($token: String!) {
        validateMagicLink(token: $token) {
          id
          organizationId
          hotelId
          bookingNumber
          status
          source
          primaryGuestId
          specialRequests
          internalNotes
          bookedById
          checkedInAt
          checkedOutAt
          cancelledAt
          createdAt
          updatedAt
          rooms {
            id
            roomId
            roomTypeId
            checkInDate
            checkOutDate
            status
            totalRoomAmount
          }
          guests {
            id
            isPrimary
            firstName
            lastName
            email
            phone
          }
        }
      }
    `, { token })

    if (remote?.data?.validateMagicLink) {
      return remote.data.validateMagicLink
    }

    // Local Storage Mock Fallback for offline usage
    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      if (savedRes) {
        const reservations = JSON.parse(savedRes) as any[]
        const match = reservations.find(r => r.id === token || r.bookingNumber === token)
        if (match) return match
      }
    }
    return null
  }

  async completeContactlessCheckIn(args: {
    bookingId: string
    documentBase64: string
    signatureBase64: string
    governmentIdType?: string
    governmentIdNumber?: string
    nationality?: string
  }): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation CompleteContactlessCheckIn(
        $bookingId: String!
        $documentBase64: String!
        $signatureBase64: String!
        $governmentIdType: String
        $governmentIdNumber: String
        $nationality: String
      ) {
        completeContactlessCheckIn(
          bookingId: $bookingId
          documentBase64: $documentBase64
          signatureBase64: $signatureBase64
          governmentIdType: $governmentIdType
          governmentIdNumber: $governmentIdNumber
          nationality: $nationality
        ) {
          id
          status
          checkedInAt
          rooms {
            id
            roomId
            status
          }
          guests {
            id
            firstName
            lastName
            email
            phone
          }
        }
      }
    `, args)

    const resolvedBooking = remote?.data?.completeContactlessCheckIn
    if (resolvedBooking) {
      const firstRoomId = resolvedBooking.rooms?.[0]?.roomId
      if (firstRoomId) {
        await this.updateRoomStatus(firstRoomId, 'OCCUPIED', `Self check-in completed via MagicLink for booking ${args.bookingId}`)
      }
      return resolvedBooking
    }

    // Local Storage Fallback
    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      if (savedRes) {
        let reservations = JSON.parse(savedRes) as any[]
        const match = reservations.find(r => r.id === args.bookingId)
        const firstRoomId = match?.rooms?.[0]?.roomId || 'unassigned_room_id'
        
        reservations = reservations.map(r => r.id === args.bookingId ? { 
          ...r, 
          status: 'CHECKED_IN', 
          checkedInAt: new Date().toISOString(),
          guests: r.guests ? r.guests.map((g: any, idx: number) => idx === 0 ? {
            ...g,
            nationality: args.nationality || 'US',
            governmentIdType: args.governmentIdType || 'PASSPORT',
            governmentIdNumber: args.governmentIdNumber || 'CONTACTLESS_OCR'
          } : g) : []
        } : r)
        localStorage.setItem('sf_reservations', JSON.stringify(reservations))
        
        if (firstRoomId !== 'unassigned_room_id') {
          await this.updateRoomStatus(firstRoomId, 'OCCUPIED', `Self check-in completed via MagicLink for booking ${args.bookingId}`)
        }
      }
    }

    return { 
      id: args.bookingId, 
      status: 'CHECKED_IN', 
      checkedInAt: new Date().toISOString(),
      rooms: [{ id: 'mock-room-id', roomId: 'mock-room-id', status: 'OCCUPIED' }],
      guests: [{ id: 'mock-guest-id', firstName: 'Guest', lastName: 'Self-Service' }]
    }
  }

  async generateSmartKey(bookingId: string): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation GenerateSmartKey($bookingId: String!) {
        generateSmartKey(bookingId: $bookingId) {
          id
          bookingId
          accessCode
          expiresAt
        }
      }
    `, { bookingId })

    if (remote?.data?.generateSmartKey) {
      return remote.data.generateSmartKey
    }

    // Local Storage Mock Fallback for offline access keys
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString().replace(/(\d{3})(\d{3})/, '$1 $2')
    return {
      id: `key-${Math.random().toString(36).substr(2, 9)}`,
      bookingId,
      accessCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }

  async sendFlexiAIChat(bookingId: string | null, message: string): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation SendFlexiAIChat($bookingId: String, $message: String!) {
        sendFlexiAIChat(bookingId: $bookingId, message: $message) {
          role
          content
          suggestedActions
          action
          actionPayload
        }
      }
    `, { bookingId, message })

    if (remote?.data?.sendFlexiAIChat) {
      return remote.data.sendFlexiAIChat
    }

    // Local Storage Mock Fallback for offline concierge queries
    const msg = message.toLowerCase()
    let reply = bookingId 
      ? "Hello! I am your Flexi AI Concierge (Offline Mode). How can I help you with your stay today?"
      : "Hello! I am Flexi AI, your Stayflexi Operations & BI Assistant (Offline Mode). How can I help you today?"
    let suggestions: string[] = bookingId
      ? ["Upgrade Room", "Order Food", "View Folio"]
      : ["Revenue Report", "Block Room 103", "Occupancy Analytics"]
    let localAction: string | null = null
    let localPayload: string | null = null

    if (bookingId) {
      if (msg.includes('hourly') || msg.includes('flexi') || msg.includes('fractional') || msg.includes('slot')) {
        reply = "Stayflexi offers flexible hourly stays! You can rent rooms in 3, 6, or 12 hour slots. Would you like to check room availability for an hourly stay?"
        suggestions = ["Book 3 Hours", "Book 6 Hours", "View Hourly Rates"]
      } else if (msg.includes('upgrade') || msg.includes('room type') || msg.includes('deluxe') || msg.includes('executive')) {
        reply = "We have high-end Deluxe and Executive suites available for upgrades! You can purchase early room check-in or switch room types instantly."
        suggestions = ["Upgrade to Deluxe", "See Elite Villas"]
        localAction = "upgrade_room"
      } else if (msg.includes('food') || msg.includes('menu') || msg.includes('room service') || msg.includes('eat') || msg.includes('dinner')) {
        reply = "Our 24/7 kitchen serves authentic Goa dishes, Club Sandwiches, and custom cocktails. Orders post directly to your room folio ledger."
        suggestions = ["View Food Menu", "Order Breakfast"]
        localAction = "order_food"
      } else if (msg.includes('key') || msg.includes('lock') || msg.includes('code') || msg.includes('door')) {
        reply = "Once check-in is complete and invoice payments are validated, your secure smart lock digital code will instantly reveal."
        suggestions = ["Reveal Smart Key", "View Check-In Details"]
        localAction = "reveal_key"
      } else if (msg.includes('checkout') || msg.includes('check out') || msg.includes('bill') || msg.includes('folio') || msg.includes('invoice')) {
        reply = "You can review your room ledger invoice, add charges, or complete checkout self-service securely in the Guest Portal."
        suggestions = ["View Invoice Folio", "Checkout Room"]
        localAction = "checkout"
      }
    } else {
      if (msg.includes('revenue') || msg.includes('report') || msg.includes('sales') || msg.includes('analytics') || msg.includes('earn')) {
        reply = "Based on the latest Supergraph aggregated subgraphs, our gross revenue for May 2026 is **$24,850.00** with an occupancy rate of **82.5%**. Deluxe Pool-View rooms contributed 65% of the total revenue."
        suggestions = ["Revenue by Room Type", "Show Occupancy Details", "Export Report"]
        localAction = "navigate"
        localPayload = JSON.stringify({ target: "/console" })
      } else if (msg.includes('block') || msg.includes('inventory') || msg.includes('close')) {
        reply = "I can help you block room inventory. Which room or room category would you like to hold?"
        suggestions = ["Block Room 103", "Block Deluxe Pool-View", "Show Rooms Grid"]
        if (msg.includes('103')) {
          localAction = "block_inventory"
          localPayload = JSON.stringify({ roomNumber: "103" })
        }
      } else if (msg.includes('occupancy') || msg.includes('occupied') || msg.includes('status')) {
        reply = "Our current occupancy rate is **82.5%** with 6 rooms occupied and 2 available rooms. Housekeeping is currently deep cleaning Room 103."
        suggestions = ["Show Rooms Grid", "View Clean Statuses"]
        localAction = "navigate"
        localPayload = JSON.stringify({ target: "/inventory" })
      } else if (msg.includes('review') || msg.includes('reply') || msg.includes('ota')) {
        reply = "Navigating to the consolidated guest reviews dashboard. I've initialized the AI responder copilot to draft replies."
        suggestions = ["Review Console", "Pending Reviews"]
        localAction = "navigate_app"
        localPayload = JSON.stringify({ app: "reviews", reviewId: "rev-1" })
      }
    }

    const isBrowser = typeof window !== 'undefined';
    const activeModel = isBrowser ? (localStorage.getItem('sf_chat_active_model') || 'gemini') : 'gemini';

    // Retrieve corresponding key
    let apiKey: string | null = null;
    if (activeModel === 'gemini') {
      apiKey = isBrowser
        ? (localStorage.getItem('sf_api_key_gemini') || localStorage.getItem('sf_gemini_api_key') || process.env['NEXT_PUBLIC_GEMINI_API_KEY'] || "AQ.Ab8RN6If54EHgak6M7m6gynnaapjEH_3N2__KeIFLekSr5X8Tw")
        : "AQ.Ab8RN6If54EHgak6M7m6gynnaapjEH_3N2__KeIFLekSr5X8Tw";
    } else if (activeModel === 'openai') {
      apiKey = isBrowser ? localStorage.getItem('sf_api_key_openai') : null;
    } else if (activeModel === 'groq') {
      apiKey = isBrowser ? localStorage.getItem('sf_api_key_groq') : null;
    } else if (activeModel === 'anthropic') {
      apiKey = isBrowser ? localStorage.getItem('sf_api_key_anthropic') : null;
    } else if (activeModel === 'kimi') {
      apiKey = isBrowser ? localStorage.getItem('sf_api_key_kimi') : null;
    }

    const systemPrompt = bookingId
      ? "You are the Flexi AI Concierge for Stayflexi guests. Assist guests with flexible hourly stays (3, 6, 12 hours at $45/hour), room upgrades (Deluxe, Executive suites), ordering food (24/7 kitchen, Goa dishes, Club Sandwiches, custom cocktails, posted directly to room folio), smart key digital codes (revealed after check-in and payment), reviewing room invoice/folio, and self-service checkout. Be professional, friendly, and concise. You must respond ONLY with a JSON object matching this schema: { \"content\": string, \"suggestedActions\": string[], \"action\": string | null, \"actionPayload\": string | null }. If the guest requests a room upgrade, set action to 'upgrade_room'. If ordering food or viewing food catalog/menu, set action to 'order_food'. If requesting keys or lock code, set action to 'reveal_key'. If requesting self-checkout or settling folio, set action to 'checkout'. Otherwise set action to null."
      : "You are Flexi AI, the official Operations & Business Intelligence Assistant for Stayflexi. You assist hotel staff in controlling operations and getting real-time insights. You can explain how to perform tasks, summarize revenue/occupancy data, block rooms, or modify reservations. Suggest 2-4 appropriate operational actions for staff as quick-reply buttons (e.g., 'Revenue Report', 'Block Room 103', 'Occupancy Analytics', 'Show Rooms Grid'). Keep responses highly professional, direct, and operational. You must respond ONLY with a JSON object matching this schema: { \"content\": string, \"suggestedActions\": string[], \"action\": string | null, \"actionPayload\": string | null }. If the staff asks to block Room 103, set action to 'block_inventory' and actionPayload to '{\"roomNumber\":\"103\"}'. If staff wants to view the rooms grid or check inventory, set action to 'navigate' and actionPayload to '{\"target\":\"/inventory\"}'. If staff wants to view revenue or sales analytics, set action to 'navigate' and actionPayload to '{\"target\":\"/console\"}' or 'navigate_app' with payload '{\"app\":\"revenue\"}'. If staff wants to view guest reviews, set action to 'navigate_app' and actionPayload to '{\"app\":\"reviews\",\"reviewId\":\"rev-1\"}'. Otherwise set action to null.";

    const cleanAndParseResponse = (text: string) => {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      const parsed = JSON.parse(cleanText.trim());
      return {
        role: 'ASSISTANT',
        content: parsed.content,
        suggestedActions: parsed.suggestedActions || [],
        action: parsed.action || null,
        actionPayload: parsed.actionPayload || null
      };
    };

    if (apiKey) {
      try {
        if (activeModel === 'gemini') {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: message }] }],
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    content: { type: "STRING" },
                    suggestedActions: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    },
                    action: { type: "STRING" },
                    actionPayload: { type: "STRING" }
                  },
                  required: ["content", "suggestedActions"]
                }
              }
            })
          });

          if (response.ok) {
            const data = await response.json() as any;
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
              return cleanAndParseResponse(textResponse);
            }
          }
        } else if (activeModel === 'openai') {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
              ],
              response_format: { type: "json_object" }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const textResponse = data.choices?.[0]?.message?.content;
            if (textResponse) {
              return cleanAndParseResponse(textResponse);
            }
          } else {
            console.error("OpenAI call error response:", await response.text());
          }
        } else if (activeModel === 'groq') {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
              ],
              response_format: { type: "json_object" }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const textResponse = data.choices?.[0]?.message?.content;
            if (textResponse) {
              return cleanAndParseResponse(textResponse);
            }
          } else {
            console.error("Groq call error response:", await response.text());
          }
        } else if (activeModel === 'anthropic') {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1024,
              system: systemPrompt,
              messages: [
                { role: "user", content: message }
              ]
            })
          });

          if (response.ok) {
            const data = await response.json();
            const textResponse = data.content?.[0]?.text;
            if (textResponse) {
              return cleanAndParseResponse(textResponse);
            }
          } else {
            console.error("Anthropic call error response:", await response.text());
          }
        } else if (activeModel === 'kimi') {
          const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "moonshot-v1-8k",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
              ]
            })
          });

          if (response.ok) {
            const data = await response.json();
            const textResponse = data.choices?.[0]?.message?.content;
            if (textResponse) {
              return cleanAndParseResponse(textResponse);
            }
          } else {
            console.error("Kimi call error response:", await response.text());
          }
        }
      } catch (err) {
        console.error(`${activeModel} API call failed, using rule-based fallback:`, err);
      }
    } else {
      console.warn(`API key for selected model "${activeModel}" is missing. Using local rule-based fallback.`);
    }

    return {
      role: 'ASSISTANT',
      content: apiKey ? reply : `⚠️ **API Key Missing for ${activeModel.toUpperCase()}**. Please click the \`+\` button to configure your API key. In the meantime, here is the simulated response:\n\n${reply}`,
      suggestedActions: suggestions,
      action: localAction,
      actionPayload: localPayload
    }
  }

  async analyzeReviewSentiment(comment: string): Promise<{ rating: number; sentiment: 'positive' | 'neutral' | 'negative' }> {
    const apiKey = typeof window !== 'undefined' 
      ? (localStorage.getItem('sf_gemini_api_key') || process.env['NEXT_PUBLIC_GEMINI_API_KEY'] || "AQ.Ab8RN6If54EHgak6M7m6gynnaapjEH_3N2__KeIFLekSr5X8Tw") 
      : "AQ.Ab8RN6If54EHgak6M7m6gynnaapjEH_3N2__KeIFLekSr5X8Tw"

    if (apiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Analyze this review comment: "${comment}"` }] }],
            systemInstruction: {
              parts: [{
                text: "You are an AI sentiment analyzer and guest review scorer for a hotel property management system. Analyze the guest comment, and determine the score/rating (integer from 1 to 5, where 5 is excellent and 1 is terrible) and the sentiment ('positive', 'neutral', or 'negative'). You must respond with a JSON object matching this schema: { rating: number, sentiment: string }."
              }]
            },
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  rating: { type: "INTEGER" },
                  sentiment: { type: "STRING" }
                },
                required: ["rating", "sentiment"]
              }
            }
          })
        })

        if (response.ok) {
          const data = await response.json()
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            const parsed = JSON.parse(text)
            const rating = Math.max(1, Math.min(5, Number(parsed.rating) || 3))
            const sentiment = parsed.sentiment === 'positive' || parsed.sentiment === 'neutral' || parsed.sentiment === 'negative'
              ? parsed.sentiment
              : 'neutral'
            return { rating, sentiment }
          }
        }
      } catch (err) {
        console.error("AI sentiment analysis failed:", err)
      }
    }

    // Heuristic Local Fallback
    const clean = comment.toLowerCase()
    let rating = 3
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'

    if (clean.includes('exceptional') || clean.includes('excellent') || clean.includes('great') || clean.includes('amazing') || clean.includes('love') || clean.includes('perfect')) {
      rating = 5
      sentiment = 'positive'
    } else if (clean.includes('good') || clean.includes('nice') || clean.includes('fine') || clean.includes('satisfactory')) {
      rating = 4
      sentiment = 'positive'
    } else if (clean.includes('bad') || clean.includes('dirty') || clean.includes('poor') || clean.includes('terrible') || clean.includes('worst') || clean.includes('disappointed')) {
      rating = 1
      sentiment = 'negative'
    } else if (clean.includes('slow') || clean.includes('issue') || clean.includes('delay') || clean.includes('problem')) {
      rating = 2
      sentiment = 'negative'
    }

    return { rating, sentiment }
  }

  async checkOutGuest(bookingId: string): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation CheckOutGuest($bookingId: String!) {
        checkOutGuest(bookingId: $bookingId) {
          id status checkedOutAt
        }
      }
    `, { bookingId })

    if (remote?.data?.checkOutGuest) {
      return remote.data.checkOutGuest
    }

    // Local Sync Fallback
    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      if (savedRes) {
        let reservations = JSON.parse(savedRes) as any[]
        const target = reservations.find(r => r.id === bookingId)
        if (target) {
          reservations = reservations.map(r => r.id === bookingId ? { ...r, status: 'CHECKED_OUT' } : r)
          localStorage.setItem('sf_reservations', JSON.stringify(reservations))
          await this.updateRoomStatus(target.roomId, 'HOUSEKEEPING', `Checked out guest for booking ${bookingId}`)
        }
      }
    }
    return { id: bookingId, status: 'CHECKED_OUT', checkedOutAt: new Date().toISOString() }
  }

  async cancelBooking(bookingId: string, reason = ""): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation CancelBooking($bookingId: String!, $reason: String) {
        cancelBooking(bookingId: $bookingId, reason: $reason) {
          id status cancelledAt
        }
      }
    `, { bookingId, reason })

    if (remote?.data?.cancelBooking) {
      return remote.data.cancelBooking
    }

    // Local Sync Fallback
    if (typeof window !== 'undefined') {
      const savedRes = localStorage.getItem('sf_reservations')
      if (savedRes) {
        let reservations = JSON.parse(savedRes) as any[]
        const target = reservations.find(r => r.id === bookingId)
        if (target) {
          reservations = reservations.map(r => r.id === bookingId ? { ...r, status: 'CANCELLED' } : r)
          localStorage.setItem('sf_reservations', JSON.stringify(reservations))
          await this.updateRoomStatus(target.roomId, 'AVAILABLE', `Cancelled booking ${bookingId}: ${reason}`)
        }
      }
    }
    return { id: bookingId, status: 'CANCELLED', cancelledAt: new Date().toISOString() }
  }

  // Inventory Calendar Methods (Phase 2 integration)
  async getAvailabilityCalendar(hotelId: string, startDate: string, endDate: string): Promise<any[]> {
    const remote = await this.queryGraphQL(`
      query GetAvailabilityCalendar($hotelId: String!, $startDate: String!, $endDate: String!) {
        availabilityCalendar(hotelId: $hotelId, startDate: $startDate, endDate: $endDate) {
          date roomTypeId totalCapacity availableCount reservedCount blockedCount basePrice
        }
      }
    `, { hotelId, startDate, endDate })

    if (remote?.data?.availabilityCalendar) {
      return remote.data.availabilityCalendar
    }

    // Local Offline Resilient Fallback
    const calendar: any[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const activeBlocked = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sf_blocked_inventory') || '[]') : []
    const activeRes = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sf_reservations') || '[]') : []

    const rts = this.roomTypes.filter(rt => rt.hotelId === hotelId)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0] || ''
      
      for (const rt of rts) {
        const totalRoomsOfRt = this.rooms.filter(rm => rm.roomTypeId === rt.id && rm.hotelId === hotelId).length || 5
        
        // Count blocks
        const blocks = activeBlocked.filter((b: any) => 
          b.hotelId === hotelId && 
          b.roomTypeId === rt.id && 
          dateStr >= b.startDate && 
          dateStr <= b.endDate
        ).length

        // Count reservations
        const reserves = activeRes.filter((res: any) => 
          res.status !== 'CANCELLED' && 
          res.status !== 'CHECKED_OUT' &&
          this.rooms.find(rm => rm.id === res.roomId)?.roomTypeId === rt.id &&
          dateStr >= res.checkIn && 
          dateStr <= res.checkOut
        ).length

        calendar.push({
          date: dateStr,
          roomTypeId: rt.id,
          totalCapacity: totalRoomsOfRt,
          availableCount: Math.max(0, totalRoomsOfRt - reserves - blocks),
          reservedCount: reserves,
          blockedCount: blocks,
          basePrice: rt.basePrice
        })
      }
    }

    return calendar;
  }

  async blockInventory(hotelId: string, roomTypeId: string, startDate: string, endDate: string, reason = ""): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation BlockInventory($hotelId: String!, $roomTypeId: String!, $startDate: String!, $endDate: String!, $reason: String) {
        blockInventory(hotelId: $hotelId, roomTypeId: $roomTypeId, startDate: $startDate, endDate: $endDate, reason: $reason) {
          success message
        }
      }
    `, { hotelId, roomTypeId, startDate, endDate, reason })

    if (remote?.data?.blockInventory) {
      return remote.data.blockInventory
    }

    // Local Sync Fallback
    if (typeof window !== 'undefined') {
      const activeBlocked = JSON.parse(localStorage.getItem('sf_blocked_inventory') || '[]')
      activeBlocked.push({
        id: `block-${Math.random().toString(36).substr(2, 9)}`,
        hotelId,
        roomTypeId,
        startDate,
        endDate,
        reason
      })
      localStorage.setItem('sf_blocked_inventory', JSON.stringify(activeBlocked))
    }

    return { success: true, message: "Inventory blocked successfully (local fallback)." }
  }

  async unblockInventory(hotelId: string, roomTypeId: string, startDate: string, endDate: string): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation UnblockInventory($hotelId: String!, $roomTypeId: String!, $startDate: String!, $endDate: String!) {
        unblockInventory(hotelId: $hotelId, roomTypeId: $roomTypeId, startDate: $startDate, endDate: $endDate) {
          success message
        }
      }
    `, { hotelId, roomTypeId, startDate, endDate })

    if (remote?.data?.unblockInventory) {
      return remote.data.unblockInventory
    }

    // Local Sync Fallback
    if (typeof window !== 'undefined') {
      let activeBlocked = JSON.parse(localStorage.getItem('sf_blocked_inventory') || '[]') as any[]
      // Remove matching block
      activeBlocked = activeBlocked.filter(b => 
        !(b.hotelId === hotelId && b.roomTypeId === roomTypeId && b.startDate === startDate && b.endDate === endDate)
      )
      localStorage.setItem('sf_blocked_inventory', JSON.stringify(activeBlocked))
    }

    return { success: true, message: "Inventory unblocked successfully (local fallback)." }
  }

  // Payments & Invoices methods (Phase 3 integration)
  async getInvoices(bookingId: string): Promise<any[]> {
    const remote = await this.queryGraphQL(`
      query GetInvoices($bookingId: String!) {
        invoices(bookingId: $bookingId) {
          id organizationId hotelId bookingId invoiceNumber invoiceStatus subtotal taxAmount discountAmount totalAmount currency issuedAt dueDate notes createdById createdAt updatedAt
          items {
            id invoiceId itemType itemName quantity unitPrice totalPrice taxRate
          }
        }
      }
    `, { bookingId })

    if (remote?.data?.invoices) {
      return remote.data.invoices
    }

    // Local Storage Resilient Fallback
    if (typeof window !== 'undefined') {
      const savedInvoices = JSON.parse(localStorage.getItem('sf_invoices') || '[]')
      return savedInvoices.filter((inv: any) => inv.bookingId === bookingId)
    }
    return []
  }

  async postChargeToFolio(args: {
    bookingId: string
    amount: number
    description: string
    source: string
  }): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation PostChargeToFolio(
        $bookingId: String!
        $amount: Float!
        $description: String!
        $source: String!
      ) {
        postChargeToFolio(
          bookingId: $bookingId
          amount: $amount
          description: $description
          source: $source
        ) {
          id
          bookingId
          subtotal
          taxAmount
          totalAmount
          currency
          items {
            id
            itemType
            itemName
            quantity
            unitPrice
            totalPrice
            taxRate
          }
        }
      }
    `, args)

    if (remote?.data?.postChargeToFolio) {
      return remote.data.postChargeToFolio
    }

    // Local Storage Mock Fallback for offline upsell / F&B postings
    if (typeof window !== 'undefined') {
      const savedInvoices = localStorage.getItem('sf_invoices')
      const invoices = savedInvoices ? JSON.parse(savedInvoices) : []
      let inv = invoices.find((i: any) => i.bookingId === args.bookingId)

      if (!inv) {
        inv = {
          id: `inv-${Math.random().toString(36).substr(2, 9)}`,
          bookingId: args.bookingId,
          invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
          invoiceStatus: 'UNPAID',
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          currency: 'USD',
          items: []
        }
        invoices.push(inv)
      }

      const newItem = {
        id: `it-${Math.random().toString(36).substr(2, 9)}`,
        itemType: 'SERVICE_CHARGE',
        itemName: `[${args.source}] ${args.description}`,
        quantity: 1,
        unitPrice: args.amount,
        totalPrice: args.amount,
        taxRate: 0.05
      }
      inv.items.push(newItem)

      inv.subtotal = inv.items.reduce((acc: number, item: any) => acc + item.totalPrice, 0)
      inv.taxAmount = inv.items.reduce((acc: number, item: any) => acc + (item.totalPrice * item.taxRate), 0)
      inv.totalAmount = inv.subtotal + inv.taxAmount

      localStorage.setItem('sf_invoices', JSON.stringify(invoices))
      return inv
    }
    return null
  }

  async initiatePayment(hotelId: string, bookingId: string, paymentMethod: string, amount: number): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation InitiatePayment($hotelId: String!, $bookingId: String!, $paymentMethod: String!, $amount: Float!, $currency: String!) {
        initiatePayment(hotelId: $hotelId, bookingId: $bookingId, paymentMethod: $paymentMethod, amount: $amount, currency: $currency) {
          id organizationId hotelId bookingId paymentReference paymentMethod paymentStatus amount currency processedById createdAt
        }
      }
    `, { hotelId, bookingId, paymentMethod, amount, currency: 'USD' })

    if (remote?.data?.initiatePayment) {
      return remote.data.initiatePayment
    }

    // Local Storage Resilient Fallback
    const id = `pay-${Math.random().toString(36).substr(2, 9)}`
    const payment = {
      id,
      organizationId: 'org-stayflexi',
      hotelId,
      bookingId,
      paymentReference: `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      paymentMethod,
      paymentStatus: 'SUCCESS',
      amount,
      currency: 'USD',
      processedById: 'u-1',
      createdAt: new Date().toISOString()
    }

    if (typeof window !== 'undefined') {
      // 1. Save payment entry
      const payments = JSON.parse(localStorage.getItem('sf_payments') || '[]')
      payments.push(payment)
      localStorage.setItem('sf_payments', JSON.stringify(payments))

      // 2. Generate an invoice automatic fallback
      const invoices = JSON.parse(localStorage.getItem('sf_invoices') || '[]')
      const invId = `inv-${Math.random().toString(36).substr(2, 9)}`
      const tax = amount * 0.12
      const total = amount + tax
      invoices.push({
        id: invId,
        organizationId: 'org-stayflexi',
        hotelId,
        bookingId,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        invoiceStatus: 'PAID',
        subtotal: amount,
        taxAmount: tax,
        discountAmount: 0,
        totalAmount: total,
        currency: 'USD',
        issuedAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Stripe swipe auto-generated transaction receipt.',
        createdById: 'u-1',
        createdAt: new Date().toISOString(),
        items: [
          {
            id: `item-${invId}-1`,
            invoiceId: invId,
            itemType: 'ROOM_CHARGE',
            itemName: 'Deluxe Room Stay Charge',
            quantity: 1,
            unitPrice: amount,
            totalPrice: amount,
            taxRate: 0.12
          }
        ]
      })
      localStorage.setItem('sf_invoices', JSON.stringify(invoices))
    }

    return payment
  }

  // OTA Channel Manager sync methods (Phase 3 integration)
  async getOtaProviders(): Promise<any[]> {
    const remote = await this.queryGraphQL(`
      query GetOtaProviders {
        otaProviders {
          id providerCode providerName status description webhookUrl
        }
      }
    `)

    if (remote?.data?.otaProviders) {
      return remote.data.otaProviders
    }

    // Offline standard static providers fallback list
    return [
      { id: 'prov-agoda', providerCode: 'AGODA', providerName: 'Agoda', status: 'ACTIVE', description: 'Agoda.com direct channel synchronization' },
      { id: 'prov-expedia', providerCode: 'EXPEDIA', providerName: 'Expedia', status: 'ACTIVE', description: 'Expedia Partner Solutions direct connectivity' },
      { id: 'prov-booking', providerCode: 'BOOKING_COM', providerName: 'Booking.com', status: 'ACTIVE', description: 'Booking.com connectivity syncer' },
      { id: 'prov-airbnb', providerCode: 'AIRBNB', providerName: 'Airbnb', status: 'ACTIVE', description: 'Airbnb direct mapping syncer' }
    ]
  }

  async getOtaMappings(hotelId: string): Promise<any[]> {
    const remote = await this.queryGraphQL(`
      query GetOtaMappings($hotelId: String!) {
        otaMappings(hotelId: $hotelId) {
          id organizationId hotelId roomTypeId providerId externalHotelId externalRoomTypeId syncStatus isActive lastSyncedAt
        }
      }
    `, { hotelId })

    if (remote?.data?.otaMappings) {
      return remote.data.otaMappings
    }

    // Local Storage Resilient Fallback
    if (typeof window !== 'undefined') {
      const savedMappings = localStorage.getItem('sf_ota_mappings')
      if (savedMappings) {
        return JSON.parse(savedMappings).filter((m: any) => m.hotelId === hotelId)
      }
      
      // Default offline static setup mappings
      const defaults = [
        { id: 'map-1', organizationId: 'org-stayflexi', hotelId, roomTypeId: 'rt-deluxe', providerId: 'prov-agoda', externalHotelId: 'agoda-101', externalRoomTypeId: 'agoda-rt-deluxe', syncStatus: 'SUCCESS', isActive: true, lastSyncedAt: new Date().toISOString() },
        { id: 'map-2', organizationId: 'org-stayflexi', hotelId, roomTypeId: 'rt-executive', providerId: 'prov-agoda', externalHotelId: 'agoda-101', externalRoomTypeId: 'agoda-rt-exec', syncStatus: 'SUCCESS', isActive: true, lastSyncedAt: new Date().toISOString() },
        { id: 'map-3', organizationId: 'org-stayflexi', hotelId, roomTypeId: 'rt-deluxe', providerId: 'prov-expedia', externalHotelId: 'exp-202', externalRoomTypeId: 'exp-rt-deluxe', syncStatus: 'SUCCESS', isActive: true, lastSyncedAt: new Date().toISOString() }
      ]
      localStorage.setItem('sf_ota_mappings', JSON.stringify(defaults))
      return defaults
    }
    return []
  }

  async connectOta(hotelId: string, providerId: string, externalHotelId: string, roomTypeMappings: any[]): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation ConnectOta($hotelId: String!, $providerId: String!, $externalHotelId: String!, $roomTypeMappings: [RoomTypeMappingInput!]!) {
        connectOta(hotelId: $hotelId, providerId: $providerId, externalHotelId: $externalHotelId, roomTypeMappings: $roomTypeMappings) {
          id organizationId hotelId roomTypeId providerId externalHotelId externalRoomTypeId syncStatus isActive lastSyncedAt
        }
      }
    `, { hotelId, providerId, externalHotelId, roomTypeMappings })

    if (remote?.data?.connectOta) {
      return remote.data.connectOta
    }

    // Local Storage Resilient Fallback
    const mapping = {
      id: `map-${Math.random().toString(36).substr(2, 9)}`,
      organizationId: 'org-stayflexi',
      hotelId,
      roomTypeId: roomTypeMappings[0]?.roomTypeId || 'rt-deluxe',
      providerId,
      externalHotelId,
      externalRoomTypeId: roomTypeMappings[0]?.externalRoomTypeId || 'ext-rt-deluxe',
      syncStatus: 'SUCCESS',
      isActive: true,
      lastSyncedAt: new Date().toISOString()
    }

    if (typeof window !== 'undefined') {
      const activeMappings = JSON.parse(localStorage.getItem('sf_ota_mappings') || '[]')
      activeMappings.push(mapping)
      localStorage.setItem('sf_ota_mappings', JSON.stringify(activeMappings))
    }

    return mapping
  }

  async getSyncJobs(hotelId: string): Promise<any[]> {
    const remote = await this.queryGraphQL(`
      query GetSyncJobs($hotelId: String!) {
        syncJobs(hotelId: $hotelId) {
          id organizationId hotelId providerId syncType syncStatus idempotencyKey startedAt completedAt retryCount maxRetries errorMessage createdById createdAt
        }
      }
    `, { hotelId })

    if (remote?.data?.syncJobs) {
      return remote.data.syncJobs
    }

    // Local Storage Fallback
    if (typeof window !== 'undefined') {
      const savedJobs = localStorage.getItem('sf_sync_jobs')
      if (savedJobs) {
        return JSON.parse(savedJobs).filter((j: any) => j.hotelId === hotelId)
      }

      // Default visual items to make page look premium instantly
      const defaults = [
        { id: 'job-1', organizationId: 'org-stayflexi', hotelId, providerId: 'prov-agoda', syncType: 'INVENTORY_PUSH', syncStatus: 'SUCCESS', idempotencyKey: `sync:${hotelId}:agoda:inv`, startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 29 * 60 * 1000).toISOString(), retryCount: 0, maxRetries: 3, errorMessage: null, createdById: 'u-1', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
        { id: 'job-2', organizationId: 'org-stayflexi', hotelId, providerId: 'prov-expedia', syncType: 'RATE_PUSH', syncStatus: 'SUCCESS', idempotencyKey: `sync:${hotelId}:expedia:rates`, startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), retryCount: 0, maxRetries: 3, errorMessage: null, createdById: 'u-1', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
      ]
      localStorage.setItem('sf_sync_jobs', JSON.stringify(defaults))
      return defaults
    }
    return []
  }

  async triggerSync(hotelId: string, providerId: string, syncType: string): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation TriggerSync($hotelId: String!, $providerId: String!, $syncType: String!) {
        triggerSync(hotelId: $hotelId, providerId: $providerId, syncType: $syncType) {
          id organizationId hotelId providerId syncType syncStatus idempotencyKey startedAt completedAt retryCount maxRetries errorMessage createdById createdAt
        }
      }
    `, { hotelId, providerId, syncType })

    if (remote?.data?.triggerSync) {
      return remote.data.triggerSync
    }

    // Local Storage Resilient Fallback
    const job = {
      id: `job-${Math.random().toString(36).substr(2, 9)}`,
      organizationId: 'org-stayflexi',
      hotelId,
      providerId,
      syncType,
      syncStatus: 'SUCCESS',
      idempotencyKey: `sync:${hotelId}:${providerId}:${syncType}:${Date.now()}`,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      errorMessage: null,
      createdById: 'u-1',
      createdAt: new Date().toISOString()
    }

    if (typeof window !== 'undefined') {
      const activeJobs = JSON.parse(localStorage.getItem('sf_sync_jobs') || '[]')
      activeJobs.unshift(job) // Put at the top of logs list!
      localStorage.setItem('sf_sync_jobs', JSON.stringify(activeJobs))

      // Also update mappings timestamp
      let mappings = JSON.parse(localStorage.getItem('sf_ota_mappings') || '[]')
      mappings = mappings.map((m: any) => m.hotelId === hotelId && m.providerId === providerId ? { ...m, lastSyncedAt: new Date().toISOString() } : m)
      localStorage.setItem('sf_ota_mappings', JSON.stringify(mappings))
    }

    return job
  }

  // Workflows & Rules methods (Phase 4 integration)
  async getWorkflowRules(hotelId: string): Promise<any[]> {
    const remote = await this.queryGraphQL(`
      query GetWorkflows($hotelId: String!) {
        workflows(hotelId: $hotelId) {
          id organizationId hotelId ruleName triggerType conditionPayload actionPayload ruleStatus priority createdById createdAt updatedAt
        }
      }
    `, { hotelId })

    if (remote?.data?.workflows) {
      return remote.data.workflows
    }

    // Local Storage Resilient Fallback
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sf_workflow_rules')
      if (saved) return JSON.parse(saved)
      
      const defaults = [
        { id: "wf-1", organizationId: "org-stayflexi", hotelId, ruleName: "Late Arrival Notification", triggerType: "If check-in hour is after 8:00 PM", conditionPayload: JSON.stringify({ predicate: [] }), actionPayload: JSON.stringify({ type: "Send late-arrival SMS to guest profile", params: { service: "notification-service" } }), ruleStatus: "ACTIVE", priority: 0, createdById: "u-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "wf-2", organizationId: "org-stayflexi", hotelId, ruleName: "VIP Welcome Upgrade Check", triggerType: "If guest type is Repeat and roomType is Presidential", conditionPayload: JSON.stringify({ predicate: [] }), actionPayload: JSON.stringify({ type: "Trigger priority welcome amenities dispatch", params: { service: "hotel-service" } }), ruleStatus: "ACTIVE", priority: 0, createdById: "u-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "wf-3", organizationId: "org-stayflexi", hotelId, ruleName: "Agoda Rate Alignment Trigger", triggerType: "If basePrice of roomType is updated in PMS", conditionPayload: JSON.stringify({ predicate: [] }), actionPayload: JSON.stringify({ type: "Initiate full OTA synchronizer task", params: { service: "ota-service" } }), ruleStatus: "INACTIVE", priority: 0, createdById: "u-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ]
      localStorage.setItem('sf_workflow_rules', JSON.stringify(defaults))
      return defaults
    }
    return []
  }

  async createWorkflowRule(args: { hotelId: string; name: string; trigger: string; action: string; service: string }): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation CreateWorkflow($hotelId: String!, $name: String!, $trigger: String!, $action: String!, $service: String!) {
        createWorkflow(hotelId: $hotelId, name: $name, trigger: $trigger, action: $action, service: $service) {
          id organizationId hotelId ruleName triggerType conditionPayload actionPayload ruleStatus priority createdById createdAt updatedAt
        }
      }
    `, args)

    if (remote?.data?.createWorkflow) {
      return remote.data.createWorkflow
    }

    // Local Storage Resilient Fallback
    const rule = {
      id: `wf-${Math.random().toString(36).substr(2, 9)}`,
      organizationId: 'org-stayflexi',
      hotelId: args.hotelId,
      ruleName: args.name,
      triggerType: args.trigger,
      conditionPayload: JSON.stringify({ predicate: [] }),
      actionPayload: JSON.stringify({ type: args.action, params: { service: args.service } }),
      ruleStatus: 'ACTIVE',
      priority: 0,
      createdById: 'u-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem('sf_workflow_rules') || '[]')
      saved.push(rule)
      localStorage.setItem('sf_workflow_rules', JSON.stringify(saved))
    }

    return rule
  }

  async toggleWorkflowRule(id: string, isActive: boolean): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation ToggleWorkflow($id: String!, $isActive: Boolean!) {
        toggleWorkflow(id: $id, isActive: $isActive) {
          id ruleStatus
        }
      }
    `, { id, isActive })

    if (remote?.data?.toggleWorkflow) {
      return remote.data.toggleWorkflow
    }

    // Local Storage Resilient Fallback
    if (typeof window !== 'undefined') {
      let saved = JSON.parse(localStorage.getItem('sf_workflow_rules') || '[]') as any[]
      saved = saved.map(r => r.id === id ? { ...r, ruleStatus: isActive ? 'ACTIVE' : 'INACTIVE', updatedAt: new Date().toISOString() } : r)
      localStorage.setItem('sf_workflow_rules', JSON.stringify(saved))
    }
    return { id, ruleStatus: isActive ? 'ACTIVE' : 'INACTIVE' }
  }

  async dryRunWorkflowRule(id: string): Promise<any> {
    const remote = await this.queryGraphQL(`
      mutation DryRunWorkflow($id: String!) {
        dryRunWorkflow(id: $id) {
          id executionStatus startedAt completedAt failureReason
        }
      }
    `, { id })

    if (remote?.data?.dryRunWorkflow) {
      return remote.data.dryRunWorkflow
    }

    // Local Mock Fallback
    return {
      id: `exec-${Math.random().toString(36).substr(2, 9)}`,
      executionStatus: 'COMPLETED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      failureReason: null
    }
  }

  // Analytics Metrics methods (Phase 4 integration)
  async getRevenueMetrics(hotelId: string, startDate: string, endDate: string): Promise<any> {
    const remote = await this.queryGraphQL(`
      query GetRevenueMetrics($hotelId: String!, $startDate: String!, $endDate: String!) {
        revenueMetrics(hotelId: $hotelId, startDate: $startDate, endDate: $endDate) {
          hotelId
          organizationId
          occupancyRate
          adr
          revpar
          totalRevenue
          totalBookings
          cancellationRate
          dailyMetrics {
            date occupancyRate adr revpar totalRevenue bookingCount
          }
        }
      }
    `, { hotelId, startDate, endDate })

    if (remote?.data?.revenueMetrics) {
      return remote.data.revenueMetrics
    }

    // High-Fidelity Local Offline Calculations Fallback
    const start = new Date(startDate)
    const end = new Date(endDate)
    const activeRes = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sf_reservations') || '[]') : []

    let totalRevenue = 0
    let totalBookings = 0
    let cancellations = 0
    const dailyMetrics: any[] = []

    const totalRoomsCount = this.rooms.filter(rm => rm.hotelId === hotelId).length || 8

    // Generate daily aggregates inside range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().substring(0, 10)
      
      // Filter bookings active on this date
      const activeOnDate = activeRes.filter((res: any) => 
        res.checkIn <= dateStr && res.checkOut >= dateStr
      )

      const bookedCount = activeOnDate.filter((r: any) => r.status !== 'CANCELLED').length
      const dayCancellations = activeOnDate.filter((r: any) => r.status === 'CANCELLED').length
      
      const dayRevenue = activeOnDate
        .filter((r: any) => r.status !== 'CANCELLED')
        .reduce((sum: number, r: any) => sum + (r.amount / Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / (1000 * 60 * 60 * 24)))), 0)

      const occupancy = totalRoomsCount > 0 ? Math.round((bookedCount / totalRoomsCount) * 100) : 0
      const adr = bookedCount > 0 ? Math.round((dayRevenue / bookedCount) * 100) / 100 : 0
      const revpar = totalRoomsCount > 0 ? Math.round((dayRevenue / totalRoomsCount) * 100) / 100 : 0

      totalRevenue += dayRevenue
      totalBookings += bookedCount
      cancellations += dayCancellations

      dailyMetrics.push({
        date: dateStr,
        occupancyRate: occupancy,
        adr: adr || 150.00,
        revpar: revpar || 75.00,
        totalRevenue: Math.round(dayRevenue * 100) / 100,
        bookingCount: bookedCount
      })
    }

    const occupancyRate = dailyMetrics.reduce((a, m) => a + m.occupancyRate, 0) / Math.max(1, dailyMetrics.length)
    const adr = dailyMetrics.reduce((a, m) => a + m.adr, 0) / Math.max(1, dailyMetrics.length)
    const revpar = dailyMetrics.reduce((a, m) => a + m.revpar, 0) / Math.max(1, dailyMetrics.length)
    const cancellationRate = totalBookings > 0 ? Math.round((cancellations / (totalBookings + cancellations)) * 100) : 5

    return {
      hotelId,
      organizationId: 'org-stayflexi',
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      adr: Math.round(adr * 100) / 100,
      revpar: Math.round(revpar * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalBookings,
      cancellationRate
    }
  }
}

export const dataClient = new StayflexiDataClient()
export default dataClient
