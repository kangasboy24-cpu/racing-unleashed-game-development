'use client'

import { RotateCcw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RaceResult } from '@/lib/game/engine'
import type { TrackDef } from '@/lib/game/tracks'
import { cn } from '@/lib/utils'
import { formatTime, ordinal } from './format'

interface Props {
  results: RaceResult[]
  track: TrackDef
  newRecord: boolean
  onRestart: () => void
  onMenu: () => void
}

export function ResultsScreen({ results, track, newRecord, onRestart, onMenu }: Props) {
  const me = results.find((r) => r.isPlayer)
  const winner = results[0]
  const podium = me && me.position <= 3
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-xl border border-border bg-card p-5 md:p-7">
        <div className="flex flex-col items-center gap-1 text-center">
          {podium && <Trophy className="size-10 text-accent" aria-hidden="true" />}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">{track.name}</p>
          <h2 className="font-display text-5xl font-bold italic">{me ? ordinal(me.position) : '—'}</h2>
          <p className="text-sm text-muted-foreground">
            {me?.position === 1 ? 'Victory! You conquered the field.' : podium ? 'On the podium. Great drive.' : 'Back to the garage and go again.'}
          </p>
          {newRecord && (
            <span className="mt-1 rounded bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-accent-foreground">
              New best lap
            </span>
          )}
        </div>

        <ol className="flex max-h-[40vh] flex-col gap-1 overflow-y-auto">
          {results.map((r) => (
            <li
              key={r.name}
              className={cn(
                'grid grid-cols-[2rem_0.25rem_1fr_auto_auto] items-center gap-3 rounded-md px-3 py-1.5 text-sm',
                r.isPlayer ? 'bg-primary text-primary-foreground' : 'bg-secondary',
              )}
            >
              <span className="font-display font-bold tabular-nums">{r.position}</span>
              <span className="h-4 w-1 rounded-sm" style={{ backgroundColor: r.color }} />
              <span className="truncate font-medium">{r.name}</span>
              <span className={cn('text-xs tabular-nums', r.isPlayer ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {formatTime(r.bestLap)}
              </span>
              <span className="w-24 text-right font-display tabular-nums">
                {r === winner ? formatTime(r.time) : `+${(r.time - winner.time).toFixed(3)}`}
                {r.estimated ? '*' : ''}
              </span>
            </li>
          ))}
        </ol>
        <p className="-mt-3 text-[11px] text-muted-foreground">Columns: best lap, race time. * projected finish.</p>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={onMenu} className="font-display font-semibold uppercase">
            Menu
          </Button>
          <Button size="lg" onClick={onRestart} className="gap-2 font-display font-semibold uppercase">
            <RotateCcw className="size-4" aria-hidden="true" />
            Race Again
          </Button>
        </div>
      </div>
    </div>
  )
}
