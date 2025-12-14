/**
 * Type definitions for Abyssarium
 */

export type GestureEvent =
  | { type: 'wave'; side: 'left' | 'right' }
  | { type: 'presence'; level: number } // 0-1

export type CreatureState = 'idle' | 'curious' | 'playful' | 'startled';

export interface BiomePreset {
  name: string;
  backgroundColor: number;
  fogColor: number;
  fogDensity: number;
  ambientLight: number;
  directionalLight: {
    color: number;
    intensity: number;
    position: [number, number, number];
  };
  creatureSpeed: number;
  creatureScale: number;
}

export interface AudioMood {
  loudness: number; // 0-1
  lowBand: number; // 0-1
  midBand: number; // 0-1
  highBand: number; // 0-1
}

