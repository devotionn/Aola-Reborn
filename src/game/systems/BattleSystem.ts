import { moves, elementMultiplier } from '../data/moves';
import { species } from '../data/species';
import type { CreatureInstance, Move } from '../types';

export interface TurnOutcome {
  points: number;
  affinity: number;
}

export function maxHpFor(creature: CreatureInstance): number {
  const base = species[creature.speciesId].baseStats.hp;
  return Math.floor(base + creature.level * 5.2);
}

export function speedFor(creature: CreatureInstance): number {
  return Math.floor(species[creature.speciesId].baseStats.speed + creature.level * 1.4);
}

export function resolveTurn(left: CreatureInstance, right: CreatureInstance, move: Move): TurnOutcome {
  const spirit = species[left.speciesId].baseStats.spirit + left.level * 2.1;
  const focus = species[right.speciesId].baseStats.focus + right.level * 1.7;
  const affinity = elementMultiplier(move.element, species[right.speciesId].element);
  const raw = (((2 * left.level + 10) / 250) * (spirit / Math.max(1, focus)) * move.rating + 3);
  return { points: Math.max(1, Math.floor(raw * affinity)), affinity };
}

export function chooseNpcMove(creature: CreatureInstance): Move {
  const options = species[creature.speciesId].moveIds.map((id) => moves[id]);
  return options[creature.level % options.length];
}

export function expToNext(level: number): number {
  return 30 + level * 14;
}

export function grantExp(creature: CreatureInstance, amount: number): { levelsGained: number } {
  let levelsGained = 0;
  creature.exp += amount;
  while (creature.exp >= expToNext(creature.level)) {
    creature.exp -= expToNext(creature.level);
    creature.level += 1;
    levelsGained += 1;
    creature.currentHp = maxHpFor(creature);
  }
  return { levelsGained };
}

export function tameReady(creature: CreatureInstance): boolean {
  const data = species[creature.speciesId];
  const hpRatio = creature.currentHp / maxHpFor(creature);
  return hpRatio <= 0.28 + data.tameRate * 0.45;
}
