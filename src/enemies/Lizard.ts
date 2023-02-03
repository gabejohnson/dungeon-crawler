import Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";
import Enemy from "./Enemy";

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export default class Lizard extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame, {
      bodyOffset: { y: 10 },
      bodySizeCoefficients: { height: 0.6, width: 0.9 },
      hitpoints: 2,
    });

    this.anims.play(AnimationKeys.LizardIdle);
  }
}
