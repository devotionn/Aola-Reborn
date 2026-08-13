import { describe, expect, it } from 'vitest';
import { elementMultiplier } from '../data/moves';
import type { CreatureInstance } from '../types';
import { captureChance, expToNext, grantExp, maxHpFor } from './BattleSystem';

function creature(speciesId: string, level: number): CreatureInstance {
  const value: CreatureInstance = { uid: `test-${speciesId}`, speciesId, level, exp: 0, currentHp: 1 };
  value.currentHp = maxHpFor(value);
  return value;
}

describe('growth progression', () => {
  it('grows a starter when it reaches level 10', () => {
    const partner = creature('emberMochi', 9);
    partner.exp = expToNext(9) - 1;

    const result = grantExp(partner, 2);

    expect(partner.level).toBe(10);
    expect(partner.speciesId).toBe('solarFlare');
    expect(result.grownTo).toBe('solarFlare');
    expect(partner.currentHp).toBe(maxHpFor(partner));
  });

  it('does not repeat growth after the target form is reached', () => {
    const partner = creature('solarFlare', 10);
    const result = grantExp(partner, 1);

    expect(partner.speciesId).toBe('solarFlare');
    expect(result.grownTo).toBeUndefined();
  });
});

describe('capture probability', () => {
  it('improves as the wild creature loses hp and stays bounded', () => {
    const wild = creature('starlitBun', 5);
    const fullHpChance = captureChance(wild);
    wild.currentHp = 1;
    const lowHpChance = captureChance(wild);

    expect(lowHpChance).toBeGreaterThan(fullHpChance);
    expect(lowHpChance).toBeLessThanOrEqual(0.92);
    expect(fullHpChance).toBeGreaterThanOrEqual(0.08);
  });
});

describe('element relationships', () => {
  it('keeps configured strong and neutral relationships stable', () => {
    expect(elementMultiplier('fire', 'nature')).toBe(1.5);
    expect(elementMultiplier('water', 'fire')).toBe(1.5);
    expect(elementMultiplier('neutral', 'rock')).toBe(1);
  });
});
