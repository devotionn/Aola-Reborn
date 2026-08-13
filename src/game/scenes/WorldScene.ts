import Phaser from 'phaser';
import { species, wildSpeciesIds } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { maxHpFor, restoreCreature } from '../systems/BattleSystem';
import type { BattleRequest, PlayerSave } from '../types';

export class WorldScene extends Phaser.Scene {
  private save!: PlayerSave;
  private player!: Phaser.GameObjects.Arc;
  private playerLabel!: Phaser.GameObjects.Text;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private encounterCooldown = 0;
  private statusText!: Phaser.GameObjects.Text;
  private hudTitle!: Phaser.GameObjects.Text;
  private hudDetail!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;

  constructor() { super('world'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;
    this.cameras.main.setBackgroundColor('#77b6cf');
    this.drawWorld();

    this.player = this.add.circle(save.world.x, save.world.y, 18, 0xfff2a8).setStrokeStyle(4, 0x33436f).setDepth(10);
    this.playerLabel = this.add.text(save.world.x, save.world.y - 36, 'YOU', { fontSize: '11px', fontStyle: 'bold', color: '#18213e' }).setOrigin(0.5).setDepth(10);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');
    this.keys = keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.cursors = keyboard.createCursorKeys();
    keyboard.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    keyboard.on('keydown-R', () => this.forceEncounter());
    keyboard.on('keydown-E', () => this.interact());
    keyboard.on('keydown-P', () => this.toggleCollection());
    keyboard.on('keydown-ESC', () => this.closeOverlay());
    keyboard.on('keydown-ONE', () => this.makeLeader(0));
    keyboard.on('keydown-TWO', () => this.makeLeader(1));
    keyboard.on('keydown-THREE', () => this.makeLeader(2));
    keyboard.on('keydown-FOUR', () => this.makeLeader(3));

    this.add.rectangle(180, 54, 320, 76, 0x0d1738, 0.88).setStrokeStyle(1, 0x5d7ac2).setDepth(20);
    this.hudTitle = this.add.text(42, 30, '', { fontSize: '19px', fontStyle: 'bold', color: '#fff' }).setDepth(21);
    this.hudDetail = this.add.text(42, 57, '', { fontSize: '14px', color: '#acd9ff' }).setDepth(21);
    this.refreshHud();
    this.statusText = this.add.text(640, 674, 'WASD 移动 · E 交互 · P 星灵仓库 · 星门前往星落原野 · R 测试遭遇', { fontSize: '15px', color: '#eef8ff', backgroundColor: '#0d1738cc', padding: { x: 18, y: 10 } }).setOrigin(0.5).setDepth(25);
  }

  update(_time: number, delta: number): void {
    if (this.overlay) return;
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
    if (this.inGrass() && this.encounterCooldown <= 0 && Math.random() < 0.022) this.forceEncounter();
  }

  private drawWorld(): void {
    this.add.rectangle(640, 405, 1280, 630, 0xa9d7c1);
    this.add.rectangle(640, 432, 890, 154, 0xe9d6a7).setStrokeStyle(3, 0xd0b983);
    this.add.rectangle(640, 257, 320, 160, 0xd8e9ef).setStrokeStyle(4, 0x6989a1);
    this.add.text(640, 235, '星辉恢复中心', { fontSize: '27px', fontStyle: 'bold', color: '#30405d' }).setOrigin(0.5);
    this.add.text(640, 274, '靠近后按 E 恢复队伍', { fontSize: '14px', color: '#677995' }).setOrigin(0.5);
    this.drawService(250, 190, '研究站', '首次补给');
    this.drawService(1020, 190, '星灵仓库', 'E / P 打开');
    this.drawService(300, 400, '训练场', '建设中');
    this.drawService(980, 400, '星门', '星落原野 · E');
    this.add.rectangle(165, 560, 250, 180, 0x5caa71, 0.8).setStrokeStyle(4, 0x347048);
    this.add.rectangle(1115, 560, 250, 180, 0x5caa71, 0.8).setStrokeStyle(4, 0x347048);
    this.add.text(165, 560, '野生草地\nENCOUNTER ZONE', { fontSize: '19px', fontStyle: 'bold', color: '#163c28', align: 'center' }).setOrigin(0.5);
    this.add.text(1115, 560, '野生草地\nENCOUNTER ZONE', { fontSize: '19px', fontStyle: 'bold', color: '#163c28', align: 'center' }).setOrigin(0.5);
  }

  private drawService(x: number, y: number, title: string, detail: string): void {
    this.add.rectangle(x, y, 176, 60, 0x31568a, 0.92).setStrokeStyle(2, 0x99d4ff);
    this.add.text(x, y - 9, title, { fontSize: '15px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5);
    this.add.text(x, y + 12, detail, { fontSize: '11px', color: '#b9dcff' }).setOrigin(0.5);
  }

  private interact(): void {
    if (this.overlay) return;
    if (this.near(640, 257, 150)) { this.restoreParty(); return; }
    if (this.near(1020, 190, 125)) { this.openCollection(); return; }
    if (this.near(250, 190, 125)) { this.claimResearchKit(); return; }
    if (this.near(300, 400, 120)) { this.statusText.setText('训练场正在施工：后续将承载教学与属性试炼。'); return; }
    if (this.near(980, 400, 120)) { writeSave(this.save); this.scene.start('wild'); return; }
    this.statusText.setText('这里没有可以交互的设施。靠近建筑后再按 E。');
  }

  private restoreParty(): void {
    this.save.party.forEach(restoreCreature);
    writeSave(this.save);
    this.refreshHud();
    this.statusText.setText('恢复完成！队伍成员的 HP 已全部恢复。');
  }

  private claimResearchKit(): void {
    this.save.flags ??= {};
    if (this.save.flags.researchStarterKit) {
      this.statusText.setText('研究员：首批补给已经领取。去草地记录更多星灵吧！');
      return;
    }
    this.save.flags.researchStarterKit = true;
    this.save.capsules += 4;
    this.save.credits += 120;
    writeSave(this.save);
    this.refreshHud();
    this.statusText.setText('研究员送来补给：捕捉胶囊 ×4、星币 ×120。');
  }

  private toggleCollection(): void {
    if (this.overlay) this.closeOverlay(); else this.openCollection();
  }

  private openCollection(): void {
    if (this.overlay) return;
    const panel = this.add.container(0, 0).setDepth(100);
    panel.add(this.add.rectangle(640, 360, 1180, 640, 0x0b1433, 0.98).setStrokeStyle(3, 0x7699d4));
    panel.add(this.add.text(92, 66, '星灵仓库', { fontSize: '34px', fontStyle: 'bold', color: '#ffffff' }));
    panel.add(this.add.text(92, 112, `发现 ${this.save.discoveredSpecies.length}/${Object.keys(species).length} · 队伍 ${this.save.party.length}/4 · 仓库 ${this.save.collection.length}`, { fontSize: '15px', color: '#a9c8ee' }));
    panel.add(this.add.text(92, 154, '当前队伍 · 点击卡片或按 1–4 设置队首', { fontSize: '18px', fontStyle: 'bold', color: '#ffe59b' }));
    this.save.party.forEach((creature, index) => {
      const data = species[creature.speciesId];
      const x = 92 + index * 276;
      const card = this.add.rectangle(x + 122, 270, 244, 170, index === 0 ? 0x304e7d : 0x182747, 1).setStrokeStyle(2, index === 0 ? 0xffdc78 : 0x516b99).setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this.makeLeader(index));
      panel.add(card);
      panel.add(this.add.text(x + 18, 205, `${data.symbol} ${data.name}`, { fontSize: '19px', fontStyle: 'bold', color: '#fff' }));
      panel.add(this.add.text(x + 18, 240, `Lv.${creature.level} · ${this.elementName(data.element)}`, { fontSize: '13px', color: '#b0cdef' }));
      panel.add(this.add.text(x + 18, 273, `HP ${creature.currentHp}/${maxHpFor(creature)}`, { fontSize: '13px', color: '#9fe5c8' }));
      panel.add(this.add.text(x + 18, 306, index === 0 ? '队首' : `${index + 1} · 设为队首`, { fontSize: '12px', color: '#ffe59b' }));
    });
    panel.add(this.add.text(92, 390, '仓库成员', { fontSize: '18px', fontStyle: 'bold', color: '#9fe5c8' }));
    if (this.save.collection.length === 0) {
      panel.add(this.add.text(92, 435, '队伍满 4 只以后，新捕捉的星灵会自动寄存在这里。', { fontSize: '15px', color: '#96aacc' }));
    } else {
      this.save.collection.slice(0, 8).forEach((creature, index) => {
        const data = species[creature.speciesId];
        const x = 92 + (index % 4) * 276;
        const y = 435 + Math.floor(index / 4) * 82;
        panel.add(this.add.rectangle(x + 122, y + 30, 244, 60, 0x15213d, 1).setStrokeStyle(1, 0x4b638e));
        panel.add(this.add.text(x + 14, y + 14, `${data.symbol} ${data.name} · Lv.${creature.level}`, { fontSize: '14px', color: '#e8f1ff' }));
        panel.add(this.add.text(x + 14, y + 37, `HP ${creature.currentHp}/${maxHpFor(creature)}`, { fontSize: '11px', color: '#9fc4ef' }));
      });
    }
    panel.add(this.add.text(640, 650, 'P / ESC 关闭', { fontSize: '14px', color: '#e4ecff' }).setOrigin(0.5));
    this.overlay = panel;
  }

  private makeLeader(index: number): void {
    if (!this.overlay || index <= 0 || index >= this.save.party.length) return;
    const [selected] = this.save.party.splice(index, 1);
    this.save.party.unshift(selected);
    writeSave(this.save);
    this.refreshHud();
    this.closeOverlay();
    this.statusText.setText(`${species[selected.speciesId].name} 已成为新的队首。`);
  }

  private closeOverlay(): void {
    this.overlay?.destroy(true);
    this.overlay = undefined;
  }

  private refreshHud(): void {
    const leader = this.save.party[0];
    const data = species[leader.speciesId];
    this.hudTitle.setText(`${data.symbol} ${data.name}  Lv.${leader.level}`);
    this.hudDetail.setText(`HP ${leader.currentHp}/${maxHpFor(leader)} · 胶囊 ${this.save.capsules} · 星币 ${this.save.credits}`);
  }

  private inGrass(): boolean {
    return this.player.y > 470 && (this.player.x < 290 || this.player.x > 990);
  }

  private near(x: number, y: number, radius: number): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) <= radius;
  }

  private forceEncounter(): void {
    if (this.overlay) return;
    const leader = this.save.party[0];
    if (leader.currentHp <= 1) {
      this.statusText.setText('队首体力太低，先到星辉恢复中心按 E 恢复。');
      return;
    }
    this.encounterCooldown = 1600;
    writeSave(this.save);
    const wildSpeciesId = wildSpeciesIds[Math.floor(Math.random() * wildSpeciesIds.length)];
    const request: BattleRequest = { wildSpeciesId, wildLevel: Phaser.Math.Clamp(leader.level + Phaser.Math.Between(-2, 1), 2, 12), returnScene: 'world' };
    this.statusText.setText(`发现野生 ${species[wildSpeciesId].name}！`);
    this.time.delayedCall(240, () => this.scene.start('battle', request));
  }

  private elementName(element: string): string {
    return ({ fire: '火系', water: '水系', nature: '木系', electric: '电系', rock: '岩系', neutral: '星系' } as Record<string, string>)[element] ?? element;
  }
}
