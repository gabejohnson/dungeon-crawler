import Phaser, { Scene } from "phaser";
import SceneKeys from "~/consts/SceneKeys";
import TextureKeys from "~/consts/TextureKeys";

export default class Preloader extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preloader);
  }

  preload(): void {
    this.load.image(TextureKeys.Ground, "ground/ground.png");
    this.load.image(TextureKeys.Walls, "walls/walls.png");
    this.load.image(TextureKeys.DoorFrames, "doors/door_frames.png");
    this.load.tilemapTiledJSON(TextureKeys.Dungeon, "levels/dungeon-02.json");
    this.load.atlas(TextureKeys.Doors, "doors/doors.png", "doors/doors.json");
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
