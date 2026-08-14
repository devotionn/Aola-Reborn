import { moves } from '../data/moves';
import type { PlayerSave } from '../types';
import { grantExp, maxHpFor, moveIdsFor, remainingPp, restorePartialMovePp } from './BattleSystem';

export const CAPSULE_SERVICE_FEE = 120;
export const CAPSULE_SERVICE_AMOUNT = 3;
export const TONIC_SERVICE_FEE = 90;
export const PP_REFILL_SERVICE_FEE = 110;
export const TRAINING_SERVICE_FEE = 140;
export const TRAINING_EXP = 42;

export interface ServiceResult {
  ok: boolean;
  message: string;
}

function ensureInventory(save: PlayerSave): void {
  save.inventory ??= { tonics: 0, ppRefills: 0 };
  save.inventory.tonics ??= 0;
  save.inventory.ppRefills ??= 0;
}

export function requestCapsuleSupply(save: PlayerSave): ServiceResult {
  if (save.credits < CAPSULE_SERVICE_FEE) return { ok: false, message: '星币不足。' };
  save.credits -= CAPSULE_SERVICE_FEE;
  save.capsules += CAPSULE_SERVICE_AMOUNT;
  return { ok: true, message: `补给完成：捕捉胶囊 ×${CAPSULE_SERVICE_AMOUNT}。` };
}

export function requestTonicSupply(save: PlayerSave): ServiceResult {
  ensureInventory(save);
  if (save.credits < TONIC_SERVICE_FEE) return { ok: false, message: '星币不足。' };
  save.credits -= TONIC_SERVICE_FEE;
  save.inventory!.tonics += 1;
  return { ok: true, message: '补给完成：星辉恢复剂 ×1。' };
}

export function requestPpRefillSupply(save: PlayerSave): ServiceResult {
  ensureInventory(save);
  if (save.credits < PP_REFILL_SERVICE_FEE) return { ok: false, message: '星币不足。' };
  save.credits -= PP_REFILL_SERVICE_FEE;
  save.inventory!.ppRefills += 1;
  return { ok: true, message: '补给完成：星能补充剂 ×1。' };
}

export function useTonicOnLeader(save: PlayerSave): ServiceResult {
  ensureInventory(save);
  const leader = save.party[0];
  if (!leader) return { ok: false, message: '当前没有队首伙伴。' };
  if (save.inventory!.tonics <= 0) return { ok: false, message: '没有可用的星辉恢复剂。' };
  const maximum = maxHpFor(leader);
  if (leader.currentHp >= maximum && !leader.condition) return { ok: false, message: '队首体力和状态都已经恢复。' };

  const restored = Math.max(1, Math.floor(maximum * 0.45));
  leader.currentHp = Math.min(maximum, leader.currentHp + restored);
  leader.condition = undefined;
  save.inventory!.tonics -= 1;
  return { ok: true, message: `使用星辉恢复剂，队首恢复至 ${leader.currentHp}/${maximum} HP，并清除异常状态。` };
}

export function usePpRefillOnLeader(save: PlayerSave): ServiceResult {
  ensureInventory(save);
  const leader = save.party[0];
  if (!leader) return { ok: false, message: '当前没有队首伙伴。' };
  if (save.inventory!.ppRefills <= 0) return { ok: false, message: '没有可用的星能补充剂。' };
  const depleted = moveIdsFor(leader).some((moveId) => remainingPp(leader, moveId) < moves[moveId].pp);
  if (!depleted) return { ok: false, message: '队首所有技能 PP 都是满状态。' };

  const restored = restorePartialMovePp(leader, 0.5);
  save.inventory!.ppRefills -= 1;
  return { ok: true, message: `使用星能补充剂，共恢复 ${restored} 点技能 PP。` };
}

export function runTrainingSession(save: PlayerSave): ServiceResult {
  if (save.credits < TRAINING_SERVICE_FEE) return { ok: false, message: '训练所需星币不足。' };
  const leader = save.party[0];
  if (!leader) return { ok: false, message: '当前没有可训练的队首伙伴。' };

  save.credits -= TRAINING_SERVICE_FEE;
  const result = grantExp(leader, TRAINING_EXP);
  if (result.grownTo && !save.discoveredSpecies.includes(result.grownTo)) save.discoveredSpecies.push(result.grownTo);
  const levelNote = result.levelsGained > 0 ? ` 升至 Lv.${leader.level}。` : '';
  const moveNote = result.queuedMoves.length > 0 ? ' 有新技能等待学习，可前往技能学习界面处理。' : '';
  return { ok: true, message: `训练完成：获得 ${TRAINING_EXP} EXP。${levelNote}${moveNote}` };
}