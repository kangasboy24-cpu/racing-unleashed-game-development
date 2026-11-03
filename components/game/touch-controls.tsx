'use client'

import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp } from 'lucide-react'
import type { TouchInput } from '@/lib/game/engine'
import { cn } from '@/lib/utils'

function Pad({
  label,
  onChange,
  className,
  children,
}: {
  label: string
  onChange: (down: boolean) => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'pointer-events-auto flex touch-none select-none items-center justify-center rounded-2xl border border-white/20 bg-black/40 text-white backdrop-blur-sm active:bg-white/25',
        className,
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        onChange(true)
      }}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onLostPointerCapture={() => onChange(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

export function TouchControls({ onInput }: { onInput: (i: Partial<TouchInput>) => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 pb-28 sm:pb-4">
      <div className="flex gap-3">
        <Pad label="Steer left" onChange={(d) => onInput({ left: d })} className="size-20">
          <ChevronLeft className="size-10" />
        </Pad>
        <Pad label="Steer right" onChange={(d) => onInput({ right: d })} className="size-20">
          <ChevronRight className="size-10" />
        </Pad>
      </div>
      <div className="flex items-end gap-3">
        <Pad label="Brake" onChange={(d) => onInput({ brake: d })} className="h-20 w-16">
          <ChevronsDown className="size-8" />
        </Pad>
        <Pad label="Accelerate" onChange={(d) => onInput({ throttle: d })} className="h-28 w-20 bg-primary/50">
          <ChevronsUp className="size-10" />
        </Pad>
      </div>
    </div>
  )
}
