import { species } from '../data/species';
import type { CreatureInstance, PlayerSave } from '../types';
import { maxHpFor } from '../systems/BattleSystem';

const SAVE_KEY = 'aola-reborn.save.v1';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createCreature(speciesId: string, level: number): CreatureInstance {
  const creature: CreatureInstance = { uid: uid(), speciesId, level, exp: 0, currentHp: 1 };
  creature.currentHp = maxHpFor(creature);
  return creature;
}

export function createFreshSave(starterId: string): PlayerSave {
  if (!species[starterId]) throw new Error(`Unknown starter: ${starterId}`);
  const starter = createCreature(starterId, 5);
  return {
    version: 1,
    trainerName: '星际训练师',
    credits: 800,
    capsules: 8,
    party: [starter],
    collection: [],
    discoveredSpecies: [starterId],
    world: { x: 640, y: 430 },
  };
}

export function loadSave(): PlayerSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerSave;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSave(save: PlayerSave): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
