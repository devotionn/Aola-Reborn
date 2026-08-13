import Phaser from 'phaser';
import { species, wildSpeciesIds } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { maxHpFor } from '../systems/BattleSystem';
import type { BattleRequest, PlayerSave } from '../types';
import { DialogueBox } from '../ui/DialogueBox';

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

  constructor() { super('wild'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;
    this.save.flags ??= {};

    this.cameras.main.setBackgroundColor('#7fae92');
    this.drawMap();
    this.player = this.add.circle(640, 610, 18, 0xffef9b).setStrokeStyle(4, 0x2c4262).setDepth(20);
    this.playerLabel = this.add.text(640, 576, 'YOU', { fontSize: '11px', fontStyle: 'bold', color: '#17243d' }).setOrigin(0.5).setDepth(20);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');
    this.keys = keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.cursors = keyboard.createCursorKeys();
    keyboard.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    keyboard.on('keydown-E', () => this.interact());
    keyboard.on('keydown-SPACE', () => this.dialogue?.next());
    keyboard.on('keydown-ESC', () => this.returnToHub());

    this.statusText = this.add.text(640, 682, 'WASD 移动 · E 交互 · 原野草地会随机遭遇 · ESC 返回星港', {
      fontSize: '14px', color: '#eef8ff', backgroundColor: '#0d1738dd', padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setDepth(40);
    this.questText = this.add.text(42, 34, '', {
      fontSize: '15px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#0d1738cc', padding: { x: 14, y: 10 },
    }).setDepth(40);
    this.refreshQuest();

    if (this.save.flags.wildGuardianDefeated && !this.save.flags.wildQuestRewarded) {
      this.statusText.setText('曜角鹿已经平静下来。回去找研究员岚音领取调查奖励。');
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

    this.player.x = Phaser.Math.Clamp(this.player.x + dx, 35, 1245);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy, 95, 650);
    this.playerLabel.setPosition(this.player.x, this.player.y - 34);
    this.encounterCooldown -= delta;

    if (this.inGrass() && this.encounterCooldown <= 0 && Math.random() < 0.018) this.startWildEncounter();
    if (this.player.y > 635 && this.player.x > 560 && this.player.x < 720) this.returnToHub();
  }

  private drawMap(): void {
    this.add.rectangle(640, 370, 1280, 700, 0x96c7a0);
    this.add.rectangle(640, 430, 210, 520, 0xdcc996).setStrokeStyle(3, 0xc2ad77);
    this.add.rectangle(245, 390, 390, 300, 0x5d9f66, 0.9).setStrokeStyle(4, 0x3d7748);
    this.add.rectangle(1035, 430, 360, 250, 0x5d9f66, 0.9).setStrokeStyle(4, 0x3d7748);
    this.add.rectangle(640, 145, 520, 150, 0x7f9e78, 0.8).setStrokeStyle(4, 0x526b55);

    this.add.text(640, 70, '星落原野', { fontSize: '34px', fontStyle: 'bold', color: '#233a32' }).setOrigin(0.5);
    this.add.text(640, 108, 'STARFALL FIELD · 第一调查区', { fontSize: '13px', color: '#3d5a50' }).setOrigin(0.5);

    this.add.circle(245, 226, 34, 0x335d79).setStrokeStyle(3, 0xc8ecff);
    this.add.text(245, 226, '岚', { fontSize: '22px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(245, 274, '研究员 · 岚音', { fontSize: '14px', fontStyle: 'bold', color: '#17354b', backgroundColor: '#d9f2ffcc', padding: { x: 8, y: 4 } }).setOrigin(0.5);

    this.add.circle(1035, 182, 64, 0x587a93, 0.75).setStrokeStyle(5, 0xb5ddff);
    this.add.circle(1035, 182, 36, 0xd7e8ff, 0.38).setStrokeStyle(2, 0xffffff);
    this.add.text(1035, 182, '曜', { fontSize: '30px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(1035, 266, '古星祭坛 · E 调查', { fontSize: '14px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#304b68cc', padding: { x: 10, y: 5 } }).setOrigin(0.5);

    this.add.rectangle(640, 654, 170, 44, 0x31568a, 0.96).setStrokeStyle(2, 0xa8d7ff);
    this.add.text(640, 654, '返回星港', { fontSize: '15px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);

    this.add.text(245, 390, '萤草坡\n随机遭遇区', { fontSize: '18px', fontStyle: 'bold', color: '#173b24', align: 'center' }).setOrigin(0.5);
    this.add.text(1035, 430, '碎星草甸\n随机遭遇区', { fontSize: '18px', fontStyle: 'bold', color: '#173b24', align: 'center' }).setOrigin(0.5);
  }

  private interact(): void {
    if (this.dialogue) { this.dialogue.next(); return; }
    if (this.near(245, 226, 110)) { this.talkResearcher(); return; }
    if (this.near(1035, 182, 125)) { this.inspectAltar(); return; }
    if (this.near(640, 654, 90)) { this.returnToHub(); return; }
    this.statusText.setText('风吹过草地，附近暂时没有可以交互的目标。');
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
        '这是本次调查的报酬。研究站以后会把更远星区的调查任务交给你。',
      ], () => {
        flags.wildQuestRewarded = true;
        this.save.credits += 360;
        this.save.capsules += 3;
        writeSave(this.save);
        this.refreshQuest();
        this.statusText.setText('调查完成！获得星币 ×360、捕捉胶囊 ×3。');
      });
      return;
    }
    if (flags.wildQuestRewarded) {
      this.openDialogue('研究员 · 岚音', ['第一调查区已经稳定。等星门校准完成，我们就能前往更远的星区。']);
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
      };
      this.scene.start('battle', request);
    });
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
    if (flags.wildQuestRewarded) text = '调查任务：第一调查区已完成 ✓';
    this.questText.setText(text);
  }

  private inGrass(): boolean {
    const left = this.player.x > 50 && this.player.x < 440 && this.player.y > 255 && this.player.y < 545;
    const right = this.player.x > 850 && this.player.x < 1220 && this.player.y > 305 && this.player.y < 555;
    return left || right;
  }

  private near(x: number, y: number, radius: number): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) <= radius;
  }

  private returnToHub(): void {
    if (this.dialogue) return;
    writeSave(this.save);
    this.scene.start('world');
  }
}
