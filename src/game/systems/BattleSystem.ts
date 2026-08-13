import { moves, elementMultiplier } from '../data/moves';
import { species } from '../data/species';
import type { CreatureInstance, Move } from '../types';

export interface TurnOutcome {
  points: number;
  affinity: number;
  hit: boolean;
}

export function maxHpFor(creature: CreatureInstance): number {
  const base = species[creature.speciesId].baseStats.hp;
  return Math.floor(base + creature.level * 5.2);
}

export function speedFor(creature: CreatureInstance): number {
  return Math.floor(species[creature.speciesId].baseStats.speed + creature.level * 1.4);
}

export function resolveTurn(left: CreatureInstance, right: CreatureInstance, move: Move): TurnOutcome {
  const affinity = elementMultiplier(move.element, species[right.speciesId].element);
  if (Math.random() > move.accuracy) return { points: 0, affinity, hit: false };

  const spirit = species[left.speciesId].baseStats.spirit + left.level * 2.1;
  const focus = species[right.speciesId].baseStats.focus + right.level * 1.7;
  const raw = (((2 * left.level + 10) / 250) * (spirit / Math.max(1, focus)) * move.rating + 3);
  return { points: Math.max(1, Math.floor(raw * affinity)), affinity, hit: true };
}

export function applyTurn(left: CreatureInstance, right: CreatureInstance, move: Move): TurnOutcome {
  const outcome = resolveTurn(left, right, move);
  if (outcome.hit) right.currentHp = Math.max(0, right.currentHp - outcome.points);
  return outcome;
}

export function chooseNpcMove(creature: CreatureInstance): Move {
  const options = species[creature.speciesId].moveIds.map((id) => moves[id]);
  return options[Math.floor(Math.random() * options.length)];
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

export function captureChance(creature: CreatureInstance): number {
  const data = species[creature.speciesId];
  const hpRatio = creature.currentHp / maxHpFor(creature);
  return Math.min(0.92, Math.max(0.08, 0.12 + data.tameRate * 0.48 + (1 - hpRatio) * 0.5));
}

export function restoreCreature(creature: CreatureInstance): void {
  creature.currentHp = maxHpFor(creature);
}
