export enum ModelType {
  Normal = 'normal',
  Flying = 'flying',
}

export interface ModelConfig {
  name: string;
  type: ModelType;
  animations: string[];
}

export const MODELS: ModelConfig[] = [
  {
    name: 'Alien.glb',
    type: ModelType.Normal,
    animations: [],
  },
  // {
  //   name: 'Alien-RRliSQBP7r.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  {
    name: 'Alpaking.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Alpaking Evolved.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Armabee.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Armabee Evolved.glb',
    type: ModelType.Flying,
    animations: [],
  },
  // {
  //   name: 'Birb.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  // {
  //   name: 'Blue Demon.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  // {
  //   name: 'Bunny.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  {
    name: 'Cactoro.glb',
    type: ModelType.Normal,
    animations: [],
  },
  // {
  //   name: 'Cactoro-IGn9lhdama.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  {
    name: 'Cat.glb',
    type: ModelType.Normal,
    animations: [],
  },
  {
    name: 'Chicken.glb',
    type: ModelType.Normal,
    animations: [],
  },
  {
    name: 'Demon.glb',
    type: ModelType.Flying,
    animations: [],
  },
  // {
  //   name: 'Demon-LnfIziKv4o.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  // {
  //   name: 'Dino.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  {
    name: 'Dragon.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Dragon Evolved.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Fish.glb',
    type: ModelType.Normal,
    animations: [],
  },
  // {
  //   name: 'Fish-ypEYhCImAB.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  // {
  //   name: 'Frog.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  {
    name: 'Ghost.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Ghost Skull.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Glub.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Glub Evolved.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Goleling.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Goleling Evolved.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Green Blob.glb',
    type: ModelType.Normal,
    animations: [],
  },
  {
    name: 'Green Spiky Blob.glb',
    type: ModelType.Normal,
    animations: [],
  },
  // {
  //   name: 'Haunter.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  {
    name: 'Hywirl.glb',
    type: ModelType.Flying,
    animations: [],
  },
  // {
  //   name: 'Monkroose.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  {
    name: 'Mushnub.glb',
    type: ModelType.Normal,
    animations: [],
  },
  {
    name: 'Mushnub Evolved.glb',
    type: ModelType.Normal,
    animations: [],
  },
  // {
  //   name: 'Mushroom King.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  {
    name: 'Ninja.glb',
    type: ModelType.Normal,
    animations: [],
  },
  // {
  //   name: 'Ninja-xGYmeDpfTu.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  // {
  //   name: 'Orc.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
  {
    name: 'Orc Enemy.glb',
    type: ModelType.Normal,
    animations: [],
  },
  {
    name: 'Pigeon.glb',
    type: ModelType.Normal,
    animations: [],
  },
  {
    name: 'Pink Blob.glb',
    type: ModelType.Normal,
    animations: [],
  },
  {
    name: 'Squidle.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Tribal.glb',
    type: ModelType.Flying,
    animations: [],
  },
  {
    name: 'Wizard.glb',
    type: ModelType.Normal,
    animations: [],
  },
  {
    name: 'Yeti.glb',
    type: ModelType.Normal,
    animations: [],
  },
  // {
  //   name: 'Yeti-ceRHrn8HHE.glb',
  //   type: ModelType.Normal,
  //   animations: [],
  // },
]

/**
 * Get all available model filenames
 */
export function getAvailableModels (): string[] {
  return Object.values(MODELS).map((model) => model.name)
}

/**
 * Get animations for a specific model
 */
export function getAnimationsForModel (modelName: string): string[] {
  return MODELS.find((model) => model.name === modelName)?.animations || []
}

/**
 * Get all models based on type
 */
export function getModelsByType (type: ModelType): string[] {
  return MODELS.filter((model) => model.type === type).map((model) => model.name)
}
