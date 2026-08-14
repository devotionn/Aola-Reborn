import Phaser from 'phaser';
import mistMapJson from '../maps/mist-wetland.json';
import { species } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { useTonicOnLeader } from '../systems/FacilitySystem';
import { collidesWithAny, containsPoint, findObject, objectsInLayer, type ObjectMapData } from '../systems/ObjectMapSystem';
import type { BattleRequest, PlayerSave } from '../types';

const mistMap = mistMapJson as ObjectMapData;
const mistWildPool = ['crystalDewSnail', 'rippleFin', 'starlitBun', 'voltFinch', 'mossLanternMoth'];

export class MistScene extends Phaser.Scene {
  private save!: PlayerSave;
  private player!: Phaser.GameObjects.Arc;
  private playerLabel!: Phaser.GameObjects.Text;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private statusText!: Phaser.GameObjects.Text;
  private encounterCooldown = 0;
  private readonly barriers = objectsInLayer(mistMap, 'Barriers');
  private readonly encounterZones = objectsInLayer(mistMap, 'EncounterZones');

  constructor() { super('mist'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    if (!save.flags?.groveQuestRewarded) { this.scene.start('grove'); return; }
    this.save = save;
    this.save.flags ??= {};
    this.save.inventory ??= { tonics: 0, ppRefills: 0 };

    this.cameras.main.setBackgroundColor('#667e85');
    this.drawMap();
    this.player = this.add.circle(640, 600, 18, 0xffefae).setStrokeStyle(4, 0x30405f).setDepth(30);
    this.playerLabel = this.add.text(640, 566, 'YOU', { fontSize: '11px', fontStyle: 'bold', color: '#17243d' }).setOrigin(0.5).setDepth(30);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');
    this.keys = keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.cursors = keyboard.createCursorKeys();
    keyboard.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    keyboard.on('keydown-E', () => this.interact());
    keyboard.on('keydown-B', () => this.openBag());
    keyboard.on('keydown-L', () => this.openMoveLearn());
    keyboard.on('keydown-H', () => this.useTonic());
    keyboard.on('keydown-ESC', () => this.returnToGrove());

    this.statusText = this.add.text(640, 684, '第三调查区前置探索 · E 调查 · B 背包 · L 学技能 · H 快速恢复 · ESC 返回林地', {
      fontSize: '14px', color: '#eef8ff', backgroundColor: '#10182ddd', padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setDepth(50);
    if (this.save.flags.mistBeaconSurveyed) this.statusText.setText('雾镜信标已完成初次记录。第三调查主线将在后续区域任务中继续。');
  }

  update(_time: number, delta: number): void {
    const speed = 0.27 * delta;
    let dx = 0;
    let dy = 0;
    if (this.keys.left.isDown || this.cursors.left.isDown) dx -= speed;
    if (this.keys.right.isDown || this.cursors.right.isDown) dx += speed;
    if (this.keys.up.isDown || this.cursors.up.isDown) dy -= speed;
    if (this.keys.down.isDown || this.cursors.down.isDown) dy += speed;
    if (dx === 0 && dy === 0) return;

    const nextX = Phaser.Math.Clamp(this.player.x + dx, 25, 1255);
    const nextY = Phaser.Math.Clamp(this.player.y + dy, 90, 655);
    if (!collidesWithAny(this.barriers, nextX, nextY, 18)) {
      this.player.setPosition(nextX, nextY);
      this.playerLabel.setPosition(nextX, nextY - 34);
    }

    this.encounterCooldown -= delta;
    if (this.inEncounterZone() && this.encounterCooldown <= 0 && Math.random() < 0.016) this.startEncounter();
  }

  private drawMap(): void {
    this.add.rectangle(640, 390, 1280, 660, 0x81959a);
    this.add.text(640, 50, '雾镜湿地', { fontSize: '34px', fontStyle: 'bold', color: '#eef8f6' }).setOrigin(0.5);
    this.add.text(640, 84, 'MIST MIRROR WETLAND · 第三调查区前置探索 · Tiled Object Map', { fontSize: '12px', color: '#d1e0df' }).setOrigin(0.5);

    this.barriers.forEach((object) => {
      const water = object.type === 'water';
      this.add.rectangle(object.x + object.width / 2, object.y + object.height / 2, object.width, object.height, water ? 0x5f8791 : 0x607769, 0.9)
        .setStrokeStyle(2, water ? 0xb6dde3 : 0x899c8d);
    });
    this.encounterZones.forEach((object) => {
      this.add.rectangle(object.x + object.width / 2, object.y + object.height / 2, object.width, object.height, 0x6f8e79, 0.72).setStrokeStyle(3, 0xa3bba1);
      this.add.text(object.x + object.width / 2, object.y + object.height / 2, object.name === 'silver-reeds' ? '银芦浅滩\n湿地遭遇区' : '雾岸草洲\n湿地遭遇区', {
        fontSize: '17px', fontStyle: 'bold', color: '#f1f7ee', align: 'center',
      }).setOrigin(0.5);
    });

    const beacon = findObject(mistMap, 'Points', 'survey-beacon');
    if (beacon) {
      const x = beacon.x + beacon.width / 2;
      const y = beacon.y + beacon.height / 2;
      this.add.circle(x, y, 42, 0x63758f).setStrokeStyle(4, 0xcce8ff);
      this.add.text(x, y, '镜', { fontSize: '25px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(x, y + 60, '雾镜信标 · E 记录', { fontSize: '13px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    }
    const gate = findObject(mistMap, 'Points', 'return-gate');
    if (gate) {
      this.add.rectangle(gate.x + gate.width / 2, gate.y + gate.height / 2, gate.width, gate.height, 0x415678, 0.96).setStrokeStyle(2, 0xb8ddff);
      this.add.text(gate.x + gate.width / 2, gate.y + gate.height / 2, '返回烬苔林地', { fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    }
  }

  private interact(): void {
    const beacon = findObject(mistMap, 'Points', 'survey-beacon');
    const gate = findObject(mistMap, 'Points', 'return-gate');
    if (beacon && containsPoint(beacon, this.player.x, this.player.y, 70)) {
      if (!this.save.flags?.mistBeaconSurveyed) {
        this.save.flags ??= {};
        this.save.flags.mistBeaconSurveyed = true;
        this.save.credits += 160;
        this.save.inventory ??= { tonics: 0, ppRefills: 0 };
        this.save.inventory.ppRefills += 1;
        writeSave(this.save);
        this.statusText.setText('完成雾镜信标初次记录：星币 ×160、星能补充剂 ×1。第三调查主线入口已建立。');
      } else {
        this.statusText.setText('信标记录稳定。更深处的雾镜调查将在下一阶段开放。');
      }
      return;
    }
    if (gate && containsPoint(gate, this.player.x, this.player.y, 35)) { this.returnToGrove(); return; }
    this.statusText.setText('薄雾覆盖水面，附近没有其他可交互目标。');
  }

  private inEncounterZone(): boolean {
    return this.encounterZones.some((zone) => containsPoint(zone, this.player.x, this.player.y));
  }

  private startEncounter(): void {
    const leader = this.save.party[0];
    if (leader.currentHp <= 1) {
      this.statusText.setText('队首体力太低，先返回星港恢复。');
      return;
    }
    this.encounterCooldown = 1800;
    const wildSpeciesId = mistWildPool[Math.floor(Math.random() * mistWildPool.length)];
    const request: BattleRequest = {
      wildSpeciesId,
      wildLevel: Phaser.Math.Clamp(leader.level + Phaser.Math.Between(1, 4), 8, 22),
      returnScene: 'mist',
    };
    this.statusText.setText(`雾岸里出现了 ${species[wildSpeciesId].name}！`);
    this.time.delayedCall(220, () => this.scene.start('battle', request));
  }

  private openBag(): void {
    writeSave(this.save);
    this.scene.start('bag', { returnScene: 'mist' });
  }

  private openMoveLearn(): void {
    const leader = this.save.party[0];
    if ((leader.pendingMoveIds?.length ?? 0) === 0) {
      this.statusText.setText('当前队首没有等待学习的新技能。');
      return;
    }
    writeSave(this.save);
    this.scene.start('moveLearn', { creatureUid: leader.uid, returnScene: 'mist' });
  }

  private useTonic(): void {
    const result = useTonicOnLeader(this.save);
    if (result.ok) writeSave(this.save);
    this.statusText.setText(result.message);
  }

  private returnToGrove(): void {
    writeSave(this.save);
    this.scene.start('grove');
  }
}