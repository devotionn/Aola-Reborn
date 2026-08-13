import type { Species } from '../types';

export const species: Record<string, Species> = {
  emberMochi: {
    id: 'emberMochi', name: '炽尾团子', element: 'fire', symbol: '炎', description: '热情又好奇的旅行伙伴。',
    baseStats: { hp: 62, spirit: 70, focus: 52, speed: 64 }, moveIds: ['emberTap', 'starBump', 'flareRush', 'solarBlink'], tameRate: 0.42,
  },
  rippleFin: {
    id: 'rippleFin', name: '澜鳍兽', element: 'water', symbol: '澜', description: '喜欢在星港水边散步。',
    baseStats: { hp: 68, spirit: 62, focus: 60, speed: 58 }, moveIds: ['bubblePop', 'starBump', 'tidePulse', 'moonTide'], tameRate: 0.44,
  },
  sproutTanuki: {
    id: 'sproutTanuki', name: '森芽狸', element: 'nature', symbol: '芽', description: '头顶的小芽会随着心情开合。',
    baseStats: { hp: 66, spirit: 64, focus: 58, speed: 62 }, moveIds: ['leafCut', 'starBump', 'seedBurst', 'vineArc'], tameRate: 0.45,
  },
  voltFinch: {
    id: 'voltFinch', name: '闪羽雀', element: 'electric', symbol: '闪', description: '总在追逐远处的亮光。',
    baseStats: { hp: 54, spirit: 72, focus: 46, speed: 82 }, moveIds: ['sparkNibble', 'starBump', 'staticBolt', 'thunderSkip'], tameRate: 0.36,
  },
  stoneShell: {
    id: 'stoneShell', name: '岩壳龟', element: 'rock', symbol: '岩', description: '步伐很慢，但很有耐心。',
    baseStats: { hp: 78, spirit: 60, focus: 82, speed: 32 }, moveIds: ['pebbleShot', 'starBump', 'stoneOrbit', 'cometDash'], tameRate: 0.34,
  },
  starlitBun: {
    id: 'starlitBun', name: '星辉兔', element: 'neutral', symbol: '星', description: '夜里耳尖会浮现微弱星点。',
    baseStats: { hp: 58, spirit: 58, focus: 54, speed: 76 }, moveIds: ['starBump', 'cometDash', 'pebbleShot', 'sparkNibble'], tameRate: 0.55,
  },
  auroraDeer: {
    id: 'auroraDeer', name: '曜角鹿', element: 'electric', symbol: '曜', description: '星落原野的古老守护星灵，角上流动着像极光一样的微光。',
    baseStats: { hp: 96, spirit: 82, focus: 70, speed: 68 }, moveIds: ['sparkNibble', 'cometDash', 'staticBolt', 'thunderSkip'], tameRate: 0.08,
  },
};

export const starterIds = ['emberMochi', 'rippleFin', 'sproutTanuki'] as const;
export const wildSpeciesIds = ['voltFinch', 'stoneShell', 'starlitBun', 'emberMochi', 'rippleFin', 'sproutTanuki'];
