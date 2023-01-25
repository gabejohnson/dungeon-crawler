import Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";
import * as Utils from "~/utils/common";
import Enemy from "./Enemy";

export default class BigZombie extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame, {
      attackFrequency: 2000,
      hitpoints: 20,
      knockBack: -75,
      scale: 3,
      speed: 100,
    });

    this.anims.play(AnimationKeys.BigZombieIdle);
  }

  handleDamage(weapon: Phaser.Physics.Arcade.Sprite, damage: number): void {
    super.handleDamage(weapon, damage);
  }
}
