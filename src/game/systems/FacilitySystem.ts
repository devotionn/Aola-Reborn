import type { PlayerSave } from '../types';
import { grantExp, maxHpFor } from './BattleSystem';

export const CAPSULE_SERVICE_FEE = 120;
export const CAPSULE_SERVICE_AMOUNT = 3;
export const TONIC_SERVICE_FEE = 90;
export const TRAINING_SERVICE_FEE = 140;
export const TRAINING_EXP = 42;

export interface ServiceResult {
  ok: boolean;
  message: string;
}

export function requestCapsuleSupply(save: PlayerSave): ServiceResult {
  if (save.credits < CAPSULE_SERVICE_FEE) return { ok: false, message: '星币不足。' };
  save.credits -= CAPSULE_SERVICE_FEE;
  save.capsules += CAPSULE_SERVICE_AMOUNT;
  return { ok: true, message: `补给完成：捕捉胶囊 ×${CAPSULE_SERVICE_AMOUNT}。` };
}

export function requestTonicSupply(save: PlayerSave): ServiceResult {
  save.inventory ??= { tonics: 0 };
  if (save.credits < TONIC_SERVICE_FEE) return { ok: false, message: '星币不足。' };
  save.credits -= TONIC_SERVICE_FEE;
  save.inventory.tonics += 1;
  return { ok: true, message: '补给完成：星辉恢复剂 ×1。' };
}

export function useTonicOnLeader(save: PlayerSave): ServiceResult {
  save.inventory ??= { tonics: 0 };
  const leader = save.party[0];
  if (!leader) return { ok: false, message: '当前没有队首伙伴。' };
  if (save.inventory.tonics <= 0) return { ok: false, message: '没有可用的星辉恢复剂。' };
  const maximum = maxHpFor(leader);
  if (leader.currentHp >= maximum && !leader.condition) return { ok: false, message: '队首体力和状态都已经恢复。' };

  const restored = Math.max(1, Math.floor(maximum * 0.45));
  leader.currentHp = Math.min(maximum, leader.currentHp + restored);
  leader.condition = undefined;
  save.inventory.tonics -= 1;
  return { ok: true, message: `使用星辉恢复剂，队首恢复至 ${leader.currentHp}/${maximum} HP，并清除异常状态。` };
}

export function runTrainingSession(save: PlayerSave): ServiceResult {
  if (save.credits < TRAINING_SERVICE_FEE) return { ok: false, message: '训练所需星币不足。' };
  const leader = save.party[0];
  if (!leader) return { ok: false, message: '当前没有可训练的队首伙伴。' };

  save.credits -= TRAINING_SERVICE_FEE;
  const result = grantExp(leader, TRAINING_EXP);
  if (result.grownTo && !save.discoveredSpecies.includes(result.grownTo)) save.discoveredSpecies.push(result.grownTo);
  const levelNote = result.levelsGained > 0 ? ` 升至 Lv.${leader.level}。` : '';
  return { ok: true, message: `训练完成：获得 ${TRAINING_EXP} EXP。${levelNote}` };
}
