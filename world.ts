import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import type { TrackDef } from './tracks'
import type { TrackSamples } from './track-samples'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function hashString(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  draw(ctx)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

function noiseTexture(base: string, variance: number, size = 256) {
  return canvasTexture(size, size, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, size, size)
    const img = ctx.getImageData(0, 0, size, size)
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * variance
      img.data[i] += n
      img.data[i + 1] += n
      img.data[i + 2] += n
    }
    ctx.putImageData(img, 0, 0)
  })
}

export interface World {
  group: THREE.Group
  /** Terrain height at a world position (used for scenery and off-track cars). */
  heightAt: (x: number, z: number) => number
  dispose: () => void
}

export function surfaceOffset(s: TrackSamples, i: number, off: number) {
  const b = s.bank[i]
  return {
    x: s.px[i] + s.rx[i] * off * Math.cos(b),
    y: s.py[i] + bankHeight(s, i, off),
    z: s.pz[i] + s.rz[i] * off * Math.cos(b),
  }
}

export function bankHeight(s: TrackSamples, i: number, off: number) {
  const b = s.bank[i]
  if (b === 0) return 0
  return Math.max(0, off * Math.sign(b) + s.bankPivot) * Math.abs(Math.sin(b))
}

function buildStrip(
  s: TrackSamples,
  inner: number,
  outer: number,
  lift: number,
  opts: { uvScale?: number; colorFn?: (i: number) => THREE.Color | null; vertical?: number } = {},
) {
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  let dist = 0
  const segments: number[] = []
  for (let i = 0; i <= s.n; i++) {
    const k = i % s.n
    if (opts.colorFn && i < s.n && !opts.colorFn(k)) continue
    segments.push(i)
  }
  let v = 0
  let prev = -2
  for (const i of segments) {
    const k = i % s.n
    if (i !== prev + 1) dist = 0
    const a = surfaceOffset(s, k, inner)
    const b = opts.vertical
      ? { x: a.x, y: a.y + opts.vertical, z: a.z }
      : surfaceOffset(s, k, outer)
    positions.push(a.x, a.y + lift, a.z, b.x, b.y + lift, b.z)
    uvs.push(0, dist / (opts.uvScale ?? 8), 1, dist / (opts.uvScale ?? 8))
    const col = opts.colorFn ? opts.colorFn(k) ?? new THREE.Color(1, 1, 1) : null
    if (col) colors.push(col.r, col.g, col.b, col.r, col.g, col.b)
    if (i === prev + 1 && v >= 2) {
      const p = v - 2
      indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2)
    }
    v += 2
    dist += s.spacing
    prev = i
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  if (colors.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export function buildWorld(def: TrackDef, s: TrackSamples, scene: THREE.Scene): World {
  const group = new THREE.Group()
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x)
    return x
  }
  const rand = rng(hashString(def.id))
  const { theme } = def
  const night = theme.sky === 'night'
  const half = def.width / 2
  const wallOff = half + def.runoff

  // ---------- Sky + lights ----------
  if (night) {
    scene.background = new THREE.Color('#05060f')
    scene.fog = new THREE.Fog(theme.fog, 250, 1400)
  } else {
    const sky = new Sky()
    sky.scale.setScalar(20000)
    const u = sky.material.uniforms
    u.turbidity.value = theme.sky === 'sunset' ? 6 : 3
    u.rayleigh.value = theme.sky === 'sunset' ? 2.5 : 1.2
    u.mieCoefficient.value = 0.005
    u.mieDirectionalG.value = 0.8
    const elevation = theme.sky === 'sunset' ? 6 : 42
    const phi = THREE.MathUtils.degToRad(90 - elevation)
    const theta = THREE.MathUtils.degToRad(140)
    u.sunPosition.value.setFromSphericalCoords(1, phi, theta)
    group.add(sky)
    track(sky.geometry)
    track(sky.material)
    scene.fog = new THREE.Fog(theme.fog, 400, 2600)
  }

  // ---------- Terrain ----------
  const grassTex = track(noiseTexture(theme.grass, 26))
  grassTex.repeat.set(400, 400)
  const ground = new THREE.Mesh(
    track(new THREE.PlaneGeometry(12000, 12000)),
    track(new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.08
  ground.receiveShadow = true
  group.add(ground)

  const nearestHeight = (x: number, z: number) => {
    let best = Infinity
    let bi = 0
    for (let i = 0; i < s.n; i += 2) {
      const dx = s.px[i] - x
      const dz = s.pz[i] - z
      const d = dx * dx + dz * dz
      if (d < best) {
        best = d
        bi = i
      }
    }
    return { h: s.py[bi], d: Math.sqrt(best) }
  }

  let heightAt = (_x: number, _z: number) => 0
  if (s.hasElevation) {
    const margin = 260
    const cell = 10
    const x0 = s.minX - margin
    const z0 = s.minZ - margin
    const w = s.maxX - s.minX + margin * 2
    const h = s.maxZ - s.minZ + margin * 2
    const cols = Math.ceil(w / cell)
    const rows = Math.ceil(h / cell)
    const heights = new Float32Array((cols + 1) * (rows + 1))
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const x = x0 + c * cell
        const z = z0 + r * cell
        const { h: th, d } = nearestHeight(x, z)
        const edgeFalloff = Math.min(1, Math.min(c, r, cols - c, rows - r) / 6)
        const t = THREE.MathUtils.smoothstep(d, wallOff + 10, wallOff + 220)
        heights[r * (cols + 1) + c] = (THREE.MathUtils.lerp(th - 0.6, th * 0.35 - 2, t) + 0.5) * edgeFalloff - 0.5
      }
    }
    heightAt = (x: number, z: number) => {
      const fc = (x - x0) / cell
      const fr = (z - z0) / cell
      if (fc < 0 || fr < 0 || fc >= cols || fr >= rows) return 0
      const c = Math.floor(fc)
      const r = Math.floor(fr)
      const tx = fc - c
      const tz = fr - r
      const a = heights[r * (cols + 1) + c]
      const b = heights[r * (cols + 1) + c + 1]
      const cc = heights[(r + 1) * (cols + 1) + c]
      const d = heights[(r + 1) * (cols + 1) + c + 1]
      return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(cc, d, tx), tz)
    }
    const geo = track(new THREE.PlaneGeometry(cols * cell, rows * cell, cols, rows))
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const c = i % (cols + 1)
      const r = Math.floor(i / (cols + 1))
      pos.setY(i, heights[r * (cols + 1) + c])
    }
    geo.computeVertexNormals()
    const tTex = track(noiseTexture(theme.grass, 26))
    tTex.repeat.set(cols / 4, rows / 4)
    const terrain = new THREE.Mesh(geo, track(new THREE.MeshStandardMaterial({ map: tTex, roughness: 1 })))
    terrain.position.set(x0 + (cols * cell) / 2, 0, z0 + (rows * cell) / 2)
    terrain.receiveShadow = true
    group.add(terrain)
  }

  // ---------- Road ----------
  const asphaltTex = track(
    canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = night ? '#2a2b30' : '#3b3d42'
      ctx.fillRect(0, 0, 256, 256)
      for (let i = 0; i < 6000; i++) {
        const g = 40 + Math.random() * 50
        ctx.fillStyle = `rgba(${g},${g},${g + 4},0.5)`
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5)
      }
    }),
  )
  const road = new THREE.Mesh(
    track(buildStrip(s, -half, half, 0, { uvScale: def.width })),
    track(new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.92, metalness: 0 })),
  )
  road.receiveShadow = true
  group.add(road)

  const overlayMat = (opts: THREE.MeshStandardMaterialParameters) =>
    track(
      new THREE.MeshStandardMaterial({
        roughness: 0.7,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -4,
        ...opts,
      }),
    )

  const lineMat = overlayMat({ color: '#f2f2f2' })
  for (const sign of [-1, 1]) {
    const a = sign * (half - 0.55)
    const b = sign * (half - 0.25)
    const line = new THREE.Mesh(track(buildStrip(s, Math.min(a, b), Math.max(a, b), 0.01)), lineMat)
    line.receiveShadow = true
    group.add(line)
  }

  // Kerbs only where the track bends.
  const curvMax = new Float32Array(s.n)
  for (let i = 0; i < s.n; i++) {
    let m = 0
    for (let k = -8; k <= 8; k++) m = Math.max(m, Math.abs(s.curv[(i + k + s.n) % s.n]))
    curvMax[i] = m
  }
  const red = new THREE.Color(night ? theme.wallAccent : '#d32f2f')
  const white = new THREE.Color('#f5f5f5')
  const kerbMat = overlayMat({ vertexColors: true })
  for (const sign of [-1, 1]) {
    const geo = buildStrip(s, sign > 0 ? half - 0.05 : -half - 1.3, sign > 0 ? half + 1.3 : -half + 0.05, 0.03, {
      colorFn: (i) => (curvMax[i] > 1 / 220 ? (Math.floor(i / 2) % 2 ? red : white) : null),
    })
    group.add(new THREE.Mesh(track(geo), kerbMat))
  }

  // Start / finish line
  const checker = track(
    canvasTexture(128, 32, (ctx) => {
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 8; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#111' : '#fff'
          ctx.fillRect(x * 16, y * 16, 16, 16)
        }
    }),
  )
  checker.repeat.set(def.width / 2.5, 1)
  {
    const startGeo = track(new THREE.PlaneGeometry(def.width, 1.6))
    const start = new THREE.Mesh(startGeo, overlayMat({ map: checker }))
    start.rotation.x = -Math.PI / 2
    const wrap = new THREE.Group()
    wrap.add(start)
    wrap.position.set(s.px[0], s.py[0] + 0.02, s.pz[0])
    wrap.rotation.y = Math.atan2(s.tx[0], s.tz[0])
    group.add(wrap)
  }

  // ---------- Walls ----------
  const wallTex = track(
    canvasTexture(1024, 64, (ctx) => {
      ctx.fillStyle = theme.wall
      ctx.fillRect(0, 0, 1024, 64)
      ctx.fillStyle = theme.wallAccent
      ctx.fillRect(0, 0, 1024, 10)
      ctx.fillRect(0, 54, 1024, 10)
      ctx.font = 'italic 900 34px sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = theme.wallAccent
      ctx.fillText('RACING UNLEASHED', 40, 33)
      ctx.fillText('RACING UNLEASHED', 552, 33)
    }),
  )
  const wallMat = track(
    new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.6,
      side: THREE.DoubleSide,
      emissive: night ? new THREE.Color('#ffffff') : new THREE.Color('#000000'),
      emissiveMap: night ? wallTex : null,
      emissiveIntensity: night ? 0.35 : 0,
    }),
  )
  for (const sign of [-1, 1]) {
    const geo = buildStrip(s, sign * wallOff, sign * wallOff, 0, { vertical: 1.2, uvScale: 32 })
    const wall = new THREE.Mesh(track(geo), wallMat)
    wall.castShadow = false
    wall.receiveShadow = true
    group.add(wall)
  }

  if (def.banking) {
    const skirtMat = track(new THREE.MeshStandardMaterial({ color: '#9a9ca3', roughness: 0.9, side: THREE.DoubleSide }))
    for (const sign of [-1, 1]) {
      const positions: number[] = []
      const indices: number[] = []
      for (let i = 0; i <= s.n; i++) {
        const k = i % s.n
        const top = surfaceOffset(s, k, sign * wallOff)
        positions.push(top.x, s.py[k] - 0.1, top.z, top.x, top.y, top.z)
        if (i > 0) {
          const p = (i - 1) * 2
          indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2)
        }
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geo.setIndex(indices)
      geo.computeVertexNormals()
      group.add(new THREE.Mesh(track(geo), skirtMat))
    }
    // Runoff/apron surface between road and wall so the banking reads as one solid slab.
    const apronMat = track(new THREE.MeshStandardMaterial({ color: '#6f7177', roughness: 0.95 }))
    for (const sign of [-1, 1]) {
      const geo = buildStrip(s, sign > 0 ? half : -wallOff, sign > 0 ? wallOff : -half, -0.02)
      group.add(new THREE.Mesh(track(geo), apronMat))
    }
  }

  // ---------- Start gantry ----------
  {
    const g = new THREE.Group()
    const postMat = track(new THREE.MeshStandardMaterial({ color: '#1b1d22', metalness: 0.6, roughness: 0.4 }))
    const postGeo = track(new THREE.BoxGeometry(0.8, 8, 0.8))
    for (const sign of [-1, 1]) {
      const p = new THREE.Mesh(postGeo, postMat)
      p.position.set(sign * (half + 1.5), 4, 0)
      p.castShadow = true
      g.add(p)
    }
    const bannerTex = track(
      canvasTexture(1024, 128, (ctx) => {
        ctx.fillStyle = '#0b0b0e'
        ctx.fillRect(0, 0, 1024, 128)
        ctx.fillStyle = '#ff3d00'
        ctx.fillRect(0, 0, 1024, 8)
        ctx.fillRect(0, 120, 1024, 8)
        ctx.font = 'italic 900 78px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('RACING UNLEASHED', 512, 68)
      }),
    )
    const beam = new THREE.Mesh(
      track(new THREE.BoxGeometry(def.width + 4, 2, 0.6)),
      track(
        new THREE.MeshStandardMaterial({
          map: bannerTex,
          emissive: new THREE.Color('#ffffff'),
          emissiveMap: bannerTex,
          emissiveIntensity: night ? 0.9 : 0.25,
        }),
      ),
    )
    beam.position.y = 8
    g.add(beam)
    g.position.set(s.px[0], s.py[0], s.pz[0])
    g.rotation.y = Math.atan2(s.tx[0], s.tz[0])
    group.add(g)
  }

  // ---------- Scenery placement helpers ----------
  const spanX = s.maxX - s.minX
  const spanZ = s.maxZ - s.minZ
  const cx = (s.maxX + s.minX) / 2
  const cz = (s.maxZ + s.minZ) / 2
  const waterLine = theme.water === 'south' ? s.maxZ + 40 : theme.water === 'east' ? s.maxX + 40 : Infinity
  const inWater = (x: number, z: number) =>
    theme.water === 'south' ? z > waterLine : theme.water === 'east' ? x > waterLine : false

  const findSpot = (minD: number, maxD: number, tries = 30) => {
    for (let t = 0; t < tries; t++) {
      const x = cx + (rand() - 0.5) * (spanX + maxD * 2)
      const z = cz + (rand() - 0.5) * (spanZ + maxD * 2)
      if (inWater(x, z)) continue
      const { d } = nearestHeight(x, z)
      if (d > minD && d < maxD) return { x, z, d }
    }
    return null
  }

  // Water
  if (theme.water) {
    const water = new THREE.Mesh(
      track(new THREE.PlaneGeometry(6000, 6000)),
      track(
        new THREE.MeshStandardMaterial({
          color: night ? '#0a1a3a' : '#1f6fa8',
          roughness: 0.15,
          metalness: 0.4,
        }),
      ),
    )
    water.rotation.x = -Math.PI / 2
    if (theme.water === 'south') water.position.set(cx, -0.03, waterLine + 3000)
    else water.position.set(waterLine + 3000, -0.03, cz)
    group.add(water)
  }

  // Trees
  if (theme.trees > 0) {
    const coneGeo = track(new THREE.ConeGeometry(1, 1, 7))
    coneGeo.translate(0, 0.5, 0)
    const trunkGeo = track(new THREE.CylinderGeometry(0.25, 0.35, 1, 6))
    trunkGeo.translate(0, 0.5, 0)
    const leafMat = track(
      new THREE.MeshStandardMaterial({ color: theme.scenery === 'coastal' ? '#4f8a3c' : night ? '#14301f' : '#2f5a2a', roughness: 0.9 }),
    )
    const trunkMat = track(new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 1 }))
    const leaves = new THREE.InstancedMesh(coneGeo, leafMat, theme.trees)
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, theme.trees)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const col = new THREE.Color()
    let count = 0
    for (let i = 0; i < theme.trees; i++) {
      const spot = findSpot(wallOff + 6, wallOff + 260)
      if (!spot) continue
      const y = heightAt(spot.x, spot.z)
      const h = 7 + rand() * 9
      const r = 2 + rand() * 2.2
      m.compose(new THREE.Vector3(spot.x, y + 2, spot.z), q, new THREE.Vector3(r, h, r))
      leaves.setMatrixAt(count, m)
      col.setHSL(0.27 + rand() * 0.08, 0.45, night ? 0.12 : 0.22 + rand() * 0.12)
      leaves.setColorAt(count, col)
      m.compose(new THREE.Vector3(spot.x, y, spot.z), q, new THREE.Vector3(1, 2.5, 1))
      trunks.setMatrixAt(count, m)
      count++
    }
    leaves.count = count
    trunks.count = count
    leaves.castShadow = true
    group.add(leaves, trunks)
  }

  // Buildings
  if (theme.buildings > 0) {
    const winTex = track(
      canvasTexture(64, 128, (ctx) => {
        ctx.fillStyle = night ? '#0d1020' : '#c9ccd2'
        ctx.fillRect(0, 0, 64, 128)
        for (let y = 4; y < 128; y += 10)
          for (let x = 4; x < 64; x += 10) {
            const lit = Math.random() > (night ? 0.45 : 0.2)
            ctx.fillStyle = night ? (lit ? (Math.random() > 0.5 ? '#ffd88a' : '#9fd8ff') : '#151a2c') : lit ? '#5b7690' : '#3e4f61'
            ctx.fillRect(x, y, 6, 7)
          }
      }),
    )
    const boxGeo = track(new THREE.BoxGeometry(1, 1, 1))
    boxGeo.translate(0, 0.5, 0)
    const bMat = track(
      new THREE.MeshStandardMaterial({
        map: winTex,
        roughness: 0.6,
        emissive: night ? new THREE.Color('#ffffff') : new THREE.Color('#000000'),
        emissiveMap: night ? winTex : null,
        emissiveIntensity: night ? 0.9 : 0,
      }),
    )
    const mesh = new THREE.InstancedMesh(boxGeo, bMat, theme.buildings)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const col = new THREE.Color()
    let count = 0
    const city = theme.scenery === 'city'
    for (let i = 0; i < theme.buildings; i++) {
      const spot = findSpot(wallOff + 12, wallOff + (city ? 180 : 320))
      if (!spot) continue
      const w = 14 + rand() * 22
      const d = 14 + rand() * 22
      const tall = city ? 16 + rand() * (night ? 110 : 60) : 6 + rand() * 10
      if (spot.d < wallOff + 12 + Math.max(w, d) / 2) continue
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI)
      m.compose(new THREE.Vector3(spot.x, heightAt(spot.x, spot.z) - 0.5, spot.z), q, new THREE.Vector3(w, tall, d))
      mesh.setMatrixAt(count, m)
      col.setHSL(rand(), city ? 0.12 : 0.05, night ? 0.6 : 0.7 + rand() * 0.25)
      mesh.setColorAt(count, col)
      count++
    }
    mesh.count = count
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  // Grandstands along the start straight
  {
    const crowdTex = track(
      canvasTexture(256, 64, (ctx) => {
        ctx.fillStyle = '#2a2d35'
        ctx.fillRect(0, 0, 256, 64)
        const palette = ['#ff3d00', '#ffd400', '#00c2ff', '#ffffff', '#e040fb', '#00e676', '#222']
        for (let i = 0; i < 1400; i++) {
          ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)]
          ctx.fillRect(Math.random() * 256, Math.random() * 64, 2, 2)
        }
      }),
    )
    crowdTex.repeat.set(4, 1)
    const standMat = track(new THREE.MeshStandardMaterial({ map: crowdTex, roughness: 0.9 }))
    const roofMat = track(new THREE.MeshStandardMaterial({ color: '#e9e9ee', roughness: 0.5, metalness: 0.2 }))
    const standGeo = track(new THREE.BoxGeometry(1, 1, 1))
    const sideSign = Math.sign(s.curv.reduce((a, b) => a + b, 0)) || 1
    // Place on the outside of the circuit (opposite the overall turning direction).
    const sign = -sideSign
    for (const at of [-60, 0, 60]) {
      const i = (Math.round(at / s.spacing) + s.n) % s.n
      const stand = new THREE.Group()
      for (let row = 0; row < 5; row++) {
        const step = new THREE.Mesh(standGeo, standMat)
        step.scale.set(50, 1.4, 2.4)
        step.position.set(0, 0.7 + row * 1.4, row * 2.4)
        step.castShadow = true
        step.receiveShadow = true
        stand.add(step)
      }
      const roof = new THREE.Mesh(standGeo, roofMat)
      roof.scale.set(52, 0.4, 14)
      roof.position.set(0, 10, 5)
      roof.castShadow = true
      stand.add(roof)
      const base = surfaceOffset(s, i, sign * (wallOff + 6))
      stand.position.set(base.x, s.py[i] - 0.3, base.z)
      const ang = Math.atan2(s.tx[i], s.tz[i])
      stand.rotation.y = ang + (sign > 0 ? Math.PI / 2 : -Math.PI / 2)
      group.add(stand)
    }
  }

  // Distant hills
  if (theme.hills) {
    const hillGeo = track(new THREE.ConeGeometry(1, 1, 9))
    hillGeo.translate(0, 0.5, 0)
    const hillMat = track(new THREE.MeshStandardMaterial({ color: theme.grass, roughness: 1, flatShading: true }))
    const radius = Math.max(spanX, spanZ) / 2 + 900
    const hills = new THREE.InstancedMesh(hillGeo, hillMat, 28)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + rand() * 0.2
      const r = radius + rand() * 500
      const size = 300 + rand() * 500
      m.compose(
        new THREE.Vector3(cx + Math.cos(a) * r, -2, cz + Math.sin(a) * r),
        q,
        new THREE.Vector3(size, (theme.scenery === 'mountain' ? 220 : 110) + rand() * 160, size),
      )
      hills.setMatrixAt(i, m)
    }
    group.add(hills)
  }

  // Night floodlights (visual poles + bright lamp heads)
  if (night) {
    const poleGeo = track(new THREE.CylinderGeometry(0.2, 0.25, 12, 6))
    poleGeo.translate(0, 6, 0)
    const lampGeo = track(new THREE.BoxGeometry(2.4, 0.4, 1))
    const poleMat = track(new THREE.MeshStandardMaterial({ color: '#2a2d35' }))
    const lampMat = track(new THREE.MeshBasicMaterial({ color: '#fff6dc' }))
    const every = Math.round(40 / s.spacing)
    const total = Math.floor(s.n / every)
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, total)
    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, total)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    for (let k = 0; k < total; k++) {
      const i = k * every
      const sign = k % 2 ? 1 : -1
      const p = surfaceOffset(s, i, sign * (wallOff + 1.5))
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(s.tx[i], s.tz[i]))
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(1, 1, 1))
      poles.setMatrixAt(k, m)
      m.compose(new THREE.Vector3(p.x - s.rx[i] * sign * 1.2, p.y + 12, p.z - s.rz[i] * sign * 1.2), q, new THREE.Vector3(1, 1, 1))
      lamps.setMatrixAt(k, m)
    }
    group.add(poles, lamps)
  }

  scene.add(group)
  return {
    group,
    heightAt,
    dispose: () => {
      scene.remove(group)
      disposables.forEach((d) => d.dispose())
    },
  }
}
