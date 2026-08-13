export type ElementType = 'fire' | 'water' | 'nature' | 'electric' | 'rock' | 'neutral';

export interface BaseStats {
  hp: number;
  spirit: number;
  focus: number;
  speed: number;
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
}
