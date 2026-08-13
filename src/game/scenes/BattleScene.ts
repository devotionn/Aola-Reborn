import Phaser from 'phaser';
import { moves } from '../data/moves';
import { species } from '../data/species';
import { createCreature, loadSave, writeSave } from '../state/save';
import { applyTurn, captureChance, chooseNpcMove, expToNext, grantExp, maxHpFor, speedFor } from '../systems/BattleSystem';
import type { BattleRequest, CreatureInstance, Move, PlayerSave, SceneKey } from '../types';

export class BattleScene extends Phaser.Scene {
  private save!: PlayerSave;
  private partner!: CreatureInstance;
  private visitor!: CreatureInstance;
  private request!: BattleRequest;
  private busy = false;
  private logText!: Phaser.GameObjects.Text;
  private partnerHpFill!: Phaser.GameObjects.Rectangle;
  private visitorHpFill!: Phaser.GameObjects.Rectangle;
  private partnerHpText!: Phaser.GameObjects.Text;
  private visitorHpText!: Phaser.GameObjects.Text;
  private partnerNameText!: Phaser.GameObjects.Text;
  private partnerSymbol!: Phaser.GameObjects.Text;
  private captureText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;
  private moveLabels: Phaser.GameObjects.Text[] = [];
  private switchOverlay?: Phaser.GameObjects.Container;

  constructor() { super('battle'); }

  create(request: BattleRequest): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;
    this.request = request;
    this.partner = save.party[0];
    this.visitor = createCreature(request.wildSpeciesId, request.wildLevel);
    if (!save.discoveredSpecies.includes(this.visitor.speciesId)) save.discoveredSpecies.push(this.visitor.speciesId);
    writeSave(save);

    this.cameras.main.setBackgroundColor(request.boss ? '#18213f' : '#1b2a55');
    this.add.rectangle(640, 360, 1280, 720, request.boss ? 0x18213f : 0x1b2a55);
    this.add.ellipse(290, 388, 330, 115, 0xe3cb8e, 0.28);
    this.add.ellipse(990, 292, 300, 102, request.boss ? 0xd8d1a1 : 0x92b9e9, 0.24);
    if (request.boss) {
      this.add.text(640, 28, '星落原野 · 守护挑战', { fontSize: '18px', fontStyle: 'bold', color: '#ffe59b' }).setOrigin(0.5);
    }
    this.drawCreature(300, 325, this.partner, true);
    this.drawCreature(980, 235, this.visitor, false);
    this.createStatusPanel(56, 55, this.partner, true);
    this.createStatusPanel(824, 55, this.visitor, false);

    this.logText = this.add.text(640, 463, '', {
      fontSize: '18px', color: '#e5efff', align: 'center', wordWrap: { width: 1040 },
      backgroundColor: '#0b1433cc', padding: { x: 18, y: 12 },
    }).setOrigin(0.5);

    for (let index = 0; index < 4; index += 1) {
      const x = 245 + (index % 2) * 395;
      const y = 550 + Math.floor(index / 2) * 67;
      const button = this.add.rectangle(x, y, 350, 52, 0x284a7e, 0.96).setStrokeStyle(2, 0x86c9ff).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, '', { fontSize: '17px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      button.on('pointerover', () => button.setFillStyle(0x3766a3));
      button.on('pointerout', () => button.setFillStyle(0x284a7e));
      button.on('pointerdown', () => this.playRound(index));
      label.setDepth(2);
      this.moveLabels.push(label);
    }

    const captureButton = this.add.rectangle(1030, 552, 270, 58, request.boss ? 0x4b4f65 : 0x2f725c, 0.98)
      .setStrokeStyle(2, request.boss ? 0x8e94ad : 0x9ceac7).setInteractive({ useHandCursor: !request.boss });
    this.captureText = this.add.text(1030, 552, '', { fontSize: '16px', fontStyle: 'bold', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    captureButton.on('pointerdown', () => this.tryCapture());

    const switchButton = this.add.rectangle(1030, 620, 270, 42, 0x5a477c, 0.96).setStrokeStyle(1, 0xb5a5d7).setInteractive({ useHandCursor: true });
    this.add.text(1030, 620, 'Q · 更换伙伴', { fontSize: '15px', color: '#f1e9ff' }).setOrigin(0.5);
    switchButton.on('pointerdown', () => this.openSwitchMenu());

    const leaveButton = this.add.rectangle(1030, 670, 270, 36, 0x3b4564, 0.96).setStrokeStyle(1, 0x91a3c8).setInteractive({ useHandCursor: true });
    this.add.text(1030, 670, `ESC · 返回${this.returnLabel()}`, { fontSize: '14px', color: '#dce7ff' }).setOrigin(0.5);
    leaveButton.on('pointerdown', () => this.leave());

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-ONE', () => this.playRound(0));
      keyboard.on('keydown-TWO', () => this.playRound(1));
      keyboard.on('keydown-THREE', () => this.playRound(2));
      keyboard.on('keydown-FOUR', () => this.playRound(3));
      keyboard.on('keydown-C', () => this.tryCapture());
      keyboard.on('keydown-Q', () => this.openSwitchMenu());
      keyboard.on('keydown-ESC', () => this.leave());
    }
    this.refreshPartnerPresentation();
    this.refreshMeters();
    const intro = request.boss
      ? `守护星灵 ${species[this.visitor.speciesId].name} 挡在祭坛前！这是一次正式挑战。`
      : `野生 ${species[this.visitor.speciesId].name} 出现了！选择技能开始对局。`;
    this.setLog(intro);
  }

  private createStatusPanel(x: number, y: number, creature: CreatureInstance, partnerSide: boolean): void {
    const data = species[creature.speciesId];
    this.add.rectangle(x + 185, y + 58, 370, 116, 0x0b1433, 0.9).setStrokeStyle(2, 0x657fb5);
    const nameText = this.add.text(x + 18, y + 13, `${data.symbol} ${data.name}  Lv.${creature.level}`, { fontSize: '21px', fontStyle: 'bold', color: '#ffffff' });
    this.add.rectangle(x + 168, y + 62, 280, 15, 0x202b47).setOrigin(0, 0.5);
    const fill = this.add.rectangle(x + 168, y + 62, 280, 15, partnerSide ? 0x6fd59b : 0xf29b79).setOrigin(0, 0.5);
    const hpText = this.add.text(x + 18, y + 82, '', { fontSize: '13px', color: '#bfd2f3' });
    if (partnerSide) {
      this.partnerNameText = nameText;
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
    this.add.circle(x, y, partnerSide ? 88 : this.request.boss ? 92 : 78, partnerSide ? 0xf6d98c : this.request.boss ? 0xe6db9c : 0x94bbec)
      .setStrokeStyle(this.request.boss && !partnerSide ? 7 : 5, 0xffffff, 0.6);
    const symbol = this.add.text(x, y, data.symbol, {
      fontSize: partnerSide ? '66px' : this.request.boss ? '70px' : '58px', fontStyle: 'bold', color: '#152247',
    }).setOrigin(0.5);
    if (partnerSide) this.partnerSymbol = symbol;
  }

  private playRound(index: number): void {
    if (this.busy || this.switchOverlay || this.partner.currentHp <= 0 || this.visitor.currentHp <= 0) return;
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
    this.time.delayedCall(650, () => this.resolveRoundEnd());
  }

  private perform(source: CreatureInstance, target: CreatureInstance, move: Move): string {
    const outcome = applyTurn(source, target, move);
    const sourceName = species[source.speciesId].name;
    if (!outcome.hit) {
      this.spawnImpact(target, 'MISS', 1);
      return `${sourceName} 使用 ${move.name}，但没有命中。`;
    }
    this.spawnImpact(target, `-${outcome.points}`, outcome.affinity);
    const affinity = outcome.affinity > 1 ? ' 效果拔群！' : outcome.affinity < 1 ? ' 效果较弱。' : '';
    return `${sourceName} 使用 ${move.name}，造成 ${outcome.points} 点影响。${affinity}`;
  }

  private spawnImpact(target: CreatureInstance, label: string, affinity: number): void {
    const partnerTarget = target.uid === this.partner.uid;
    const x = partnerTarget ? 300 : 980;
    const y = partnerTarget ? 245 : 155;
    const text = this.add.text(x, y, label, {
      fontSize: affinity > 1 ? '28px' : '22px', fontStyle: 'bold', color: affinity > 1 ? '#ffe78f' : '#ffffff',
      backgroundColor: '#10182dcc', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: text, y: y - 52, alpha: 0, duration: 720, ease: 'Cubic.Out', onComplete: () => text.destroy() });
    if (affinity > 1) this.cameras.main.shake(90, 0.004);
  }

  private openSwitchMenu(): void {
    if (this.busy || this.switchOverlay || this.visitor.currentHp <= 0) return;
    const available = this.save.party.some((creature, index) => index > 0 && creature.currentHp > 0);
    if (!available) { this.setLog('当前没有其他可以上场的伙伴。'); return; }

    const panel = this.add.container(0, 0).setDepth(100);
    panel.add(this.add.rectangle(640, 360, 920, 390, 0x091126, 0.98).setStrokeStyle(3, 0xa595d1));
    panel.add(this.add.text(640, 205, '选择上场伙伴', { fontSize: '28px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5));
    panel.add(this.add.text(640, 244, '更换伙伴会让野生星灵获得一次行动机会', { fontSize: '14px', color: '#b9c8e4' }).setOrigin(0.5));

    this.save.party.forEach((creature, index) => {
      const data = species[creature.speciesId];
      const x = 300 + index * 225;
      const usable = index > 0 && creature.currentHp > 0;
      const card = this.add.rectangle(x, 365, 190, 170, usable ? 0x263d69 : 0x252b3a, 1)
        .setStrokeStyle(2, usable ? 0x92b7ec : 0x596173)
        .setInteractive({ useHandCursor: usable });
      if (usable) card.on('pointerdown', () => this.switchPartner(index, true));
      panel.add(card);
      panel.add(this.add.text(x, 318, `${data.symbol} ${data.name}`, { fontSize: '17px', fontStyle: 'bold', color: usable ? '#ffffff' : '#8994a8' }).setOrigin(0.5));
      panel.add(this.add.text(x, 356, `Lv.${creature.level}`, { fontSize: '13px', color: '#b4c7e8' }).setOrigin(0.5));
      panel.add(this.add.text(x, 388, `HP ${creature.currentHp}/${maxHpFor(creature)}`, { fontSize: '13px', color: creature.currentHp > 0 ? '#9fe5c8' : '#bf7f7f' }).setOrigin(0.5));
      panel.add(this.add.text(x, 432, index === 0 ? '当前上场' : creature.currentHp <= 0 ? '无法上场' : '点击更换', { fontSize: '12px', color: usable ? '#ffe59b' : '#7f899c' }).setOrigin(0.5));
    });

    const close = this.add.text(640, 505, 'Q / ESC · 取消', { fontSize: '14px', color: '#dbe6f7' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeSwitchMenu());
    panel.add(close);
    this.switchOverlay = panel;
  }

  private closeSwitchMenu(): void {
    this.switchOverlay?.destroy(true);
    this.switchOverlay = undefined;
  }

  private switchPartner(index: number, visitorResponds: boolean): void {
    if (index <= 0 || index >= this.save.party.length) return;
    const selected = this.save.party[index];
    if (selected.currentHp <= 0) return;
    const previousName = species[this.partner.speciesId].name;
    const [next] = this.save.party.splice(index, 1);
    this.save.party.unshift(next);
    this.partner = next;
    this.closeSwitchMenu();
    this.refreshPartnerPresentation();
    writeSave(this.save);

    if (!visitorResponds) {
      this.busy = false;
      this.setLog(`${previousName} 暂时退下，${species[next.speciesId].name} 接替上场！`);
      return;
    }

    this.busy = true;
    const response = chooseNpcMove(this.visitor);
    const note = this.perform(this.visitor, this.partner, response);
    this.refreshMeters();
    this.setLog(`${species[next.speciesId].name} 上场！${note}`);
    this.time.delayedCall(600, () => this.resolveRoundEnd());
  }

  private tryCapture(): void {
    if (this.busy || this.switchOverlay || this.visitor.currentHp <= 0) return;
    if (this.request.boss) { this.setLog('守护星灵不会在任务挑战中被捕捉。先完成它的考验。'); return; }
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
      this.time.delayedCall(900, () => this.finishScene());
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
    if (this.partner.currentHp <= 0) {
      const replacementIndex = this.save.party.findIndex((creature, index) => index > 0 && creature.currentHp > 0);
      if (replacementIndex > 0) {
        this.time.delayedCall(450, () => this.switchPartner(replacementIndex, false));
        return;
      }
      this.handleRetreat();
      return;
    }
    writeSave(this.save);
    this.busy = false;
    this.refreshMeters();
  }

  private completeEncounter(): void {
    const exp = this.request.boss ? 36 + this.visitor.level * 12 : 18 + this.visitor.level * 8;
    const credits = this.request.rewardCredits ?? (12 + this.visitor.level * 4);
    const result = grantExp(this.partner, exp);
    this.save.credits += credits;
    if (result.grownTo && !this.save.discoveredSpecies.includes(result.grownTo)) {
      this.save.discoveredSpecies.push(result.grownTo);
    }
    if (this.request.victoryFlag) {
      this.save.flags ??= {};
      this.save.flags[this.request.victoryFlag] = true;
    }
    writeSave(this.save);
    this.refreshPartnerPresentation();
    this.refreshMeters();
    const levelNote = result.levelsGained ? ` 升到 Lv.${this.partner.level}！` : '';
    const growthNote = result.grownTo ? ` 成长为 ${species[result.grownTo].name}！` : '';
    const title = this.request.boss ? '守护挑战完成！' : '对局胜利！';
    this.setLog(`${title}获得 ${exp} EXP 与 ${credits} 星币。${levelNote}${growthNote}`);
    this.time.delayedCall(1350, () => this.finishScene());
  }

  private handleRetreat(): void {
    this.partner.currentHp = 1;
    writeSave(this.save);
    this.refreshMeters();
    this.setLog('队伍已经没有可以继续上场的伙伴。系统保留队首 1 点体力并撤回，请尽快恢复。');
    this.time.delayedCall(1200, () => this.finishScene());
  }

  private leave(): void {
    if (this.switchOverlay) { this.closeSwitchMenu(); return; }
    if (this.busy) return;
    writeSave(this.save);
    this.finishScene();
  }

  private finishScene(): void {
    this.scene.start(this.returnScene());
  }

  private returnScene(): SceneKey {
    return this.request.returnScene ?? 'world';
  }

  private returnLabel(): string {
    return this.returnScene() === 'wild' ? '星落原野' : '星港';
  }

  private refreshPartnerPresentation(): void {
    const data = species[this.partner.speciesId];
    this.partnerNameText.setText(`${data.symbol} ${data.name}  Lv.${this.partner.level}`);
    this.partnerSymbol.setText(data.symbol);
    data.moveIds.slice(0, 4).forEach((moveId, index) => {
      const move = moves[moveId];
      this.moveLabels[index]?.setText(`${index + 1}. ${move.name}  ·  ${this.elementName(move.element)}  ·  ${move.rating}`);
    });
  }

  private refreshMeters(): void {
    const partnerMax = maxHpFor(this.partner);
    const visitorMax = maxHpFor(this.visitor);
    this.partnerHpFill.setScale(Math.max(0, this.partner.currentHp / partnerMax), 1);
    this.visitorHpFill.setScale(Math.max(0, this.visitor.currentHp / visitorMax), 1);
    this.partnerHpText.setText(`HP ${this.partner.currentHp} / ${partnerMax}`);
    this.visitorHpText.setText(`HP ${this.visitor.currentHp} / ${visitorMax}`);
    this.expText.setText(`EXP ${this.partner.exp} / ${expToNext(this.partner.level)}`);
    if (this.request.boss) {
      this.captureText.setText('守护挑战\n不可捕捉');
    } else {
      this.captureText.setText(`C · 捕捉  ${Math.round(captureChance(this.visitor) * 100)}%\n胶囊 × ${this.save.capsules}`);
    }
  }

  private elementName(element: Move['element']): string {
    return { fire: '火', water: '水', nature: '木', electric: '电', rock: '岩', neutral: '星' }[element];
  }

  private setLog(message: string): void {
    this.logText.setText(message);
  }
}
