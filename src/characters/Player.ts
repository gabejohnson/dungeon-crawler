import Phaser from "phaser";
import * as EventCenter from "~/events/EventCenter";
import AnimationKeys from "~/consts/AnimationKeys";
import TextureKeys from "~/consts/TextureKeys";
import Chest from "~/items/Chest";
import Events from "~/consts/Events";
import * as Door from "~/environment/Door";
import * as Utils from "~/utils/common";
import Knife from "~/items/Knife";
import Enemy from "~/enemies/Enemy";

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

export class Player extends Phaser.Physics.Arcade.Sprite {
  private _coins: number = 0;
  health: number = 6;
  activeChest?: Chest;
  activeDoor?: Door.Door;
  aimTarget: { x: number; y: number } = { x: 0, y: 0 };
  direction: Utils.Direction;
  healthState: HealthState = HealthState.Idle;
  knives?: Phaser.Physics.Arcade.Group;
  moveTarget?: Utils.Coordinates;
  sinceDamaged: number = 0;
  speed: number = 100;
  weapon?: Knife;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);

    this.anims.play(AnimationKeys.PlayerIdleDown);
    this.direction = Utils.Direction.South;
  }

  get dead(): boolean {
    return this.health <= 0;
  }

  hitPlayer(damage: integer, hitVelocity: { x: integer; y: integer }): void {
    if (this.healthState === HealthState.Idle) {
      this.health -= damage;
      if (this.dead) {
        this.play(AnimationKeys.PlayerFaint);
        this.setVelocity(0, 0);
        this.healthState = HealthState.Dead;
      } else {
        const velocity = new Phaser.Math.Vector2(
          this.x - hitVelocity.x,
          this.y - hitVelocity.y
        )
          .normalize()
          .scale(200);

        this.setVelocity(velocity.x, velocity.y);
        this.setTint(0xff0000);
        this.sinceDamaged = 0;
        this.healthState = HealthState.Damage;
      }
      EventCenter.sceneEvents.emit(Events.PlayerHealthChanged, this.health);
    }
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

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    if (cursors != null && !this.dead) {
      if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
        if (this.activeChest && !this.activeChest.isOpen) {
          this._coins += this.activeChest.open();
          EventCenter.sceneEvents.emit(Events.PlayerCoinsChanged, this._coins);
        } else if (this.activeDoor && !this.activeDoor.isOpen) {
          EventCenter.sceneEvents.emit(Events.DoorOpened, this.activeDoor);
        } else {
          attack(this);
        }
      }

      if (
        this.healthState !== HealthState.Damage &&
        this.healthState !== HealthState.Dead
      ) {
        this.direction = this.moveTarget
          ? Utils.getDirectionWithTarget(this, this.moveTarget)
          : getDirectionWithCursors(cursors);
        facePlayer(this);
        if (directionalKeyIsDown(cursors)) {
          // arrow key navigation override
          this.moveTarget = undefined;
        }
        if (this.moveTarget == null) {
          moveWithDirection(this);
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

const directionalKeyIsDown = ({
  up,
  down,
  left,
  right,
}: Phaser.Types.Input.Keyboard.CursorKeys): boolean =>
  up?.isDown || down?.isDown || left?.isDown || right?.isDown;

const enableWeapon = (
  dimensions: { width: number; height: number },
  weapon: Phaser.Physics.Arcade.Image
): void => {
  weapon.setActive(true);
  weapon.setVisible(true);
  const body = weapon.body as Phaser.Physics.Arcade.Body;
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
    case Utils.Direction.NorthEast:
      faceRight(player);
      break;

    case Utils.Direction.SouthEast:
      faceRight(player);
      break;

    case Utils.Direction.SouthWest:
      faceDown(player);
      break;

    case Utils.Direction.NorthWest:
      faceLeft(player);
      break;

    case Utils.Direction.North:
      faceUp(player);
      break;

    case Utils.Direction.East:
      faceRight(player);
      break;

    case Utils.Direction.South:
      faceDown(player);
      break;

    case Utils.Direction.West:
      faceLeft(player);
      break;

    case Utils.Direction.None:
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

const getDirectionWithCursors = (
  cursors: Phaser.Types.Input.Keyboard.CursorKeys
): Utils.Direction =>
  Utils.getDirection({
    east: cursors.right?.isDown,
    north: cursors.up?.isDown,
    south: cursors.down?.isDown,
    west: cursors.left?.isDown,
  });

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

const moveWithDirection = (player: Player): void => {
  switch (player.direction) {
    case Utils.Direction.NorthEast:
      moveNorthEast(player);
      break;

    case Utils.Direction.SouthEast:
      moveSouthEast(player);
      break;

    case Utils.Direction.SouthWest:
      moveSouthWest(player);
      break;

    case Utils.Direction.NorthWest:
      moveNorthWest(player);
      break;

    case Utils.Direction.North:
      moveNorth(player);
      break;

    case Utils.Direction.East:
      moveEast(player);
      break;

    case Utils.Direction.South:
      moveSouth(player);
      break;

    case Utils.Direction.West:
      moveWest(player);
      break;

    case Utils.Direction.None:
      idle(player);
      break;
  }
};

const moveWithTarget = (player: Player): void => {
  if (player.moveTarget != null) {
    if (!Utils.isMoving(player)) {
      const { x, y } = Utils.calculateUnitVector(player, player.moveTarget);
      move({ x: x * player.speed, y: y * player.speed }, player);
    } else if (Utils.atTarget(player, player.moveTarget ?? player)) {
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

const attack = (player: Player): void => {
  const weapon = player.knives?.get(
    player.x,
    player.y,
    TextureKeys.Knife
  ) as Knife;
  if (player.weapon == null && weapon != null) {
    player.weapon = weapon;
  }
  if (weapon != null) {
    let [bodyWidth, bodyHeight] = [0, 0];
    switch (player.anims.currentAnim.key) {
      case AnimationKeys.PlayerIdleDown:
      case AnimationKeys.PlayerRunDown:
        [bodyWidth, bodyHeight] = [weapon.height, weapon.width];
        break;
      case AnimationKeys.PlayerIdleSide:
      case AnimationKeys.PlayerRunSide:
        [bodyWidth, bodyHeight] = [weapon.width, weapon.height];
        break;
      case AnimationKeys.PlayerIdleUp:
      case AnimationKeys.PlayerRunUp:
        [bodyWidth, bodyHeight] = [weapon.height, weapon.width];
        break;
    }
    weapon.enable({ width: bodyWidth, height: bodyHeight });
  }
  player.weapon?.use(player, player.aimTarget);
};

EventCenter.sceneEvents.addListener(
  Events.EnemyHitPlayer,
  (damage: integer, player: Player, enemy: Enemy) =>
    player.hitPlayer(damage, enemy)
);

EventCenter.sceneEvents.addListener(
  Events.PlayerHitChest,
  (player: Player, chest: Chest) => {
    if (chest !== player.activeChest) {
      player.activeChest = chest;
      stop(player);
    }
  }
);
EventCenter.sceneEvents.addListener(
  Events.PlayerHitDoor,
  (player: Player, door: Door.Door) => {
    if (door !== player.activeDoor && !door.isOpen) {
      player.activeDoor = door;
      stop(player);
    }
  }
);
