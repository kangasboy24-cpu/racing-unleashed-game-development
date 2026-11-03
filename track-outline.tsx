'use client'

import { useMemo } from 'react'
import { sampleTrack } from '@/lib/game/track-samples'
import type { TrackDef } from '@/lib/game/tracks'
import { cn } from '@/lib/utils'

export function useTrackPath(track: TrackDef) {
  return useMemo(() => {
    const s = sampleTrack(track)
    const span = Math.max(s.maxX - s.minX, s.maxZ - s.minZ)
    const size = 100
    const scale = size / span
    const ox = (size - (s.maxX - s.minX) * scale) / 2
    const oz = (size - (s.maxZ - s.minZ) * scale) / 2
    let d = ''
    for (let i = 0; i < s.n; i += 4) {
      const x = ox + (s.px[i] - s.minX) * scale
      const y = oz + (s.pz[i] - s.minZ) * scale
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    }
    d += 'Z'
    const start = { x: ox + (s.px[0] - s.minX) * scale, y: oz + (s.pz[0] - s.minZ) * scale }
    return { d, start, lengthKm: s.length / 1000 }
  }, [track])
}

export function TrackOutline({ track, className, strokeWidth = 3 }: { track: TrackDef; className?: string; strokeWidth?: number }) {
  const { d, start } = useTrackPath(track)
  return (
    <svg viewBox="-6 -6 112 112" className={cn('overflow-visible', className)} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={strokeWidth * 2.6} strokeLinejoin="round" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <circle cx={start.x} cy={start.y} r={strokeWidth * 1.3} className="fill-primary" />
    </svg>
  )
}
