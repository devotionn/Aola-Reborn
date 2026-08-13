import Phaser from 'phaser';
import { species } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import {
  CAPSULE_SERVICE_AMOUNT,
  CAPSULE_SERVICE_FEE,
  TONIC_SERVICE_FEE,
  TRAINING_EXP,
  TRAINING_SERVICE_FEE,
  requestCapsuleSupply,
  requestTonicSupply,
  runTrainingSession,
} from '../systems/FacilitySystem';
import { maxHpFor } from '../systems/BattleSystem';
import type { PlayerSave } from '../types';

export class FacilityScene extends Phaser.Scene {
  private save!: PlayerSave;
  private resourceText!: Phaser.GameObjects.Text;
  private leaderText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super('facility'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;
    this.save.inventory ??= { tonics: 0 };

    this.cameras.main.setBackgroundColor('#151d39');
    this.add.rectangle(640, 360, 1280, 720, 0x151d39);
    this.add.text(640, 60, '星港公共设施', { fontSize: '34px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(640, 104, '补给站 · 训练场', { fontSize: '15px', color: '#a9c8ee' }).setOrigin(0.5);

    this.resourceText = this.add.text(640, 150, '', { fontSize: '18px', color: '#ffe59b' }).setOrigin(0.5);
    this.leaderText = this.add.text(640, 190, '', { fontSize: '15px', color: '#bfe5ff' }).setOrigin(0.5);

    this.createServiceButton(270, 330, '捕捉胶囊补给', `${CAPSULE_SERVICE_FEE} 星币 · 胶囊 ×${CAPSULE_SERVICE_AMOUNT}`, () => {
      this.applyService(requestCapsuleSupply(this.save));
    });
    this.createServiceButton(640, 330, '星辉恢复剂', `${TONIC_SERVICE_FEE} 星币 · 恢复剂 ×1`, () => {
      this.applyService(requestTonicSupply(this.save));
    });
    this.createServiceButton(1010, 330, '队首训练', `${TRAINING_SERVICE_FEE} 星币 · ${TRAINING_EXP} EXP`, () => {
      this.applyService(runTrainingSession(this.save));
    });

    this.add.text(640, 445, '设施原则', { fontSize: '18px', fontStyle: 'bold', color: '#9fe5c8' }).setOrigin(0.5);
    this.add.text(640, 490, '补给与训练都会真实写入本地存档；训练获得的经验也会触发等级成长与形态成长。', {
      fontSize: '15px', color: '#cbd8ec', wordWrap: { width: 880 }, align: 'center',
    }).setOrigin(0.5);

    this.statusText = this.add.text(640, 580, '选择一项服务。', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#0b1433cc', padding: { x: 16, y: 10 }, wordWrap: { width: 900 }, align: 'center',
    }).setOrigin(0.5);

    const back = this.add.rectangle(640, 652, 240, 44, 0x35466c, 0.96).setStrokeStyle(2, 0x8fb2e4).setInteractive({ useHandCursor: true });
    this.add.text(640, 652, 'ESC · 返回星港', { fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
    back.on('pointerdown', () => this.returnToHub());
    this.input.keyboard?.on('keydown-ESC', () => this.returnToHub());
    this.refreshSummary();
  }

  private createServiceButton(x: number, y: number, title: string, detail: string, action: () => void): void {
    const button = this.add.rectangle(x, y, 310, 150, 0x263e67, 0.98).setStrokeStyle(2, 0x82b6e7).setInteractive({ useHandCursor: true });
    this.add.text(x, y - 28, title, { fontSize: '20px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(x, y + 20, detail, { fontSize: '14px', color: '#b8d7f5' }).setOrigin(0.5);
    button.on('pointerover', () => button.setFillStyle(0x31517f));
    button.on('pointerout', () => button.setFillStyle(0x263e67));
    button.on('pointerdown', action);
  }

  private applyService(result: { ok: boolean; message: string }): void {
    if (result.ok) writeSave(this.save);
    this.statusText.setText(result.message);
    this.refreshSummary();
  }

  private refreshSummary(): void {
    const leader = this.save.party[0];
    const data = species[leader.speciesId];
    this.resourceText.setText(`星币 ${this.save.credits} · 胶囊 ${this.save.capsules} · 恢复剂 ${this.save.inventory?.tonics ?? 0}`);
    this.leaderText.setText(`当前队首：${data.symbol} ${data.name} · Lv.${leader.level} · HP ${leader.currentHp}/${maxHpFor(leader)}`);
  }

  private returnToHub(): void {
    writeSave(this.save);
    this.scene.start('world');
  }
}
