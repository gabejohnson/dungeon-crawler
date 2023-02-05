import BigZombie from "~/enemies/BigZombie";
import SceneKeys from "~/consts/SceneKeys";
import Phaser from "phaser";
import TextureKeys from "~/consts/TextureKeys";
import * as Debug from "~/utils/debug";
import * as EnemyAnims from "~/anims/EnemyAnims";
import * as EnvironmentAnims from "~/anims/EnvironmentAnims";
import * as EventCenter from "~/events/EventCenter";
import * as CharacterAnims from "~/anims/CharacterAnims";
import * as TreasureAnims from "~/anims/TreasureAnims";
import Lizard from "~/enemies/Lizard";
import * as Player from "~/characters/Player";
import "~/characters/Player";
import Chest from "~/items/Chest";
import Wizard from "~/enemies/Wizard";
import Events from "~/consts/Events";
import * as Door from "~/environment/Door";
import Knife from "~/items/Knife";
import Enemy from "~/enemies/Enemy";

type Room = [number, number];

export default class Game extends Phaser.Scene {
  private bigZombies!: Phaser.Physics.Arcade.Group;
  private currentRoom?: string;
  private mapObjects: {
    doors: { [key: string]: Door.Door };
    rooms: { [key: string]: Room };
  } = { doors: {}, rooms: {} };
  private chests!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private doors!: Phaser.Physics.Arcade.Group;
  private fireballs!: Phaser.Physics.Arcade.Group;
  private knives!: Phaser.Physics.Arcade.Group;
  private lizards!: Phaser.Physics.Arcade.Group;
  private map!: Phaser.Tilemaps.Tilemap;
  private player!: Player.Player;
  private playerBigZombiesCollider?: Phaser.Physics.Arcade.Collider;
  private playerFireballsCollider?: Phaser.Physics.Arcade.Collider;
  private playerLizardsCollider?: Phaser.Physics.Arcade.Collider;
  private playerWizardsCollider?: Phaser.Physics.Arcade.Collider;
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer;
  private wizards!: Phaser.Physics.Arcade.Group;

  private wizardWeapons: WeakMap<
    Phaser.GameObjects.GameObject,
    Phaser.GameObjects.Particles.ParticleEmitter
  > = new WeakMap();

  constructor() {
    super(SceneKeys.Game);
  }

  init(): void {
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  create(): void {
    this.scene.run(SceneKeys.GameUI);
    this.map = this.make.tilemap({ key: TextureKeys.Dungeon });

    this.map.getObjectLayer("Metadata")?.objects.forEach(room => {
      this.mapObjects.rooms[room.name] = [room.x ?? 0, room.y ?? 0];
    });

    this.currentRoom = "room1";
    const room = this.mapObjects.rooms[this.currentRoom];
    this.cameras.main.centerOn(...room);

    this.map.createLayer(
      "Ground",
      this.map.addTilesetImage(TextureKeys.Ground)
    );

    this.knives = this.physics.add.group({
      classType: Knife,
      bounceX: 1,
      bounceY: 1,
      maxSize: 1,
    });

    this.wallsLayer = this.map
      .createLayer("Walls", [
        this.map.addTilesetImage(TextureKeys.Walls),
        this.map.addTilesetImage(TextureKeys.DoorFrames),
      ])
      .setCollisionByProperty({ collides: true });

    CharacterAnims.createCharacterAnims(this.anims);
    this.player = this.add.player(...room, TextureKeys.Player);
    this.player.knives = this.knives;

    this.createDoors();
    this.createChests();
    this.createBigZombies();
    this.createLizards();
    this.createWizards();

    this.addColliders();

    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (
        pointer: Phaser.Input.Pointer,
        _: Array<Phaser.GameObjects.GameObject>
      ) => Player.moveTo({ x: pointer.worldX, y: pointer.worldY }, this.player)
    );

    this.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      (
        pointer: Phaser.Input.Pointer,
        _: Array<Phaser.GameObjects.GameObject>
      ) => Player.aimAt({ x: pointer.worldX, y: pointer.worldY }, this.player)
    );

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventCenter.sceneEvents.off(
        Events.DoorOpened,
        this.handleDoorOpened,
        this
      );

      EventCenter.sceneEvents.off(
        Events.WizardFireballThrown,
        this.handleWizardFireballThrown,
        this
      );

      this.events.off(Phaser.Input.Events.POINTER_UP);
      this.events.off(Phaser.Input.Events.POINTER_MOVE);
    });
  }

  addColliders(): void {
    this.physics.add.collider(this.player, this.wallsLayer);
    this.physics.add.collider(
      this.player,
      this.doors,
      handlePlayerDoorCollision,
      processPlayerDoorCollision
    );
    this.physics.add.overlap(
      this.player,
      this.doors,
      this.handlePlayerDoorOverlap,
      processPlayerDoorOverlap,
      this
    );
    this.physics.add.collider(
      this.player,
      this.chests,
      handlePlayerChestCollision
    );
    this.physics.add.collider(this.bigZombies, this.wallsLayer);
    this.physics.add.collider(this.bigZombies, this.chests);
    this.physics.add.collider(this.lizards, this.wallsLayer);
    this.physics.add.collider(this.lizards, this.chests);
    this.physics.add.collider(this.wizards, this.wallsLayer);
    this.physics.add.collider(this.wizards, this.chests);
    this.playerBigZombiesCollider = this.physics.add.collider(
      this.bigZombies,
      this.player,
      handlePlayerWeaponCollision(1)
    );
    this.playerLizardsCollider = this.physics.add.collider(
      this.lizards,
      this.player,
      handlePlayerWeaponCollision(1)
    );
    this.playerWizardsCollider = this.physics.add.collider(
      this.wizards,
      this.player,
      handlePlayerWeaponCollision(1)
    );
    this.playerFireballsCollider = this.physics.add.collider(
      this.fireballs,
      this.player,
      this.handlePlayerFireballsCollision,
      undefined,
      this
    );
    this.physics.add.collider(this.knives, this.wallsLayer);
    this.physics.add.collider(
      this.knives,
      this.bigZombies,
      handleKnifeEnemyCollision
    );
    this.physics.add.collider(
      this.player,
      this.knives,
      handleKnifePlayerCollision
    );
    this.physics.add.collider(
      this.knives,
      this.lizards,
      handleKnifeEnemyCollision
    );
    this.physics.add.collider(
      this.knives,
      this.wizards,
      handleKnifeEnemyCollision
    );
    this.physics.add.collider(
      this.fireballs,
      this.wallsLayer,
      this.handleFireballCollision,
      undefined,
      this
    );
  }

  enterRoom(room: Room) {
    this.cameras.main.pan(
      ...room,
      1000,
      Phaser.Math.Easing.Linear,
      true,
      (camera, progress, x, y) => {
        if (progress >= 1) {
          camera.centerOn(...room);
        }
      }
    );
  }

  createBigZombies(): void {
    this.bigZombies = this.physics.add.group({
      classType: BigZombie,
      createCallback: go => {
        const bigZombie = go as BigZombie;
        bigZombie.initBody();
      },
    });
    EnemyAnims.createBigZombieAnims(this.anims);
    this.map.getObjectLayer("Boss")?.objects.forEach(bigZombieObject => {
      this.bigZombies.get(
        bigZombieObject.x! + bigZombieObject.width! * 0.5,
        bigZombieObject.y! - bigZombieObject.height! * 0.5,
        TextureKeys.BigZombie
      ) as BigZombie;
    });

    this.bigZombies.children.each((_bigZombie: Phaser.GameObjects.GameObject) =>
      (_bigZombie as BigZombie).setWalls(this.wallsLayer)
    );
  }

  createChests(): void {
    this.chests = this.physics.add.staticGroup({
      classType: Chest,
    });
    TreasureAnims.createChestAnims(this.anims);
    this.map.getObjectLayer("Chests")?.objects.forEach(chestObject => {
      this.chests.get(
        chestObject.x! + chestObject.width! * 0.5,
        chestObject.y! - chestObject.height! * 0.5,
        TextureKeys.Treasure
      );
    });
  }

  createDoors(): void {
    this.doors = this.physics.add.group({
      classType: Door.Door,
    });

    EnvironmentAnims.createDoorAnims(this.anims);
    EventCenter.sceneEvents.on(Events.DoorOpened, this.handleDoorOpened, this);
    this.map.getObjectLayer("Doors")?.objects.forEach(_door => {
      // TODO: we should abstract away calculating the coordinates
      const door = this.doors.get(
        _door.x! + _door.width! * 0.5,
        _door.y! - _door.height! * 0.5,
        TextureKeys.Doors
      ) as Door.Door;
      door.setPushable(false);
      const doorData: { destination: string; room: string } =
        _door?.properties?.reduce(
          (
            acc: { [key: string]: unknown },
            property: { name: string; value: unknown }
          ) => ((acc[property.name] = property.value), acc),
          {}
        );
      door.setDestination(doorData.destination);
      door.setRoom(doorData.room);
      door.setDirection(getDoorDirection(_door));
      this.mapObjects.doors[_door.name] = door;
    });
  }

  createLizards(): void {
    this.lizards = this.physics.add.group({
      classType: Lizard,
      createCallback: go => {
        const lizard = go as Lizard;
        lizard.initBody();
      },
    });
    EnemyAnims.createLizardAnims(this.anims);
    this.map.getObjectLayer("Lizards")?.objects.forEach(lizardObject => {
      this.lizards.get(
        lizardObject.x! + lizardObject.width! * 0.5,
        lizardObject.y! - lizardObject.height! * 0.5,
        TextureKeys.Lizard
      ) as Lizard;
    });
  }

  createWizards(): void {
    this.wizards = this.physics.add.group({
      classType: Wizard,
      createCallback: go => {
        const wizard = go as Wizard;
        wizard.initBody();
      },
    });
    EnemyAnims.createWizardAnims(this.anims);
    this.map.getObjectLayer("Wizards")?.objects.forEach(wizardObject => {
      this.wizards.get(
        wizardObject.x! + wizardObject.width! * 0.5,
        wizardObject.y! - wizardObject.height! * 0.5,
        TextureKeys.Wizard
      ) as Wizard;
    });

    this.fireballs = this.physics.add.group();
    this.sparkles = this.add.particles(TextureKeys.Sparkle);

    EventCenter.sceneEvents.on(
      Events.WizardFireballThrown,
      this.handleWizardFireballThrown,
      this
    );

    this.wizards.children.each((_wizard: Phaser.GameObjects.GameObject) => {
      const wizard = _wizard as Wizard;
      wizard.setWalls(this.wallsLayer);
      wizard.setFireballs(this.fireballs);
    });
  }

  getDoor(door: string | undefined): Door.Door | undefined {
    if (door != null) {
      return this.mapObjects.doors[door];
    }
  }

  getRoom(room: string | undefined): Room {
    return room != null ? this.mapObjects.rooms[room] : [0, 0];
  }

  update(t: number, dt: number): void {
    this.player.update(this.cursors);
    if (Player.isDead(this.player)) {
      if (this.playerBigZombiesCollider?.world) {
        this.playerBigZombiesCollider?.destroy();
      }
      if (this.playerLizardsCollider?.world) {
        this.playerLizardsCollider?.destroy();
      }
      if (this.playerWizardsCollider?.world) {
        this.playerWizardsCollider?.destroy();
      }
      if (this.playerFireballsCollider?.world) {
        this.playerFireballsCollider?.destroy();
      }
    }

    this.bigZombies.children.each((bigZombie: Phaser.GameObjects.GameObject) =>
      (bigZombie as BigZombie).update(this.player)
    );
    this.lizards.children.each((lizard: Phaser.GameObjects.GameObject) =>
      (lizard as Lizard).update(this.player)
    );
    this.wizards.children.each((wizard: Phaser.GameObjects.GameObject) =>
      (wizard as Wizard).update(this.player)
    );
  }

  private handleDoorOpened(door: Door.Door): void {
    const destinationDoor = this.getDoor(door.destination);
    door.open();
    destinationDoor?.open();
  }

  handlePlayerDoorOverlap(
    player: Phaser.GameObjects.GameObject,
    _door: Phaser.GameObjects.GameObject
  ): void {
    const door = _door as Door.Door;

    if (
      door.room !== this.currentRoom &&
      spriteIsInSprite({
        innerSprite: player as Player.Player,
        outerSprite: door,
      })
    ) {
      this.currentRoom = door.room;
      this.enterRoom(this.getRoom(this.currentRoom));
    }
  }

  handleWizardFireballThrown(eventData: {
    fireball: Phaser.GameObjects.GameObject;
  }) {
    this.wizardWeapons.set(
      eventData.fireball,
      this.sparkles.createEmitter({
        lifespan: 200,
        scale: { start: 0.07, end: 0 },
        blendMode: "ADD",
        // tint: 0xff000,
        follow: eventData.fireball,
      })
    );
  }

  handleFireballCollision(
    fireball: Phaser.GameObjects.GameObject,
    _: Phaser.GameObjects.GameObject
  ): void {
    const emitter = this.wizardWeapons.get(fireball);
    emitter?.explode(20, fireball.body.position.x, fireball.body.position.y);
    this.time.delayedCall(1000, () => emitter?.remove());
    this.wizardWeapons.delete(fireball);
    disableImage(fireball as Phaser.Physics.Arcade.Image);
  }

  handlePlayerFireballsCollision(
    player: Phaser.GameObjects.GameObject,
    fireball: Phaser.GameObjects.GameObject
  ): void {
    this.handleFireballCollision(fireball, player);
    handlePlayerWeaponCollision(1)(player, fireball);
  }
}

const getDoorDirection = (
  door: Phaser.Types.Tilemaps.TiledObject
): Door.Direction => {
  if (door.flippedVertical) {
    return Door.Direction.South;
  } else {
    return Door.Direction.North;
  }
};

const handlePlayerChestCollision = (
  player: Phaser.GameObjects.GameObject,
  chest: Phaser.GameObjects.GameObject
): void => Player.collideWithChest(chest as Chest, player as Player.Player);

const handlePlayerDoorCollision = (
  player: Phaser.GameObjects.GameObject,
  door: Phaser.GameObjects.GameObject
): void => Player.collideWithDoor(door as Door.Door, player as Player.Player);

const spriteIsInSprite = ({
  innerSprite,
  outerSprite,
}: {
  innerSprite: Phaser.Physics.Arcade.Sprite;
  outerSprite: Phaser.Physics.Arcade.Sprite;
}) => {
  const outerSpriteBounds = new Phaser.Geom.Rectangle();
  outerSprite.getBounds(outerSpriteBounds);
  const innerSpriteBounds = new Phaser.Geom.Rectangle();
  innerSprite.getBounds(innerSpriteBounds);
  return outerSpriteBounds.contains(
    innerSpriteBounds.centerX,
    innerSpriteBounds.centerY
  );
};

const processPlayerDoorCollision = (
  player: Phaser.GameObjects.GameObject,
  door: Phaser.GameObjects.GameObject
): boolean => !(door as Door.Door).isOpen;

const processPlayerDoorOverlap = (
  _: Phaser.GameObjects.GameObject,
  door: Phaser.GameObjects.GameObject
): boolean => (door as Door.Door).isOpen;

const disableImage = (image: Phaser.Physics.Arcade.Image): void => {
  image.setActive(false);
  image.setVisible(false);
  const body = image.body as Phaser.Physics.Arcade.Body;
  body.setEnable(false);
};

const handlePlayerWeaponCollision =
  (damage: number) =>
  (
    player: Phaser.GameObjects.GameObject,
    weapon: Phaser.GameObjects.GameObject
  ): void => {
    const { x, y } = weapon as unknown as { x: number; y: number };
    Player.collideWithWeapon({ damage, x, y }, player as Player.Player);
  };

const handleKnifeEnemyCollision = (
  _knife: Phaser.GameObjects.GameObject,
  _enemy: Phaser.GameObjects.GameObject
): void => {
  EventCenter.sceneEvents.emit(
    Events.WeaponHitEnemy,
    _knife as Knife,
    _enemy as Enemy
  );
};

const handleKnifeLizardCollision = (
  _knife: Phaser.GameObjects.GameObject,
  _lizard: Phaser.GameObjects.GameObject
): void => {
  (_lizard as Lizard).handleDamage(_knife as Phaser.Physics.Arcade.Sprite, 1);
  disableImage(_knife as Phaser.Physics.Arcade.Image);
};

const handleKnifePlayerCollision = (
  _: Phaser.GameObjects.GameObject,
  _knife: Phaser.GameObjects.GameObject
): void => {
  (_knife as Knife).disable();
};
