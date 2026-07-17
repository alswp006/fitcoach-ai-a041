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
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  const cosAngle = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}
