import Phaser from 'phaser';
import './style.css';
import { gameConfig } from './game/config';

const game = new Phaser.Game(gameConfig);

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  const world = game.scene.getScenes(true).find((scene) => scene.scene.key === 'world');
  if (!world) return;
  const key = event.key.toLowerCase();
  if (key === 'g') world.scene.start('guide');
  if (key === 't') world.scene.start('roster');
});
