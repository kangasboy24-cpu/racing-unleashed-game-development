'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RaceConfig, RaceResult } from '@/lib/game/engine'
import { TRACKS } from '@/lib/game/tracks'
import { happytime, initCrazyGames } from '@/lib/crazygames'
import { RaceSetup, type RaceSettings } from './race-setup'
import { RaceView } from './race-view'
import { ResultsScreen } from './results-screen'
import { TitleScreen } from './title-screen'

type Screen = 'title' | 'setup' | 'race'

const DEFAULT_SETTINGS: RaceSettings = {
  trackId: TRACKS[0].id,
  carClass: TRACKS[0].recommendedCar,
  color: '#ff3d00',
  difficulty: 'pro',
  opponents: 7,
  laps: TRACKS[0].laps,
  muted: false,
}

export function RacingGame() {
  const [screen, setScreen] = useState<Screen>('title')
  const [settings, setSettings] = useState<RaceSettings>(DEFAULT_SETTINGS)
  const [raceKey, setRaceKey] = useState(0)
  const [results, setResults] = useState<RaceResult[] | null>(null)
  const [bestLaps, setBestLaps] = useState<Record<string, number>>({})
  const [newRecord, setNewRecord] = useState(false)

  useEffect(() => {
    initCrazyGames()
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
      muted: settings.muted,
    }),
    [track, settings],
  )

  const startRace = useCallback(() => {
    setResults(null)
    setNewRecord(false)
    setRaceKey((k) => k + 1)
    setScreen('race')
  }, [])

  const quickRace = useCallback(() => {
    const t = TRACKS[Math.floor(Math.random() * TRACKS.length)]
    setSettings((s) => ({ ...s, trackId: t.id, carClass: t.recommendedCar, laps: Math.min(t.laps, 3) }))
    startRace()
  }, [startRace])

  const handleFinish = useCallback(
    (r: RaceResult[]) => {
      setResults(r)
      const me = r.find((x) => x.isPlayer)
      if (me && me.position <= 3) happytime()
      if (me?.bestLap) {
        const key = `${settings.trackId}:${settings.carClass}`
        setBestLaps((prev) => {
          if (prev[key] === undefined || me.bestLap! < prev[key]) {
            setNewRecord(true)
            return { ...prev, [key]: me.bestLap! }
          }
          return prev
        })
      }
    },
    [settings.trackId, settings.carClass],
  )

  const toggleMute = useCallback(() => setSettings((s) => ({ ...s, muted: !s.muted })), [])

  if (screen === 'title') return <TitleScreen onPlay={() => setScreen('setup')} onQuickRace={quickRace} />
  if (screen === 'setup')
    return (
      <RaceSetup
        settings={settings}
        onChange={setSettings}
        onBack={() => setScreen('title')}
        onStart={startRace}
        bestLaps={bestLaps}
      />
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
    </RaceView>
  )
}
