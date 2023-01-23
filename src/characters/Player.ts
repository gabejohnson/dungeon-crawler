import Phaser from "phaser";
import * as EventCenter from "~/events/EventCenter";
import AnimationKeys from "~/consts/AnimationKeys";
import TextureKeys from "~/consts/TextureKeys";
import Chest from "~/items/Chest";
import Events from "~/consts/Events";
import * as Door from "~/environment/Door";

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

export enum Direction {
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

export class Player extends Phaser.Physics.Arcade.Sprite {
  private _coins: number = 0;
  health: number = 6;
  activeChest?: Chest;
  activeDoor?: Door.Door;
  aimTarget: { x: number; y: number } = { x: 0, y: 0 };
  direction: Direction;
  healthState: HealthState = HealthState.Idle;
  knives?: Phaser.Physics.Arcade.Group;
  moveTarget?: { x: number; y: number };
  sinceDamaged: number = 0;
  speed: number = 100;

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

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    if (cursors != null && !isDead(this)) {
      if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
        if (this.activeChest && !this.activeChest.isOpen) {
          this._coins += this.activeChest.open();
          EventCenter.sceneEvents.emit(Events.PlayerCoinsChanged, this._coins);
        } else if (this.activeDoor && !this.activeDoor.isOpen) {
          EventCenter.sceneEvents.emit(Events.DoorOpened, this.activeDoor);
        } else {
          throwKnife(this);
        }
      }

      if (
        this.healthState !== HealthState.Damage &&
        this.healthState !== HealthState.Dead
      ) {
        this.direction = getDirection(cursors, this);
        facePlayer(this);
        if (directionalKeyIsDown(cursors)) {
          // arrow key navigation override
          this.moveTarget = undefined;
        }
        if (this.moveTarget == null) {
          moveWithKeys(this);
        } else {
          moveWithTarget(this);
        }
      }
    }
  }
}

export const aimAt = (
  target: { x: number; y: number },
  player: Player
): void => {
  player.aimTarget = target;
};

const atTarget = (player: Player): boolean => {
  const { x, y } = distanceToTarget(player);
  return x === 0 && y === 0;
};

const calculateUnitVector = (
  origin: { x: number; y: number },
  target: { x: number; y: number }
): Phaser.Math.Vector2 =>
  new Phaser.Math.Vector2(target.x - origin.x, target.y - origin.y).normalize();

export const collideWithChest = (chest: Chest, player: Player): void => {
  if (chest !== player.activeChest) {
    player.activeChest = chest;
    stop(player);
  }
};

export const collideWithDoor = (door: Door.Door, player: Player): void => {
  if (door !== player.activeDoor && !door.isOpen) {
    player.activeDoor = door;
    stop(player);
  }
};

export const collideWithWeapon = (
  weapon: { damage: number; x: number; y: number },
  player: Player
): void => {
  handleDamage(weapon, player);
  player.moveTarget = undefined;
};

const directionalKeyIsDown = ({
  up,
  down,
  left,
  right,
}: Phaser.Types.Input.Keyboard.CursorKeys): boolean =>
  up?.isDown || down?.isDown || left?.isDown || right?.isDown;

const distanceToTarget = (player: Player): { x: number; y: number } => {
  let dx = 0;
  let dy = 0;

  if (player.moveTarget) {
    dx = player.moveTarget.x - player.x;
    dy = player.moveTarget.y - player.y;

    if (Math.abs(dx) < 5) {
      dx = 0;
    }
    if (Math.abs(dy) < 5) {
      dy = 0;
    }
  }
  return { x: dx, y: dy };
};

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

const faceDown = (player: Player): void => {
  player.anims.play(AnimationKeys.PlayerRunDown, true);
};

const faceLeft = (player: Player): void => {
  player.anims.play(AnimationKeys.PlayerRunSide, true);
  player.scaleX = -1;
  player.body.offset.x = 24;
};

const facePlayer = (player: Player): void => {
  switch (player.direction) {
    case Direction.NorthEast:
      faceRight(player);
      break;

    case Direction.SouthEast:
      faceRight(player);
      break;

    case Direction.SouthWest:
      faceDown(player);
      break;

    case Direction.NorthWest:
      faceLeft(player);
      break;

    case Direction.North:
      faceUp(player);
      break;

    case Direction.East:
      faceRight(player);
      break;

    case Direction.South:
      faceDown(player);
      break;

    case Direction.West:
      faceLeft(player);
      break;

    case Direction.None:
      break;
  }
};

const faceRight = (player: Player): void => {
  player.anims.play(AnimationKeys.PlayerRunSide, true);
  player.scaleX = 1;
  player.body.offset.x = 8;
};

const faceUp = (player: Player): void => {
  player.anims.play(AnimationKeys.PlayerRunUp, true);
};

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

const getDirection = (
  cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  player: Player
): Direction => {
  let leftDown;
  let rightDown;
  let upDown;
  let downDown;

  if (player.moveTarget != null) {
    const { x: dx, y: dy } = distanceToTarget(player);

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
};

const handleDamage = (
  weapon: { damage: number; x: number; y: number },
  player: Player
): void => {
  if (player.healthState === HealthState.Idle) {
    player.health -= weapon.damage;
    if (isDead(player)) {
      killPlayer(player);
      player.healthState = HealthState.Dead;
    } else {
      const dir = new Phaser.Math.Vector2(
        player.x - weapon.x,
        player.y - weapon.y
      )
        .normalize()
        .scale(200);

      injurePlayer(dir, player);

      player.sinceDamaged = 0;
      player.healthState = HealthState.Damage;
    }
    EventCenter.sceneEvents.emit(Events.PlayerHealthChanged, player.health);
  }
};

const idle = (player: Player): void => {
  switch (player.anims.currentAnim.key) {
    case AnimationKeys.PlayerRunDown:
      player.anims.play(AnimationKeys.PlayerIdleDown, true);
      break;
    case AnimationKeys.PlayerRunSide:
      player.anims.play(AnimationKeys.PlayerIdleSide, true);
      break;
    case AnimationKeys.PlayerRunUp:
      player.anims.play(AnimationKeys.PlayerIdleUp, true);
      break;
  }
  player.setVelocity(0, 0);
};

const injurePlayer = (
  boundDirection: { x: number; y: number },
  player: Player
): void => {
  player.setVelocity(boundDirection.x, boundDirection.y);
  player.setTint(0xff0000);
};

export const isDead = (player: Player): boolean => player.health <= 0;

const isMoving = (player: Player): boolean => {
  const { x, y } = player.body.velocity;
  return x !== 0 && y !== 0;
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

const move = (velocity: { x: number; y: number }, player: Player): void => {
  player.setVelocity(velocity.x, velocity.y);
  player.activeChest = undefined;
  player.activeDoor = undefined;
};

const moveEast = (player: Player): void => {
  move({ x: player.speed, y: 0 }, player);
  aimAt({ x: player.x + 10, y: player.y }, player);
};

const moveNorth = (player: Player): void => {
  move({ x: 0, y: -player.speed }, player);
  aimAt({ x: player.x, y: player.y - 10 }, player);
};

const moveNorthEast = (player: Player): void => {
  move(
    {
      x: player.speed / 2,
      y: -player.speed / 2,
    },
    player
  );
  aimAt({ x: player.x + 5, y: player.y - 5 }, player);
};

const moveNorthWest = (player: Player): void => {
  move(
    {
      x: -player.speed / 2,
      y: -player.speed / 2,
    },
    player
  );
  aimAt({ x: player.x - 5, y: player.y - 5 }, player);
};

const moveSouth = (player: Player): void => {
  move({ x: 0, y: player.speed }, player);
  aimAt({ x: player.x, y: player.y + 10 }, player);
};

const moveSouthEast = (player: Player): void => {
  move(
    {
      x: player.speed / 2,
      y: player.speed / 2,
    },
    player
  );
  aimAt({ x: player.x + 5, y: player.y + 5 }, player);
};

const moveSouthWest = (player: Player): void => {
  move(
    {
      x: -player.speed / 2,
      y: player.speed / 2,
    },
    player
  );
  aimAt({ x: player.x - 5, y: player.y + 5 }, player);
};

export const moveTo = (
  target: { x: number; y: number },
  player: Player
): void => {
  player.moveTarget = target;
  idle(player);
};

const moveWest = (player: Player): void => {
  move({ x: -player.speed, y: 0 }, player);
  aimAt({ x: player.x - 10, y: player.y }, player);
};

const moveWithKeys = (player: Player): void => {
  switch (player.direction) {
    case Direction.NorthEast:
      moveNorthEast(player);
      break;

    case Direction.SouthEast:
      moveSouthEast(player);
      break;

    case Direction.SouthWest:
      moveSouthWest(player);
      break;

    case Direction.NorthWest:
      moveNorthWest(player);
      break;

    case Direction.North:
      moveNorth(player);
      break;

    case Direction.East:
      moveEast(player);
      break;

    case Direction.South:
      moveSouth(player);
      break;

    case Direction.West:
      moveWest(player);
      break;

    case Direction.None:
      idle(player);
      break;
  }
};

const moveWithTarget = (player: Player): void => {
  if (player.moveTarget != null) {
    if (!isMoving(player)) {
      const { x, y } = calculateUnitVector(player, player.moveTarget);
      move({ x: x * player.speed, y: y * player.speed }, player);
    } else if (atTarget(player)) {
      player.moveTarget = undefined;
      idle(player);
    }
  }
};

const stop = (player: Player): Phaser.Physics.Arcade.Sprite => {
  player.moveTarget = undefined;
  idle(player);
  return player.stop();
};

const throwKnife = (player: Player): void => {
  const knife = player.knives?.get(
    player.x,
    player.y,
    TextureKeys.Knife
  ) as Phaser.Physics.Arcade.Image;
  if (knife != null) {
    let [bodyWidth, bodyHeight] = [0, 0];
    switch (player.anims.currentAnim.key) {
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
    fireKnife(player, player.aimTarget, knife);
  }
};
