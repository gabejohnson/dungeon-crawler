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
import Events from "~/consts/events";
import "~/characters/Player";
import AnimationKeys from "~/consts/AnimationKeys";
import Chest from "~/items/Chest";
import Wizard from "~/enemies/Wizard";

export default class Game extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  // private knives!: Phaser.Physics.Arcade.Group;
  // private lizards!: Phaser.Physics.Arcade.Group;
  private player!: Player;
  private playerLizardsCollider?: Phaser.Physics.Arcade.Collider;
  private playerWizardsCollider?: Phaser.Physics.Arcade.Collider;
  constructor() {
    super(SceneKeys.Game);
  }

  preload() {
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  create() {
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

    const wizards = this.physics.add.group({
      classType: Wizard,
      createCallback: go => {
        const wizard = go as Wizard;
        wizard.body.onCollide = true;
      },
    });
    EnemyAnims.createWizardAnims(this.anims);
    const wizardsLayer = map.getObjectLayer("Wizards");
    wizardsLayer.objects.forEach(wizardObject => {
      const wizard = wizards.get(
        wizardObject.x! + wizardObject.width! * 0.5,
        wizardObject.y! - wizardObject.height! * 0.5,
        TextureKeys.Wizard
      ) as Wizard;
      wizard.body.setSize(wizard.width * 0.9, wizard.height * 0.6);
      wizard.body.offset.y = 10;
    });

    const wallsLayer = map
      .createLayer("Walls", tileset)
      .setCollisionByProperty({ collides: true });

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
      handlePlayerLizardCollision
    );
    this.playerWizardsCollider = this.physics.add.collider(
      wizards,
      this.player,
      handlePlayerWizardCollision
    );
    this.physics.add.collider(knives, wallsLayer, handleKnifeWallCollision);
    this.physics.add.collider(knives, lizards, handleKnifeLizardCollision);
    this.physics.add.collider(knives, wizards, handleKnifeWizardCollision);
    this.cameras.main.startFollow(this.player, true);
  }

  update(t: number, dt: number) {
    this.player.update(this.cursors);
    if (this.player.dead) {
      if (this.playerLizardsCollider?.world) {
        this.playerLizardsCollider?.destroy();
      }
      if (this.playerWizardsCollider?.world) {
        this.playerWizardsCollider?.destroy();
      }
    }
  }
}

const handlePlayerChestCollision = (
  _player: Phaser.GameObjects.GameObject,
  _chest: Phaser.GameObjects.GameObject
) => {
  const chest = _chest as Chest;
  const player = _player as Player;
  player.setChest(chest);
};

const handleKnifeWallCollision = (
  _knife: Phaser.GameObjects.GameObject,
  _: Phaser.GameObjects.GameObject
) => disableImage(_knife as Phaser.Physics.Arcade.Image);

const disableImage = (image: Phaser.Physics.Arcade.Image) => {
  image.setActive(false);
  image.setVisible(false);
  const body = image.body as Phaser.Physics.Arcade.Body;
  body.setEnable(false);
};

const handlePlayerLizardCollision = (
  player: Phaser.GameObjects.GameObject,
  lizard: Phaser.GameObjects.GameObject
) => (player as Player).handleDamage(lizard as Lizard);

const handleKnifeLizardCollision = (
  _knife: Phaser.GameObjects.GameObject,
  _lizard: Phaser.GameObjects.GameObject
) => {
  (_lizard as Lizard).destroy();
  disableImage(_knife as Phaser.Physics.Arcade.Image);
};

const handlePlayerWizardCollision = (
  player: Phaser.GameObjects.GameObject,
  wizard: Phaser.GameObjects.GameObject
) => (player as Player).handleDamage(wizard as Wizard);

const handleKnifeWizardCollision = (
  _knife: Phaser.GameObjects.GameObject,
  _wizard: Phaser.GameObjects.GameObject
) => {
  (_wizard as Wizard).handleDamage(_knife as Phaser.Physics.Arcade.Sprite, 1);
  disableImage(_knife as Phaser.Physics.Arcade.Image);
};
