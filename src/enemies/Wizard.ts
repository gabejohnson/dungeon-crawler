import Phaser from "phaser";
import * as EventCenter from "~/events/EventCenter";
import AnimationKeys from "~/consts/AnimationKeys";
import Events from "~/consts/Events";
import * as Utils from "~/utils/common";

enum Direction {
  Up,
  Down,
  Left,
  Right,
  None,
}

enum HealthState {
  Idle,
  Damage,
}

export default class Wizard extends Phaser.Physics.Arcade.Sprite {
  private damageVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private direction: Direction = Phaser.Math.Between(0, 3);
  private fireballs?: Phaser.Physics.Arcade.Group;
  private firing: boolean = false;
  private sinceDamaged: number = 0;
  private speed: number = 50;
  private healthState: HealthState = HealthState.Idle;
  private hitpoints: number = 2;
  private moveEvent: Phaser.Time.TimerEvent;
  private walls?: Phaser.Tilemaps.TilemapLayer;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);

    this.anims.play(AnimationKeys.WizardIdle);

    scene.physics.world.on(
      Phaser.Physics.Arcade.Events.TILE_COLLIDE,
      this.handleTileCollision,
      this
    );

    this.moveEvent = scene.time.addEvent({
      delay: 2000,
      callback: () => {
        if (!this.firing && this.onCamera()) {
          this.changeDirection();
        }
      },
      loop: true,
    });
  }

  setWalls(walls: Phaser.Tilemaps.TilemapLayer): void {
    this.walls = walls;
  }

  changeDirection(): void {
    this.direction = Phaser.Math.Between(0, 3);
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
          .scale(200);
        this.setTint(0xff0000);
        this.sinceDamaged = 0;
        this.healthState = HealthState.Damage;
      }
    }
  }

  private handleTileCollision(
    go: Phaser.GameObjects.GameObject,
    tile: Phaser.Tilemaps.Tile
  ): void {
    if (go != this) {
      return;
    }
    this.changeDirection();
  }

  preUpdate(t: number, dt: number): void {
    if (this.onCamera()) {
      super.preUpdate(t, dt);
      switch (this.healthState) {
        case HealthState.Idle:
          break;
        case HealthState.Damage:
          this.sinceDamaged += dt;
          if (this.sinceDamaged > 250) {
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

  setFireballs(fireballs: Phaser.Physics.Arcade.Group): void {
    this.fireballs = fireballs;
  }

  canSeePlayer(playerPosition: { x: number; y: number }): boolean {
    return (
      (Math.abs(playerPosition.x - this.x) <= 1 ||
        Math.abs(playerPosition.y - this.y) <= 1) &&
      this.noWallsBlock(playerPosition)
    );
  }

  onCamera(): boolean {
    return Utils.onCamera(this.scene.cameras.main, this);
  }

  update(playerPosition: { x: number; y: number }): void {
    if (this.onCamera()) {
      if (!this.firing && this.canSeePlayer(playerPosition)) {
        this.throwFireball(playerPosition);
      }
      super.update();
    }
  }

  throwFireball(target: { x: number; y: number }): void {
    this.direction = Direction.None;
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

  noWallsBlock(target: { x: number; y: number }): boolean {
    const line = new Phaser.Geom.Line(this.x, this.y, target.x, target.y);
    return this.walls?.findTile(tileOnPath(line)) == null;
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
  const vector = calculateUnitVector(origin, target);
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

const calculateUnitVector = (
  origin: { x: number; y: number },
  target: { x: number; y: number }
): Phaser.Math.Vector2 =>
  new Phaser.Math.Vector2(target.x - origin.x, target.y - origin.y).normalize();

const tileOnPath = (line: Phaser.Geom.Line) => (
  tile: Phaser.Tilemaps.Tile
): boolean => {
  if (!tile.canCollide) {
    return false;
  } else {
    const rectangle = tile.getBounds();
    return (
      Phaser.Geom.Intersects.GetLineToRectangle(line, rectangle).length > 0
    );
  }
};
