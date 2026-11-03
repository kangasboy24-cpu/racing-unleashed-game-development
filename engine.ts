import * as THREE from 'three'
import { RaceAudio } from './audio'
import { buildCar, type CarModel } from './car-mesh'
import { AI_DRIVERS, CAR_SPECS, DIFFICULTY, type CarClassId, type CarSpec, type Difficulty } from './cars'
import { sampleTrack, type TrackSamples } from './track-samples'
import type { TrackDef } from './tracks'
import { bankHeight, buildWorld, type World } from './world'

export interface RaceConfig {
  track: TrackDef
  carClass: CarClassId
  playerColor: string
  playerName: string
  opponents: number
  difficulty: Difficulty
  laps: number
  muted: boolean
}

export interface Standing {
  name: string
  color: string
  isPlayer: boolean
}

export interface HudSnapshot {
  phase: 'countdown' | 'racing' | 'finished'
  lights: number
  showGo: boolean
  position: number
  totalCars: number
  lap: number
  totalLaps: number
  lapTime: number
  lastLap: number | null
  bestLap: number | null
  raceTime: number
  speed: number
  gear: string
  rpm: number
  wrongWay: boolean
  finalLap: boolean
  standings: Standing[]
  camera: number
}

export interface RaceResult {
  position: number
  name: string
  color: string
  isPlayer: boolean
  time: number
  bestLap: number | null
  estimated: boolean
}

export interface TouchInput {
  throttle: boolean
  brake: boolean
  left: boolean
  right: boolean
}

interface Callbacks {
  onHud: (s: HudSnapshot) => void
  onFinish: (results: RaceResult[]) => void
}

interface Car {
  name: string
  color: string
  isPlayer: boolean
  model: CarModel
  x: number
  z: number
  y: number
  heading: number
  vx: number
  vz: number
  vF: number
  yawRate: number
  steer: number
  throttle: number
  brake: number
  handbrake: boolean
  idx: number
  prevIdx: number
  lap: number
  maxIdx: number
  lapStart: number
  skipLapTime: boolean
  lastLap: number | null
  bestLap: number | null
  finished: boolean
  finishTime: number
  lat: number
  wrongWayT: number
  slip: number
  skill: number
  baseSkill: number
  lane: number
  laneTarget: number
  laneT: number
  avoid: number
  stuckT: number
  autopilot: boolean
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const wrapAngle = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

const STEP = 1 / 120

export class RaceEngine {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private world: World
  private s: TrackSamples
  private def: TrackDef
  private spec: CarSpec
  private cfg: RaceConfig
  private cars: Car[] = []
  private player: Car
  private sun: THREE.DirectionalLight
  private audio: RaceAudio
  private keys = new Set<string>()
  private touch: TouchInput = { throttle: false, brake: false, left: false, right: false }
  private phase: 'countdown' | 'racing' | 'finished' = 'countdown'
  private countdownT = 0
  private goDelay = 0.4 + Math.random() * 0.8
  private lights = 0
  private time = 0
  private goShownUntil = 0
  private paused = false
  private camMode = 0
  private camHeading = 0
  private camShake = 0
  private finishT = 0
  private finishSent = false
  private hudT = 0
  private accumulator = 0
  private lastFrame = performance.now()
  private targetSpeed: Float32Array
  private minimap: HTMLCanvasElement | null
  private minimapBg: HTMLCanvasElement | null = null
  private minimapFrame = 0
  private resizeObs: ResizeObserver
  private container: HTMLElement
  private cb: Callbacks
  private disposed = false
  private wallOff: number

  constructor(container: HTMLElement, minimap: HTMLCanvasElement | null, cfg: RaceConfig, cb: Callbacks) {
    this.container = container
    this.minimap = minimap
    this.cfg = cfg
    this.cb = cb
    this.def = cfg.track
    this.spec = CAR_SPECS[cfg.carClass]
    this.s = sampleTrack(cfg.track)
    this.wallOff = this.def.width / 2 + this.def.runoff

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = cfg.track.theme.sky === 'night' ? 1.1 : 0.9
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.2, 9000)
    this.resize()
    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(container)

    this.world = buildWorld(this.def, this.s, this.scene)
    this.sun = this.setupLights()
    this.targetSpeed = this.computeTargetSpeeds()
    this.player = this.spawnCars()
    this.camHeading = this.player.heading
    this.placeCamera(1)
    this.buildMinimap()

    this.audio = new RaceAudio(cfg.muted)
    this.audio.resume()

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    this.renderer.setAnimationLoop(this.frame)
  }

  // ---------------- setup ----------------

  private resize() {
    const w = this.container.clientWidth || window.innerWidth
    const h = this.container.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private setupLights() {
    const sky = this.def.theme.sky
    const hemi =
      sky === 'night'
        ? new THREE.HemisphereLight('#6a7ab0', '#15151f', 1.4)
        : sky === 'sunset'
          ? new THREE.HemisphereLight('#ffd6b0', '#4a3a2a', 1.1)
          : new THREE.HemisphereLight('#d8ecff', '#4a5a30', 1.25)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(sky === 'night' ? '#e6ecff' : sky === 'sunset' ? '#ffb27a' : '#fff3df', sky === 'night' ? 1.3 : 2.6)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const sc = sun.shadow.camera
    sc.left = -45
    sc.right = 45
    sc.top = 45
    sc.bottom = -45
    sc.near = 1
    sc.far = 260
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.04
    this.scene.add(sun, sun.target)
    return sun
  }

  private computeTargetSpeeds() {
    const { s, spec } = this
    const v = new Float32Array(s.n)
    for (let i = 0; i < s.n; i++) {
      let k = 0
      for (let j = -3; j <= 3; j++) k = Math.max(k, Math.abs(s.curv[(i + j + s.n) % s.n]))
      const bonus = 1 + Math.abs(Math.sin(s.bank[i])) * 1.6
      v[i] = Math.min(spec.topSpeed, Math.sqrt((spec.grip * 0.97 * bonus) / Math.max(k, 1e-5)))
    }
    const decel = spec.brake * 0.72
    for (let pass = 0; pass < 3; pass++) {
      for (let i = s.n - 1; i >= 0; i--) {
        const next = (i + 1) % s.n
        v[i] = Math.min(v[i], Math.sqrt(v[next] * v[next] + 2 * decel * s.spacing))
      }
    }
    return v
  }

  private spawnCars() {
    const { s, cfg } = this
    const total = cfg.opponents + 1
    const [lo, hi] = DIFFICULTY[cfg.difficulty].skill
    const drivers = [...AI_DRIVERS].sort(() => Math.random() - 0.5)
    let player: Car | null = null
    for (let slot = 0; slot < total; slot++) {
      const isPlayer = slot === total - 1
      const back = 14 + slot * 8
      const idx = (s.n - Math.round(back / s.spacing) + s.n * 4) % s.n
      const lat = (slot % 2 === 0 ? -1 : 1) * this.def.width * 0.2
      const driver = drivers[slot % drivers.length]
      const color = isPlayer ? cfg.playerColor : driver.color === cfg.playerColor ? '#9e9e9e' : driver.color
      const model = buildCar(cfg.carClass, color, isPlayer ? 1 : slot + 2)
      model.root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true
      })
      this.scene.add(model.root)
      const skill = lo + ((hi - lo) * (total - 1 - slot)) / Math.max(1, total - 2) + (Math.random() - 0.5) * 0.015
      const car: Car = {
        name: isPlayer ? cfg.playerName : driver.name,
        color,
        isPlayer,
        model,
        x: s.px[idx] + s.rx[idx] * lat,
        z: s.pz[idx] + s.rz[idx] * lat,
        y: s.py[idx],
        heading: Math.atan2(s.tx[idx], s.tz[idx]),
        vx: 0,
        vz: 0,
        vF: 0,
        yawRate: 0,
        steer: 0,
        throttle: 0,
        brake: 0,
        handbrake: false,
        idx,
        prevIdx: idx,
        lap: -1,
        maxIdx: s.n,
        lapStart: 0,
        skipLapTime: false,
        lastLap: null,
        bestLap: null,
        finished: false,
        finishTime: 0,
        lat,
        wrongWayT: 0,
        slip: 0,
        skill: clamp(skill, lo - 0.02, hi + 0.01),
        baseSkill: clamp(skill, lo - 0.02, hi + 0.01),
        lane: lat,
        laneTarget: 0,
        laneT: 2 + Math.random() * 3,
        avoid: 0,
        stuckT: 0,
        autopilot: !isPlayer,
      }
      this.cars.push(car)
      if (isPlayer) player = car
    }
    for (const c of this.cars) this.syncMesh(c, 0)
    return player!
  }

  private buildMinimap() {
    if (!this.minimap) return
    const { s } = this
    const size = 512
    const bg = document.createElement('canvas')
    bg.width = size
    bg.height = size
    const ctx = bg.getContext('2d')!
    const pad = 40
    const span = Math.max(s.maxX - s.minX, s.maxZ - s.minZ)
    const scale = (size - pad * 2) / span
    const ox = pad + ((size - pad * 2) - (s.maxX - s.minX) * scale) / 2
    const oz = pad + ((size - pad * 2) - (s.maxZ - s.minZ) * scale) / 2
    this.mapTransform = { scale, ox, oz }
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i <= s.n; i++) {
      const k = i % s.n
      const x = ox + (s.px[k] - s.minX) * scale
      const y = oz + (s.pz[k] - s.minZ) * scale
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'
    ctx.lineWidth = 22
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'
    ctx.lineWidth = 10
    ctx.stroke()
    const sx = ox + (s.px[0] - s.minX) * scale
    const sy = oz + (s.pz[0] - s.minZ) * scale
    ctx.fillStyle = '#ff3d00'
    ctx.fillRect(sx - 9, sy - 9, 18, 18)
    this.minimapBg = bg
    this.minimap.width = size
    this.minimap.height = size
  }

  private mapTransform = { scale: 1, ox: 0, oz: 0 }

  private drawMinimap() {
    if (!this.minimap || !this.minimapBg) return
    const ctx = this.minimap.getContext('2d')
    if (!ctx) return
    const { scale, ox, oz } = this.mapTransform
    ctx.clearRect(0, 0, 512, 512)
    ctx.drawImage(this.minimapBg, 0, 0)
    const draw = (c: Car) => {
      const x = ox + (c.x - this.s.minX) * scale
      const y = oz + (c.z - this.s.minZ) * scale
      ctx.beginPath()
      ctx.arc(x, y, c.isPlayer ? 17 : 12, 0, Math.PI * 2)
      ctx.fillStyle = c.color
      ctx.fill()
      ctx.lineWidth = c.isPlayer ? 6 : 3
      ctx.strokeStyle = c.isPlayer ? '#ffffff' : '#000000'
      ctx.stroke()
    }
    for (const c of this.cars) if (!c.isPlayer) draw(c)
    draw(this.player)
  }

  // ---------------- input ----------------

  private onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault()
    this.keys.add(e.code)
    if (e.repeat) return
    if (e.code === 'KeyC') this.cycleCamera()
    if (e.code === 'KeyR') this.resetPlayer()
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
  }

  private onBlur = () => this.keys.clear()

  setTouch(input: Partial<TouchInput>) {
    this.touch = { ...this.touch, ...input }
  }

  cycleCamera() {
    this.camMode = (this.camMode + 1) % 3
  }

  resetPlayer() {
    if (this.phase !== 'racing') return
    this.resetCar(this.player)
  }

  private resetCar(c: Car) {
    const { s } = this
    const i = c.idx
    c.x = s.px[i]
    c.z = s.pz[i]
    c.heading = Math.atan2(s.tx[i], s.tz[i])
    c.vx = 0
    c.vz = 0
    c.vF = 0
    c.lat = 0
    c.stuckT = 0
    c.wrongWayT = 0
  }

  setPaused(p: boolean) {
    this.paused = p
    this.keys.clear()
    if (p) this.audio.suspend()
    else {
      this.audio.resume()
      this.lastFrame = performance.now()
    }
  }

  setMuted(m: boolean) {
    this.audio.setMuted(m)
  }

  // ---------------- simulation ----------------

  private frame = () => {
    if (this.disposed) return
    const now = performance.now()
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000)
    this.lastFrame = now
    if (!this.paused) {
      this.accumulator += dt
      while (this.accumulator >= STEP) {
        this.step(STEP)
        this.accumulator -= STEP
      }
      for (const c of this.cars) this.syncMesh(c, dt)
      this.updateCamera(dt)
      this.updateAudio()
      this.hudT += dt
      if (this.hudT > 0.1) {
        this.hudT = 0
        this.cb.onHud(this.snapshot())
      }
      if (++this.minimapFrame % 2 === 0) this.drawMinimap()
    }
    this.renderer.render(this.scene, this.camera)
  }

  private step(dt: number) {
    if (this.phase === 'countdown') {
      this.countdownT += dt
      const lights = Math.min(5, Math.floor(this.countdownT / 0.8))
      if (lights > this.lights) {
        this.lights = lights
        this.audio.beep(440, 0.2)
      }
      if (this.countdownT > 4.0 + this.goDelay) {
        this.phase = 'racing'
        this.lights = 0
        this.goShownUntil = 1.2
        this.audio.beep(880, 0.5)
      }
      this.readPlayerInput(dt)
      return
    }

    this.time += dt
    if (this.phase === 'finished') {
      this.finishT += dt
      if (this.finishT > 4 && !this.finishSent) {
        this.finishSent = true
        this.cb.onFinish(this.results())
      }
    }

    this.updateRubberBand()
    for (const c of this.cars) {
      if (c.autopilot) this.aiControl(c, dt)
      else this.readPlayerInput(dt)
      this.physics(c, dt)
    }
    this.collide()
    for (const c of this.cars) this.progress(c)
  }

  private readPlayerInput(dt: number) {
    const k = this.keys
    const t = this.touch
    const c = this.player
    const throttle = k.has('ArrowUp') || k.has('KeyW') || t.throttle
    const brake = k.has('ArrowDown') || k.has('KeyS') || t.brake
    const left = k.has('ArrowLeft') || k.has('KeyA') || t.left
    const right = k.has('ArrowRight') || k.has('KeyD') || t.right
    c.throttle = throttle ? 1 : 0
    c.brake = brake ? 1 : 0
    c.handbrake = k.has('Space')
    const target = (right ? 1 : 0) - (left ? 1 : 0)
    const rate = target === 0 || Math.sign(target) !== Math.sign(c.steer) ? 9 : 4.5
    c.steer += clamp(target - c.steer, -rate * dt, rate * dt)
  }

  private updateRubberBand() {
    const n = this.s.n
    const pp = this.player.lap * n + this.player.idx
    for (const c of this.cars) {
      if (c.isPlayer) continue
      const gap = ((c.lap * n + c.idx - pp) * this.s.spacing) / 1
      const adj = gap > 250 ? -0.03 : gap < -250 ? 0.025 : 0
      c.skill = c.baseSkill + adj
    }
  }

  private aiControl(c: Car, dt: number) {
    const { s } = this
    const n = s.n
    const half = this.def.width / 2
    const spd = Math.max(0, c.vF)
    const look = clamp(spd * 0.5, 7, 34)
    const la = Math.max(2, Math.round(look / s.spacing))
    const ti = (c.idx + la) % n
    const kAhead = s.curv[(c.idx + la * 2) % n]
    const lineOff = -clamp(kAhead * 350, -1, 1) * half * 0.55

    c.laneT -= dt
    if (c.laneT < 0) {
      c.laneTarget = (Math.random() - 0.5) * half * 0.6
      c.laneT = 3 + Math.random() * 4
    }
    c.lane += (c.laneTarget - c.lane) * Math.min(1, dt * 0.8)

    c.avoid *= Math.exp(-dt * 1.5)
    const fx = Math.sin(c.heading)
    const fz = Math.cos(c.heading)
    for (const o of this.cars) {
      if (o === c) continue
      const dx = o.x - c.x
      const dz = o.z - c.z
      const ahead = dx * fx + dz * fz
      if (ahead > 0 && ahead < 16) {
        const side = o.lat - c.lat
        if (Math.abs(side) < 3 && o.vF < c.vF + 3) {
          const roomLeft = o.lat + half
          const roomRight = half - o.lat
          c.avoid = clamp(c.avoid + (roomRight > roomLeft ? 1 : -1) * dt * 12, -half * 0.6, half * 0.6)
        }
      }
    }

    const offset = clamp(lineOff + c.lane + c.avoid, -half + 1.6, half - 1.6)
    const tx = s.px[ti] + s.rx[ti] * offset
    const tz = s.pz[ti] + s.rz[ti] * offset
    const desired = Math.atan2(tx - c.x, tz - c.z)
    const diff = wrapAngle(desired - c.heading)
    c.steer = clamp(-diff * 2.8, -1, 1)

    const offTrack = Math.abs(c.lat) > half + 1
    const ts = this.targetSpeed[(c.idx + 2) % n] * (c.autopilot && c.isPlayer ? 0.85 : c.skill) * (offTrack ? 0.75 : 1)
    if (c.vF < ts - 1) {
      c.throttle = 1
      c.brake = 0
    } else if (c.vF > ts + 1.5) {
      c.throttle = 0
      c.brake = clamp((c.vF - ts) / 6, 0.25, 1)
    } else {
      c.throttle = 0.45
      c.brake = 0
    }
    c.handbrake = false

    if (this.phase !== 'countdown' && Math.abs(c.vF) < 2) {
      c.stuckT += dt
      if (c.stuckT > 2.5) this.resetCar(c)
    } else c.stuckT = 0
  }

  private physics(c: Car, dt: number) {
    const { s, spec, def } = this
    const n = s.n
    const half = def.width / 2
    const fx = Math.sin(c.heading)
    const fz = Math.cos(c.heading)
    const rx = -fz
    const rz = fx
    let vF = c.vx * fx + c.vz * fz
    const vL = c.vx * rx + c.vz * rz

    const onRoad = Math.abs(c.lat) < half + 1.3
    const gripMul = onRoad ? 1 : 0.6
    const bankBonus = 1 + Math.abs(Math.sin(s.bank[c.idx])) * 1.6
    const aiTop = c.isPlayer ? 1 : 0.9 + 0.1 * clamp(c.skill, 0.7, 1.05)
    const top = spec.topSpeed * (onRoad ? 1 : 0.45) * aiTop
    const accelMul = c.isPlayer ? 1 : 0.85 + 0.15 * c.skill

    let a = 0
    if (c.throttle > 0) {
      if (vF < top) a += spec.accel * accelMul * c.throttle * Math.max(0.06, 1 - Math.pow(Math.max(0, vF) / top, 2))
    }
    if (vF > top) a -= (vF - top) * 1.5
    if (c.brake > 0) {
      if (vF > 0.5) a -= spec.brake * c.brake * (onRoad ? 1 : 0.6)
      else if (c.throttle === 0) a -= 9 * c.brake
    }
    a -= 0.00032 * vF * Math.abs(vF)
    a -= (onRoad ? 0.4 : 3.2) * Math.sign(vF) * Math.min(1, Math.abs(vF))
    const along = fx * s.tx[c.idx] + fz * s.tz[c.idx]
    a -= 9.8 * s.slope[c.idx] * along * 0.5
    vF += a * dt
    if (vF < -14) vF = -14
    if (c.throttle === 0 && c.brake === 0 && Math.abs(vF) < 0.3) vF = 0

    const spd = Math.abs(vF)
    const authority = (spec.steer / (1 + spd / spec.steerFalloff)) * Math.min(1, spd / 5)
    const desired = -c.steer * authority * (vF >= 0 ? 1 : -1)
    let maxYaw = (spec.grip * gripMul * bankBonus) / Math.max(spd, 1)
    if (c.handbrake) maxYaw *= 1.5
    const yaw = clamp(desired, -maxYaw, maxYaw)
    const excess = Math.abs(desired) - Math.abs(yaw)
    if (excess > 0) vF -= Math.sign(vF) * excess * spd * 0.25 * dt
    c.heading += yaw * dt
    c.yawRate = yaw

    const nfx = Math.sin(c.heading)
    const nfz = Math.cos(c.heading)
    const nrx = -nfz
    const nrz = nfx
    const wvx = fx * vF + rx * vL
    const wvz = fz * vF + rz * vL
    let nF = wvx * nfx + wvz * nfz
    let nL = wvx * nrx + wvz * nrz
    nL *= Math.exp(-(c.handbrake ? 1.6 : 9) * gripMul * dt)
    if (c.handbrake) nF -= Math.sign(nF) * Math.min(Math.abs(nF), 5 * dt)
    c.slip = Math.abs(nL) + (excess > 0.15 ? excess * 8 : 0)
    c.vx = nfx * nF + nrx * nL
    c.vz = nfz * nF + nrz * nL
    c.vF = nF

    c.x += c.vx * dt
    c.z += c.vz * dt

    // Track position
    let best = Infinity
    let bi = c.idx
    for (let k = -12; k <= 40; k++) {
      const i = (c.idx + k + n) % n
      const dx = s.px[i] - c.x
      const dz = s.pz[i] - c.z
      const d = dx * dx + dz * dz
      if (d < best) {
        best = d
        bi = i
      }
    }
    if (best > (this.wallOff + 25) ** 2) {
      for (let i = 0; i < n; i++) {
        const dx = s.px[i] - c.x
        const dz = s.pz[i] - c.z
        const d = dx * dx + dz * dz
        if (d < best) {
          best = d
          bi = i
        }
      }
    }
    c.prevIdx = c.idx
    c.idx = bi

    const i = c.idx
    const dx = c.x - s.px[i]
    const dz = c.z - s.pz[i]
    let lat = dx * s.rx[i] + dz * s.rz[i]
    const limit = this.wallOff - 1.1
    if (Math.abs(lat) > limit) {
      const sign = Math.sign(lat)
      const excessLat = lat - sign * limit
      c.x -= s.rx[i] * excessLat
      c.z -= s.rz[i] * excessLat
      const vn = c.vx * s.rx[i] + c.vz * s.rz[i]
      if (vn * sign > 0) {
        c.vx -= s.rx[i] * vn * 1.3
        c.vz -= s.rz[i] * vn * 1.3
        const impact = Math.abs(vn)
        const scrub = 1 - Math.min(0.35, impact * 0.025)
        c.vx *= scrub
        c.vz *= scrub
        if (c.isPlayer && impact > 2) {
          this.audio.thud(impact)
          this.camShake = Math.min(1, impact / 15)
        }
      }
      lat = sign * limit
    }
    c.lat = lat

    const alongT = dx * s.tx[i] + dz * s.tz[i]
    const j = alongT >= 0 ? (i + 1) % n : (i - 1 + n) % n
    const t = clamp(Math.abs(alongT) / s.spacing, 0, 1)
    const y0 = s.py[i] + bankHeight(s, i, lat)
    const y1 = s.py[j] + bankHeight(s, j, lat)
    c.y = y0 + (y1 - y0) * t - (Math.abs(lat) > half + 1.3 && s.hasElevation ? 0.2 : 0)

    // Wrong way
    const dot = nfx * s.tx[i] + nfz * s.tz[i]
    if (dot < -0.2 && Math.abs(nF) > 3) c.wrongWayT += dt
    else c.wrongWayT = Math.max(0, c.wrongWayT - dt * 2)
  }

  private collide() {
    const R = 3.0
    for (let a = 0; a < this.cars.length; a++) {
      for (let b = a + 1; b < this.cars.length; b++) {
        const A = this.cars[a]
        const B = this.cars[b]
        const dx = B.x - A.x
        const dz = B.z - A.z
        const d2 = dx * dx + dz * dz
        if (d2 > R * R || d2 < 1e-6) continue
        if (Math.abs(A.y - B.y) > 3) continue
        const d = Math.sqrt(d2)
        const nx = dx / d
        const nz = dz / d
        const overlap = (R - d) / 2
        A.x -= nx * overlap
        A.z -= nz * overlap
        B.x += nx * overlap
        B.z += nz * overlap
        const rv = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz
        if (rv < 0) {
          const j = (-rv * 1.3) / 2
          A.vx -= nx * j
          A.vz -= nz * j
          B.vx += nx * j
          B.vz += nz * j
          if ((A.isPlayer || B.isPlayer) && -rv > 2) {
            this.audio.thud(-rv)
            this.camShake = Math.min(1, -rv / 12)
          }
        }
      }
    }
  }

  private progress(c: Car) {
    const n = this.s.n
    if (c.prevIdx > n * 0.75 && c.idx < n * 0.25) {
      if (c.maxIdx > n * 0.6) this.completeLap(c)
    } else if (c.prevIdx < n * 0.25 && c.idx > n * 0.75) {
      c.lap -= 1
      c.maxIdx = n
      c.skipLapTime = true
    }
    if (c.idx > c.maxIdx && c.idx - c.maxIdx < 60) c.maxIdx = c.idx
  }

  private completeLap(c: Car) {
    if (c.lap >= 0 && !c.skipLapTime) {
      const lt = this.time - c.lapStart
      c.lastLap = lt
      if (c.bestLap === null || lt < c.bestLap) c.bestLap = lt
    }
    if (!c.skipLapTime) c.lapStart = this.time
    c.skipLapTime = false
    c.lap += 1
    c.maxIdx = c.idx
    if (c.lap >= this.cfg.laps && !c.finished) {
      c.finished = true
      c.finishTime = this.time
      if (c.isPlayer) {
        this.phase = 'finished'
        c.autopilot = true
        this.finishT = 0
        this.audio.beep(660, 0.3)
        setTimeout(() => this.audio.beep(990, 0.5), 250)
      }
    }
  }

  // ---------------- presentation ----------------

  private tmpM = new THREE.Matrix4()
  private tmpX = new THREE.Vector3()
  private tmpY = new THREE.Vector3()
  private tmpZ = new THREE.Vector3()

  private syncMesh(c: Car, dt: number) {
    const { s } = this
    const i = c.idx
    const b = s.bank[i]
    const N = this.tmpY.set(-s.rx[i] * Math.tan(b) - s.tx[i] * s.slope[i], 1, -s.rz[i] * Math.tan(b) - s.tz[i] * s.slope[i]).normalize()
    const F = this.tmpZ.set(Math.sin(c.heading), 0, Math.cos(c.heading))
    F.addScaledVector(N, -F.dot(N)).normalize()
    const X = this.tmpX.crossVectors(N, F).normalize()
    this.tmpM.makeBasis(X, N, F)
    const root = c.model.root
    root.quaternion.setFromRotationMatrix(this.tmpM)
    root.position.set(c.x, c.y, c.z)
    const spd = c.vF
    c.model.body.rotation.z = clamp(c.yawRate * spd * 0.0035, -0.05, 0.05)
    c.model.body.rotation.x = c.brake > 0 && spd > 2 ? 0.015 : c.throttle > 0 ? -0.008 : 0
    for (const w of c.model.wheels) w.rotation.x += (spd * dt) / 0.35
    for (const p of c.model.frontPivots) p.rotation.y = -c.steer * 0.42
    c.model.brakeLights.emissiveIntensity = c.brake > 0 ? 3 : 0.4
  }

  private camPos = new THREE.Vector3()
  private camLook = new THREE.Vector3()

  private placeCamera(dt: number) {
    const p = this.player
    const h = this.camHeading
    const back = this.camMode === 1 ? 14 : 8.5
    const up = this.camMode === 1 ? 5.2 : 3.1
    this.camPos.set(p.x - Math.sin(h) * back, p.y + up, p.z - Math.cos(h) * back)
    if (dt >= 1) this.camera.position.copy(this.camPos)
    else this.camera.position.lerp(this.camPos, 1 - Math.exp(-dt * 14))
    this.camera.position.y = Math.max(this.camera.position.y, p.y + 1.2)
    this.camLook.set(p.x + Math.sin(p.heading) * 6, p.y + 1.3, p.z + Math.cos(p.heading) * 6)
    this.camera.lookAt(this.camLook)
  }

  private updateCamera(dt: number) {
    const p = this.player
    const spd = Math.abs(p.vF)
    this.camHeading += wrapAngle(p.heading - this.camHeading) * (1 - Math.exp(-dt * 6))

    if (this.phase === 'finished') {
      const a = this.finishT * 0.45 + p.heading + 0.6
      this.camera.position.lerp(new THREE.Vector3(p.x + Math.sin(a) * 11, p.y + 3.5, p.z + Math.cos(a) * 11), 1 - Math.exp(-dt * 3))
      this.camera.lookAt(p.x, p.y + 0.8, p.z)
    } else if (this.camMode === 2) {
      const root = p.model.root
      const pos = root.localToWorld(new THREE.Vector3(0, this.cfg.carClass === 'stock' ? 1.55 : 1.3, this.cfg.carClass === 'formula' ? 0.95 : 1.1))
      const look = root.localToWorld(new THREE.Vector3(0, 1.0, 30))
      this.camera.position.copy(pos)
      this.camera.lookAt(look)
    } else {
      this.placeCamera(dt)
    }

    if (this.camShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.camShake * 0.5
      this.camera.position.y += (Math.random() - 0.5) * this.camShake * 0.3
      this.camShake = Math.max(0, this.camShake - dt * 3)
    }

    const fov = 60 + clamp(spd / this.spec.topSpeed, 0, 1) * 16 + (this.camMode === 2 ? 6 : 0)
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 4)
      this.camera.updateProjectionMatrix()
    }

    const sky = this.def.theme.sky
    const off = sky === 'sunset' ? new THREE.Vector3(-70, 35, 50) : new THREE.Vector3(40, 90, 30)
    this.sun.position.set(p.x + off.x, p.y + off.y, p.z + off.z)
    this.sun.target.position.set(p.x, p.y, p.z)
  }

  private gearInfo() {
    const p = this.player
    const spd = Math.abs(p.vF)
    const gs = (this.spec.topSpeed * 1.02) / this.spec.gears
    if (p.vF < -0.5) return { gear: 'R', rpm: 0.3 + Math.min(0.5, spd / 14) }
    if (spd < 1) return { gear: 'N', rpm: 0.12 + p.throttle * 0.55 }
    const g = clamp(Math.ceil(spd / gs), 1, this.spec.gears)
    const lower = (g - 1) * gs
    const frac = (spd - lower) / gs
    return { gear: String(g), rpm: clamp(g === 1 ? 0.2 + frac * 0.8 : 0.45 + frac * 0.55, 0, 1) }
  }

  private updateAudio() {
    const { rpm } = this.gearInfo()
    const onRoad = Math.abs(this.player.lat) < this.def.width / 2 + 1.3
    this.audio.update(rpm, this.player.throttle, onRoad ? Math.max(0, this.player.slip - 2.5) : 0)
  }

  private order() {
    const n = this.s.n
    return [...this.cars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime
      if (a.finished) return -1
      if (b.finished) return 1
      return b.lap * n + b.idx - (a.lap * n + a.idx)
    })
  }

  private snapshot(): HudSnapshot {
    const p = this.player
    const order = this.order()
    const { gear, rpm } = this.gearInfo()
    if (this.goShownUntil > 0) this.goShownUntil -= 0.1
    return {
      phase: this.phase,
      lights: this.phase === 'countdown' ? this.lights : 0,
      showGo: this.goShownUntil > 0,
      position: order.indexOf(p) + 1,
      totalCars: this.cars.length,
      lap: clamp(p.lap + 1, 1, this.cfg.laps),
      totalLaps: this.cfg.laps,
      lapTime: this.phase === 'racing' && p.lap >= 0 ? this.time - p.lapStart : 0,
      lastLap: p.lastLap,
      bestLap: p.bestLap,
      raceTime: this.time,
      speed: Math.round(Math.abs(p.vF) * 3.6),
      gear,
      rpm,
      wrongWay: p.wrongWayT > 1 && this.phase === 'racing',
      finalLap: p.lap === this.cfg.laps - 1 && this.phase === 'racing',
      standings: order.map((c) => ({ name: c.name, color: c.color, isPlayer: c.isPlayer })),
      camera: this.camMode,
    }
  }

  private results(): RaceResult[] {
    const n = this.s.n
    const total = this.cfg.laps * n
    const rows = this.cars.map((c) => {
      if (c.finished) return { c, time: c.finishTime, estimated: false }
      const prog = Math.max(1, c.lap * n + c.idx)
      const avg = (prog * this.s.spacing) / Math.max(1, this.time)
      const remaining = (total - prog) * this.s.spacing
      return { c, time: this.time + remaining / Math.max(5, avg * 0.98), estimated: true }
    })
    rows.sort((a, b) => a.time - b.time)
    return rows.map((r, i) => ({
      position: i + 1,
      name: r.c.name,
      color: r.c.color,
      isPlayer: r.c.isPlayer,
      time: r.time,
      bestLap: r.c.bestLap,
      estimated: r.estimated,
    }))
  }

  dispose() {
    this.disposed = true
    this.renderer.setAnimationLoop(null)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.resizeObs.disconnect()
    for (const c of this.cars) {
      this.scene.remove(c.model.root)
      c.model.dispose()
    }
    this.world.dispose()
    this.audio.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
