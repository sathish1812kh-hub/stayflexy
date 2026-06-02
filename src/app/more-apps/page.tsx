'use client'

import React, { useEffect, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import dataClient, { Hotel, Room, RoomType } from '../dataClient'
import {
  ClipboardList,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  CreditCard,
  Sliders,
  Receipt,
  Package,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  DollarSign,
  Star,
  Activity,
  ArrowRight,
  ShieldAlert,
  Inbox,
  FileText
} from 'lucide-react'

// Types
interface Reservation {
  id: string
  guestName: string
  roomNumber: string
  roomId: string
  checkIn: string
  checkOut: string
  status: string
  amount: number
  charges?: { name: string; amount: number; timestamp: string }[]
  payments?: { method: string; amount: number; timestamp: string; txnId: string }[]
}

interface HousekeepingTask {
  id: string
  cleanerName: string
  roomNumber: string
  roomId: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'IN_PROGRESS' | 'DONE'
}

interface PosProduct {
  id: string
  name: string
  price: number
  category: string
}

interface CartItem {
  product: PosProduct
  quantity: number
}

interface ReviewItem {
  id: string
  source: 'Google' | 'TripAdvisor' | 'Booking.com'
  rating: number
  comment: string
  sentiment: 'positive' | 'neutral' | 'negative'
  reply: string | null
  status: 'pending' | 'replied'
}

interface PaymentTransaction {
  id: string
  guestName: string
  method: 'CASH' | 'CARD' | 'ONLINE'
  amount: number
  status: 'SUCCESS' | 'HELD' | 'REFUNDED'
  timestamp: string
}

interface ExpenseItem {
  id: string
  category: 'Utilities' | 'Salaries' | 'Inventory' | 'Maintenance' | 'Marketing'
  amount: number
  description: string
  timestamp: string
  receiptName?: string
}

interface StockItem {
  id: string
  name: string
  current: number
  target: number
  category: string
}

export default function MoreAppsPage() {
  const [activeApp, setActiveApp] = useState<
    'housekeeping' | 'reports' | 'shops' | 'revenue' | 'reviews' | 'payments' | 'config' | 'expense' | 'stock'
  >('housekeeping')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const app = params.get('app') as any
      if (app && ['housekeeping', 'reports', 'shops', 'revenue', 'reviews', 'payments', 'config', 'expense', 'stock'].includes(app)) {
        setActiveApp(app)
        const reviewId = params.get('reviewId')
        if (app === 'reviews' && reviewId) {
          setRespondingReviewId(reviewId)
        }
      }
    }
  }, [])

  const [hotels, setHotels] = useState<Hotel[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])

  // Reports Console State
  const [startDate, setStartDate] = useState('2026-05-20')
  const [endDate, setEndDate] = useState('2026-05-30')
  const [reportsSubTab, setReportsSubTab] = useState<'financial' | 'operations' | 'distribution'>('financial')
  const [aiReportsPrompt, setAiReportsPrompt] = useState('')
  const [aiReportsResponse, setAiReportsResponse] = useState('')
  const [loadingReportsAi, setLoadingReportsAi] = useState(false)

  // Property Configurations State
  const [propCheckIn, setPropCheckIn] = useState('14:00')
  const [propCheckOut, setPropCheckOut] = useState('11:00')
  const [propTaxRate, setPropTaxRate] = useState('12')
  const [lockVendor, setLockVendor] = useState('Yale')
  const [lockEndpoint, setLockEndpoint] = useState('https://api.yale-iot.stayflexi.com/v2/keys')
  const [lockAuthType, setLockAuthType] = useState<'api_key' | 'oauth2'>('oauth2')
  const [lockClientId, setLockClientId] = useState('yale_sf_client_dev')
  const [lockClientSecret, setLockClientSecret] = useState('yale_dev_secret_keys')
  const [lockApiKey, setLockApiKey] = useState('sf_key_static_token_xyz')
  const [earlyCheckInRate, setEarlyCheckInRate] = useState('15.00')
  const [lateCheckOutRate, setLateCheckOutRate] = useState('20.00')
  const [foodTaxRate, setFoodTaxRate] = useState('5.00')
  const [serviceFee, setServiceFee] = useState('10.00')
  const [wifiSsid, setWifiSsid] = useState('Stayflexi_Guest_HighSpeed')
  const [wifiPassword, setWifiPassword] = useState('stayflexy_goa_2026')
  const [portalGreeting, setPortalGreeting] = useState('Welcome to Stayflexi Goan Sands Resort!')
  const [activeConfigTab, setActiveConfigTab] = useState<'ops' | 'tax' | 'iot' | 'portal'>('ops')
  const [iotDebugLogs, setIotDebugLogs] = useState<string[]>([
    'System initialized. Connection to IoT Lock gateway standby...',
    'Yale Smartlock controller v2.4 initialized. Ready to sync keys.',
  ])
  const [testingLockConn, setTestingLockConn] = useState(false)
  const [lockProgress, setLockProgress] = useState(0)

  // Shops POS States
  const [posProducts, setPosProducts] = useState<PosProduct[]>([])
  const [posCart, setPosCart] = useState<CartItem[]>([])
  const [chargeGuestId, setChargeGuestId] = useState('')
  const [activeShopCategory, setActiveShopCategory] = useState('All')
  const [shopSearchQuery, setShopSearchQuery] = useState('')
  const [posDiscount, setPosDiscount] = useState('0')
  const [shopsSubTab, setShopsSubTab] = useState<'terminal' | 'manage'>('terminal')
  
  // Product editor states
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('')
  const [newProdCat, setNewProdCat] = useState('Minibar')

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptDetails, setReceiptDetails] = useState<{
    id: string
    guestName: string
    settlementType: string
    items: { name: string; quantity: number; price: number }[]
    subtotal: number
    discount: number
    tax: number
    total: number
    timestamp: string
  } | null>(null)

  // Revenue Yield states
  const [rateMultiplier, setRateMultiplier] = useState(1.10)
  const [otaBoostPct, setOtaBoostPct] = useState(10)
  const [autoPilotYield, setAutoPilotYield] = useState(false)
  const [competitors, setCompetitors] = useState([
    { name: 'Goa Marriott Beach Resort', rate: 190, ourOffset: 0 },
    { name: 'Grand Hyatt Bambolim', rate: 240, ourOffset: 0 },
    { name: 'Radisson Blu Resort Goa', rate: 175, ourOffset: 0 }
  ])

  // Load database structures
  useEffect(() => {
    async function loadData() {
      const h = await dataClient.getHotels()
      const r = await dataClient.getRooms()
      const rt = await dataClient.getRoomTypes()
      setHotels(h)
      setRooms(r)
      setRoomTypes(rt)
      
      const savedRes = localStorage.getItem('sf_reservations')
      if (savedRes) setReservations(JSON.parse(savedRes))

      // Sync and load catalog items
      const savedCatalog = localStorage.getItem('sf_pos_catalog')
      if (savedCatalog) {
        setPosProducts(JSON.parse(savedCatalog))
      } else {
        const defaults: PosProduct[] = [
          { id: 'prod-water', name: 'Premium Mineral Water', price: 3.50, category: 'Minibar' },
          { id: 'prod-beer', name: 'Local Craft Beer', price: 6.00, category: 'Minibar' },
          { id: 'prod-breakfast', name: 'Buffet Breakfast Ticket', price: 15.00, category: 'Restaurant' },
          { id: 'prod-spa', name: 'Aroma Therapy Spa Massage', price: 65.00, category: 'Spa' },
          { id: 'prod-gift', name: 'Stayflexi Coffee Mug', price: 12.00, category: 'Souvenirs' }
        ]
        setPosProducts(defaults)
        localStorage.setItem('sf_pos_catalog', JSON.stringify(defaults))
      }

      // Sync and load property config specs
      const savedPropConfigs = localStorage.getItem('sf_property_configs')
      if (savedPropConfigs) {
        try {
          const parsed = JSON.parse(savedPropConfigs)
          if (parsed.propCheckIn) setPropCheckIn(parsed.propCheckIn)
          if (parsed.propCheckOut) setPropCheckOut(parsed.propCheckOut)
          if (parsed.propTaxRate) setPropTaxRate(parsed.propTaxRate)
          if (parsed.lockVendor) setLockVendor(parsed.lockVendor)
          if (parsed.lockEndpoint) setLockEndpoint(parsed.lockEndpoint)
          if (parsed.lockAuthType) setLockAuthType(parsed.lockAuthType)
          if (parsed.lockClientId) setLockClientId(parsed.lockClientId)
          if (parsed.lockClientSecret) setLockClientSecret(parsed.lockClientSecret)
          if (parsed.lockApiKey) setLockApiKey(parsed.lockApiKey)
          if (parsed.earlyCheckInRate) setEarlyCheckInRate(parsed.earlyCheckInRate)
          if (parsed.lateCheckOutRate) setLateCheckOutRate(parsed.lateCheckOutRate)
          if (parsed.foodTaxRate) setFoodTaxRate(parsed.foodTaxRate)
          if (parsed.serviceFee) setServiceFee(parsed.serviceFee)
          if (parsed.wifiSsid) setWifiSsid(parsed.wifiSsid)
          if (parsed.wifiPassword) setWifiPassword(parsed.wifiPassword)
          if (parsed.portalGreeting) setPortalGreeting(parsed.portalGreeting)
        } catch (e) {
          console.error(e)
        }
      }

      // Sync and load revenue configs
      const savedRevConfigs = localStorage.getItem('sf_revenue_configs')
      if (savedRevConfigs) {
        try {
          const parsed = JSON.parse(savedRevConfigs)
          if (parsed.rateMultiplier !== undefined) setRateMultiplier(parsed.rateMultiplier)
          if (parsed.otaBoostPct !== undefined) setOtaBoostPct(parsed.otaBoostPct)
          if (parsed.autoPilotYield !== undefined) setAutoPilotYield(parsed.autoPilotYield)
        } catch (e) {
          console.error(e)
        }
      }
    }
    loadData()
  }, [])



  const saveReservations = (updated: Reservation[]) => {
    setReservations(updated)
    localStorage.setItem('sf_reservations', JSON.stringify(updated))
  }

  // ----------------------------------------------------
  // APP 1: Housekeeping Task Registry & States
  // ----------------------------------------------------
  const [hkTasks, setHkTasks] = useState<HousekeepingTask[]>([])
  const [cleanerInput, setCleanerInput] = useState('')
  const [targetRoomInput, setTargetRoomInput] = useState('')
  const [priorityInput, setPriorityInput] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')
  const [hkSubTab, setHkSubTab] = useState<'charter' | 'mobile' | 'configs'>('charter')
  const [activeCleaner, setActiveCleaner] = useState('Ramesh Kumar')
  const [bulkSelectedRoomIds, setBulkSelectedRoomIds] = useState<string[]>([])
  const [aiCommandInput, setAiCommandInput] = useState('')

  // Maintenance & Audits State
  const [maintenanceTickets, setMaintenanceTickets] = useState<any[]>([])
  const [hkAuditLogs, setHkAuditLogs] = useState<any[]>([])
  const [hkConfig, setHkConfig] = useState({
    autoDirtyOnCheckout: true,
    autoDirtyOnDailyAudit: false,
    alertIntervalMinutes: 30
  })

  // Timer states for mobile cleaning
  const [cleaningStartTime, setCleaningStartTime] = useState<string | null>(null)
  const [mobileTaskChecklist, setMobileTaskChecklist] = useState({
    bedding: false,
    minibar: false,
    bathroom: false,
    dusting: false
  })

  // Popover form states
  const [maintenanceRoomInput, setMaintenanceRoomInput] = useState('')
  const [maintenanceDesc, setMaintenanceDesc] = useState('')
  const [maintenancePriority, setMaintenancePriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')

  useEffect(() => {
    // Sync storage events
    const handleSync = () => {
      const savedTasks = localStorage.getItem('sf_hk_tasks')
      if (savedTasks) setHkTasks(JSON.parse(savedTasks))
      
      const savedTickets = localStorage.getItem('sf_maintenance_tickets')
      if (savedTickets) setMaintenanceTickets(JSON.parse(savedTickets))

      const savedLogs = localStorage.getItem('sf_hk_audit_logs')
      if (savedLogs) setHkAuditLogs(JSON.parse(savedLogs))

      const savedConfig = localStorage.getItem('sf_hk_config')
      if (savedConfig) setHkConfig(JSON.parse(savedConfig))

      const savedCatalog = localStorage.getItem('sf_pos_catalog')
      if (savedCatalog) setPosProducts(JSON.parse(savedCatalog))

      const savedExpenses = localStorage.getItem('sf_expenses')
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses))

      const savedBudgets = localStorage.getItem('sf_expense_budgets')
      if (savedBudgets) {
        try {
          const parsed = JSON.parse(savedBudgets)
          setExpenseBudgets(parsed)
          setTempBudgets(parsed)
        } catch (e) {
          console.error(e)
        }
      }

      const savedPropConfigs = localStorage.getItem('sf_property_configs')
      if (savedPropConfigs) {
        try {
          const parsed = JSON.parse(savedPropConfigs)
          if (parsed.propCheckIn) setPropCheckIn(parsed.propCheckIn)
          if (parsed.propCheckOut) setPropCheckOut(parsed.propCheckOut)
          if (parsed.propTaxRate) setPropTaxRate(parsed.propTaxRate)
          if (parsed.lockVendor) setLockVendor(parsed.lockVendor)
          if (parsed.lockEndpoint) setLockEndpoint(parsed.lockEndpoint)
          if (parsed.lockAuthType) setLockAuthType(parsed.lockAuthType)
          if (parsed.lockClientId) setLockClientId(parsed.lockClientId)
          if (parsed.lockClientSecret) setLockClientSecret(parsed.lockClientSecret)
          if (parsed.lockApiKey) setLockApiKey(parsed.lockApiKey)
          if (parsed.earlyCheckInRate) setEarlyCheckInRate(parsed.earlyCheckInRate)
          if (parsed.lateCheckOutRate) setLateCheckOutRate(parsed.lateCheckOutRate)
          if (parsed.foodTaxRate) setFoodTaxRate(parsed.foodTaxRate)
          if (parsed.serviceFee) setServiceFee(parsed.serviceFee)
          if (parsed.wifiSsid) setWifiSsid(parsed.wifiSsid)
          if (parsed.wifiPassword) setWifiPassword(parsed.wifiPassword)
          if (parsed.portalGreeting) setPortalGreeting(parsed.portalGreeting)
        } catch (e) {
          console.error(e)
        }
      }

      const savedRevConfigs = localStorage.getItem('sf_revenue_configs')
      if (savedRevConfigs) {
        try {
          const parsed = JSON.parse(savedRevConfigs)
          if (parsed.rateMultiplier !== undefined) setRateMultiplier(parsed.rateMultiplier)
          if (parsed.otaBoostPct !== undefined) setOtaBoostPct(parsed.otaBoostPct)
          if (parsed.autoPilotYield !== undefined) setAutoPilotYield(parsed.autoPilotYield)
        } catch (e) {
          console.error(e)
        }
      }

      const savedStock = localStorage.getItem('sf_stock_inventory')
      if (savedStock) setStockItems(JSON.parse(savedStock))

      const savedStockLogs = localStorage.getItem('sf_stock_logs')
      if (savedStockLogs) setStockLogs(JSON.parse(savedStockLogs))
    }
    
    handleSync()
    window.addEventListener('storage', handleSync)
    window.addEventListener('sf-database-updated', handleSync)
    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('sf-database-updated', handleSync)
    }
  }, [])

  // Initialization helper
  useEffect(() => {
    if (!localStorage.getItem('sf_hk_tasks')) {
      const defaults: HousekeepingTask[] = [
        { id: 'hk-1', cleanerName: 'Ramesh Kumar', roomNumber: '103', roomId: 'r-103', priority: 'HIGH', status: 'IN_PROGRESS' }
      ]
      setHkTasks(defaults)
      localStorage.setItem('sf_hk_tasks', JSON.stringify(defaults))
    }
    if (!localStorage.getItem('sf_maintenance_tickets')) {
      const defaults = [
        { id: 'tkt-1', roomId: 'r-104', roomNumber: '104', description: 'AC unit leakage water dripping', priority: 'HIGH', status: 'OPEN', dateLogged: new Date().toISOString() }
      ]
      setMaintenanceTickets(defaults)
      localStorage.setItem('sf_maintenance_tickets', JSON.stringify(defaults))
    }
    if (!localStorage.getItem('sf_hk_audit_logs')) {
      const defaults = [
        { id: 'log-1', roomNumber: '101', cleanerName: 'Ramesh Kumar', startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 1800000).toISOString(), durationSeconds: 1800 }
      ]
      setHkAuditLogs(defaults)
      localStorage.setItem('sf_hk_audit_logs', JSON.stringify(defaults))
    }
  }, [])

  const broadcastDatabaseUpdate = () => {
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('sf-database-updated'))
  }

  const handleAssignHkTask = async () => {
    if (!cleanerInput || !targetRoomInput) {
      alert("Please select cleaner and room.")
      return
    }
    const rm = rooms.find(r => r.id === targetRoomInput)
    if (!rm) return

    const newTask: HousekeepingTask = {
      id: `hk-${Math.random().toString(36).substring(2, 7)}`,
      cleanerName: cleanerInput,
      roomNumber: rm.roomNumber,
      roomId: rm.id,
      priority: priorityInput,
      status: 'IN_PROGRESS'
    }

    const updated = [...hkTasks, newTask]
    setHkTasks(updated)
    localStorage.setItem('sf_hk_tasks', JSON.stringify(updated))
    
    // Update room status to HOUSEKEEPING
    await dataClient.updateRoomStatus(rm.id, 'HOUSEKEEPING')
    const updatedRooms = await dataClient.getRooms()
    setRooms(updatedRooms)
    
    setCleanerInput('')
    setTargetRoomInput('')
    broadcastDatabaseUpdate()
  }

  const handleStartCleaningTask = (taskId: string) => {
    setCleaningStartTime(new Date().toISOString())
    setMobileTaskChecklist({
      bedding: false,
      minibar: false,
      bathroom: false,
      dusting: false
    })
    
    const updated = hkTasks.map(t => t.id === taskId ? { ...t, status: 'IN_PROGRESS' as const } : t)
    setHkTasks(updated)
    localStorage.setItem('sf_hk_tasks', JSON.stringify(updated))
    broadcastDatabaseUpdate()
  }

  const handleCompleteHkTask = async (taskId: string, roomId: string) => {
    const task = hkTasks.find(t => t.id === taskId)
    if (!task) return

    const updated = hkTasks.map(t => t.id === taskId ? { ...t, status: 'DONE' as const } : t)
    setHkTasks(updated)
    localStorage.setItem('sf_hk_tasks', JSON.stringify(updated))

    // Set room clean / AVAILABLE
    await dataClient.updateRoomStatus(roomId, 'AVAILABLE')
    const updatedRooms = await dataClient.getRooms()
    setRooms(updatedRooms)

    // Log to Audit Logs
    const completedAt = new Date().toISOString()
    const startedAt = cleaningStartTime || new Date(Date.now() - 1200000).toISOString() // 20m default
    const durationSeconds = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)

    const newAuditLog = {
      id: `log-${Math.random().toString(36).substring(2, 7)}`,
      roomNumber: task.roomNumber,
      cleanerName: task.cleanerName,
      startedAt,
      completedAt,
      durationSeconds
    }

    const updatedLogs = [newAuditLog, ...hkAuditLogs]
    setHkAuditLogs(updatedLogs)
    localStorage.setItem('sf_hk_audit_logs', JSON.stringify(updatedLogs))

    setCleaningStartTime(null)
    setMobileTaskChecklist({
      bedding: false,
      minibar: false,
      bathroom: false,
      dusting: false
    })

    alert(`Room ${task.roomNumber} marked clean. Time elapsed: ${Math.round(durationSeconds/60)} minutes.`)
    broadcastDatabaseUpdate()
  }

  const handleLogMaintenanceTicket = async () => {
    if (!maintenanceRoomInput || !maintenanceDesc) {
      alert("Please select room and describe the maintenance issue.")
      return
    }
    const rm = rooms.find(r => r.id === maintenanceRoomInput)
    if (!rm) return

    const newTicket = {
      id: `tkt-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      roomId: rm.id,
      roomNumber: rm.roomNumber,
      description: maintenanceDesc,
      priority: maintenancePriority,
      status: 'OPEN',
      dateLogged: new Date().toISOString()
    }

    const updatedTickets = [newTicket, ...maintenanceTickets]
    setMaintenanceTickets(updatedTickets)
    localStorage.setItem('sf_maintenance_tickets', JSON.stringify(updatedTickets))

    // Set room status to MAINTENANCE
    await dataClient.updateRoomStatus(rm.id, 'MAINTENANCE')
    const updatedRooms = await dataClient.getRooms()
    setRooms(updatedRooms)

    setMaintenanceRoomInput('')
    setMaintenanceDesc('')
    alert(`Out-of-order logged for Room ${rm.roomNumber}. Room locked in PMS.`)
    broadcastDatabaseUpdate()
  }

  const handleReleaseMaintenanceRoom = async (ticketId: string, roomId: string) => {
    const updatedTickets = maintenanceTickets.map(t => t.id === ticketId ? { ...t, status: 'RESOLVED' } : t)
    setMaintenanceTickets(updatedTickets)
    localStorage.setItem('sf_maintenance_tickets', JSON.stringify(updatedTickets))

    // Set room to AVAILABLE (Clean)
    await dataClient.updateRoomStatus(roomId, 'AVAILABLE')
    const updatedRooms = await dataClient.getRooms()
    setRooms(updatedRooms)

    alert("Room released from maintenance. Status set to Clean & Available.")
    broadcastDatabaseUpdate()
  }

  const handleBulkMarkStatus = async (status: Room['status']) => {
    if (bulkSelectedRoomIds.length === 0) {
      alert("No rooms selected.")
      return
    }

    for (const rId of bulkSelectedRoomIds) {
      await dataClient.updateRoomStatus(rId, status)
    }

    const updatedRooms = await dataClient.getRooms()
    setRooms(updatedRooms)
    setBulkSelectedRoomIds([])
    alert(`Bulk updated ${bulkSelectedRoomIds.length} rooms to status: ${status}.`)
    broadcastDatabaseUpdate()
  }

  const handleBulkAssignCleaners = (cleaner: string) => {
    if (bulkSelectedRoomIds.length === 0 || !cleaner) {
      alert("Please select rooms and cleaner.")
      return
    }

    const newTasks: HousekeepingTask[] = []
    bulkSelectedRoomIds.forEach(rId => {
      const rm = rooms.find(r => r.id === rId)
      if (rm) {
        newTasks.push({
          id: `hk-${Math.random().toString(36).substring(2, 7)}`,
          cleanerName: cleaner,
          roomNumber: rm.roomNumber,
          roomId: rm.id,
          priority: 'MEDIUM',
          status: 'IN_PROGRESS'
        })
        // Set room status to Housekeeping
        dataClient.updateRoomStatus(rm.id, 'HOUSEKEEPING')
      }
    })

    const updated = [...hkTasks, ...newTasks]
    setHkTasks(updated)
    localStorage.setItem('sf_hk_tasks', JSON.stringify(updated))

    dataClient.getRooms().then(updatedRooms => {
      setRooms(updatedRooms)
    })
    setBulkSelectedRoomIds([])
    alert(`Bulk assigned ${newTasks.length} rooms to cleaner ${cleaner}.`)
    broadcastDatabaseUpdate()
  }

  const handleAiCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiCommandInput) return

    const lower = aiCommandInput.toLowerCase()
    
    // Pattern 1: assign [cleaner] to room [roomNumber]
    const assignMatch = lower.match(/assign\s+([a-zA-Z\s]+)\s+to\s+room\s+(\d+)/)
    if (assignMatch) {
      const cleaner = assignMatch[1]!.trim()
      const roomNum = assignMatch[2]!.trim()
      const targetRoom = rooms.find(r => r.roomNumber === roomNum)
      if (targetRoom) {
        const newTask: HousekeepingTask = {
          id: `hk-${Math.random().toString(36).substring(2, 7)}`,
          cleanerName: cleaner.charAt(0).toUpperCase() + cleaner.slice(1),
          roomNumber: targetRoom.roomNumber,
          roomId: targetRoom.id,
          priority: 'MEDIUM',
          status: 'IN_PROGRESS'
        }
        const updated = [...hkTasks, newTask]
        setHkTasks(updated)
        localStorage.setItem('sf_hk_tasks', JSON.stringify(updated))
        await dataClient.updateRoomStatus(targetRoom.id, 'HOUSEKEEPING')
        const updatedRooms = await dataClient.getRooms()
        setRooms(updatedRooms)
        alert(`AI Executed: Assigned ${cleaner} to Room ${roomNum}`)
        setAiCommandInput('')
        broadcastDatabaseUpdate()
        return
      }
    }

    // Pattern 2: mark room [roomNumber] as [clean/dirty/ooo]
    const markMatch = lower.match(/mark\s+room\s+(\d+)\s+as\s+(\w+)/)
    if (markMatch) {
      const roomNum = markMatch[1]!.trim()
      const targetStatus = markMatch[2]!.trim()
      const targetRoom = rooms.find(r => r.roomNumber === roomNum)
      if (targetRoom) {
        let statusToApply: Room['status'] = 'AVAILABLE'
        if (targetStatus === 'dirty' || targetStatus === 'housekeeping') statusToApply = 'HOUSEKEEPING'
        else if (targetStatus === 'ooo' || targetStatus === 'maintenance') statusToApply = 'MAINTENANCE'
        
        await dataClient.updateRoomStatus(targetRoom.id, statusToApply)
        const updatedRooms = await dataClient.getRooms()
        setRooms(updatedRooms)
        alert(`AI Executed: Marked Room ${roomNum} as ${statusToApply}`)
        setAiCommandInput('')
        broadcastDatabaseUpdate()
        return
      }
    }

    alert("Could not parse AI command. Use formats: \n1. 'assign Ramesh to room 103'\n2. 'mark room 104 as dirty/clean/ooo'")
  }

  // ----------------------------------------------------
  // APP 2: Shops POS State Variables & Catalog Manager
  // ----------------------------------------------------
  const handleAddToCart = (prod: PosProduct) => {
    const index = posCart.findIndex(item => item.product.id === prod.id)
    if (index > -1) {
      const updated = [...posCart]
      updated[index]!.quantity += 1
      setPosCart(updated)
    } else {
      setPosCart([...posCart, { product: prod, quantity: 1 }])
    }
  }

  const handleDecrementCart = (prodId: string) => {
    const index = posCart.findIndex(item => item.product.id === prodId)
    if (index > -1) {
      const updated = [...posCart]
      if (updated[index]!.quantity > 1) {
        updated[index]!.quantity -= 1
        setPosCart(updated)
      } else {
        setPosCart(posCart.filter(item => item.product.id !== prodId))
      }
    }
  }

  const handleRemoveFromCart = (prodId: string) => {
    setPosCart(posCart.filter(item => item.product.id !== prodId))
  }

  // Calculate cart metrics based on propTaxRate
  const getCartMetrics = () => {
    const subtotal = posCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    const discPct = parseFloat(posDiscount) || 0
    const discountVal = subtotal * (discPct / 100)
    const taxableAmount = subtotal - discountVal
    const taxPct = parseFloat(propTaxRate) || 0
    const taxVal = taxableAmount * (taxPct / 100)
    const total = taxableAmount + taxVal
    return { subtotal, discountVal, taxVal, total }
  }

  // Settle direct checkout (Cash or Card)
  const handleDirectPOSPayment = (paymentMethod: 'CASH' | 'CARD') => {
    if (posCart.length === 0) return
    const { subtotal, discountVal, taxVal, total } = getCartMetrics()
    
    // Create new payment transaction record
    const newTx: PaymentTransaction = {
      id: `tx-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      guestName: 'POS Walk-in Guest',
      method: paymentMethod,
      amount: total,
      status: 'SUCCESS',
      timestamp: new Date().toISOString()
    }
    
    const updatedPayments = [newTx, ...paymentsList]
    setPaymentsList(updatedPayments)
    localStorage.setItem('sf_pos_payments', JSON.stringify(updatedPayments))
    
    // Set receipt info
    setReceiptDetails({
      id: `REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      guestName: 'POS Walk-in Guest',
      settlementType: paymentMethod,
      items: posCart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      subtotal,
      discount: discountVal,
      tax: taxVal,
      total,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString()
    })
    
    setShowReceipt(true)
    setPosCart([])
    setPosDiscount('0')
    broadcastDatabaseUpdate()
  }

  // Settle guest folio charge
  const handlePostPosCharge = () => {
    if (posCart.length === 0) return
    if (!chargeGuestId) {
      alert("Please select a guest folio to charge.")
      return
    }

    const booking = reservations.find(r => r.id === chargeGuestId)
    if (!booking) return

    const { subtotal, discountVal, taxVal, total } = getCartMetrics()
    const charges = booking.charges || []
    
    // Apply discount & tax proportionally to the posted folio charge details
    const cartCharges = posCart.map(item => {
      const discPct = parseFloat(posDiscount) || 0
      const taxPct = parseFloat(propTaxRate) || 0
      const base = item.product.price * item.quantity
      const discountedBase = base * (1 - discPct / 100)
      const chargeFinal = discountedBase * (1 + taxPct / 100)
      return {
        name: `${item.product.name} (Qty x${item.quantity}) [Disc ${posDiscount}%, Tax ${propTaxRate}%] - POS Shop`,
        amount: chargeFinal,
        timestamp: new Date().toISOString()
      }
    })

    const updatedBooking = {
      ...booking,
      charges: [...charges, ...cartCharges]
    }

    const updatedList = reservations.map(r => r.id === chargeGuestId ? updatedBooking : r)
    saveReservations(updatedList)

    // Set receipt info
    setReceiptDetails({
      id: `REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      guestName: booking.guestName + ` (Room ${booking.roomNumber})`,
      settlementType: 'Folio Charged',
      items: posCart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      subtotal,
      discount: discountVal,
      tax: taxVal,
      total,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString()
    })

    setShowReceipt(true)
    setPosCart([])
    setChargeGuestId('')
    setPosDiscount('0')
    broadcastDatabaseUpdate()
  }

  // Catalog CRUD Operations
  const handleCreateProduct = () => {
    if (!newProdName || !newProdPrice) {
      alert("Please enter product name and price.")
      return
    }
    const priceNum = parseFloat(newProdPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Price must be a valid positive number.")
      return
    }

    const newProd: PosProduct = {
      id: `prod-${Math.random().toString(36).substring(2, 7)}`,
      name: newProdName,
      price: priceNum,
      category: newProdCat
    }

    const updatedCatalog = [...posProducts, newProd]
    setPosProducts(updatedCatalog)
    localStorage.setItem('sf_pos_catalog', JSON.stringify(updatedCatalog))
    
    setNewProdName('')
    setNewProdPrice('')
    alert(`Product ${newProdName} added successfully to the catalog!`)
    broadcastDatabaseUpdate()
  }

  const handleDeleteProduct = (prodId: string) => {
    const updatedCatalog = posProducts.filter(p => p.id !== prodId)
    setPosProducts(updatedCatalog)
    localStorage.setItem('sf_pos_catalog', JSON.stringify(updatedCatalog))
    broadcastDatabaseUpdate()
  }

  // ----------------------------------------------------
  // APP 4: Revenue Management Yield Engine Handlers
  // ----------------------------------------------------
  const handleSliderChange = (val: number) => {
    setAutoPilotYield(false)
    setRateMultiplier(val)
    
    // Save to local storage
    const cfg = {
      rateMultiplier: val,
      otaBoostPct,
      autoPilotYield: false
    }
    localStorage.setItem('sf_revenue_configs', JSON.stringify(cfg))
    broadcastDatabaseUpdate()
  }

  const handleMatchCompetitor = (compRate: number) => {
    // We match the competitor rate by setting our Deluxe base price ($150) multiplied by our surge to match compRate
    const calculatedMultiplier = Math.min(2.5, Math.max(1.0, parseFloat((compRate / 150).toFixed(2))))
    setAutoPilotYield(false)
    setRateMultiplier(calculatedMultiplier)
    
    const cfg = {
      rateMultiplier: calculatedMultiplier,
      otaBoostPct,
      autoPilotYield: false
    }
    localStorage.setItem('sf_revenue_configs', JSON.stringify(cfg))
    alert(`Rates matched successfully! Dynamic surge multiplier set to ${calculatedMultiplier}x to align Deluxe rate with competitor daily rate of $${compRate}.`)
    broadcastDatabaseUpdate()
  }

  const handleApplyParityBoost = () => {
    const cfg = {
      rateMultiplier,
      otaBoostPct,
      autoPilotYield
    }
    localStorage.setItem('sf_revenue_configs', JSON.stringify(cfg))
    alert(`OTA Channel Rates marked up by ${otaBoostPct}% successfully! Pushed parameters to connected channel manager sync queues.`);
    broadcastDatabaseUpdate()
  }

  // ----------------------------------------------------
  // APP 5: Review Management State
  // ----------------------------------------------------
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [respondingReviewId, setRespondingReviewId] = useState<string | null>(null)
  const [aiDraftResponse, setAiDraftResponse] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [reviewsFilterSource, setReviewsFilterSource] = useState<'All' | 'Google' | 'TripAdvisor' | 'Booking.com'>('All')
  const [reviewsFilterStatus, setReviewsFilterStatus] = useState<'All' | 'pending' | 'replied'>('All')
  const [aiTone, setAiTone] = useState<'Professional' | 'Apologetic' | 'Casual'>('Professional')

  // Mock review states
  const [newRevSource, setNewRevSource] = useState<'Google' | 'TripAdvisor' | 'Booking.com'>('Google')
  const [newRevRating, setNewRevRating] = useState(5)
  const [newRevComment, setNewRevComment] = useState('')
  const [showMockReviewForm, setShowMockReviewForm] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sf_reviews')
    if (saved) {
      setReviews(JSON.parse(saved))
    } else {
      const defaults: ReviewItem[] = [
        { id: 'rev-1', source: 'TripAdvisor', rating: 5, comment: 'Exceptional contactless check-in! Scanned the QR at arrivals, verified OCR, and got my digital PIN in minutes.', sentiment: 'positive', reply: null, status: 'pending' },
        { id: 'rev-2', source: 'Booking.com', rating: 4, comment: 'Nice pool side resort. Room 102 lock key code arrived 2 mins late. Minor issue but overall great support.', sentiment: 'neutral', reply: null, status: 'pending' },
        { id: 'rev-3', source: 'Google', rating: 2, comment: 'Housekeeping cleaning was not completed when I arrived. Front desk marked room clean manually quickly.', sentiment: 'negative', reply: null, status: 'pending' }
      ]
      setReviews(defaults)
      localStorage.setItem('sf_reviews', JSON.stringify(defaults))
    }
  }, [])

  const triggerDraftAiReply = async (revId: string, text: string) => {
    setLoadingAi(true)
    setRespondingReviewId(revId)
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    let draft = ''
    if (aiTone === 'Apologetic') {
      draft = `Dear Valued Guest, we sincerely apologize for the inconvenience you experienced. `
      if (text.toLowerCase().includes('contactless')) {
        draft += `We are sorry if there was any confusion with our instant OCR check-in. We are continuously refining our arrivals flow to ensure it is seamless.`
      } else if (text.toLowerCase().includes('lock')) {
        draft += `We deeply regret the delay in dispatching your room key pin code. Our engineering team is optimization of our IoT door service schema.`
      } else {
        draft += `Please accept our apologies for the delay in completing your room cleaning. We have re-trained our cleaner shift supervisors to prevent this.`
      }
      draft += `\n\nWe hope you will give us another chance to provide a better stay.\n\nWarm regards,\nStayflexi Management.`
    } else if (aiTone === 'Casual') {
      draft = `Hey there, thanks for sharing your feedback! `
      if (text.toLowerCase().includes('contactless')) {
        draft += `Super stoked to hear you loved our digital key and fast check-in. We are all about that frictionless stay life!`
      } else if (text.toLowerCase().includes('lock')) {
        draft += `Sorry about the lock lag! We've already tweaked our IoT servers to speed things up for next time.`
      } else {
        draft += `Sorry the room wasn't ready right away. We've got our cleanup crew working on quicker turnarounds.`
      }
      draft += `\n\nCatch you next time,\nThe Stayflexi Crew.`
    } else {
      // Professional / Default
      draft = `Dear Guest, thank you for sharing your experience at Stayflexi. `
      if (text.toLowerCase().includes('contactless')) {
        draft += `We are pleased to hear that you found the OCR document check-in and remote lock PIN issues efficient and user-friendly.`
      } else if (text.toLowerCase().includes('lock')) {
        draft += `We appreciate your patience regarding the 2-minute key code response time. Rest assured our team has updated the IoT integrations for immediate updates.`
      } else {
        draft += `Thank you for your feedback. We are adjusting our housekeeping assignment cycles to ensure check-in rooms are inspected and clean prior to arrival.`
      }
      draft += `\n\nWarm regards,\nHotel Management.`
    }
    setAiDraftResponse(draft)
    setLoadingAi(false)
  }

  const handleSaveReviewReply = (revId: string) => {
    const updated = reviews.map(rev => {
      if (rev.id === revId) {
        return { ...rev, reply: aiDraftResponse, status: 'replied' as const }
      }
      return rev
    })
    setReviews(updated)
    localStorage.setItem('sf_reviews', JSON.stringify(updated))
    setRespondingReviewId(null)
    setAiDraftResponse('')
    alert("Reply posted successfully to public review portal.");
  }

  const handleCreateMockReview = async () => {
    if (!newRevComment) {
      alert("Please enter a review comment.")
      return
    }

    setLoadingAi(true)
    try {
      const aiResult = await dataClient.analyzeReviewSentiment(newRevComment)
      
      const newRev: ReviewItem = {
        id: `rev-${Math.random().toString(36).substring(2, 7)}`,
        source: newRevSource,
        rating: aiResult.rating,
        comment: newRevComment,
        sentiment: aiResult.sentiment,
        reply: null,
        status: 'pending'
      }

      const updated = [newRev, ...reviews]
      setReviews(updated)
      localStorage.setItem('sf_reviews', JSON.stringify(updated))
      setNewRevComment('')
      setShowMockReviewForm(false)
      alert(`Mock review analyzed by AI and ingested successfully!\n\nDetected Rating: ${aiResult.rating} Stars\nSentiment: ${aiResult.sentiment.toUpperCase()}`)
    } catch (err) {
      console.error(err)
      alert("Error analyzing review via AI. Please try again.")
    } finally {
      setLoadingAi(false)
    }
  }

  useEffect(() => {
    const handleAICmd = (e: any) => {
      const { action, payload } = e.detail || {}
      if (action === 'navigate_app') {
        const appName = payload?.app
        if (appName) {
          setActiveApp(appName)
          if (appName === 'reviews' && payload.reviewId) {
            setRespondingReviewId(payload.reviewId)
            const rev = reviews.find(r => r.id === payload.reviewId)
            triggerDraftAiReply(payload.reviewId, rev ? rev.comment : "Great contactless service!")
          }
        }
      }
    }

    window.addEventListener('flexi-staff-ai-command', handleAICmd)
    return () => {
      window.removeEventListener('flexi-staff-ai-command', handleAICmd)
    }
  }, [reviews])

  // ----------------------------------------------------
  // APP 5: Payments Reconciliation State
  // ----------------------------------------------------
  // APP 6: Payments Reconciliation State
  // ----------------------------------------------------
  const [paymentsList, setPaymentsList] = useState<PaymentTransaction[]>([])
  const [preauthName, setPreauthName] = useState('')
  const [preauthAmount, setPreauthAmount] = useState('')
  const [gatewayLogs, setGatewayLogs] = useState<{ id: string; event: string; payload: string; timestamp: string }[]>([])

  const logGatewayEvent = (event: string, payload: any) => {
    const newLog = {
      id: `log-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      event,
      payload: JSON.stringify(payload, null, 2),
      timestamp: new Date().toLocaleTimeString()
    }
    setGatewayLogs(prev => [newLog, ...prev].slice(0, 10))
  }

  useEffect(() => {
    const saved = localStorage.getItem('sf_pos_payments')
    if (saved) {
      setPaymentsList(JSON.parse(saved))
    } else {
      const defaults: PaymentTransaction[] = [
        { id: 'pay-101', guestName: 'Alice Vance', method: 'CASH', amount: 300.00, status: 'SUCCESS', timestamp: new Date().toISOString() },
        { id: 'pay-102', guestName: 'Robert Dowson', method: 'CARD', amount: 770.00, status: 'SUCCESS', timestamp: new Date().toISOString() }
      ]
      setPaymentsList(defaults)
      localStorage.setItem('sf_pos_payments', JSON.stringify(defaults))
    }

    // Seed initial Stripe gateway logs
    setGatewayLogs([
      {
        id: 'log-INIT',
        event: 'gateway.connected',
        payload: JSON.stringify({ status: 'stripe_supergraph_webhook_stream_active', mode: 'live_production' }, null, 2),
        timestamp: new Date(Date.now() - 60000).toLocaleTimeString()
      }
    ])
  }, [])

  const handlePreauthSubmit = () => {
    if (!preauthName || !preauthAmount) {
      alert("Please fill in Guest name and preauth value.")
      return
    }

    const val = parseFloat(preauthAmount) || 0
    const newTx: PaymentTransaction = {
      id: `tx-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      guestName: preauthName,
      method: 'CARD',
      amount: val,
      status: 'HELD',
      timestamp: new Date().toISOString()
    }

    const updated = [newTx, ...paymentsList]
    setPaymentsList(updated)
    localStorage.setItem('sf_pos_payments', JSON.stringify(updated))
    setPreauthName('')
    setPreauthAmount('')

    logGatewayEvent("payment_intent.amount_capturable_updated", {
      id: newTx.id,
      object: "payment_intent",
      amount: val * 100,
      currency: "usd",
      status: "requires_capture",
      charges: {
        object: "list",
        data: [{
          id: `ch_${Math.random().toString(36).substring(2, 8)}`,
          amount_capturable: val * 100,
          status: "pending"
        }]
      }
    })

    alert(`Pre-auth validation code matched. Held $${newTx.amount.toFixed(2)} on card ledger.`)
    broadcastDatabaseUpdate()
  }

  const handleRefundTransaction = (txnId: string) => {
    const tx = paymentsList.find(t => t.id === txnId)
    if (!tx) return
    
    const updated = paymentsList.map(t => t.id === txnId ? { ...t, status: 'REFUNDED' as const } : t)
    setPaymentsList(updated)
    localStorage.setItem('sf_pos_payments', JSON.stringify(updated))
    
    logGatewayEvent("charge.refunded", {
      id: txnId,
      object: "charge",
      amount: tx.amount * 100,
      currency: "usd",
      refunded: true,
      status: "succeeded"
    })
    alert(`Transaction ${txnId} has been fully refunded through Stripe Gateway.`)
    broadcastDatabaseUpdate()
  }

  const handleCaptureHold = (txnId: string) => {
    const tx = paymentsList.find(t => t.id === txnId)
    if (!tx) return

    const updated = paymentsList.map(t => t.id === txnId ? { ...t, status: 'SUCCESS' as const } : t)
    setPaymentsList(updated)
    localStorage.setItem('sf_pos_payments', JSON.stringify(updated))

    logGatewayEvent("charge.captured", {
      id: txnId,
      object: "charge",
      amount: tx.amount * 100,
      currency: "usd",
      captured: true,
      status: "succeeded"
    })
    alert(`Pre-auth hold ${txnId} captured successfully. Funds charged to guest card ledger.`)
    broadcastDatabaseUpdate()
  }

  // ----------------------------------------------------
  // APP 6: Property Configurations State
  // ----------------------------------------------------
  const handleSaveConfigs = () => {
    const configData = {
      propCheckIn,
      propCheckOut,
      propTaxRate,
      lockVendor,
      lockEndpoint,
      lockAuthType,
      lockClientId,
      lockClientSecret,
      lockApiKey,
      earlyCheckInRate,
      lateCheckOutRate,
      foodTaxRate,
      serviceFee,
      wifiSsid,
      wifiPassword,
      portalGreeting
    }
    localStorage.setItem('sf_property_configs', JSON.stringify(configData))
    alert(`Configurations saved successfully!\nTax: ${propTaxRate}% | F&B Tax: ${foodTaxRate}% | Service Fee: $${serviceFee}\nEarly Check: $${earlyCheckInRate}/hr | Late Check: $${lateCheckOutRate}/hr\nLock: ${lockVendor} (${lockAuthType === 'oauth2' ? 'OAuth 2.0' : 'API Key'}) | WiFi SSID: ${wifiSsid}`);
    broadcastDatabaseUpdate();
  }

  const handleTestLockConnection = () => {
    if (testingLockConn) return
    setTestingLockConn(true)
    setLockProgress(0)
    
    const newLogs = [
      `[${new Date().toLocaleTimeString()}] Pinging IoT door lock gateway for ${lockVendor} Lock System...`,
      `[${new Date().toLocaleTimeString()}] Target Endpoint: ${lockEndpoint}`,
    ]
    setIotDebugLogs(prev => [...prev, ...newLogs])

    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setLockProgress(progress)
      
      if (progress === 20) {
        if (lockAuthType === 'oauth2') {
          setIotDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [OAuth2] POST /oauth/v2/token (client_id: ${lockClientId})`])
        } else {
          setIotDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [API Key] Injecting API headers X-API-Token: ${lockApiKey.substring(0, 8)}...`])
        }
      } else if (progress === 40) {
        if (lockAuthType === 'oauth2') {
          setIotDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [OAuth2] Token Exchange Success. Acquired JWT token.`])
        } else {
          setIotDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Handshake initialized with Gateway Controller...`])
        }
      } else if (progress === 60) {
        setIotDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] API credentials authenticated. Fetching IoT node gateway status...`])
      } else if (progress === 80) {
        setIotDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Active lock nodes found: 48. Online: 48. Offline: 0.`])
      } else if (progress === 100) {
        clearInterval(interval)
        setTestingLockConn(false)
        setIotDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✔ INTEGRATION NOMINAL: ${lockVendor} cloud service verified using ${lockAuthType === 'oauth2' ? 'OAuth2 Bearer' : 'Static API Token'}.`])
      }
    }, 200)
  }

  const handleClearIotLogs = () => {
    setIotDebugLogs([
      `[${new Date().toLocaleTimeString()}] Diagnostic logs cleared. Ready...`
    ])
  }

  const getMockKeycardPayload = () => {
    const credentials = lockAuthType === 'oauth2' 
      ? {
          auth_type: "OAuth 2.0 Client Credentials Token",
          client_id: lockClientId,
          access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdGF5ZmxleGkiLCJleHAiOjE3NzEzNTAwMDB9.sf_sig_key",
          algorithm: "HS256"
        }
      : {
          auth_type: "Static Custom API Key Token",
          api_key: lockApiKey,
          algorithm: "Plaintext"
        };

    return JSON.stringify({
      vendor: lockVendor,
      gateway: lockEndpoint,
      request_timestamp: new Date().toISOString(),
      action: "GENERATE_MOBILE_KEY",
      credentials,
      room_data: {
        room_number: "204",
        lock_id: `${lockVendor.toLowerCase()}-node-204-id`,
        valid_from: new Date().toISOString(),
        valid_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }, null, 2)
  }

  // ----------------------------------------------------
  // APP 7: Expense Manager State
  // ----------------------------------------------------
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [expenseCat, setExpenseCat] = useState<'Utilities' | 'Salaries' | 'Inventory' | 'Maintenance' | 'Marketing'>('Utilities')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDesc, setExpenseDesc] = useState('')
  const [mockReceiptName, setMockReceiptName] = useState<string | null>(null)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const [receiptProgress, setReceiptProgress] = useState(0)
  const [expenseBudgets, setExpenseBudgets] = useState<Record<string, number>>({
    Utilities: 800,
    Salaries: 5000,
    Inventory: 1500,
    Maintenance: 800,
    Marketing: 600
  })
  const [showBudgetEditModal, setShowBudgetEditModal] = useState(false)
  const [tempBudgets, setTempBudgets] = useState<Record<string, number>>({
    Utilities: 800,
    Salaries: 5000,
    Inventory: 1500,
    Maintenance: 800,
    Marketing: 600
  })
  const [viewingReceiptLog, setViewingReceiptLog] = useState<ExpenseItem | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('sf_expenses')
    if (saved) {
      setExpenses(JSON.parse(saved))
    } else {
      const defaults: ExpenseItem[] = [
        { id: 'exp-1', category: 'Utilities', amount: 450.00, description: 'Electricity grid payment Candolim resort', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'exp-2', category: 'Inventory', amount: 200.00, description: 'Bed linens supplier restocking', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
      ]
      setExpenses(defaults)
      localStorage.setItem('sf_expenses', JSON.stringify(defaults))
    }

    const savedBudgets = localStorage.getItem('sf_expense_budgets')
    if (savedBudgets) {
      try {
        const parsed = JSON.parse(savedBudgets)
        setExpenseBudgets(parsed)
        setTempBudgets(parsed)
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const handleSimulateReceiptUpload = () => {
    setIsUploadingReceipt(true)
    setReceiptProgress(0)
    let p = 0
    const interval = setInterval(() => {
      p += 25
      setReceiptProgress(p)
      if (p === 100) {
        clearInterval(interval)
        setIsUploadingReceipt(false)
        setMockReceiptName(`invoice_receipt_${Math.floor(1000 + Math.random() * 9000)}.pdf`)
      }
    }, 150)
  }

  const handleSaveBudgets = (updatedBudgets: Record<string, number>) => {
    setExpenseBudgets(updatedBudgets)
    localStorage.setItem('sf_expense_budgets', JSON.stringify(updatedBudgets))
    setShowBudgetEditModal(false)
    alert("Category budgets updated successfully!")
    broadcastDatabaseUpdate()
  }

  const handleLogExpense = () => {
    if (!expenseAmount || !expenseDesc) {
      alert("Please enter amount and description.")
      return
    }

    const amt = parseFloat(expenseAmount) || 0
    const newItem: ExpenseItem = {
      id: `exp-${Math.random().toString(36).substring(2, 7)}`,
      category: expenseCat,
      amount: amt,
      description: expenseDesc,
      timestamp: new Date().toISOString(),
      receiptName: mockReceiptName || undefined
    }

    const updated = [newItem, ...expenses]
    setExpenses(updated)
    localStorage.setItem('sf_expenses', JSON.stringify(updated))
    
    // Check if new total exceeds budget
    const categoryTotal = updated
      .filter(item => item.category === expenseCat)
      .reduce((sum, item) => sum + item.amount, 0)
    
    const budgetLimit = expenseBudgets[expenseCat] || 0
    if (categoryTotal > budgetLimit) {
      alert(`⚠️ BUDGET EXCEEDED: Surcharge in category "${expenseCat}" is now $${categoryTotal.toFixed(2)}, which exceeds the monthly budget limit of $${budgetLimit.toFixed(2)}!`);
    }

    setExpenseAmount('')
    setExpenseDesc('')
    setMockReceiptName(null)
    broadcastDatabaseUpdate()
  }

  const totalExpenseSum = expenses.reduce((sum, item) => sum + item.amount, 0)

  // ----------------------------------------------------
  // APP 8: Stock Management State
  // ----------------------------------------------------
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [stockSearchQuery, setStockSearchQuery] = useState('')
  const [selectedStockCategory, setSelectedStockCategory] = useState<'All' | 'Linen' | 'Amenities' | 'Food & Beverage'>('All')
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<'Linen' | 'Amenities' | 'Food & Beverage'>('Linen')
  const [newItemTarget, setNewItemTarget] = useState('100')
  const [newItemCurrent, setNewItemCurrent] = useState('50')
  const [restockingItemId, setRestockingItemId] = useState<string | null>(null)
  const [customRestockQty, setCustomRestockQty] = useState('25')
  const [restockUnitCost, setRestockUnitCost] = useState('2.00')
  const [postToOpex, setPostToOpex] = useState(true)
  const [stockLogs, setStockLogs] = useState<{ id: string; name: string; qty: number; cost: number; postToOpex: boolean; timestamp: string }[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('sf_stock_inventory')
    if (saved) {
      setStockItems(JSON.parse(saved))
    } else {
      const defaults: StockItem[] = [
        { id: 'stock-1', name: 'Bath Towels Double-Thread', current: 75, target: 120, category: 'Linen' },
        { id: 'stock-2', name: 'Satin Bed Linens Kingsize', current: 22, target: 80, category: 'Linen' },
        { id: 'stock-3', name: 'Contactless Toiletries Kit', current: 15, target: 100, category: 'Amenities' },
        { id: 'stock-4', name: 'Mini-Bar Beer (Local)', current: 6, target: 50, category: 'Food & Beverage' }
      ]
      setStockItems(defaults)
      localStorage.setItem('sf_stock_inventory', JSON.stringify(defaults))
    }

    const savedLogs = localStorage.getItem('sf_stock_logs')
    if (savedLogs) {
      setStockLogs(JSON.parse(savedLogs))
    } else {
      const defaults = [
        { id: 'slog-1', name: 'Bath Towels Double-Thread', qty: 30, cost: 60.00, postToOpex: true, timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'slog-2', name: 'Contactless Toiletries Kit', qty: 50, cost: 75.00, postToOpex: false, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
      ]
      setStockLogs(defaults)
      localStorage.setItem('sf_stock_logs', JSON.stringify(defaults))
    }
  }, [])

  const handleAddStockItem = () => {
    if (!newItemName) {
      alert("Please enter item name.")
      return
    }

    const targetVal = parseInt(newItemTarget) || 100
    const currentVal = parseInt(newItemCurrent) || 0
    const newItem: StockItem = {
      id: `stock-${Math.random().toString(36).substring(2, 7)}`,
      name: newItemName,
      category: newItemCategory,
      current: currentVal,
      target: targetVal
    }

    const updated = [...stockItems, newItem]
    setStockItems(updated)
    localStorage.setItem('sf_stock_inventory', JSON.stringify(updated))

    // Append creation log
    const newLog = {
      id: `slog-${Math.random().toString(36).substring(2, 7)}`,
      name: newItemName,
      qty: currentVal,
      cost: 0,
      postToOpex: false,
      timestamp: new Date().toISOString()
    }
    const updatedLogs = [newLog, ...stockLogs]
    setStockLogs(updatedLogs)
    localStorage.setItem('sf_stock_logs', JSON.stringify(updatedLogs))

    setNewItemName('')
    setNewItemCurrent('50')
    setNewItemTarget('100')
    broadcastDatabaseUpdate()
  }

  const handleDeleteStockItem = (itemId: string) => {
    const updated = stockItems.filter(item => item.id !== itemId)
    setStockItems(updated)
    localStorage.setItem('sf_stock_inventory', JSON.stringify(updated))
    broadcastDatabaseUpdate()
  }

  const handleRestockSubmit = () => {
    if (!restockingItemId) return
    const targetItem = stockItems.find(item => item.id === restockingItemId)
    if (!targetItem) return

    const qty = parseInt(customRestockQty) || 0
    const unitCostVal = parseFloat(restockUnitCost) || 0
    const totalCost = qty * unitCostVal

    const updated = stockItems.map(item => {
      if (item.id === restockingItemId) {
        return { ...item, current: Math.min(item.target, item.current + qty) }
      }
      return item
    })
    setStockItems(updated)
    localStorage.setItem('sf_stock_inventory', JSON.stringify(updated))

    // Log to stock logs
    const newLog = {
      id: `slog-${Math.random().toString(36).substring(2, 7)}`,
      name: targetItem.name,
      qty,
      cost: totalCost,
      postToOpex,
      timestamp: new Date().toISOString()
    }
    const updatedLogs = [newLog, ...stockLogs]
    setStockLogs(updatedLogs)
    localStorage.setItem('sf_stock_logs', JSON.stringify(updatedLogs))

    // Optionally post to OpEx / Expenses ledger
    if (postToOpex && totalCost > 0) {
      const opexItem: ExpenseItem = {
        id: `exp-${Math.random().toString(36).substring(2, 7)}`,
        category: 'Inventory',
        amount: totalCost,
        description: `Inventory Restock: ${targetItem.name} (x${qty} units)`,
        timestamp: new Date().toISOString()
      }
      const savedExpenses = localStorage.getItem('sf_expenses')
      const parsedExpenses: ExpenseItem[] = savedExpenses ? JSON.parse(savedExpenses) : []
      const updatedExpenses = [opexItem, ...parsedExpenses]
      localStorage.setItem('sf_expenses', JSON.stringify(updatedExpenses))
      setExpenses(updatedExpenses) // Reactively updates P&L too!
    }

    setRestockingItemId(null)
    setCustomRestockQty('25')
    setRestockUnitCost('2.00')
    broadcastDatabaseUpdate()
  }

  // Helper to check if a date falls in [startDate, endDate]
  const isDateInReportRange = (dateStr: string) => {
    if (!dateStr) return false
    const d = dateStr.split('T')[0] || ''
    return d >= startDate && d <= endDate
  }

  // Deterministic reservation source mapper
  const getReservationSource = (resId: string): 'Direct' | 'Booking.com' | 'Agoda' | 'Expedia' => {
    if (!resId) return 'Direct'
    const cleanId = resId.toLowerCase()
    if (cleanId.includes('direct') || cleanId.includes('web')) return 'Direct'
    if (cleanId.includes('booking') || cleanId.includes('bkg')) return 'Booking.com'
    if (cleanId.includes('agoda') || cleanId.includes('agd')) return 'Agoda'
    if (cleanId.includes('expedia') || cleanId.includes('exp')) return 'Expedia'
    
    // Hash-based fallback mapping
    let sum = 0
    for (let i = 0; i < resId.length; i++) {
      sum += resId.charCodeAt(i)
    }
    const mod = sum % 4
    if (mod === 0) return 'Direct'
    if (mod === 1) return 'Booking.com'
    if (mod === 2) return 'Agoda'
    return 'Expedia'
  }

  // Helper to calculate overlap nights
  const getOverlapNights = (resCheckIn: string, resCheckOut: string, queryStart: string, queryEnd: string) => {
    if (!resCheckIn || !resCheckOut || !queryStart || !queryEnd) return 0
    const startStr = resCheckIn > queryStart ? resCheckIn : queryStart
    const endStr = resCheckOut < queryEnd ? resCheckOut : queryEnd
    if (startStr >= endStr) return 0
    const d1 = new Date(startStr)
    const d2 = new Date(endStr)
    const diffTime = d2.getTime() - d1.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  // Filtered lists
  const filteredReservations = reservations.filter(r => isDateInReportRange(r.checkIn) || isDateInReportRange(r.checkOut))
  const filteredPayments = paymentsList.filter(p => isDateInReportRange(p.timestamp))
  const filteredExpenses = expenses.filter(e => isDateInReportRange(e.timestamp))
  const filteredAuditLogs = hkAuditLogs.filter(log => isDateInReportRange(log.completedAt))

  // Reports Calculations - Room-Night Occupancy Engine
  const queryStartDate = new Date(startDate)
  const queryEndDate = new Date(endDate)
  const queryNights = Math.max(1, Math.ceil((queryEndDate.getTime() - queryStartDate.getTime()) / (1000 * 60 * 60 * 24)))
  const reportsTotalRooms = rooms.length || 10
  const totalAvailableRoomNights = reportsTotalRooms * queryNights

  let totalOccupiedNights = 0
  reservations.forEach(res => {
    if (res.status !== 'CANCELLED' && res.status !== 'NO_SHOW') {
      totalOccupiedNights += getOverlapNights(res.checkIn, res.checkOut, startDate, endDate)
    }
  })

  const reportsCheckedInCount = filteredReservations.filter(r => r.status === 'CHECKED_IN' || r.status === 'CHECKOUT_DUE').length
  const reportsOccupancyRate = Math.min(100, Math.round((totalOccupiedNights / totalAvailableRoomNights) * 100))

  // Dynamic pricing rule engine hook
  useEffect(() => {
    if (autoPilotYield) {
      let multiplier = 1.00;
      if (reportsOccupancyRate >= 75) multiplier = 1.75;
      else if (reportsOccupancyRate >= 50) multiplier = 1.40;
      else if (reportsOccupancyRate >= 25) multiplier = 1.20;
      
      if (multiplier !== rateMultiplier) {
        setRateMultiplier(multiplier);
        const cfg = {
          rateMultiplier: multiplier,
          otaBoostPct,
          autoPilotYield
        };
        localStorage.setItem('sf_revenue_configs', JSON.stringify(cfg));
        broadcastDatabaseUpdate();
      }
    }
  }, [autoPilotYield, reportsOccupancyRate, rateMultiplier, otaBoostPct])

  // Dynamic Revenue Breakdown (Room, POS, Spa)
  let roomRev = 0
  let posRev = 0
  let spaRev = 0

  filteredReservations.forEach(res => {
    roomRev += res.amount
    if (res.charges) {
      res.charges.forEach(c => {
        if (c.name.toLowerCase().includes('spa')) {
          spaRev += c.amount
        } else {
          posRev += c.amount
        }
      })
    }
  })

  const reportsTotalRevenue = roomRev + posRev + spaRev
  const reportsTotalPayments = filteredPayments.reduce((sum, p) => p.status === 'SUCCESS' ? sum + p.amount : sum, 0)
  const reportsTotalOpEx = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const reportsNetProfit = reportsTotalRevenue - reportsTotalOpEx

  // Calculate ADR and RevPAR based on Room revenue and room nights
  const reportsADR = totalOccupiedNights > 0 ? Math.round(roomRev / totalOccupiedNights) : 150
  const reportsRevPAR = Math.round((reportsOccupancyRate / 100) * reportsADR)

  // Dynamic Channel Calculations
  const channelRevenue = {
    'Direct': 0,
    'Booking.com': 0,
    'Agoda': 0,
    'Expedia': 0
  }
  
  filteredReservations.forEach(res => {
    const src = getReservationSource(res.id)
    let rev = res.amount
    if (res.charges) {
      rev += res.charges.reduce((cSum, c) => cSum + c.amount, 0)
    }
    channelRevenue[src] += rev
  })

  const totalChannelRev = Object.values(channelRevenue).reduce((a, b) => a + b, 0) || 1
  const channelShares = [
    { channel: 'Direct Web Booking Engine', share: `${Math.round((channelRevenue['Direct'] / totalChannelRev) * 100)}%`, revenue: channelRevenue['Direct'], color: '#10b981' },
    { channel: 'Booking.com API integration', share: `${Math.round((channelRevenue['Booking.com'] / totalChannelRev) * 100)}%`, revenue: channelRevenue['Booking.com'], color: '#0ea5e9' },
    { channel: 'Agoda Direct Connect', share: `${Math.round((channelRevenue['Agoda'] / totalChannelRev) * 100)}%`, revenue: channelRevenue['Agoda'], color: '#f59e0b' },
    { channel: 'Expedia Supergraph channel', share: `${Math.round((channelRevenue['Expedia'] / totalChannelRev) * 100)}%`, revenue: channelRevenue['Expedia'], color: '#ef4444' }
  ]

  const breakTotal = roomRev + posRev + spaRev || 1
  const roomPct = Math.round((roomRev / breakTotal) * 100)
  const posPct = Math.round((posRev / breakTotal) * 100)
  const spaPct = Math.max(0, 100 - roomPct - posPct)

  const handleDownloadCsv = (reportName: string, headers: string[], rows: any[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(",")].concat(rows.map(r => r.map(val => {
          if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`
          return val
        }).join(","))).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${reportName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${startDate}_to_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleGenerateReportsAi = async (promptType: string) => {
    setLoadingReportsAi(true)
    setAiReportsPrompt(promptType)
    await new Promise(resolve => setTimeout(resolve, 1200))

    let insight = `**Business Intelligence Explanation (AI Explainer):**\n\n`
    if (promptType === 'financial') {
      insight += `For the audited period of **${startDate}** to **${endDate}**, Stayflexi has logged gross revenue totals of **$${reportsTotalRevenue.toFixed(2)}** against operational expense thresholds of **$${reportsTotalOpEx.toFixed(2)}**.\n\n`
      if (reportsNetProfit >= 0) {
        insight += `📈 **Financial Health**: Excellent. The property is currently profitable with a net yield margin of **$${reportsNetProfit.toFixed(2)}**. ADR sits at **$${reportsADR}** which is in line with target RevPAR targets.`
      } else {
        insight += `⚠️ **Financial Warning**: Operational expenses surpass gross revenue by **$${Math.abs(reportsNetProfit).toFixed(2)}**. Recommend adjusting pricing surges and reducing utility logs.`
      }
    } else if (promptType === 'operations') {
      insight += `During this shift, clean operations logged **${filteredAuditLogs.length}** successful cleanup events.\n\n`
      if (filteredAuditLogs.length > 0) {
        const avgSecs = filteredAuditLogs.reduce((sum, l) => sum + l.durationSeconds, 0) / filteredAuditLogs.length
        insight += `🧹 **Workload Metrics**: The average cleaning speed across all cleaner shifts is **${Math.round(avgSecs/60)} minutes**. Cleaner Ramesh Kumar has completed the highest volume of checkouts.`
      } else {
        insight += `🧹 **Workload Metrics**: No clean logs registered in the selected date range. Ensure cleaners check off mobile checklists.`
      }
    } else {
      insight += `🔌 **Distribution Metrics**:\nDirect Booking engine occupancy ADR is yielding higher margins compared to Agoda and Expedia commissions. Recommend boosting dynamic markups on OTAs via supergraph yield managers.`
    }
    setAiReportsResponse(insight)
    setLoadingReportsAi(false)
  }

  return (
    <DashboardShell
      activeTab="more-apps"
      title="Stayflexi App Market"
      subtitle="Modular application suites configured in Supergraph properties super-tenant"
    >
      {/* 9 Apps grid selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* App 1: Housekeeping */}
        <div 
          onClick={() => setActiveApp('housekeeping')}
          style={getAppCardStyle(activeApp === 'housekeeping', '#a855f7')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList style={{ color: '#a855f7' }} size={20} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Housekeeping</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Staff workload, cleaning assignments, and room cleaning status.
          </p>
        </div>

        {/* App 2: Reports */}
        <div 
          onClick={() => setActiveApp('reports')}
          style={getAppCardStyle(activeApp === 'reports', '#0ea5e9')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText style={{ color: '#0ea5e9' }} size={20} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Reports Console</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Daily financial flash reports, occupancy, ADR, and division revenue.
          </p>
        </div>

        {/* App 3: Shops POS */}
        <div 
          onClick={() => setActiveApp('shops')}
          style={getAppCardStyle(activeApp === 'shops', '#00f2fe')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag style={{ color: '#00f2fe' }} size={20} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Shops POS Console</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Point-of-Sale mini-bar, restaurant, and spa charges billing.
          </p>
        </div>

        {/* App 4: Revenue */}
        <div 
          onClick={() => setActiveApp('revenue')}
          style={getAppCardStyle(activeApp === 'revenue', '#10b981')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp style={{ color: '#10b981' }} size={20} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Revenue Manager</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Dynamic pricing multipliers, and OTA parity controllers.
          </p>
        </div>

        {/* App 5: Reviews */}
        <div 
          onClick={() => setActiveApp('reviews')}
          style={getAppCardStyle(activeApp === 'reviews', '#f59e0b')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare style={{ color: '#f59e0b' }} size={20} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Review Console</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Consolidated guest reviews with AI-generated responses.
          </p>
        </div>

        {/* App 6: Payments */}
        <div 
          onClick={() => setActiveApp('payments')}
          style={getAppCardStyle(activeApp === 'payments', '#3b82f6')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard style={{ color: '#3b82f6' }} size={20} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Payments Ledger</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Credit pre-authorizations, refund modules, and Stripe sync logs.
          </p>
        </div>

        {/* App 7: Property Config */}
        <div 
          onClick={() => setActiveApp('config')}
          style={getAppCardStyle(activeApp === 'config', '#6b7280')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders style={{ color: '#6b7280' }} size={20} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Property Config</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            IoT Keycard settings, check-in rules, and portal layouts.
          </p>
        </div>

        {/* App 8: Expense Manager */}
        <div 
          onClick={() => setActiveApp('expense')}
          style={getAppCardStyle(activeApp === 'expense', '#ef4444')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt style={{ color: '#ef4444' }} size={20} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Expense Manager</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Log utility bills, staff payroll, and maintenance supplier invoices.
          </p>
        </div>

        {/* App 9: Stock Inventory */}
        <div 
          onClick={() => setActiveApp('stock')}
          style={getAppCardStyle(activeApp === 'stock', '#a855f7')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package style={{ color: '#a855f7' }} size={20} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Stock Inventory</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Track towels, linen levels, toiletries, and beverage alerts.
          </p>
        </div>
      </div>

      {/* Active App workspace render */}
      <div className="glass-card" style={{ padding: '28px', minHeight: '400px' }}>
        
        {activeApp === 'housekeeping' && (
          <div>
            {/* Header section with Sub-tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ClipboardList style={{ color: '#a855f7' }} size={24} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Housekeeping Suite</h3>
              </div>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                <button 
                  onClick={() => setHkSubTab('charter')}
                  style={{
                    background: hkSubTab === 'charter' ? 'rgba(168, 85, 247, 0.15)' : 'none',
                    border: 'none',
                    color: hkSubTab === 'charter' ? '#c084fc' : 'var(--text-muted)',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  📋 Room Charter
                </button>
                <button 
                  onClick={() => setHkSubTab('mobile')}
                  style={{
                    background: hkSubTab === 'mobile' ? 'rgba(168, 85, 247, 0.15)' : 'none',
                    border: 'none',
                    color: hkSubTab === 'mobile' ? '#c084fc' : 'var(--text-muted)',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  📱 Mobile Cleaner
                </button>
                <button 
                  onClick={() => setHkSubTab('configs')}
                  style={{
                    background: hkSubTab === 'configs' ? 'rgba(168, 85, 247, 0.15)' : 'none',
                    border: 'none',
                    color: hkSubTab === 'configs' ? '#c084fc' : 'var(--text-muted)',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🔧 Maintenance & Config
                </button>
              </div>
            </div>

            {/* AI Command input quick-bar */}
            <form onSubmit={handleAiCommandSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(168, 85, 247, 0.03)', border: '1px solid rgba(168, 85, 247, 0.12)', padding: '10px 14px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                <Sparkles size={14} />
                <span>Flexi AI Assistant:</span>
              </div>
              <input 
                type="text" 
                className="input-field" 
                style={{ flex: 1, height: '28px', fontSize: '12px', background: 'rgba(0,0,0,0.1)' }}
                placeholder="e.g. 'assign Ramesh to room 103' or 'mark room 104 as dirty'"
                value={aiCommandInput}
                onChange={e => setAiCommandInput(e.target.value)}
              />
              <button 
                type="submit" 
                style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '0 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Send
              </button>
            </form>

            {/* Sub-tab 1: Room Charter Grid */}
            {hkSubTab === 'charter' && (
              <div>
                {/* Bulk actions & Assignment tool */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Selected: <strong>{bulkSelectedRoomIds.length}</strong>
                    </span>
                    <button 
                      onClick={() => handleBulkMarkStatus('AVAILABLE')}
                      disabled={bulkSelectedRoomIds.length === 0}
                      style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Mark Clean
                    </button>
                    <button 
                      onClick={() => handleBulkMarkStatus('HOUSEKEEPING')}
                      disabled={bulkSelectedRoomIds.length === 0}
                      style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Mark Dirty
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bulk Assign Staff:</span>
                    <select 
                      className="input-field" 
                      style={{ width: '130px', height: '26px', fontSize: '11px', padding: '0 4px' }}
                      value={cleanerInput}
                      onChange={e => setCleanerInput(e.target.value)}
                    >
                      <option value="">-- Cleaner --</option>
                      <option value="Ramesh Kumar">Ramesh Kumar</option>
                      <option value="Sita Devi">Sita Devi</option>
                      <option value="Sunil Singh">Sunil Singh</option>
                      <option value="Anita Pal">Anita Pal</option>
                    </select>
                    <button
                      onClick={() => handleBulkAssignCleaners(cleanerInput)}
                      disabled={bulkSelectedRoomIds.length === 0 || !cleanerInput}
                      style={{ padding: '4px 10px', background: '#a855f7', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Assign Selected
                    </button>
                  </div>
                </div>

                {/* Grid Table */}
                <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ width: '40px', padding: '10px 14px', textAlign: 'left' }}>
                          <input 
                            type="checkbox"
                            checked={bulkSelectedRoomIds.length > 0 && bulkSelectedRoomIds.length === rooms.length}
                            onChange={(e) => {
                              if (e.target.checked) setBulkSelectedRoomIds(rooms.map(r => r.id))
                              else setBulkSelectedRoomIds([])
                            }}
                          />
                        </th>
                        <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Room Number</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Room Type</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>PMS Status</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Active cleaner</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Maintenance details</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--text-muted)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(rm => {
                        const activeTask = hkTasks.find(t => t.roomId === rm.id && t.status === 'IN_PROGRESS')
                        const ticket = maintenanceTickets.find(t => t.roomId === rm.id && t.status === 'OPEN')
                        
                        let displayStatus = 'CLEAN'
                        let statusColor = '#10b981'
                        let bgStatusColor = 'rgba(16, 185, 129, 0.1)'
                        
                        if (rm.status === 'HOUSEKEEPING') {
                          displayStatus = activeTask ? 'IN PROGRESS' : 'DIRTY'
                          statusColor = activeTask ? '#3b82f6' : '#ef4444'
                          bgStatusColor = activeTask ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                        } else if (rm.status === 'MAINTENANCE') {
                          displayStatus = 'OUT OF ORDER'
                          statusColor = '#f59e0b'
                          bgStatusColor = 'rgba(245, 158, 11, 0.1)'
                        } else if (rm.status === 'OCCUPIED') {
                          displayStatus = 'OCCUPIED'
                          statusColor = '#a855f7'
                          bgStatusColor = 'rgba(168, 85, 247, 0.1)'
                        }

                        const isSelected = bulkSelectedRoomIds.includes(rm.id)

                        return (
                          <tr key={rm.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.01)', background: isSelected ? 'rgba(168, 85, 247, 0.02)' : 'none' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setBulkSelectedRoomIds([...bulkSelectedRoomIds, rm.id])
                                  else setBulkSelectedRoomIds(bulkSelectedRoomIds.filter(id => id !== rm.id))
                                }}
                              />
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700 }}>Room {rm.roomNumber}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                              {roomTypes.find(rt => rt.id === rm.roomTypeId)?.name || 'Standard'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                color: statusColor,
                                background: bgStatusColor,
                                border: `1px solid ${statusColor}30`,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                display: 'inline-block'
                              }}>
                                {displayStatus}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {activeTask ? (
                                <strong style={{ color: '#fff' }}>{activeTask.cleanerName}</strong>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {ticket ? (
                                <span style={{ color: '#f87171', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <AlertTriangle size={12} /> {ticket.description}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>--</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {rm.status === 'HOUSEKEEPING' && !activeTask && (
                                  <button
                                    onClick={() => {
                                      setTargetRoomInput(rm.id)
                                      setCleanerInput('Ramesh Kumar') // Default select
                                    }}
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                                  >
                                    Assign
                                  </button>
                                )}
                                {rm.status !== 'MAINTENANCE' ? (
                                  <button
                                    onClick={() => {
                                      setMaintenanceRoomInput(rm.id)
                                      setMaintenanceDesc('Routine plumbing inspection')
                                      setHkSubTab('configs')
                                    }}
                                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                                  >
                                    Mark OOO
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      const t = maintenanceTickets.find(tkt => tkt.roomId === rm.id && tkt.status === 'OPEN')
                                      if (t) handleReleaseMaintenanceRoom(t.id, rm.id)
                                    }}
                                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                                  >
                                    Release
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Simulated Mobile Cleaner View */}
            {hkSubTab === 'mobile' && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                {/* Mobile Shell Frame */}
                <div style={{
                  width: '360px',
                  background: '#0d1323',
                  border: '12px solid #1e293b',
                  borderRadius: '36px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  overflow: 'hidden',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  {/* Phone Header */}
                  <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '10px', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>Stayflexi Mobile</span>
                      <select 
                        style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', outline: 'none', padding: 0 }}
                        value={activeCleaner}
                        onChange={e => setActiveCleaner(e.target.value)}
                      >
                        <option value="Ramesh Kumar" style={{ background: '#0e1424', color: '#fff' }}>Ramesh Kumar</option>
                        <option value="Sita Devi" style={{ background: '#0e1424', color: '#fff' }}>Sita Devi</option>
                        <option value="Sunil Singh" style={{ background: '#0e1424', color: '#fff' }}>Sunil Singh</option>
                        <option value="Anita Pal" style={{ background: '#0e1424', color: '#fff' }}>Anita Pal</option>
                      </select>
                    </div>
                    <span className="status-badge available" style={{ fontSize: '9px', padding: '1px 6px' }}>Online</span>
                  </div>

                  {/* Tasks List */}
                  <div style={{ padding: '20px', height: '400px', overflowY: 'auto' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 14px 0', color: 'var(--text-muted)' }}>Assigned Cleaning Duties</h4>
                    
                    {hkTasks.filter(t => t.cleanerName === activeCleaner && t.status === 'IN_PROGRESS').length === 0 ? (
                      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Inbox size={24} style={{ color: 'rgba(255,255,255,0.1)' }} />
                        <span>All clean! No assigned tasks for this cleaner shift.</span>
                      </div>
                    ) : (
                      hkTasks.filter(t => t.cleanerName === activeCleaner && t.status === 'IN_PROGRESS').map(task => {
                        const isTimerRunning = cleaningStartTime !== null

                        return (
                          <div key={task.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: '15px', color: '#fff' }}>Room {task.roomNumber}</span>
                              <span style={{ fontSize: '9px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                {task.priority} Priority
                              </span>
                            </div>

                            {!isTimerRunning ? (
                              <button
                                onClick={() => handleStartCleaningTask(task.id)}
                                style={{
                                  background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                                  border: 'none',
                                  color: '#fff',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Start Cleaning
                              </button>
                            ) : (
                              <>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={mobileTaskChecklist.bedding} 
                                      onChange={e => setMobileTaskChecklist({...mobileTaskChecklist, bedding: e.target.checked})} 
                                    />
                                    <span>Bedding & Linens changed</span>
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={mobileTaskChecklist.minibar} 
                                      onChange={e => setMobileTaskChecklist({...mobileTaskChecklist, minibar: e.target.checked})} 
                                    />
                                    <span>Minibar replenished</span>
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={mobileTaskChecklist.bathroom} 
                                      onChange={e => setMobileTaskChecklist({...mobileTaskChecklist, bathroom: e.target.checked})} 
                                    />
                                    <span>Bathroom sanitized</span>
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={mobileTaskChecklist.dusting} 
                                      onChange={e => setMobileTaskChecklist({...mobileTaskChecklist, dusting: e.target.checked})} 
                                    />
                                    <span>Dusting & vacuuming done</span>
                                  </label>
                                </div>

                                <button
                                  onClick={() => handleCompleteHkTask(task.id, task.roomId)}
                                  disabled={!(mobileTaskChecklist.bedding && mobileTaskChecklist.minibar && mobileTaskChecklist.bathroom && mobileTaskChecklist.dusting)}
                                  style={{
                                    background: (mobileTaskChecklist.bedding && mobileTaskChecklist.minibar && mobileTaskChecklist.bathroom && mobileTaskChecklist.dusting)
                                      ? 'linear-gradient(135deg, #10b981, #059669)'
                                      : 'rgba(255,255,255,0.05)',
                                    color: (mobileTaskChecklist.bedding && mobileTaskChecklist.minibar && mobileTaskChecklist.bathroom && mobileTaskChecklist.dusting) ? '#fff' : 'var(--text-muted)',
                                    border: 'none',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: (mobileTaskChecklist.bedding && mobileTaskChecklist.minibar && mobileTaskChecklist.bathroom && mobileTaskChecklist.dusting) ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  Complete clean
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 3: Maintenance & Config Rules */}
            {hkSubTab === 'configs' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                {/* Out of Order logs */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={16} />
                    <span>Out of Order Maintenance Registry</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {maintenanceTickets.filter(t => t.status === 'OPEN').length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                        No active maintenance tickets logged.
                      </div>
                    ) : (
                      maintenanceTickets.filter(t => t.status === 'OPEN').map(tkt => (
                        <div key={tkt.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '13px' }}>Room {tkt.roomNumber}</span>
                              <span style={{ fontSize: '9px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>{tkt.priority}</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>{tkt.description}</p>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Logged: {new Date(tkt.dateLogged).toLocaleDateString()}</span>
                          </div>
                          <button
                            onClick={() => handleReleaseMaintenanceRoom(tkt.id, tkt.roomId)}
                            style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Resolve & Release
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Audit Trail */}
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>Operational Cleanup Audit Trail</h4>
                  <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)' }}>Room</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)' }}>Cleaner</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)' }}>Duration</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)' }}>Completed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hkAuditLogs.map((log, idx) => (
                          <tr key={log.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>Room {log.roomNumber}</td>
                            <td style={{ padding: '8px 12px' }}>{log.cleanerName}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{Math.round(log.durationSeconds / 60)} mins</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                              {new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rules settings & Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Lock room Form */}
                  <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                    <h5 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 12px 0' }}>Log Maintenance Lock</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Room</label>
                        <select 
                          className="input-field" 
                          value={maintenanceRoomInput}
                          onChange={e => setMaintenanceRoomInput(e.target.value)}
                        >
                          <option value="">-- Select Room --</option>
                          {rooms.map(rm => (
                            <option key={rm.id} value={rm.id}>Room {rm.roomNumber} ({rm.status})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Maintenance Issue</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. Wall outlet sparking"
                          value={maintenanceDesc}
                          onChange={e => setMaintenanceDesc(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Severity</label>
                        <select 
                          className="input-field" 
                          value={maintenancePriority}
                          onChange={e => setMaintenancePriority(e.target.value as any)}
                        >
                          <option value="HIGH">High (Lock room)</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </div>
                      <button
                        onClick={handleLogMaintenanceTicket}
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#060913', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}
                      >
                        Lock room & log ticket
                      </button>
                    </div>
                  </div>

                  {/* Operational Settings */}
                  <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                    <h5 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 12px 0' }}>Bypass & Trigger Rules</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={hkConfig.autoDirtyOnCheckout}
                          onChange={e => {
                            const newCfg = { ...hkConfig, autoDirtyOnCheckout: e.target.checked }
                            setHkConfig(newCfg)
                            localStorage.setItem('sf_hk_config', JSON.stringify(newCfg))
                          }}
                        />
                        <span>Auto-Dirty Room on Guest Checkout</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={hkConfig.autoDirtyOnDailyAudit}
                          onChange={e => {
                            const newCfg = { ...hkConfig, autoDirtyOnDailyAudit: e.target.checked }
                            setHkConfig(newCfg)
                            localStorage.setItem('sf_hk_config', JSON.stringify(newCfg))
                          }}
                        />
                        <span>Auto-Dirty Stayover on Nightly Audit</span>
                      </label>
                      
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nightly Audit Simulator:</span>
                        <button
                          onClick={async () => {
                            // Set all occupied rooms to HOUSEKEEPING
                            for (const rm of rooms.filter(r => r.status === 'OCCUPIED')) {
                              await dataClient.updateRoomStatus(rm.id, 'HOUSEKEEPING')
                            }
                            const updatedRooms = await dataClient.getRooms()
                            setRooms(updatedRooms)
                            alert("Daily audit complete. All occupied rooms marked dirty stayover.")
                            broadcastDatabaseUpdate()
                          }}
                          style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Trigger Audit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* App 2: REPORTS CONSOLE */}
        {activeApp === 'reports' && (
          <div>
            {/* Header section with date pickers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText style={{ color: '#0ea5e9' }} size={24} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Reports & Business Intelligence</h3>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Query Period:</span>
                <input 
                  type="date" 
                  className="input-field" 
                  style={{ width: '130px', height: '28px', fontSize: '11px', padding: '0 6px' }} 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>to</span>
                <input 
                  type="date" 
                  className="input-field" 
                  style={{ width: '130px', height: '28px', fontSize: '11px', padding: '0 6px' }} 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                />
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Occupancy Rate</div>
                <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{reportsOccupancyRate}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{reportsCheckedInCount} / {reportsTotalRooms} rooms occupied</div>
              </div>
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Period Revenue</div>
                <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', color: '#10b981' }}>${reportsTotalRevenue.toFixed(2)}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Includes POS & room charges</div>
              </div>
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Average Daily Rate (ADR)</div>
                <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', color: '#fff' }}>${reportsADR}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Per occupied room day</div>
              </div>
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>RevPAR</div>
                <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', color: '#fff' }}>${reportsRevPAR}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Revenue per available room</div>
              </div>
            </div>

            {/* Inner Sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '16px', marginBottom: '20px' }}>
              <button
                onClick={() => setReportsSubTab('financial')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: reportsSubTab === 'financial' ? '2px solid #0ea5e9' : '2px solid transparent',
                  color: reportsSubTab === 'financial' ? '#0ea5e9' : 'var(--text-muted)',
                  padding: '8px 4px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📊 Financial Statement
              </button>
              <button
                onClick={() => setReportsSubTab('operations')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: reportsSubTab === 'operations' ? '2px solid #0ea5e9' : '2px solid transparent',
                  color: reportsSubTab === 'operations' ? '#0ea5e9' : 'var(--text-muted)',
                  padding: '8px 4px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🏨 Operations & Staff KPIs
              </button>
              <button
                onClick={() => setReportsSubTab('distribution')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: reportsSubTab === 'distribution' ? '2px solid #0ea5e9' : '2px solid transparent',
                  color: reportsSubTab === 'distribution' ? '#0ea5e9' : 'var(--text-muted)',
                  padding: '8px 4px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔌 Channel Share
              </button>
            </div>

            {/* Tab view renders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Left Column: Data Tables */}
              <div>
                {reportsSubTab === 'financial' && (
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Operational Profit & Loss Statement</h4>
                    <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Room Bookings base rate</span>
                        <strong style={{ color: '#fff' }}>${roomRev.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>POS Retail Basket charges</span>
                        <strong style={{ color: '#fff' }}>${posRev.toFixed(2)}</strong>
                      </div>
                      {spaRev > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Spa Wellness charges</span>
                          <strong style={{ color: '#fff' }}>${spaRev.toFixed(2)}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>GST/Hotel tax collected ({propTaxRate}%)</span>
                        <strong style={{ color: '#0ea5e9' }}>${(roomRev * (parseFloat(propTaxRate) || 0) / 100).toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Stripe gateway ledger payouts</span>
                        <strong style={{ color: '#10b981' }}>${reportsTotalPayments.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total expenditures (OpEx)</span>
                        <strong style={{ color: '#ef4444' }}>-${reportsTotalOpEx.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, paddingTop: '4px' }}>
                        <span>Net Profit</span>
                        <span style={{ color: reportsNetProfit >= 0 ? '#10b981' : '#ef4444' }}>
                          ${reportsNetProfit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {reportsSubTab === 'operations' && (
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Staff Housekeeping Performance Index</h4>
                    
                    {filteredAuditLogs.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', borderRadius: '8px', fontSize: '12px' }}>
                        No audit logs recorded for the selected date range.
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)' }}>Staff Name</th>
                              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-muted)' }}>Cleans Completed</th>
                              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)' }}>Avg Cleaning speed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(new Set(filteredAuditLogs.map(l => l.cleanerName))).map((cleaner, idx) => {
                              const logs = filteredAuditLogs.filter(l => l.cleanerName === cleaner)
                              const avgMinutes = Math.round(logs.reduce((sum, l) => sum + l.durationSeconds, 0) / logs.length / 60)
                              
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>{cleaner}</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{logs.length} rooms</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{avgMinutes} mins</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {reportsSubTab === 'distribution' && (
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>OTA Distribution Channel Splits</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {channelShares.map((item, idx) => (
                        <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '10px 14px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600 }}>{item.channel}</span>
                            <strong>${item.revenue.toFixed(2)} ({item.share})</strong>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: item.share, height: '100%', background: item.color, borderRadius: '2px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export triggers */}
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginTop: '20px', marginBottom: '10px' }}>Export Performance Audits</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDownloadCsv("Daily_Flash_Report", 
                      ["Occupancy_Rate", "ADR", "RevPAR", "Total_Revenue"], 
                      [[`${reportsOccupancyRate}%`, `$${reportsADR}`, `$${reportsRevPAR}`, `$${reportsTotalRevenue.toFixed(2)}`]]
                    )}
                    style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  >
                    💾 Daily Flash CSV
                  </button>
                  <button
                    onClick={() => {
                      const taxPct = parseFloat(propTaxRate) || 0;
                      handleDownloadCsv("GST_Tax_Ledger", 
                        ["Reservation_ID", "Guest_Name", "Total_Amount", `Est_GST_${propTaxRate}_Percent`], 
                        filteredReservations.map(r => [r.id, r.guestName, r.amount, (r.amount * (taxPct / 100)).toFixed(2)])
                      );
                    }}
                    style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  >
                    💾 GST Tax CSV
                  </button>
                  <button
                    onClick={() => handleDownloadCsv("Housecleaning_Performance", 
                      ["Log_ID", "Room_Number", "Cleaner_Name", "Started_At", "Completed_At", "Duration_Seconds"], 
                      filteredAuditLogs.map(l => [l.id, l.roomNumber, l.cleanerName, l.startedAt, l.completedAt, l.durationSeconds])
                    )}
                    style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  >
                    💾 Cleaner Audit CSV
                  </button>
                </div>
              </div>

              {/* Right Column: AI Explainer and SVG Donut */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* SVG Revenue Breakdown Donut Chart */}
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Revenue Breakdown</span>
                  <svg width="110" height="110" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="3.5" />
                    {roomPct > 0 && (
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="4.5" strokeDasharray={`${roomPct} ${100 - roomPct}`} strokeDashoffset="0" />
                    )}
                    {posPct > 0 && (
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#0ea5e9" strokeWidth="4.5" strokeDasharray={`${posPct} ${100 - posPct}`} strokeDashoffset={-roomPct} />
                    )}
                    {spaPct > 0 && (
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray={`${spaPct} ${100 - spaPct}`} strokeDashoffset={-(roomPct + posPct)} />
                    )}
                  </svg>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} /> Room</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{ width: '6px', height: '6px', background: '#0ea5e9', borderRadius: '50%' }} /> POS</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{ width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%' }} /> Spa</span>
                  </div>
                </div>

                {/* AI Performance Explainer widget */}
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Sparkles size={13} style={{ color: '#fbbf24' }} />
                    <span>Flexi AI Performance explainer</span>
                  </h5>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button
                      onClick={() => handleGenerateReportsAi('financial')}
                      style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                    >
                      💡 Cash Flow Analysis
                    </button>
                    <button
                      onClick={() => handleGenerateReportsAi('operations')}
                      style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                    >
                      💡 Clean Speed Metrics
                    </button>
                    <button
                      onClick={() => handleGenerateReportsAi('channels')}
                      style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                    >
                      💡 Channel Yield Analysis
                    </button>
                  </div>

                  {aiReportsPrompt ? (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', fontSize: '11px', color: '#e5e7eb', flexGrow: 1, maxHeight: '130px', overflowY: 'auto' }}>
                      {loadingReportsAi ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Generating operational BI summary...</span>
                        </div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                          {aiReportsResponse}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      Click an AI analysis button above to generate insights.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* App 3: SHOPS POS */}
        {/* App 3: SHOPS POS CONSOLE */}
        {activeApp === 'shops' && (
          <div>
            {/* Header section with tab selectors */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShoppingBag style={{ color: '#00f2fe' }} size={24} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Hotel Shops Point of Sale (POS)</h3>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShopsSubTab('terminal')}
                  style={{
                    padding: '4px 12px',
                    background: shopsSubTab === 'terminal' ? 'rgba(0, 242, 254, 0.15)' : 'none',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    color: shopsSubTab === 'terminal' ? '#00f2fe' : 'var(--text-muted)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🛒 POS Cashier Terminal
                </button>
                <button
                  onClick={() => setShopsSubTab('manage')}
                  style={{
                    padding: '4px 12px',
                    background: shopsSubTab === 'manage' ? 'rgba(0, 242, 254, 0.15)' : 'none',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    color: shopsSubTab === 'manage' ? '#00f2fe' : 'var(--text-muted)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ⚙️ Catalog Manager
                </button>
              </div>
            </div>

            {shopsSubTab === 'terminal' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                {/* Left Column: Product Selection */}
                <div>
                  {/* Search and Category Filters */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="Search products..." 
                      className="input-field" 
                      style={{ flex: 1, height: '30px', fontSize: '11px', padding: '0 8px' }}
                      value={shopSearchQuery}
                      onChange={e => setShopSearchQuery(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['All', 'Minibar', 'Restaurant', 'Spa', 'Souvenirs'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setActiveShopCategory(cat)}
                          style={{
                            padding: '4px 8px',
                            background: activeShopCategory === cat ? '#00f2fe' : 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-card)',
                            color: activeShopCategory === cat ? '#060913' : '#fff',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Product Grid */}
                  <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>POS Retail Items Catalog</h4>
                  {posProducts.filter(p => {
                    const matchCat = activeShopCategory === 'All' || p.category === activeShopCategory;
                    const matchQuery = p.name.toLowerCase().includes(shopSearchQuery.toLowerCase());
                    return matchCat && matchQuery;
                  }).length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '20px 0', textAlign: 'center' }}>
                      No items matching filters found.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      {posProducts.filter(p => {
                        const matchCat = activeShopCategory === 'All' || p.category === activeShopCategory;
                        const matchQuery = p.name.toLowerCase().includes(shopSearchQuery.toLowerCase());
                        return matchCat && matchQuery;
                      }).map(prod => (
                        <div 
                          key={prod.id} 
                          onClick={() => handleAddToCart(prod)}
                          style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                          className="shop-card"
                        >
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{prod.category}</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px', color: '#fff' }}>{prod.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#00f2fe' }}>${prod.price.toFixed(2)}</span>
                            <span style={{ fontSize: '10px', color: '#00f2fe', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <Plus size={10} /> Add
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Checkout Basket */}
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '14px', height: 'fit-content' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, margin: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>Active Checkout Basket</h4>
                  
                  {posCart.length === 0 ? (
                    <div style={{ padding: '40px 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: '12px' }}>
                      Cart is empty. Click retail items on the left to add.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1, maxHeight: '200px', overflowY: 'auto' }}>
                        {posCart.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600 }}>{item.product.name}</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>${item.product.price.toFixed(2)} each</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDecrementCart(item.product.id); }}
                                style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                              >
                                -
                              </button>
                              <span style={{ fontWeight: 700, minWidth: '14px', textAlign: 'center' }}>{item.quantity}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAddToCart(item.product); }}
                                style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                              >
                                +
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveFromCart(item.product.id); }}
                                style={{ marginLeft: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Cart calculations */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Subtotal:</span>
                          <span style={{ color: '#fff' }}>${getCartMetrics().subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Promo Discount (%):</span>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ width: '50px', height: '18px', padding: '0 4px', fontSize: '10px', textAlign: 'right' }} 
                            value={posDiscount} 
                            onChange={e => setPosDiscount(e.target.value)} 
                            min="0"
                            max="100"
                          />
                        </div>
                        {parseFloat(posDiscount) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                            <span>Discount Value:</span>
                            <span>-${getCartMetrics().discountVal.toFixed(2)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>GST Service Tax ({propTaxRate}%):</span>
                          <span style={{ color: '#fff' }}>${getCartMetrics().taxVal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px', color: '#00f2fe', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                          <span>Total Due:</span>
                          <span>${getCartMetrics().total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Checkout Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Checkout Mode</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleDirectPOSPayment('CASH')}
                              style={{ flex: 1, padding: '6px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              💵 Cash Settle
                            </button>
                            <button
                              onClick={() => handleDirectPOSPayment('CARD')}
                              style={{ flex: 1, padding: '6px 10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              💳 Card Settle
                            </button>
                          </div>
                        </div>
                        
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Or Charge to Guest Room Folio</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              className="input-field"
                              style={{ flex: 1, height: '28px', fontSize: '11px', padding: '0 4px' }}
                              value={chargeGuestId}
                              onChange={e => setChargeGuestId(e.target.value)}
                            >
                              <option value="">-- Select In-House Guest --</option>
                              {reservations.filter(r => r.status === 'CHECKED_IN').map(res => (
                                <option key={res.id} value={res.id}>{res.guestName} (Room {res.roomNumber})</option>
                              ))}
                            </select>
                            <button
                              onClick={handlePostPosCharge}
                              disabled={!chargeGuestId}
                              style={{
                                padding: '4px 10px',
                                background: !chargeGuestId ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                color: !chargeGuestId ? 'var(--text-muted)' : '#060913',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: !chargeGuestId ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Post Folio
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {shopsSubTab === 'manage' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                {/* Catalog list table */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Product Catalog List</h4>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Product Name</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Category</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posProducts.map(prod => (
                          <tr key={prod.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{prod.name}</td>
                            <td style={{ padding: '8px 12px' }}>{prod.category}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>${prod.price.toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button 
                                onClick={() => handleDeleteProduct(prod.id)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add new product form */}
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', height: 'fit-content' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>Add New Product</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Product Name</label>
                      <input type="text" className="input-field" value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="e.g. Diet Soda" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Price ($)</label>
                        <input type="text" className="input-field" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} placeholder="e.g. 4.50" />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category</label>
                        <select className="input-field" value={newProdCat} onChange={e => setNewProdCat(e.target.value)}>
                          <option value="Minibar">Minibar</option>
                          <option value="Restaurant">Restaurant</option>
                          <option value="Spa">Spa</option>
                          <option value="Souvenirs">Souvenirs</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={handleCreateProduct}
                      style={{ padding: '8px 16px', marginTop: '6px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', border: 'none', color: '#060913', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Save Product to Catalog
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* App 4: REVENUE MANAGEMENT */}
        {activeApp === 'revenue' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <TrendingUp style={{ color: '#10b981' }} />
                <span>Yield Revenue & Dynamic Pricing Engine</span>
              </h3>
              <span className={`status-badge ${autoPilotYield ? 'available' : 'maintenance'}`}>
                {autoPilotYield ? '⚡ Auto-Pilot Active' : '● Manual pricing mode'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '24px' }}>
              {/* Left Column: Yield Optimization Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>Dynamic Yield Optimization</h4>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={autoPilotYield} 
                        onChange={e => {
                          setAutoPilotYield(e.target.checked);
                          const cfg = { rateMultiplier, otaBoostPct, autoPilotYield: e.target.checked };
                          localStorage.setItem('sf_revenue_configs', JSON.stringify(cfg));
                        }} 
                      />
                      Enable Auto-Pilot Yield
                    </label>
                  </div>
                  
                  {autoPilotYield && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '10px 14px', borderRadius: '6px', fontSize: '11px', lineHeight: 1.4 }}>
                      ⚡ **Auto-Pilot pricing rule engaged**: Adjusting rates dynamically based on period occupancy rate (**{reportsOccupancyRate}%**). Currently set to **{rateMultiplier.toFixed(2)}x** surge.
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Occupancy Surge Multiplier</span>
                      <strong style={{ color: '#10b981' }}>{rateMultiplier.toFixed(2)}x</strong>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.5"
                      step="0.05"
                      value={rateMultiplier}
                      disabled={autoPilotYield}
                      onChange={e => handleSliderChange(parseFloat(e.target.value))}
                      style={{ width: '100%', cursor: autoPilotYield ? 'not-allowed' : 'pointer', accentColor: '#10b981', opacity: autoPilotYield ? 0.5 : 1 }}
                    />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Adjusting this multiplier updates direct booking engine rates based on real-time composite demand curves.
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <h5 style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>OTA Channel markup booster</h5>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="number"
                        className="input-field"
                        style={{ maxWidth: '70px', height: '28px', fontSize: '11px' }}
                        value={otaBoostPct}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setOtaBoostPct(val);
                          const cfg = { rateMultiplier, otaBoostPct: val, autoPilotYield };
                          localStorage.setItem('sf_revenue_configs', JSON.stringify(cfg));
                        }}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>% Mark-up on OTA channels</span>
                      <button
                        onClick={handleApplyParityBoost}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginLeft: 'auto'
                        }}
                      >
                        Push Rates Sync
                      </button>
                    </div>
                  </div>
                </div>

                {/* Competitor Rate Shopper */}
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Competitor Rate Shopper Benchmarks</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {competitors.map((comp, idx) => {
                      const ourDeluxeRate = 150 * rateMultiplier;
                      const offset = Math.round(((ourDeluxeRate - comp.rate) / comp.rate) * 100);
                      const isCheaper = offset < 0;
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{comp.name}</span>
                            <span style={{ color: isCheaper ? '#10b981' : '#ef4444', fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>
                              {offset === 0 ? 'Identical to our rate' : `${Math.abs(offset)}% ${isCheaper ? 'cheaper than' : 'higher than'} competitor`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '12px' }}>${comp.rate.toFixed(2)}</strong>
                            <button
                              onClick={() => handleMatchCompetitor(comp.rate)}
                              style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                            >
                              Match
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Room Types Channel Pricing Matrix */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Room Types Channel Pricing Matrix</h4>
                <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Room Category</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px' }}>Base Price</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px' }}>Direct Rate</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px' }}>OTA Rate ({otaBoostPct}% markup)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomTypes.map(rt => {
                        const directRate = rt.basePrice * rateMultiplier;
                        const otaRate = directRate * (1 + otaBoostPct / 100);
                        return (
                          <tr key={rt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{rt.name}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>${rt.basePrice.toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#10b981', fontWeight: 700 }}>${directRate.toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0ea5e9', fontWeight: 700 }}>${otaRate.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* App 5: REVIEWS FEED */}
        {activeApp === 'reviews' && (() => {
          const totalReviewsCount = reviews.length;
          const averageRating = totalReviewsCount > 0 
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1)
            : '0.0';
          const positiveSentimentCount = reviews.filter(r => r.sentiment === 'positive').length;
          const neutralSentimentCount = reviews.filter(r => r.sentiment === 'neutral').length;
          const negativeSentimentCount = reviews.filter(r => r.sentiment === 'negative').length;

          const filteredReviews = reviews.filter(rev => {
            const matchSrc = reviewsFilterSource === 'All' || rev.source === reviewsFilterSource;
            const matchStatus = reviewsFilterStatus === 'All' || rev.status === reviewsFilterStatus;
            return matchSrc && matchStatus;
          });

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <MessageSquare style={{ color: '#f59e0b' }} />
                  <span>Guest Reviews & AI Auto-Responder</span>
                </h3>
                <button
                  onClick={() => setShowMockReviewForm(!showMockReviewForm)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {showMockReviewForm ? '✕ Close Simulator' : '➕ Ingest Mock Review'}
                </button>
              </div>

              {/* Sentiment Scorecard Dashboard */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Average Rating</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{averageRating} / 5.0</span>
                    <Star size={16} fill="#f59e0b" stroke="none" />
                  </div>
                </div>
                <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Positive Sentiment</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#10b981' }}>{positiveSentimentCount} reviews</div>
                </div>
                <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Neutral Sentiment</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#f59e0b' }}>{neutralSentimentCount} reviews</div>
                </div>
                <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Negative Sentiment</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#ef4444' }}>{negativeSentimentCount} reviews</div>
                </div>
              </div>

              {/* Mock Review Form Drawer */}
              {showMockReviewForm && (
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.02)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', color: '#fbbf24' }}>Simulate Guest Review Ingestion</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '12px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Review Platform Source</label>
                      <select 
                        className="input-field" 
                        value={newRevSource} 
                        onChange={e => setNewRevSource(e.target.value as any)}
                        style={{ height: '28px', fontSize: '11px' }}
                      >
                        <option value="Google">Google Reviews</option>
                        <option value="TripAdvisor">TripAdvisor</option>
                        <option value="Booking.com">Booking.com</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rating Score</label>
                      <select 
                        className="input-field" 
                        value={newRevRating} 
                        onChange={e => setNewRevRating(parseInt(e.target.value))}
                        style={{ height: '28px', fontSize: '11px' }}
                      >
                        <option value="5">5 Stars (Excellent)</option>
                        <option value="4">4 Stars (Good)</option>
                        <option value="3">3 Stars (Average)</option>
                        <option value="2">2 Stars (Poor)</option>
                        <option value="1">1 Star (Terrible)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Guest Comments</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. Excellent service, clean rooms!" 
                          value={newRevComment}
                          onChange={e => setNewRevComment(e.target.value)}
                          style={{ height: '28px', fontSize: '11px', flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newRevComment) return alert("Please enter a review comment first.");
                            setLoadingAi(true);
                            try {
                              const res = await dataClient.analyzeReviewSentiment(newRevComment);
                              setNewRevRating(res.rating);
                              alert(`AI Evaluation Result:\n\nDetected Rating: ${res.rating} Stars\nSentiment: ${res.sentiment.toUpperCase()}`);
                            } catch (e) {
                              alert("AI analysis failed.");
                            } finally {
                              setLoadingAi(false);
                            }
                          }}
                          disabled={loadingAi}
                          style={{
                            padding: '0 10px',
                            background: 'rgba(0, 242, 254, 0.15)',
                            border: '1px solid rgba(0, 242, 254, 0.3)',
                            color: '#00f2fe',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{loadingAi ? 'Scoring...' : '✨ AI Score'}</span>
                        </button>
                        <button
                          onClick={handleCreateMockReview}
                          disabled={loadingAi}
                          style={{ padding: '0 14px', background: '#f59e0b', color: '#060913', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', height: '28px' }}
                        >
                          {loadingAi ? 'Analyzing...' : 'Ingest'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '8px 12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Platform:</span>
                  {['All', 'Google', 'TripAdvisor', 'Booking.com'].map(src => (
                    <button
                      key={src}
                      onClick={() => setReviewsFilterSource(src as any)}
                      style={{
                        padding: '4px 8px',
                        background: reviewsFilterSource === src ? 'rgba(245, 158, 11, 0.15)' : 'none',
                        border: reviewsFilterSource === src ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                        color: reviewsFilterSource === src ? '#fbbf24' : 'var(--text-muted)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {src}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status:</span>
                  {['All', 'pending', 'replied'].map(st => (
                    <button
                      key={st}
                      onClick={() => setReviewsFilterStatus(st as any)}
                      style={{
                        padding: '4px 8px',
                        background: reviewsFilterStatus === st ? 'rgba(245, 158, 11, 0.15)' : 'none',
                        border: reviewsFilterStatus === st ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                        color: reviewsFilterStatus === st ? '#fbbf24' : 'var(--text-muted)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {st === 'pending' ? 'Pending' : st === 'replied' ? 'Replied' : 'All'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Column Split */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                {/* Reviews List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredReviews.length === 0 ? (
                    <div style={{ padding: '40px 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: '12px' }}>
                      No reviews found matching current filter selections.
                    </div>
                  ) : (
                    filteredReviews.map(rev => {
                      let badgeColor = '#f59e0b';
                      let bgBadgeColor = 'rgba(245, 158, 11, 0.1)';
                      if (rev.sentiment === 'positive') {
                        badgeColor = '#10b981';
                        bgBadgeColor = 'rgba(16, 185, 129, 0.1)';
                      } else if (rev.sentiment === 'negative') {
                        badgeColor = '#ef4444';
                        bgBadgeColor = 'rgba(239, 68, 68, 0.1)';
                      }

                      return (
                        <div key={rev.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '14px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '12px', color: '#fff' }}>{rev.source}</span>
                              <span style={{
                                color: badgeColor,
                                background: bgBadgeColor,
                                border: `1px solid ${badgeColor}20`,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {rev.sentiment}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {Array.from({ length: rev.rating }).map((_, i) => (
                                <Star key={i} size={11} fill="#f59e0b" stroke="none" />
                              ))}
                            </div>
                          </div>
                          <p style={{ fontSize: '12px', marginTop: '8px', lineHeight: 1.4, color: '#e5e7eb' }}>"{rev.comment}"</p>
                          
                          {rev.reply ? (
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', marginTop: '10px', fontSize: '11px', borderLeft: '2px solid #f59e0b', color: 'var(--text-muted)' }}>
                              <strong>Replied:</strong> {rev.reply}
                            </div>
                          ) : (
                            <button
                              onClick={() => triggerDraftAiReply(rev.id, rev.comment)}
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#fbbf24',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Sparkles size={11} /> Generate AI Response
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* AI Reply Builder */}
                <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', height: 'fit-content' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <Sparkles size={14} style={{ color: '#fbbf24' }} />
                      <span>AI Response Copilot</span>
                    </h4>
                    
                    {respondingReviewId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tone:</span>
                        <select 
                          className="input-field" 
                          value={aiTone} 
                          onChange={e => {
                            setAiTone(e.target.value as any);
                            const rev = reviews.find(r => r.id === respondingReviewId);
                            if (rev) {
                              triggerDraftAiReply(respondingReviewId, rev.comment);
                            }
                          }}
                          style={{ height: '20px', fontSize: '10px', width: '90px', padding: '0 4px' }}
                        >
                          <option value="Professional">Professional</option>
                          <option value="Apologetic">Apologetic</option>
                          <option value="Casual">Casual</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {respondingReviewId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Drafting reply to review: <strong>#{respondingReviewId.toUpperCase()}</strong>
                      </div>
                      
                      {loadingAi ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline', marginRight: '6px' }} />
                          Drafting {aiTone.toLowerCase()} reply...
                        </div>
                      ) : (
                        <>
                          <textarea
                            className="input-field"
                            style={{ minHeight: '140px', fontSize: '12px', lineHeight: 1.4, resize: 'vertical' }}
                            value={aiDraftResponse}
                            onChange={e => setAiDraftResponse(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setRespondingReviewId(null)}
                              style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              Discard
                            </button>
                            <button
                              onClick={() => handleSaveReviewReply(respondingReviewId)}
                              style={{ padding: '6px 14px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', border: 'none', color: '#060913', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Post Response
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Click "Generate AI Response" on any guest review to draft a reply.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* App 6: PAYMENTS */}
        {activeApp === 'payments' && (() => {
          const settledSum = paymentsList.filter(t => t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount, 0);
          const heldSum = paymentsList.filter(t => t.status === 'HELD').reduce((sum, t) => sum + t.amount, 0);
          const refundedSum = paymentsList.filter(t => t.status === 'REFUNDED').reduce((sum, t) => sum + t.amount, 0);

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <CreditCard style={{ color: '#3b82f6' }} />
                  <span>Stripe Payments & Pre-Authorization Ledger</span>
                </h3>
                <div className="status-badge available" style={{ gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  <span>Stripe API Gateway Online</span>
                </div>
              </div>

              {/* KPI Scorecard Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Gross Settled</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#10b981' }}>${settledSum.toFixed(2)}</div>
                </div>
                <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Held Deposits</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#f59e0b' }}>${heldSum.toFixed(2)}</div>
                </div>
                <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Refunds/Released</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#ef4444' }}>${refundedSum.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
                {/* Payments Ledger */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Reconciliation Ledger</h4>
                  <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-card)', borderRadius: '8px', overflowY: 'auto', maxHeight: '280px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)' }}>Txn ID</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)' }}>Guest Name</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)' }}>Method</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)' }}>Amount</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)' }}>Status</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-muted)' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsList.map(tx => (
                          <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{tx.id}</td>
                            <td style={{ padding: '8px 12px' }}>{tx.guestName}</td>
                            <td style={{ padding: '8px 12px' }}><code style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: '4px' }}>{tx.method}</code></td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>${tx.amount.toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <span style={{ 
                                color: tx.status === 'SUCCESS' ? '#10b981' : tx.status === 'HELD' ? '#f59e0b' : '#ef4444',
                                fontSize: '10px',
                                fontWeight: 700
                              }}>
                                ● {tx.status}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                {tx.status === 'SUCCESS' && (
                                  <button
                                    onClick={() => handleRefundTransaction(tx.id)}
                                    style={{ padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', borderRadius: '4px', fontSize: '9px', cursor: 'pointer' }}
                                  >
                                    Refund
                                  </button>
                                )}
                                {tx.status === 'HELD' && (
                                  <>
                                    <button
                                      onClick={() => handleCaptureHold(tx.id)}
                                      style={{ padding: '2px 6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '4px', fontSize: '9px', cursor: 'pointer' }}
                                    >
                                      Capture
                                    </button>
                                    <button
                                      onClick={() => handleRefundTransaction(tx.id)}
                                      style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-card)', color: '#fff', borderRadius: '4px', fontSize: '9px', cursor: 'pointer' }}
                                    >
                                      Release
                                    </button>
                                  </>
                                )}
                                {tx.status === 'REFUNDED' && (
                                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>--</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preauth Terminal */}
                <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', height: 'fit-content' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>Manual Card Pre-Auth Terminal</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Guest Profile Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Danny Pink"
                        value={preauthName}
                        onChange={e => setPreauthName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Authorization Amount ($)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="150"
                        value={preauthAmount}
                        onChange={e => setPreauthAmount(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handlePreauthSubmit}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '8px'
                      }}
                    >
                      Hold card funds
                    </button>
                  </div>
                </div>
              </div>

              {/* Gateway Webhooks Terminal */}
              <div className="glass-card" style={{ marginTop: '24px', padding: '16px', background: '#090d16', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                    <span>Stripe API Gateway Live Event Stream</span>
                  </div>
                  <button
                    onClick={() => setGatewayLogs([])}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontFamily: 'monospace' }}
                  >
                    Clear Console
                  </button>
                </div>
                <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'Courier New, Courier, monospace' }}>
                  {gatewayLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', padding: '10px 0' }}>Listening for API webhooks...</div>
                  ) : (
                    gatewayLogs.map(log => (
                      <div key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', fontWeight: 600, marginBottom: '3px' }}>
                          <span>👉 Event: {log.event}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{log.timestamp}</span>
                        </div>
                        <pre style={{ margin: 0, padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', color: '#34d399', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                          {log.payload}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* App 6: PROPERTY CONFIGS */}
        {activeApp === 'config' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Sliders style={{ color: '#94a3b8' }} />
                <span>Property Specifications & Advanced Configuration Console</span>
              </h3>
              <span className="status-badge available">Configuration Sync active</span>
            </div>

            {/* Sub-tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px' }}>
              {(['ops', 'tax', 'iot', 'portal'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveConfigTab(tab)}
                  style={{
                    background: activeConfigTab === tab ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: '1px solid ' + (activeConfigTab === tab ? 'rgba(255, 255, 255, 0.15)' : 'transparent'),
                    color: activeConfigTab === tab ? '#fff' : 'var(--text-muted)',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab === 'ops' && 'Operations & Policies'}
                  {tab === 'tax' && 'Tax & Surcharge Brackets'}
                  {tab === 'iot' && 'IoT Lock Integration'}
                  {tab === 'portal' && 'WiFi & Guest Portal'}
                </button>
              ))}
            </div>

            <div style={{ minHeight: '340px' }}>
              {/* Operations & Policies Sub-Tab */}
              {activeConfigTab === 'ops' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Operational Check Hours</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                      Define target check-in and check-out windows. Early arrival and late check-out requests will automatically calculate fees based on configured surcharge metrics.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Standard Check-In Time</label>
                        <input type="text" className="input-field" value={propCheckIn} onChange={e => setPropCheckIn(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Standard Check-Out Time</label>
                        <input type="text" className="input-field" value={propCheckOut} onChange={e => setPropCheckOut(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', height: 'fit-content' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', margin: 0 }}>Check-in Surcharge Policies</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Early Check-In Fee (Hourly)</span>
                          <strong style={{ color: '#38bdf8' }}>${earlyCheckInRate}/hr</strong>
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="5"
                          value={earlyCheckInRate}
                          onChange={e => setEarlyCheckInRate(parseFloat(e.target.value).toFixed(2))}
                          style={{ width: '100%', accentColor: '#38bdf8' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Late Check-Out Fee (Hourly)</span>
                          <strong style={{ color: '#f43f5e' }}>${lateCheckOutRate}/hr</strong>
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="5"
                          value={lateCheckOutRate}
                          onChange={e => setLateCheckOutRate(parseFloat(e.target.value).toFixed(2))}
                          style={{ width: '100%', accentColor: '#f43f5e' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tax & Surcharges Sub-Tab */}
              {activeConfigTab === 'tax' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Tax and Charge Brackets</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                      Define specific rates for room occupancy tax, food & beverage sales tax, and property flat-rate transaction surcharges.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Base Hotel Tax Rate (%)</label>
                        <input type="number" className="input-field" value={propTaxRate} onChange={e => setPropTaxRate(e.target.value)} />
                      </div>
                      
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>F&B Outlet Sales Tax Rate (%)</label>
                        <input type="number" className="input-field" value={foodTaxRate} onChange={e => setFoodTaxRate(e.target.value)} />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Flat Service Fee ($)</label>
                        <input type="number" className="input-field" value={serviceFee} onChange={e => setServiceFee(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '20px', background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', marginBottom: '14px', margin: 0 }}>INVOICE TAX BRACKET SIMULATION</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Standard Room Charge (Demo):</span>
                        <span>$150.00</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Room GST Tax ({propTaxRate}%):</span>
                        <span>${(150 * (parseFloat(propTaxRate) || 0) / 100).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Food/Minibar Charge (Demo):</span>
                        <span>$40.00</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>F&B Surcharge Tax ({foodTaxRate}%):</span>
                        <span>${(40 * (parseFloat(foodTaxRate) || 0) / 100).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Stayflexi Resort Fee (Flat):</span>
                        <span>${(parseFloat(serviceFee) || 0).toFixed(2)}</span>
                      </div>
                      
                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                        <span>Simulated Check-Out Total:</span>
                        <span>
                          ${(
                            150 + (150 * (parseFloat(propTaxRate) || 0) / 100) +
                            40 + (40 * (parseFloat(foodTaxRate) || 0) / 100) +
                            (parseFloat(serviceFee) || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* IoT Lock integration Sub-Tab */}
              {activeConfigTab === 'iot' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>IoT Smart Door Lock Vendor Configuration</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Lock Hardware Vendor</label>
                          <select className="input-field" value={lockVendor} onChange={e => setLockVendor(e.target.value)}>
                            <option value="Yale">Yale Connect API</option>
                            <option value="Salto">Salto Systems SDK</option>
                            <option value="AssaAbloy">Assa Abloy API</option>
                            <option value="VingCard">VingCard RFID Cloud</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Authorization Type</label>
                          <select className="input-field" value={lockAuthType} onChange={e => setLockAuthType(e.target.value as any)}>
                            <option value="oauth2">OAuth 2.0 Client Credentials</option>
                            <option value="api_key">Static API Bearer Token</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>IoT Server Lock Endpoint</label>
                        <input type="text" className="input-field" value={lockEndpoint} onChange={e => setLockEndpoint(e.target.value)} />
                      </div>

                      {lockAuthType === 'oauth2' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>OAuth Client ID</label>
                            <input type="text" className="input-field" value={lockClientId} onChange={e => setLockClientId(e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>OAuth Client Secret</label>
                            <input type="password" className="input-field" value={lockClientSecret} onChange={e => setLockClientSecret(e.target.value)} />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>API Token Authorization Key</label>
                          <input type="password" className="input-field" value={lockApiKey} onChange={e => setLockApiKey(e.target.value)} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={handleTestLockConnection}
                          disabled={testingLockConn}
                          style={{
                            background: testingLockConn ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: testingLockConn ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {testingLockConn ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Testing ({lockProgress}%)</span>
                            </>
                          ) : (
                            <>
                              <Activity size={12} />
                              <span>Test API Connection</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleClearIotLogs}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-muted)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Clear Logs
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Terminal and API Payload Sandbox */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="glass-card" style={{ padding: '12px', background: '#070a13', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                          LOCK GATEWAY DIAGNOSTICS TERMINAL
                        </span>
                      </div>
                      <div style={{ maxHeight: '90px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '9px', fontFamily: 'monospace', color: '#a7f3d0', padding: '2px' }}>
                        {iotDebugLogs.map((log, index) => (
                          <div key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.01)', paddingBottom: '2px' }}>{log}</div>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '12px', background: '#05070d', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace', display: 'block', marginBottom: '6px' }}>
                        SIMULATED MOBILE KEY JSON PAYLOAD
                      </span>
                      <pre style={{ margin: 0, padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', color: '#fde047', fontSize: '9px', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '110px' }}>
                        {getMockKeycardPayload()}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* WiFi & Guest Portal Sub-Tab */}
              {activeConfigTab === 'portal' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>WiFi and Guest Portal Setup</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                      Configure the SSID and access key credentials that will be delivered dynamically to guests via their check-in confirmation pages.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>WiFi Network Name (SSID)</label>
                        <input type="text" className="input-field" value={wifiSsid} onChange={e => setWifiSsid(e.target.value)} />
                      </div>
                      
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>WiFi Password (WPA3-PSK)</label>
                        <input type="text" className="input-field" value={wifiPassword} onChange={e => setWifiPassword(e.target.value)} />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Guest Portal Welcome Banner</label>
                        <input type="text" className="input-field" value={portalGreeting} onChange={e => setPortalGreeting(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {/* Phone Screen Mockup */}
                    <div className="glass-card" style={{ width: '220px', background: 'linear-gradient(to bottom, #111827, #030712)', border: '6px solid #1f2937', borderRadius: '24px', padding: '16px 12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)', position: 'relative' }}>
                      <div style={{ width: '60px', height: '14px', background: '#1f2937', borderRadius: '10px', margin: '0 auto 12px auto' }} />
                      
                      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', margin: '0 auto 6px auto', color: '#3b82f6', justifyContent: 'center' }}>
                          <Sparkles size={16} />
                        </div>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {portalGreeting}
                        </div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '4px' }}>CONNECTED NETWORK</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', textAlign: 'center', wordBreak: 'break-all' }}>📶 {wifiSsid}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Password:</span>
                          <strong style={{ color: '#fff' }}>{wifiPassword}</strong>
                        </div>
                      </div>

                      {/* Fake QR code representation */}
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '64px', height: '64px', background: '#fff', padding: '4px', borderRadius: '4px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px' }}>
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} style={{ background: (i % 3 === 0 || i % 5 === 1) ? '#000' : 'transparent' }} />
                          ))}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '7px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                        Scan QR code to join Stayflexi high-speed guest portal network automatically.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <button
                onClick={handleSaveConfigs}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 22px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                }}
              >
                Save and Propagate Config
              </button>
            </div>
          </div>
        )}

        {/* App 7: EXPENSE MANAGER */}
        {activeApp === 'expense' && (() => {
          const roomRevSum = reservations.reduce((sum, res) => sum + (res.amount || 0), 0)
          const posPayItems = JSON.parse(localStorage.getItem('sf_pos_payments') || '[]')
          const posRevSum = posPayItems
            .filter((t: any) => t.status === 'SUCCESS')
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
          
          const grossIncome = roomRevSum + posRevSum
          const netMargin = grossIncome - totalExpenseSum
          const netIsPositive = netMargin >= 0

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Receipt style={{ color: '#ef4444' }} />
                  <span>Property Operational Expense (OpEx) Ledger & P&L Sentry</span>
                </h3>
                <span className="status-badge available">Ledger Audits Active</span>
              </div>

              {/* Financial Summary Deck */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '16px', marginBottom: '20px' }}>
                <div className="glass-card" style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.02)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>GROSS PMS REVENUE</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                    ${grossIncome.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    Rooms: ${roomRevSum.toFixed(2)} | Outlet Shop: ${posRevSum.toFixed(2)}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>OPERATIONAL OUTFLOW (OpEx)</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>
                    -${totalExpenseSum.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    Ledger logs count: {expenses.length}
                  </div>
                </div>

                <div className="glass-card" style={{ 
                  padding: '14px', 
                  background: netIsPositive ? 'rgba(59, 130, 246, 0.02)' : 'rgba(244, 63, 94, 0.02)', 
                  border: `1px solid ${netIsPositive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(244, 63, 94, 0.2)'}` 
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>NET PROPERTY CASHFLOW</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: netIsPositive ? '#3b82f6' : '#f43f5e', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {netIsPositive ? '+' : ''}${netMargin.toFixed(2)}
                    {netIsPositive ? (
                      <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>PROFITABLE</span>
                    ) : (
                      <span style={{ fontSize: '10px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>DEFICIT</span>
                    )}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    Net Operating Margin: {grossIncome > 0 ? ((netMargin / grossIncome) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '20px' }}>
                {/* Column 1: Log Expense & Mock Attachment */}
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', height: 'fit-content' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', margin: 0 }}>Log Operational Expense</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category</label>
                      <select className="input-field" value={expenseCat} onChange={e => setExpenseCat(e.target.value as any)}>
                        <option value="Utilities">Utilities & Water</option>
                        <option value="Salaries">Staff Salaries</option>
                        <option value="Inventory">Housekeeping Restock</option>
                        <option value="Maintenance">Maintenance Repair</option>
                        <option value="Marketing">Marketing Ads</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Amount Spent ($)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="0.00"
                        value={expenseAmount}
                        onChange={e => setExpenseAmount(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Description</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Plumber repair room 104"
                        value={expenseDesc}
                        onChange={e => setExpenseDesc(e.target.value)}
                      />
                    </div>

                    {/* Receipt Uploader Mock */}
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Receipt Invoice Document</label>
                      {mockReceiptName ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontSize: '10px' }}>
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <FileText size={12} />
                            {mockReceiptName}
                          </span>
                          <button 
                            onClick={() => setMockReceiptName(null)}
                            style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : isUploadingReceipt ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '9px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>Uploading invoice PDF...</span>
                            <span>{receiptProgress}%</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${receiptProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.1s' }} />
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={handleSimulateReceiptUpload}
                          style={{
                            border: '1.5px dashed rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.01)',
                            borderRadius: '8px',
                            padding: '10px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '10px',
                            color: 'var(--text-muted)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                        >
                          <FileText size={14} style={{ margin: '0 auto 4px auto', display: 'block', color: 'var(--text-muted)' }} />
                          <span>Attach Receipt Invoice PDF</span>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleLogExpense}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                        border: 'none',
                        color: '#fff',
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
                        marginTop: '4px'
                      }}
                    >
                      Log OpEx Outflow
                    </button>
                  </div>
                </div>

                {/* Column 2: Monthly Budget Consumption Meters */}
                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', height: 'fit-content' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>Category Budget Controls</h4>
                    <button
                      onClick={() => {
                        setTempBudgets(expenseBudgets)
                        setShowBudgetEditModal(true)
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--text-muted)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Edit Limits
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {Object.keys(expenseBudgets).map(cat => {
                      const limit = expenseBudgets[cat] || 1
                      const spent = expenses
                        .filter(item => item.category === cat)
                        .reduce((sum, item) => sum + item.amount, 0)
                      const pct = Math.min(Math.round((spent / limit) * 100), 100)
                      const isOver = spent > limit
                      
                      const progressColor = isOver 
                        ? '#ef4444' 
                        : pct >= 80 
                          ? '#f59e0b' 
                          : '#10b981'

                      return (
                        <div key={cat} style={{ fontSize: '11px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{cat}</span>
                              {isOver && (
                                <span style={{ fontSize: '8px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>OVER LIMIT</span>
                              )}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              ${spent.toFixed(0)} / <strong style={{ color: '#fff' }}>${limit}</strong> ({pct}%)
                            </span>
                          </div>

                          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${pct}%`, 
                              height: '100%', 
                              background: progressColor, 
                              borderRadius: '3px',
                              transition: 'width 0.3s ease-in-out'
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Column 3: Auditable Ledger Table */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', margin: 0 }}>OpEx Audits & logs</h4>
                  <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-card)', borderRadius: '8px', overflowY: 'auto', maxHeight: '310px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)' }}>Category</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)' }}>Details</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--text-muted)' }}>Amount</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--text-muted)' }}>Doc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No expense logs found.</td>
                          </tr>
                        ) : (
                          expenses.map((item, idx) => (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', verticalAlign: 'middle' }}>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>{item.category}</span>
                              </td>
                              <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                                <div style={{ fontWeight: 600, color: '#fff' }}>{item.description}</div>
                                <div style={{ fontSize: '8px' }}>{new Date(item.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#ef4444', fontSize: '12px' }}>
                                -${item.amount.toFixed(2)}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                {item.receiptName ? (
                                  <button
                                    onClick={() => setViewingReceiptLog(item)}
                                    title="View attached invoice"
                                    style={{ background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: '#10b981', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    <FileText size={10} />
                                  </button>
                                ) : (
                                  <span style={{ color: 'rgba(255,255,255,0.1)' }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Expense budget adjustment modal */}
              {showBudgetEditModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div className="glass-card" style={{ background: '#0d111d', border: '1px solid var(--border-card)', padding: '24px', width: '320px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sliders size={16} />
                      <span>ADJUST BUDGET CAPS</span>
                    </h4>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                      Set maximum target expense ceilings per operational department. Budgets trigger real-time occupancy alerts.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', marginTop: '4px' }}>
                      {Object.keys(expenseBudgets).map(cat => (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{cat} ($)</span>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ width: '120px', textAlign: 'right', padding: '4px 8px', height: '28px' }} 
                            value={tempBudgets[cat] || 0} 
                            onChange={e => setTempBudgets({ ...tempBudgets, [cat]: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button 
                        onClick={() => handleSaveBudgets(tempBudgets)}
                        style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}
                      >
                        Save Budgets
                      </button>
                      <button 
                        onClick={() => { setShowBudgetEditModal(false); setTempBudgets(expenseBudgets); }}
                        style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Clicked Receipt Doc detail Modal */}
              {viewingReceiptLog && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div className="glass-card" style={{ background: '#0e1322', border: '1px solid var(--border-card)', padding: '24px', width: '380px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
                    <div style={{ textAlign: 'center', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto' }}>
                        <Receipt size={18} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#ef4444' }}>STAYFLEXI AUDITABLE OUTFLOW INVOICE</h4>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>Transaction ID: {viewingReceiptLog.id}</div>
                    </div>
                    
                    <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Operational Category:</span>
                        <strong style={{ color: '#fff' }}>{viewingReceiptLog.category}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Expenditure Amount:</span>
                        <strong style={{ color: '#ef4444', fontSize: '13px' }}>${viewingReceiptLog.amount.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Log Timestamp:</span>
                        <span>{new Date(viewingReceiptLog.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Audit Description:</span>
                        <span style={{ color: '#fff', fontStyle: 'italic' }}>"{viewingReceiptLog.description}"</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} style={{ color: '#10b981' }} />
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--text-muted)' }}>File Attached:</span> <strong style={{ color: '#fff' }}>{viewingReceiptLog.receiptName}</strong>
                      </div>
                    </div>

                    <button 
                      onClick={() => setViewingReceiptLog(null)}
                      style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', marginTop: '4px' }}
                    >
                      Close Invoice details
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* App 8: STOCK MANAGEMENT */}
        {activeApp === 'stock' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Package style={{ color: '#a855f7' }} />
                <span>Amenities & Linen Stock Inventory Console</span>
              </h3>
              <span className="status-badge available">Stock tracker active</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.2fr', gap: '20px' }}>
              {/* Left Column: Add Stock Form */}
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', height: 'fit-content' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', margin: 0 }}>Register New Stock Item</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Item Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Single Bed sheets"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category</label>
                    <select className="input-field" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value as any)}>
                      <option value="Linen">Linen & Towels</option>
                      <option value="Amenities">Toiletries & Soap</option>
                      <option value="Food & Beverage">Food & Beverage (Minibar)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Current Count</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={newItemCurrent}
                        onChange={e => setNewItemCurrent(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Cap</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={newItemTarget}
                        onChange={e => setNewItemTarget(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleAddStockItem}
                    style={{
                      background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                      border: 'none',
                      color: '#fff',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(168, 85, 247, 0.2)',
                      marginTop: '4px'
                    }}
                  >
                    Add Item to Catalog
                  </button>
                </div>
              </div>

              {/* Center Column: Catalog Table / Cards with Search & Filters */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Search stock..." 
                    style={{ maxWidth: '200px', height: '32px', fontSize: '11px' }}
                    value={stockSearchQuery}
                    onChange={e => setStockSearchQuery(e.target.value)}
                  />

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['All', 'Linen', 'Amenities', 'Food & Beverage'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedStockCategory(cat)}
                        style={{
                          background: selectedStockCategory === cat ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                          border: '1px solid ' + (selectedStockCategory === cat ? 'rgba(255, 255, 255, 0.15)' : 'transparent'),
                          color: selectedStockCategory === cat ? '#fff' : 'var(--text-muted)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {cat === 'Food & Beverage' ? 'F&B' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '315px', overflowY: 'auto', paddingRight: '4px' }}>
                  {stockItems
                    .filter(item => {
                      const matchesSearch = item.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
                      const matchesCat = selectedStockCategory === 'All' || item.category === selectedStockCategory
                      return matchesSearch && matchesCat
                    })
                    .map(item => {
                      const pct = Math.round((item.current / item.target) * 100)
                      const isLow = pct < 30

                      return (
                        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: '13px' }}>{item.name}</span>
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '6px' }}>({item.category})</span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              {isLow && (
                                <span style={{ fontSize: '9px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                  <ShieldAlert size={10} /> Low
                                </span>
                              )}
                              <span style={{ fontSize: '11px', fontWeight: 600 }}>
                                {item.current} / {item.target} units ({pct}%)
                              </span>
                              <button
                                onClick={() => setRestockingItemId(item.id)}
                                style={{
                                  background: 'rgba(168, 85, 247, 0.12)',
                                  border: '1px solid rgba(168, 85, 247, 0.25)',
                                  color: '#c084fc',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Restock
                              </button>
                              <button
                                onClick={() => handleDeleteStockItem(item.id)}
                                title="Remove from catalog"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '4px'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          
                          {/* Progress track */}
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${pct}%`, 
                              height: '100%', 
                              background: isLow 
                                ? 'linear-gradient(to right, #ef4444, #dc2626)' 
                                : 'linear-gradient(to right, #a855f7, #6366f1)', 
                              borderRadius: '2px',
                              transition: 'width 0.3s ease-in-out'
                            }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Right Column: Replenishment Logs */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', margin: 0 }}>Restock Ledger Logs</h4>
                <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-card)', borderRadius: '8px', overflowY: 'auto', maxHeight: '315px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)' }}>Item</th>
                        <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--text-muted)' }}>Quantity</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--text-muted)' }}>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockLogs.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No logs found.</td>
                        </tr>
                      ) : (
                        stockLogs.map((log, index) => (
                          <tr key={log.id || index} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ fontWeight: 600, color: '#fff' }}>{log.name}</div>
                              <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
                                {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#a855f7', fontWeight: 700 }}>
                              +{log.qty}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                              {log.cost > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                  <strong style={{ color: '#fff' }}>${log.cost.toFixed(2)}</strong>
                                  {log.postToOpex && (
                                    <span style={{ fontSize: '7px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 3px', borderRadius: '3px', fontWeight: 600, marginTop: '2px' }}>OPEX CHARGED</span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Custom Restock Overlay Modal */}
            {restockingItemId && (() => {
              const item = stockItems.find(it => it.id === restockingItemId)
              if (!item) return null
              return (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div className="glass-card" style={{ background: '#0e1322', border: '1px solid var(--border-card)', padding: '24px', width: '340px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={16} />
                      <span>RESTOCK INVENTORY ITEM</span>
                    </h4>
                    
                    <div style={{ fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', lineHeight: 1.4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Item Name:</span> <strong style={{ color: '#fff' }}>{item.name}</strong>
                      <br />
                      <span style={{ color: 'var(--text-muted)' }}>Current Status:</span> <strong>{item.current} / {item.target} units</strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
                      <div>
                        <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Quantity to Restock</label>
                        <input 
                          type="number" 
                          className="input-field" 
                          value={customRestockQty} 
                          onChange={e => setCustomRestockQty(e.target.value)} 
                        />
                      </div>
                      
                      <div>
                        <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cost Per Unit ($)</label>
                        <input 
                          type="number" 
                          step="0.05"
                          className="input-field" 
                          value={restockUnitCost} 
                          onChange={e => setRestockUnitCost(e.target.value)} 
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                        <input 
                          type="checkbox" 
                          id="postToOpexCheck" 
                          checked={postToOpex} 
                          onChange={e => setPostToOpex(e.target.checked)} 
                          style={{ accentColor: '#a855f7' }}
                        />
                        <label htmlFor="postToOpexCheck" style={{ color: '#fff', fontSize: '10px', cursor: 'pointer', userSelect: 'none' }}>
                          Charge total cost (${(parseInt(customRestockQty) * parseFloat(restockUnitCost) || 0).toFixed(2)}) to Expense Ledger
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button 
                        onClick={handleRestockSubmit}
                        style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #a855f7, #6b21a8)', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}
                      >
                        Confirm Restock
                      </button>
                      <button 
                        onClick={() => setRestockingItemId(null)}
                        style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
        {/* Absolute Settle Receipt Modal */}
        {showReceipt && receiptDetails && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-card" style={{ background: '#0e1322', border: '1px solid var(--border-card)', padding: '24px', width: '380px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#00f2fe' }}>STAYFLEXI POS OUTLET RECEIPT</h4>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Grand Stayflexi Beach Resort, Goa</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Receipt #: {receiptDetails.id}</div>
              </div>
              
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                  <span>{receiptDetails.timestamp}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Billed To:</span>
                  <strong>{receiptDetails.guestName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Settlement Type:</span>
                  <span style={{ color: '#00f2fe', fontWeight: 600 }}>{receiptDetails.settlementType}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.1)', borderTop: '1px dashed rgba(255,255,255,0.1)', padding: '8px 0', maxHeight: '120px', overflowY: 'auto' }}>
                {receiptDetails.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '3px 0' }}>
                    <span>{it.name} (x{it.quantity})</span>
                    <span>${(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                  <span>${receiptDetails.subtotal.toFixed(2)}</span>
                </div>
                {receiptDetails.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span>Promo Discount:</span>
                    <span>-${receiptDetails.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>GST Service Tax:</span>
                  <span>${receiptDetails.tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: '#00f2fe', marginTop: '4px' }}>
                  <span>Total Amount Paid:</span>
                  <span>${receiptDetails.total.toFixed(2)}</span>
                </div>
              </div>

              <button 
                onClick={() => setShowReceipt(false)}
                style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #00f2fe, #0072ff)', border: 'none', color: '#060913', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
              >
                Close Receipt
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

// App Card style helper
const getAppCardStyle = (isActive: boolean, activeColor: string): React.CSSProperties => {
  return {
    background: isActive 
      ? 'linear-gradient(to bottom, rgba(16, 22, 42, 0.95), rgba(16, 22, 42, 0.75))' 
      : 'rgba(255,255,255,0.01)',
    border: `1.5px solid ${isActive ? activeColor : 'rgba(255, 255, 255, 0.04)'}`,
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: isActive ? `0 0 12px ${activeColor}20` : 'none',
    transform: isActive ? 'translateY(-2px)' : 'none',
  }
}
