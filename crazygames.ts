// Fail-safe wrapper around the CrazyGames HTML5 SDK v3.
// Outside of CrazyGames (or when the SDK is blocked) the SDK is unavailable and every call becomes a no-op,
// so the game runs identically on localhost, itch.io, your own host, etc.

type AdType = 'midgame' | 'rewarded'

interface AdCallbacks {
  adStarted?: () => void
  adFinished?: () => void
  adError?: (error: unknown) => void
}

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
  ad: {
    requestAd: (type: AdType, callbacks: AdCallbacks) => void
  }
  data: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
    removeItem: (key: string) => void
  }
}

let initPromise: Promise<boolean> | null = null
let ready = false
let playing = false
let adInFlight = false

function sdk(): CrazySDK | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { CrazyGames?: { SDK?: CrazySDK } }).CrazyGames?.SDK
}

/** Resolves true when the SDK is usable (CrazyGames or the SDK's "local" test environment). Never rejects. */
export function initCrazyGames(): Promise<boolean> {
  if (initPromise) return initPromise
  initPromise = new Promise<boolean>((resolve) => {
    let tries = 0
    const attempt = () => {
      const s = sdk()
      if (!s) {
        // The SDK <script> is loaded synchronously in <head>, but wait a little in case it is slow or blocked.
        if (++tries < 20) setTimeout(attempt, 250)
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

// ---------------- lifecycle ----------------

export function loadingStart() {
  call((s) => s.game.loadingStart())
}

export function loadingStop() {
  call((s) => s.game.loadingStop())
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

// ---------------- ads ----------------

/**
 * Requests a midgame ad at a natural break (between races). Always resolves, whether the ad played,
 * failed, was blocked, or the SDK is not present, so callers can simply `await` it and continue.
 * `onStart` / `onEnd` let the game mute audio and show an overlay while the ad runs.
 */
export function requestMidgameAd(handlers: { onStart?: () => void; onEnd?: () => void } = {}): Promise<void> {
  return new Promise<void>((resolve) => {
    const s = sdk()
    if (!ready || !s || adInFlight) {
      resolve()
      return
    }
    adInFlight = true
    gameplayStop()

    let started = false
    let done = false
    let startTimeout: ReturnType<typeof setTimeout> | undefined

    const finish = () => {
      if (done) return
      done = true
      if (startTimeout) clearTimeout(startTimeout)
      adInFlight = false
      if (started) handlers.onEnd?.()
      resolve()
    }

    // If the SDK never reports that an ad started (blocked, unfilled, cooldown), do not hang the game.
    startTimeout = setTimeout(() => {
      if (!started) finish()
    }, 6000)

    try {
      s.ad.requestAd('midgame', {
        adStarted: () => {
          if (done) return
          started = true
          if (startTimeout) clearTimeout(startTimeout)
          handlers.onStart?.()
        },
        adFinished: finish,
        adError: finish,
      })
    } catch {
      finish()
    }
  })
}

// ---------------- saved data ----------------
// Uses the CrazyGames data module when available (syncs across devices for logged-in players)
// and falls back to localStorage everywhere else. Everything is try/catch-guarded because
// localStorage can throw inside sandboxed iframes.

export function loadItem(key: string): string | null {
  const s = sdk()
  if (ready && s) {
    try {
      return s.data.getItem(key)
    } catch {
      /* fall through to localStorage */
    }
  }
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function saveItem(key: string, value: string) {
  const s = sdk()
  if (ready && s) {
    try {
      s.data.setItem(key, value)
      return
    } catch {
      /* fall through to localStorage */
    }
  }
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: progress simply is not persisted */
  }
}
