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
    super(scene, x, y, texture, frame, { hitpoints: 2 });

    this.anims.play(AnimationKeys.LizardIdle);
  }
}
