export type ElementType = 'fire' | 'water' | 'nature' | 'electric' | 'rock' | 'neutral';
export type SceneKey = 'world' | 'wild';

export interface BaseStats {
  hp: number;
  spirit: number;
  focus: number;
  speed: number;
}

export interface GrowthRule {
  level: number;
  targetSpeciesId: string;
}

export interface Species {
  id: string;
  name: string;
  element: ElementType;
  symbol: string;
  description: string;
  baseStats: BaseStats;
  moveIds: string[];
  tameRate: number;
  growth?: GrowthRule;
}

export interface Move {
  id: string;
  name: string;
  element: ElementType;
  rating: number;
  accuracy: number;
  description: string;
}

export interface CreatureInstance {
  uid: string;
  speciesId: string;
  level: number;
  exp: number;
  currentHp: number;
}

export interface PlayerSave {
  version: 1;
  trainerName: string;
  credits: number;
  capsules: number;
  party: CreatureInstance[];
  collection: CreatureInstance[];
  discoveredSpecies: string[];
  world: { x: number; y: number };
  flags?: Record<string, boolean>;
}

export interface BattleRequest {
  wildSpeciesId: string;
  wildLevel: number;
  returnScene?: SceneKey;
  boss?: boolean;
  rewardCredits?: number;
  victoryFlag?: string;
}
