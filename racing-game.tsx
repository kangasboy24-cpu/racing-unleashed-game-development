'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RaceConfig, RaceResult } from '@/lib/game/engine'
import { TRACKS } from '@/lib/game/tracks'
import {
  happytime,
  initCrazyGames,
  loadingStart,
  loadingStop,
  loadItem,
  requestMidgameAd,
  saveItem,
} from '@/lib/crazygames'
import { RaceSetup, type RaceSettings } from './race-setup'
import { RaceView } from './race-view'
import { ResultsScreen } from './results-screen'
import { TitleScreen } from './title-screen'

type Screen = 'title' | 'setup' | 'race'

const BEST_LAPS_KEY = 'racing-unleashed:best-laps'

const DEFAULT_SETTINGS: RaceSettings = {
  trackId: TRACKS[0].id,
  carClass: TRACKS[0].recommendedCar,
  color: '#ff3d00',
  difficulty: 'pro',
  opponents: 7,
  laps: TRACKS[0].laps,
  muted: false,
}

function parseBestLaps(raw: string | null): Record<string, number> {
  if (!raw) return {}
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(data)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    return out
  } catch {
    return {}
  }
}

export function RacingGame() {
  const [screen, setScreen] = useState<Screen>('title')
  const [settings, setSettings] = useState<RaceSettings>(DEFAULT_SETTINGS)
  const [raceKey, setRaceKey] = useState(0)
  const [results, setResults] = useState<RaceResult[] | null>(null)
  const [bestLaps, setBestLaps] = useState<Record<string, number>>({})
  const [newRecord, setNewRecord] = useState(false)
  const [adPlaying, setAdPlaying] = useState(false)
  const bestLapsRef = useRef(bestLaps)
  const hasRaced = useRef(false)
  const starting = useRef(false)

  // Boot: init the CrazyGames SDK, restore saved best laps, then tell the platform loading is done.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await initCrazyGames()
      loadingStart()
      const saved = parseBestLaps(loadItem(BEST_LAPS_KEY))
      if (!cancelled) {
        bestLapsRef.current = { ...saved, ...bestLapsRef.current }
        setBestLaps(bestLapsRef.current)
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
      loadingStop()
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Players should not get a browser context menu from long-pressing touch controls or right-clicking the canvas.
  useEffect(() => {
    const block = (e: Event) => e.preventDefault()
    window.addEventListener('contextmenu', block)
    return () => window.removeEventListener('contextmenu', block)
  }, [])

  const track = TRACKS.find((t) => t.id === settings.trackId) ?? TRACKS[0]

  const config = useMemo<RaceConfig>(
    () => ({
      track,
      carClass: settings.carClass,
      playerColor: settings.color,
      playerName: 'You',
      opponents: settings.opponents,
      difficulty: settings.difficulty,
      laps: settings.laps,
      // Audio is forced off while an ad is playing (CrazyGames requirement).
      muted: settings.muted || adPlaying,
    }),
    [track, settings, adPlaying],
  )

  const startRace = useCallback(async () => {
    if (starting.current) return
    starting.current = true
    try {
      // Natural break: show a midgame ad before every race except the very first one.
      if (hasRaced.current) {
        await requestMidgameAd({ onStart: () => setAdPlaying(true), onEnd: () => setAdPlaying(false) })
      }
      hasRaced.current = true
      setResults(null)
      setNewRecord(false)
      setRaceKey((k) => k + 1)
      setScreen('race')
    } finally {
      starting.current = false
    }
  }, [])

  const quickRace = useCallback(() => {
    const t = TRACKS[Math.floor(Math.random() * TRACKS.length)]
    setSettings((s) => ({ ...s, trackId: t.id, carClass: t.recommendedCar, laps: Math.min(t.laps, 3) }))
    void startRace()
  }, [startRace])

  const handleFinish = useCallback(
    (r: RaceResult[]) => {
      setResults(r)
      const me = r.find((x) => x.isPlayer)
      if (me && me.position <= 3) happytime()
      if (me?.bestLap) {
        const key = `${settings.trackId}:${settings.carClass}`
        const prev = bestLapsRef.current[key]
        if (prev === undefined || me.bestLap < prev) {
          bestLapsRef.current = { ...bestLapsRef.current, [key]: me.bestLap }
          setBestLaps(bestLapsRef.current)
          setNewRecord(true)
          saveItem(BEST_LAPS_KEY, JSON.stringify(bestLapsRef.current))
        }
      }
    },
    [settings.trackId, settings.carClass],
  )

  const toggleMute = useCallback(() => setSettings((s) => ({ ...s, muted: !s.muted })), [])

  const adOverlay = adPlaying ? (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-sm font-semibold uppercase tracking-widest text-white"
      role="status"
    >
      Advertisement
    </div>
  ) : null

  if (screen === 'title')
    return (
      <>
        <TitleScreen onPlay={() => setScreen('setup')} onQuickRace={quickRace} />
        {adOverlay}
      </>
    )
  if (screen === 'setup')
    return (
      <>
        <RaceSetup
          settings={settings}
          onChange={setSettings}
          onBack={() => setScreen('title')}
          onStart={startRace}
          bestLaps={bestLaps}
        />
        {adOverlay}
      </>
    )

  return (
    <RaceView
      key={raceKey}
      config={config}
      onFinish={handleFinish}
      onQuit={() => setScreen('setup')}
      onRestart={startRace}
      onToggleMute={toggleMute}
      showResults={!!results}
    >
      {results && (
        <ResultsScreen
          results={results}
          track={track}
          newRecord={newRecord}
          onRestart={startRace}
          onMenu={() => setScreen('setup')}
        />
      )}
      {adOverlay}
    </RaceView>
  )
}
