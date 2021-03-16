import Phaser from "phaser";
import SceneKeys from "~/consts/SceneKeys";
import TextureKeys from "~/consts/TextureKeys";

export default class Game extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Game);
  }

  preload() {}

  create() {
    const map = this.make.tilemap({ key: TextureKeys.Dungeon });
    const tileset = map.addTilesetImage(TextureKeys.Dungeon, TextureKeys.Tiles);

    map.createLayer("Ground", tileset);
    const wallsLayer = map.createLayer("Walls", tileset);

    wallsLayer.setCollisionByProperty({ collides: true });

    const debugGraphics = this.add.graphics().setAlpha(0.7);
    wallsLayer.renderDebug(debugGraphics, {
      tileColor: null,
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    });
  }
}
