import Phaser from "phaser";
import Events from "~/consts/events";
import SceneKeys from "~/consts/SceneKeys";
import TextureKeys from "~/consts/TextureKeys";
import * as EventCenter from "~/events/EventCenter";

export default class GameUI extends Phaser.Scene {
  private hearts!: Phaser.GameObjects.Group;
  private coins!: Phaser.GameObjects.Text;
  constructor() {
    super(SceneKeys.GameUI);
  }

  create() {
    this.add.image(6, 26, TextureKeys.Treasure, "coin_anim_f0.png");
    this.hearts = this.add.group({
      classType: Phaser.GameObjects.Image,
    });

    this.hearts.createMultiple({
      key: TextureKeys.UIHeartFull,
      setXY: { x: 10, y: 10, stepX: 16 },
      quantity: 3,
    });

    EventCenter.sceneEvents.on(
      Events.PlayerHealthChanged,
      this.handlePlayerHealthChanged,
      this
    );

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventCenter.sceneEvents.off(
        Events.PlayerHealthChanged,
        this.handlePlayerHealthChanged,
        this
      );
    });

    this.coins = this.add.text(12, 20, "0", {
      fontSize: "14",
    });

    EventCenter.sceneEvents.on(
      Events.PlayerCoinsChanged,
      this.handlePlayerCoinsChanged,
      this
    );

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventCenter.sceneEvents.off(
        Events.PlayerCoinsChanged,
        this.handlePlayerCoinsChanged,
        this
      );
    });
  }

  private handlePlayerCoinsChanged(coins: number) {
    this.coins.text = coins.toLocaleString();
  }

  private handlePlayerHealthChanged(health: number) {
    this.hearts.children.each(
      (go: Phaser.GameObjects.GameObject, index: number) => {
        const heart = go as Phaser.GameObjects.Image;
        const texture =
          health / 2 >= index + 1
            ? TextureKeys.UIHeartFull
            : health / 2 === index + 0.5
            ? TextureKeys.UIHeartHalf
            : TextureKeys.UIHeartEmpty;
        heart.setTexture(texture);
      }
    );
  }
}
