import Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";
import TextureKeys from "~/consts/TextureKeys";

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export default class Lizard extends Phaser.Physics.Arcade.Sprite {
  private direction: Direction = Phaser.Math.Between(0, 3);
  private speed: number = 50;
  private moveEvent: Phaser.Time.TimerEvent;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);

    this.anims.play(AnimationKeys.LizardIdle);

    scene.physics.world.on(
      Phaser.Physics.Arcade.Events.TILE_COLLIDE,
      this.handleTileCollision,
      this
    );

    this.moveEvent = scene.time.addEvent({
      delay: 2000,
      callback: () => {
        this.direction = Phaser.Math.Between(0, 3);
      },
      loop: true,
    });
  }

  destroy(fromScene?: boolean) {
    this.moveEvent.destroy();
    super.destroy();
  }

  private handleTileCollision(
    go: Phaser.GameObjects.GameObject,
    tile: Phaser.Tilemaps.Tile
  ) {
    if (go != this) {
      return;
    }
    this.direction = Phaser.Math.Between(0, 3);
  }

  preUpdate(t: number, dt: number) {
    super.preUpdate(t, dt);
    const vectors = { x: 0, y: 0 };
    switch (this.direction) {
      case Direction.Up:
        vectors.y = -this.speed;
        break;
      case Direction.Down:
        vectors.y = this.speed;
        break;
      case Direction.Left:
        vectors.x = -this.speed;
        break;
      case Direction.Right:
        vectors.x = this.speed;
        break;
    }
    this.setVelocity(vectors.x, vectors.y);
  }
}
