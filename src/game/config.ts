import Phaser from 'phaser';
import { BagScene } from './scenes/BagScene';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { FacilityScene } from './scenes/FacilityScene';
import { FieldGuideScene } from './scenes/FieldGuideScene';
import { GroveScene } from './scenes/GroveScene';
import { MistScene } from './scenes/MistScene';
import { MoveLearnScene } from './scenes/MoveLearnScene';
import { RosterScene } from './scenes/RosterScene';
import { StarterScene } from './scenes/StarterScene';
import { WildScene } from './scenes/WildScene';
import { WorldScene } from './scenes/WorldScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 1280,
  height: 720,
  backgroundColor: '#101a3a',
  scene: [BootScene, StarterScene, WorldScene, FacilityScene, BagScene, WildScene, GroveScene, MistScene, BattleScene, MoveLearnScene, FieldGuideScene, RosterScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};