import Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";

export enum Direction {
  North,
  South,
  East,
  West,
}

export class Door extends Phaser.Physics.Arcade.Sprite {
  private _destination?: string;
  private _direction?: Direction;
  private _room?: string;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);
    this.play(AnimationKeys.DoorClosed);
  }

  get destination(): string | undefined {
    return this._destination;
  }

  get direction(): Direction | undefined {
    return this._direction;
  }

  get isOpen(): boolean {
    return this.anims.currentAnim.key === AnimationKeys.DoorOpen;
  }

  get room(): string | undefined {
    return this._room;
  }

  open() {
    if (!this.isOpen) {
      this.play(AnimationKeys.DoorOpen);
    }
  }

  setDestination(destination: string): void {
    this._destination = destination;
  }

  setDirection(direction: Direction): void {
    this._direction = direction;
    [this.scaleY, this.body.offset.y] =
      this.direction === Direction.South ? [-1, this.body.height] : [1, 0];
  }

  setRoom(room: string): void {
    this._room = room;
  }
}
