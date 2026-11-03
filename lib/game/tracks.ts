import type { CarClassId } from './cars'

export type SkyMode = 'day' | 'sunset' | 'night'
export type Scenery = 'city' | 'forest' | 'parkland' | 'coastal' | 'mountain'

export interface TrackTheme {
  sky: SkyMode
  grass: string
  fog: string
  wall: string
  wallAccent: string
  scenery: Scenery
  trees: number
  buildings: number
  water?: 'south' | 'east'
  hills?: boolean
}

export interface TrackDef {
  id: string
  name: string
  location: string
  category: 'Grand Prix' | 'Superspeedway' | 'Endurance' | 'Mountain'
  description: string
  laps: number
  width: number
  runoff: number
  scale: number
  banking?: number
  recommendedCar: CarClassId
  /** Control points as [x, z, elevation] in track units (x/z are multiplied by scale). */
  points: number[][]
  theme: TrackTheme
}

export const TRACKS: TrackDef[] = [
  {
    id: 'azure-harbour',
    name: 'Azure Harbour Street Circuit',
    location: 'Coastal Principality',
    category: 'Grand Prix',
    description:
      'Narrow streets, a casino climb, a famous slow hairpin and a tunnel run along the harbour. One mistake and you are in the wall.',
    laps: 3,
    width: 11,
    runoff: 1.5,
    scale: 9,
    recommendedCar: 'formula',
    points: [
      [0, 0, 0], [12, -0.5, 0], [22, -1, 0], [27, -4, 1], [29, -9, 3], [33, -15, 6], [39, -21, 9],
      [45, -25, 11], [50, -26, 12], [54, -24, 12], [57, -20, 11], [61, -15, 9], [64, -10, 7],
      [63, -6, 6], [60, -3, 5], [57, 0, 4], [55, 3, 3], [57, 6, 2], [61, 7, 1.5], [66, 8, 1],
      [68, 11, 0.5], [64, 14, 0], [54, 16, 0], [42, 17, 0], [32, 16.5, 0], [26, 15, 0], [23, 13, 0],
      [18, 13.5, 0], [13, 13, 0], [9, 15, 0], [5, 14, 0], [1, 15.5, 0], [-4, 16, 0], [-7, 13, 0],
      [-8, 9, 0], [-6, 4, 0], [-3, 1, 0],
    ],
    theme: {
      sky: 'day', grass: '#5c7a3a', fog: '#cfe3f2', wall: '#e8e8e8', wallAccent: '#c8102e',
      scenery: 'city', trees: 40, buildings: 260, water: 'south',
    },
  },
  {
    id: 'copperfield',
    name: 'Copperfield Airfield Circuit',
    location: 'Old Airbase, Northlands',
    category: 'Grand Prix',
    description:
      'A former wartime airfield with blisteringly fast sweepers. Commit through the high-speed esses and carry speed down the long hangar straight.',
    laps: 3,
    width: 15,
    runoff: 10,
    scale: 13,
    recommendedCar: 'formula',
    points: [
      [0, 0], [10, 0], [18, 2], [22, 6], [23, 10], [26, 13], [24, 16], [27, 19], [25, 22], [20, 30],
      [14, 38], [10, 42], [4, 43], [0, 43], [-2, 41.5], [-4, 43], [-8, 43], [-11, 40], [-12, 35],
      [-12, 30], [-10, 27], [-13, 24], [-16, 18], [-17, 10], [-18, 6], [-21, 4], [-24, 2], [-23, -1],
      [-19, -0.5], [-10, 0],
    ],
    theme: {
      sky: 'day', grass: '#4f7f34', fog: '#d6dde4', wall: '#3a4a5c', wallAccent: '#f5f5f5',
      scenery: 'parkland', trees: 260, buildings: 12,
    },
  },
  {
    id: 'royal-parkland',
    name: 'Royal Parkland Autodromo',
    location: 'Royal Gardens, Lombard Valley',
    category: 'Grand Prix',
    description:
      'The cathedral of speed. Huge straights through an ancient park, tight chicanes and a long final sweeper where top speed is everything.',
    laps: 3,
    width: 15,
    runoff: 10,
    scale: 14,
    recommendedCar: 'formula',
    points: [
      [0, 0], [10, 0], [20, 0], [24.5, 0.4], [25.5, 1.8], [27.5, 2.2], [28.5, 1.2], [31, 1.2], [36, 2],
      [41, 4.5], [44, 8], [45, 11], [46.5, 12.5], [46.5, 14], [46, 15.5], [45.5, 18], [43.5, 20],
      [40.5, 21.5], [37, 22], [28, 22.5], [20, 23], [16, 23], [14, 24.5], [11.5, 24.5], [9, 23.5],
      [6, 23.5], [-4, 23.5], [-10, 23], [-15, 21.5], [-18.5, 17], [-19, 11], [-17, 5], [-13, 1.5], [-8, 0.2],
    ],
    theme: {
      sky: 'day', grass: '#46702e', fog: '#d9e4d0', wall: '#2f6b3a', wallAccent: '#f4f1e8',
      scenery: 'forest', trees: 520, buildings: 0, hills: true,
    },
  },
  {
    id: 'red-water',
    name: 'Red Water Ring',
    location: 'Forest Valley Highlands',
    category: 'Grand Prix',
    description:
      'A legendary forest roller-coaster. Plunge down to the Red Water compression, blast up the hill and survive the unpredictable valley weather.',
    laps: 2,
    width: 14,
    runoff: 9,
    scale: 14,
    recommendedCar: 'formula',
    points: [
      [0, 8, 9.5], [0, 2, 10], [0.5, -2, 10], [2.5, -3.5, 10], [4.5, -2, 9.5], [4.5, 2, 7], [4.2, 7, 3],
      [4, 10.5, 0], [2.8, 12.5, 2], [4.2, 14.5, 6], [6.5, 16, 10], [12, 20.5, 14], [18, 25.5, 17],
      [22, 28, 18.5], [24, 29.5, 19], [25.5, 31.5, 19], [27, 32, 19], [29, 34, 18], [31, 36.5, 16],
      [31, 39, 14], [28.5, 39.8, 13], [25, 40, 12], [22.5, 42, 10], [22, 45, 8], [23, 48.5, 6],
      [26, 50.5, 4], [30, 52, 3], [34, 54, 2], [36.5, 57, 1], [35, 60, 0.5], [30, 61.5, 1], [22, 61, 2],
      [14, 58, 3], [7, 52, 4.5], [2.5, 44, 6], [-1, 34, 7], [-2.5, 25, 8], [-3, 20, 8.5], [-2, 18, 9],
      [-0.5, 17, 9], [0, 14, 9.2],
    ],
    theme: {
      sky: 'day', grass: '#3f6b2c', fog: '#c9d3d8', wall: '#d9d9d9', wallAccent: '#1f4fa3',
      scenery: 'forest', trees: 900, buildings: 0, hills: true,
    },
  },
  {
    id: 'neon-bay',
    name: 'Neon Bay Night Circuit',
    location: 'Island City-State',
    category: 'Grand Prix',
    description:
      'Racing under floodlights between skyscrapers. Endless 90-degree corners and walls that never forgive. The ultimate night challenge.',
    laps: 3,
    width: 12,
    runoff: 2,
    scale: 10,
    recommendedCar: 'formula',
    points: [
      [0, 0], [15, 0], [19, 1], [20, 5], [20, 12], [22, 15], [28, 15], [33, 16], [35, 20], [35, 28],
      [32, 31], [24, 31], [20, 29], [16, 31], [10, 31], [6, 29], [6, 25], [9, 22], [9, 18], [5, 15],
      [0, 15], [-4, 13], [-5, 8], [-4, 3],
    ],
    theme: {
      sky: 'night', grass: '#1f2a22', fog: '#0b0f1e', wall: '#1d2233', wallAccent: '#ff2bd6',
      scenery: 'city', trees: 30, buildings: 320, water: 'east',
    },
  },
  {
    id: 'sunshine-speedway',
    name: 'Sunshine Coast Superspeedway',
    location: 'Sunshine Coast, Florida-style Beachfront',
    category: 'Superspeedway',
    description:
      'A colossal tri-oval with steep banking. Flat out, door to door, bumper to bumper. Draft, dive low and hold your nerve on the last lap.',
    laps: 5,
    width: 22,
    runoff: 4,
    scale: 16,
    banking: 0.5,
    recommendedCar: 'stock',
    points: [
      [0, -3], [12, -1.5], [22, 0], [30, 1], [37, 4], [41, 9], [42, 15], [41, 21], [37, 26], [30, 29],
      [22, 30], [0, 30], [-22, 30], [-30, 29], [-37, 26], [-41, 21], [-42, 15], [-41, 9], [-37, 4],
      [-30, 1], [-22, 0], [-12, -1.5],
    ],
    theme: {
      sky: 'day', grass: '#5d8a3a', fog: '#dbeaf5', wall: '#f2f2f2', wallAccent: '#1565c0',
      scenery: 'coastal', trees: 140, buildings: 30,
    },
  },
  {
    id: 'les-plaines',
    name: 'Les Plaines 24H Circuit',
    location: 'Western Countryside',
    category: 'Endurance',
    description:
      'Half public road, half race track. The enormous straight through the countryside is broken by two chicanes before the brutal right-hander.',
    laps: 3,
    width: 14,
    runoff: 9,
    scale: 20,
    recommendedCar: 'prototype',
    points: [
      [0, 0], [0, -6], [0.6, -9], [2, -10.5], [3.2, -12.2], [4.8, -12.4], [6, -11.5], [12, -8],
      [20, -3.5], [23, -1.8], [24.3, -0.4], [25.5, -0.8], [27, 0], [33, 3.5], [36, 5], [37.3, 6.4],
      [38.5, 6.2], [40, 7], [48, 11.5], [54, 15], [56, 16.5], [56, 18], [54, 18.5], [48, 19.5],
      [42, 21], [40, 21.8], [37, 23.5], [35, 23.6], [33, 23.2], [32.5, 21.5], [28, 18], [22, 15],
      [18, 13], [15, 14], [12, 12], [9, 12.5], [6, 10], [4, 8.5], [2.5, 8.2], [1.5, 6.5], [0.5, 5.5],
      [0, 3.5],
    ],
    theme: {
      sky: 'sunset', grass: '#5a7a34', fog: '#f0c8a0', wall: '#e9e9e9', wallAccent: '#2e7d32',
      scenery: 'parkland', trees: 700, buildings: 25, hills: true,
    },
  },
  {
    id: 'summit-mountain',
    name: 'Summit Mountain Raceway',
    location: 'Highland Ranges, Down Under',
    category: 'Mountain',
    description:
      'A public mountain road turned race track. Climb steeply to the summit, thread the blind esses at the top, then plunge down the fearsome straight.',
    laps: 3,
    width: 12,
    runoff: 2.5,
    scale: 14,
    recommendedCar: 'stock',
    points: [
      [3, 7, 0], [10, 3.5, 0], [16, 0.8, 0], [21, -0.5, 0.5], [23.5, -2.5, 1], [24.3, -5, 2],
      [25.5, -14, 8], [27, -20, 14], [28.5, -22.5, 16], [28.5, -25, 19], [27, -27, 23], [24.5, -27.5, 26],
      [21, -29.5, 30], [17, -30, 33], [13, -31, 35], [9, -33, 37], [5, -33.5, 38], [2, -32.5, 38],
      [0.5, -30, 36], [2, -27.5, 33], [0, -25, 30], [-1, -22.5, 27], [-2.5, -20, 25], [-5, -19.5, 24],
      [-6.5, -17.5, 22], [-7, -10, 15], [-7.5, -4, 10], [-7.6, 0, 7], [-7, 2.5, 5], [-8.2, 4.5, 3.5],
      [-7.5, 6.5, 2], [-6.5, 8.5, 1], [-4, 9.5, 0.5], [-1, 8.5, 0],
    ],
    theme: {
      sky: 'day', grass: '#6b7f3a', fog: '#e3dccb', wall: '#efefef', wallAccent: '#d84315',
      scenery: 'mountain', trees: 650, buildings: 10, hills: true,
    },
  },
]

export function getTrack(id: string) {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0]
}
