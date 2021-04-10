import Phaser from "phaser";
import AnimationKeys from "~/consts/AnimationKeys";
import TextureKeys from "~/consts/TextureKeys";

export const createLizardAnims = (
  anims: Phaser.Animations.AnimationManager
): void => {
  anims.create({
    key: AnimationKeys.LizardIdle,
    frames: anims.generateFrameNames(TextureKeys.Lizard, {
      start: 0,
      end: 3,
      prefix: "lizard_m_idle_anim_f",
      suffix: ".png",
    }),
    repeat: -1,
    frameRate: 10,
  });

  anims.create({
    key: AnimationKeys.LizardRun,
    frames: anims.generateFrameNames(TextureKeys.Lizard, {
      start: 0,
      end: 3,
      prefix: "lizard_m_run_anim_f",
      suffix: ".png",
    }),
    repeat: -1,
    frameRate: 10,
  });
};

export const createWizardAnims = (
  anims: Phaser.Animations.AnimationManager
): void => {
  anims.create({
    key: AnimationKeys.WizardIdle,
    frames: anims.generateFrameNames(TextureKeys.Wizard, {
      start: 0,
      end: 3,
      prefix: "wizzard_m_idle_anim_f",
      suffix: ".png",
    }),
    repeat: -1,
    frameRate: 10,
  });

  anims.create({
    key: AnimationKeys.WizardRun,
    frames: anims.generateFrameNames(TextureKeys.Wizard, {
      start: 0,
      end: 3,
      prefix: "wizzard_m_run_anim_f",
      suffix: ".png",
    }),
    repeat: -1,
    frameRate: 10,
  });
};
