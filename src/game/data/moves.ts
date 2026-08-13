import type { ElementType, Move } from '../types';

export const moves: Record<string, Move> = {
  emberTap: { id: 'emberTap', name: '火花', element: 'fire', rating: 36, accuracy: 0.98, description: '跃起一簇温暖火花。' },
  flareRush: { id: 'flareRush', name: '焰尾舞', element: 'fire', rating: 52, accuracy: 0.9, description: '让火焰绕着尾巴旋转。' },
  bubblePop: { id: 'bubblePop', name: '泡泡', element: 'water', rating: 36, accuracy: 0.98, description: '放出一串轻盈水泡。' },
  tidePulse: { id: 'tidePulse', name: '潮汐环', element: 'water', rating: 52, accuracy: 0.9, description: '水流形成一圈涟漪。' },
  leafCut: { id: 'leafCut', name: '叶舞', element: 'nature', rating: 38, accuracy: 0.96, description: '叶片在风中盘旋。' },
  seedBurst: { id: 'seedBurst', name: '种子雨', element: 'nature', rating: 50, accuracy: 0.92, description: '洒下一片发光种子。' },
  sparkNibble: { id: 'sparkNibble', name: '电光', element: 'electric', rating: 40, accuracy: 0.95, description: '身边闪过短促电光。' },
  staticBolt: { id: 'staticBolt', name: '静电环', element: 'electric', rating: 50, accuracy: 0.91, description: '静电形成明亮圆环。' },
  pebbleShot: { id: 'pebbleShot', name: '岩纹', element: 'rock', rating: 42, accuracy: 0.94, description: '地面浮现岩石纹路。' },
  starBump: { id: 'starBump', name: '星跃', element: 'neutral', rating: 40, accuracy: 1, description: '借着星光向前跃动。' },
};

const effectiveness: Record<ElementType, Partial<Record<ElementType, number>>> = {
  fire: { nature: 1.5, water: 0.67, rock: 0.67 },
  water: { fire: 1.5, rock: 1.5, nature: 0.67 },
  nature: { water: 1.5, rock: 1.5, fire: 0.67 },
  electric: { water: 1.5, rock: 0.67 },
  rock: { electric: 1.5, fire: 1.25, nature: 0.8 },
  neutral: {},
};

export function elementMultiplier(source: ElementType, target: ElementType): number {
  return effectiveness[source][target] ?? 1;
}
