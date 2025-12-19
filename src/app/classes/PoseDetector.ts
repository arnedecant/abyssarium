import * as TFPD from '@tensorflow-models/pose-detection'
import * as TF from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import type { GestureEvent } from '../types'
import Terminal from './Terminal'

export class PoseDetector {
  private detector?: TFPD.PoseDetector
  private lastPose?: TFPD.Pose
  private lastTimestamp = 0
  private lastGestureTime = 0
  private readonly GESTURE_COOLDOWN = 500 // ms between gestures
  
  // Head nod detection: track nose position history
  private nosePositionHistory: Array<{ x: number; y: number; timestamp: number }> = []
  private readonly NOSE_HISTORY_DURATION = 1000 // ms to keep history
  private readonly NOSE_HISTORY_MAX = 20 // max positions to track

  async init () {
    await TF.setBackend('webgl')  // or 'wasm' if you experiment
    this.detector = await TFPD.createDetector(TFPD.SupportedModels.MoveNet, {
      modelType: TFPD.movenet.modelType.SINGLEPOSE_LIGHTNING
    })
  }

  async update (video: HTMLVideoElement): Promise<GestureEvent[]> {
    if (!this.detector) return []
    const now = performance.now()
    const poses = await this.detector.estimatePoses(video, {
      maxPoses: 1,
      flipHorizontal: true, // mirror like a selfie
    })
    const pose = poses[0]
    if (!pose || !pose.keypoints) return []

    const dt = (now - this.lastTimestamp) / 1000 || 0.016
    const events = this.detectGestures(pose, this.lastPose, dt, now)

    this.lastPose = pose
    this.lastTimestamp = now
    return events
  }

  private detectGestures(
    pose: TFPD.Pose,
    prevPose: TFPD.Pose | undefined,
    _dt: number,
    now: number
  ): GestureEvent[] {
    const events: GestureEvent[] = []

    if (!pose.keypoints || pose.keypoints.length === 0) {
      return events
    }

    // Calculate average confidence for better reliability
    const avgConfidence = pose.keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / pose.keypoints.length
    const prevAvgConfidence = prevPose?.keypoints 
      ? prevPose.keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / prevPose.keypoints.length
      : 0

    // Head nod detection: track nose position for yes/no nods
    const nose = pose.keypoints.find(kp => kp.name === 'nose')
    if (nose && nose.score && nose.score > 0.2) {
      // Add current nose position to history
      this.nosePositionHistory.push({ x: nose.x, y: nose.y, timestamp: now })
      
      // Clean old history
      this.nosePositionHistory = this.nosePositionHistory
        .filter(pos => (now - pos.timestamp) < this.NOSE_HISTORY_DURATION)
        .slice(-this.NOSE_HISTORY_MAX)
      
      // Detect head nods if we have enough history
      if (this.nosePositionHistory.length >= 5 && (now - this.lastGestureTime) > this.GESTURE_COOLDOWN) {
        const nodEvent = this.detectHeadNod(this.nosePositionHistory, avgConfidence, now)
        if (nodEvent) {
          events.push(nodEvent)
          this.lastGestureTime = now
        }
      }
    }

    // Wave detection: compare wrist positions over time
    // We use wrists because they move the most during a wave gesture
    // Made more specific: require primarily horizontal movement to avoid false positives from head nods
    if (prevPose && prevPose.keypoints && (now - this.lastGestureTime) > this.GESTURE_COOLDOWN) {
      const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist')
      const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist')
      const prevLeftWrist = prevPose.keypoints.find(kp => kp.name === 'left_wrist')
      const prevRightWrist = prevPose.keypoints.find(kp => kp.name === 'right_wrist')

      // Minimum confidence threshold
      const MIN_CONFIDENCE = 0.1
      // Minimum horizontal movement threshold (waving is primarily left-right)
      const MIN_HORIZONTAL_MOVEMENT = 30
      // Maximum vertical movement (to filter out vertical arm movements)
      const MAX_VERTICAL_MOVEMENT = 50
      // Require reasonable overall pose confidence
      const MIN_AVG_CONFIDENCE = 0.15

      // Check left wrist wave
      if (leftWrist && prevLeftWrist && leftWrist.score && prevLeftWrist.score) {
        const horizontalMovement = Math.abs(leftWrist.x - prevLeftWrist.x)
        const verticalMovement = Math.abs(leftWrist.y - prevLeftWrist.y)
        
        // Wave requires primarily horizontal movement
        if (horizontalMovement > MIN_HORIZONTAL_MOVEMENT && 
            verticalMovement < MAX_VERTICAL_MOVEMENT &&
            leftWrist.score > MIN_CONFIDENCE && 
            prevLeftWrist.score > MIN_CONFIDENCE &&
            avgConfidence > MIN_AVG_CONFIDENCE &&
            prevAvgConfidence > MIN_AVG_CONFIDENCE) {
          // Use average of wrist confidence and overall pose confidence for better reliability
          const combinedConfidence = (leftWrist.score + avgConfidence) / 2
          // Calculate strength based on horizontal movement magnitude (normalized)
          const strength = Math.min(horizontalMovement / 150, 1.0)
          const event: GestureEvent = {
            type: 'wave',
            side: 'left',
            strength,
            confidence: combinedConfidence,
            timestamp: now
          }
          events.push(event)
          this.lastGestureTime = now
          Terminal.track('Wave gesture detected:', {
            type: event.type,
            side: event.side,
            strength: strength.toFixed(2),
            confidence: combinedConfidence.toFixed(3),
            wristConfidence: leftWrist.score.toFixed(3),
            horizontalMovement: horizontalMovement.toFixed(1),
            verticalMovement: verticalMovement.toFixed(1),
            avgPoseConfidence: avgConfidence.toFixed(3),
            timestamp: now.toFixed(1)
          })
        }
      }

      // Check right wrist wave
      if (rightWrist && prevRightWrist && rightWrist.score && prevRightWrist.score) {
        const horizontalMovement = Math.abs(rightWrist.x - prevRightWrist.x)
        const verticalMovement = Math.abs(rightWrist.y - prevRightWrist.y)
        
        // Wave requires primarily horizontal movement
        if (horizontalMovement > MIN_HORIZONTAL_MOVEMENT && 
            verticalMovement < MAX_VERTICAL_MOVEMENT &&
            rightWrist.score > MIN_CONFIDENCE && 
            prevRightWrist.score > MIN_CONFIDENCE &&
            avgConfidence > MIN_AVG_CONFIDENCE &&
            prevAvgConfidence > MIN_AVG_CONFIDENCE) {
          // Use average of wrist confidence and overall pose confidence for better reliability
          const combinedConfidence = (rightWrist.score + avgConfidence) / 2
          // Calculate strength based on horizontal movement magnitude (normalized)
          const strength = Math.min(horizontalMovement / 150, 1.0)
          const event: GestureEvent = {
            type: 'wave',
            side: 'right',
            strength,
            confidence: combinedConfidence,
            timestamp: now
          }
          events.push(event)
          this.lastGestureTime = now
          Terminal.track('Wave gesture detected:', {
            type: event.type,
            side: event.side,
            strength: strength.toFixed(2),
            confidence: combinedConfidence.toFixed(3),
            wristConfidence: rightWrist.score.toFixed(3),
            horizontalMovement: horizontalMovement.toFixed(1),
            verticalMovement: verticalMovement.toFixed(1),
            avgPoseConfidence: avgConfidence.toFixed(3),
            timestamp: now.toFixed(1)
          })
        }
      }
    }

    // TODO: implement punch detection using keypoints
    // (shoulders, elbows, wrists, etc.)

    return events
  }

  /**
   * Detect head nod gestures (yes/no) by analyzing nose position history
   * Yes nod: vertical movement pattern (up then down)
   * No nod: horizontal movement pattern (left then right or right then left)
   */
  private detectHeadNod(
    history: Array<{ x: number; y: number; timestamp: number }>,
    avgConfidence: number,
    now: number
  ): GestureEvent | null {
    if (history.length < 5) return null

    // Get recent positions (last 5-10 frames)
    const recent = history.slice(-Math.min(10, history.length))
    
    // Calculate movement ranges
    const yPositions = recent.map(p => p.y)
    const xPositions = recent.map(p => p.x)
    const minY = Math.min(...yPositions)
    const maxY = Math.max(...yPositions)
    const minX = Math.min(...xPositions)
    const maxX = Math.max(...xPositions)
    
    const verticalRange = maxY - minY
    const horizontalRange = maxX - minX
    
    // Minimum movement thresholds
    const MIN_VERTICAL_MOVEMENT = 15 // pixels for yes nod
    const MIN_HORIZONTAL_MOVEMENT = 20 // pixels for no nod
    
    // Yes nod: primarily vertical movement (up-down)
    if (verticalRange > MIN_VERTICAL_MOVEMENT && verticalRange > horizontalRange * 1.5) {
      // Check for up-then-down or down-then-up pattern
      const midPoint = Math.floor(recent.length / 2)
      const firstHalf = recent.slice(0, midPoint)
      const secondHalf = recent.slice(midPoint)
      
      const firstHalfAvgY = firstHalf.reduce((sum, p) => sum + p.y, 0) / firstHalf.length
      const secondHalfAvgY = secondHalf.reduce((sum, p) => sum + p.y, 0) / secondHalf.length
      
      // Significant vertical change indicates a nod
      if (Math.abs(firstHalfAvgY - secondHalfAvgY) > MIN_VERTICAL_MOVEMENT * 0.6) {
        const strength = Math.min(verticalRange / 50, 1.0)
        Terminal.track('Head nod (yes) detected:', {
          verticalRange: verticalRange.toFixed(1),
          horizontalRange: horizontalRange.toFixed(1),
          strength: strength.toFixed(2),
          confidence: avgConfidence.toFixed(3)
        })
        return {
          type: 'nod_yes',
          confidence: avgConfidence,
          timestamp: now
        }
      }
    }
    
    // No nod: primarily horizontal movement (left-right)
    if (horizontalRange > MIN_HORIZONTAL_MOVEMENT && horizontalRange > verticalRange * 1.5) {
      // Check for left-then-right or right-then-left pattern
      const midPoint = Math.floor(recent.length / 2)
      const firstHalf = recent.slice(0, midPoint)
      const secondHalf = recent.slice(midPoint)
      
      const firstHalfAvgX = firstHalf.reduce((sum, p) => sum + p.x, 0) / firstHalf.length
      const secondHalfAvgX = secondHalf.reduce((sum, p) => sum + p.x, 0) / secondHalf.length
      
      // Significant horizontal change indicates a shake
      if (Math.abs(firstHalfAvgX - secondHalfAvgX) > MIN_HORIZONTAL_MOVEMENT * 0.6) {
        const strength = Math.min(horizontalRange / 60, 1.0)
        Terminal.track('Head nod (no) detected:', {
          verticalRange: verticalRange.toFixed(1),
          horizontalRange: horizontalRange.toFixed(1),
          strength: strength.toFixed(2),
          confidence: avgConfidence.toFixed(3)
        })
        return {
          type: 'nod_no',
          confidence: avgConfidence,
          timestamp: now
        }
      }
    }
    
    return null
  }
}
