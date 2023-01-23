import Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";
import * as Utils from "~/utils/common";

enum Direction {
  Up,
  Down,
  Left,
  Right,
  None
}

enum HealthState {
  Idle,
  Damage,
}
export default class BigZombie extends Phaser.Physics.Arcade.Sprite {
  private damageVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private direction: Direction = Phaser.Math.Between(0, 3);
  private speed: integer = 100;
  private healthState: HealthState = HealthState.Idle;
  private hitpoints: integer = 20;
  private moveEvent: Phaser.Time.TimerEvent;
  private sinceDamaged: number = 0;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);

    this.anims.play(AnimationKeys.BigZombieIdle);

    this.scale = 3;

    scene.physics.world.on(
      Phaser.Physics.Arcade.Events.TILE_COLLIDE,
      this.handleTileCollision,
      this
    );

    this.moveEvent = scene.time.addEvent({
      delay: 2000,
      callback: () => {
        if (this.onCamera()) {
          this.direction = Phaser.Math.Between(0, 3);
        }
      },
      loop: true,
    });
  }

  destroy(fromScene?: boolean): void {
    this.moveEvent.destroy();
    super.destroy();
  }

  private handleTileCollision(
    go: Phaser.GameObjects.GameObject,
    tile: Phaser.Tilemaps.Tile
  ): void {
    if (go != this) {
      return;
    }
    this.direction = Phaser.Math.Between(0, 3);
  }

  onCamera(): boolean {
    return Utils.onCamera(this.scene.cameras.main, this);
  }

  preUpdate(t: number, dt: number): void {
    if (this.onCamera()) {
      super.preUpdate(t, dt);
      switch (this.healthState) {
        case HealthState.Idle:
          break;
        case HealthState.Damage:
          this.sinceDamaged += dt;
          if (this.sinceDamaged > 50) {
            this.healthState = HealthState.Idle;
            this.setTint(0xffffff);
            this.sinceDamaged = 0;
            this.damageVector.reset();
          }
          break;
      }

      const vectors = { x: 0, y: 0 };
      switch (this.direction) {
        case Direction.Up:
          vectors.y = -this.speed;
          break;
        case Direction.Down:
          vectors.y = this.speed;
          break;
        case Direction.Left:
          vectors.x = -this.speed;
          break;
        case Direction.Right:
          vectors.x = this.speed;
          break;
        case Direction.None:
          vectors.x = 0;
          vectors.y = 0;
          break;
      }
      this.setVelocity(
        vectors.x + this.damageVector.x,
        vectors.y + this.damageVector.y
      );
    }
  }

  get dead(): boolean {
    return this.hitpoints <= 0;
  }

  handleDamage(weapon: Phaser.Physics.Arcade.Sprite, damage: number): void {
    if (this.healthState === HealthState.Idle) {
      this.hitpoints -= damage;
      if (this.dead) {
        this.moveEvent.destroy();
        super.destroy();
      } else {
        this.damageVector
          .set(this.x - weapon.x, this.y - weapon.y)
          .normalize()
          .scale(20);
        this.setTint(0xff0000);
        this.sinceDamaged = 0;
        this.healthState = HealthState.Damage;
      }
    }
  }

}
