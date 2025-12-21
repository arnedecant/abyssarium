import { getBiome } from '../data/biomes'
import { getAvailableModels, getModelsByType, getModelById, MODELS } from '../data/models'
import Terminal from './Terminal'
import type { GestureEvent, AudioMood } from '../types'
import Scene from './Scene'
import UserMedia from './UserMedia'
import { appConfig } from '../data/config'
import type { ModelType } from '../types'

const DEFAULT_STATUS = 'Camera & microphone enabled. Interact with the creature!'

/**
 * Main entry point for Abyssarium
 */
export default class Abyssarium {
  private container: HTMLElement
  private scene: Scene | null = null
  private userMedia: UserMedia | null = null
  private statusElement: HTMLElement
  private permissionPrompt: HTMLElement
  private enableButton: HTMLElement
  private typeSelect: HTMLSelectElement
  private modelSelect: HTMLSelectElement
  private animationSelect: HTMLSelectElement
  private currentBiome = 'abyssarium'
  private currentCreature: any = null
  private isUpdatingAnimationDropdown = false

  constructor () {
    this.container = document.getElementById('app')!
    this.statusElement = document.getElementById('status')!
    this.permissionPrompt = document.getElementById('permission-prompt')!
    this.enableButton = document.getElementById('enable-media')!
    this.typeSelect = document.getElementById('type-select') as HTMLSelectElement
    this.modelSelect = document.getElementById('model-select') as HTMLSelectElement
    this.animationSelect = document.getElementById('animation-select') as HTMLSelectElement

    // Ensure permission prompt is hidden initially
    this.permissionPrompt.classList.add('hidden')

    if (appConfig.debug) {
      this.container.classList.add('debug')
    }

    this.init()
  }

  private async init (): Promise<void> {
    // Load configuration first
    this.updateStatus('Initializing scene...')

    // Ensure permission prompt is hidden initially
    this.permissionPrompt.classList.add('hidden')

    // Initialize scene with default biome
    const biome = getBiome(this.currentBiome)
    this.scene = new Scene(this.container, biome)

    // Setup type dropdown
    this.setupTypeDropdown()

    // Setup model dropdown
    this.setupModelDropdown()

    // Setup animation dropdown
    this.setupAnimationDropdown()

    this.loadInitialModel()

    const needsMedia = true // TODO: in kiosk this will already be enabled
    
    if (needsMedia) {
      // Check actual browser permissions
      const hasPermissions = await UserMedia.checkPermissions()
      
      if (hasPermissions) {
        // Permissions already granted (kiosk mode or previously granted)
        // Automatically enable media without showing prompt
        this.updateStatus('Scene ready. Enabling camera & microphone...')
        await this.enableMedia()
      } else {
        // Permissions not granted - show prompt
        this.updateStatus('Scene ready. Click to enable camera & microphone.')
        this.permissionPrompt.classList.remove('hidden')
        this.enableButton.addEventListener('click', () => this.enableMedia())
      }
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

  private setupTypeDropdown(): void {
    this.typeSelect.addEventListener('change', () => {
      const selectedType = this.typeSelect.value as ModelType
      this.updateModelDropdown(selectedType)
    })
  }

  private updateModelDropdown (type: ModelType, skipAutoLoad: boolean = false): void {
    const models = getModelsByType(type)
    const currentValue = this.modelSelect.value
    this.modelSelect.innerHTML = ''
    
    models.forEach((model) => {
      const option = document.createElement('option')
      option.value = model
      option.textContent = model.replace('.glb', '')
      this.modelSelect.appendChild(option)
    })

    // Try to preserve selection if it's still valid, otherwise select first model
    if (models.includes(currentValue)) {
      this.modelSelect.value = currentValue
    } else if (models.length > 0) {
      this.modelSelect.value = models[0]
      // Auto-load the first model when type changes (unless skipAutoLoad is true)
      if (!skipAutoLoad) {
        this.loadModel(models[0], type)
      }
    }
  }

  private setupModelDropdown (): void {
    // Initialize with models for the default selected type
    // Skip auto-load during initial setup - loadInitialModel will handle loading
    const selectedType = this.typeSelect.value as ModelType
    this.updateModelDropdown(selectedType, true)

    this.modelSelect.addEventListener('change', async () => {
      const selectedModel = this.modelSelect.value
      const selectedType = this.typeSelect.value as ModelType
      await this.loadModel(selectedModel, selectedType)
    })
  }

  private async loadInitialModel (): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search)
    const modelId = urlParams.get('id') ?? ''
    const model = getModelById(modelId)
    if (!model) {
      await this.loadDefaultModel()
      return
    }
    this.typeSelect.value = model.type
    this.updateModelDropdown(model.type, true)
    this.modelSelect.value = model.name
    await this.loadModel(model.name, model.type)
  }

  private async loadDefaultModel (): Promise<void> {
    const selectedType = this.typeSelect.value as ModelType
    const models = getModelsByType(selectedType)
    const initialModel = models[0] ?? getAvailableModels()[0] ?? 'Alien'
    this.modelSelect.value = initialModel
    await this.loadModel(initialModel, selectedType)
  }

  private setupAnimationDropdown (): void {
    this.animationSelect.addEventListener('change', () => {
      // Don't trigger animations when programmatically updating the dropdown
      if (this.isUpdatingAnimationDropdown) return
      
      const selectedAnimations = Array.from(this.animationSelect.selectedOptions)
        .map((opt) => (opt as HTMLOptionElement).value)
        .filter((value) => value !== '')
      if (!selectedAnimations.length) return
      this.currentCreature?.playAnimations(selectedAnimations)
    })
  }

  private async loadModel (modelName: string, modelType: ModelType): Promise<void> {
    this.updateStatus(`Loading model: ${modelName}...`)
    const model = MODELS.find((model) => model.name === modelName && model.type === modelType)
    const modelPath = `/models/${model?.model}`

    try {
      if (!model) throw new Error(`Model not found: ${modelType}/${modelName}`)
      this.currentCreature = await this.scene!.replaceCreature(modelPath, model.animations)
      const availableAnimations = this.currentCreature.getAvailableAnimationNames()
      
      // Prevent change event from firing during programmatic update
      this.isUpdatingAnimationDropdown = true
      this.animationSelect.innerHTML = ''

      if (availableAnimations.length > 0) {
        availableAnimations.forEach((animName: string) => {
          const option = document.createElement('option')
          option.value = animName
          option.textContent = animName
          if (model.animations.includes(animName)) {
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
      
      // Re-enable change event handling
      this.isUpdatingAnimationDropdown = false
    } catch (error) {
      Terminal.error('Error loading model:', error)
      this.updateStatus(`Error loading model: ${modelType}/${modelName}`)
    }
  }

  private async enableMedia (): Promise<void> {
    this.permissionPrompt.classList.add('hidden')
    this.updateStatus('Requesting camera and microphone access...')

    this.userMedia = new UserMedia()

    // Setup gesture callbacks
    this.userMedia.onGesture((event: GestureEvent) => {
      Terminal.log('Gesture received:', {
        type: event.type,
        side: event.side,
        strength: event.strength?.toFixed(2),
        confidence: event.confidence.toFixed(3),
        timestamp: event.timestamp.toFixed(1)
      })

      if (event.type === 'wave') {
        const side = event.side
        if (side) {
          this.scene?.handleWave(side)
          this.updateStatus(`Wave detected: ${side} side!`, false)
        }
      } else if (event.type === 'nod_yes') {
        this.scene?.handleNodYes()
        this.updateStatus('Head nod (yes) detected!', false)
      } else if (event.type === 'nod_no') {
        this.scene?.handleNodNo()
        this.updateStatus('Head shake (no) detected!')
      }
      // Note: presence detection removed - GestureEvent no longer includes 'presence' type
      // Presence can be derived from gesture confidence if needed in the future
    })

    // Setup audio callbacks
    let lastStatusUpdate = 0
    this.userMedia.onAudio((mood: AudioMood) => {
      this.scene?.updateAudioMood(mood)
      // Throttle status updates to avoid spam
      const now = Date.now()
      if (now - lastStatusUpdate > 1000) {
        this.updateStatus(`Audio: ${(mood.loudness * 100).toFixed(0)}% | Interacting...`)
        lastStatusUpdate = now
      }
    })

    const success = await this.userMedia.requestAccess()

    if (success) {
      // Ensure prompt is hidden on success
      this.permissionPrompt.classList.add('hidden')
      this.updateStatus(DEFAULT_STATUS)
    } else {
      this.updateStatus('Media access denied. App will work without interaction.')
      this.permissionPrompt.classList.remove('hidden')
    }
  }

  private handleKeyPress (event: KeyboardEvent): void {
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

  private updateStatus (message: string, isPersistent: boolean = true): void {
    this.statusElement.textContent = message
    Terminal.log(message)
    if (message === DEFAULT_STATUS || isPersistent) return
    setTimeout(() => this.updateStatus(DEFAULT_STATUS), 2000)
  }

  dispose (): void {
    this.scene?.dispose()
    this.userMedia?.dispose()
  }
}