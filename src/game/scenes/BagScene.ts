import Phaser from 'phaser';
import { moves } from '../data/moves';
import { species } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { maxHpFor, moveIdsFor, remainingPp } from '../systems/BattleSystem';
import { usePpRefillOnLeader, useTonicOnLeader } from '../systems/FacilitySystem';
import type { PlayerSave, SceneKey } from '../types';

interface BagSceneData {
  returnScene?: SceneKey;
}

export class BagScene extends Phaser.Scene {
  private save!: PlayerSave;
  private returnScene: SceneKey = 'world';
  private content?: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super('bag'); }

  create(data: BagSceneData = {}): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;
    this.returnScene = data.returnScene ?? 'world';
    this.save.inventory ??= { tonics: 0, ppRefills: 0 };

    this.cameras.main.setBackgroundColor('#10182f');
    this.add.text(64, 42, '探索背包', { fontSize: '34px', fontStyle: 'bold', color: '#ffffff' });
    this.add.text(1210, 58, 'B / ESC 返回', { fontSize: '14px', color: '#c8d8f4' }).setOrigin(1, 0.5);
    this.statusText = this.add.text(640, 650, '选择道具使用。恢复类道具默认作用于当前队首。', {
      fontSize: '15px', color: '#ffffff', backgroundColor: '#0a1128dd', padding: { x: 16, y: 10 }, wordWrap: { width: 1000 }, align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.input.keyboard?.on('keydown-ONE', () => this.useTonic());
    this.input.keyboard?.on('keydown-TWO', () => this.usePpRefill());
    this.input.keyboard?.on('keydown-B', () => this.leave());
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
    this.render();
  }

  private render(): void {
    this.content?.destroy(true);
    const root = this.add.container(0, 0);
    const leader = this.save.party[0];
    const data = species[leader.speciesId];

    root.add(this.add.rectangle(640, 185, 1150, 130, 0x172847, 0.98).setStrokeStyle(2, 0x5375aa));
    root.add(this.add.text(100, 145, `${data.symbol} ${data.name} · Lv.${leader.level}`, { fontSize: '23px', fontStyle: 'bold', color: '#ffffff' }));
    root.add(this.add.text(100, 185, `HP ${leader.currentHp}/${maxHpFor(leader)} · 状态 ${leader.condition ? this.conditionName(leader.condition.type) : '正常'}`, { fontSize: '15px', color: '#a9d8f5' }));
    const ppSummary = moveIdsFor(leader).map((moveId) => `${moves[moveId].name} ${remainingPp(leader, moveId)}/${moves[moveId].pp}`).join('  ·  ');
    root.add(this.add.text(100, 220, ppSummary, { fontSize: '13px', color: '#b9c8e4', wordWrap: { width: 1040 } }));

    this.addItemCard(root, 330, 400, '1 · 星辉恢复剂', `持有 ${(this.save.inventory?.tonics ?? 0)}\n恢复约 45% HP，并清除异常状态`, () => this.useTonic());
    this.addItemCard(root, 950, 400, '2 · 星能补充剂', `持有 ${(this.save.inventory?.ppRefills ?? 0)}\n恢复当前四个技能约 50% PP`, () => this.usePpRefill());

    root.add(this.add.rectangle(640, 548, 1150, 76, 0x17233e, 0.96).setStrokeStyle(1, 0x4c628b));
    root.add(this.add.text(100, 525, `捕捉胶囊 ×${this.save.capsules}`, { fontSize: '18px', fontStyle: 'bold', color: '#ffe59b' }));
    root.add(this.add.text(100, 554, '捕捉胶囊仅在普通遭遇战中使用；任务守护战遵循各区域限制。', { fontSize: '13px', color: '#9eb2d1' }));
    this.content = root;
  }

  private addItemCard(root: Phaser.GameObjects.Container, x: number, y: number, title: string, detail: string, action: () => void): void {
    const card = this.add.rectangle(x, y, 500, 210, 0x20385f, 0.98).setStrokeStyle(2, 0x78a6d8).setInteractive({ useHandCursor: true });
    card.on('pointerover', () => card.setFillStyle(0x2a4b7c));
    card.on('pointerout', () => card.setFillStyle(0x20385f));
    card.on('pointerdown', action);
    root.add(card);
    root.add(this.add.text(x, y - 55, title, { fontSize: '22px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5));
    root.add(this.add.text(x, y + 28, detail, { fontSize: '15px', color: '#c6dbf3', align: 'center', lineSpacing: 8 }).setOrigin(0.5));
  }

  private useTonic(): void {
    const result = useTonicOnLeader(this.save);
    if (result.ok) writeSave(this.save);
    this.statusText.setText(result.message);
    this.render();
  }

  private usePpRefill(): void {
    const result = usePpRefillOnLeader(this.save);
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