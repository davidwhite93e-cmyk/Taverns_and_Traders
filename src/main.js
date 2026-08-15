import { GameLoop } from './engine/GameLoop.js';
import { ScreenManager } from './engine/ScreenManager.js';
import { CharacterCreationScreen } from './ui/CharacterCreationScreen.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const uiRoot = document.getElementById('ui-root');

const context = { canvas, state: null };
const screenManager = new ScreenManager({ canvas, uiRoot, context });

const loop = new GameLoop({
  update: () => {},
  render: () => screenManager.render(ctx, canvas),
});

screenManager.goTo(CharacterCreationScreen);
loop.start();
