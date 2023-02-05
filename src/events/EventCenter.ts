import Phaser from "phaser";
import Events from "~/consts/Events";
import Enemy from "~/enemies/Enemy";
import Knife from "~/items/Knife";

export const sceneEvents = new Phaser.Events.EventEmitter();

sceneEvents.addListener(
  Events.WeaponHitEnemy,
  (weapon: Knife, enemy: Enemy) => {
    enemy.handleDamage(weapon as Phaser.Physics.Arcade.Sprite, 1);
    weapon.disable();
  }
);
