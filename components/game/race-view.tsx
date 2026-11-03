'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RaceEngine, type HudSnapshot, type RaceConfig, type RaceResult } from '@/lib/game/engine'
import { gameplayStart, gameplayStop } from '@/lib/crazygames'
import { RaceHud } from './race-hud'
import { TouchControls } from './touch-controls'

interface Props {
  config: RaceConfig
  onFinish: (results: RaceResult[]) => void
  onQuit: () => void
  onRestart: () => void
  onToggleMute: () => void
  showResults: boolean
  children?: React.ReactNode
}

export function RaceView({ config, onFinish, onQuit, onRestart, onToggleMute, showResults, children }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<RaceEngine | null>(null)
  const [hud, setHud] = useState<HudSnapshot | null>(null)
  const [paused, setPaused] = useState(false)
  const [touch, setTouch] = useState(false)
  const finishRef = useRef(onFinish)
  finishRef.current = onFinish

  useEffect(() => {
    if (!mountRef.current) return
    const engine = new RaceEngine(mountRef.current, mapRef.current, config, {
      onHud: setHud,
      onFinish: (r) => finishRef.current(r),
    })
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
      gameplayStop()
    }
    // The engine is recreated by remounting this component (via key) for restarts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.setMuted(config.muted)
  }, [config.muted])

  useEffect(() => {
    setTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  const racing = hud?.phase === 'racing' || hud?.phase === 'countdown'
  useEffect(() => {
    engineRef.current?.setPaused(paused)
    if (paused || showResults || !racing) gameplayStop()
    else gameplayStart()
  }, [paused, showResults, racing])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!showResults) setPaused((p) => !p)
      }
      if (e.code === 'KeyM') onToggleMute()
    }
    const onVis = () => {
      if (document.hidden && !showResults) setPaused(true)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [showResults, onToggleMute])

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <div ref={mountRef} className="absolute inset-0" />

      {hud && !showResults && <RaceHud hud={hud} />}

      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 md:right-5 md:top-5">
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="bg-black/55 text-white backdrop-blur-sm hover:bg-black/75"
            onClick={() => engineRef.current?.cycleCamera()}
            aria-label="Change camera (C)"
          >
            <Camera className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="bg-black/55 text-white backdrop-blur-sm hover:bg-black/75"
            onClick={onToggleMute}
            aria-label={config.muted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {config.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="bg-black/55 text-white backdrop-blur-sm hover:bg-black/75"
            onClick={() => setPaused(true)}
            aria-label="Pause (Esc)"
            disabled={showResults}
          >
            <Pause className="size-4" />
          </Button>
        </div>
        <canvas
          ref={mapRef}
          aria-label="Track map"
          className="size-28 rounded-md border border-white/10 bg-black/45 backdrop-blur-sm md:size-40"
        />
      </div>

      {touch && !showResults && !paused && (
        <TouchControls onInput={(i) => engineRef.current?.setTouch(i)} />
      )}

      {paused && !showResults && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-card p-6">
            <h2 className="text-center font-display text-4xl font-bold italic">PAUSED</h2>
            <Button size="lg" onClick={() => setPaused(false)} className="font-display font-semibold uppercase">
              Resume
            </Button>
            <Button size="lg" variant="secondary" onClick={onRestart} className="gap-2 font-display font-semibold uppercase">
              <RotateCcw className="size-4" aria-hidden="true" />
              Restart Race
            </Button>
            <Button size="lg" variant="ghost" onClick={onQuit} className="font-display font-semibold uppercase">
              Quit to Menu
            </Button>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <dt>Accelerate / Brake</dt>
              <dd className="text-right text-foreground">W S / Arrows</dd>
              <dt>Steer</dt>
              <dd className="text-right text-foreground">A D / Arrows</dd>
              <dt>Handbrake</dt>
              <dd className="text-right text-foreground">Space</dd>
              <dt>Camera</dt>
              <dd className="text-right text-foreground">C</dd>
              <dt>Reset car</dt>
              <dd className="text-right text-foreground">R</dd>
              <dt>Pause / Mute</dt>
              <dd className="text-right text-foreground">Esc / M</dd>
            </dl>
          </div>
        </div>
      )}

      {children}
    </main>
  )
}
