import Phaser from "phaser";
import Events from "~/consts/Events";
import * as EventCenter from "~/events/EventCenter";
import * as Utils from "~/utils/common";

export default class Knife extends Phaser.Physics.Arcade.Sprite {
  private inUse: boolean = false;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);
  }

  bounce() {
    this.setRotation(this.body.velocity.angle());
  }

  disable(): void {
    this.inUse = false;
    this.setActive(false);
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setEnable(false);
  }

  enable(dimensions: { width: number; height: number }) {
    this.setActive(true);
    this.setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(dimensions.width, dimensions.height);
    body.setEnable(true);
  }

  use(
    source: { x: number; y: number },
    target: { x: number; y: number }
  ): void {
    const vectors: [{ x: number; y: number }, { x: number; y: number }] = !this
      .inUse
      ? ((this.inUse = true), [source, target])
      : [this, source];
    const vector = Utils.calculateUnitVector(...vectors);
    const weaponOffset = 15;
    const weaponVelocity = 300;
    this.setRotation(vector.angle());
    this.setVelocity(vector.x * weaponVelocity, vector.y * weaponVelocity);
    this.x += vector.x * weaponOffset;
    this.y += vector.y * weaponOffset;
  }
}

EventCenter.sceneEvents.addListener(Events.WeaponHitEnemy, (weapon: Knife) =>
  weapon.disable()
);

EventCenter.sceneEvents.addListener(Events.WeaponHitPlayer, (weapon: Knife) =>
  weapon.disable()
);

EventCenter.sceneEvents.addListener(Events.WeaponHitWall, (weapon: Knife) =>
  weapon.bounce()
);
