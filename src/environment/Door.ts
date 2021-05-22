import Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";

export default class Door extends Phaser.Physics.Arcade.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);
    this.play(AnimationKeys.DoorClosed);
  }

  get isOpen(): boolean {
    return this.anims.currentAnim.key === AnimationKeys.DoorOpen;
  }

  open() {
    if (!this.isOpen) {
      this.play(AnimationKeys.DoorOpen);
    }
  }
}
