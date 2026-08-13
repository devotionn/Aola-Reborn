import Phaser from 'phaser';
import { species } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { maxHpFor } from '../systems/BattleSystem';
import type { PlayerSave } from '../types';

export class RosterScene extends Phaser.Scene {
  private save!: PlayerSave;
  private content?: Phaser.GameObjects.Container;

  constructor() { super('roster'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;

    this.cameras.main.setBackgroundColor('#111a35');
    this.add.text(64, 42, '伙伴编组', { fontSize: '34px', fontStyle: 'bold', color: '#ffffff' });
    this.add.text(1210, 56, 'T / ESC 返回星港', { fontSize: '14px', color: '#c8d8f4' }).setOrigin(1, 0.5);

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-ONE', () => this.setLeader(0));
    keyboard?.on('keydown-TWO', () => this.setLeader(1));
    keyboard?.on('keydown-THREE', () => this.setLeader(2));
    keyboard?.on('keydown-FOUR', () => this.setLeader(3));
    keyboard?.on('keydown-T', () => this.scene.start('world'));
    keyboard?.on('keydown-ESC', () => this.scene.start('world'));

    this.render();
  }

  private render(): void {
    this.content?.destroy(true);
    const root = this.add.container(0, 0);
    root.add(this.add.text(64, 96, `队伍 ${this.save.party.length}/4 · 仓库 ${this.save.collection.length}`, { fontSize: '15px', color: '#9fc4ef' }));
    root.add(this.add.text(64, 136, '当前队伍 · 点击卡片设为队首；非队首可存入仓库', { fontSize: '18px', fontStyle: 'bold', color: '#ffe59b' }));

    this.save.party.forEach((creature, index) => {
      const data = species[creature.speciesId];
      const x = 70 + index * 300;
      const card = this.add.rectangle(x + 135, 260, 270, 190, index === 0 ? 0x31517f : 0x192846, 1)
        .setStrokeStyle(2, index === 0 ? 0xffdf82 : 0x5874a2)
        .setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this.setLeader(index));
      root.add(card);
      root.add(this.add.text(x + 18, 188, `${data.symbol} ${data.name}`, { fontSize: '21px', fontStyle: 'bold', color: '#ffffff' }));
      root.add(this.add.text(x + 18, 226, `Lv.${creature.level} · HP ${creature.currentHp}/${maxHpFor(creature)}`, { fontSize: '14px', color: '#b7d4f4' }));
      root.add(this.add.text(x + 18, 255, `EXP ${creature.exp}`, { fontSize: '13px', color: '#9fe5c8' }));
      const growth = data.growth;
      if (growth) {
        root.add(this.add.text(x + 18, 282, `Lv.${growth.level} 成长为 ${species[growth.targetSpeciesId].name}`, { fontSize: '12px', color: '#ffe59b' }));
      }
      root.add(this.add.text(x + 18, 316, index === 0 ? '队首' : `${index + 1} · 点击设为队首`, { fontSize: '12px', color: '#ffe59b' }));

      if (index > 0) {
        const store = this.add.rectangle(x + 135, 346, 220, 34, 0x41556f, 1).setStrokeStyle(1, 0x8da4c7).setInteractive({ useHandCursor: true });
        store.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.sendToStorage(index);
        });
        root.add(store);
        root.add(this.add.text(x + 135, 346, '存入仓库', { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5));
      }
    });

    root.add(this.add.text(64, 400, '仓库成员 · 点击卡片加入队伍', { fontSize: '18px', fontStyle: 'bold', color: '#9fe5c8' }));
    if (this.save.collection.length === 0) {
      root.add(this.add.text(64, 450, '仓库目前为空。捕捉更多星灵，或把非队首成员存进来。', { fontSize: '15px', color: '#8da4c7' }));
    } else {
      this.save.collection.slice(0, 12).forEach((creature, index) => {
        const data = species[creature.speciesId];
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = 70 + col * 300;
        const y = 458 + row * 74;
        const enabled = this.save.party.length < 4;
        const card = this.add.rectangle(x + 135, y + 28, 270, 58, enabled ? 0x183a42 : 0x252c3d, 1)
          .setStrokeStyle(1, enabled ? 0x67b9a1 : 0x596273)
          .setInteractive({ useHandCursor: enabled });
        card.on('pointerdown', () => this.bringToParty(index));
        root.add(card);
        root.add(this.add.text(x + 14, y + 10, `${data.symbol} ${data.name} · Lv.${creature.level}`, { fontSize: '14px', color: '#eff7ff' }));
        root.add(this.add.text(x + 14, y + 33, enabled ? '点击加入队伍' : '队伍已满', { fontSize: '11px', color: enabled ? '#9fe5c8' : '#8a95aa' }));
      });
    }

    root.add(this.add.text(640, 684, '队伍至少保留 1 只星灵；队首不能直接存入仓库。', { fontSize: '13px', color: '#879ab9' }).setOrigin(0.5));
    this.content = root;
  }

  private setLeader(index: number): void {
    if (index <= 0 || index >= this.save.party.length) return;
    const [selected] = this.save.party.splice(index, 1);
    this.save.party.unshift(selected);
    this.persistAndRender();
  }

  private sendToStorage(index: number): void {
    if (index <= 0 || index >= this.save.party.length || this.save.party.length <= 1) return;
    const [creature] = this.save.party.splice(index, 1);
    this.save.collection.push(creature);
    this.persistAndRender();
  }

  private bringToParty(index: number): void {
    if (this.save.party.length >= 4 || index < 0 || index >= this.save.collection.length) return;
    const [creature] = this.save.collection.splice(index, 1);
    this.save.party.push(creature);
    this.persistAndRender();
  }

  private persistAndRender(): void {
    writeSave(this.save);
    this.render();
  }
}
