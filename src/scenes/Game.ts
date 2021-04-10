import Phaser from "phaser";
import SceneKeys from "~/consts/SceneKeys";
import TextureKeys from "~/consts/TextureKeys";
import * as Debug from "~/utils/debug";
import * as EnemyAnims from "~/anims/EnemyAnims";
import * as EventCenter from "~/events/EventCenter";
import * as CharacterAnims from "~/anims/CharacterAnims";
import * as TreasureAnims from "~/anims/TreasureAnims";
import Lizard from "~/enemies/Lizard";
import Player from "~/characters/Player";
import "~/characters/Player";
import Chest from "~/items/Chest";
import Wizard from "~/enemies/Wizard";
import Events from "~/consts/events";

export default class Game extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private player!: Player;
  private playerLizardsCollider?: Phaser.Physics.Arcade.Collider;
  private playerWizardsCollider?: Phaser.Physics.Arcade.Collider;
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
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
    TreasureAnims.createChestAnims(this.anims);
    const map = this.make.tilemap({ key: TextureKeys.Dungeon });
    const tileset = map.addTilesetImage(TextureKeys.Dungeon, TextureKeys.Tiles);

    map.createLayer("Ground", tileset);

    const knives = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 3,
    });

    CharacterAnims.createCharacterAnims(this.anims);
    this.player = this.add.player(128, 128, TextureKeys.Player);
    this.player.setKnives(knives);

    const lizards = this.physics.add.group({
      classType: Lizard,
      createCallback: go => {
        const lizard = go as Lizard;
        lizard.body.onCollide = true;
      },
    });
    EnemyAnims.createLizardAnims(this.anims);
    const lizardsLayer = map.getObjectLayer("Lizards");
    lizardsLayer.objects.forEach(lizardObject => {
      const lizard = lizards.get(
        lizardObject.x! + lizardObject.width! * 0.5,
        lizardObject.y! - lizardObject.height! * 0.5,
        TextureKeys.Lizard
      ) as Lizard;
      lizard.body.setSize(lizard.width * 0.9, lizard.height * 0.6);
      lizard.body.offset.y = 10;
    });

    this.wizards = this.physics.add.group({
      classType: Wizard,
      createCallback: go => {
        const wizard = go as Wizard;
        wizard.body.onCollide = true;
      },
    });
    EnemyAnims.createWizardAnims(this.anims);
    const wizardsLayer = map.getObjectLayer("Wizards");
    wizardsLayer.objects.forEach(wizardObject => {
      const wizard = this.wizards.get(
        wizardObject.x! + wizardObject.width! * 0.5,
        wizardObject.y! - wizardObject.height! * 0.5,
        TextureKeys.Wizard
      ) as Wizard;
      wizard.body.setSize(wizard.width * 0.9, wizard.height * 0.6);
      wizard.body.offset.y = 10;
    });

    const fireballs = this.physics.add.group();
    this.sparkles = this.add.particles(TextureKeys.Sparkle);

    EventCenter.sceneEvents.on(
      Events.WizardFireballThrown,
      this.handleWizardFireballThrown,
      this
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventCenter.sceneEvents.off(
        Events.WizardFireballThrown,
        this.handleWizardFireballThrown,
        this
      );
    });

    const wallsLayer = map
      .createLayer("Walls", tileset)
      .setCollisionByProperty({ collides: true });

    this.wizards.children.each((_wizard: Phaser.GameObjects.GameObject) => {
      const wizard = _wizard as Wizard;
      wizard.setFireballs(fireballs);
    });

    const chests = this.physics.add.staticGroup({
      classType: Chest,
    });
    map.getObjectLayer("Chests").objects.forEach(chestObject => {
      chests.get(
        chestObject.x! + chestObject.width! * 0.5,
        chestObject.y! - chestObject.height! * 0.5,
        TextureKeys.Treasure
      );
    });

    // Debug.debugDraw(wallsLayer, this);

    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.player, chests, handlePlayerChestCollision);
    this.physics.add.collider(lizards, wallsLayer);
    this.physics.add.collider(wizards, wallsLayer);
    this.playerLizardsCollider = this.physics.add.collider(
      lizards,
      this.player,
      handlePlayerWeaponCollision(1)
    );
    this.playerWizardsCollider = this.physics.add.collider(
      wizards,
      this.player,
      handlePlayerWeaponCollision(1)
    );
    this.physics.add.collider(knives, wallsLayer, handleKnifeWallCollision);
    this.physics.add.collider(knives, lizards, handleKnifeLizardCollision);
    this.physics.add.collider(knives, wizards, handleKnifeWizardCollision);
    this.cameras.main.startFollow(this.player, true);

    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (
        pointer: Phaser.Input.Pointer,
        _: Array<Phaser.GameObjects.GameObject>
      ) => this.player.moveTo({ x: pointer.worldX, y: pointer.worldY })
    );

    this.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      (
        pointer: Phaser.Input.Pointer,
        _: Array<Phaser.GameObjects.GameObject>
      ) => this.player.aimAt({ x: pointer.worldX, y: pointer.worldY })
    );

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Input.Events.POINTER_UP);
      this.events.off(Phaser.Input.Events.POINTER_MOVE);
    });
  }

  update(t: number, dt: number): void {
    this.player.update(this.cursors);
    if (this.player.dead) {
      if (this.playerLizardsCollider?.world) {
        this.playerLizardsCollider?.destroy();
      }
      if (this.playerWizardsCollider?.world) {
        this.playerWizardsCollider?.destroy();
      }

    this.wizards.children.each((wizard: Phaser.GameObjects.GameObject) => {
      (wizard as Wizard).update(this.player);
    });
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
  }
}

const handlePlayerChestCollision = (
  player: Phaser.GameObjects.GameObject,
  chest: Phaser.GameObjects.GameObject
): void => (player as Player).collideWithChest(chest as Chest);

const handleKnifeWallCollision = (
  knife: Phaser.GameObjects.GameObject,
  _: Phaser.GameObjects.GameObject
): void => disableImage(knife as Phaser.Physics.Arcade.Image);

const disableImage = (image: Phaser.Physics.Arcade.Image): void => {
  image.setActive(false);
  image.setVisible(false);
  const body = image.body as Phaser.Physics.Arcade.Body;
  body.setEnable(false);
};

const handlePlayerWeaponCollision = (damage: number) => (
  player: Phaser.GameObjects.GameObject,
  weapon: Phaser.GameObjects.GameObject
): void => {
  const { x, y } = (weapon as unknown) as { x: number; y: number };
  (player as Player).collideWithWeapon({ damage, x, y });
};

const handleKnifeLizardCollision = (
  _knife: Phaser.GameObjects.GameObject,
  _lizard: Phaser.GameObjects.GameObject
): void => {
  (_lizard as Lizard).destroy();
  disableImage(_knife as Phaser.Physics.Arcade.Image);
};

const handleKnifeWizardCollision = (
  _knife: Phaser.GameObjects.GameObject,
  _wizard: Phaser.GameObjects.GameObject
): void => {
  (_wizard as Wizard).handleDamage(_knife as Phaser.Physics.Arcade.Sprite, 1);
  disableImage(_knife as Phaser.Physics.Arcade.Image);
};
