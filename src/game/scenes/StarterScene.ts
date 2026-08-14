import Phaser from 'phaser';
import { species, starterIds } from '../data/species';
import { createFreshSave, writeSave } from '../state/save';

export class StarterScene extends Phaser.Scene {
  constructor() { super('starter'); }

  create(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#111c42');
    this.add.text(width / 2, 82, '选择你的第一位星灵伙伴', { fontSize: '34px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(width / 2, 126, '按 1 / 2 / 3 选择，之后也能在探索区遇见其他伙伴。', { fontSize: '17px', color: '#abc9f5' }).setOrigin(0.5);

    starterIds.forEach((id, index) => {
      const data = species[id];
      const x = width / 2 + (index - 1) * 300;
      this.add.rectangle(x, 350, 246, 320, 0x1a2b5c, 0.96).setStrokeStyle(2, 0x5b79c7);
      this.add.circle(x, 258, 66, 0x263c78).setStrokeStyle(4, 0x89d8ff);
      this.add.text(x, 256, data.symbol, { fontSize: '52px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(x, 356, `${index + 1}. ${data.name}`, { fontSize: '25px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(x, 398, `HP ${data.baseStats.hp} · 灵力 ${data.baseStats.spirit} · 速度 ${data.baseStats.speed}`, { fontSize: '14px', color: '#9fdfff' }).setOrigin(0.5);
      this.add.text(x, 450, data.description, { fontSize: '14px', color: '#c8d7f4', wordWrap: { width: 195 }, align: 'center' }).setOrigin(0.5);
    });

    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.once('keydown-ONE', () => this.choose(0));
    keyboard.once('keydown-TWO', () => this.choose(1));
    keyboard.once('keydown-THREE', () => this.choose(2));
  }

  private choose(index: number): void {
    const id = starterIds[index];
    writeSave(createFreshSave(id));
    this.scene.start('world');
  }
}
