import Phaser from 'phaser';
import { moves } from '../data/moves';
import { species } from '../data/species';
import { createCreature, loadSave, writeSave } from '../state/save';
import { applyTurn, captureChance, chooseNpcMove, expToNext, grantExp, maxHpFor, speedFor } from '../systems/BattleSystem';
import type { BattleRequest, CreatureInstance, Move, PlayerSave } from '../types';

export class BattleScene extends Phaser.Scene {
  private save!: PlayerSave;
  private partner!: CreatureInstance;
  private visitor!: CreatureInstance;
  private busy = false;
  private logText!: Phaser.GameObjects.Text;
  private partnerHpFill!: Phaser.GameObjects.Rectangle;
  private visitorHpFill!: Phaser.GameObjects.Rectangle;
  private partnerHpText!: Phaser.GameObjects.Text;
  private visitorHpText!: Phaser.GameObjects.Text;
  private captureText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;

  constructor() { super('battle'); }

  create(request: BattleRequest): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;
    this.partner = save.party[0];
    this.visitor = createCreature(request.wildSpeciesId, request.wildLevel);
    if (!save.discoveredSpecies.includes(this.visitor.speciesId)) save.discoveredSpecies.push(this.visitor.speciesId);
    writeSave(save);

    this.cameras.main.setBackgroundColor('#1b2a55');
    this.add.rectangle(640, 360, 1280, 720, 0x1b2a55);
    this.add.ellipse(290, 388, 330, 115, 0xe3cb8e, 0.28);
    this.add.ellipse(990, 292, 300, 102, 0x92b9e9, 0.2);
    this.drawCreature(300, 325, this.partner, true);
    this.drawCreature(980, 235, this.visitor, false);
    this.createStatusPanel(56, 55, this.partner, true);
    this.createStatusPanel(824, 55, this.visitor, false);

    this.logText = this.add.text(640, 463, '', { fontSize: '18px', color: '#e5efff', align: 'center', wordWrap: { width: 1040 }, backgroundColor: '#0b1433cc', padding: { x: 18, y: 12 } }).setOrigin(0.5);
    const partnerData = species[this.partner.speciesId];
    partnerData.moveIds.slice(0, 4).forEach((moveId, index) => {
      const move = moves[moveId];
      const x = 245 + (index % 2) * 395;
      const y = 550 + Math.floor(index / 2) * 67;
      const button = this.add.rectangle(x, y, 350, 52, 0x284a7e, 0.96).setStrokeStyle(2, 0x86c9ff).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, `${index + 1}. ${move.name}  ·  ${this.elementName(move.element)}  ·  ${move.rating}`, { fontSize: '17px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      button.on('pointerover', () => button.setFillStyle(0x3766a3));
      button.on('pointerout', () => button.setFillStyle(0x284a7e));
      button.on('pointerdown', () => this.playRound(index));
      label.setDepth(2);
    });

    const captureButton = this.add.rectangle(1030, 568, 270, 66, 0x2f725c, 0.98).setStrokeStyle(2, 0x9ceac7).setInteractive({ useHandCursor: true });
    this.captureText = this.add.text(1030, 568, '', { fontSize: '17px', fontStyle: 'bold', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    captureButton.on('pointerdown', () => this.tryCapture());
    const leaveButton = this.add.rectangle(1030, 642, 270, 44, 0x3b4564, 0.96).setStrokeStyle(1, 0x91a3c8).setInteractive({ useHandCursor: true });
    this.add.text(1030, 642, 'ESC · 返回星港', { fontSize: '15px', color: '#dce7ff' }).setOrigin(0.5);
    leaveButton.on('pointerdown', () => this.leave());

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-ONE', () => this.playRound(0));
      keyboard.on('keydown-TWO', () => this.playRound(1));
      keyboard.on('keydown-THREE', () => this.playRound(2));
      keyboard.on('keydown-FOUR', () => this.playRound(3));
      keyboard.on('keydown-C', () => this.tryCapture());
      keyboard.on('keydown-ESC', () => this.leave());
    }
    this.refreshMeters();
    this.setLog(`野生 ${species[this.visitor.speciesId].name} 出现了！选择技能开始对局。`);
  }

  private createStatusPanel(x: number, y: number, creature: CreatureInstance, partnerSide: boolean): void {
    const data = species[creature.speciesId];
    this.add.rectangle(x + 185, y + 58, 370, 116, 0x0b1433, 0.9).setStrokeStyle(2, 0x657fb5);
    this.add.text(x + 18, y + 13, `${data.symbol} ${data.name}  Lv.${creature.level}`, { fontSize: '21px', fontStyle: 'bold', color: '#ffffff' });
    this.add.rectangle(x + 168, y + 62, 280, 15, 0x202b47).setOrigin(0, 0.5);
    const fill = this.add.rectangle(x + 168, y + 62, 280, 15, partnerSide ? 0x6fd59b : 0xf29b79).setOrigin(0, 0.5);
    const hpText = this.add.text(x + 18, y + 82, '', { fontSize: '13px', color: '#bfd2f3' });
    if (partnerSide) {
      this.partnerHpFill = fill;
      this.partnerHpText = hpText;
      this.expText = this.add.text(x + 180, y + 84, '', { fontSize: '12px', color: '#ffe99b' });
    } else {
      this.visitorHpFill = fill;
      this.visitorHpText = hpText;
    }
  }

  private drawCreature(x: number, y: number, creature: CreatureInstance, partnerSide: boolean): void {
    const data = species[creature.speciesId];
    this.add.circle(x, y, partnerSide ? 88 : 78, partnerSide ? 0xf6d98c : 0x94bbec).setStrokeStyle(5, 0xffffff, 0.55);
    this.add.text(x, y, data.symbol, { fontSize: partnerSide ? '66px' : '58px', fontStyle: 'bold', color: '#152247' }).setOrigin(0.5);
  }

  private playRound(index: number): void {
    if (this.busy || this.partner.currentHp <= 0 || this.visitor.currentHp <= 0) return;
    const moveId = species[this.partner.speciesId].moveIds[index];
    if (!moveId) return;
    this.busy = true;
    const playerMove = moves[moveId];
    const npcMove = chooseNpcMove(this.visitor);
    const playerFirst = speedFor(this.partner) >= speedFor(this.visitor);
    const notes: string[] = [];
    if (playerFirst) {
      notes.push(this.perform(this.partner, this.visitor, playerMove));
      if (this.visitor.currentHp > 0) notes.push(this.perform(this.visitor, this.partner, npcMove));
    } else {
      notes.push(this.perform(this.visitor, this.partner, npcMove));
      if (this.partner.currentHp > 0) notes.push(this.perform(this.partner, this.visitor, playerMove));
    }
    this.refreshMeters();
    this.setLog(notes.join('  '));
    this.time.delayedCall(620, () => this.resolveRoundEnd());
  }

  private perform(source: CreatureInstance, target: CreatureInstance, move: Move): string {
    const outcome = applyTurn(source, target, move);
    const sourceName = species[source.speciesId].name;
    if (!outcome.hit) return `${sourceName} 使用 ${move.name}，但没有命中。`;
    const affinity = outcome.affinity > 1 ? ' 效果拔群！' : outcome.affinity < 1 ? ' 效果较弱。' : '';
    return `${sourceName} 使用 ${move.name}，造成 ${outcome.points} 点影响。${affinity}`;
  }

  private tryCapture(): void {
    if (this.busy || this.visitor.currentHp <= 0) return;
    if (this.save.capsules <= 0) { this.setLog('捕捉胶囊已经用完，回研究站补给。'); return; }
    this.busy = true;
    this.save.capsules -= 1;
    const chance = captureChance(this.visitor);
    if (Math.random() <= chance) {
      const caught = createCreature(this.visitor.speciesId, this.visitor.level);
      caught.currentHp = Math.max(1, this.visitor.currentHp);
      const joinsParty = this.save.party.length < 4;
      if (joinsParty) this.save.party.push(caught); else this.save.collection.push(caught);
      writeSave(this.save);
      this.refreshMeters();
      this.setLog(`捕捉成功！${species[caught.speciesId].name} 已加入${joinsParty ? '队伍' : '星灵仓库'}。`);
      this.time.delayedCall(900, () => this.scene.start('world'));
      return;
    }
    const response = chooseNpcMove(this.visitor);
    const note = this.perform(this.visitor, this.partner, response);
    writeSave(this.save);
    this.refreshMeters();
    this.setLog(`连接失败。${note}`);
    this.time.delayedCall(600, () => this.resolveRoundEnd());
  }

  private resolveRoundEnd(): void {
    if (this.visitor.currentHp <= 0) { this.completeEncounter(); return; }
    if (this.partner.currentHp <= 0) { this.handleRetreat(); return; }
    writeSave(this.save);
    this.busy = false;
    this.refreshMeters();
  }

  private completeEncounter(): void {
    const exp = 18 + this.visitor.level * 8;
    const credits = 12 + this.visitor.level * 4;
    const result = grantExp(this.partner, exp);
    this.save.credits += credits;
    writeSave(this.save);
    this.refreshMeters();
    const levelNote = result.levelsGained ? ` 升到 Lv.${this.partner.level}！` : '';
    this.setLog(`对局胜利！获得 ${exp} EXP 与 ${credits} 星币。${levelNote}`);
    this.time.delayedCall(1100, () => this.scene.start('world'));
  }

  private handleRetreat(): void {
    this.partner.currentHp = 1;
    writeSave(this.save);
    this.refreshMeters();
    this.setLog(`${species[this.partner.speciesId].name} 已经没有体力。自动撤回星港，请前往恢复中心。`);
    this.time.delayedCall(1100, () => this.scene.start('world'));
  }

  private leave(): void {
    if (this.busy) return;
    writeSave(this.save);
    this.scene.start('world');
  }

  private refreshMeters(): void {
    const partnerMax = maxHpFor(this.partner);
    const visitorMax = maxHpFor(this.visitor);
    this.partnerHpFill.setScale(Math.max(0, this.partner.currentHp / partnerMax), 1);
    this.visitorHpFill.setScale(Math.max(0, this.visitor.currentHp / visitorMax), 1);
    this.partnerHpText.setText(`HP ${this.partner.currentHp} / ${partnerMax}`);
    this.visitorHpText.setText(`HP ${this.visitor.currentHp} / ${visitorMax}`);
    this.expText.setText(`EXP ${this.partner.exp} / ${expToNext(this.partner.level)}`);
    this.captureText.setText(`C · 捕捉  ${Math.round(captureChance(this.visitor) * 100)}%\n胶囊 × ${this.save.capsules}`);
  }

  private elementName(element: Move['element']): string {
    return { fire: '火', water: '水', nature: '木', electric: '电', rock: '岩', neutral: '星' }[element];
  }

  private setLog(message: string): void {
    this.logText.setText(message);
  }
}
