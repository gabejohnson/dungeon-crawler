import Phaser from "phaser";

export const calculateUnitVector = (
  origin: { x: number; y: number },
  target: { x: number; y: number }
): Phaser.Math.Vector2 =>
  new Phaser.Math.Vector2(target.x - origin.x, target.y - origin.y).normalize();

// Not sure which is more efficient, this method or using
// `Phaser.Cameras.Scene2D.Camera#cull
export const onCamera = (
  camera: Phaser.Cameras.Scene2D.Camera,
  object: Phaser.Physics.Arcade.Sprite
): boolean =>
  !camera.worldView.isEmpty() &&
  Phaser.Geom.Rectangle.Overlaps(camera.worldView, object.getBounds());

export const tileOnPath =
  (line: Phaser.Geom.Line) =>
  (tile: Phaser.Tilemaps.Tile): boolean => {
    if (!tile.canCollide) {
      return false;
    } else {
      const rectangle = tile.getBounds();
      return (
        Phaser.Geom.Intersects.GetLineToRectangle(line, rectangle).length > 0
      );
    }
  };
