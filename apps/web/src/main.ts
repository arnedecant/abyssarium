import { Scene } from './app/classes/Scene'
import { UserMedia } from './app/classes/UserMedia'
import { getBiome } from './app/biomes'
import { getAvailableModels, getAnimationsForModel } from './app/models'
import Terminal from './app/classes/Terminal'
import type { GestureEvent, AudioMood } from './app/types'

/**
 * Main entry point for Abyssarium
 */
class AbyssariumApp {
  private container: HTMLElement
  private scene: Scene | null = null
  private userMedia: UserMedia | null = null
  private statusElement: HTMLElement
  private permissionPrompt: HTMLElement
  private enableButton: HTMLElement
  private modelSelect: HTMLSelectElement
  private animationSelect: HTMLSelectElement
  private currentBiome = 'abyssarium'
  private currentCreature: any = null

  constructor() {
    this.container = document.getElementById('app')!
    this.statusElement = document.getElementById('status')!
    this.permissionPrompt = document.getElementById('permission-prompt')!
    this.enableButton = document.getElementById('enable-media')!
    this.modelSelect = document.getElementById('model-select') as HTMLSelectElement
    this.animationSelect = document.getElementById('animation-select') as HTMLSelectElement

    this.init()
  }

  private async init(): Promise<void> {
    // Load configuration first
    this.updateStatus('Initializing scene...')

    // Initialize scene with default biome
    const biome = getBiome(this.currentBiome)
    this.scene = new Scene(this.container, biome)

    // Setup model dropdown
    this.setupModelDropdown()

    // Setup animation dropdown
    this.setupAnimationDropdown()

    // Load initial model
    const initialModel = getAvailableModels()[0] || 'Fish.glb'
    this.modelSelect.value = initialModel
    await this.loadModel(initialModel)

    const needsMedia = true // TODO: in kiosk this will already be enabled
    
    if (needsMedia) {
      this.updateStatus('Scene ready. Click to enable camera & microphone.')
      // Show permission prompt
      this.permissionPrompt.classList.remove('hidden')
      this.enableButton.addEventListener('click', () => this.enableMedia())
    } else {
      this.updateStatus('Scene ready.')
      // Hide permission prompt if media is disabled
      this.permissionPrompt.classList.add('hidden')
    }

    // Start render loop
    this.scene.start()

    // Allow biome switching with keyboard (for testing)
    document.addEventListener('keydown', (e) => this.handleKeyPress(e))
  }

  private setupModelDropdown(): void {
    const models = getAvailableModels()
    this.modelSelect.innerHTML = ''
    models.forEach((model) => {
      const option = document.createElement('option')
      option.value = model
      option.textContent = model.replace('.glb', '')
      this.modelSelect.appendChild(option)
    })

    this.modelSelect.addEventListener('change', async () => {
      const selectedModel = this.modelSelect.value
      await this.loadModel(selectedModel)
    })
  }

  private setupAnimationDropdown(): void {
    this.animationSelect.addEventListener('change', () => {
      const selectedAnimations = Array.from(this.animationSelect.selectedOptions).map(
        (opt) => (opt as HTMLOptionElement).value
      )
      if (this.currentCreature) {
        this.currentCreature.playAnimations(selectedAnimations)
      }
    })
  }

  private async loadModel(modelName: string): Promise<void> {
    this.updateStatus(`Loading model: ${modelName}...`)
    const modelPath = `/models/${modelName}`

    try {
      // Get configured animations for this model
      const configuredAnimations = getAnimationsForModel(modelName)

      // Replace the current creature
      this.currentCreature = await this.scene!.replaceCreature(modelPath, configuredAnimations)

      // Update animation dropdown with available animations from the loaded model
      const availableAnimations = this.currentCreature.getAvailableAnimationNames()
      this.animationSelect.innerHTML = ''

      if (availableAnimations.length > 0) {
        availableAnimations.forEach((animName: string) => {
          const option = document.createElement('option')
          option.value = animName
          option.textContent = animName
          // Select if it's in the configured animations
          if (configuredAnimations.includes(animName)) {
            option.selected = true
          }
          this.animationSelect.appendChild(option)
        })
        this.updateStatus(`Model loaded. ${availableAnimations.length} animation(s) available.`)
      } else {
        const option = document.createElement('option')
        option.value = ''
        option.textContent = 'No animations'
        this.animationSelect.appendChild(option)
        this.updateStatus('Model loaded. No animations found.')
      }
    } catch (error) {
      console.error('Error loading model:', error)
      this.updateStatus(`Error loading model: ${modelName}`)
    }
  }

  private async enableMedia(): Promise<void> {
    this.permissionPrompt.classList.add('hidden')
    this.updateStatus('Requesting camera and microphone access...')

    this.userMedia = new UserMedia()

    // Setup gesture callbacks
    this.userMedia.onGesture((event: GestureEvent) => {
      if (event.type === 'wave') {
        this.scene?.handleWave(event.side)
        this.updateStatus(`Wave detected: ${event.side} side!`)
        // Clear message after 2 seconds
        setTimeout(() => {
          this.updateStatus('Camera & microphone enabled. Interact with the creatures!')
        }, 2000)
      } else if (event.type === 'presence') {
        this.scene?.updatePresence(event.level)
      }
    })

    // Setup audio callbacks
    let lastStatusUpdate = 0
    this.userMedia.onAudio((mood: AudioMood) => {
      this.scene?.updateAudioMood(mood)
      // Throttle status updates to avoid spam
      const now = Date.now()
      if (now - lastStatusUpdate > 1000) {
        this.updateStatus(
          `Audio: ${(mood.loudness * 100).toFixed(0)}% | Interacting...`
        )
        lastStatusUpdate = now
      }
    })

    const success = await this.userMedia.requestAccess()

    if (success) {
      this.updateStatus('Camera & microphone enabled. Interact with the creatures!')
    } else {
      this.updateStatus('Media access denied. App will work without interaction.')
      this.permissionPrompt.classList.remove('hidden')
    }
  }

  private handleKeyPress(event: KeyboardEvent): void {
    // Biome switching (for testing)
    const biomes = ['abyssarium', 'void', 'eldritch']
    const currentIndex = biomes.indexOf(this.currentBiome)

    if (event.key === 'b' || event.key === 'B') {
      const nextIndex = (currentIndex + 1) % biomes.length
      this.currentBiome = biomes[nextIndex]
      this.scene?.setBiome(getBiome(this.currentBiome))
      this.updateStatus(`Biome: ${this.currentBiome}`)
    }
  }

  private updateStatus(message: string): void {
    this.statusElement.textContent = message
    Terminal.log(message)
  }

  dispose(): void {
    this.scene?.dispose()
    this.userMedia?.dispose()
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AbyssariumApp()
  })
} else {
  new AbyssariumApp()
}

