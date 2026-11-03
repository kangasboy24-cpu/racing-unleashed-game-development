import { writeFileSync } from 'node:fs'
import { TRACKS } from '../lib/game/tracks'
import { sampleTrack, countCorners } from '../lib/game/track-samples'

let html = '<html><body style="background:#111;color:#fff;font-family:sans-serif;display:flex;flex-wrap:wrap;gap:12px">'
for (const t of TRACKS) {
  const s = sampleTrack(t)
  const clearance = t.width + 2 * t.runoff + 6
  let worst = Infinity
  let worstAt: number[] = []
  const skip = Math.ceil((clearance * 3) / s.spacing)
  for (let i = 0; i < s.n; i += 2) {
    for (let j = i + skip; j < s.n; j += 2) {
      if (s.n - (j - i) < skip) continue
      const d = Math.hypot(s.px[i] - s.px[j], s.pz[i] - s.pz[j])
      if (d < worst) { worst = d; worstAt = [i, j] }
    }
  }
  let minR = Infinity
  for (let i = 0; i < s.n; i++) minR = Math.min(minR, 1 / Math.max(1e-6, Math.abs(s.curv[i])))
  console.log(`${t.id}: len=${s.length.toFixed(0)}m n=${s.n} corners=${countCorners(s)} minRadius=${minR.toFixed(1)} closest=${worst.toFixed(1)} need>${clearance} ${worst < clearance ? 'OVERLAP at ' + worstAt : 'ok'}`)
  const pad = 20
  const w = s.maxX - s.minX, h = s.maxZ - s.minZ
  const sc = 360 / Math.max(w, h)
  let d = ''
  for (let i = 0; i < s.n; i++) d += `${i ? 'L' : 'M'}${((s.px[i] - s.minX) * sc + pad).toFixed(1)},${((s.pz[i] - s.minZ) * sc + pad).toFixed(1)}`
  const sx = (s.px[0] - s.minX) * sc + pad, sz = (s.pz[0] - s.minZ) * sc + pad
  html += `<div><div>${t.name}</div><svg width="400" height="400"><path d="${d}Z" stroke="#fff" stroke-width="${Math.max(1.5, t.width * sc)}" fill="none" stroke-linejoin="round"/><circle cx="${sx}" cy="${sz}" r="5" fill="red"/>${worst < clearance ? `<circle cx="${(s.px[worstAt[0]] - s.minX) * sc + pad}" cy="${(s.pz[worstAt[0]] - s.minZ) * sc + pad}" r="8" fill="none" stroke="yellow"/>` : ''}</svg></div>`
}
writeFileSync('/tmp/track-check.html', html + '</body></html>')
