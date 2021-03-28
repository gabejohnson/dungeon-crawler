import Phaser from "phaser";

import Game from "./scenes/Game";
import GameUI from "./scenes/GameUI";
import Preloader from "./scenes/Preloader";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 400,
  height: 300,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      // debug: true,
    },
  },
  scene: [Preloader, Game, GameUI],
  scale: {
    zoom: 2,
  },
};
