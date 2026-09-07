'use client'

import React, { useState } from 'react'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false)

  const getPositionStyles = (): React.CSSProperties => {
    switch (position) {
      case 'top':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' }
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' }
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' }
    }
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          style={{
            position: 'absolute',
            zIndex: 10000,
            whiteSpace: 'nowrap',
            backgroundColor: '#060913',
            color: '#f3f4f6',
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 500,
            borderRadius: '6px',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 242, 254, 0.2)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease-out',
            ...getPositionStyles(),
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
