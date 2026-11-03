import * as THREE from 'three'
import type { CarClassId } from './cars'

export interface CarModel {
  root: THREE.Group
  body: THREE.Group
  wheels: THREE.Object3D[]
  frontPivots: THREE.Group[]
  brakeLights: THREE.MeshStandardMaterial
  dispose: () => void
}

const shared = new Map<string, THREE.BufferGeometry>()
function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = shared.get(key)
  if (!g) {
    g = make()
    shared.set(key, g)
  }
  return g
}
const box = (w: number, h: number, d: number) => geo(`b${w}-${h}-${d}`, () => new THREE.BoxGeometry(w, h, d))

function numberTexture(num: number, color: string) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(64, 64, 52, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111111'
  ctx.font = 'italic 900 64px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(num), 64, 68)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function buildCar(kind: CarClassId, color: string, number: number): CarModel {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.32 })
  const carbon = new THREE.MeshStandardMaterial({ color: '#141518', metalness: 0.3, roughness: 0.55 })
  const glass = new THREE.MeshStandardMaterial({ color: '#0f1724', metalness: 0.8, roughness: 0.15 })
  const tyre = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.85 })
  const rim = new THREE.MeshStandardMaterial({ color: '#b8bcc4', metalness: 0.9, roughness: 0.3 })
  const brakeLights = new THREE.MeshStandardMaterial({ color: '#550000', emissive: '#ff1a1a', emissiveIntensity: 0.4 })
  const headLights = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6d8', emissiveIntensity: 1.2 })
  const numTex = numberTexture(number, color)
  const numMat = new THREE.MeshStandardMaterial({ map: numTex, roughness: 0.4 })
  const mats = [paint, carbon, glass, tyre, rim, brakeLights, headLights, numMat]

  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0) => {
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(x, y, z)
    mesh.rotation.x = rx
    mesh.castShadow = true
    body.add(mesh)
    return mesh
  }

  const wheels: THREE.Object3D[] = []
  const frontPivots: THREE.Group[] = []
  const addWheel = (x: number, z: number, r: number, w: number, front: boolean) => {
    const pivot = new THREE.Group()
    pivot.position.set(x, r, z)
    const wheel = new THREE.Group()
    const t = new THREE.Mesh(geo(`t${r}-${w}`, () => new THREE.CylinderGeometry(r, r, w, 18).rotateZ(Math.PI / 2)), tyre)
    const rm = new THREE.Mesh(
      geo(`r${r}-${w}`, () => new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 10).rotateZ(Math.PI / 2)),
      rim,
    )
    t.castShadow = true
    wheel.add(t, rm)
    pivot.add(wheel)
    root.add(pivot)
    wheels.push(wheel)
    if (front) frontPivots.push(pivot)
  }

  if (kind === 'formula') {
    add(box(0.72, 0.5, 3.0), paint, 0, 0.45, 0.2)
    add(box(0.34, 0.24, 1.5), paint, 0, 0.36, 2.35, 0.06)
    add(box(1.95, 0.05, 0.5), carbon, 0, 0.12, 2.95)
    add(box(0.05, 0.22, 0.55), paint, 0.97, 0.2, 2.95)
    add(box(0.05, 0.22, 0.55), paint, -0.97, 0.2, 2.95)
    add(box(0.5, 0.42, 1.7), paint, 0.58, 0.38, -0.15)
    add(box(0.5, 0.42, 1.7), paint, -0.58, 0.38, -0.15)
    add(box(0.46, 0.5, 1.7), paint, 0, 0.82, -0.75)
    add(box(0.3, 0.25, 0.5), carbon, 0, 1.0, 0.1)
    add(box(1.3, 0.08, 0.42), paint, 0, 1.0, -2.25)
    add(box(1.3, 0.06, 0.3), carbon, 0, 0.82, -2.2)
    add(box(0.05, 0.6, 0.6), carbon, 0.66, 0.78, -2.2)
    add(box(0.05, 0.6, 0.6), carbon, -0.66, 0.78, -2.2)
    add(box(0.12, 0.55, 0.12), carbon, 0, 0.65, -2.05)
    add(box(0.5, 0.18, 0.08), brakeLights, 0, 0.5, -2.52)
    const helmet = new THREE.Mesh(
      geo('helmet', () => new THREE.SphereGeometry(0.19, 14, 10)),
      new THREE.MeshStandardMaterial({ color: '#f5f5f5', metalness: 0.3, roughness: 0.3 }),
    )
    mats.push(helmet.material as THREE.Material)
    helmet.position.set(0, 0.86, 0.45)
    body.add(helmet)
    const plate = add(geo('plate', () => new THREE.PlaneGeometry(0.32, 0.32)), numMat, 0, 0.49, 1.95)
    plate.rotation.x = -Math.PI / 2 + 0.06
    addWheel(0.86, 1.7, 0.33, 0.36, true)
    addWheel(-0.86, 1.7, 0.33, 0.36, true)
    addWheel(0.84, -1.6, 0.37, 0.46, false)
    addWheel(-0.84, -1.6, 0.37, 0.46, false)
  } else if (kind === 'prototype') {
    add(box(1.95, 0.5, 4.5), paint, 0, 0.48, 0)
    add(box(1.9, 0.26, 1.1), paint, 0, 0.42, 2.45, 0.22)
    add(box(1.0, 0.45, 1.7), glass, 0, 0.95, 0.35)
    add(box(1.02, 0.08, 1.2), paint, 0, 1.2, 0.2)
    add(box(0.06, 0.45, 1.6), paint, 0, 1.0, -1.25)
    add(box(1.95, 0.07, 0.45), carbon, 0, 1.18, -2.15)
    add(box(0.06, 0.5, 0.5), carbon, 0.95, 0.95, -2.15)
    add(box(0.06, 0.5, 0.5), carbon, -0.95, 0.95, -2.15)
    add(box(1.6, 0.1, 0.06), brakeLights, 0, 0.62, -2.26)
    add(box(0.4, 0.08, 0.06), headLights, 0.6, 0.5, 2.95)
    add(box(0.4, 0.08, 0.06), headLights, -0.6, 0.5, 2.95)
    const plate = add(geo('plate2', () => new THREE.PlaneGeometry(0.5, 0.5)), numMat, 0.99, 0.6, -0.6)
    plate.rotation.y = Math.PI / 2
    const plate2 = add(geo('plate2', () => new THREE.PlaneGeometry(0.5, 0.5)), numMat, -0.99, 0.6, -0.6)
    plate2.rotation.y = -Math.PI / 2
    addWheel(0.86, 1.6, 0.36, 0.34, true)
    addWheel(-0.86, 1.6, 0.36, 0.34, true)
    addWheel(0.86, -1.45, 0.37, 0.38, false)
    addWheel(-0.86, -1.45, 0.37, 0.38, false)
  } else {
    add(box(1.92, 0.62, 4.9), paint, 0, 0.62, 0)
    add(box(1.62, 0.44, 2.1), glass, 0, 1.13, -0.35)
    add(box(1.56, 0.08, 1.7), paint, 0, 1.38, -0.4)
    add(box(1.8, 0.28, 0.08), carbon, 0, 1.05, -2.42)
    add(box(1.7, 0.14, 0.06), brakeLights, 0, 0.78, -2.46)
    add(box(0.42, 0.12, 0.06), headLights, 0.62, 0.72, 2.46)
    add(box(0.42, 0.12, 0.06), headLights, -0.62, 0.72, 2.46)
    add(box(1.9, 0.18, 0.2), carbon, 0, 0.34, 2.48)
    const roof = add(geo('plate3', () => new THREE.PlaneGeometry(1.0, 1.0)), numMat, 0, 1.43, -0.4)
    roof.rotation.x = -Math.PI / 2
    for (const sx of [1, -1]) {
      const door = add(geo('plate4', () => new THREE.PlaneGeometry(0.8, 0.8)), numMat, sx * 0.97, 0.7, 0.2)
      door.rotation.y = (sx * Math.PI) / 2
    }
    addWheel(0.86, 1.5, 0.34, 0.32, true)
    addWheel(-0.86, 1.5, 0.34, 0.32, true)
    addWheel(0.86, -1.5, 0.34, 0.32, false)
    addWheel(-0.86, -1.5, 0.34, 0.32, false)
  }

  return {
    root,
    body,
    wheels,
    frontPivots,
    brakeLights,
    dispose: () => {
      mats.forEach((m) => m.dispose())
      numTex.dispose()
    },
  }
}
