import type Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";
import TextureKeys from "~/consts/TextureKeys";

export const createChestAnims = (anims: Phaser.Animations.AnimationManager) => {
  anims.create({
    key: AnimationKeys.ChestOpen,
    frames: anims.generateFrameNames(TextureKeys.Treasure, {
      start: 0,
      end: 2,
      prefix: "chest_empty_open_anim_f",
      suffix: ".png",
    }),
    frameRate: 5,
  });

  anims.create({
    key: AnimationKeys.ChestClosed,
    frames: [
      { key: TextureKeys.Treasure, frame: "chest_empty_open_anim_f0.png" },
    ],
    frameRate: 5,
  });
};
