import { PrismaClient, type HotelCategory, type BedType } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['warn', 'error'],
})

export async function seedHospitalitySimulation(): Promise<void> {
  console.warn('[simulation-seed] Starting rich hospitality simulation seeding...')

  // 1. Seed Demo Executive Owner User
  const demoOwner = await prisma.user.upsert({
    where: { email: 'executive@stayflexi.com' },
    update: {},
    create: {
      email: 'executive@stayflexi.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      firstName: 'Alexander',
      lastName: 'Sterling',
      phone: '+1-415-555-0100',
      primaryRole: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  })

  console.warn(`[simulation-seed] Executive Owner "${demoOwner.email}" ready.`)

  // 2. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'stayflexi-global-resorts' },
    update: {},
    create: {
      name: 'Stayflexi Global Resorts & Luxury Hotels',
      legalName: 'Stayflexi International Hospitality Inc.',
      slug: 'stayflexi-global-resorts',
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
      email: 'corporate@stayflexi.com',
      phone: '+1-800-555-7829',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      addressLine1: '100 Embarcadero Plaza',
      postalCode: '94105',
      maxHotels: 10,
      ownerId: demoOwner.id,
    },
  })

  console.warn(`[simulation-seed] Organization "${org.name}" ready.`)

  // 3. Multi-Property Hotels
  const hotelConfigs: Array<{
    name: string
    slug: string
    hotelCode: string
    category: HotelCategory
    starRating: number
    email: string
    phone: string
    city: string
    state: string
    country: string
    addressLine1: string
    postalCode: string
    timezone: string
    currency: string
    checkInTime: string
    checkOutTime: string
    amenities: string[]
  }> = [
    {
      name: 'The Grand Stayflexi Waterfront Resort',
      slug: 'grand-stayflexi-waterfront',
      hotelCode: 'SFO-WFR',
      category: 'RESORT',
      starRating: 5,
      email: 'waterfront.sfo@stayflexi.com',
      phone: '+1-415-555-0199',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      addressLine1: '100 Embarcadero Plaza',
      postalCode: '94105',
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      amenities: ['WIFI', 'POOL', 'SPA', 'OCEAN_VIEW', 'GYM', 'VALET_PARKING', 'RESTAURANT'],
    },
    {
      name: 'Stayflexi Alpine Luxury Chalet & Spa',
      slug: 'alpine-luxury-chalet',
      hotelCode: 'ZRH-ALP',
      category: 'BOUTIQUE',
      starRating: 5,
      email: 'chalet.zrh@stayflexi.com',
      phone: '+41-44-555-8900',
      city: 'Zermatt',
      state: 'Valais',
      country: 'CH',
      addressLine1: '42 Matterhorn Strasse',
      postalCode: '3920',
      timezone: 'Europe/Zurich',
      currency: 'EUR',
      checkInTime: '14:00',
      checkOutTime: '10:00',
      amenities: ['WIFI', 'SAUNA', 'SKI_STORAGE', 'FIREPLACE', 'SPA', 'GOURMET_DINING'],
    },
    {
      name: 'Stayflexi Royal Palace & Convention Hotel',
      slug: 'royal-palace-hotel',
      hotelCode: 'BLR-RYL',
      category: 'LUXURY',
      starRating: 5,
      email: 'royalpalace.blr@stayflexi.com',
      phone: '+91-80-5555-4321',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'IN',
      addressLine1: '1 Palace Road, High Grounds',
      postalCode: '560001',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      amenities: ['WIFI', 'SWIMMING_POOL', 'BUSINESS_CENTER', 'AYURVEDIC_SPA', 'BANQUET_HALL'],
    },
  ]

  for (const hConfig of hotelConfigs) {
    const hotel = await prisma.hotel.upsert({
      where: {
        organizationId_slug: {
          organizationId: org.id,
          slug: hConfig.slug,
        },
      },
      update: { totalRooms: 12 },
      create: {
        ...hConfig,
        organizationId: org.id,
        status: 'ACTIVE',
        operationalStatus: 'OPEN',
        totalRooms: 12,
      },
    })

    console.warn(`[simulation-seed] Hotel "${hotel.name}" seeded.`)

    // 4. Room Types
    const roomTypeConfigs: Array<{
      name: string
      slug: string
      description: string
      basePrice: number
      maxOccupancy: number
      maxAdults: number
      maxChildren: number
      bedType: BedType
      totalRooms: number
      amenities: string[]
    }> = [
      {
        name: 'Deluxe King Suite',
        slug: `${hConfig.slug}-deluxe-king`,
        description: 'Spacious master bedroom with California King bed and panoramic views.',
        basePrice: 280.0,
        maxOccupancy: 2,
        maxAdults: 2,
        maxChildren: 1,
        bedType: 'KING',
        totalRooms: 4,
        amenities: ['BALCONY', 'ESPRESSO_MACHINE', 'MINIBAR', 'KING_BED', 'SMART_TV'],
      },
      {
        name: 'Executive Ocean/Mountain Suite',
        slug: `${hConfig.slug}-executive-suite`,
        description: 'Luxury corner suite with separate living area, work desk, and jacuzzi.',
        basePrice: 450.0,
        maxOccupancy: 4,
        maxAdults: 3,
        maxChildren: 2,
        bedType: 'KING',
        totalRooms: 4,
        amenities: ['JACUZZI', 'LIVING_ROOM', 'LOUNGE_ACCESS', 'HIGH_SPEED_WIFI'],
      },
      {
        name: 'Presidential Penthouse Villa',
        slug: `${hConfig.slug}-presidential-villa`,
        description:
          'Top-floor penthouse with private terrace, personal butler service, and private plunge pool.',
        basePrice: 1200.0,
        maxOccupancy: 6,
        maxAdults: 4,
        maxChildren: 3,
        bedType: 'CALIFORNIA_KING',
        totalRooms: 4,
        amenities: ['PRIVATE_POOL', 'TERRACE', 'BUTLER_SERVICE', 'PRIVATE_CHEF'],
      },
    ]

    for (const rtConfig of roomTypeConfigs) {
      const roomType = await prisma.roomType.upsert({
        where: {
          hotelId_slug: {
            hotelId: hotel.id,
            slug: rtConfig.slug,
          },
        },
        update: {
          basePrice: rtConfig.basePrice,
          totalRooms: rtConfig.totalRooms,
        },
        create: {
          ...rtConfig,
          hotelId: hotel.id,
          organizationId: org.id,
          status: 'ACTIVE',
        },
      })

      // 5. Physical Rooms
      for (let i = 1; i <= 4; i++) {
        const floor = i <= 2 ? 1 : 2
        const roomNumber = `${floor}0${i}`

        await prisma.room.upsert({
          where: {
            hotelId_roomNumber: {
              hotelId: hotel.id,
              roomNumber,
            },
          },
          update: {
            operationalStatus: 'AVAILABLE',
            housekeepingStatus: 'CLEAN',
          },
          create: {
            hotelId: hotel.id,
            organizationId: org.id,
            roomTypeId: roomType.id,
            roomNumber,
            floor,
            operationalStatus: 'AVAILABLE',
            housekeepingStatus: 'CLEAN',
            maintenanceStatus: 'NONE',
            occupancyStatus: 'VACANT',
          },
        })
      }
    }
  }

  console.warn('[simulation-seed] Multi-Property simulation seeding completed successfully!')
}

async function runStandalone(): Promise<void> {
  try {
    await seedHospitalitySimulation()
  } catch (err) {
    console.error('[simulation-seed] Error during simulation seed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

void runStandalone()
