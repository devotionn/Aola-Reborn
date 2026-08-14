import Phaser from 'phaser';
import { moves } from '../data/moves';
import { species } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { maxHpFor, moveIdsFor, remainingPp } from '../systems/BattleSystem';
import { usePpRefillOnCreature, useTonicOnCreature } from '../systems/FacilitySystem';
import type { PlayerSave, SceneKey } from '../types';

interface BagSceneData {
  returnScene?: SceneKey;
}

export class BagScene extends Phaser.Scene {
  private save!: PlayerSave;
  private returnScene: SceneKey = 'world';
  private content?: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private selectedIndex = 0;

  constructor() { super('bag'); }

  create(data: BagSceneData = {}): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;
    this.returnScene = data.returnScene ?? 'world';
    this.save.inventory ??= { tonics: 0, ppRefills: 0 };

    this.cameras.main.setBackgroundColor('#10182f');
    this.add.text(64, 34, '探索背包', { fontSize: '34px', fontStyle: 'bold', color: '#ffffff' });
    this.add.text(1210, 50, 'B / ESC 返回', { fontSize: '14px', color: '#c8d8f4' }).setOrigin(1, 0.5);
    this.statusText = this.add.text(640, 666, '先选择队伍成员，再选择要使用的道具。', {
      fontSize: '15px', color: '#ffffff', backgroundColor: '#0a1128dd', padding: { x: 16, y: 9 }, wordWrap: { width: 1000 }, align: 'center',
    }).setOrigin(0.5).setDepth(20);

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-ONE', () => this.useTonic());
    keyboard?.on('keydown-TWO', () => this.usePpRefill());
    keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    keyboard?.on('keydown-A', () => this.moveSelection(-1));
    keyboard?.on('keydown-D', () => this.moveSelection(1));
    keyboard?.on('keydown-B', () => this.leave());
    keyboard?.on('keydown-ESC', () => this.leave());
    this.render();
  }

  private moveSelection(step: number): void {
    if (this.save.party.length <= 1) return;
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + step, 0, this.save.party.length);
    this.render();
  }

  private render(): void {
    this.content?.destroy(true);
    const root = this.add.container(0, 0);
    const target = this.save.party[Math.min(this.selectedIndex, this.save.party.length - 1)];
    this.selectedIndex = Math.min(this.selectedIndex, this.save.party.length - 1);
    const data = species[target.speciesId];

    root.add(this.add.text(64, 92, '使用目标', { fontSize: '18px', fontStyle: 'bold', color: '#ffe59b' }));
    this.save.party.forEach((creature, index) => {
      const member = species[creature.speciesId];
      const x = 150 + index * 300;
      const selected = index === this.selectedIndex;
      const card = this.add.rectangle(x, 145, 260, 82, selected ? 0x355d91 : 0x1b2c4e, 0.98)
        .setStrokeStyle(2, selected ? 0xffdd82 : 0x54719d)
        .setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => { this.selectedIndex = index; this.render(); });
      root.add(card);
      root.add(this.add.text(x, 127, `${index + 1}. ${member.symbol} ${member.name} · Lv.${creature.level}`, {
        fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5));
      root.add(this.add.text(x, 158, `HP ${creature.currentHp}/${maxHpFor(creature)}${creature.currentHp <= 0 ? ' · 已倒下' : ''}`, {
        fontSize: '12px', color: creature.currentHp > 0 ? '#a7e2c7' : '#d99a9a',
      }).setOrigin(0.5));
    });

    root.add(this.add.rectangle(640, 255, 1150, 128, 0x172847, 0.98).setStrokeStyle(2, 0x5375aa));
    root.add(this.add.text(100, 216, `${data.symbol} ${data.name} · Lv.${target.level}`, { fontSize: '23px', fontStyle: 'bold', color: '#ffffff' }));
    root.add(this.add.text(100, 254, `HP ${target.currentHp}/${maxHpFor(target)} · 状态 ${target.condition ? this.conditionName(target.condition.type) : '正常'}`, { fontSize: '15px', color: '#a9d8f5' }));
    const ppSummary = moveIdsFor(target).map((moveId) => `${moves[moveId].name} ${remainingPp(target, moveId)}/${moves[moveId].pp}`).join('  ·  ');
    root.add(this.add.text(100, 289, ppSummary, { fontSize: '13px', color: '#b9c8e4', wordWrap: { width: 1040 } }));

    this.addItemCard(root, 330, 455, '1 · 星辉恢复剂', `持有 ${this.save.inventory?.tonics ?? 0}\n恢复约 45% HP并清异常\n普通恢复剂不能唤醒倒下星灵`, () => this.useTonic());
    this.addItemCard(root, 950, 455, '2 · 星能补充剂', `持有 ${this.save.inventory?.ppRefills ?? 0}\n恢复所选星灵四技能约 50% PP`, () => this.usePpRefill());

    root.add(this.add.rectangle(640, 588, 1150, 62, 0x17233e, 0.96).setStrokeStyle(1, 0x4c628b));
    root.add(this.add.text(100, 568, `捕捉胶囊 ×${this.save.capsules}`, { fontSize: '18px', fontStyle: 'bold', color: '#ffe59b' }));
    root.add(this.add.text(100, 594, '←/→ 或 A/D 切换目标 · 捕捉胶囊仅在普通遭遇战中使用', { fontSize: '13px', color: '#9eb2d1' }));
    this.content = root;
  }

  private addItemCard(root: Phaser.GameObjects.Container, x: number, y: number, title: string, detail: string, action: () => void): void {
    const card = this.add.rectangle(x, y, 500, 205, 0x20385f, 0.98).setStrokeStyle(2, 0x78a6d8).setInteractive({ useHandCursor: true });
    card.on('pointerover', () => card.setFillStyle(0x2a4b7c));
    card.on('pointerout', () => card.setFillStyle(0x20385f));
    card.on('pointerdown', action);
    root.add(card);
    root.add(this.add.text(x, y - 58, title, { fontSize: '22px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5));
    root.add(this.add.text(x, y + 24, detail, { fontSize: '14px', color: '#c6dbf3', align: 'center', lineSpacing: 7 }).setOrigin(0.5));
  }

  private selectedUid(): string {
    return this.save.party[Math.min(this.selectedIndex, this.save.party.length - 1)].uid;
  }

  private useTonic(): void {
    const result = useTonicOnCreature(this.save, this.selectedUid());
    if (result.ok) writeSave(this.save);
    this.statusText.setText(result.message);
    this.render();
  }

  private usePpRefill(): void {
    const result = usePpRefillOnCreature(this.save, this.selectedUid());
    if (result.ok) writeSave(this.save);
    this.statusText.setText(result.message);
    this.render();
  }

  private conditionName(type: string): string {
    return type === 'scorch' ? '灼热' : type === 'sluggish' ? '迟缓' : type;
  }

  private leave(): void {
    writeSave(this.save);
    this.scene.start(this.returnScene);
  }
}
