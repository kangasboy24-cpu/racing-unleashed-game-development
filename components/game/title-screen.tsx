'use client'

import Image from 'next/image'
import { Flag, Gauge, Keyboard, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TRACKS } from '@/lib/game/tracks'

export function TitleScreen({ onPlay, onQuickRace }: { onPlay: () => void; onQuickRace: () => void }) {
  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-background">
      <Image src="/images/hero.png" alt="" fill priority className="object-cover object-right opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      <div className="relative z-10 flex flex-1 flex-col justify-center gap-8 px-6 py-10 md:px-16">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            <Flag className="size-4" aria-hidden="true" />
            3D Arcade Racing
          </p>
          <h1 className="font-display text-6xl font-bold italic leading-[0.85] tracking-tight text-balance md:text-8xl">
            RACING
            <br />
            <span className="text-primary">UNLEASHED</span>
          </h1>
          <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
            {TRACKS.length} legendary-inspired circuits. Three classes of machine. A full grid of rivals who want your
            spot on the podium.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={onPlay} className="h-14 px-10 font-display text-lg font-bold italic uppercase tracking-wider">
            Start Racing
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={onQuickRace}
            className="h-14 px-8 font-display text-lg font-bold italic uppercase tracking-wider"
          >
            Quick Race
          </Button>
        </div>

        <ul className="grid max-w-lg grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <Gauge className="size-4 text-accent" aria-hidden="true" />
            Up to 340 km/h
          </li>
          <li className="flex items-center gap-2">
            <Trophy className="size-4 text-accent" aria-hidden="true" />
            Up to 11 AI rivals
          </li>
          <li className="flex items-center gap-2">
            <Keyboard className="size-4 text-accent" aria-hidden="true" />
            Keyboard or touch
          </li>
        </ul>
      </div>
    </main>
  )
}
