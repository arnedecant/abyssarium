/**
 * Model and animation configuration
 * Keys are model filenames (without path), values are arrays of animation names
 */
export const MODEL_ANIMATIONS: Record<string, string[]> = {
  'Alien.glb': [],
  'Alien-RRliSQBP7r.glb': [],
  'Alpaking.glb': [],
  'Alpaking Evolved.glb': [],
  'Armabee.glb': [],
  'Armabee Evolved.glb': [],
  'Birb.glb': [],
  'Blue Demon.glb': [],
  'Bunny.glb': [],
  'Cactoro.glb': [],
  'Cactoro-IGn9lhdama.glb': [],
  'Cat.glb': [],
  'Chicken.glb': [],
  'Demon.glb': [],
  'Demon-LnfIziKv4o.glb': [],
  'Dino.glb': [],
  'Dragon.glb': [],
  'Dragon Evolved.glb': [],
  'Fish.glb': [],
  'Fish-ypEYhCImAB.glb': [],
  'Frog.glb': [],
  'Ghost.glb': [],
  'Ghost Skull.glb': [],
  'Glub.glb': [],
  'Glub Evolved.glb': [],
  'Goleling.glb': [],
  'Goleling Evolved.glb': [],
  'Green Blob.glb': [],
  'Green Spiky Blob.glb': [],
  // 'Haunter.glb': [],
  'Hywirl.glb': [],
  'Monkroose.glb': [],
  'Mushnub.glb': [],
  'Mushnub Evolved.glb': [],
  'Mushroom King.glb': [],
  'Ninja.glb': [],
  'Ninja-xGYmeDpfTu.glb': [],
  'Orc.glb': [],
  'Orc Enemy.glb': [],
  'Pigeon.glb': [],
  'Pink Blob.glb': [],
  'Squidle.glb': [],
  'Tribal.glb': [],
  'Wizard.glb': [],
  'Yeti.glb': [],
  'Yeti-ceRHrn8HHE.glb': [],
}

/**
 * Get all available model filenames
 */
export function getAvailableModels(): string[] {
  return Object.keys(MODEL_ANIMATIONS)
}

/**
 * Get animations for a specific model
 */
export function getAnimationsForModel(modelName: string): string[] {
  return MODEL_ANIMATIONS[modelName] || []
}

