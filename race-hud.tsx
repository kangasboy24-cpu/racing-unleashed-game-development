'use client'

import type { HudSnapshot } from '@/lib/game/engine'
import { cn } from '@/lib/utils'
import { formatTime, ordinal } from './format'

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-md border border-white/10 bg-black/55 backdrop-blur-sm', className)}>{children}</div>
}

export function RaceHud({ hud }: { hud: HudSnapshot }) {
  const top = hud.standings.slice(0, 5)
  const playerIndex = hud.standings.findIndex((s) => s.isPlayer)
  return (
    <div className="pointer-events-none absolute inset-0 select-none font-display text-white">
      <div className="absolute left-3 top-3 flex flex-col gap-2 md:left-5 md:top-5">
        <Panel className="flex items-end gap-3 px-4 py-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Pos</span>
            <span className="text-4xl font-bold italic leading-none md:text-5xl">
              {hud.position}
              <span className="text-lg text-white/60">/{hud.totalCars}</span>
            </span>
          </div>
          <div className="flex flex-col border-l border-white/15 pl-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Lap</span>
            <span className="text-2xl font-bold italic leading-none md:text-3xl">
              {hud.lap}
              <span className="text-base text-white/60">/{hud.totalLaps}</span>
            </span>
          </div>
        </Panel>
        <Panel className="hidden flex-col gap-0.5 px-3 py-2 text-sm tabular-nums sm:flex">
          <div className="flex justify-between gap-6">
            <span className="text-white/60">Lap</span>
            <span>{formatTime(hud.lapTime)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-white/60">Last</span>
            <span>{formatTime(hud.lastLap)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-white/60">Best</span>
            <span className="text-accent">{formatTime(hud.bestLap)}</span>
          </div>
        </Panel>
        <Panel className="hidden flex-col px-1 py-1 text-xs md:flex">
          <ol>
            {top.map((s, i) => (
              <li
                key={s.name}
                className={cn('flex items-center gap-2 rounded px-2 py-0.5', s.isPlayer && 'bg-primary/80')}
              >
                <span className="w-4 text-right tabular-nums text-white/70">{i + 1}</span>
                <span className="h-3 w-1 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="truncate">{s.name}</span>
              </li>
            ))}
            {playerIndex >= top.length && (
              <li className="flex items-center gap-2 rounded bg-primary/80 px-2 py-0.5">
                <span className="w-4 text-right tabular-nums">{playerIndex + 1}</span>
                <span className="h-3 w-1 rounded-sm" style={{ backgroundColor: hud.standings[playerIndex].color }} />
                <span className="truncate">{hud.standings[playerIndex].name}</span>
              </li>
            )}
          </ol>
        </Panel>
      </div>

      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
        <Panel className="flex items-end gap-3 px-4 py-3">
          <div className="flex flex-col items-end">
            <span className="text-5xl font-bold italic leading-none tabular-nums md:text-6xl">{hud.speed}</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">km/h</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold italic leading-none text-accent">{hud.gear}</span>
            <div className="flex h-12 w-2 flex-col-reverse overflow-hidden rounded-full bg-white/15" aria-hidden="true">
              <div
                className={cn('w-full rounded-full', hud.rpm > 0.92 ? 'bg-destructive' : 'bg-primary')}
                style={{ height: `${Math.round(hud.rpm * 100)}%` }}
              />
            </div>
          </div>
        </Panel>
      </div>

      {hud.phase === 'countdown' && (
        <div className="absolute inset-x-0 top-[18%] flex justify-center">
          <Panel className="flex gap-2 px-4 py-3 md:gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn(
                  'size-8 rounded-full border-2 border-black/60 md:size-12',
                  i < hud.lights ? 'bg-red-600 shadow-[0_0_24px_rgba(255,0,0,0.8)]' : 'bg-neutral-800',
                )}
              />
            ))}
          </Panel>
        </div>
      )}
      {hud.showGo && (
        <div className="absolute inset-x-0 top-[16%] flex justify-center">
          <span className="text-7xl font-bold italic text-accent drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] md:text-9xl">GO!</span>
        </div>
      )}
      {hud.wrongWay && (
        <div className="absolute inset-x-0 top-[30%] flex justify-center">
          <span className="animate-pulse rounded bg-destructive px-6 py-2 text-2xl font-bold italic md:text-4xl">WRONG WAY</span>
        </div>
      )}
      {hud.finalLap && !hud.showGo && !hud.wrongWay && hud.lapTime < 3 && (
        <div className="absolute inset-x-0 top-[22%] flex justify-center">
          <span className="text-4xl font-bold italic text-accent drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] md:text-6xl">FINAL LAP</span>
        </div>
      )}
      {hud.phase === 'finished' && (
        <div className="absolute inset-x-0 top-[20%] flex flex-col items-center gap-1">
          <span className="text-6xl font-bold italic drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] md:text-8xl">
            {ordinal(hud.position)}
          </span>
          <span className="text-xl font-semibold uppercase tracking-[0.3em] text-accent drop-shadow">Finished</span>
        </div>
      )}
    </div>
  )
}
