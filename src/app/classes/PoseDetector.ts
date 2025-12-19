import * as TFPD from '@tensorflow-models/pose-detection'
import * as TF from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import type { GestureEvent } from '../types'

export class PoseDetector {
  private detector?: TFPD.PoseDetector
  private lastPose?: TFPD.Pose
  private lastTimestamp = 0

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

    // Calculate average confidence for debugging
    const avgConfidence = pose.keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / pose.keypoints.length

    // Wave detection: compare wrist positions over time
    if (prevPose && prevPose.keypoints) {
      const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist')
      const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist')
      const prevLeftWrist = prevPose.keypoints.find(kp => kp.name === 'left_wrist')
      const prevRightWrist = prevPose.keypoints.find(kp => kp.name === 'right_wrist')

      if (leftWrist && prevLeftWrist && leftWrist.score && prevLeftWrist.score) {
        const leftMovement = Math.abs(leftWrist.x - prevLeftWrist.x) + Math.abs(leftWrist.y - prevLeftWrist.y)
        if (leftMovement > 30 && leftWrist.score > 0.5) {
          // Calculate strength based on movement magnitude (normalized)
          const strength = Math.min(leftMovement / 100, 1.0)
          const event: GestureEvent = {
            type: 'wave',
            side: 'left',
            strength,
            confidence: leftWrist.score,
            timestamp: now
          }
          events.push(event)
          console.log('[PoseDetector] Gesture detected:', {
            type: event.type,
            side: event.side,
            strength: strength.toFixed(2),
            confidence: leftWrist.score.toFixed(3),
            movement: leftMovement.toFixed(1),
            avgPoseConfidence: avgConfidence.toFixed(3),
            timestamp: now.toFixed(1)
          })
        } else {
          // Debug: log when movement is detected but doesn't meet threshold
          if (leftMovement > 20) {
            console.debug('[PoseDetector] Left wrist movement detected but below threshold:', {
              movement: leftMovement.toFixed(1),
              confidence: leftWrist.score.toFixed(3),
              threshold: 30,
              minConfidence: 0.5
            })
          }
        }
      }

      if (rightWrist && prevRightWrist && rightWrist.score && prevRightWrist.score) {
        const rightMovement = Math.abs(rightWrist.x - prevRightWrist.x) + Math.abs(rightWrist.y - prevRightWrist.y)
        if (rightMovement > 30 && rightWrist.score > 0.5) {
          // Calculate strength based on movement magnitude (normalized)
          const strength = Math.min(rightMovement / 100, 1.0)
          const event: GestureEvent = {
            type: 'wave',
            side: 'right',
            strength,
            confidence: rightWrist.score,
            timestamp: now
          }
          events.push(event)
          console.log('[PoseDetector] Gesture detected:', {
            type: event.type,
            side: event.side,
            strength: strength.toFixed(2),
            confidence: rightWrist.score.toFixed(3),
            movement: rightMovement.toFixed(1),
            avgPoseConfidence: avgConfidence.toFixed(3),
            timestamp: now.toFixed(1)
          })
        } else {
          // Debug: log when movement is detected but doesn't meet threshold
          if (rightMovement > 20) {
            console.debug('[PoseDetector] Right wrist movement detected but below threshold:', {
              movement: rightMovement.toFixed(1),
              confidence: rightWrist.score.toFixed(3),
              threshold: 30,
              minConfidence: 0.5
            })
          }
        }
      }
    }

    // TODO: implement nod_yes, nod_no, and punch detection using keypoints
    // (nose, head, shoulders, elbows, etc.)

    return events
  }
}
