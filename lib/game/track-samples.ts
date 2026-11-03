import { CatmullRomCurve3, Vector3 } from 'three'
import type { TrackDef } from './tracks'

export interface TrackSamples {
  n: number
  length: number
  spacing: number
  px: Float32Array
  py: Float32Array
  pz: Float32Array
  /** Unit tangent (horizontal). */
  tx: Float32Array
  tz: Float32Array
  /** Unit right vector (horizontal). */
  rx: Float32Array
  rz: Float32Array
  slope: Float32Array
  /** Signed curvature, positive = turning left. */
  curv: Float32Array
  bank: Float32Array
  /** Distance from centre to the low edge, so banked road never dips below ground. */
  bankPivot: number
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  hasElevation: boolean
}

function smooth(src: Float32Array, radius: number) {
  const n = src.length
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let k = -radius; k <= radius; k++) s += src[(i + k + n) % n]
    out[i] = s / (radius * 2 + 1)
  }
  return out
}

const cache = new Map<string, TrackSamples>()

export function sampleTrack(def: TrackDef): TrackSamples {
  const cached = cache.get(def.id)
  if (cached) return cached

  const pts = def.points.map((p) => new Vector3(p[0] * def.scale, p[2] ?? 0, p[1] * def.scale))
  const curve = new CatmullRomCurve3(pts, true, 'centripetal')
  const approx = curve.getLength()
  const n = Math.max(300, Math.round(approx / 2))
  const spaced = curve.getSpacedPoints(n)

  const px = new Float32Array(n)
  const py = new Float32Array(n)
  const pz = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    px[i] = spaced[i].x
    py[i] = spaced[i].y
    pz[i] = spaced[i].z
  }

  const tx = new Float32Array(n)
  const tz = new Float32Array(n)
  const rx = new Float32Array(n)
  const rz = new Float32Array(n)
  const slope = new Float32Array(n)
  let length = 0
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n
    const b = (i + 1) % n
    const dx = px[b] - px[a]
    const dz = pz[b] - pz[a]
    const d = Math.hypot(dx, dz) || 1
    tx[i] = dx / d
    tz[i] = dz / d
    rx[i] = -tz[i]
    rz[i] = tx[i]
    slope[i] = (py[b] - py[a]) / d
    length += Math.hypot(px[b] - px[i], pz[b] - pz[i])
  }

  const rawCurv = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const a = (i - 2 + n) % n
    const b = (i + 2) % n
    const ha = Math.atan2(tx[a], tz[a])
    const hb = Math.atan2(tx[b], tz[b])
    let dh = hb - ha
    while (dh > Math.PI) dh -= Math.PI * 2
    while (dh < -Math.PI) dh += Math.PI * 2
    rawCurv[i] = dh / ((length / n) * 4)
  }
  const curv = smooth(rawCurv, 3)

  let bank = new Float32Array(n)
  if (def.banking) {
    const wide = smooth(curv, 12)
    let max = 0
    for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(wide[i]))
    for (let i = 0; i < n; i++) {
      const f = Math.max(-1, Math.min(1, wide[i] / (max * 0.75)))
      bank[i] = def.banking * f
    }
    bank = smooth(bank, 10)
  }

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let hasElevation = false
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, px[i])
    maxX = Math.max(maxX, px[i])
    minZ = Math.min(minZ, pz[i])
    maxZ = Math.max(maxZ, pz[i])
    if (Math.abs(py[i]) > 0.01) hasElevation = true
  }

  const samples: TrackSamples = {
    n, length, spacing: length / n, px, py, pz, tx, tz, rx, rz, slope, curv, bank,
    bankPivot: def.width / 2 + def.runoff,
    minX, maxX, minZ, maxZ, hasElevation,
  }
  cache.set(def.id, samples)
  return samples
}

/** Number of distinct corners, used for the track info panel. */
export function countCorners(s: TrackSamples) {
  let count = 0
  let inCorner = false
  for (let i = 0; i < s.n; i++) {
    const c = Math.abs(s.curv[i]) > 1 / 140
    if (c && !inCorner) count++
    inCorner = c
  }
  return count
}
