import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { CreatureState, AudioMood } from '../types'
import { lerp } from '../utils/helpers'
import Terminal from './Terminal'

/**
 * Represents a creature in the Abyssarium
 * Handles loading, animation, and behavior state machine
 */
export default class Creature {
  private scene: THREE.Scene
  private model: THREE.Group | null = null
  private mixer: THREE.AnimationMixer | null = null
  private clock: THREE.Clock
  private state: CreatureState = 'idle'
  private targetPosition = new THREE.Vector3()
  private currentPosition = new THREE.Vector3()
  private scale = 1.0
  private audioMood: AudioMood = {
    loudness: 0,
    lowBand: 0,
    midBand: 0,
    highBand: 0,
  }
  private availableAnimations: THREE.AnimationClip[] = []
  private currentAnimationActions: THREE.AnimationAction[] = []
  
  // Gesture animation state
  private gestureAnimationAction: THREE.AnimationAction | null = null
  private idleAnimationNames: string[] = []
  private isPlayingGesture = false

  constructor(scene: THREE.Scene, clock: THREE.Clock) {
    this.scene = scene
    this.clock = clock
    Terminal.log('clock', this.clock)
  }

  /**
   * Load a creature model from a GLB file
   */
  async loadModel (path: string): Promise<void> {
    try {
      const loader = new GLTFLoader()
      const gltf = await loader.loadAsync(path)

      gltf.scene.traverse((mesh) => {
        if (!(mesh instanceof THREE.Mesh)) return
        mesh.material.color.multiplyScalar(2.5)
        // mesh.material.emissive.set('#b066ff')
        mesh.material.emissiveIntensity = 0.8
        mesh.material.roughness = 0.6
        mesh.material.metalness = 0.5
      })

      this.model = gltf.scene
      this.model.scale.set(this.scale, this.scale, this.scale)
      this.scene.add(this.model)

      // Store available animations
      this.availableAnimations = gltf.animations || []

      // Setup animations
      if (this.availableAnimations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model)
        // Find and store idle animations
        this.idleAnimationNames = this.availableAnimations
          .filter((clip) => clip.name.toLowerCase().includes('idle'))
          .map((clip) => clip.name)
        
        // Play idle animation by default if it exists, otherwise play all animations
        if (this.idleAnimationNames.length > 0) {
          this.playAnimations(this.idleAnimationNames)
        } else {
          // Fallback: play all animations if no idle found
          this.playAnimations()
        }
      }

      // Set initial position to center (for hologram display)
      this.currentPosition.set(0, -1, 0)
      this.targetPosition.copy(this.currentPosition)
      if (this.model) {
        this.model.position.copy(this.currentPosition)
      }
    } catch (error) {
      Terminal.error('Error loading creature model:', error)
      Terminal.error('Attempted path:', path)
      // Create a placeholder if model fails to load
      this.createPlaceholder()
    }
  }

  /**
   * Create a simple placeholder geometry if model loading fails
   */
  private createPlaceholder (): void {
    const geometry = new THREE.OctahedronGeometry(1, 0)
    const material = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.5,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true

    this.model = new THREE.Group()
    this.model.add(mesh)
    this.model.scale.set(this.scale, this.scale, this.scale)
    this.scene.add(this.model)

    // Keep centered for hologram display
    this.currentPosition.set(0, -1, 0)
    this.targetPosition.copy(this.currentPosition)
    this.model.position.copy(this.currentPosition)
  }

  /**
   * Update creature state machine and behavior
   */
  update (deltaTime: number, audioMood: AudioMood, presenceLevel: number, hasRecentWave: boolean): void {
    this.audioMood = audioMood

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(deltaTime)
    }

    // Determine new state based on inputs
    let newState: CreatureState = this.state

    if (hasRecentWave || audioMood.loudness > 0.7) {
      newState = 'startled'
    } else if (presenceLevel > 0.5 || audioMood.loudness > 0.3) {
      newState = 'curious'
    } else if (presenceLevel > 0.2 || audioMood.loudness > 0.1) {
      newState = 'playful'
    } else {
      newState = 'idle'
    }

    // Transition to new state
    if (newState !== this.state) {
      this.transitionToState(newState)
    }

    // Update behavior based on current state
    this.updateBehavior(deltaTime)

    // Update position
    this.updatePosition(deltaTime)
  }

  private transitionToState (newState: CreatureState): void {
    this.state = newState

    // Adjust speed based on state
    // switch (this.state) {
    //   case 'idle':
    //     this.currentSpeed = this.baseSpeed * 0.3
    //     break
    //   case 'curious':
    //     this.currentSpeed = this.baseSpeed * 0.6
    //     break
    //   case 'playful':
    //     this.currentSpeed = this.baseSpeed * 1.2
    //     break
    //   case 'startled':
    //     this.currentSpeed = this.baseSpeed * 2.0
    //     break
    // }
  }

  private updateBehavior (_deltaTime: number): void {
    if (!this.model) return

    // Character stays still for hologram display
    // Only update visual effects based on audio/state

    // Emissive glow based on audio
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const intensity = lerp(0.3, 1.0, this.audioMood.loudness)
        child.material.emissiveIntensity = intensity
      }
    })

    // Check if gesture animation has completed
    this.checkGestureAnimationComplete()
  }

  /**
   * Check if the current gesture animation has finished and return to idle
   */
  private checkGestureAnimationComplete (): void {
    if (!this.isPlayingGesture || !this.gestureAnimationAction) return

    // Check if animation has finished (time >= duration)
    if (this.gestureAnimationAction.time >= this.gestureAnimationAction.getClip().duration) {
      // Animation complete, return to idle
      this.returnToIdle()
    }
  }

  /**
   * Play a gesture animation, ensuring it completes before allowing new animations
   */
  private playGestureAnimation (animationClip: THREE.AnimationClip): void {
    if (!this.mixer || this.isPlayingGesture) {
      // Already playing a gesture, ignore new request
      return
    }

    // Stop current idle animations
    this.currentAnimationActions.forEach((action) => action.stop())
    this.currentAnimationActions = []

    // Play the gesture animation
    this.gestureAnimationAction = this.mixer.clipAction(animationClip)
    this.gestureAnimationAction.reset()
    this.gestureAnimationAction.setLoop(THREE.LoopOnce, 1) // Play once
    this.gestureAnimationAction.clampWhenFinished = true // Hold last frame
    this.gestureAnimationAction.play()
    this.isPlayingGesture = true

    Terminal.log(`Playing gesture animation: ${animationClip.name}`)
  }

  /**
   * Return to idle animations after gesture completes
   */
  private returnToIdle (): void {
    if (this.gestureAnimationAction) {
      this.gestureAnimationAction.stop()
      this.gestureAnimationAction = null
    }
    this.isPlayingGesture = false

    // Resume idle animations
    if (this.idleAnimationNames.length > 0) {
      this.playAnimations(this.idleAnimationNames)
    } else {
      // Fallback: play all animations if no idle found
      this.playAnimations()
    }
  }

  /**
   * Trigger a head nod animation (yes - up/down)
   * Uses built-in animation if available, otherwise does nothing
   */
  nodYes (): void {
    // Search for "yes" or "nod" animations (but exclude "no")
    const yesAnimation = this.availableAnimations.find((clip) => {
      const name = clip.name.toLowerCase()
      return (name.includes('yes') || name.includes('nod')) && !name.includes('no')
    })
    
    if (yesAnimation) {
      this.playGestureAnimation(yesAnimation)
    } else {
      Terminal.debug('No "yes" animation found in model')
    }
  }

  /**
   * Trigger a head shake animation (no - left/right)
   * Uses built-in animation if available, otherwise does nothing
   */
  nodNo (): void {
    // Search for "no" or "shake" animations
    const noAnimation = this.availableAnimations.find((clip) => {
      const name = clip.name.toLowerCase()
      return name.includes('no') || name.includes('shake')
    })
    
    if (noAnimation) {
      this.playGestureAnimation(noAnimation)
    } else {
      Terminal.debug('No "no" animation found in model')
    }
  }

  private updatePosition (_deltaTime: number): void {
    if (!this.model) return

    // Keep character centered and still for hologram display (slightly below center for better vertical centering)
    this.model.position.set(0, -2, 1)
  }

  setScale (scale: number): void {
    this.scale = scale
    if (this.model) {
      this.model.scale.set(scale, scale, scale)
    }
  }

  getState (): CreatureState {
    return this.state
  }

  /**
   * Get available animation names from the loaded model
   */
  getAvailableAnimationNames (): string[] {
    return this.availableAnimations.map((clip) => clip.name)
  }

  /**
   * Play specific animations by name
   * Does not interrupt gesture animations - they must complete first
   */
  playAnimations (animationNames?: string[]): void {
    if (!this.mixer || this.availableAnimations.length === 0) return

    // Don't interrupt gesture animations
    if (this.isPlayingGesture) {
      return
    }

    // Stop current idle animations
    this.currentAnimationActions.forEach((action) => action.stop())
    this.currentAnimationActions = []

    // If no names provided, play all animations
    if (!animationNames || animationNames.length === 0) {
      this.availableAnimations.forEach((clip) => {
        const action = this.mixer!.clipAction(clip)
        action.play()
        this.currentAnimationActions.push(action)
      })
    } else {
      // Play only specified animations
      animationNames.forEach((name) => {
        const clip = this.availableAnimations.find((c) => c.name === name)
        if (clip) {
          const action = this.mixer!.clipAction(clip)
          action.play()
          this.currentAnimationActions.push(action)
        }
      })
    }
  }

  dispose (): void {
    if (this.model) {
      this.scene.remove(this.model)
      this.model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return

        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose())
        } else {
          child.material.dispose()
        }
      })
    }
    if (this.mixer) {
      this.mixer.uncacheRoot(this.model!)
    }
  }
}
