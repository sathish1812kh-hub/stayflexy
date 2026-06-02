'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, Sparkles, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dataClient from '../dataClient'

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  suggestedActions?: string[]
  timestamp: Date
}

interface FlexiAIChatWidgetProps {
  bookingId?: string | null
}

export default function FlexiAIChatWidget({ bookingId = null }: FlexiAIChatWidgetProps) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Config States for custom LLM models & API keys
  const [showConfig, setShowConfig] = useState(false)
  const [activeModel, setActiveModel] = useState('gemini')
  const [selectedModelForConfig, setSelectedModelForConfig] = useState('gemini')
  const [tempApiKey, setTempApiKey] = useState('')
  const [savedKeysStatus, setSavedKeysStatus] = useState({
    gemini: false,
    openai: false,
    groq: false,
    anthropic: false,
    kimi: false
  })

  const refreshSavedKeysStatus = () => {
    if (typeof window !== 'undefined') {
      const active = localStorage.getItem('sf_chat_active_model') || 'gemini'
      setActiveModel(active)
      setSavedKeysStatus({
        gemini: !!(localStorage.getItem('sf_api_key_gemini') || localStorage.getItem('sf_gemini_api_key')),
        openai: !!localStorage.getItem('sf_api_key_openai'),
        groq: !!localStorage.getItem('sf_api_key_groq'),
        anthropic: !!localStorage.getItem('sf_api_key_anthropic'),
        kimi: !!localStorage.getItem('sf_api_key_kimi')
      })
    }
  }

  const handleSaveConfig = () => {
    if (typeof window !== 'undefined') {
      if (selectedModelForConfig === 'gemini') {
        localStorage.setItem('sf_api_key_gemini', tempApiKey)
      } else {
        localStorage.setItem(`sf_api_key_${selectedModelForConfig}`, tempApiKey)
      }
      localStorage.setItem('sf_chat_active_model', selectedModelForConfig)
      setActiveModel(selectedModelForConfig)
      refreshSavedKeysStatus()
      setShowConfig(false)
    }
  }

  // Load API keys status on mount
  useEffect(() => {
    refreshSavedKeysStatus()
  }, [])

  // Load API key when selected config model changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let key = ''
      if (selectedModelForConfig === 'gemini') {
        key = localStorage.getItem('sf_api_key_gemini') || localStorage.getItem('sf_gemini_api_key') || ''
      } else {
        key = localStorage.getItem(`sf_api_key_${selectedModelForConfig}`) || ''
      }
      setTempApiKey(key)
    }
  }, [selectedModelForConfig])

  // Refresh statuses whenever panel opens
  useEffect(() => {
    if (showConfig) {
      refreshSavedKeysStatus()
    }
  }, [showConfig])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load session state on mount
  useEffect(() => {
    setIsMounted(true)
    const savedOpen = sessionStorage.getItem('sf_chat_open')
    if (savedOpen === 'true') {
      setIsOpen(true)
    }
    const savedMsgs = sessionStorage.getItem('sf_chat_messages')
    if (savedMsgs) {
      try {
        const parsed = JSON.parse(savedMsgs)
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
      } catch (e) {
        // fallback
      }
    } else {
      setMessages([
        {
          id: 'init-msg',
          role: 'ASSISTANT',
          content: bookingId 
            ? 'Hello! I am your Flexi AI Concierge. I can assist you with your flexible hourly stay bookings, room upgrades, ordering food, or revealing your smart key lock code. How can I help you today?'
            : 'Hello! I am Flexi AI, your Stayflexi Operations & BI Assistant. I can assist you with operational commands (e.g. blocking/unblocking rooms) or querying real-time analytics like revenue reports. How can I help you today?',
          suggestedActions: bookingId
            ? ['Hourly Stays', 'Upgrade Room', 'Food Menu', 'Smart Key']
            : ['Revenue Report', 'Block Room 103', 'Occupancy Analytics', 'Show Rooms Grid'],
          timestamp: new Date()
        }
      ])
    }
    setHasLoaded(true)
  }, [bookingId])

  // Save states to sessionStorage
  useEffect(() => {
    if (hasLoaded) {
      sessionStorage.setItem('sf_chat_open', isOpen ? 'true' : 'false')
    }
  }, [isOpen, hasLoaded])

  useEffect(() => {
    if (hasLoaded && messages.length > 0) {
      sessionStorage.setItem('sf_chat_messages', JSON.stringify(messages))
    }
  }, [messages, hasLoaded])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  if (!isMounted) return null

  const handleProgrammaticAction = async (action: string, payloadStr?: string) => {
    let payload: any = {}
    if (payloadStr) {
      try {
        payload = JSON.parse(payloadStr)
      } catch (e) {
        payload = { raw: payloadStr }
      }
    }

    if (bookingId) {
      // Guest mode
      if (action === 'upgrade_room') {
        window.dispatchEvent(new CustomEvent('flexi-guest-ai-command', { detail: { action: 'upgrade_room' } }))
      } else if (action === 'order_food') {
        window.dispatchEvent(new CustomEvent('flexi-guest-ai-command', { detail: { action: 'order_food' } }))
      } else if (action === 'reveal_key') {
        window.dispatchEvent(new CustomEvent('flexi-guest-ai-command', { detail: { action: 'reveal_key' } }))
      } else if (action === 'checkout') {
        window.dispatchEvent(new CustomEvent('flexi-guest-ai-command', { detail: { action: 'checkout' } }))
      }
    } else {
      // Staff PMS mode
      if (action === 'block_inventory') {
        const roomNum = payload.roomNumber || '103'
        try {
          const todayStr = new Date().toISOString().split('T')[0] || ''
          const hotelId = (typeof window !== 'undefined' ? localStorage.getItem('sf_selected_hotel') : null) || 'h1-resort-goa'
          const res = await dataClient.blockInventory(hotelId, 'rt-executive', todayStr, todayStr, 'Blocked by Flexi AI Operations')
          if (res?.success) {
            if (roomNum === '103') {
              await dataClient.updateRoomStatus('r-103', 'BLOCKED', 'Blocked by Flexi AI Operations')
            }
            window.dispatchEvent(new CustomEvent('sf-reload-inventory'))
            setMessages(prev => [...prev, {
              id: `action-confirm-${Math.random().toString(36).substr(2, 9)}`,
              role: 'ASSISTANT',
              content: `🛠️ **Operation Committed**: Room ${roomNum} inventory has been successfully blocked on the grid.`,
              timestamp: new Date()
            }])
            if (window.location.pathname !== '/inventory') {
              setTimeout(() => {
                router.push('/inventory')
              }, 1500)
            }
          }
        } catch (err) {
          console.error(err)
        }
      } else if (action === 'navigate') {
        const target = payload.target || '/inventory'
        if (window.location.pathname !== target) {
          router.push(target)
        }
      } else if (action === 'navigate_app') {
        const appName = payload.app || 'reviews'
        if (window.location.pathname !== '/more-apps') {
          router.push(`/more-apps?app=${appName}&reviewId=${payload.reviewId || 'rev-1'}`)
        } else {
          window.dispatchEvent(new CustomEvent('flexi-staff-ai-command', { 
            detail: { action: 'navigate_app', payload: { app: appName, reviewId: payload.reviewId || 'rev-1' } } 
          }))
        }
      }
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return

    const userMsg: Message = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      role: 'USER',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    // Local command intercepts
    const msg = text.toLowerCase()
    let localIntercepted = false

    if (!bookingId) {
      if (msg.includes('block room 103') || msg.includes('block 103')) {
        localIntercepted = true
        setTimeout(async () => {
          try {
            const todayStr = new Date().toISOString().split('T')[0] || ''
            const hotelId = (typeof window !== 'undefined' ? localStorage.getItem('sf_selected_hotel') : null) || 'h1-resort-goa'
            const res = await dataClient.blockInventory(hotelId, 'rt-executive', todayStr, todayStr, 'Blocked by Flexi AI Operations')
            if (res?.success) {
              await dataClient.updateRoomStatus('r-103', 'BLOCKED', 'Blocked by Flexi AI Operations')
              window.dispatchEvent(new CustomEvent('sf-reload-inventory'))
              setMessages(prev => [...prev, {
                id: `msg-${Math.random().toString(36).substr(2, 9)}`,
                role: 'ASSISTANT',
                content: "I have successfully blocked Room 103 on the inventory grid for today. The calendar has refreshed immediately.",
                suggestedActions: ["Show Rooms Grid", "Occupancy Analytics"],
                timestamp: new Date()
              }])
              setIsLoading(false)
              if (window.location.pathname !== '/inventory') {
                setTimeout(() => {
                  router.push('/inventory')
                }, 3500)
              }
            }
          } catch (err) {
            console.error(err)
            setIsLoading(false)
          }
        }, 1200)
      } else if (msg.includes('show rooms grid') || msg.includes('rooms grid')) {
        localIntercepted = true
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `msg-${Math.random().toString(36).substr(2, 9)}`,
            role: 'ASSISTANT',
            content: "Redirecting to the room availability grid...",
            timestamp: new Date()
          }])
          setIsLoading(false)
          setTimeout(() => {
            router.push('/inventory')
          }, 3500)
        }, 1200)
      } else if (msg.includes('revenue report') || msg.includes('revenue') || msg.includes('sales')) {
        localIntercepted = true
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `msg-${Math.random().toString(36).substr(2, 9)}`,
            role: 'ASSISTANT',
            content: "Navigating to the Financial Analytics Console. Total May 2026 revenue is $24,850.00.",
            suggestedActions: ["Occupancy Analytics", "Show Rooms Grid"],
            timestamp: new Date()
          }])
          setIsLoading(false)
          setTimeout(() => {
            router.push('/console')
          }, 3500)
        }, 1200)
      } else if (msg.includes('review') || msg.includes('reply') || msg.includes('ota')) {
        localIntercepted = true
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `msg-${Math.random().toString(36).substr(2, 9)}`,
            role: 'ASSISTANT',
            content: "Navigating to the Guest Reviews portal. AI auto-reply copilot is ready.",
            timestamp: new Date()
          }])
          setIsLoading(false)
          setTimeout(() => {
            router.push('/more-apps?app=reviews&reviewId=rev-1')
          }, 3500)
        }, 1200)
      }
    } else {
      if (msg.includes('upgrade')) {
        localIntercepted = true
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('flexi-guest-ai-command', { detail: { action: 'upgrade_room' } }))
          setMessages(prev => [...prev, {
            id: `msg-${Math.random().toString(36).substr(2, 9)}`,
            role: 'ASSISTANT',
            content: "I have highlighted the Room Upgrade options on your portal dashboard! Please select a deluxe/executive suite.",
            suggestedActions: ["Order Food", "Reveal Smart Key"],
            timestamp: new Date()
          }])
          setIsLoading(false)
        }, 1200)
      } else if (msg.includes('food') || msg.includes('menu') || msg.includes('room service') || msg.includes('order')) {
        localIntercepted = true
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('flexi-guest-ai-command', { detail: { action: 'order_food' } }))
          setMessages(prev => [...prev, {
            id: `msg-${Math.random().toString(36).substr(2, 9)}`,
            role: 'ASSISTANT',
            content: "Order placed: Premium Club Sandwich & Fries has been added to your room bill ledger.",
            suggestedActions: ["Reveal Smart Key", "View Invoice Folio"],
            timestamp: new Date()
          }])
          setIsLoading(false)
        }, 1200)
      } else if (msg.includes('key') || msg.includes('lock') || msg.includes('code')) {
        localIntercepted = true
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('flexi-guest-ai-command', { detail: { action: 'reveal_key' } }))
          setMessages(prev => [...prev, {
            id: `msg-${Math.random().toString(36).substr(2, 9)}`,
            role: 'ASSISTANT',
            content: "Smart lock access code revealed! Check the top section of your screen.",
            suggestedActions: ["View Invoice Folio", "Checkout Room"],
            timestamp: new Date()
          }])
          setIsLoading(false)
        }, 1200)
      } else if (msg.includes('checkout')) {
        localIntercepted = true
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('flexi-guest-ai-command', { detail: { action: 'checkout' } }))
          setMessages(prev => [...prev, {
            id: `msg-${Math.random().toString(36).substr(2, 9)}`,
            role: 'ASSISTANT',
            content: "Self checkout completed successfully! We hope you enjoyed your flexible hour stay.",
            suggestedActions: ["View Invoice Folio"],
            timestamp: new Date()
          }])
          setIsLoading(false)
        }, 1200)
      }
    }

    if (localIntercepted) {
      return
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      const response = await dataClient.sendFlexiAIChat(bookingId, text)
      
      const assistantMsg: Message = {
        id: `msg-${Math.random().toString(36).substr(2, 9)}`,
        role: 'ASSISTANT',
        content: response.content || "I'm sorry, I'm having trouble connecting to the subgraphs. Please try again.",
        suggestedActions: response.suggestedActions || [],
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMsg])

      if (response.action) {
        handleProgrammaticAction(response.action, response.actionPayload)
      }
    } catch (err) {
      const errorMsg: Message = {
        id: `msg-${Math.random().toString(36).substr(2, 9)}`,
        role: 'ASSISTANT',
        content: "We encountered a network timeout, but offline mode is active. Let me help you from the local cache: you can book flexible hours ($45/hr), order room service, or reveal keys when checking in.",
        suggestedActions: ['View Food Menu', 'Checkout Room'],
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, fontFamily: 'var(--font-sans)' }}>
      {/* Floating Pulse Circle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
            border: 'none',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative'
          }}
          className="hover-glow"
        >
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid rgba(0, 242, 254, 0.5)',
              animation: 'ping 2s infinite',
              pointerEvents: 'none'
            }}
          />
          <Bot style={{ width: '28px', height: '28px', color: '#060913' }} />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '520px',
            background: 'rgba(10, 15, 30, 0.9)',
            border: '1px solid var(--border-card-active)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0, 242, 254, 0.15)',
            backdropFilter: 'blur(20px)',
            animation: 'fadeInUp 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              background: 'linear-gradient(to right, rgba(0, 242, 254, 0.08), rgba(79, 172, 254, 0.08))',
              borderBottom: '1px solid var(--border-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sparkles style={{ width: '16px', height: '16px', color: '#060913' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {bookingId ? "Flexi AI Concierge" : "Flexi AI Operations"}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span style={{ fontSize: '9px', color: '#00f2fe', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    {bookingId ? "Concierge Mode" : "Staff Operations Mode"}
                  </span>
                  <span style={{ fontSize: '8px', color: '#fff', background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.3)', padding: '1px 4px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                    {activeModel}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>

          {/* Messages Stream / Configuration Settings Panel */}
          {showConfig ? (
            <div
              style={{
                flex: 1,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflowY: 'auto',
                background: 'rgba(6, 9, 19, 0.95)',
                animation: 'fadeInUp 0.2s ease-out'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>AI Model Settings</span>
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  style={{ background: 'none', border: 'none', color: '#00f2fe', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }}
                >
                  Back to Chat
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>SELECT PROVIDER</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[
                    { id: 'gemini', name: 'Gemini 2.5 Flash', desc: 'Google (Default / Built-in)' },
                    { id: 'openai', name: 'OpenAI GPT-4o', desc: 'GPT-4o API' },
                    { id: 'groq', name: 'Groq Llama 3', desc: 'llama-3.3-70b-versatile' },
                    { id: 'anthropic', name: 'Anthropic Claude', desc: 'Claude 3.5 Sonnet' },
                    { id: 'kimi', name: 'Kimi Moonshot', desc: 'moonshot-v1-8k' }
                  ].map((m) => {
                    const isSelected = selectedModelForConfig === m.id;
                    const isActive = activeModel === m.id;
                    const hasKey = savedKeysStatus[m.id as keyof typeof savedKeysStatus];
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModelForConfig(m.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#00f2fe' : '#fff' }}>
                            {m.name}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{m.desc}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {isActive && (
                            <span style={{ background: '#10b981', color: '#060913', fontSize: '8px', fontWeight: 600, padding: '1px 4px', borderRadius: '3px' }}>
                              Active
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 500,
                              color: hasKey ? '#10b981' : '#9ca3af',
                              background: hasKey ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                              padding: '1px 4px',
                              borderRadius: '3px'
                            }}
                          >
                            {hasKey ? '✓ Saved' : 'No Key'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  API KEY FOR {selectedModelForConfig.toUpperCase()}
                </span>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder={selectedModelForConfig === 'gemini' ? 'Optional (uses built-in if empty)' : 'Paste API Key here...'}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: '#fff',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    color: '#060913',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Save & Activate
                </button>
                {savedKeysStatus[selectedModelForConfig as keyof typeof savedKeysStatus] && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('sf_chat_active_model', selectedModelForConfig)
                        setActiveModel(selectedModelForConfig)
                        setShowConfig(false)
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px',
                      padding: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Activate Only
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Messages Stream */
            <div
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.role === 'USER' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: msg.role === 'USER' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: msg.role === 'USER' ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'rgba(255, 255, 255, 0.05)',
                      border: msg.role === 'USER' ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                      color: msg.role === 'USER' ? '#060913' : '#e5e7eb',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      fontWeight: msg.role === 'USER' ? 500 : 400
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Suggestions Chips */}
                  {msg.role === 'ASSISTANT' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {msg.suggestedActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(action)}
                          style={{
                            background: 'rgba(0, 242, 254, 0.05)',
                            border: '1px solid rgba(0, 242, 254, 0.2)',
                            borderRadius: '12px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            color: '#00f2fe',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: 500
                          }}
                          className="hover-glow-small"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Loader */}
              {isLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', display: 'flex', gap: '4px' }}>
                  <span className="dot" style={{ animationDelay: '0s' }}>.</span>
                  <span className="dot" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="dot" style={{ animationDelay: '0.4s' }}>.</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Form Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage(inputValue)
            }}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-card)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.2)'
            }}
          >
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              style={{
                background: showConfig ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: showConfig ? '#060913' : '#00f2fe',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              title="Configure AI Models & Keys"
            >
              <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={bookingId ? "Ask anything about stay upgrades, menu, keys..." : "Command operations, ask for revenue reports, or block rooms..."}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#fff',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0, 242, 254, 0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              style={{
                background: inputValue.trim() ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputValue.trim() ? 'pointer' : 'default',
                color: inputValue.trim() ? '#060913' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              <Send style={{ width: '14px', height: '14px' }} />
            </button>
          </form>
        </div>
      )}

      {/* Injected Animations */}
      <style jsx global>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hover-glow:hover {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(0, 242, 254, 0.6) !important;
        }
        .hover-glow-small:hover {
          background: rgba(0, 242, 254, 0.12) !important;
          border-color: rgba(0, 242, 254, 0.5) !important;
          transform: translateY(-1px);
        }
        .dot {
          animation: blink 1.4s infinite both;
          font-weight: bold;
          font-size: 16px;
          color: #00f2fe;
          display: inline-block;
        }
        @keyframes blink {
          0% { opacity: .2; }
          20% { opacity: 1; }
          100% { opacity: .2; }
        }
      `}</style>
    </div>
  )
}
