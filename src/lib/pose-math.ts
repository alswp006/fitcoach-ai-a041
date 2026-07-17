/**
 * Pose math utilities for angle calculation and validation.
 * Packet 0011 — stub with type definitions only.
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Calculate angle (in degrees) between three points.
 * p2 is the pivot/vertex; returns the angle formed by p1-p2-p3.
 *
 * @param p1 First point
 * @param p2 Pivot point (vertex of angle)
 * @param p3 Third point
 * @returns Angle in degrees (0-180)
 */
export function calculateAngle(p1: Point2D, p2: Point2D, p3: Point2D): number {
  // TODO: Implement angle calculation
  // Formula: angle = arccos((v1·v2) / (|v1||v2|)) where v1 and v2 are vectors from p2
  throw new Error("calculateAngle not implemented");
}
