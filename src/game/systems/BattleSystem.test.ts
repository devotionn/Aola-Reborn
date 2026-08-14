import { describe, expect, it } from 'vitest';
import { elementMultiplier } from '../data/moves';
import type { CreatureInstance, PlayerSave } from '../types';
import {
  allMovePpDepleted,
  captureChance,
  chooseNpcMove,
  choosePlayerMove,
  ensureMovePp,
  expToNext,
  grantExp,
  maxHpFor,
  moveIdsFor,
  remainingPp,
  replaceMove,
  speedFor,
  spendMovePp,
  tickCondition,
} from './BattleSystem';
import { usePpRefillOnCreature, usePpRefillOnLeader, useTonicOnCreature } from './FacilitySystem';

function creature(speciesId: string, level: number): CreatureInstance {
  const value: CreatureInstance = { uid: `test-${speciesId}-${level}`, speciesId, level, exp: 0, currentHp: 1 };
  value.currentHp = maxHpFor(value);
  ensureMovePp(value);
  return value;
}

function saveWithParty(party: CreatureInstance[]): PlayerSave {
  return {
    version: 1,
    trainerName: 'test',
    credits: 0,
    capsules: 0,
    inventory: { tonics: 1, ppRefills: 1 },
    party,
    collection: [],
    discoveredSpecies: party.map((member) => member.speciesId),
    world: { x: 0, y: 0 },
    flags: {},
  };
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

  it('queues a level move when the four move slots are full', () => {
    const partner = creature('solarFlare', 11);
    partner.exp = expToNext(11) - 1;

    const result = grantExp(partner, 2);

    expect(partner.level).toBe(12);
    expect(result.queuedMoves).toContain('novaPounce');
    expect(partner.pendingMoveIds).toContain('novaPounce');
    expect(moveIdsFor(partner)).toHaveLength(4);
  });

  it('replaces a chosen move slot and clears the learned move from the queue', () => {
    const partner = creature('solarFlare', 12);
    partner.pendingMoveIds = ['novaPounce'];
    const oldMove = moveIdsFor(partner)[0];

    expect(replaceMove(partner, 0, 'novaPounce')).toBe(true);
    expect(moveIdsFor(partner)[0]).toBe('novaPounce');
    expect(moveIdsFor(partner)).not.toContain(oldMove);
    expect(partner.pendingMoveIds).not.toContain('novaPounce');
  });

  it('grows both Ember Moss Grove exclusive creatures at level 14', () => {
    const moth = creature('mossLanternMoth', 13);
    moth.exp = expToNext(13) - 1;
    const snail = creature('crystalDewSnail', 13);
    snail.exp = expToNext(13) - 1;

    grantExp(moth, 2);
    grantExp(snail, 2);

    expect(moth.speciesId).toBe('verdantLampwing');
    expect(snail.speciesId).toBe('moonCrystalSnail');
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

  it('uses the fallback action when an npc has no pp left', () => {
    const visitor = creature('stoneShell', 8);
    moveIdsFor(visitor).forEach((moveId) => { visitor.movePp![moveId] = 0; });

    expect(chooseNpcMove(visitor).id).toBe('strugglePulse');
  });

  it('uses the fallback action when the player has no pp left', () => {
    const partner = creature('emberMochi', 8);
    moveIdsFor(partner).forEach((moveId) => { partner.movePp![moveId] = 0; });

    expect(allMovePpDepleted(partner)).toBe(true);
    expect(choosePlayerMove(partner, 0)?.id).toBe('strugglePulse');
  });

  it('restores partial pp from a player inventory refill', () => {
    const partner = creature('emberMochi', 5);
    const moveId = moveIdsFor(partner)[0];
    partner.movePp![moveId] = 0;
    const save = saveWithParty([partner]);

    const result = usePpRefillOnLeader(save);

    expect(result.ok).toBe(true);
    expect(save.inventory?.ppRefills).toBe(0);
    expect(remainingPp(partner, moveId)).toBeGreaterThan(0);
  });

  it('can target pp recovery at a non-leader party member', () => {
    const leader = creature('emberMochi', 7);
    const second = creature('stoneShell', 7);
    const moveId = moveIdsFor(second)[0];
    second.movePp![moveId] = 0;
    const save = saveWithParty([leader, second]);

    const result = usePpRefillOnCreature(save, second.uid);

    expect(result.ok).toBe(true);
    expect(remainingPp(second, moveId)).toBeGreaterThan(0);
    expect(save.inventory?.ppRefills).toBe(0);
  });
});

describe('recovery items', () => {
  it('does not let a normal tonic revive a fainted party member', () => {
    const leader = creature('emberMochi', 7);
    const fainted = creature('starlitBun', 7);
    fainted.currentHp = 0;
    const save = saveWithParty([leader, fainted]);

    const result = useTonicOnCreature(save, fainted.uid);

    expect(result.ok).toBe(false);
    expect(fainted.currentHp).toBe(0);
    expect(save.inventory?.tonics).toBe(1);
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
