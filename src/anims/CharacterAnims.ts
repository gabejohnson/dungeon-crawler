import Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";
import TextureKeys from "~/consts/TextureKeys";

export const createCharacterAnims = (
  anims: Phaser.Animations.AnimationManager
) => {
  anims.create({
    key: AnimationKeys.PlayerIdleDown,
    frames: [{ key: TextureKeys.Player, frame: "walk-down-3.png" }],
  });

  anims.create({
    key: AnimationKeys.PlayerIdleSide,
    frames: [{ key: TextureKeys.Player, frame: "walk-side-3.png" }],
  });

  anims.create({
    key: AnimationKeys.PlayerIdleUp,
    frames: [{ key: TextureKeys.Player, frame: "walk-up-3.png" }],
  });

  anims.create({
    key: AnimationKeys.PlayerRunDown,
    frames: anims.generateFrameNames(TextureKeys.Player, {
      start: 1,
      end: 8,
      prefix: "run-down-",
      suffix: ".png",
    }),
    repeat: -1,
    frameRate: 15,
  });

  anims.create({
    key: AnimationKeys.PlayerRunUp,
    frames: anims.generateFrameNames(TextureKeys.Player, {
      start: 1,
      end: 8,
      prefix: "run-up-",
      suffix: ".png",
    }),
    repeat: -1,
    frameRate: 15,
  });

  anims.create({
    key: AnimationKeys.PlayerRunSide,
    frames: anims.generateFrameNames(TextureKeys.Player, {
      start: 1,
      end: 8,
      prefix: "run-side-",
      suffix: ".png",
    }),
    repeat: -1,
    frameRate: 15,
  });

  anims.create({
    key: AnimationKeys.PlayerFaint,
    frames: anims.generateFrameNames(TextureKeys.Player, {
      start: 1,
      end: 4,
      prefix: "faint-",
      suffix: ".png",
    }),
    repeat: 0,
    frameRate: 5,
  });
};
