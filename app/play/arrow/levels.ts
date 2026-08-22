export type ArrowLevel = {
  targetX: number;
  targetY: number;
  radius: number;
  moveX: number;
  moveY: number;
  speed: number;
  gravity: number;
  wind: number;
};

export const ARROW_LEVELS: ArrowLevel[] = [
  { targetX: 195, targetY: 205, radius: 30, moveX: 0, moveY: 0, speed: 0, gravity: 85, wind: 0 },
  { targetX: 125, targetY: 220, radius: 27, moveX: 48, moveY: 0, speed: 0.0012, gravity: 100, wind: 0 },
  { targetX: 260, targetY: 185, radius: 24, moveX: 0, moveY: 38, speed: 0.00145, gravity: 110, wind: 10 },
  { targetX: 195, targetY: 245, radius: 22, moveX: 78, moveY: 18, speed: 0.00165, gravity: 120, wind: -18 },
  { targetX: 110, targetY: 170, radius: 20, moveX: 62, moveY: 30, speed: 0.00185, gravity: 132, wind: 22 },
  { targetX: 285, targetY: 210, radius: 19, moveX: 72, moveY: 0, speed: 0.00205, gravity: 142, wind: -28 },
  { targetX: 195, targetY: 155, radius: 18, moveX: 82, moveY: 42, speed: 0.00225, gravity: 152, wind: 34 },
  { targetX: 195, targetY: 210, radius: 17, moveX: 112, moveY: 48, speed: 0.00245, gravity: 165, wind: -38 },
];
