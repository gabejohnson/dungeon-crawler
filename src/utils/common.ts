import Phaser from "phaser";

export type Coordinates = { x: number; y: number };

export enum Direction {
  North,
  NorthEast,
  East,
  SouthEast,
  South,
  SouthWest,
  West,
  NorthWest,
  None,
}

export const atTarget = (origin: Coordinates, target: Coordinates): boolean => {
  const { x, y } = distanceToTarget(origin, target);
  return x === 0 && y === 0;
};

export const calculateUnitVector = (
  origin: Coordinates,
  target: Coordinates
): Phaser.Math.Vector2 =>
  new Phaser.Math.Vector2(target.x - origin.x, target.y - origin.y).normalize();

export const distanceToTarget = (
  origin: Coordinates,
  target: Coordinates
): Coordinates => {
  let dx = target.x - origin.x,
    dy = target.y - origin.y;

  if (Math.abs(dx) < 5) {
    dx = 0;
  }
  if (Math.abs(dy) < 5) {
    dy = 0;
  }
  return { x: dx, y: dy };
};

export const getDirection = ({
  east,
  north,
  south,
  west,
}: {
  east: boolean;
  north: boolean;
  south: boolean;
  west: boolean;
}): Direction => {
  switch (true) {
    case north && east:
      return Direction.NorthEast;

    case east && south:
      return Direction.SouthEast;

    case south && west:
      return Direction.SouthWest;

    case west && north:
      return Direction.NorthWest;

    case north:
      return Direction.North;

    case east:
      return Direction.East;

    case south:
      return Direction.South;

    case west:
      return Direction.West;

    default:
      return Direction.None;
  }
};

export const getDirectionWithTarget = (
  position: Coordinates,
  target: Coordinates
): Direction => {
  const { x: dx, y: dy } = distanceToTarget(position, target);

  return getDirection({
    east: dx > 0,
    north: dy < 0,
    south: dy > 0,
    west: dx < 0,
  });
};

export const getRandomCardinalDirection = (): Direction =>
  ((getRandomDirection() / 2) | 0) * 2;

export const getRandomDirection = (): Direction => Phaser.Math.Between(0, 6);

export const getVelocityVectors = (
  direction: Direction,
  speed: integer = 1
): Coordinates => {
  const vectors = { x: 0, y: 0 };
  const halfSpeed = speed / 2;
  switch (direction) {
    case Direction.North:
      vectors.y = -speed;
      break;
    case Direction.NorthEast:
      vectors.x = halfSpeed;
      vectors.y = -halfSpeed;
      break;
    case Direction.East:
      vectors.x = speed;
      break;
    case Direction.SouthEast:
      vectors.x = halfSpeed;
      vectors.y = halfSpeed;
      break;
    case Direction.South:
      vectors.y = speed;
      break;
    case Direction.SouthWest:
      vectors.x = -halfSpeed;
      vectors.y = halfSpeed;
      break;
    case Direction.West:
      vectors.x = -speed;
      break;
    case Direction.NorthWest:
      vectors.x = -halfSpeed;
      vectors.y = -halfSpeed;
      break;
    case Direction.None:
      break;
  }
  return vectors;
};

export const isMoving = (sprite: Phaser.Physics.Arcade.Sprite): boolean => {
  const { x, y } = sprite.body.velocity;
  return x !== 0 && y !== 0;
};

export const layerBlocks = (
  start: Coordinates,
  target: Coordinates,
  layer?: Phaser.Tilemaps.TilemapLayer
): boolean => {
  const line = new Phaser.Geom.Line(start.x, start.y, target.x, target.y);
  return layer?.findTile(tileOnPath(line)) != null;
};

// Not sure which is more efficient, this method or using
// `Phaser.Cameras.Scene2D.Camera#cull
export const onCamera = (
  camera: Phaser.Cameras.Scene2D.Camera,
  sprite: Phaser.Physics.Arcade.Sprite
): boolean =>
  !camera.worldView.isEmpty() &&
  Phaser.Geom.Rectangle.Overlaps(camera.worldView, sprite.getBounds());

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
