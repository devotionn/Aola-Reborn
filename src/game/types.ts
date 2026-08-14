export type ElementType = 'fire' | 'water' | 'nature' | 'electric' | 'rock' | 'neutral';
export type SceneKey = 'world' | 'wild' | 'grove';
export type ConditionType = 'scorch' | 'sluggish';

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

export interface MoveCondition {
  type: ConditionType;
  chance: number;
  turns: number;
}

export interface Move {
  id: string;
  name: string;
  element: ElementType;
  rating: number;
  accuracy: number;
  pp: number;
  description: string;
  condition?: MoveCondition;
}

export interface CreatureCondition {
  type: ConditionType;
  turns: number;
}

export interface CreatureInstance {
  uid: string;
  speciesId: string;
  level: number;
  exp: number;
  currentHp: number;
  movePp?: Record<string, number>;
  condition?: CreatureCondition;
}

export interface PlayerInventory {
  tonics: number;
}

export interface PlayerSave {
  version: 1;
  trainerName: string;
  credits: number;
  capsules: number;
  inventory?: PlayerInventory;
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
  battleTitle?: string;
  battleSubtitle?: string;
  captureBlockedMessage?: string;
}
