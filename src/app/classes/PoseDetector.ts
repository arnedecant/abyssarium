import * as TFPD from '@tensorflow-models/pose-detection'
import * as TF from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'

type GestureType = 'wave' | 'nod_yes' | 'nod_no' | 'punch'

export interface GestureEvent {
  type: GestureType
  side?: 'left' | 'right'
  strength?: number
  confidence: number
  timestamp: number
}

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
    dt: number,
    now: number
  ): GestureEvent[] {
    const events: GestureEvent[] = []

    // TODO: implement wave / nod / punch using keypoints
    // (nose, shoulders, wrists, etc.)

    return events
  }
}
