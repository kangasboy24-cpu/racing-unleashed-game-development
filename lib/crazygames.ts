// Thin, fail-safe wrapper around the CrazyGames HTML5 SDK v3.
// Outside of CrazyGames the SDK reports a "disabled" environment and every call becomes a no-op.

interface CrazySDK {
  init: () => Promise<void>
  environment: 'local' | 'crazygames' | 'disabled'
  game: {
    gameplayStart: () => void
    gameplayStop: () => void
    happytime: () => void
    loadingStart: () => void
    loadingStop: () => void
  }
}

let initPromise: Promise<boolean> | null = null
let ready = false
let playing = false

function sdk(): CrazySDK | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { CrazyGames?: { SDK?: CrazySDK } }).CrazyGames?.SDK
}

export function initCrazyGames() {
  if (initPromise) return initPromise
  initPromise = new Promise<boolean>((resolve) => {
    let tries = 0
    const attempt = () => {
      const s = sdk()
      if (!s) {
        if (++tries < 40) setTimeout(attempt, 250)
        else resolve(false)
        return
      }
      s.init()
        .then(() => {
          ready = s.environment !== 'disabled'
          resolve(ready)
        })
        .catch(() => resolve(false))
    }
    attempt()
  })
  return initPromise
}

function call(fn: (s: CrazySDK) => void) {
  const s = sdk()
  if (!ready || !s) return
  try {
    fn(s)
  } catch {
    // SDK errors must never break the game.
  }
}

export function gameplayStart() {
  if (playing) return
  playing = true
  call((s) => s.game.gameplayStart())
}

export function gameplayStop() {
  if (!playing) return
  playing = false
  call((s) => s.game.gameplayStop())
}

export function happytime() {
  call((s) => s.game.happytime())
}
