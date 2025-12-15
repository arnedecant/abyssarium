import * as THREE from 'three'
import type { BiomePreset } from '../types'
import type { AudioMood } from '../types'
import { lerp } from '../utils/helpers'
import Creature from './Creature'

/**
 * Main Three.js scene manager
 * Handles rendering, lighting, environment, and creatures
 */
export default class Scene {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private clock: THREE.Clock
  private creatures: Creature[] = []
  private biome: BiomePreset
  private ambientLight: THREE.AmbientLight
  private directionalLight: THREE.DirectionalLight
  private audioMood: AudioMood = {
    loudness: 0,
    lowBand: 0,
    midBand: 0,
    highBand: 0,
  }
  private presenceLevel = 0
  private lastWaveTime = 0
  private animationId: number | null = null

  constructor (container: HTMLElement, biome: BiomePreset) {
    this.container = container
    this.biome = biome
    this.clock = new THREE.Clock()

    // Setup scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(this.biome.backgroundColor)
    this.scene.fog = new THREE.FogExp2(
      this.biome.fogColor,
      this.biome.fogDensity
    )

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 0.5, 6)
    this.camera.lookAt(0, -0.5, 0)

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    // Setup lighting
    this.ambientLight = new THREE.AmbientLight(
      0xffffff,
      this.biome.ambientLight
    )
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(
      this.biome.directionalLight.color,
      this.biome.directionalLight.intensity
    )
    this.directionalLight.position.set(...this.biome.directionalLight.position)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 50
    this.directionalLight.shadow.camera.left = -20
    this.directionalLight.shadow.camera.right = 20
    this.directionalLight.shadow.camera.top = 20
    this.directionalLight.shadow.camera.bottom = -20
    this.scene.add(this.directionalLight)

    // Add hemisphere light for better overall illumination
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
    this.scene.add(hemisphereLight)

    // Add additional point lights for better model visibility
    const pointLight1 = new THREE.PointLight(0xffffff, 1.5, 50)
    pointLight1.position.set(0, 5, 0)
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xffffff, 1.0, 50)
    pointLight2.position.set(5, 3, 5)
    this.scene.add(pointLight2)

    const pointLight3 = new THREE.PointLight(0xffffff, 1.0, 50)
    pointLight3.position.set(-5, 3, -5)
    this.scene.add(pointLight3)

    // Add some environment geometry
    this.createEnvironment()

    // Handle resize
    window.addEventListener('resize', () => this.handleResize())
  }

  private createEnvironment (): void {
    // Add some ambient particles/atmosphere
    const particleCount = 100
    const particles = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 50
      positions[i + 1] = Math.random() * 20 - 5
      positions[i + 2] = (Math.random() - 0.5) * 50
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particleMaterial = new THREE.PointsMaterial({
      color: this.biome.directionalLight.color,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    })

    const particleSystem = new THREE.Points(particles, particleMaterial)
    this.scene.add(particleSystem)
  }

  /**
   * Add a creature to the scene
   */
  async addCreature (modelPath: string, animationNames?: string[]): Promise<Creature> {
    const creature = new Creature(this.scene, this.clock)
    creature.setScale(this.biome.creatureScale)
    creature.setBaseSpeed(this.biome.creatureSpeed)
    await creature.loadModel(modelPath)
    if (animationNames && animationNames.length > 0) {
      creature.playAnimations(animationNames)
    }
    this.creatures.push(creature)
    return creature
  }

  /**
   * Remove all creatures and add a new one
   */
  async replaceCreature (modelPath: string, animationNames?: string[]): Promise<Creature> {
    // Dispose all existing creatures
    this.creatures.forEach((creature) => creature.dispose())
    this.creatures = []
    // Add new creature
    return await this.addCreature(modelPath, animationNames)
  }

  /**
   * Update audio mood for reactive behavior
   */
  updateAudioMood (mood: AudioMood): void {
    this.audioMood = mood

    // Update environment based on audio
    const intensity = mood.loudness
    this.directionalLight.intensity = lerp(
      this.biome.directionalLight.intensity * 0.5,
      this.biome.directionalLight.intensity * 1.5,
      intensity
    )

    // Update fog density
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = lerp(
        this.biome.fogDensity,
        this.biome.fogDensity * 1.5,
        intensity * 0.3
      )
    }
  }

  /**
   * Update presence level
   */
  updatePresence (level: number): void {
    this.presenceLevel = level
  }

  /**
   * Handle wave gesture
   */
  handleWave (side: 'left' | 'right'): void {
    this.lastWaveTime = this.clock.getElapsedTime()
  }

  /**
   * Start the render loop
   */
  start (): void {
    this.animationId = requestAnimationFrame(this.start.bind(this))

    const deltaTime = this.clock.getDelta()
    const hasRecentWave = this.clock.getElapsedTime() - this.lastWaveTime < 2.0

    // Update creatures
    for (const creature of this.creatures) {
      creature.update(deltaTime, this.audioMood, this.presenceLevel, hasRecentWave)
    }

    // Gentle camera movement
    const time = this.clock.getElapsedTime()
    this.camera.position.x = Math.sin(time * 0.1) * 0.5
    this.camera.position.y = 0.5 + Math.sin(time * 0.05) * 0.2
    this.camera.position.z = 6 + Math.cos(time * 0.1) * 0.5
    this.camera.lookAt(0, -0.5, 0)

    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Stop the render loop
   */
  stop (): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * Change biome
   */
  setBiome (biome: BiomePreset): void {
    this.biome = biome
    this.scene.background = new THREE.Color(biome.backgroundColor)
    this.scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity)
    this.ambientLight.intensity = biome.ambientLight
    this.directionalLight.color.setHex(biome.directionalLight.color)
    this.directionalLight.intensity = biome.directionalLight.intensity
    this.directionalLight.position.set(...biome.directionalLight.position)

    // Update creatures
    this.creatures.forEach((creature) => {
      creature.setScale(biome.creatureScale)
      creature.setBaseSpeed(biome.creatureSpeed)
    })
  }

  private handleResize (): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  dispose (): void {
    this.stop()
    this.creatures.forEach((creature) => creature.dispose())
    this.creatures = []

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose())
        } else {
          child.material.dispose()
        }
      }
    })

    this.renderer.dispose()
    window.removeEventListener('resize', () => this.handleResize())
  }
}