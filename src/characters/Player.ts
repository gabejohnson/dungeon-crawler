import Phaser from "phaser";
import * as EventCenter from "~/events/EventCenter";
import AnimationKeys from "~/consts/AnimationKeys";
import TextureKeys from "~/consts/TextureKeys";
import Chest from "~/items/Chest";
import Events from "~/consts/events";

declare global {
  namespace Phaser.GameObjects {
    interface GameObjectFactory {
      player(
        x: number,
        y: number,
        texture: string,
        frame?: string | number
      ): Player;
    }
  }
}

enum HealthState {
  Idle,
  Damage,
  Dead,
}

enum Direction {
  North,
  NorthEast,
  East,
  SouthEast,
  South,
  SouthWest,
  West,
  NorthWest,
  None,
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private _coins: number = 0;
  private _health: number = 6;
  private activeChest?: Chest;
  private aimTarget: { x: number; y: number } = { x: 0, y: 0 };
  private direction: Direction;
  private healthState: HealthState = HealthState.Idle;
  private knives?: Phaser.Physics.Arcade.Group;
  private moveTarget?: { x: number; y: number };
  private sinceDamaged: number = 0;
  private speed: number = 100;

  get dead(): boolean {
    return this._health <= 0;
  }

  private handleDamage(weapon: { damage: number; x: number; y: number }): void {
    if (this.healthState === HealthState.Idle) {
      this._health -= weapon.damage;
      if (this.dead) {
        killPlayer(this);
        this.healthState = HealthState.Dead;
      } else {
        const dir = new Phaser.Math.Vector2(
          this.x - weapon.x,
          this.y - weapon.y
        )
          .normalize()
          .scale(200);

        injurePlayer(dir, this);

        this.sinceDamaged = 0;
        this.healthState = HealthState.Damage;
      }
      EventCenter.sceneEvents.emit(Events.PlayerHealthChanged, this.health);
    }
  }
  get health(): number {
    return this._health;
  }

  get moving(): boolean {
    const { x, y } = this.body.velocity;
    return x !== 0 && y !== 0;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);

    this.anims.play(AnimationKeys.PlayerIdleDown);
    this.direction = Direction.South;
  }

  stop(): this {
    this.moveTarget = undefined;
    this.idle();
    return super.stop();
  }

  aimAt(target: { x: number; y: number }): void {
    this.aimTarget = target;
  }

  moveTo(target: { x: number; y: number }): void {
    this.moveTarget = target;
    this.idle();
  }

  setKnives(knives: Phaser.Physics.Arcade.Group): void {
    this.knives = knives;
  }

  collideWithChest(chest: Chest): void {
    if (chest !== this.activeChest) {
      this.activeChest = chest;
      this.stop();
    }
  }

  collideWithWeapon(weapon: { damage: number; x: number; y: number }): void {
    this.handleDamage(weapon);
    this.moveTarget = undefined;
  }

  preUpdate(t: number, dt: number): void {
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
        }
        break;
      case HealthState.Dead:
        this.setTint(0xffffff);
        this.sinceDamaged = 0;
        break;
    }
  }

  private facePlayer(): void {
    switch (this.direction) {
      case Direction.NorthEast:
        this.faceRight();
        break;

      case Direction.SouthEast:
        this.faceRight();
        break;

      case Direction.SouthWest:
        this.faceDown();
        break;

      case Direction.NorthWest:
        this.faceLeft();
        break;

      case Direction.North:
        this.faceUp();
        break;

      case Direction.East:
        this.faceRight();
        break;

      case Direction.South:
        this.faceDown();
        break;

      case Direction.West:
        this.faceLeft();
        break;

      case Direction.None:
        break;
    }
  }

  private moveWithKeys(): void {
    switch (this.direction) {
      case Direction.NorthEast:
        this.moveNorthEast();
        break;

      case Direction.SouthEast:
        this.moveSouthEast();
        break;

      case Direction.SouthWest:
        this.moveSouthWest();
        break;

      case Direction.NorthWest:
        this.moveNorthWest();
        break;

      case Direction.North:
        this.moveNorth();
        break;

      case Direction.East:
        this.moveEast();
        break;

      case Direction.South:
        this.moveSouth();
        break;

      case Direction.West:
        this.moveWest();
        break;

      case Direction.None:
        this.idle();
        break;
    }
  }

  private moveWithTarget(): void {
    if (this.moveTarget != null) {
      if (!this.moving) {
        const { x, y } = calculateUnitVector(this, this.moveTarget);
        this.move({ x: x * this.speed, y: y * this.speed });
      } else if (this.atTarget()) {
        this.moveTarget = undefined;
        this.idle();
      }
    }
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    if (cursors == null) return;

    if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
      if (this.activeChest && !this.activeChest.isOpen) {
        this._coins += this.activeChest.open();
        EventCenter.sceneEvents.emit(Events.PlayerCoinsChanged, this._coins);
      } else {
        this.throwKnife();
      }
    }

    if (
      this.healthState !== HealthState.Damage &&
      this.healthState !== HealthState.Dead
    ) {
      this.direction = this.getDirection(cursors);
      this.facePlayer();
      if (directionalKeyIsDown(cursors)) {
        // arrow key navigation override
        this.moveTarget = undefined;
      }
      if (this.moveTarget == null) {
        this.moveWithKeys();
      } else {
        this.moveWithTarget();
      }
    }
  }

  private atTarget(): boolean {
    const { x, y } = this.distancetotarget();
    return x === 0 && y === 0;
  }

  private throwKnife(): void {
    const knife = this.knives?.get(
      this.x,
      this.y,
      TextureKeys.Knife
    ) as Phaser.Physics.Arcade.Image;
    if (knife != null) {
      let [bodyWidth, bodyHeight] = [0, 0];
      switch (this.anims.currentAnim.key) {
        case AnimationKeys.PlayerIdleDown:
        case AnimationKeys.PlayerRunDown:
          [bodyWidth, bodyHeight] = [knife.height, knife.width];
          break;
        case AnimationKeys.PlayerIdleSide:
        case AnimationKeys.PlayerRunSide:
          [bodyWidth, bodyHeight] = [knife.width, knife.height];
          break;
        case AnimationKeys.PlayerIdleUp:
        case AnimationKeys.PlayerRunUp:
          [bodyWidth, bodyHeight] = [knife.height, knife.width];
          break;
      }
      enableKnife({ width: bodyWidth, height: bodyHeight }, knife);
      fireKnife(this, this.aimTarget, knife);
    }
  }

  private idle(): void {
    switch (this.anims.currentAnim.key) {
      case AnimationKeys.PlayerRunDown:
        this.anims.play(AnimationKeys.PlayerIdleDown, true);
        break;
      case AnimationKeys.PlayerRunSide:
        this.anims.play(AnimationKeys.PlayerIdleSide, true);
        break;
      case AnimationKeys.PlayerRunUp:
        this.anims.play(AnimationKeys.PlayerIdleUp, true);
        break;
    }
    this.setVelocity(0, 0);
  }

  private moveNorth(): void {
    this.move({ x: 0, y: -this.speed });
    this.aimAt({ x: this.x, y: this.y - 10 });
  }

  private moveNorthEast(): void {
    this.move({
      x: this.speed / 2,
      y: -this.speed / 2,
    });
    this.aimAt({ x: this.x + 5, y: this.y - 5 });
  }

  private moveEast(): void {
    this.move({ x: this.speed, y: 0 });
    this.aimAt({ x: this.x + 10, y: this.y });
  }

  private moveSouthEast(): void {
    this.move({
      x: this.speed / 2,
      y: this.speed / 2,
    });
    this.aimAt({ x: this.x + 5, y: this.y + 5 });
  }

  private moveSouth(): void {
    this.move({ x: 0, y: this.speed });
    this.aimAt({ x: this.x, y: this.y + 10 });
  }

  private moveSouthWest(): void {
    this.move({
      x: -this.speed / 2,
      y: this.speed / 2,
    });
    this.aimAt({ x: this.x - 5, y: this.y + 5 });
  }

  private moveWest(): void {
    this.move({ x: -this.speed, y: 0 });
    this.aimAt({ x: this.x - 10, y: this.y });
  }

  private moveNorthWest(): void {
    this.move({
      x: -this.speed / 2,
      y: -this.speed / 2,
    });
    this.aimAt({ x: this.x - 5, y: this.y - 5 });
  }

  private move(velocity: { x: number; y: number }): void {
    this.setVelocity(velocity.x, velocity.y);
    this.activeChest = undefined;
  }

  private faceUp(): void {
    this.anims.play(AnimationKeys.PlayerRunUp, true);
  }

  private faceDown(): void {
    this.anims.play(AnimationKeys.PlayerRunDown, true);
  }

  private faceLeft(): void {
    this.anims.play(AnimationKeys.PlayerRunSide, true);
    this.scaleX = -1;
    this.body.offset.x = 24;
  }

  private faceRight(): void {
    this.anims.play(AnimationKeys.PlayerRunSide, true);
    this.scaleX = 1;
    this.body.offset.x = 8;
  }

  distancetotarget(): { x: number; y: number } {
    let dx = 0;
    let dy = 0;

    if (this.moveTarget) {
      dx = this.moveTarget.x - this.x;
      dy = this.moveTarget.y - this.y;

      if (Math.abs(dx) < 5) {
        dx = 0;
      }
      if (Math.abs(dy) < 5) {
        dy = 0;
      }
    }
    return { x: dx, y: dy };
  }

  getDirection(cursors: Phaser.Types.Input.Keyboard.CursorKeys): Direction {
    let leftDown;
    let rightDown;
    let upDown;
    let downDown;

    if (this.moveTarget != null) {
      const { x: dx, y: dy } = this.distancetotarget();

      // a key is down based on dx and dy
      leftDown = dx < 0;
      rightDown = dx > 0;
      upDown = dy < 0;
      downDown = dy > 0;
    } else {
      // use cursor to determine direction
      leftDown = cursors.left?.isDown;
      rightDown = cursors.right?.isDown;
      upDown = cursors.up?.isDown;
      downDown = cursors.down?.isDown;
    }

    switch (true) {
      case upDown && rightDown:
        return Direction.NorthEast;

      case rightDown && downDown:
        return Direction.SouthEast;

      case downDown && leftDown:
        return Direction.SouthWest;

      case leftDown && upDown:
        return Direction.NorthWest;

      case upDown:
        return Direction.North;

      case rightDown:
        return Direction.East;

      case downDown:
        return Direction.South;

      case leftDown:
        return Direction.West;

      default:
        return Direction.None;
    }
  }
}

const enableKnife = (
  dimensions: { width: number; height: number },
  knife: Phaser.Physics.Arcade.Image
): void => {
  knife.setActive(true);
  knife.setVisible(true);
  const body = knife.body as Phaser.Physics.Arcade.Body;
  body.setSize(dimensions.width, dimensions.height);
  body.setEnable(true);
};

const calculateUnitVector = (
  origin: { x: number; y: number },
  target: { x: number; y: number }
): Phaser.Math.Vector2 =>
  new Phaser.Math.Vector2(target.x - origin.x, target.y - origin.y).normalize();

const directionalKeyIsDown = ({
  up,
  down,
  left,
  right,
}: Phaser.Types.Input.Keyboard.CursorKeys): boolean =>
  up?.isDown || down?.isDown || left?.isDown || right?.isDown;

const fireKnife = (
  origin: { x: number; y: number },
  target: { x: number; y: number },
  knife: Phaser.Physics.Arcade.Image
): void => {
  const vector = calculateUnitVector(origin, target);
  const knifeOffset = 15;
  const knifeVelocity = 300;
  knife.setRotation(vector.angle());
  knife.setVelocity(vector.x * knifeVelocity, vector.y * knifeVelocity);
  knife.x += vector.x * knifeOffset;
  knife.y += vector.y * knifeOffset;
};

const injurePlayer = (
  boundDirection: { x: number; y: number },
  player: Player
): void => {
  player.setVelocity(boundDirection.x, boundDirection.y);
  player.setTint(0xff0000);
};

const killPlayer = (player: Player): void => {
  player.play(AnimationKeys.PlayerFaint);
  player.setVelocity(0, 0);
};

Phaser.GameObjects.GameObjectFactory.register(
  TextureKeys.Player,
  function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    const player = new Player(this.scene, x, y, texture, frame);
    this.displayList.add(player);
    this.updateList.add(player);
    this.scene.physics.world.enableBody(
      player,
      Phaser.Physics.Arcade.DYNAMIC_BODY
    );
    player.body.setSize(player.width * 0.5, player.height * 0.8);
    return player;
  }
);
