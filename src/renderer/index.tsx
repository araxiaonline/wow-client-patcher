import { createRoot } from 'react-dom/client';
import { Howl } from 'howler';
import React from 'react';
import App from './App';
import bgmusiclk from '../../assets/sounds/frozen-throne.mp3';
import bgmusic from '../../assets/sounds/burning-crusade-bt.mp3';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

declare const window: Window;
const music = [bgmusic];

const sound = new Howl({
  src: music,
  autoplay: true,
  loop: true,
  html5: true,
  volume: 0.25,
});



/**
 * Register global events
 */
window.api.OnExitApp(() => {
  sound.stop();
});
