import Phaser from "phaser";
import * as Utils from "~/utils/common";

enum HealthState {
  Idle,
  Damage,
}

type Stats = {
  damagedTime?: integer;
  hitpoints?: integer;
  scale?: integer;
  speed?: integer;
};

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  private _damagedTime: integer;
  private _hitpoints: number;
  private _speed: number;
  private damageVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private direction: Utils.Direction = Utils.getRandomCardinalDirection();
  private sinceDamaged: number = 0;
  private healthState: HealthState = HealthState.Idle;
  private moveEvent: Phaser.Time.TimerEvent;
  private walls?: Phaser.Tilemaps.TilemapLayer;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number,
    stats: Stats = {}
  ) {
    super(scene, x, y, texture, frame);

    this._damagedTime = stats.damagedTime ?? 50;
    this._hitpoints = stats.hitpoints ?? 2;
    this.scale = stats.scale ?? 1;
    this._speed = stats.speed ?? 50;

    scene.physics.world.on(
      Phaser.Physics.Arcade.Events.TILE_COLLIDE,
      this.handleTileCollision,
      this
    );

    this.moveEvent = scene.time.addEvent({
      delay: 2000,
      callback: () => {
        if (this.onCamera()) {
          this.changeDirection();
        }
      },
      loop: true,
    });
  }

  setWalls(walls: Phaser.Tilemaps.TilemapLayer): void {
    this.walls = walls;
  }

  changeDirection(direction: Utils.Direction): void {
    this.direction = direction;
  }

  get dead(): boolean {
    return this._hitpoints <= 0;
  }

  destroy(fromScene?: boolean): void {
    this.moveEvent.destroy();
    super.destroy();
  }

  handleDamage(
    weapon: Phaser.Physics.Arcade.Sprite,
    damage: number,
    knockBack: integer = 200
  ): void {
    if (this.healthState === HealthState.Idle) {
      this._hitpoints -= damage;
      if (this.dead) {
        this.destroy();
        super.destroy();
      } else {
        this.damageVector
          .set(this.x - weapon.x, this.y - weapon.y)
          .normalize()
          .scale(knockBack);
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
    this.changeDirection(Utils.getRandomCardinalDirection());
  }

  preUpdate(t: number, dt: number): void {
    if (this.onCamera()) {
      super.preUpdate(t, dt);
      switch (this.healthState) {
        case HealthState.Idle:
          break;
        case HealthState.Damage:
          this.sinceDamaged += dt;
          if (this.sinceDamaged > this._damagedTime) {
            this.healthState = HealthState.Idle;
            this.setTint(0xffffff);
            this.sinceDamaged = 0;
            this.damageVector.reset();
          }
          break;
      }

      const vectors = Utils.getVelocityVectors(this.direction, this.speed);
      this.setVelocity(
        vectors.x + this.damageVector.x,
        vectors.y + this.damageVector.y
      );
    }
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
      super.update();
    }
  }

  noWallsBlock(target: { x: number; y: number }): boolean {
    const line = new Phaser.Geom.Line(this.x, this.y, target.x, target.y);
    return this.walls?.findTile(Utils.tileOnPath(line)) == null;
  }
}
