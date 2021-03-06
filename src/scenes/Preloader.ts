import Phaser, { Scene } from "phaser";
import SceneKeys from "~/consts/SceneKeys";
import TextureKeys from "~/consts/TextureKeys";

export default class Preloader extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preloader);
  }

  preload(): void {
    this.load.image(TextureKeys.Tiles, "tiles/dungeon_tiles.png");
    this.load.tilemapTiledJSON(TextureKeys.Dungeon, "tiles/dungeon-01.json");
    this.load.atlas(
      TextureKeys.Player,
      "characters/player.png",
      "characters/player.json"
    );
    this.load.atlas(
      TextureKeys.Lizard,
      "enemies/lizard.png",
      "enemies/lizard.json"
    );
    this.load.atlas(
      TextureKeys.Wizard,
      "enemies/wizard.png",
      "enemies/wizard.json"
    );
    this.load.atlas(
      TextureKeys.Treasure,
      "items/treasure.png",
      "items/treasure.json"
    );
    this.load.image(TextureKeys.UIHeartEmpty, "ui/ui_heart_empty.png");
    this.load.image(TextureKeys.UIHeartFull, "ui/ui_heart_full.png");
    this.load.image(TextureKeys.UIHeartHalf, "ui/ui_heart_half.png");
    this.load.image(TextureKeys.Knife, "weapons/weapon_knife.png");
    this.load.image(TextureKeys.Sparkle, "weapons/diamond_sparkle.png");
  }

  create(): void {
    this.scene.start(SceneKeys.Game);
  }
}
