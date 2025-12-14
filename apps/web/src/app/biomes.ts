import type { BiomePreset } from './types'

/**
 * Preset biome configurations
 */

export const BIOMES: Record<string, BiomePreset> = {
  abyssarium: {
    name: 'Abyssarium',
    backgroundColor: 0x001122,
    fogColor: 0x001122,
    fogDensity: 0.02,
    ambientLight: 0.3,
    directionalLight: {
      color: 0x4488ff,
      intensity: 0.8,
      position: [5, 10, 5],
    },
    creatureSpeed: 1.0,
    creatureScale: 1.0,
  },
  void: {
    name: 'Void',
    backgroundColor: 0x000000,
    fogColor: 0x110011,
    fogDensity: 0.05,
    ambientLight: 0.1,
    directionalLight: {
      color: 0x9900ff,
      intensity: 0.5,
      position: [0, 10, 0],
    },
    creatureSpeed: 0.7,
    creatureScale: 1.2,
  },
  eldritch: {
    name: 'Eldritch',
    backgroundColor: 0x1a001a,
    fogColor: 0x330033,
    fogDensity: 0.03,
    ambientLight: 0.2,
    directionalLight: {
      color: 0xff0088,
      intensity: 0.6,
      position: [-5, 8, -5],
    },
    creatureSpeed: 1.2,
    creatureScale: 0.9,
  },
}

export function getBiome(name: string): BiomePreset {
  return BIOMES[name] || BIOMES.abyssarium
}

