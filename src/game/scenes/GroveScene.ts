import Phaser from 'phaser';
import groveMapJson from '../maps/ember-grove.json';
import { species } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { maxHpFor } from '../systems/BattleSystem';
import { useTonicOnLeader } from '../systems/FacilitySystem';
import { collidesWithAny, containsPoint, findObject, objectsInLayer, type ObjectMapData } from '../systems/ObjectMapSystem';
import type { BattleRequest, PlayerSave } from '../types';
import { DialogueBox } from '../ui/DialogueBox';

const groveMap = groveMapJson as ObjectMapData;
const groveWildPool = ['mossLanternMoth', 'stoneShell', 'starlitBun', 'sproutTanuki', 'rippleFin', 'voltFinch'];

export class GroveScene extends Phaser.Scene {
  private save!: PlayerSave;
  private player!: Phaser.GameObjects.Arc;
  private playerLabel!: Phaser.GameObjects.Text;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private statusText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private dialogue?: DialogueBox;
  private encounterCooldown = 0;
  private readonly barriers = objectsInLayer(groveMap, 'Barriers');
  private readonly encounterZones = objectsInLayer(groveMap, 'EncounterZones');

  constructor() { super('grove'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    if (!save.flags?.wildQuestRewarded) { this.scene.start('wild'); return; }
    this.save = save;
    this.save.flags ??= {};

    this.cameras.main.setBackgroundColor('#5d7862');
    this.drawMap();
    this.player = this.add.circle(640, 600, 18, 0xffeaa0).setStrokeStyle(4, 0x293950).setDepth(30);
    this.playerLabel = this.add.text(640, 566, 'YOU', { fontSize: '11px', fontStyle: 'bold', color: '#17243d' }).setOrigin(0.5).setDepth(30);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');
    this.keys = keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.cursors = keyboard.createCursorKeys();
    keyboard.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    keyboard.on('keydown-E', () => this.interact());
    keyboard.on('keydown-H', () => this.useTonic());
    keyboard.on('keydown-SPACE', () => this.dialogue?.next());
    keyboard.on('keydown-ESC', () => this.returnToField());

    this.questText = this.add.text(34, 30, '', {
      fontSize: '15px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#10182dcc', padding: { x: 14, y: 9 },
    }).setDepth(50);
    this.statusText = this.add.text(640, 684, 'WASD 移动 · E 交互 · H 恢复剂 · 林地实体碰撞 · ESC 返回星落原野', {
      fontSize: '14px', color: '#eef8ff', backgroundColor: '#10182ddd', padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setDepth(50);
    this.refreshQuest();
  }

  update(_time: number, delta: number): void {
    if (this.dialogue) return;
    const speed = 0.27 * delta;
    let dx = 0;
    let dy = 0;
    if (this.keys.left.isDown || this.cursors.left.isDown) dx -= speed;
    if (this.keys.right.isDown || this.cursors.right.isDown) dx += speed;
    if (this.keys.up.isDown || this.cursors.up.isDown) dy -= speed;
    if (this.keys.down.isDown || this.cursors.down.isDown) dy += speed;
    if (dx === 0 && dy === 0) return;

    const nextX = Phaser.Math.Clamp(this.player.x + dx, 25, 1255);
    const nextY = Phaser.Math.Clamp(this.player.y + dy, 95, 655);
    if (!collidesWithAny(this.barriers, nextX, nextY, 18)) {
      this.player.setPosition(nextX, nextY);
      this.playerLabel.setPosition(nextX, nextY - 34);
    }

    this.encounterCooldown -= delta;
    if (this.inEncounterZone() && this.encounterCooldown <= 0 && Math.random() < 0.017) this.startEncounter();
  }

  private drawMap(): void {
    this.add.rectangle(640, 390, 1280, 660, 0x83966f);
    this.add.text(640, 52, '烬苔林地', { fontSize: '34px', fontStyle: 'bold', color: '#f2edcf' }).setOrigin(0.5);
    this.add.text(640, 87, 'EMBER MOSS GROVE · 第二调查区 · Tiled Object Map', { fontSize: '12px', color: '#d4ddc5' }).setOrigin(0.5);

    this.barriers.forEach((object) => {
      const isLake = object.name === 'crystal-lake';
      const color = isLake ? 0x5a8da0 : object.name.includes('grove') ? 0x405e3f : 0x4e5b54;
      this.add.rectangle(object.x + object.width / 2, object.y + object.height / 2, object.width, object.height, color, 0.92)
        .setStrokeStyle(2, isLake ? 0xa9e9f1 : 0x728071);
    });

    this.encounterZones.forEach((object) => {
      this.add.rectangle(object.x + object.width / 2, object.y + object.height / 2, object.width, object.height, 0x547f4d, 0.72)
        .setStrokeStyle(3, 0x80a46d);
      this.add.text(object.x + object.width / 2, object.y + object.height / 2, object.name === 'moss-meadow' ? '苔光草甸\n苔灯蛾出没' : '烬蕨坡\n独立遭遇区', {
        fontSize: '17px', fontStyle: 'bold', color: '#eaf4dd', align: 'center',
      }).setOrigin(0.5);
    });

    const warden = findObject(groveMap, 'Points', 'warden');
    if (warden) {
      const x = warden.x + warden.width / 2;
      const y = warden.y + warden.height / 2;
      this.add.circle(x, y, 34, 0x6f573d).setStrokeStyle(3, 0xe8cf9b);
      this.add.text(x, y, '柏', { fontSize: '21px', fontStyle: 'bold', color: '#fff7dd' }).setOrigin(0.5);
      this.add.text(x, y + 52, '巡林员 · 柏舟', { fontSize: '13px', fontStyle: 'bold', color: '#fff6dc', backgroundColor: '#364735cc', padding: { x: 8, y: 4 } }).setOrigin(0.5);
    }

    const stone = findObject(groveMap, 'Points', 'resonance-stone');
    if (stone) {
      const x = stone.x + stone.width / 2;
      const y = stone.y + stone.height / 2;
      this.add.circle(x, y, 42, 0x657b89, 0.9).setStrokeStyle(4, 0xc9ecf5);
      this.add.text(x, y, '纹', { fontSize: '24px', fontStyle: 'bold', color: '#f6fdff' }).setOrigin(0.5);
      this.add.text(x, y + 60, '星纹石 · E 调查', { fontSize: '13px', fontStyle: 'bold', color: '#edfaff' }).setOrigin(0.5);
    }

    const gate = findObject(groveMap, 'Points', 'return-gate');
    if (gate) {
      this.add.rectangle(gate.x + gate.width / 2, gate.y + gate.height / 2, gate.width, gate.height, 0x314e74, 0.96).setStrokeStyle(2, 0xb8ddff);
      this.add.text(gate.x + gate.width / 2, gate.y + gate.height / 2, '返回星落原野', { fontSize: '14px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5);
    }
  }

  private interact(): void {
    if (this.dialogue) { this.dialogue.next(); return; }
    const warden = findObject(groveMap, 'Points', 'warden');
    const stone = findObject(groveMap, 'Points', 'resonance-stone');
    const gate = findObject(groveMap, 'Points', 'return-gate');
    if (warden && containsPoint(warden, this.player.x, this.player.y, 75)) { this.talkWarden(); return; }
    if (stone && containsPoint(stone, this.player.x, this.player.y, 72)) { this.inspectStone(); return; }
    if (gate && containsPoint(gate, this.player.x, this.player.y, 35)) { this.returnToField(); return; }
    this.statusText.setText('林间只有风声和晶湖的水声，附近没有可交互目标。');
  }

  private useTonic(): void {
    if (this.dialogue) return;
    const result = useTonicOnLeader(this.save);
    if (result.ok) writeSave(this.save);
    this.statusText.setText(result.message);
  }

  private talkWarden(): void {
    const flags = this.save.flags!;
    if (!flags.groveQuestAccepted) {
      this.openDialogue('巡林员 · 柏舟', [
        '岚音说你会来。晶湖最近每到夜里都会出现不正常的星纹回声。',
        '东北侧那块星纹石本来只是路标，现在却会让附近的岩壳龟聚集过来。',
        '去确认星纹石的状态。如果有星灵被回声影响，先让它恢复平静。',
      ], () => {
        flags.groveQuestAccepted = true;
        writeSave(this.save);
        this.refreshQuest();
      });
      return;
    }
    if (flags.groveTrialCleared && !flags.groveQuestRewarded) {
      this.openDialogue('巡林员 · 柏舟', [
        '回声频率已经降下来了。看来不是晶湖失控，而是星纹石积累了太多星屑。',
        '这份林地补给归你。以后经过烬苔林地时，也可以把这里当作第二条探索路线。',
      ], () => {
        flags.groveQuestRewarded = true;
        this.save.credits += 520;
        this.save.inventory ??= { tonics: 0 };
        this.save.inventory.tonics += 2;
        writeSave(this.save);
        this.refreshQuest();
        this.statusText.setText('第二调查任务完成：星币 ×520、星辉恢复剂 ×2。');
      });
      return;
    }
    if (flags.groveQuestRewarded) {
      this.openDialogue('巡林员 · 柏舟', ['林地目前很稳定。苔灯蛾只在这片林地被记录到，适合继续补全星灵手册。']);
      return;
    }
    this.openDialogue('巡林员 · 柏舟', ['东北侧星纹石仍在发出回声，靠近后按 E 调查。']);
  }

  private inspectStone(): void {
    const flags = this.save.flags!;
    if (!flags.groveQuestAccepted) {
      this.statusText.setText('星纹石发出低沉回声。先去问问巡林员柏舟。');
      return;
    }
    if (flags.groveTrialCleared) {
      this.statusText.setText('星纹石只剩稳定的微光，附近的星灵也恢复了正常。');
      return;
    }
    const leader = this.save.party[0];
    if (leader.currentHp <= Math.floor(maxHpFor(leader) * 0.4)) {
      this.statusText.setText('队首状态偏低，建议恢复后再调查星纹石。');
      return;
    }
    this.openDialogue('星纹石', [
      '手指靠近石面的一瞬间，整片晶湖泛起同样的环形纹路。',
      '一只体型异常巨大的岩壳龟从湖边缓慢走来，背甲上的星纹与石面完全同步。',
    ], () => {
      const request: BattleRequest = {
        wildSpeciesId: 'stoneShell',
        wildLevel: Phaser.Math.Clamp(leader.level + 4, 10, 20),
        returnScene: 'grove',
        boss: true,
        rewardCredits: 240,
        victoryFlag: 'groveTrialCleared',
        battleTitle: '烬苔林地 · 晶湖星纹石',
        battleSubtitle: '共鸣个体 · 岩壳龟',
        captureBlockedMessage: '岩壳龟正处于星纹共鸣状态，现在无法完成捕捉连接。',
      };
      this.scene.start('battle', request);
    });
  }

  private inEncounterZone(): boolean {
    return this.encounterZones.some((zone) => containsPoint(zone, this.player.x, this.player.y));
  }

  private startEncounter(): void {
    const leader = this.save.party[0];
    if (leader.currentHp <= 1) {
      this.statusText.setText('队首体力太低，先返回星港恢复。');
      return;
    }
    this.encounterCooldown = 1750;
    const wildSpeciesId = groveWildPool[Math.floor(Math.random() * groveWildPool.length)];
    const request: BattleRequest = {
      wildSpeciesId,
      wildLevel: Phaser.Math.Clamp(leader.level + Phaser.Math.Between(0, 3), 5, 18),
      returnScene: 'grove',
    };
    this.statusText.setText(`林地里出现了 ${species[wildSpeciesId].name}！`);
    this.time.delayedCall(220, () => this.scene.start('battle', request));
  }

  private openDialogue(speaker: string, pages: string[], onComplete?: () => void): void {
    this.dialogue = new DialogueBox(this, speaker, pages, () => {
      this.dialogue = undefined;
      onComplete?.();
    });
  }

  private refreshQuest(): void {
    const flags = this.save.flags!;
    let text = '第二调查：与巡林员柏舟交谈';
    if (flags.groveQuestAccepted) text = '第二调查：检查东北侧星纹石';
    if (flags.groveTrialCleared && !flags.groveQuestRewarded) text = '第二调查：向柏舟汇报';
    if (flags.groveQuestRewarded) text = '第二调查：烬苔林地已完成 ✓';
    this.questText.setText(text);
  }

  private returnToField(): void {
    if (this.dialogue) return;
    writeSave(this.save);
    this.scene.start('wild');
  }
}
