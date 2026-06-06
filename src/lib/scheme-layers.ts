export type SchemeLayer = "back" | "middle" | "front";

const LAYER_ORDER: Record<SchemeLayer, number> = {
  back: 0,
  middle: 1,
  front: 2,
};

const LAYER_BASE_Z_INDEX: Record<SchemeLayer, number> = {
  back: 10,
  middle: 100,
  front: 200,
};

const PUBLIC_OBJECT_BASE_Z_INDEX: Record<SchemeLayer, number> = {
  back: 10,
  middle: 80,
  front: 160,
};

const PUBLIC_TABLE_Z_INDEX = 320;
const PUBLIC_SELECTED_TABLE_Z_INDEX = 1000;

type SchemeLayerItem = {
  id?: string | null;
  type?: string | null;
  label?: string | null;
  name?: string | null;
  zIndex?: number | null;
  layer?: string | null;
  objectType?: string | null;
  decorType?: string | null;
  shapeType?: string | null;
  neutralType?: string | null;
  isBookable?: boolean | null;
};

function normalized(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function clampOrder(value: number) {
  return Math.max(0, Math.min(99, Math.round(value)));
}

function layerFromStoredZIndex(zIndex?: number | null): SchemeLayer {
  const value = zIndex ?? LAYER_BASE_Z_INDEX.middle;
  if (value >= LAYER_BASE_Z_INDEX.front) return "front";
  if (value >= LAYER_BASE_Z_INDEX.middle) return "middle";
  return "back";
}

function localZIndex(zIndex?: number | null) {
  const value = zIndex ?? 0;
  if (value >= LAYER_BASE_Z_INDEX.front) return value - LAYER_BASE_Z_INDEX.front;
  if (value >= LAYER_BASE_Z_INDEX.middle) return value - LAYER_BASE_Z_INDEX.middle;
  if (value >= LAYER_BASE_Z_INDEX.back) return value - LAYER_BASE_Z_INDEX.back;
  return value;
}

export function isZoneSchemeObject(object: SchemeLayerItem) {
  const values = [
    object.type,
    object.objectType,
    object.decorType,
    object.shapeType,
    object.neutralType,
  ].map(normalized);

  if (values.some((value) => value === "zone" || value === "area" || value === "floor" || value === "shape")) return true;

  const fallbackName = normalized(object.label || object.name);
  if (fallbackName.includes("зона")) return true;
  return fallbackName.includes("зона") || fallbackName.includes("zone");
}

export function getSchemeObjectLayer(object: SchemeLayerItem): SchemeLayer {
  const objectType = normalized(object.objectType || object.type);
  if (object.isBookable || objectType === "table") return "front";
  if (isZoneSchemeObject(object)) return "back";

  const explicitLayer = normalized(object.layer);
  if (explicitLayer === "back" || explicitLayer === "middle" || explicitLayer === "front") {
    return explicitLayer;
  }

  return layerFromStoredZIndex(object.zIndex);
}

export function getSchemeObjectLocalOrder(object: SchemeLayerItem) {
  return clampOrder(localZIndex(object.zIndex));
}

export function sortSchemeObjectsForRender<T extends SchemeLayerItem>(objects: T[]) {
  return [...objects].sort((a, b) => {
    const layerDiff = LAYER_ORDER[getSchemeObjectLayer(a)] - LAYER_ORDER[getSchemeObjectLayer(b)];
    if (layerDiff !== 0) return layerDiff;
    const zDiff = getSchemeObjectLocalOrder(a) - getSchemeObjectLocalOrder(b);
    if (zDiff !== 0) return zDiff;
    return normalized(a.label || a.name || a.id).localeCompare(normalized(b.label || b.name || b.id), "ru");
  });
}

export function getPublicSchemeObjectZIndex(object: SchemeLayerItem) {
  return PUBLIC_OBJECT_BASE_Z_INDEX[getSchemeObjectLayer(object)] + getSchemeObjectLocalOrder(object);
}

export function getPublicTableZIndex(isSelected: boolean) {
  return isSelected ? PUBLIC_SELECTED_TABLE_Z_INDEX : PUBLIC_TABLE_Z_INDEX;
}
