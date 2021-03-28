import Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";

export default class Chest extends Phaser.Physics.Arcade.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);

    this.play(AnimationKeys.ChestClosed);
  }

  open() {
    if (this.anims.currentAnim.key !== AnimationKeys.ChestClosed) {
      return 0;
    } else {
      this.play(AnimationKeys.ChestOpen);
      return Phaser.Math.Between(50, 200);
    }
  }
}
