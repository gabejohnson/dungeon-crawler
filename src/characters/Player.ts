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
  private direction: Direction;
  private sinceDamaged: number = 0;
  private healthState: HealthState = HealthState.Idle;
  private knives?: Phaser.Physics.Arcade.Group;
  private speed: number = 100;

  get health() {
    return this._health;
  }

  get dead(): boolean {
    return this._health <= 0;
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

  setKnives(knives: Phaser.Physics.Arcade.Group) {
    this.knives = knives;
  }

  setChest(chest: Chest) {
    this.activeChest = chest;
  }

  handleDamage(sprite: Phaser.Physics.Arcade.Sprite) {
    if (this.healthState === HealthState.Idle) {
      this._health -= 1;
      if (this.dead) {
        killPlayer(this);
        this.healthState = HealthState.Dead;
      } else {
        const dir = new Phaser.Math.Vector2(
          this.x - sprite.x,
          this.y - sprite.y
        )
          .normalize()
          .scale(200);

        injurePlayer(dir, this);

        this.sinceDamaged = 0;
        this.healthState = HealthState.Damage;
        EventCenter.sceneEvents.emit(Events.PlayerHealthChanged, this.health);
      }
    }
  }

  preUpdate(t: number, dt: number) {
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

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    if (cursors == null) return;

    if (
      this.healthState === HealthState.Damage ||
      this.healthState === HealthState.Dead
    )
      return;

    this.direction = getDirection(cursors);

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

    if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
      if (this.activeChest) {
        this._coins += this.activeChest.open();
        EventCenter.sceneEvents.emit(Events.PlayerCoinsChanged, this._coins);
      } else {
        this.throwKnife();
      }
    }
  }

  private throwKnife() {
    const knife = this.knives?.get(
      this.x,
      this.y,
      TextureKeys.Knife
    ) as Phaser.Physics.Arcade.Image;
    if (knife != null) {
      const vector = new Phaser.Math.Vector2(0, 0);
      let [bodyWidth, bodyHeight] = [0, 0];
      switch (this.anims.currentAnim.key) {
        case AnimationKeys.PlayerIdleDown:
        case AnimationKeys.PlayerRunDown:
          vector.y = 1;
          [bodyWidth, bodyHeight] = [knife.height, knife.width];
          break;
        case AnimationKeys.PlayerIdleSide:
        case AnimationKeys.PlayerRunSide:
          vector.x = this.scaleX;
          [bodyWidth, bodyHeight] = [knife.width, knife.height];
          break;
        case AnimationKeys.PlayerIdleUp:
        case AnimationKeys.PlayerRunUp:
          vector.y = -1;
          [bodyWidth, bodyHeight] = [knife.height, knife.width];
          break;
      }

      enableKnife({ width: bodyWidth, height: bodyHeight }, vector, knife);
    }
  }

  private idle() {
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

  private moveNorth() {
    this.move({ x: 0, y: -this.speed });
    this.faceUp();
  }

  private moveNorthEast() {
    this.move({
      x: this.speed / 2,
      y: -this.speed / 2,
    });
    this.faceRight();
  }

  private moveEast() {
    this.move({ x: this.speed, y: 0 });
    this.faceRight();
  }

  private moveSouthEast() {
    this.move({
      x: this.speed / 2,
      y: this.speed / 2,
    });
    this.faceDown();
  }

  private moveSouth() {
    this.move({ x: 0, y: this.speed });
    this.faceDown();
  }

  private moveSouthWest() {
    this.move({
      x: -this.speed / 2,
      y: this.speed / 2,
    });
    this.faceDown();
  }

  private moveWest() {
    this.move({ x: -this.speed, y: 0 });
    this.faceLeft();
  }

  private moveNorthWest() {
    this.move({
      x: -this.speed / 2,
      y: -this.speed / 2,
    });
    this.faceLeft();
  }

  private move(velocity: { x: number; y: number }) {
    this.setVelocity(velocity.x, velocity.y);
    this.activeChest = undefined;
  }

  private faceUp() {
    this.anims.play(AnimationKeys.PlayerRunUp, true);
  }

  private faceDown() {
    this.anims.play(AnimationKeys.PlayerRunDown, true);
  }

  private faceLeft() {
    this.anims.play(AnimationKeys.PlayerRunSide, true);
    this.scaleX = -1;
    this.body.offset.x = 24;
  }

  private faceRight() {
    this.anims.play(AnimationKeys.PlayerRunSide, true);
    this.scaleX = 1;
    this.body.offset.x = 8;
  }
}

const enableKnife = (
  dimensions: { width: number; height: number },
  dir: Phaser.Math.Vector2,
  knife: Phaser.Physics.Arcade.Image
) => {
  const knifeOffset = 15;
  const knifeVelocity = 300;
  knife.setActive(true);
  knife.setVisible(true);
  knife.setRotation(dir.angle());
  knife.setVelocity(dir.x * knifeVelocity, dir.y * knifeVelocity);
  knife.x += dir.x * knifeOffset;
  knife.y += dir.y * knifeOffset;
  const body = knife.body as Phaser.Physics.Arcade.Body;
  body.setSize(dimensions.width, dimensions.height);
  body.setEnable(true);
};

const injurePlayer = (boundDirection: Phaser.Math.Vector2, player: Player) => {
  player.setVelocity(boundDirection.x, boundDirection.y);
  player.setTint(0xff0000);
};

const killPlayer = (player: Player) => {
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

const getDirection = (cursors: Phaser.Types.Input.Keyboard.CursorKeys) => {
  switch (true) {
    case cursors.up?.isDown && cursors.right?.isDown:
      return Direction.NorthEast;

    case cursors.right?.isDown && cursors.down?.isDown:
      return Direction.SouthEast;

    case cursors.down?.isDown && cursors.left?.isDown:
      return Direction.SouthWest;

    case cursors.left?.isDown && cursors.up?.isDown:
      return Direction.NorthWest;

    case cursors.up?.isDown:
      return Direction.North;

    case cursors.right?.isDown:
      return Direction.East;

    case cursors.down?.isDown:
      return Direction.South;

    case cursors.left?.isDown:
      return Direction.West;

    default:
      return Direction.None;
  }
};
