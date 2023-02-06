import Phaser from "phaser";
import * as Player from "~/characters/Player";
import Events from "~/consts/Events";
import Enemy from "~/enemies/Enemy";
import Wizard from "~/enemies/Wizard";
import * as Door from "~/environment/Door";
import Chest from "~/items/Chest";
import Knife from "~/items/Knife";

export const sceneEvents = new Phaser.Events.EventEmitter();

sceneEvents.addListener(
  Events.EnemyHitPlayer,
  (damage: integer, player: Player.Player, enemy: Enemy) => {
    const { x, y } = enemy;
    Player.collideWithWeapon({ damage, x, y }, player as Player.Player);
  }
);

sceneEvents.addListener(
  Events.PlayerHitChest,
  (player: Player.Player, chest: Chest) =>
    Player.collideWithChest(chest, player)
);
sceneEvents.addListener(
  Events.PlayerHitDoor,
  (player: Player.Player, door: Door.Door) =>
    Player.collideWithDoor(door, player)
);

sceneEvents.addListener(
  Events.WeaponHitEnemy,
  (weapon: Knife, enemy: Enemy) => {
    enemy.handleDamage(weapon as Phaser.Physics.Arcade.Sprite, 1);
    weapon.disable();
  }
);

sceneEvents.addListener(Events.WeaponHitPlayer, (weapon: Knife) => {
  weapon.disable();
});

sceneEvents.addListener(Events.WeaponHitWall, (weapon: Knife) => {
  weapon.bounce();
});
