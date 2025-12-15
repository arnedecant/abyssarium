/**
 * Utility functions for Abyssarium
 */

export function clamp (value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp (start: number, end: number, t: number): number {
  return start + (end - start) * t
}

export function smoothstep (edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function randomRange (min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function degToRad (degrees: number): number {
  return degrees * (Math.PI / 180)
}

export function radToDeg (radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * Normalize a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

