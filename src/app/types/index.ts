export enum ModelType {
  Normal = 'normal',
  Head = 'head',
  Flying = 'flying',
}

export interface ModelConfig {
  id: string
  name: string
  model: string
  type: ModelType
  animations: string[]
}

type GestureType = 'wave' | 'nod_yes' | 'nod_no' | 'punch'

export interface GestureEvent {
  type: GestureType
  side?: 'left' | 'right'
  strength?: number
  confidence: number
  timestamp: number
}

export type CreatureState = 'idle' | 'curious' | 'playful' | 'startled';

export interface BiomePreset {
  name: string
  backgroundColor: number
  fogColor: number
  fogDensity: number
  ambientLight: number
  directionalLight: {
    color: number
    intensity: number
    position: [number, number, number]
  };
  creatureSpeed: number
  creatureScale: number
}

export interface AudioMood {
  loudness: number // 0-1
  lowBand: number // 0-1
  midBand: number // 0-1
  highBand: number // 0-1
}

