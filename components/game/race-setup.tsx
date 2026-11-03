'use client'

import { ArrowLeft, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CAR_SPECS, DIFFICULTY, PLAYER_COLORS, type CarClassId, type Difficulty } from '@/lib/game/cars'
import { TRACKS } from '@/lib/game/tracks'
import { cn } from '@/lib/utils'
import { formatTime } from './format'
import { TrackOutline, useTrackPath } from './track-outline'

export interface RaceSettings {
  trackId: string
  carClass: CarClassId
  color: string
  difficulty: Difficulty
  opponents: number
  laps: number
  muted: boolean
}

interface Props {
  settings: RaceSettings
  onChange: (s: RaceSettings) => void
  onBack: () => void
  onStart: () => void
  bestLaps: Record<string, number>
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex rounded-md bg-secondary p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded px-3 py-1.5 font-display text-sm font-semibold transition-colors',
              value === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-muted-foreground">{label}</span>
      <div className="flex flex-1 gap-0.5" aria-label={`${label} ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-sm', i <= value ? 'bg-accent' : 'bg-secondary')} />
        ))}
      </div>
    </div>
  )
}

export function RaceSetup({ settings, onChange, onBack, onStart, bestLaps }: Props) {
  const track = TRACKS.find((t) => t.id === settings.trackId) ?? TRACKS[0]
  const { lengthKm } = useTrackPath(track)
  const set = (patch: Partial<RaceSettings>) => onChange({ ...settings, ...patch })
  const best = bestLaps[`${track.id}:${settings.carClass}`]

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
        <h1 className="font-display text-lg font-bold italic tracking-wide">
          RACING <span className="text-primary">UNLEASHED</span>
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => set({ muted: !settings.muted })}
          aria-label={settings.muted ? 'Unmute sound' : 'Mute sound'}
        >
          {settings.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
        <section aria-label="Choose a circuit" className="flex min-h-0 flex-col gap-4 p-4 md:p-6 lg:overflow-y-auto">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Select Circuit
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {TRACKS.map((t) => {
              const active = t.id === track.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => set({ trackId: t.id, laps: t.laps, carClass: t.recommendedCar })}
                    aria-pressed={active}
                    className={cn(
                      'group flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-all',
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-foreground/30',
                    )}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.category}</span>
                    <TrackOutline
                      track={t}
                      strokeWidth={3}
                      className={cn('aspect-square w-full p-2', active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}
                    />
                    <span className="font-display text-sm font-semibold leading-tight text-balance">{t.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <aside className="flex flex-col gap-5 border-t border-border bg-card/50 p-4 md:p-6 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{track.location}</span>
            <h2 className="font-display text-2xl font-bold italic leading-tight text-balance">{track.name}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{track.description}</p>
            <dl className="mt-1 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-secondary p-2">
                <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Length</dt>
                <dd className="font-display font-semibold">{lengthKm.toFixed(2)} km</dd>
              </div>
              <div className="rounded-md bg-secondary p-2">
                <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Type</dt>
                <dd className="font-display font-semibold">{track.category === 'Grand Prix' ? 'GP' : track.category}</dd>
              </div>
              <div className="rounded-md bg-secondary p-2">
                <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Best</dt>
                <dd className="font-display font-semibold tabular-nums">{best ? formatTime(best) : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Car Class</span>
            <div className="flex flex-col gap-2">
              {(Object.keys(CAR_SPECS) as CarClassId[]).map((id) => {
                const c = CAR_SPECS[id]
                const active = settings.carClass === id
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set({ carClass: id })}
                    className={cn(
                      'flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors',
                      active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-foreground/30',
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display font-semibold">{c.name}</span>
                      {track.recommendedCar === id && (
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">Recommended</span>
                      )}
                    </div>
                    {active && (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground">{c.tagline}</p>
                        <StatBar label="Speed" value={c.stats.speed} />
                        <StatBar label="Accel" value={c.stats.accel} />
                        <StatBar label="Handling" value={c.stats.handling} />
                        <StatBar label="Braking" value={c.stats.braking} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Livery</span>
            <div role="radiogroup" aria-label="Livery colour" className="flex gap-2">
              {PLAYER_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  role="radio"
                  aria-checked={settings.color === col}
                  aria-label={`Colour ${col}`}
                  onClick={() => set({ color: col })}
                  className={cn(
                    'size-8 rounded-full border-2 transition-transform',
                    settings.color === col ? 'scale-110 border-foreground' : 'border-transparent',
                  )}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          <Segmented
            label="Difficulty"
            value={settings.difficulty}
            onChange={(v) => set({ difficulty: v })}
            options={(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY[d].label }))}
          />
          <Segmented
            label="Rivals"
            value={settings.opponents}
            onChange={(v) => set({ opponents: v })}
            options={[3, 5, 7, 11].map((n) => ({ value: n, label: String(n) }))}
          />
          <Segmented
            label="Laps"
            value={settings.laps}
            onChange={(v) => set({ laps: v })}
            options={[1, 2, 3, 5, 8].map((n) => ({ value: n, label: String(n) }))}
          />

          <Button
            size="lg"
            onClick={onStart}
            className="sticky bottom-0 h-14 font-display text-lg font-bold italic uppercase tracking-wider"
          >
            Race
          </Button>
        </aside>
      </div>
    </main>
  )
}
