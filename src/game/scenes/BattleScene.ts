import Phaser from 'phaser';
import { moves } from '../data/moves';
import { species } from '../data/species';
import { createCreature, loadSave, writeSave } from '../state/save';
import { chooseNpcMove, grantExp, resolveTurn, speedFor } from '../systems/BattleSystem';
import type { BattleRequest, CreatureInstance, PlayerSave } from '../types';

export class BattleScene extends Phaser.Scene {
  private save!: PlayerSave;
  private partner!: CreatureInstance;
  private visitor!: CreatureInstance;
  private progress = 0;
  private busy = false;
  private logText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;

  constructor() { super('battle'); }

  create(request: BattleRequest): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }

    this.save = save;
    this.partner = save.party[0];
    this.visitor = createCreature(request.wildSpeciesId, request.wildLevel);
    if (!this.save.discoveredSpecies.includes(this.visitor.speciesId)) {
      this.save.discoveredSpecies.push(this.visitor.speciesId);
    }

    this.cameras.main.setBackgroundColor('#1f315f');
    this.add.circle(300, 340, 115, 0xf0d087, 0.18);
    this.add.circle(980, 260, 105, 0x789ed0, 0.28);
    this.drawCreature(300, 340, this.partner, true);
    this.drawCreature(980, 260, this.visitor, false);

    const partnerData = species[this.partner.speciesId];
    const visitorData = species[this.visitor.speciesId];
    this.add.text(68, 74, `${partnerData.name}  Lv.${this.partner.level}`, {
      fontSize: '25px', fontStyle: 'bold', color: '#ffffff',
    });
    this.add.text(850, 74, `野生 ${visitorData.name}  Lv.${this.visitor.level}`, {
      fontSize: '25px', fontStyle: 'bold', color: '#ffffff',
    });

    this.progressText = this.add.text(640, 126, '', {
      fontSize: '17px', color: '#9fe5c8',
    }).setOrigin(0.5);
    this.logText = this.add.text(640, 492, '', {
      fontSize: '18px', color: '#dbe8ff', align: 'center', wordWrap: { width: 760 },
    }).setOrigin(0.5);

    this.add.text(640, 560, '1 / 2 / 3：使用技能    C：尝试捕捉    ESC：返回广场', {
      fontSize: '17px', color: '#ffffff', backgroundColor: '#0a1330cc', padding: { x: 18, y: 12 },
    }).setOrigin(0.5);

    const moveNames = partnerData.moveIds.slice(0, 3).map((id, index) => `${index + 1}. ${moves[id].name}`).join('   ');
    this.add.text(640, 614, moveNames, { fontSize: '20px', fontStyle: 'bold', color: '#ffe28b' }).setOrigin(0.5);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-ONE', () => this.useMove(0));
      keyboard.on('keydown-TWO', () => this.useMove(1));
      keyboard.on('keydown-THREE', () => this.useMove(2));
      keyboard.on('keydown-C', () => this.tryTame());
      keyboard.on('keydown-ESC', () => this.leave());
    }

    this.refreshProgress();
    this.setLog(`野生 ${visitorData.name} 出现了。积累足够共鸣后即可完成本次遭遇。`);
  }

  private drawCreature(x: number, y: number, creature: CreatureInstance, partnerSide: boolean): void {
    const data = species[creature.speciesId];
    this.add.circle(x, y, partnerSide ? 82 : 74, partnerSide ? 0xf6d98c : 0x94bbec).setStrokeStyle(5, 0xffffff, 0.55);
    this.add.text(x, y, data.symbol, {
      fontSize: partnerSide ? '62px' : '56px', fontStyle: 'bold', color: '#152247',
    }).setOrigin(0.5);
  }

  private useMove(index: number): void {
    if (this.busy) return;
    const moveId = species[this.partner.speciesId].moveIds[index];
    if (!moveId) return;

    this.busy = true;
    const playerMove = moves[moveId];
    const npcMove = chooseNpcMove(this.visitor);
    const playerFirst = speedFor(this.partner) >= speedFor(this.visitor);
    const first = playerFirst
      ? resolveTurn(this.partner, this.visitor, playerMove)
      : resolveTurn(this.visitor, this.partner, npcMove);
    const second = playerFirst
      ? resolveTurn(this.visitor, this.partner, npcMove)
      : resolveTurn(this.partner, this.visitor, playerMove);

    const playerResult = playerFirst ? first : second;
    this.progress += playerResult.points;
    this.refreshProgress();

    let note = `${species[this.partner.speciesId].name} 使用 ${playerMove.name}，共鸣 +${playerResult.points}。`;
    if (playerResult.affinity > 1) note += ' 属性契合！';
    if (playerResult.affinity < 1) note += ' 属性受到抑制。';
    this.setLog(note);

    this.time.delayedCall(450, () => {
      if (this.progress >= this.goal()) this.completeEncounter();
      else this.busy = false;
    });
  }

  private tryTame(): void {
    if (this.busy) return;
    if (this.save.capsules <= 0) { this.setLog('捕捉胶囊已经用完。'); return; }
    if (this.progress < Math.floor(this.goal() * 0.65)) {
      this.setLog('共鸣还不够稳定，再互动几轮会更容易建立连接。');
      return;
    }

    this.busy = true;
    this.save.capsules -= 1;
    const caught = createCreature(this.visitor.speciesId, this.visitor.level);
    const joinsParty = this.save.party.length < 4;
    if (joinsParty) this.save.party.push(caught);
    else this.save.collection.push(caught);
    writeSave(this.save);
    this.setLog(`连接建立！${species[this.visitor.speciesId].name} 已加入${joinsParty ? '队伍' : '仓库'}。`);
    this.time.delayedCall(850, () => this.scene.start('world'));
  }

  private completeEncounter(): void {
    const exp = 18 + this.visitor.level * 8;
    const result = grantExp(this.partner, exp);
    writeSave(this.save);
    const suffix = result.levelsGained ? `，提升到 Lv.${this.partner.level}` : '';
    this.setLog(`遭遇完成！获得 ${exp} EXP${suffix}。`);
    this.time.delayedCall(950, () => this.scene.start('world'));
  }

  private leave(): void {
    if (this.busy) return;
    writeSave(this.save);
    this.scene.start('world');
  }

  private goal(): number {
    return 18 + this.visitor.level * 6;
  }

  private refreshProgress(): void {
    this.progressText.setText(`共鸣进度 ${Math.min(this.progress, this.goal())} / ${this.goal()}    ·    捕捉胶囊 ${this.save.capsules}`);
  }

  private setLog(message: string): void {
    this.logText.setText(message);
  }
}
