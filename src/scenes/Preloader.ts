import Phaser, { Scene } from "phaser";
import SceneKeys from "~/consts/SceneKeys";
import TextureKeys from "~/consts/TextureKeys";

export default class Preloader extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preloader);
  }

  preload() {
    this.load.image(TextureKeys.Tiles, "tiles/dungeon_tiles.png");
    this.load.tilemapTiledJSON(TextureKeys.Dungeon, "tiles/dungeon-01.json");
  }

  create() {
    this.scene.start(SceneKeys.Game);
  }
}
