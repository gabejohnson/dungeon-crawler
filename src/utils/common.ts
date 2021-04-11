import Phaser from "phaser";

// Not sure which is more efficient, this method or using
// `Phaser.Cameras.Scene2D.Camera#cull
export const onCamera = (
  camera: Phaser.Cameras.Scene2D.Camera,
  object: Phaser.Physics.Arcade.Sprite
): boolean =>
  !camera.worldView.isEmpty() &&
  Phaser.Geom.Rectangle.Overlaps(camera.worldView, object.getBounds());
