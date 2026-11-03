export type CarClassId = 'formula' | 'prototype' | 'stock'

export interface CarSpec {
  id: CarClassId
  name: string
  tagline: string
  topSpeed: number
  accel: number
  brake: number
  grip: number
  steer: number
  steerFalloff: number
  gears: number
  stats: { speed: number; accel: number; handling: number; braking: number }
}

export const CAR_SPECS: Record<CarClassId, CarSpec> = {
  formula: {
    id: 'formula',
    name: 'Formula Open-Wheeler',
    tagline: 'Featherweight, huge downforce, razor-sharp',
    topSpeed: 94,
    accel: 19,
    brake: 40,
    grip: 36,
    steer: 2.7,
    steerFalloff: 34,
    gears: 8,
    stats: { speed: 4, accel: 5, handling: 5, braking: 5 },
  },
  prototype: {
    id: 'prototype',
    name: 'Endurance Prototype',
    tagline: 'Slippery, stable, the fastest in a straight line',
    topSpeed: 97,
    accel: 15,
    brake: 34,
    grip: 30,
    steer: 2.5,
    steerFalloff: 36,
    gears: 7,
    stats: { speed: 5, accel: 4, handling: 4, braking: 4 },
  },
  stock: {
    id: 'stock',
    name: 'V8 Stock Car',
    tagline: 'Heavy, loud and made for banging doors',
    topSpeed: 90,
    accel: 13,
    brake: 27,
    grip: 25,
    steer: 2.4,
    steerFalloff: 38,
    gears: 5,
    stats: { speed: 4, accel: 3, handling: 3, braking: 3 },
  },
}

export const PLAYER_COLORS = ['#ff3d00', '#ffd400', '#00c2ff', '#00e676', '#e040fb', '#f5f5f5']

export const AI_DRIVERS = [
  { name: 'A. Kovač', color: '#1e88e5' },
  { name: 'L. Moreau', color: '#43a047' },
  { name: 'J. Takeda', color: '#fdd835' },
  { name: 'T. Okafor', color: '#8e24aa' },
  { name: 'K. Lindqvist', color: '#00acc1' },
  { name: 'C. Reyes', color: '#f4511e' },
  { name: 'H. Fischer', color: '#eeeeee' },
  { name: 'M. Varga', color: '#d81b60' },
  { name: 'P. Haldane', color: '#7cb342' },
  { name: 'R. Castellano', color: '#3949ab' },
  { name: 'B. Brandt', color: '#ffb300' },
]

export type Difficulty = 'rookie' | 'pro' | 'legend'

export const DIFFICULTY: Record<Difficulty, { label: string; skill: [number, number] }> = {
  rookie: { label: 'Rookie', skill: [0.8, 0.87] },
  pro: { label: 'Pro', skill: [0.88, 0.95] },
  legend: { label: 'Legend', skill: [0.95, 1.01] },
}
