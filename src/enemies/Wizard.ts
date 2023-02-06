import Phaser from "phaser";
import * as EventCenter from "~/events/EventCenter";
import AnimationKeys from "~/consts/AnimationKeys";
import Events from "~/consts/Events";
import * as Utils from "~/utils/common";
import Enemy from "./Enemy";

export default class Wizard extends Enemy {
  private fireballs?: Phaser.Physics.Arcade.Group;
  private firing: boolean = false;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame, {
      bodyOffset: { y: 11 },
      bodySizeCoefficients: { height: 0.6, width: 0.9 },
      hitpoints: 2,
    });

    this.anims.play(AnimationKeys.WizardIdle);
  }

  setFireballs(fireballs: Phaser.Physics.Arcade.Group): void {
    this.fireballs = fireballs;
  }

  update(target: { x: number; y: number }): void {
    if (this.onCamera()) {
      if (!this.firing && this.canSeeTarget(target)) {
        this.throwFireball(target);
      }
      super.update(target);
    }
  }

  throwFireball(target: { x: number; y: number }): void {
    this.stopMoving();
    this.firing = true;
    this.scene.time.delayedCall(3000, () => {
      this.firing = false;
    });
    const fireball = this.fireballs?.get(
      this.x,
      this.y
    ) as Phaser.Physics.Arcade.Image;
    enableFireball(fireball);
    fireFireball(this, target, fireball);
  }
}

const enableFireball = (fireball: Phaser.Physics.Arcade.Image): void => {
  fireball.setActive(true);
  fireball.setVisible(false);
  const body = fireball.body as Phaser.Physics.Arcade.Body;
  body.setSize(5, 5);
  body.setEnable(true);
};

const fireFireball = (
  origin: { x: number; y: number },
  target: { x: number; y: number },
  fireball: Phaser.Physics.Arcade.Image
): void => {
  const vector = Utils.calculateUnitVector(origin, target);
  const fireballVelocity = 300;
  fireball.setRotation(vector.angle());
  fireball.setVelocity(
    vector.x * fireballVelocity,
    vector.y * fireballVelocity
  );
  fireball.x += vector.x;
  fireball.y += vector.y;
  EventCenter.sceneEvents.emit(Events.WizardFireballThrown, { fireball });
};
