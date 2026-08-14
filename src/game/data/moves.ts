import type { ElementType, Move } from '../types';

export const moves: Record<string, Move> = {
  emberTap: { id: 'emberTap', name: '火花', element: 'fire', rating: 36, accuracy: 0.98, pp: 22, description: '跃起一簇温暖火花。' },
  flareRush: { id: 'flareRush', name: '焰尾舞', element: 'fire', rating: 52, accuracy: 0.9, pp: 14, description: '让火焰绕着尾巴旋转。', condition: { type: 'scorch', chance: 0.24, turns: 3 } },
  solarBlink: { id: 'solarBlink', name: '日耀闪', element: 'fire', rating: 64, accuracy: 0.84, pp: 9, description: '借星港日光释放短促爆发。', condition: { type: 'scorch', chance: 0.32, turns: 3 } },
  novaPounce: { id: 'novaPounce', name: '星焰扑击', element: 'fire', rating: 76, accuracy: 0.82, pp: 6, description: '把尾焰压缩成星核般的亮点后高速扑向目标。', condition: { type: 'scorch', chance: 0.42, turns: 3 } },
  bubblePop: { id: 'bubblePop', name: '泡泡', element: 'water', rating: 36, accuracy: 0.98, pp: 22, description: '放出一串轻盈水泡。' },
  tidePulse: { id: 'tidePulse', name: '潮汐环', element: 'water', rating: 52, accuracy: 0.9, pp: 14, description: '水流形成一圈涟漪。' },
  moonTide: { id: 'moonTide', name: '月潮', element: 'water', rating: 62, accuracy: 0.86, pp: 10, description: '召来一阵柔和却有力的潮波。', condition: { type: 'sluggish', chance: 0.25, turns: 3 } },
  abyssalCurrent: { id: 'abyssalCurrent', name: '深澜回流', element: 'water', rating: 74, accuracy: 0.84, pp: 7, description: '让两股潮流交错回卷，在短时间内压低目标的行动节奏。', condition: { type: 'sluggish', chance: 0.38, turns: 3 } },
  leafCut: { id: 'leafCut', name: '叶舞', element: 'nature', rating: 38, accuracy: 0.96, pp: 20, description: '叶片在风中盘旋。' },
  seedBurst: { id: 'seedBurst', name: '种子雨', element: 'nature', rating: 50, accuracy: 0.92, pp: 15, description: '洒下一片发光种子。', condition: { type: 'sluggish', chance: 0.18, turns: 2 } },
  vineArc: { id: 'vineArc', name: '藤弧', element: 'nature', rating: 61, accuracy: 0.87, pp: 10, description: '藤蔓划出一道迅捷弧线。', condition: { type: 'sluggish', chance: 0.28, turns: 3 } },
  thornHalo: { id: 'thornHalo', name: '森冠棘环', element: 'nature', rating: 73, accuracy: 0.85, pp: 7, description: '星叶与藤刺组成旋转光环，持续压制目标的移动空间。', condition: { type: 'sluggish', chance: 0.4, turns: 3 } },
  sparkNibble: { id: 'sparkNibble', name: '电光', element: 'electric', rating: 40, accuracy: 0.95, pp: 20, description: '身边闪过短促电光。' },
  staticBolt: { id: 'staticBolt', name: '静电环', element: 'electric', rating: 50, accuracy: 0.91, pp: 14, description: '静电形成明亮圆环。', condition: { type: 'sluggish', chance: 0.3, turns: 2 } },
  thunderSkip: { id: 'thunderSkip', name: '雷跃', element: 'electric', rating: 63, accuracy: 0.85, pp: 9, description: '借电流高速跃向目标。' },
  thunderCrown: { id: 'thunderCrown', name: '雷冠', element: 'electric', rating: 72, accuracy: 0.82, pp: 7, description: '将蓄积的电流聚成耀眼雷冠。', condition: { type: 'sluggish', chance: 0.38, turns: 3 } },
  stormRoar: { id: 'stormRoar', name: '风暴咆哮', element: 'neutral', rating: 58, accuracy: 0.92, pp: 11, description: '用震荡星辉撕开周围气流。' },
  pebbleShot: { id: 'pebbleShot', name: '岩纹', element: 'rock', rating: 42, accuracy: 0.94, pp: 18, description: '地面浮现岩石纹路。' },
  stoneOrbit: { id: 'stoneOrbit', name: '岩环', element: 'rock', rating: 56, accuracy: 0.89, pp: 12, description: '碎岩围绕身体快速旋转。' },
  starBump: { id: 'starBump', name: '星跃', element: 'neutral', rating: 40, accuracy: 1, pp: 24, description: '借着星光向前跃动。' },
  cometDash: { id: 'cometDash', name: '彗星步', element: 'neutral', rating: 58, accuracy: 0.9, pp: 12, description: '拖着星辉快速冲刺。' },
  strugglePulse: { id: 'strugglePulse', name: '余辉震荡', element: 'neutral', rating: 28, accuracy: 1, pp: 1, description: '所有常规技能都耗尽后，以残余星能发起的保底行动。' },
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