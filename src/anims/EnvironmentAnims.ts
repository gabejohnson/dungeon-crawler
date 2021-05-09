import type Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";
import TextureKeys from "~/consts/TextureKeys";

export const createDoorAnims = (
  anims: Phaser.Animations.AnimationManager
): void => {
  anims.create({
    key: AnimationKeys.DoorOpen,
    frames: [{ key: TextureKeys.Doors, frame: "door_open.png" }],
    frameRate: 5,
  });

  anims.create({
    key: AnimationKeys.DoorClosed,
    frames: [{ key: TextureKeys.Doors, frame: "door_closed.png" }],
    frameRate: 5,
  });
};
