import { describe, expect, it } from 'vitest';
import { elementMultiplier } from '../data/moves';
import type { CreatureInstance } from '../types';
import {
  captureChance,
  ensureMovePp,
  expToNext,
  grantExp,
  maxHpFor,
  remainingPp,
  speedFor,
  spendMovePp,
  tickCondition,
} from './BattleSystem';

function creature(speciesId: string, level: number): CreatureInstance {
  const value: CreatureInstance = { uid: `test-${speciesId}`, speciesId, level, exp: 0, currentHp: 1 };
  value.currentHp = maxHpFor(value);
  ensureMovePp(value);
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

describe('move pp', () => {
  it('initializes and consumes pp without going below zero', () => {
    const partner = creature('emberMochi', 5);
    const initial = remainingPp(partner, 'emberTap');

    expect(initial).toBeGreaterThan(0);
    expect(spendMovePp(partner, 'emberTap')).toBe(true);
    expect(remainingPp(partner, 'emberTap')).toBe(initial - 1);

    partner.movePp = { ...partner.movePp, emberTap: 0 };
    expect(spendMovePp(partner, 'emberTap')).toBe(false);
    expect(remainingPp(partner, 'emberTap')).toBe(0);
  });
});

describe('battle conditions', () => {
  it('sluggish lowers effective speed', () => {
    const partner = creature('voltFinch', 8);
    const normal = speedFor(partner);
    partner.condition = { type: 'sluggish', turns: 2 };

    expect(speedFor(partner)).toBeLessThan(normal);
  });

  it('scorch removes hp and expires after its final turn', () => {
    const partner = creature('stoneShell', 8);
    const before = partner.currentHp;
    partner.condition = { type: 'scorch', turns: 1 };

    const tick = tickCondition(partner);

    expect(tick.points).toBeGreaterThan(0);
    expect(partner.currentHp).toBeLessThan(before);
    expect(tick.cleared).toBe(true);
    expect(partner.condition).toBeUndefined();
  });
});
