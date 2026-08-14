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
  queuedMoves: string[];
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

export function moveIdsFor(creature: CreatureInstance): string[] {
  const fallback = species[creature.speciesId].moveIds.slice(0, 4);
  const normalized = (creature.moveIds ?? fallback).filter((id) => Boolean(moves[id])).slice(0, 4);
  creature.moveIds = normalized.length > 0 ? normalized : fallback;
  return creature.moveIds;
}

export function ensureMovePp(creature: CreatureInstance): Record<string, number> {
  creature.movePp ??= {};
  moveIdsFor(creature).forEach((moveId) => {
    if (creature.movePp?.[moveId] === undefined) creature.movePp![moveId] = moves[moveId].pp;
    creature.movePp![moveId] = Math.min(creature.movePp![moveId], moves[moveId].pp);
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

export function allMovePpDepleted(creature: CreatureInstance): boolean {
  return moveIdsFor(creature).every((moveId) => remainingPp(creature, moveId) <= 0);
}

export function choosePlayerMove(creature: CreatureInstance, slot: number): Move | null {
  if (allMovePpDepleted(creature)) return moves.strugglePulse;
  const moveId = moveIdsFor(creature)[slot];
  if (!moveId || !spendMovePp(creature, moveId)) return null;
  return moves[moveId];
}

export function restoreMovePp(creature: CreatureInstance): void {
  creature.movePp = {};
  ensureMovePp(creature);
}

export function restorePartialMovePp(creature: CreatureInstance, ratio = 0.5): number {
  const pool = ensureMovePp(creature);
  let restored = 0;
  moveIdsFor(creature).forEach((moveId) => {
    const maximum = moves[moveId].pp;
    const current = pool[moveId] ?? 0;
    const target = Math.min(maximum, current + Math.max(1, Math.ceil(maximum * ratio)));
    restored += target - current;
    pool[moveId] = target;
  });
  return restored;
}

export function replaceMove(creature: CreatureInstance, slot: number, newMoveId: string): boolean {
  if (!moves[newMoveId] || slot < 0 || slot > 3) return false;
  const current = moveIdsFor(creature);
  if (current.includes(newMoveId)) return false;
  const oldMoveId = current[slot];
  if (!oldMoveId) return false;
  current[slot] = newMoveId;
  creature.moveIds = current;
  creature.movePp ??= {};
  delete creature.movePp[oldMoveId];
  creature.movePp[newMoveId] = moves[newMoveId].pp;
  creature.pendingMoveIds = (creature.pendingMoveIds ?? []).filter((id) => id !== newMoveId);
  return true;
}

function queueLearnableMoves(creature: CreatureInstance): string[] {
  const rules = species[creature.speciesId].learnset ?? [];
  const known = new Set(moveIdsFor(creature));
  creature.pendingMoveIds ??= [];
  const queued: string[] = [];

  rules.forEach((rule) => {
    if (rule.level > creature.level || known.has(rule.moveId) || creature.pendingMoveIds?.includes(rule.moveId) || !moves[rule.moveId]) return;
    if (creature.moveIds!.length < 4) {
      creature.moveIds!.push(rule.moveId);
      creature.movePp ??= {};
      creature.movePp[rule.moveId] = moves[rule.moveId].pp;
      known.add(rule.moveId);
    } else {
      creature.pendingMoveIds!.push(rule.moveId);
      queued.push(rule.moveId);
    }
  });
  return queued;
}

export function normalizeCreatureMoves(creature: CreatureInstance): void {
  moveIdsFor(creature);
  creature.pendingMoveIds ??= [];
  ensureMovePp(creature);
  queueLearnableMoves(creature);
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
  const ids = moveIdsFor(creature);
  const available = ids.filter((id) => remainingPp(creature, id) > 0);
  if (available.length === 0) return moves.strugglePulse;
  const id = available[Math.floor(Math.random() * available.length)];
  spendMovePp(creature, id);
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
  creature.moveIds = species[rule.targetSpeciesId].moveIds.slice(0, 4);
  creature.pendingMoveIds = [];
  creature.movePp = {};
  ensureMovePp(creature);
  return rule.targetSpeciesId;
}

export function grantExp(creature: CreatureInstance, amount: number): GrowthResult {
  let levelsGained = 0;
  let grownTo: string | undefined;
  const queuedMoves: string[] = [];
  creature.exp += amount;
  while (creature.exp >= expToNext(creature.level)) {
    creature.exp -= expToNext(creature.level);
    creature.level += 1;
    levelsGained += 1;
    grownTo = applyGrowth(creature) ?? grownTo;
    creature.currentHp = maxHpFor(creature);
    queuedMoves.push(...queueLearnableMoves(creature));
  }
  grownTo = applyGrowth(creature) ?? grownTo;
  queuedMoves.push(...queueLearnableMoves(creature));
  return { levelsGained, grownTo, queuedMoves: [...new Set(queuedMoves)] };
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
