import type { GestureEvent, AudioMood } from '../types'
import { mapRange, smoothstep } from '../utils/helpers'
import { appConfig } from '../data/config'
import { PoseDetector } from './PoseDetector'
import Terminal from './Terminal'

/**
 * Handles camera and microphone input via getUserMedia.
 * Performs motion detection and audio analysis.
 */
export default class UserMedia {
  private videoElement: HTMLVideoElement | null = null
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private dataArray: Uint8Array | null = null
  private poseDetector: PoseDetector | null = null

  private gestureCallbacks: ((event: GestureEvent) => void)[] = []
  private audioCallbacks: ((mood: AudioMood) => void)[] = []

  private isProcessing = false

  /**
   * Check if camera and microphone permissions are granted
   * Uses the Permissions API to query actual browser permission state
   */
  static async checkPermissions (): Promise<boolean> {
    // Check if Permissions API is available
    if (!navigator.permissions || !navigator.permissions.query) {
      // Fallback: Permissions API not available, assume we need to ask
      return false
    }

    try {
      // Query both camera and microphone permissions
      const [cameraPermission, microphonePermission] = await Promise.all([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName })
      ])

      // Both must be granted for auto-enable
      return cameraPermission.state === 'granted' && microphonePermission.state === 'granted'
    } catch (error) {
      // If query fails (e.g., browser doesn't support these permission names),
      // fall back to showing the prompt
      Terminal.log('Could not query permissions, will show prompt:', error)
      return false
    }
  }

  /**
   * Request camera and microphone access.
   */
  async requestAccess (): Promise<boolean> {
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

      // Always setup video element for pose detection, but only make it visible if enabled
      if (this.stream.getVideoTracks().length > 0) {
        this.videoElement = document.getElementById('camera-feed') as HTMLVideoElement
        this.videoElement.srcObject = this.stream
        this.videoElement.autoplay = true
        this.videoElement.playsInline = true
        this.videoElement.muted = true // Mute video element to prevent audio playback
        await this.videoElement.play()

        // Initialize pose detector
        this.poseDetector = new PoseDetector()
        await this.poseDetector.init()
      }

      // Always setup audio analysis for audio mood detection
      await this.setupAudio()

      // Always start processing for pose detection
      this.startProcessing()

      return true
    } catch (error) {
      Terminal.error('Error accessing media devices:', error)
      return false
    }
  }

  private async setupAudio (): Promise<void> {
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

  private startProcessing (): void {
    if (!this.videoElement) return

    const processFrame = async () => {
      if (this.isProcessing) {
        requestAnimationFrame(processFrame)
        return
      }

      this.isProcessing = true

      // Process pose detection
      if (this.poseDetector && this.videoElement) {
        const gestureEvents = await this.poseDetector.update(this.videoElement)
        gestureEvents.forEach(event => this.emitGesture(event))
      }

      // Process audio
      this.analyzeAudio()

      this.isProcessing = false
      requestAnimationFrame(processFrame)
    }

    processFrame()
  }


  private analyzeAudio (): void {
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

  onGesture (callback: (event: GestureEvent) => void): void {
    this.gestureCallbacks.push(callback)
  }

  onAudio (callback: (mood: AudioMood) => void): void {
    this.audioCallbacks.push(callback)
  }

  private emitGesture (event: GestureEvent): void {
    this.gestureCallbacks.forEach((cb) => cb(event))
  }

  private emitAudio (mood: AudioMood): void {
    this.audioCallbacks.forEach((cb) => cb(mood))
  }

  dispose (): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
    }
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.videoElement = null
    this.poseDetector = null
    this.stream = null
    this.audioContext = null
    this.analyser = null
    this.microphone = null
    this.dataArray = null
    this.gestureCallbacks = []
    this.audioCallbacks = []
  }
}
