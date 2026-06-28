export const TILE = 36;
export const MAP_W = 34;
export const MAP_H = 20;
export const PLAYER_R = 11;
export const THIEF_R = 11;

// 0=пол 1=стена 2=подвал 3=кровать 4=мебель 6=стол с ПК (фонарик)
export const MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,3,0,0,6,6,1,0,0,0,0,0,0,1,0,0,0,0,4,4,0,0,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,3,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,1,1,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export const isWall = (tx: number, ty: number): boolean => {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const t = MAP[ty][tx];
  return t === 1 || t === 4;
};

export interface Entity {
  x: number; y: number;
  vx: number; vy: number;
  dir: number;
  walkFrame: number; walkTimer: number;
  hp: number;
}
export interface Blood  { x: number; y: number; life: number; size: number; vx: number; vy: number; }
export interface Bullet { x: number; y: number; vx: number; vy: number; life: number; headshot: boolean; }
export interface Wound  { x: number; y: number; } // дырка на теле вора

// стадии урона игрока
export type DamageStage = 0 | 1 | 2 | 3 | 4;
// 0=нет урона 1=больно 2=темнеет 3=хромает 4=потеря сознания

// фаза игры
export type GamePhase = 'normal' | 'hunt'; // normal=вор атакует; hunt=вор прячется, темнота

// BFS pathfinding
export function bfsPath(
  sx: number, sy: number,
  tx: number, ty: number
): { x: number; y: number }[] {
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [{ x: sx, y: sy, path: [] }];
  const visited = new Set<string>();
  visited.add(`${sx},${sy}`);
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  while (queue.length) {
    const cur = queue.shift()!;
    const newPath = [...cur.path, { x: cur.x, y: cur.y }];
    if (cur.x === tx && cur.y === ty) return newPath;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && !isWall(nx, ny)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, path: newPath });
      }
    }
  }
  return [];
}
