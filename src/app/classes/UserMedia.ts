import type { GestureEvent, AudioMood } from '../types'
import { mapRange, smoothstep } from '../utils/helpers'
import { appConfig } from '../data/config'

/**
 * Handles camera and microphone input via getUserMedia
 * Performs motion detection and audio analysis
 */
export default class UserMedia {
  private videoElement: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private dataArray: Uint8Array | null = null

  private gestureCallbacks: ((event: GestureEvent) => void)[] = []
  private audioCallbacks: ((mood: AudioMood) => void)[] = []

  private previousFrame: ImageData | null = null
  private motionThreshold = 30
  private frameWidth = 160
  private frameHeight = 120
  private isProcessing = false

  constructor() {
    this.setupCanvas()
  }

  private setupCanvas(): void {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.frameWidth
    this.canvas.height = this.frameHeight
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
  }

  /**
   * Request camera and microphone access
   */
  async requestAccess(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      // Always setup video element for motion detection, but only make it visible if enabled
      if (this.stream.getVideoTracks().length > 0) {
        this.videoElement = document.createElement('video')
        this.videoElement.srcObject = this.stream
        this.videoElement.autoplay = true
        this.videoElement.playsInline = true
        this.videoElement.muted = true // Mute video element to prevent audio playback
        if (!appConfig.enableCamera) {
          // Hide video element if camera display is disabled
          this.videoElement.style.display = 'none'
        }
        await this.videoElement.play()
      }

      // Always setup audio analysis for audio mood detection
      await this.setupAudio()

      // Always start processing for motion detection
      this.startProcessing()

      return true
    } catch (error) {
      console.error('Error accessing media devices:', error)
      return false
    }
  }

  private async setupAudio(): Promise<void> {
    if (!this.stream) return

    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8

    const audioTracks = this.stream.getAudioTracks()
    if (audioTracks.length > 0) {
      this.microphone = this.audioContext.createMediaStreamSource(this.stream)
      this.microphone.connect(this.analyser)
      // Only connect to speakers (destination) if microphone playback is enabled
      if (appConfig.enableMicrophone) {
        this.microphone.connect(this.audioContext.destination)
      }
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    }
  }

  private startProcessing(): void {
    if (!this.videoElement || !this.ctx || !this.canvas) return

    const processFrame = () => {
      if (this.isProcessing) {
        requestAnimationFrame(processFrame)
        return
      }

      this.isProcessing = true

      // Draw video frame to canvas
      this.ctx!.drawImage(
        this.videoElement!,
        0,
        0,
        this.frameWidth,
        this.frameHeight
      )

      // Process motion detection
      this.detectMotion()

      // Process audio
      this.analyzeAudio()

      this.isProcessing = false
      requestAnimationFrame(processFrame)
    }

    processFrame()
  }

  private detectMotion(): void {
    if (!this.ctx || !this.canvas) return

    const currentFrame = this.ctx.getImageData(
      0,
      0,
      this.frameWidth,
      this.frameHeight
    )

    if (!this.previousFrame) {
      this.previousFrame = currentFrame
      return
    }

    // Frame differencing
    let totalMotion = 0
    const regionMotion: number[] = [0, 0, 0] // left, center, right

    for (let i = 0; i < currentFrame.data.length; i += 4) {
      const r = Math.abs(currentFrame.data[i] - this.previousFrame.data[i])
      const g = Math.abs(
        currentFrame.data[i + 1] - this.previousFrame.data[i + 1]
      )
      const b = Math.abs(
        currentFrame.data[i + 2] - this.previousFrame.data[i + 2]
      )
      const diff = (r + g + b) / 3

      if (diff > this.motionThreshold) {
        totalMotion += diff

        // Determine region (left, center, right)
        const x = (i / 4) % this.frameWidth
        const region = x < this.frameWidth / 3 ? 0 : x < (this.frameWidth * 2) / 3 ? 1 : 2
        regionMotion[region] += diff
      }
    }

    // Normalize motion
    const normalizedMotion = Math.min(
      totalMotion / (this.frameWidth * this.frameHeight * 255),
      1.0
    )

    // Detect gestures
    const leftMotion = regionMotion[0] / (this.frameWidth * this.frameHeight * 255 / 3)
    const rightMotion = regionMotion[2] / (this.frameWidth * this.frameHeight * 255 / 3)
    const motionRatio = Math.max(leftMotion, rightMotion) / (Math.min(leftMotion, rightMotion) + 0.1)

    if (motionRatio > 2.0 && normalizedMotion > 0.1) {
      const side = leftMotion > rightMotion ? 'left' : 'right'
      this.emitGesture({ type: 'wave', side })
    }

    // Emit presence level
    this.emitGesture({
      type: 'presence',
      level: smoothstep(0.05, 0.3, normalizedMotion),
    })

    this.previousFrame = currentFrame
  }

  private analyzeAudio(): void {
    if (!this.analyser || !this.dataArray) return

    // Create a properly typed array to satisfy TypeScript's strict type checking
    const buffer = new ArrayBuffer(this.dataArray.length)
    const dataArray = new Uint8Array(buffer)
    this.analyser.getByteFrequencyData(dataArray)

    // Calculate overall loudness
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    const loudness = mapRange(sum / dataArray.length, 0, 255, 0, 1)

    // Calculate frequency bands
    const lowEnd = Math.floor(dataArray.length * 0.1)
    const midEnd = Math.floor(dataArray.length * 0.5)

    let lowSum = 0
    let midSum = 0
    let highSum = 0

    for (let i = 0; i < dataArray.length; i++) {
      if (i < lowEnd) {
        lowSum += dataArray[i]
      } else if (i < midEnd) {
        midSum += dataArray[i]
      } else {
        highSum += dataArray[i]
      }
    }

    const lowBand = mapRange(lowSum / lowEnd, 0, 255, 0, 1)
    const midBand = mapRange(midSum / (midEnd - lowEnd), 0, 255, 0, 1)
    const highBand = mapRange(highSum / (dataArray.length - midEnd), 0, 255, 0, 1)

    const mood: AudioMood = {
      loudness: smoothstep(0.1, 0.8, loudness),
      lowBand: smoothstep(0.1, 0.8, lowBand),
      midBand: smoothstep(0.1, 0.8, midBand),
      highBand: smoothstep(0.1, 0.8, highBand),
    }

    this.emitAudio(mood)
  }

  onGesture(callback: (event: GestureEvent) => void): void {
    this.gestureCallbacks.push(callback)
  }

  onAudio(callback: (mood: AudioMood) => void): void {
    this.audioCallbacks.push(callback)
  }

  private emitGesture(event: GestureEvent): void {
    this.gestureCallbacks.forEach((cb) => cb(event))
  }

  private emitAudio(mood: AudioMood): void {
    this.audioCallbacks.forEach((cb) => cb(mood))
  }

  dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
    }
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.videoElement = null
    this.canvas = null
    this.ctx = null
    this.stream = null
    this.audioContext = null
    this.analyser = null
    this.microphone = null
    this.dataArray = null
    this.gestureCallbacks = []
    this.audioCallbacks = []
  }
}
