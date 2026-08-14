import Phaser from 'phaser';
import { loadSave } from '../state/save';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b1230');
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 28, 'AOLA · REBORN', {
      fontFamily: 'system-ui', fontSize: '52px', fontStyle: 'bold', color: '#ffffff', letterSpacing: 6,
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 34, '星门重新开启', {
      fontFamily: 'system-ui', fontSize: '20px', color: '#9bdcff',
    }).setOrigin(0.5);

    this.time.delayedCall(650, () => this.scene.start(loadSave() ? 'world' : 'starter'));
  }
}
