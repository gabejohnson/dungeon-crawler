import Phaser from "phaser";
import * as Utils from "~/utils/common";

type BodyOffset = { x?: integer; y?: integer };

type BodySizeCoefficients = { height: number; width: number };

enum HealthState {
  Idle,
  Damage,
}

const Tint = { Damaged: 0xff0000, Idle: 0xffffff };

type Stats = {
  attackFrequency?: integer;
  bodyOffset?: BodyOffset;
  bodySizeCoefficients?: BodySizeCoefficients;
  damagedTime?: integer;
  hitpoints?: integer;
  knockBack?: integer;
  scale?: integer;
  speed?: integer;
};

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  private attackFrequency: integer;
  private _bodyOffset?: BodyOffset;
  private _bodySizeCoefficients: BodySizeCoefficients;
  private _damagedTime: integer;
  private _hitpoints: number;
  private knockBack: integer;
  private _speed: number;
  private damageVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private direction: Utils.Direction = Utils.getRandomCardinalDirection();
  private sinceDamaged: number = 0;
  private sinceLastAttack: integer = 0;
  private healthState: HealthState = HealthState.Idle;
  private _walls?: Phaser.Tilemaps.TilemapLayer;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number,
    stats: Stats = {}
  ) {
    super(scene, x, y, texture, frame);

    this.attackFrequency = stats.attackFrequency ?? 1000;
    this._bodyOffset = stats.bodyOffset;
    this._bodySizeCoefficients = stats.bodySizeCoefficients ?? {
      height: 1,
      width: 1,
    };
    this._damagedTime = stats.damagedTime ?? 50;
    this._hitpoints = stats.hitpoints ?? 1;
    this.knockBack = stats.knockBack ?? 200;
    this.scale = stats.scale ?? 1;
    this._speed = stats.speed ?? 50;

    scene.physics.world.on(
      Phaser.Physics.Arcade.Events.TILE_COLLIDE,
      this.handleTileCollision,
      this
    );
  }

  attack(target: Utils.Coordinates): void {
    this.changeDirection(Utils.getRandomCardinalDirection());
  }

  setWalls(walls: Phaser.Tilemaps.TilemapLayer): void {
    this._walls = walls;
  }

  changeDirection(direction: Utils.Direction): void {
    this.direction = direction;
  }

  get dead(): boolean {
    return this._hitpoints <= 0;
  }

  get walls(): Phaser.Tilemaps.TilemapLayer | undefined {
    return this._walls;
  }

  destroy(fromScene?: boolean): void {
    this.disableBody(true);
    const deathDuration = 1000;
    const interval = setInterval(() => {
      this.alpha -= 0.1;
    }, deathDuration / 10);

    setTimeout(() => {
      clearInterval(interval);
      super.destroy();
    }, deathDuration);
  }

  handleDamage(weapon: Phaser.Physics.Arcade.Sprite, damage: number): void {
    if (this.healthState === HealthState.Idle) {
      this._hitpoints -= damage;
      if (this.dead) {
        this.destroy();
      } else {
        this.setDamaged({ x: this.x - weapon.x, y: this.y - weapon.y });
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

  initBody() {
    this.body.setSize(
      this.width * this._bodySizeCoefficients.width,
      this.height * this._bodySizeCoefficients.height
    );
    this.body.offset.y = this._bodyOffset?.y ?? this.body.offset.y;
    this.body.onCollide = true;
  }

  preUpdate(t: number, dt: number): void {
    if (this.onCamera()) {
      super.preUpdate(t, dt);
      this.sinceLastAttack += dt;
      if (this.sinceLastAttack > this.attackFrequency) {
        this.sinceLastAttack = 0;
      }
      switch (this.healthState) {
        case HealthState.Idle:
          break;
        case HealthState.Damage:
          this.sinceDamaged += dt;
          if (this.sinceDamaged > this._damagedTime) {
            this.setIdle();
          }
          break;
      }

      const vectors = Utils.getVelocityVectors(this.direction, this._speed);
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

  noWallsBlock(target: { x: number; y: number }): boolean {
    return !Utils.layerBlocks(this, target, this._walls);
  }

  onCamera(): boolean {
    return Utils.onCamera(this.scene.cameras.main, this);
  }

  setDamaged({ x, y }: { x: integer; y: integer }): void {
    this.damageVector.set(x, y).normalize().scale(this.knockBack);
    this.setTint(Tint.Damaged);
    this.sinceDamaged = 0;
    this.healthState = HealthState.Damage;
  }

  setIdle(): void {
    this.healthState = HealthState.Idle;
    this.setTint(Tint.Idle);
    this.sinceDamaged = 0;
    this.damageVector.reset();
  }

  shouldAttack(): boolean {
    return this.sinceLastAttack === 0;
  }

  stopMoving(): void {
    this.direction = Utils.Direction.None;
  }

  update(playerPosition: Utils.Coordinates): void {
    if (this.onCamera()) {
      if (this.shouldAttack()) {
        this.attack(playerPosition);
      }
      super.update();
    }
  }
}
