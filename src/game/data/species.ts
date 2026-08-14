import type { Species } from '../types';

export const species: Record<string, Species> = {
  emberMochi: {
    id: 'emberMochi', name: '炽尾团子', element: 'fire', symbol: '炎', description: '热情又好奇的旅行伙伴。',
    baseStats: { hp: 62, spirit: 70, focus: 52, speed: 64 }, moveIds: ['emberTap', 'starBump', 'flareRush', 'solarBlink'], tameRate: 0.42,
    growth: { level: 10, targetSpeciesId: 'solarFlare' },
  },
  solarFlare: {
    id: 'solarFlare', name: '曜焰灵', element: 'fire', symbol: '曜炎', description: '炽尾团子成长后的姿态，尾焰像一枚持续燃烧的小太阳。',
    baseStats: { hp: 78, spirit: 88, focus: 65, speed: 76 }, moveIds: ['flareRush', 'solarBlink', 'starBump', 'cometDash'],
    learnset: [{ level: 12, moveId: 'novaPounce' }], tameRate: 0.18,
  },
  rippleFin: {
    id: 'rippleFin', name: '澜鳍兽', element: 'water', symbol: '澜', description: '喜欢在星港水边散步。',
    baseStats: { hp: 68, spirit: 62, focus: 60, speed: 58 }, moveIds: ['bubblePop', 'starBump', 'tidePulse', 'moonTide'], tameRate: 0.44,
    growth: { level: 10, targetSpeciesId: 'azureTide' },
  },
  azureTide: {
    id: 'azureTide', name: '沧澜兽', element: 'water', symbol: '沧', description: '澜鳍兽成长后的姿态，可以感知很远处的潮汐与星光。',
    baseStats: { hp: 86, spirit: 78, focus: 78, speed: 67 }, moveIds: ['tidePulse', 'moonTide', 'bubblePop', 'cometDash'],
    learnset: [{ level: 12, moveId: 'abyssalCurrent' }], tameRate: 0.18,
  },
  sproutTanuki: {
    id: 'sproutTanuki', name: '森芽狸', element: 'nature', symbol: '芽', description: '头顶的小芽会随着心情开合。',
    baseStats: { hp: 66, spirit: 64, focus: 58, speed: 62 }, moveIds: ['leafCut', 'starBump', 'seedBurst', 'vineArc'], tameRate: 0.45,
    growth: { level: 10, targetSpeciesId: 'groveCrown' },
  },
  groveCrown: {
    id: 'groveCrown', name: '森冠狸', element: 'nature', symbol: '森', description: '森芽狸成长后的姿态，枝叶形成了像王冠一样的纹路。',
    baseStats: { hp: 84, spirit: 80, focus: 74, speed: 72 }, moveIds: ['vineArc', 'seedBurst', 'leafCut', 'cometDash'],
    learnset: [{ level: 12, moveId: 'thornHalo' }], tameRate: 0.18,
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
  mossLanternMoth: {
    id: 'mossLanternMoth', name: '苔灯蛾', element: 'nature', symbol: '苔', description: '只在烬苔林地暮色中出现，翅面会吸附星屑并泛出柔和绿光。',
    baseStats: { hp: 60, spirit: 76, focus: 55, speed: 79 }, moveIds: ['leafCut', 'seedBurst', 'staticBolt', 'cometDash'], tameRate: 0.3,
  },
  crystalDewSnail: {
    id: 'crystalDewSnail', name: '晶露蜗', element: 'water', symbol: '露', description: '栖息在晶湖湿润岩面上的缓慢星灵，透明外壳会把月光折成细碎光点。',
    baseStats: { hp: 82, spirit: 57, focus: 84, speed: 29 }, moveIds: ['bubblePop', 'pebbleShot', 'tidePulse', 'stoneOrbit'],
    learnset: [{ level: 11, moveId: 'moonTide' }], tameRate: 0.28,
  },
  auroraDeer: {
    id: 'auroraDeer', name: '曜角鹿', element: 'electric', symbol: '曜', description: '星落原野的古老守护星灵，角上流动着像极光一样的微光。',
    baseStats: { hp: 96, spirit: 82, focus: 70, speed: 68 }, moveIds: ['sparkNibble', 'cometDash', 'staticBolt', 'thunderSkip'], tameRate: 0.08,
  },
};

export const starterIds = ['emberMochi', 'rippleFin', 'sproutTanuki'] as const;
export const wildSpeciesIds = ['voltFinch', 'stoneShell', 'starlitBun', 'emberMochi', 'rippleFin', 'sproutTanuki'];