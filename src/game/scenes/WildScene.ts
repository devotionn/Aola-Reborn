import Phaser from 'phaser';
import fieldMapJson from '../maps/starfall-field.json';
import { species, wildSpeciesIds } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { maxHpFor } from '../systems/BattleSystem';
import { useTonicOnLeader } from '../systems/FacilitySystem';
import { collidesWithAny, containsPoint, findObject, objectsInLayer, type ObjectMapData } from '../systems/ObjectMapSystem';
import type { BattleRequest, PlayerSave } from '../types';
import { DialogueBox } from '../ui/DialogueBox';

const fieldMap = fieldMapJson as ObjectMapData;

export class WildScene extends Phaser.Scene {
  private save!: PlayerSave;
  private player!: Phaser.GameObjects.Arc;
  private playerLabel!: Phaser.GameObjects.Text;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private statusText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private dialogue?: DialogueBox;
  private encounterCooldown = 0;
  private readonly barriers = objectsInLayer(fieldMap, 'Barriers');
  private readonly encounterZones = objectsInLayer(fieldMap, 'EncounterZones');

  constructor() { super('wild'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;
    this.save.flags ??= {};

    this.cameras.main.setBackgroundColor('#7fae92');
    this.drawMap();
    this.player = this.add.circle(640, 590, 18, 0xffef9b).setStrokeStyle(4, 0x2c4262).setDepth(30);
    this.playerLabel = this.add.text(640, 556, 'YOU', { fontSize: '11px', fontStyle: 'bold', color: '#17243d' }).setOrigin(0.5).setDepth(30);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');
    this.keys = keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.cursors = keyboard.createCursorKeys();
    keyboard.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    keyboard.on('keydown-E', () => this.interact());
    keyboard.on('keydown-H', () => this.useTonic());
    keyboard.on('keydown-SPACE', () => this.dialogue?.next());
    keyboard.on('keydown-ESC', () => this.returnToHub());

    this.statusText = this.add.text(640, 682, 'WASD 移动 · E 交互 · H 恢复剂 · Tiled 碰撞/遭遇 · ESC 返回星港', {
      fontSize: '14px', color: '#eef8ff', backgroundColor: '#0d1738dd', padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setDepth(50);
    this.questText = this.add.text(34, 30, '', {
      fontSize: '15px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#0d1738cc', padding: { x: 14, y: 10 },
    }).setDepth(50);
    this.refreshQuest();

    if (this.save.flags.wildGuardianDefeated && !this.save.flags.wildQuestRewarded) {
      this.statusText.setText('曜角鹿已经平静下来。回去找研究员岚音领取调查奖励。');
    } else if (this.save.flags.wildQuestRewarded && !this.save.flags.groveQuestRewarded) {
      this.statusText.setText('远星门已经校准：北侧可前往第二调查区「烬苔林地」。');
    }
  }

  update(_time: number, delta: number): void {
    if (this.dialogue) return;
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
    if (this.inEncounterZone() && this.encounterCooldown <= 0 && Math.random() < 0.018) this.startWildEncounter();
  }

  private drawMap(): void {
    this.add.rectangle(640, 390, 1280, 660, 0x96c7a0);
    this.add.text(640, 52, '星落原野', { fontSize: '34px', fontStyle: 'bold', color: '#233a32' }).setOrigin(0.5);
    this.add.text(640, 86, 'STARFALL FIELD · 第一调查区 · Tiled Object Map', { fontSize: '12px', color: '#3d5a50' }).setOrigin(0.5);

    this.barriers.forEach((object) => {
      const isWater = object.type === 'water';
      const color = isWater ? 0x6ba5b6 : object.name.includes('rocks') ? 0x6d7b70 : 0x56785b;
      this.add.rectangle(object.x + object.width / 2, object.y + object.height / 2, object.width, object.height, color, 0.9)
        .setStrokeStyle(2, isWater ? 0xbcecf2 : 0x879886);
    });

    this.encounterZones.forEach((object) => {
      this.add.rectangle(object.x + object.width / 2, object.y + object.height / 2, object.width, object.height, 0x5d9f66, 0.78)
        .setStrokeStyle(3, 0x3d7748);
      const label = object.name === 'glow-grass-slope' ? '萤草坡\n随机遭遇区' : '碎星草甸\n随机遭遇区';
      this.add.text(object.x + object.width / 2, object.y + object.height / 2, label, {
        fontSize: '18px', fontStyle: 'bold', color: '#173b24', align: 'center',
      }).setOrigin(0.5);
    });

    const researcher = findObject(fieldMap, 'Points', 'researcher');
    if (researcher) {
      const x = researcher.x + researcher.width / 2;
      const y = researcher.y + researcher.height / 2;
      this.add.circle(x, y, 34, 0x335d79).setStrokeStyle(3, 0xc8ecff);
      this.add.text(x, y, '岚', { fontSize: '22px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(x, y + 52, '研究员 · 岚音', { fontSize: '14px', fontStyle: 'bold', color: '#17354b', backgroundColor: '#d9f2ffcc', padding: { x: 8, y: 4 } }).setOrigin(0.5);
    }

    const altar = findObject(fieldMap, 'Points', 'ancient-altar');
    if (altar) {
      const x = altar.x + altar.width / 2;
      const y = altar.y + altar.height / 2;
      this.add.circle(x, y, 52, 0x587a93, 0.78).setStrokeStyle(5, 0xb5ddff);
      this.add.text(x, y, '曜', { fontSize: '30px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(x, y + 70, '古星祭坛 · E 调查', { fontSize: '13px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#304b68cc', padding: { x: 10, y: 5 } }).setOrigin(0.5);
    }

    const homeGate = findObject(fieldMap, 'Points', 'return-gate');
    if (homeGate) {
      this.add.rectangle(homeGate.x + homeGate.width / 2, homeGate.y + homeGate.height / 2, homeGate.width, homeGate.height, 0x31568a, 0.96).setStrokeStyle(2, 0xa8d7ff);
      this.add.text(homeGate.x + homeGate.width / 2, homeGate.y + homeGate.height / 2, '返回星港', { fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    }

    const farGate = findObject(fieldMap, 'Points', 'far-gate');
    if (farGate) {
      const unlocked = Boolean(this.save.flags?.wildQuestRewarded);
      this.add.rectangle(farGate.x + farGate.width / 2, farGate.y + farGate.height / 2, farGate.width, farGate.height, unlocked ? 0x66558d : 0x565d69, 0.96)
        .setStrokeStyle(2, unlocked ? 0xd8c8ff : 0x8b919c);
      this.add.text(farGate.x + farGate.width / 2, farGate.y + farGate.height / 2, unlocked ? '远星门 · 烬苔林地' : '远星门 · 尚未校准', {
        fontSize: '13px', fontStyle: 'bold', color: unlocked ? '#f6efff' : '#c5c8cf',
      }).setOrigin(0.5);
    }
  }

  private interact(): void {
    if (this.dialogue) { this.dialogue.next(); return; }
    const researcher = findObject(fieldMap, 'Points', 'researcher');
    const altar = findObject(fieldMap, 'Points', 'ancient-altar');
    const homeGate = findObject(fieldMap, 'Points', 'return-gate');
    const farGate = findObject(fieldMap, 'Points', 'far-gate');

    if (researcher && containsPoint(researcher, this.player.x, this.player.y, 65)) { this.talkResearcher(); return; }
    if (altar && containsPoint(altar, this.player.x, this.player.y, 65)) { this.inspectAltar(); return; }
    if (homeGate && containsPoint(homeGate, this.player.x, this.player.y, 35)) { this.returnToHub(); return; }
    if (farGate && containsPoint(farGate, this.player.x, this.player.y, 45)) {
      if (!this.save.flags?.wildQuestRewarded) {
        this.statusText.setText('远星门还没有完成校准。先完成星落原野的调查。');
        return;
      }
      writeSave(this.save);
      this.scene.start('grove');
      return;
    }
    this.statusText.setText('风吹过草地，附近暂时没有可以交互的目标。');
  }

  private useTonic(): void {
    if (this.dialogue) return;
    const result = useTonicOnLeader(this.save);
    if (result.ok) writeSave(this.save);
    this.statusText.setText(result.message);
  }

  private talkResearcher(): void {
    const flags = this.save.flags!;
    if (!flags.wildQuestAccepted) {
      this.openDialogue('研究员 · 岚音', [
        '你就是星港新来的训练师吧？星落原野最近出现了异常的极光脉冲。',
        '古星祭坛附近有一只从不主动靠近人类的曜角鹿。它似乎正在守着什么。',
        '先去祭坛调查。不要急着证明力量，观察它的状态，再决定怎么行动。',
      ], () => {
        flags.wildQuestAccepted = true;
        writeSave(this.save);
        this.refreshQuest();
        this.statusText.setText('任务已接受：前往东北侧古星祭坛调查曜角鹿。');
      });
      return;
    }
    if (flags.wildGuardianDefeated && !flags.wildQuestRewarded) {
      this.openDialogue('研究员 · 岚音', [
        '脉冲读数恢复正常了。你没有破坏祭坛，曜角鹿也重新平静了下来。',
        '这是本次调查的报酬。远星门已经可以校准到下一调查区。',
      ], () => {
        flags.wildQuestRewarded = true;
        this.save.credits += 360;
        this.save.capsules += 3;
        writeSave(this.save);
        this.refreshQuest();
        this.scene.restart();
      });
      return;
    }
    if (flags.wildQuestRewarded) {
      this.openDialogue('研究员 · 岚音', ['第一调查区已经稳定。北侧远星门现在可以前往烬苔林地。']);
      return;
    }
    this.openDialogue('研究员 · 岚音', ['曜角鹿就在东北侧古星祭坛。靠近祭坛按 E 调查，记得保持队首状态。']);
  }

  private inspectAltar(): void {
    const flags = this.save.flags!;
    if (!flags.wildQuestAccepted) {
      this.statusText.setText('祭坛周围的星纹正在闪烁。也许应该先问问附近的研究员。');
      return;
    }
    if (flags.wildGuardianDefeated) {
      this.statusText.setText('祭坛已经恢复稳定，曜角鹿正在远处安静地注视着这里。');
      return;
    }
    const leader = this.save.party[0];
    if (leader.currentHp <= Math.floor(maxHpFor(leader) * 0.35)) {
      this.statusText.setText('队首状态不佳。建议先回星港恢复中心再来调查。');
      return;
    }
    this.openDialogue('古星祭坛', [
      '星纹突然全部亮起，远处传来清脆的蹄声。',
      '曜角鹿挡在祭坛核心前。它没有退开，角上的极光开始变得耀眼。',
    ], () => {
      const request: BattleRequest = {
        wildSpeciesId: 'auroraDeer',
        wildLevel: Phaser.Math.Clamp(leader.level + 3, 8, 16),
        returnScene: 'wild',
        boss: true,
        rewardCredits: 180,
        victoryFlag: 'wildGuardianDefeated',
        battleTitle: '星落原野 · 古星祭坛',
        battleSubtitle: '守护星灵 · 曜角鹿',
        captureBlockedMessage: '曜角鹿正在守护祭坛，现在无法与它建立捕捉连接。',
      };
      this.scene.start('battle', request);
    });
  }

  private inEncounterZone(): boolean {
    return this.encounterZones.some((zone) => containsPoint(zone, this.player.x, this.player.y));
  }

  private startWildEncounter(): void {
    if (this.dialogue) return;
    const leader = this.save.party[0];
    if (leader.currentHp <= 1) {
      this.statusText.setText('队首体力太低，先返回星港恢复。');
      return;
    }
    this.encounterCooldown = 1700;
    const wildSpeciesId = wildSpeciesIds[Math.floor(Math.random() * wildSpeciesIds.length)];
    const request: BattleRequest = {
      wildSpeciesId,
      wildLevel: Phaser.Math.Clamp(leader.level + Phaser.Math.Between(-1, 2), 3, 14),
      returnScene: 'wild',
    };
    this.statusText.setText(`草丛里出现了 ${species[wildSpeciesId].name}！`);
    this.time.delayedCall(220, () => this.scene.start('battle', request));
  }

  private openDialogue(speaker: string, pages: string[], onComplete?: () => void): void {
    this.dialogue = new DialogueBox(this, speaker, pages, () => {
      this.dialogue = undefined;
      onComplete?.();
    });
  }

  private refreshQuest(): void {
    const flags = this.save.flags!;
    let text = '调查任务：与研究员岚音交谈';
    if (flags.wildQuestAccepted) text = '调查任务：前往古星祭坛';
    if (flags.wildGuardianDefeated && !flags.wildQuestRewarded) text = '调查任务：向岚音汇报';
    if (flags.wildQuestRewarded) text = '第一调查完成 ✓ · 北侧远星门已解锁';
    this.questText.setText(text);
  }

  private returnToHub(): void {
    if (this.dialogue) return;
    writeSave(this.save);
    this.scene.start('world');
  }
}
