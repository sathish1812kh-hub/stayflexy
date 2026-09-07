'use client'

import React from 'react'

export interface DirectPriceBadgeProps {
  directPrice: number
  currency?: string
  otaPrice?: number
  roomsRemaining?: number
  className?: string
}

export const DirectPriceBadge: React.FC<DirectPriceBadgeProps> = ({
  directPrice,
  currency = '$',
  otaPrice,
  roomsRemaining,
  className = '',
}) => {
  const estimatedOta = otaPrice ?? Number((directPrice * 1.18).toFixed(2))
  const savings = Number((estimatedOta - directPrice).toFixed(2))

  return (
    <div
      className={`rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-sm backdrop-blur-sm ${className}`}
    >
      {/* Urgency Counter */}
      {roomsRemaining !== undefined && roomsRemaining <= 3 && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          <span>High Demand: Only {roomsRemaining} rooms remaining at this rate</span>
        </div>
      )}

      {/* Direct vs OTA Rate Comparison */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
            Direct Guarantee
          </span>
          <span className="text-xs text-zinc-400 line-through">
            OTAs: {currency}
            {estimatedOta.toFixed(2)}
          </span>
        </div>
        <div className="text-right font-semibold text-emerald-400">
          Save {currency}
          {savings.toFixed(2)}
        </div>
      </div>

      {/* Direct Perks List */}
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-300">
        <span className="flex items-center gap-1 text-emerald-300">✓ Best Price Guaranteed</span>
        <span className="flex items-center gap-1 text-zinc-400">✓ Free Cancellation</span>
        <span className="flex items-center gap-1 text-zinc-400">✓ Priority Check-In</span>
      </div>
    </div>
  )
}
