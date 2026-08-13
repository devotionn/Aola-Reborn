export interface ObjectMapEntry {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObjectMapLayer {
  name: string;
  type: string;
  objects?: ObjectMapEntry[];
}

export interface ObjectMapData {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: ObjectMapLayer[];
}

export function objectsInLayer(map: ObjectMapData, layerName: string): ObjectMapEntry[] {
  return map.layers.find((layer) => layer.name === layerName)?.objects ?? [];
}

export function containsPoint(object: ObjectMapEntry, x: number, y: number, padding = 0): boolean {
  return x >= object.x - padding
    && x <= object.x + object.width + padding
    && y >= object.y - padding
    && y <= object.y + object.height + padding;
}

export function collidesWithAny(objects: ObjectMapEntry[], x: number, y: number, radius: number): boolean {
  return objects.some((object) => containsPoint(object, x, y, radius));
}

export function findObject(map: ObjectMapData, layerName: string, objectName: string): ObjectMapEntry | undefined {
  return objectsInLayer(map, layerName).find((object) => object.name === objectName);
}
