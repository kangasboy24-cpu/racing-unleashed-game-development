export class RaceAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private engineGain: GainNode | null = null
  private osc1: OscillatorNode | null = null
  private osc2: OscillatorNode | null = null
  private filter: BiquadFilterNode | null = null
  private screechGain: GainNode | null = null
  private muted = false

  constructor(muted: boolean) {
    this.muted = muted
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = muted ? 0 : 0.5
      this.master.connect(this.ctx.destination)

      this.filter = this.ctx.createBiquadFilter()
      this.filter.type = 'lowpass'
      this.filter.frequency.value = 900
      this.engineGain = this.ctx.createGain()
      this.engineGain.gain.value = 0.12
      this.filter.connect(this.engineGain)
      this.engineGain.connect(this.master)

      this.osc1 = this.ctx.createOscillator()
      this.osc1.type = 'sawtooth'
      this.osc2 = this.ctx.createOscillator()
      this.osc2.type = 'square'
      const g2 = this.ctx.createGain()
      g2.gain.value = 0.35
      this.osc1.connect(this.filter)
      this.osc2.connect(g2)
      g2.connect(this.filter)
      this.osc1.start()
      this.osc2.start()

      const len = this.ctx.sampleRate
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      const noise = this.ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true
      const band = this.ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = 2400
      band.Q.value = 3
      this.screechGain = this.ctx.createGain()
      this.screechGain.gain.value = 0
      noise.connect(band)
      band.connect(this.screechGain)
      this.screechGain.connect(this.master)
      noise.start()
    } catch {
      this.ctx = null
    }
  }

  resume() {
    this.ctx?.resume().catch(() => {})
  }

  suspend() {
    this.ctx?.suspend().catch(() => {})
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05)
  }

  update(rpm: number, throttle: number, slip: number) {
    if (!this.ctx || !this.osc1 || !this.osc2 || !this.filter || !this.engineGain || !this.screechGain) return
    const t = this.ctx.currentTime
    const f = 55 + rpm * 230
    this.osc1.frequency.setTargetAtTime(f, t, 0.03)
    this.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.03)
    this.filter.frequency.setTargetAtTime(500 + rpm * 1800 + throttle * 600, t, 0.05)
    this.engineGain.gain.setTargetAtTime(0.07 + throttle * 0.07, t, 0.05)
    this.screechGain.gain.setTargetAtTime(Math.min(0.12, slip * 0.02), t, 0.05)
  }

  beep(freq: number, duration = 0.25) {
    if (!this.ctx || !this.master) return
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.value = 0.25
    g.gain.setTargetAtTime(0, this.ctx.currentTime + duration * 0.6, 0.05)
    o.connect(g)
    g.connect(this.master)
    o.start()
    o.stop(this.ctx.currentTime + duration + 0.2)
  }

  thud(strength: number) {
    if (!this.ctx || !this.master) return
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = 'triangle'
    o.frequency.value = 70
    o.frequency.setTargetAtTime(30, this.ctx.currentTime, 0.08)
    g.gain.value = Math.min(0.5, strength * 0.05)
    g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08)
    o.connect(g)
    g.connect(this.master)
    o.start()
    o.stop(this.ctx.currentTime + 0.4)
  }

  dispose() {
    this.ctx?.close().catch(() => {})
    this.ctx = null
  }
}
