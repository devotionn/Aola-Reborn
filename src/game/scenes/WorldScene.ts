import Phaser from 'phaser';
import { species, wildSpeciesIds } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import type { BattleRequest, PlayerSave } from '../types';

export class WorldScene extends Phaser.Scene {
  private save!: PlayerSave;
  private player!: Phaser.GameObjects.Arc;
  private playerLabel!: Phaser.GameObjects.Text;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private encounterCooldown = 0;
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super('world'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;

    this.cameras.main.setBackgroundColor('#77b6cf');
    this.drawWorld();

    this.player = this.add.circle(save.world.x, save.world.y, 18, 0xfff2a8)
      .setStrokeStyle(4, 0x33436f)
      .setDepth(10);
    this.playerLabel = this.add.text(save.world.x, save.world.y - 36, 'YOU', {
      fontSize: '11px', fontStyle: 'bold', color: '#18213e',
    }).setOrigin(0.5).setDepth(10);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');

    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.cursors = keyboard.createCursorKeys();
    keyboard.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    keyboard.on('keydown-R', () => this.forceEncounter());

    const leader = this.save.party[0];
    const leaderData = species[leader.speciesId];
    this.add.rectangle(180, 54, 320, 76, 0x0d1738, 0.88).setStrokeStyle(1, 0x5d7ac2).setDepth(20);
    this.add.text(42, 30, `${leaderData.symbol} ${leaderData.name}  Lv.${leader.level}`, {
      fontSize: '19px', fontStyle: 'bold', color: '#fff',
    }).setDepth(21);
    this.add.text(42, 57, `捕捉胶囊 ${this.save.capsules}  ·  星币 ${this.save.credits}`, {
      fontSize: '14px', color: '#acd9ff',
    }).setDepth(21);

    this.statusText = this.add.text(640, 674, 'WASD / 方向键移动 · 草地区域会随机遭遇 · R 强制遭遇', {
      fontSize: '15px', color: '#eef8ff', backgroundColor: '#0d1738cc', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setDepth(25);
  }

  update(_time: number, delta: number): void {
    const speed = 0.28 * delta;
    let dx = 0;
    let dy = 0;

    if (this.keys.left.isDown || this.cursors.left.isDown) dx -= speed;
    if (this.keys.right.isDown || this.cursors.right.isDown) dx += speed;
    if (this.keys.up.isDown || this.cursors.up.isDown) dy -= speed;
    if (this.keys.down.isDown || this.cursors.down.isDown) dy += speed;

    if (dx === 0 && dy === 0) return;

    this.player.x = Phaser.Math.Clamp(this.player.x + dx, 30, 1250);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy, 120, 690);
    this.playerLabel.setPosition(this.player.x, this.player.y - 36);
    this.save.world = { x: this.player.x, y: this.player.y };
    this.encounterCooldown -= delta;

    if (this.inGrass() && this.encounterCooldown <= 0 && Math.random() < 0.022) {
      this.forceEncounter();
    }
  }

  private drawWorld(): void {
    this.add.rectangle(640, 405, 1280, 630, 0xa9d7c1);
    this.add.rectangle(640, 432, 890, 154, 0xe9d6a7).setStrokeStyle(3, 0xd0b983);
    this.add.rectangle(640, 257, 320, 160, 0xd8e9ef).setStrokeStyle(4, 0x6989a1);
    this.add.text(640, 245, '星港广场', { fontSize: '30px', fontStyle: 'bold', color: '#30405d' }).setOrigin(0.5);
    this.add.text(640, 281, 'MVP HUB', { fontSize: '13px', color: '#677995' }).setOrigin(0.5);

    this.add.rectangle(165, 560, 250, 180, 0x5caa71, 0.8).setStrokeStyle(4, 0x347048);
    this.add.rectangle(1115, 560, 250, 180, 0x5caa71, 0.8).setStrokeStyle(4, 0x347048);
    this.add.text(165, 560, '野生草地\nENCOUNTER ZONE', {
      fontSize: '19px', fontStyle: 'bold', color: '#163c28', align: 'center',
    }).setOrigin(0.5);
    this.add.text(1115, 560, '野生草地\nENCOUNTER ZONE', {
      fontSize: '19px', fontStyle: 'bold', color: '#163c28', align: 'center',
    }).setOrigin(0.5);

    const signs = [
      [250, 190, '研究站'], [1020, 190, '星灵仓库'], [300, 400, '训练场'], [980, 400, '传送门 · 未开放'],
    ] as const;
    signs.forEach(([x, y, text]) => {
      this.add.rectangle(x, y, 170, 52, 0x31568a, 0.92).setStrokeStyle(2, 0x99d4ff);
      this.add.text(x, y, text, { fontSize: '15px', color: '#fff' }).setOrigin(0.5);
    });
  }

  private inGrass(): boolean {
    return this.player.y > 470 && (this.player.x < 290 || this.player.x > 990);
  }

  private forceEncounter(): void {
    this.encounterCooldown = 1600;
    writeSave(this.save);

    const wildSpeciesId = wildSpeciesIds[Math.floor(Math.random() * wildSpeciesIds.length)];
    const leaderLevel = this.save.party[0].level;
    const request: BattleRequest = {
      wildSpeciesId,
      wildLevel: Phaser.Math.Clamp(leaderLevel + Phaser.Math.Between(-2, 1), 2, 12),
    };

    this.statusText.setText(`发现野生 ${species[wildSpeciesId].name}！`);
    this.time.delayedCall(240, () => this.scene.start('battle', request));
  }
}
