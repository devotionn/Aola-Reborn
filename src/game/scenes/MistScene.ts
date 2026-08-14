import Phaser from 'phaser';
import mistMapJson from '../maps/mist-wetland.json';
import { species } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { maxHpFor } from '../systems/BattleSystem';
import { useTonicOnLeader } from '../systems/FacilitySystem';
import { collidesWithAny, containsPoint, findObject, objectsInLayer, type ObjectMapData } from '../systems/ObjectMapSystem';
import type { BattleRequest, PlayerSave } from '../types';
import { DialogueBox } from '../ui/DialogueBox';

const mistMap = mistMapJson as ObjectMapData;
const mistWildPool = ['crystalDewSnail', 'rippleFin', 'starlitBun', 'voltFinch', 'mossLanternMoth'];

export class MistScene extends Phaser.Scene {
  private save!: PlayerSave;
  private player!: Phaser.GameObjects.Arc;
  private playerLabel!: Phaser.GameObjects.Text;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private statusText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private dialogue?: DialogueBox;
  private encounterCooldown = 0;
  private readonly barriers = objectsInLayer(mistMap, 'Barriers');
  private readonly encounterZones = objectsInLayer(mistMap, 'EncounterZones');

  constructor() { super('mist'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    if (!save.flags?.groveQuestRewarded) { this.scene.start('grove'); return; }
    this.save = save;
    this.save.flags ??= {};
    this.save.inventory ??= { tonics: 0, ppRefills: 0 };

    this.cameras.main.setBackgroundColor('#667e85');
    this.drawMap();
    this.player = this.add.circle(640, 600, 18, 0xffefae).setStrokeStyle(4, 0x30405f).setDepth(30);
    this.playerLabel = this.add.text(640, 566, 'YOU', { fontSize: '11px', fontStyle: 'bold', color: '#17243d' }).setOrigin(0.5).setDepth(30);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');
    this.keys = keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.cursors = keyboard.createCursorKeys();
    keyboard.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    keyboard.on('keydown-E', () => this.interact());
    keyboard.on('keydown-B', () => this.openBag());
    keyboard.on('keydown-L', () => this.openMoveLearn());
    keyboard.on('keydown-H', () => this.useTonic());
    keyboard.on('keydown-SPACE', () => this.dialogue?.next());
    keyboard.on('keydown-ESC', () => this.returnToGrove());

    this.questText = this.add.text(34, 28, '', {
      fontSize: '15px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#10182dcc', padding: { x: 14, y: 9 },
    }).setDepth(50);
    this.statusText = this.add.text(640, 684, '第三调查区 · E 交互 · B 背包 · L 学技能 · H 快速恢复 · ESC 返回林地', {
      fontSize: '14px', color: '#eef8ff', backgroundColor: '#10182ddd', padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setDepth(50);
    this.refreshQuest();

    if (this.save.flags.mistGuardianDefeated && !this.save.flags.mistQuestRewarded) {
      this.statusText.setText('镜池雾层已经稳定。回去找观测员汐遥提交第三调查报告。');
    } else if (this.save.flags.mistQuestRewarded) {
      this.statusText.setText('第三调查已经完成。雾镜湿地恢复稳定，可继续探索和培养林地星灵。');
    }
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
    const nextY = Phaser.Math.Clamp(this.player.y + dy, 90, 655);
    if (!collidesWithAny(this.barriers, nextX, nextY, 18)) {
      this.player.setPosition(nextX, nextY);
      this.playerLabel.setPosition(nextX, nextY - 34);
    }

    this.encounterCooldown -= delta;
    if (this.inEncounterZone() && this.encounterCooldown <= 0 && Math.random() < 0.016) this.startEncounter();
  }

  private drawMap(): void {
    this.add.rectangle(640, 390, 1280, 660, 0x81959a);
    this.add.text(640, 50, '雾镜湿地', { fontSize: '34px', fontStyle: 'bold', color: '#eef8f6' }).setOrigin(0.5);
    this.add.text(640, 84, 'MIST MIRROR WETLAND · 第三调查区 · Tiled Object Map', { fontSize: '12px', color: '#d1e0df' }).setOrigin(0.5);

    this.barriers.forEach((object) => {
      const water = object.type === 'water';
      this.add.rectangle(object.x + object.width / 2, object.y + object.height / 2, object.width, object.height, water ? 0x5f8791 : 0x607769, 0.9)
        .setStrokeStyle(2, water ? 0xb6dde3 : 0x899c8d);
    });
    this.encounterZones.forEach((object) => {
      this.add.rectangle(object.x + object.width / 2, object.y + object.height / 2, object.width, object.height, 0x6f8e79, 0.72).setStrokeStyle(3, 0xa3bba1);
      this.add.text(object.x + object.width / 2, object.y + object.height / 2, object.name === 'silver-reeds' ? '银芦浅滩\n湿地遭遇区' : '雾岸草洲\n湿地遭遇区', {
        fontSize: '17px', fontStyle: 'bold', color: '#f1f7ee', align: 'center',
      }).setOrigin(0.5);
    });

    const observer = findObject(mistMap, 'Points', 'observer');
    if (observer) {
      const x = observer.x + observer.width / 2;
      const y = observer.y + observer.height / 2;
      this.add.circle(x, y, 34, 0x496e78).setStrokeStyle(3, 0xc8eef2);
      this.add.text(x, y, '汐', { fontSize: '22px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(x, y + 52, '观测员 · 汐遥', { fontSize: '13px', fontStyle: 'bold', color: '#effcff', backgroundColor: '#38515ccc', padding: { x: 8, y: 4 } }).setOrigin(0.5);
    }

    const beacon = findObject(mistMap, 'Points', 'survey-beacon');
    if (beacon) {
      const x = beacon.x + beacon.width / 2;
      const y = beacon.y + beacon.height / 2;
      this.add.circle(x, y, 42, 0x63758f).setStrokeStyle(4, 0xcce8ff);
      this.add.text(x, y, '镜', { fontSize: '25px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(x, y + 60, '雾镜信标 · E 记录', { fontSize: '13px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    }

    const nest = findObject(mistMap, 'Points', 'mirror-nest');
    if (nest) {
      const x = nest.x + nest.width / 2;
      const y = nest.y + nest.height / 2;
      this.add.circle(x, y, 48, 0x536a7d, 0.96).setStrokeStyle(4, 0xd9f0ff);
      this.add.text(x, y, '雾', { fontSize: '27px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(x, y + 66, '镜池雾巢 · E 调查', { fontSize: '13px', fontStyle: 'bold', color: '#f3fbff' }).setOrigin(0.5);
    }

    const gate = findObject(mistMap, 'Points', 'return-gate');
    if (gate) {
      this.add.rectangle(gate.x + gate.width / 2, gate.y + gate.height / 2, gate.width, gate.height, 0x415678, 0.96).setStrokeStyle(2, 0xb8ddff);
      this.add.text(gate.x + gate.width / 2, gate.y + gate.height / 2, '返回烬苔林地', { fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    }
  }

  private interact(): void {
    if (this.dialogue) { this.dialogue.next(); return; }
    const observer = findObject(mistMap, 'Points', 'observer');
    const beacon = findObject(mistMap, 'Points', 'survey-beacon');
    const nest = findObject(mistMap, 'Points', 'mirror-nest');
    const gate = findObject(mistMap, 'Points', 'return-gate');
    if (observer && containsPoint(observer, this.player.x, this.player.y, 72)) { this.talkObserver(); return; }
    if (beacon && containsPoint(beacon, this.player.x, this.player.y, 72)) { this.inspectBeacon(); return; }
    if (nest && containsPoint(nest, this.player.x, this.player.y, 78)) { this.inspectNest(); return; }
    if (gate && containsPoint(gate, this.player.x, this.player.y, 35)) { this.returnToGrove(); return; }
    this.statusText.setText('薄雾覆盖水面，附近没有其他可交互目标。');
  }

  private talkObserver(): void {
    const flags = this.save.flags!;
    if (!flags.mistQuestAccepted) {
      const priorSurvey = flags.mistBeaconSurveyed
        ? '我已经收到你之前留下的信标初测数据，省了我们不少时间。'
        : '先去中央信标记录一次雾层折射频率，我们才能定位真正的异常源。';
      this.openDialogue('观测员 · 汐遥', [
        '柏舟说你处理过晶湖的星纹回声。雾镜湿地的问题更奇怪：水面的倒影开始比实体慢半拍。',
        priorSurvey,
        '信标数据稳定后，去东北侧镜池雾巢看看。那里最近总能听见大型翼类星灵掠水的声音。',
      ], () => {
        flags.mistQuestAccepted = true;
        writeSave(this.save);
        this.refreshQuest();
        this.statusText.setText(flags.mistBeaconSurveyed ? '第三调查已接受：前往东北侧镜池雾巢。' : '第三调查已接受：先记录中央雾镜信标。');
      });
      return;
    }
    if (flags.mistGuardianDefeated && !flags.mistQuestRewarded) {
      this.openDialogue('观测员 · 汐遥', [
        '镜池的时间差已经消失，信标也恢复到稳定频段。镜雾鹭并不是在制造异常，它一直在压制失衡的雾层。',
        '这次你既完成了观测，也没有破坏湿地的守望关系。第三调查可以结案了。',
      ], () => {
        flags.mistQuestRewarded = true;
        this.save.credits += 680;
        this.save.inventory ??= { tonics: 0, ppRefills: 0 };
        this.save.inventory.tonics += 2;
        this.save.inventory.ppRefills += 2;
        writeSave(this.save);
        this.refreshQuest();
        this.statusText.setText('第三调查完成：星币 ×680、星辉恢复剂 ×2、星能补充剂 ×2。');
      });
      return;
    }
    if (flags.mistQuestRewarded) {
      this.openDialogue('观测员 · 汐遥', ['雾镜湿地已经恢复正常。林地星灵在这里会获得更高等级的训练机会，继续补全手册吧。']);
      return;
    }
    if (!flags.mistBeaconSurveyed) {
      this.openDialogue('观测员 · 汐遥', ['先完成中央雾镜信标记录。没有折射数据，我们无法判断镜池的异常来自哪里。']);
      return;
    }
    this.openDialogue('观测员 · 汐遥', ['信标数据已经够了。现在去东北侧镜池雾巢调查，异常的相位差就从那里开始。']);
  }

  private inspectBeacon(): void {
    const flags = this.save.flags!;
    if (!flags.mistQuestAccepted) {
      this.statusText.setText('信标正在等待调查协议。先和附近的观测员汐遥交谈。');
      return;
    }
    if (flags.mistBeaconSurveyed) {
      this.statusText.setText('信标记录已完成：折射延迟指向东北侧镜池雾巢。');
      return;
    }
    flags.mistBeaconSurveyed = true;
    this.save.credits += 160;
    this.save.inventory ??= { tonics: 0, ppRefills: 0 };
    this.save.inventory.ppRefills += 1;
    writeSave(this.save);
    this.refreshQuest();
    this.statusText.setText('信标记录完成：星币 ×160、星能补充剂 ×1。异常源指向东北侧镜池雾巢。');
  }

  private inspectNest(): void {
    const flags = this.save.flags!;
    if (!flags.mistQuestAccepted) {
      this.statusText.setText('雾巢周围的倒影不断错位。先去找观测员汐遥确认调查流程。');
      return;
    }
    if (!flags.mistBeaconSurveyed) {
      this.statusText.setText('现在还无法判断雾巢的相位变化。先完成中央信标记录。');
      return;
    }
    if (flags.mistGuardianDefeated) {
      this.statusText.setText('雾巢只剩平稳水汽，镜雾鹭在远处安静巡视。回汐遥处提交报告。');
      return;
    }

    const leader = this.save.party[0];
    if (leader.currentHp <= Math.floor(maxHpFor(leader) * 0.45)) {
      this.statusText.setText('队首状态偏低。镜池雾层仍很强，建议先恢复后再进入雾巢。');
      return;
    }
    this.openDialogue('镜池雾巢', [
      '信标数据在这里突然翻倍，水面上的倒影先抬起了翅膀，而真正的星灵随后才从雾里现身。',
      '镜雾鹭落在镜池边缘。它没有离开，长喙指向正在错位的水面，像是在要求你证明能够稳定这片区域。',
    ], () => {
      const request: BattleRequest = {
        wildSpeciesId: 'mistMirrorHeron',
        wildLevel: Phaser.Math.Clamp(leader.level + 5, 12, 24),
        returnScene: 'mist',
        boss: true,
        rewardCredits: 320,
        victoryFlag: 'mistGuardianDefeated',
        battleTitle: '雾镜湿地 · 镜池雾巢',
        battleSubtitle: '雾幕守望 · 镜雾鹭',
        captureBlockedMessage: '镜雾鹭正在维持湿地雾层平衡，现在无法建立捕捉连接。',
      };
      this.scene.start('battle', request);
    });
  }

  private inEncounterZone(): boolean {
    return this.encounterZones.some((zone) => containsPoint(zone, this.player.x, this.player.y));
  }

  private startEncounter(): void {
    if (this.dialogue) return;
    const leader = this.save.party[0];
    if (leader.currentHp <= 1) {
      this.statusText.setText('队首体力太低，先返回星港恢复。');
      return;
    }
    this.encounterCooldown = 1800;
    const wildSpeciesId = mistWildPool[Math.floor(Math.random() * mistWildPool.length)];
    const request: BattleRequest = {
      wildSpeciesId,
      wildLevel: Phaser.Math.Clamp(leader.level + Phaser.Math.Between(1, 4), 8, 22),
      returnScene: 'mist',
    };
    this.statusText.setText(`雾岸里出现了 ${species[wildSpeciesId].name}！`);
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
    let text = '第三调查：与观测员汐遥交谈';
    if (flags.mistQuestAccepted && !flags.mistBeaconSurveyed) text = '第三调查：记录中央雾镜信标';
    if (flags.mistQuestAccepted && flags.mistBeaconSurveyed && !flags.mistGuardianDefeated) text = '第三调查：调查东北侧镜池雾巢';
    if (flags.mistGuardianDefeated && !flags.mistQuestRewarded) text = '第三调查：向汐遥提交报告';
    if (flags.mistQuestRewarded) text = '第三调查：雾镜湿地已完成 ✓';
    this.questText.setText(text);
  }

  private openBag(): void {
    if (this.dialogue) return;
    writeSave(this.save);
    this.scene.start('bag', { returnScene: 'mist' });
  }

  private openMoveLearn(): void {
    if (this.dialogue) return;
    const leader = this.save.party[0];
    if ((leader.pendingMoveIds?.length ?? 0) === 0) {
      this.statusText.setText('当前队首没有等待学习的新技能。');
      return;
    }
    writeSave(this.save);
    this.scene.start('moveLearn', { creatureUid: leader.uid, returnScene: 'mist' });
  }

  private useTonic(): void {
    if (this.dialogue) return;
    const result = useTonicOnLeader(this.save);
    if (result.ok) writeSave(this.save);
    this.statusText.setText(result.message);
  }

  private returnToGrove(): void {
    if (this.dialogue) return;
    writeSave(this.save);
    this.scene.start('grove');
  }
}
