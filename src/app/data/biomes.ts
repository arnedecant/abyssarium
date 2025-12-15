import type { BiomePreset } from '../types'

/**
 * Preset biome configurations
 */

export const BIOMES: Record<string, BiomePreset> = {
  abyssarium: {
    name: 'Abyssarium',
    backgroundColor: 0x000000,
    fogColor: 0x000000,
    fogDensity: 0.01,
    ambientLight: 1.2,
    directionalLight: {
      color: 0xffffff,
      intensity: 2.5,
      position: [5, 10, 5],
    },
    creatureSpeed: 1.0,
    creatureScale: 1.0,
  },
  void: {
    name: 'Void',
    backgroundColor: 0x000000,
    fogColor: 0x000000,
    fogDensity: 0.02,
    ambientLight: 1.0,
    directionalLight: {
      color: 0xffffff,
      intensity: 2.0,
      position: [0, 10, 0],
    },
    creatureSpeed: 0.7,
    creatureScale: 1.2,
  },
  eldritch: {
    name: 'Eldritch',
    backgroundColor: 0x000000,
    fogColor: 0x000000,
    fogDensity: 0.015,
    ambientLight: 1.1,
    directionalLight: {
      color: 0xffffff,
      intensity: 2.2,
      position: [-5, 8, -5],
    },
    creatureSpeed: 1.2,
    creatureScale: 0.9,
  },
}

export function getBiome(name: string): BiomePreset {
  return BIOMES[name] || BIOMES.abyssarium
}

