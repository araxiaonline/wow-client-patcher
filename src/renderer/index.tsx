import { createRoot } from 'react-dom/client';
import { Howl } from 'howler';
import React from 'react';
import App from './App';
import bgmusic from '../../assets/sounds/frozen-throne.mp3';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

declare const window: Window;

const sound = new Howl({
  src: [bgmusic],
  autoplay: true,
  loop: true,
  html5: true,
  volume: 0.25,
});
sound.play();

/**
 * Register global events
 */
window.api.OnExitApp(() => {
  sound.stop();
  console.log('The wow client was closed.');
});

window.api.OnLaunchError((event, error) => {
  // eslint-disable-next-line no-template-curly-in-string
  console.log('The wow client failed to launch. ${error.message}');
});
