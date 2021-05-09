import Phaser from "phaser";

import Game from "./scenes/Game";
import GameUI from "./scenes/GameUI";
import Preloader from "./scenes/Preloader";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 500,
  height: 400,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      // debug: true,
    },
  },
  scene: [Preloader, Game, GameUI],
  scale: {
    zoom: 1.5,
  },
};
export default new Phaser.Game(config);
