import { moves, elementMultiplier } from '../data/moves';
import { species } from '../data/species';
import type { CreatureInstance, Move } from '../types';

export interface TurnOutcome {
  points: number;
  affinity: number;
  hit: boolean;
  appliedCondition?: string;
}

export interface GrowthResult {
  levelsGained: number;
  grownTo?: string;
}

export interface ConditionTick {
  points: number;
  message?: string;
  cleared: boolean;
}

export function maxHpFor(creature: CreatureInstance): number {
  const base = species[creature.speciesId].baseStats.hp;
  return Math.floor(base + creature.level * 5.2);
}

export function speedFor(creature: CreatureInstance): number {
  const base = Math.floor(species[creature.speciesId].baseStats.speed + creature.level * 1.4);
  return creature.condition?.type === 'sluggish' ? Math.max(1, Math.floor(base * 0.75)) : base;
}

export function ensureMovePp(creature: CreatureInstance): Record<string, number> {
  creature.movePp ??= {};
  species[creature.speciesId].moveIds.forEach((moveId) => {
    if (creature.movePp?.[moveId] === undefined) creature.movePp![moveId] = moves[moveId].pp;
  });
  return creature.movePp;
}

export function remainingPp(creature: CreatureInstance, moveId: string): number {
  return ensureMovePp(creature)[moveId] ?? 0;
}

export function spendMovePp(creature: CreatureInstance, moveId: string): boolean {
  const pool = ensureMovePp(creature);
  const current = pool[moveId] ?? 0;
  if (current <= 0) return false;
  pool[moveId] = current - 1;
  return true;
}

export function restoreMovePp(creature: CreatureInstance): void {
  creature.movePp = {};
  ensureMovePp(creature);
}

export function resolveTurn(left: CreatureInstance, right: CreatureInstance, move: Move): TurnOutcome {
  const affinity = elementMultiplier(move.element, species[right.speciesId].element);
  if (Math.random() > move.accuracy) return { points: 0, affinity, hit: false };

  const spirit = species[left.speciesId].baseStats.spirit + left.level * 2.1;
  const focus = species[right.speciesId].baseStats.focus + right.level * 1.7;
  const raw = (((2 * left.level + 10) / 250) * (spirit / Math.max(1, focus)) * move.rating + 3);
  const outcome: TurnOutcome = { points: Math.max(1, Math.floor(raw * affinity)), affinity, hit: true };

  if (move.condition && !right.condition && Math.random() <= move.condition.chance) {
    right.condition = { type: move.condition.type, turns: move.condition.turns };
    outcome.appliedCondition = move.condition.type;
  }
  return outcome;
}

export function applyTurn(left: CreatureInstance, right: CreatureInstance, move: Move): TurnOutcome {
  const outcome = resolveTurn(left, right, move);
  if (outcome.hit) right.currentHp = Math.max(0, right.currentHp - outcome.points);
  return outcome;
}

export function tickCondition(creature: CreatureInstance): ConditionTick {
  const condition = creature.condition;
  if (!condition || creature.currentHp <= 0) return { points: 0, cleared: false };

  let points = 0;
  let message: string | undefined;
  if (condition.type === 'scorch') {
    points = Math.max(1, Math.floor(maxHpFor(creature) * 0.06));
    creature.currentHp = Math.max(0, creature.currentHp - points);
    message = `${species[creature.speciesId].name} 受到灼热影响，失去 ${points} HP。`;
  } else if (condition.type === 'sluggish') {
    message = `${species[creature.speciesId].name} 仍处于迟缓状态。`;
  }

  condition.turns -= 1;
  const cleared = condition.turns <= 0;
  if (cleared) creature.condition = undefined;
  return { points, message, cleared };
}

export function chooseNpcMove(creature: CreatureInstance): Move {
  const ids = species[creature.speciesId].moveIds;
  const available = ids.filter((id) => remainingPp(creature, id) > 0);
  const pool = available.length > 0 ? available : ids;
  const id = pool[Math.floor(Math.random() * pool.length)];
  if (available.length > 0) spendMovePp(creature, id);
  return moves[id];
}

export function expToNext(level: number): number {
  return 30 + level * 14;
}

export function applyGrowth(creature: CreatureInstance): string | undefined {
  const rule = species[creature.speciesId].growth;
  if (!rule || creature.level < rule.level || !species[rule.targetSpeciesId]) return undefined;
  creature.speciesId = rule.targetSpeciesId;
  creature.currentHp = maxHpFor(creature);
  creature.movePp = {};
  ensureMovePp(creature);
  return rule.targetSpeciesId;
}

export function grantExp(creature: CreatureInstance, amount: number): GrowthResult {
  let levelsGained = 0;
  let grownTo: string | undefined;
  creature.exp += amount;
  while (creature.exp >= expToNext(creature.level)) {
    creature.exp -= expToNext(creature.level);
    creature.level += 1;
    levelsGained += 1;
    grownTo = applyGrowth(creature) ?? grownTo;
    creature.currentHp = maxHpFor(creature);
  }
  grownTo = applyGrowth(creature) ?? grownTo;
  return { levelsGained, grownTo };
}

export function captureChance(creature: CreatureInstance): number {
  const data = species[creature.speciesId];
  const hpRatio = creature.currentHp / maxHpFor(creature);
  return Math.min(0.92, Math.max(0.08, 0.12 + data.tameRate * 0.48 + (1 - hpRatio) * 0.5));
}

export function restoreCreature(creature: CreatureInstance): void {
  creature.currentHp = maxHpFor(creature);
  creature.condition = undefined;
  restoreMovePp(creature);
}
