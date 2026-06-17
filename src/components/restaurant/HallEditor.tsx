"use client";

import {
  Columns3,
  Copy,
  DoorOpen,
  Eye,
  Grid2X2,
  Maximize2,
  MoveDown,
  MoveUp,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type HallEditorTable = {
  id?: string;
  clientId?: string;
  number: string;
  seats: number;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isActive: boolean;
  tableTypeId?: string | null;
  bookingPrice?: number | null;
  depositAmount?: number | null;
  depositRequired?: boolean | null;
  minGuests?: number | null;
  maxGuests?: number | null;
};

type HallEditorObject = {
  id?: string;
  clientId?: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: string;
  icon?: string | null;
  color?: string | null;
  zIndex: number;
  isLocked: boolean;
  isVisible: boolean;
  notes?: string | null;
};

type HallEditorHall = {
  id: string;
  restaurantId: string;
  title: string;
  width: number;
  height: number;
  tables: HallEditorTable[];
  objects?: HallEditorObject[];
};

type TableType = {
  id: string;
  title: string;
  code: string;
  minGuests: number;
  maxGuests: number;
  defaultDepositAmount: number;
  defaultBookingPrice: number;
  isDepositRequired: boolean;
};

type Selection = { kind: "table" | "object"; id: string } | null;
type Snapshot = { hallDraft: HallDraft; tables: HallEditorTable[]; objects: HallEditorObject[] };
type HallDraft = { title: string; width: number; height: number; gridSize: number };
type EditorItemKind = "table" | "object";
type DragState = { kind: EditorItemKind; id: string; offsetX: number; offsetY: number };
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type ResizeState = {
  kind: EditorItemKind;
  id: string;
  handle: ResizeHandle;
  startPointer: { x: number; y: number };
  startItem: { x: number; y: number; width: number; height: number; rotation: number; type?: string; shape?: string };
};
type RotateState = { kind: EditorItemKind; id: string; centerX: number; centerY: number; startAngle: number; startRotation: number };
type LayerLevel = "back" | "middle" | "front";
type LeftPanelTab = "tables" | "decor" | "layers" | "help";

const OBJECT_TYPES = [
  { type: "bar", label: "Бар", icon: "🍷", color: "#7c4f3d" },
  { type: "toilet", label: "Туалет", icon: "WC", color: "#64748b" },
  { type: "entrance", label: "Вход", icon: "↘", color: "#5f7f55" },
  { type: "exit", label: "Выход", icon: "↗", color: "#5f7f55" },
  { type: "stage", label: "Сцена", icon: "♪", color: "#6b4d7a" },
  { type: "wall", label: "Стена", icon: "—", color: "#4b4038" },
  { type: "partition", label: "Перегородка", icon: "│", color: "#5b5149" },
  { type: "column", label: "Колонна", icon: "●", color: "#8a7a68" },
  { type: "kitchen", label: "Кухня", icon: "☕", color: "#9a5b3d" },
  { type: "wardrobe", label: "Гардероб", icon: "▦", color: "#7b6d5f" },
  { type: "dancefloor", label: "Танцпол", icon: "✦", color: "#7a5f8f" },
  { type: "sofa", label: "Диван", icon: "▰", color: "#8a6048" },
  { type: "window", label: "Окно", icon: "▱", color: "#6a8a8f" },
  { type: "zone", label: "Зона", icon: "□", color: "#8f7b4d" },
  { type: "text", label: "Текст", icon: "T", color: "#5b5149" },
  { type: "plant", label: "Растение", icon: "✿", color: "#5f7f55" },
  { type: "stairs", label: "Лестница", icon: "≋", color: "#7b6d5f" },
  { type: "arrow", label: "Стрелка", icon: "→", color: "#7d4a38" },
  { type: "shape", label: "Фигура", icon: "◇", color: "#8f7b4d" },
  { type: "custom", label: "Свой объект", icon: "+", color: "#a66a48" },
] as const;

const OBJECT_DEFAULTS: Record<string, Partial<HallEditorObject>> = {
  bar: { width: 160, height: 56, shape: "rectangle", zIndex: 5 },
  toilet: { width: 100, height: 64, shape: "rectangle", zIndex: 5 },
  entrance: { width: 120, height: 40, shape: "rectangle", zIndex: 6 },
  exit: { width: 120, height: 40, shape: "rectangle", zIndex: 6 },
  stage: { width: 180, height: 90, shape: "rectangle", zIndex: 4 },
  wall: { width: 220, height: 12, shape: "line", zIndex: 1 },
  partition: { width: 160, height: 10, shape: "line", zIndex: 2 },
  column: { width: 48, height: 48, shape: "circle", zIndex: 7 },
  kitchen: { width: 160, height: 90, shape: "rectangle", zIndex: 4 },
  wardrobe: { width: 130, height: 60, shape: "rectangle", zIndex: 5 },
  dancefloor: { width: 180, height: 140, shape: "rectangle", zIndex: 3 },
  sofa: { width: 140, height: 60, shape: "rectangle", zIndex: 5 },
  window: { width: 140, height: 12, shape: "line", zIndex: 2 },
  zone: { width: 220, height: 160, shape: "rectangle", zIndex: 0 },
  text: { width: 160, height: 42, shape: "rectangle", zIndex: 7 },
  plant: { width: 56, height: 56, shape: "circle", zIndex: 5 },
  stairs: { width: 120, height: 64, shape: "rectangle", zIndex: 4 },
  arrow: { width: 96, height: 36, shape: "line", zIndex: 6 },
  shape: { width: 120, height: 90, shape: "rectangle", zIndex: 3 },
  custom: { width: 120, height: 70, shape: "rectangle", zIndex: 5 },
};

const DECOR_GROUPS: { title: string; types: (typeof OBJECT_TYPES)[number]["type"][] }[] = [
  { title: "Рисование", types: ["wall", "partition", "zone", "shape", "arrow"] },
  { title: "Текст", types: ["text"] },
  { title: "Мебель и зоны", types: ["bar", "sofa", "wardrobe", "kitchen", "stage", "toilet"] },
  { title: "Навигация", types: ["entrance", "exit", "window", "stairs", "column", "plant", "custom"] },
];

const LAYER_BASE_Z_INDEX: Record<LayerLevel, number> = {
  back: 100,
  middle: 200,
  front: 300,
};

const LAYER_LABELS: Record<LayerLevel, string> = {
  back: "Задний план",
  middle: "Средний план",
  front: "Передний план",
};

const RESIZE_HANDLES: { handle: ResizeHandle; label: string }[] = [
  { handle: "nw", label: "Верхний левый угол" },
  { handle: "n", label: "Верхняя сторона" },
  { handle: "ne", label: "Верхний правый угол" },
  { handle: "e", label: "Правая сторона" },
  { handle: "se", label: "Нижний правый угол" },
  { handle: "s", label: "Нижняя сторона" },
  { handle: "sw", label: "Нижний левый угол" },
  { handle: "w", label: "Левая сторона" },
];

const MIDDLE_LAYER_TYPES = new Set(["bar", "toilet", "stage", "wall", "partition", "column", "kitchen", "wardrobe", "dancefloor", "sofa", "window", "text", "plant", "stairs", "arrow", "shape"]);
const FRONT_LAYER_TYPES = new Set(["entrance", "exit"]);

function defaultLayerForType(type: string): LayerLevel {
  if (type === "zone") return "back";
  if (FRONT_LAYER_TYPES.has(type)) return "front";
  if (MIDDLE_LAYER_TYPES.has(type)) return "middle";
  return "middle";
}

function layerFromZIndex(zIndex: number | null | undefined): LayerLevel {
  const value = zIndex ?? LAYER_BASE_Z_INDEX.middle;
  if (value >= LAYER_BASE_Z_INDEX.front) return "front";
  if (value >= LAYER_BASE_Z_INDEX.middle) return "middle";
  return "back";
}

function localZIndex(zIndex: number | null | undefined) {
  const value = zIndex ?? 0;
  if (value >= LAYER_BASE_Z_INDEX.front) return value - LAYER_BASE_Z_INDEX.front;
  if (value >= LAYER_BASE_Z_INDEX.middle) return value - LAYER_BASE_Z_INDEX.middle;
  if (value >= LAYER_BASE_Z_INDEX.back) return value - LAYER_BASE_Z_INDEX.back;
  return value;
}

function zIndexForLayer(layer: LayerLevel, order = 0) {
  return LAYER_BASE_Z_INDEX[layer] + clamp(Math.round(order), 0, 99);
}

function uid(prefix: string) {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomId}`;
}

function tableKey(table: HallEditorTable) {
  return table.clientId || table.id || table.number;
}

function objectKey(object: HallEditorObject) {
  return object.clientId || object.id || object.label;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function snap(value: number, gridSize: number, enabled: boolean) {
  return enabled ? Math.round(value / gridSize) * gridSize : Math.round(value);
}

function normalizeRotation(value: number) {
  const rounded = Math.round(value);
  return ((rounded % 360) + 360) % 360;
}

function selectedStyleZIndex(base: number, selected: boolean) {
  return selected ? base + 1000 : base;
}

function numberValue(value: number | null | undefined) {
  return value ?? "";
}

function minSizeFor(kind: EditorItemKind, item: { type?: string; shape?: string }) {
  if (kind === "table") return { width: 48, height: 48 };
  if (item.type === "zone") return { width: 80, height: 60 };
  if (item.type === "wall" || item.type === "partition" || item.type === "window" || item.shape === "line") return { width: 40, height: 8 };
  if (item.type === "column") return { width: 24, height: 24 };
  return { width: 24, height: 24 };
}

function resizeSigns(handle: ResizeHandle) {
  return {
    left: handle.includes("w"),
    right: handle.includes("e"),
    top: handle.includes("n"),
    bottom: handle.includes("s"),
  };
}

function toLocalDelta(dx: number, dy: number, rotation: number) {
  const angle = (-rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

function toGlobalDelta(dx: number, dy: number, rotation: number) {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

function resizeFromHandle(
  resizing: ResizeState,
  point: { x: number; y: number },
  options: { hallWidth: number; hallHeight: number; gridSize: number; snapToGrid: boolean },
) {
  const { startItem, startPointer, handle, kind } = resizing;
  const minSize = minSizeFor(kind, startItem);
  const delta = toLocalDelta(point.x - startPointer.x, point.y - startPointer.y, startItem.rotation);
  const signs = resizeSigns(handle);
  const rawWidth = startItem.width + (signs.right ? delta.x : signs.left ? -delta.x : 0);
  const rawHeight = startItem.height + (signs.bottom ? delta.y : signs.top ? -delta.y : 0);
  const maxWidth = Math.max(minSize.width, options.hallWidth);
  const maxHeight = Math.max(minSize.height, options.hallHeight);
  const nextWidth = clamp(snap(rawWidth, options.gridSize, options.snapToGrid), minSize.width, maxWidth);
  const nextHeight = clamp(snap(rawHeight, options.gridSize, options.snapToGrid), minSize.height, maxHeight);
  const appliedLocalX = signs.right ? nextWidth - startItem.width : signs.left ? startItem.width - nextWidth : 0;
  const appliedLocalY = signs.bottom ? nextHeight - startItem.height : signs.top ? startItem.height - nextHeight : 0;
  const centerShift = toGlobalDelta(appliedLocalX / 2, appliedLocalY / 2, startItem.rotation);
  const startCenterX = startItem.x + startItem.width / 2;
  const startCenterY = startItem.y + startItem.height / 2;
  const nextX = snap(startCenterX + centerShift.x - nextWidth / 2, options.gridSize, options.snapToGrid);
  const nextY = snap(startCenterY + centerShift.y - nextHeight / 2, options.gridSize, options.snapToGrid);

  return {
    x: clamp(nextX, 0, Math.max(0, options.hallWidth - nextWidth)),
    y: clamp(nextY, 0, Math.max(0, options.hallHeight - nextHeight)),
    width: nextWidth,
    height: nextHeight,
  };
}

function normalizeTables(tables: HallEditorTable[]) {
  return tables.map((table) => ({ ...table, clientId: table.clientId || table.id || uid("table") }));
}

function normalizeObjects(objects: HallEditorObject[] = []) {
  return objects.map((object) => ({
    ...object,
    clientId: object.clientId || object.id || uid("object"),
    zIndex: object.zIndex >= LAYER_BASE_Z_INDEX.back ? object.zIndex : zIndexForLayer(defaultLayerForType(object.type), object.zIndex),
  }));
}

function stripClientTable(table: HallEditorTable) {
  const { clientId: _clientId, ...payload } = table;
  return payload;
}

function stripClientObject(object: HallEditorObject) {
  const { clientId: _clientId, ...payload } = object;
  return payload;
}

export function HallEditor({ hall, tableTypes = [] }: { hall: HallEditorHall; tableTypes?: TableType[] }) {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const copiedRef = useRef<{ kind: "table"; value: HallEditorTable } | { kind: "object"; value: HallEditorObject } | null>(null);
  const lastToolActionRef = useRef(0);

  const [hallDraft, setHallDraft] = useState<HallDraft>({ title: hall.title, width: hall.width, height: hall.height, gridSize: 20 });
  const [tables, setTables] = useState<HallEditorTable[]>(() => normalizeTables(hall.tables));
  const [objects, setObjects] = useState<HallEditorObject[]>(() => normalizeObjects(hall.objects));
  const [selected, setSelected] = useState<Selection>(() => {
    const firstTable = hall.tables[0];
    return firstTable ? { kind: "table", id: firstTable.id || firstTable.number } : null;
  });
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [rotating, setRotating] = useState<RotateState | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [preview, setPreview] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>("tables");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("Все изменения сохранены");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTable = selected?.kind === "table" ? tables.find((table) => tableKey(table) === selected.id) : null;
  const selectedObject = selected?.kind === "object" ? objects.find((object) => objectKey(object) === selected.id) : null;
  const selectedType = tableTypes.find((type) => type.id === selectedTable?.tableTypeId);

  const sortedObjects = useMemo(() => [...objects].filter((object) => object.isVisible).sort((a, b) => a.zIndex - b.zIndex), [objects]);
  const sortedTables = useMemo(() => [...tables].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y)), [tables]);
  const layerGroups = useMemo(() => {
    const tableItems = sortedTables.map((table) => ({ id: tableKey(table), label: `Стол ${table.number}`, active: table.isActive }));
    const decorItems = objects
      .filter((object) => object.type !== "zone" && object.type !== "wall" && object.type !== "partition" && object.type !== "shape" && object.type !== "text")
      .sort((a, b) => b.zIndex - a.zIndex)
      .map((object) => ({ id: objectKey(object), label: object.label, layer: layerFromZIndex(object.zIndex), visible: object.isVisible, locked: object.isLocked }));
    const shapeItems = objects
      .filter((object) => object.type === "zone" || object.type === "wall" || object.type === "partition" || object.type === "shape" || object.type === "text")
      .sort((a, b) => b.zIndex - a.zIndex)
      .map((object) => ({ id: objectKey(object), label: object.label, layer: layerFromZIndex(object.zIndex), visible: object.isVisible, locked: object.isLocked }));
    return { tables: tableItems, decor: decorItems, shapes: shapeItems };
  }, [objects, sortedTables]);

  const applyServerHall = useCallback((nextHall: HallEditorHall | null | undefined) => {
    if (!nextHall) return;
    const nextTables = normalizeTables(nextHall.tables ?? []);
    const nextObjects = normalizeObjects(nextHall.objects ?? []);
    setHallDraft((current) => ({ ...current, title: nextHall.title, width: nextHall.width, height: nextHall.height }));
    setTables(nextTables);
    setObjects(nextObjects);
    setSelected((current) => {
      if (!current) return null;
      const exists =
        current.kind === "table"
          ? nextTables.some((table) => tableKey(table) === current.id)
          : nextObjects.some((object) => objectKey(object) === current.id);
      return exists ? current : null;
    });
    setHistory([]);
    setFuture([]);
  }, []);

  function currentSnapshot(): Snapshot {
    return {
      hallDraft: { ...hallDraft },
      tables: tables.map((table) => ({ ...table })),
      objects: objects.map((object) => ({ ...object })),
    };
  }

  function remember() {
    setHistory((current) => [...current.slice(-24), currentSnapshot()]);
    setFuture([]);
  }

  function markDirty() {
    setDirty(true);
    setStatus("Есть несохраненные изменения");
  }

  function restore(snapshot: Snapshot) {
    setHallDraft(snapshot.hallDraft);
    setTables(snapshot.tables);
    setObjects(snapshot.objects);
    setDirty(true);
    setStatus("Есть несохраненные изменения");
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture((current) => [currentSnapshot(), ...current]);
    setHistory((current) => current.slice(0, -1));
    restore(previous);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((current) => [...current, currentSnapshot()]);
    setFuture((current) => current.slice(1));
    restore(next);
  }

  function boardPoint(event: PointerEvent<HTMLElement>) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * hallDraft.width,
      y: ((event.clientY - rect.top) / rect.height) * hallDraft.height,
    };
  }

  function visibleCenterFor(width: number, height: number) {
    const boardRect = boardRef.current?.getBoundingClientRect();
    const shell = shellRef.current;
    const shellRect = shell?.getBoundingClientRect();
    if (!boardRect || !shell || !shellRect) {
      return {
        x: clamp(Math.round(hallDraft.width / 2 - width / 2), 0, Math.max(0, hallDraft.width - width)),
        y: clamp(Math.round(hallDraft.height / 2 - height / 2), 0, Math.max(0, hallDraft.height - height)),
      };
    }
    const centerX = ((shellRect.left + shell.clientWidth / 2 - boardRect.left) / boardRect.width) * hallDraft.width;
    const centerY = ((shellRect.top + shell.clientHeight / 2 - boardRect.top) / boardRect.height) * hallDraft.height;
    return {
      x: clamp(snap(centerX - width / 2, hallDraft.gridSize, snapToGrid), 0, Math.max(0, hallDraft.width - width)),
      y: clamp(snap(centerY - height / 2, hallDraft.gridSize, snapToGrid), 0, Math.max(0, hallDraft.height - height)),
    };
  }

  function fitToView() {
    const shell = shellRef.current;
    if (!shell) {
      setZoom(1);
      return;
    }
    const availableWidth = Math.max(320, shell.clientWidth - 36);
    const availableHeight = Math.max(260, shell.clientHeight - 36);
    const nextZoom = Math.min(1.6, Math.max(0.5, Math.min(availableWidth / hallDraft.width, availableHeight / hallDraft.height)));
    setZoom(Number(nextZoom.toFixed(2)));
  }

  function updateTable(id: string, patch: Partial<HallEditorTable>) {
    setTables((current) => current.map((table) => (tableKey(table) === id ? { ...table, ...patch } : table)));
    markDirty();
  }

  function updateObject(id: string, patch: Partial<HallEditorObject>) {
    setObjects((current) => current.map((object) => (objectKey(object) === id ? { ...object, ...patch } : object)));
    markDirty();
  }

  function addTable() {
    remember();
    const type = tableTypes[0];
    const width = 96;
    const height = 72;
    const position = visibleCenterFor(width, height);
    const table: HallEditorTable = {
      clientId: uid("table"),
      number: String(tables.length + 1),
      seats: type?.maxGuests ?? 2,
      shape: "rectangle",
      x: position.x,
      y: position.y,
      width,
      height,
      rotation: 0,
      isActive: true,
      tableTypeId: type?.id ?? null,
      minGuests: type?.minGuests ?? 1,
      maxGuests: type?.maxGuests ?? 2,
      depositRequired: type?.isDepositRequired ?? false,
      depositAmount: type?.defaultDepositAmount ?? null,
      bookingPrice: type?.defaultBookingPrice ?? null,
    };
    setTables((current) => [...current, table]);
    setSelected({ kind: "table", id: tableKey(table) });
    markDirty();
  }

  function addNeutral(type: (typeof OBJECT_TYPES)[number]["type"]) {
    remember();
    const template = OBJECT_TYPES.find((item) => item.type === type) ?? OBJECT_TYPES[OBJECT_TYPES.length - 1];
    const label = type === "custom" ? window.prompt("Название объекта", "Новый объект")?.trim() || "Новый объект" : template.label;
    const defaults = OBJECT_DEFAULTS[type] ?? OBJECT_DEFAULTS.custom;
    const width = defaults.width ?? 120;
    const height = defaults.height ?? 64;
    const position = visibleCenterFor(width, height);
    const layer = defaultLayerForType(type);
    const object: HallEditorObject = {
      clientId: uid("object"),
      type,
      label,
      x: position.x,
      y: position.y,
      width,
      height,
      rotation: 0,
      shape: defaults.shape ?? "rectangle",
      icon: template.icon,
      color: template.color,
      zIndex: zIndexForLayer(layer, defaults.zIndex ?? 0),
      isLocked: false,
      isVisible: true,
    };
    setObjects((current) => [...current, object]);
    setSelected({ kind: "object", id: objectKey(object) });
    markDirty();
  }

  function activateTool(action: () => void) {
    const now = Date.now();
    if (now - lastToolActionRef.current < 120) return;
    lastToolActionRef.current = now;
    try {
      action();
    } catch (error) {
      console.error("[Kaifbook:hall-editor] Не удалось добавить объект", error);
      setError("Не удалось добавить объект. Обновите страницу и попробуйте еще раз.");
    }
  }

  function handleToolPointer(event: PointerEvent<HTMLButtonElement>, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    activateTool(action);
  }

  function handleToolKey(event: ReactKeyboardEvent<HTMLButtonElement>, action: () => void) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    activateTool(action);
  }

  function handleToolClick(event: ReactMouseEvent<HTMLButtonElement>, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    activateTool(action);
  }

  function duplicateSelection() {
    if (!selectedTable && !selectedObject) return;
    remember();
    if (selectedTable) {
      const duplicate = { ...selectedTable, id: undefined, clientId: uid("table"), number: `${selectedTable.number} копия`, x: selectedTable.x + 28, y: selectedTable.y + 28 };
      setTables((current) => [...current, duplicate]);
      setSelected({ kind: "table", id: tableKey(duplicate) });
    } else if (selectedObject) {
      const duplicate = { ...selectedObject, id: undefined, clientId: uid("object"), label: `${selectedObject.label} копия`, x: selectedObject.x + 28, y: selectedObject.y + 28 };
      setObjects((current) => [...current, duplicate]);
      setSelected({ kind: "object", id: objectKey(duplicate) });
    }
    markDirty();
  }

  async function deleteSelectedTable() {
    if (!selectedTable) return;
    if (!window.confirm(`Вы точно хотите удалить стол №${selectedTable.number}? Это действие нельзя отменить.`)) return;
    remember();
    if (selectedTable.id && !selectedTable.id.startsWith("draft-")) {
      const response = await fetch(`/api/halls/${hall.id}/tables/${selectedTable.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Не удалось удалить стол.");
        return;
      }
    }
    const key = tableKey(selectedTable);
    setTables((current) => current.filter((table) => tableKey(table) !== key));
    setSelected(null);
    markDirty();
  }

  function deleteSelectedObject() {
    if (!selectedObject) return;
    if (!window.confirm(`Удалить объект «${selectedObject.label}»?`)) return;
    remember();
    const key = objectKey(selectedObject);
    setObjects((current) => current.filter((object) => objectKey(object) !== key));
    setSelected(null);
    markDirty();
  }

  async function deleteHall() {
    if (!window.confirm(`Вы точно хотите удалить зал «${hallDraft.title}»? Все столы и объекты внутри будут удалены.`)) return;
    const response = await fetch(`/api/halls/${hall.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось удалить зал.");
      return;
    }
    router.push(`/owner/restaurants/${hall.restaurantId}/halls`);
    router.refresh();
  }

  function setObjectLayer(layer: LayerLevel) {
    if (!selectedObject) return;
    remember();
    updateObject(objectKey(selectedObject), { zIndex: zIndexForLayer(layer, localZIndex(selectedObject.zIndex)) });
  }

  function setObjectLayerFromList(id: string, layer: LayerLevel) {
    const object = objects.find((item) => objectKey(item) === id);
    if (!object) return;
    remember();
    setSelected({ kind: "object", id });
    updateObject(id, { zIndex: zIndexForLayer(layer, localZIndex(object.zIndex)) });
  }

  function moveObjectOrder(direction: "up" | "down") {
    if (!selectedObject) return;
    remember();
    const currentLayer = layerFromZIndex(selectedObject.zIndex);
    const nextOrder = clamp(localZIndex(selectedObject.zIndex) + (direction === "up" ? 1 : -1), 0, 99);
    updateObject(objectKey(selectedObject), { zIndex: zIndexForLayer(currentLayer, nextOrder) });
  }

  function validateLayout() {
    const issues: string[] = [];
    if (!hallDraft.title.trim()) issues.push("У зала должно быть название.");
    if (tables.length === 0 && objects.length === 0) issues.push("В зале пока нет объектов.");
    const numbers = new Map<string, number>();
    for (const table of tables) {
      const number = table.number.trim();
      if (!number) issues.push("У всех столов должны быть номера.");
      numbers.set(number, (numbers.get(number) ?? 0) + 1);
      if ((table.minGuests ?? 1) > (table.maxGuests ?? table.seats)) issues.push(`У стола №${number || "без номера"} минимум гостей больше максимума.`);
      if (!table.seats || table.seats < 1) issues.push(`У стола №${number || "без номера"} не указана вместимость.`);
      if (table.x < 0 || table.y < 0 || table.x + table.width > hallDraft.width || table.y + table.height > hallDraft.height) issues.push(`Стол №${number || "без номера"} выходит за границы зала.`);
    }
    for (const [number, count] of numbers) {
      if (count > 1) issues.push(`В зале есть два стола с номером ${number}.`);
    }
    for (const object of objects) {
      if (!object.label.trim()) issues.push("У нейтральных объектов должно быть название.");
      if (object.x < 0 || object.y < 0 || object.x + object.width > hallDraft.width || object.y + object.height > hallDraft.height) issues.push(`Объект «${object.label || "без названия"}» выходит за границы зала.`);
    }
    return issues;
  }

  const save = useCallback(
    async (silent = false) => {
      const issues = validateLayout();
      if (issues.length) {
        setError(`Нельзя сохранить схему:\n- ${issues.join("\n- ")}`);
        return false;
      }
      setError(null);
      setMessage(null);
      setStatus("Сохраняем...");
      const response = await fetch(`/api/halls/${hall.id}/layout`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hall: { title: hallDraft.title, width: hallDraft.width, height: hallDraft.height },
          tables: tables.map(stripClientTable),
          objects: objects.map(stripClientObject),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatus("Есть несохраненные изменения");
        setError(data.error || "Не удалось сохранить схему.");
        return false;
      }
      const data = (await response.json().catch(() => null)) as { hall?: HallEditorHall | null } | null;
      applyServerHall(data?.hall);
      setDirty(false);
      setStatus("Все изменения сохранены");
      if (!silent) setMessage("Схема зала сохранена.");
      router.refresh();
      return true;
    },
    [applyServerHall, hall.id, hallDraft, objects, router, tables],
  );

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    if (preview) return;
    const point = boardPoint(event);
    if (dragging) {
      const updatePosition = <T extends { x: number; y: number; width: number; height: number }>(item: T) => ({
        ...item,
        x: clamp(snap(point.x - dragging.offsetX, hallDraft.gridSize, snapToGrid), 0, Math.max(0, hallDraft.width - item.width)),
        y: clamp(snap(point.y - dragging.offsetY, hallDraft.gridSize, snapToGrid), 0, Math.max(0, hallDraft.height - item.height)),
      });
      if (dragging.kind === "table") setTables((current) => current.map((table) => (tableKey(table) === dragging.id ? updatePosition(table) : table)));
      if (dragging.kind === "object") setObjects((current) => current.map((object) => (objectKey(object) === dragging.id ? updatePosition(object) : object)));
      markDirty();
    }
    if (resizing) {
      const nextSize = resizeFromHandle(resizing, point, {
        hallWidth: hallDraft.width,
        hallHeight: hallDraft.height,
        gridSize: hallDraft.gridSize,
        snapToGrid,
      });
      if (resizing.kind === "table") setTables((current) => current.map((table) => (tableKey(table) === resizing.id ? { ...table, ...nextSize } : table)));
      if (resizing.kind === "object") setObjects((current) => current.map((object) => (objectKey(object) === resizing.id ? { ...object, ...nextSize } : object)));
      markDirty();
    }
    if (rotating) {
      const angle = Math.atan2(point.y - rotating.centerY, point.x - rotating.centerX) * (180 / Math.PI);
      const rawRotation = rotating.startRotation + angle - rotating.startAngle;
      const rotation = normalizeRotation(event.shiftKey ? Math.round(rawRotation / 15) * 15 : rawRotation);
      if (rotating.kind === "table") setTables((current) => current.map((table) => (tableKey(table) === rotating.id ? { ...table, rotation } : table)));
      if (rotating.kind === "object") setObjects((current) => current.map((object) => (objectKey(object) === rotating.id ? { ...object, rotation } : object)));
      markDirty();
    }
  }

  function stopPointer() {
    setDragging(null);
    setResizing(null);
    setRotating(null);
  }

  function pointerDown(kind: EditorItemKind, id: string, event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    if (preview) return;
    const point = boardPoint(event);
    const item = kind === "table" ? tables.find((table) => tableKey(table) === id) : objects.find((object) => objectKey(object) === id);
    if (!item || ("isLocked" in item && item.isLocked)) return;
    remember();
    setSelected({ kind, id });
    setDragging({ kind, id, offsetX: point.x - item.x, offsetY: point.y - item.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startResize(kind: EditorItemKind, id: string, handle: ResizeHandle, event: PointerEvent<HTMLSpanElement>) {
    event.stopPropagation();
    if (preview) return;
    const item = kind === "table" ? tables.find((table) => tableKey(table) === id) : objects.find((object) => objectKey(object) === id);
    if (!item || ("isLocked" in item && item.isLocked)) return;
    remember();
    const point = boardPoint(event);
    setSelected({ kind, id });
    setResizing({
      kind,
      id,
      handle,
      startPointer: point,
      startItem: {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
        type: "type" in item ? item.type : undefined,
        shape: item.shape,
      },
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startRotate(kind: EditorItemKind, id: string, event: PointerEvent<HTMLSpanElement>) {
    event.stopPropagation();
    if (preview) return;
    const item = kind === "table" ? tables.find((table) => tableKey(table) === id) : objects.find((object) => objectKey(object) === id);
    if (!item || ("isLocked" in item && item.isLocked)) return;
    remember();
    const point = boardPoint(event);
    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;
    const startAngle = Math.atan2(point.y - centerY, point.x - centerX) * (180 / Math.PI);
    setSelected({ kind, id });
    setRotating({ kind, id, centerX, centerY, startAngle, startRotation: item.rotation });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function clearSelection(event: PointerEvent<HTMLDivElement>) {
    if (preview || event.target !== event.currentTarget) return;
    setSelected(null);
  }

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => void save(true), 15000);
    return () => window.clearTimeout(timer);
  }, [dirty, save]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        if (selectedTable) copiedRef.current = { kind: "table", value: selectedTable };
        if (selectedObject) copiedRef.current = { kind: "object", value: selectedObject };
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        const copied = copiedRef.current;
        if (!copied) return;
        remember();
        if (copied.kind === "table") {
          const value = { ...copied.value, id: undefined, clientId: uid("table"), number: `${copied.value.number} копия`, x: copied.value.x + 32, y: copied.value.y + 32 };
          setTables((current) => [...current, value]);
          setSelected({ kind: "table", id: tableKey(value) });
        } else {
          const value = { ...copied.value, id: undefined, clientId: uid("object"), label: `${copied.value.label} копия`, x: copied.value.x + 32, y: copied.value.y + 32 };
          setObjects((current) => [...current, value]);
          setSelected({ kind: "object", id: objectKey(value) });
        }
        markDirty();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedTable) void deleteSelectedTable();
        if (selectedObject) deleteSelectedObject();
      } else if (event.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="hall-editor hall-editor-pro">
      <header className="hall-editor-topbar">
        <div className="editor-toolbar">
          <div>
            <p className="eyebrow">Kaifbook Office · схема зала</p>
            <h2>{hallDraft.title}</h2>
            <p className={`layout-status ${dirty ? "dirty" : "saved"}`}>{status}</p>
          </div>
          <div className="toolbar-actions">
            <button className="button icon-text secondary" type="button" onClick={undo} disabled={!history.length}><Undo2 size={17} aria-hidden />Отменить</button>
            <button className="button icon-text secondary" type="button" onClick={redo} disabled={!future.length}><Redo2 size={17} aria-hidden />Повторить</button>
            <button className="button icon-text secondary" type="button" onClick={() => setPreview((value) => !value)}><Eye size={17} aria-hidden />{preview ? "Редактировать" : "Предпросмотр"}</button>
            <button className="button icon-text" type="button" onClick={() => void save(false)}><Save size={17} aria-hidden />Сохранить</button>
            <button className="button icon-text secondary" type="button" onClick={() => router.push(`/owner/restaurants/${hall.restaurantId}/halls`)}><DoorOpen size={17} aria-hidden />Выйти</button>
          </div>
        </div>
        <div className="hall-editor-meta">
          <span>Текущий зал</span>
          <strong>{hallDraft.title}</strong>
          <span>{hallDraft.width} × {hallDraft.height}</span>
          <span>{tables.length} столов</span>
          <span>{objects.length} объектов</span>
        </div>
      </header>

      <div className="hall-editor-workspace">
        <aside className="hall-editor-left-panel" aria-label="Инструменты редактора">
          <div className="editor-side-tabs" role="tablist" aria-label="Панель редактора">
            {[
              { id: "tables", label: "Столы" },
              { id: "decor", label: "Декор" },
              { id: "layers", label: "Слои" },
              { id: "help", label: "?" },
            ].map((tab) => (
              <button
                aria-selected={activeLeftTab === tab.id}
                className={activeLeftTab === tab.id ? "active" : ""}
                key={tab.id}
                onClick={() => setActiveLeftTab(tab.id as LeftPanelTab)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeLeftTab === "tables" ? (
            <div className="editor-side-section">
              <div className="editor-side-heading">
                <span>Бронируемые столы</span>
                <strong>{tables.length}</strong>
              </div>
              <button className="side-tool-button primary" type="button" onPointerDown={(event) => handleToolPointer(event, addTable)} onClick={(event) => handleToolClick(event, addTable)} onKeyDown={(event) => handleToolKey(event, addTable)}>
                <Plus size={16} aria-hidden />Создать стол
              </button>
              <div className="side-object-list">
                {sortedTables.map((table) => {
                  const key = tableKey(table);
                  return (
                    <button className={selected?.kind === "table" && selected.id === key ? "active" : ""} key={key} type="button" onClick={() => setSelected({ kind: "table", id: key })}>
                      <span>Стол {table.number}</span>
                      <small>{table.minGuests || 1}-{table.maxGuests || table.seats} гостей</small>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeLeftTab === "decor" ? (
            <div className="editor-side-section">
              {DECOR_GROUPS.map((group) => (
                <div className="decor-tool-group" key={group.title}>
                  <h3>{group.title}</h3>
                  <div className="decor-tool-grid">
                    {group.types.map((type) => {
                      const item = OBJECT_TYPES.find((objectType) => objectType.type === type);
                      if (!item) return null;
                      return (
                        <button key={item.type} type="button" onPointerDown={(event) => handleToolPointer(event, () => addNeutral(item.type))} onClick={(event) => handleToolClick(event, () => addNeutral(item.type))} onKeyDown={(event) => handleToolKey(event, () => addNeutral(item.type))}>
                          <span>{item.icon}</span>
                          <strong>{item.label}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {activeLeftTab === "layers" ? (
            <div className="editor-side-section layers-panel">
              <div className="editor-side-heading">
                <span>Объекты зала</span>
                <strong>{tables.length + objects.length}</strong>
              </div>
              <div className="layer-list-group">
                <h3>Столы</h3>
                {layerGroups.tables.map((item) => (
                  <button className={selected?.kind === "table" && selected.id === item.id ? "active" : ""} key={item.id} type="button" onClick={() => setSelected({ kind: "table", id: item.id })}>
                    <span>{item.label}</span>
                    <small>{item.active ? "активен" : "отключен"}</small>
                  </button>
                ))}
              </div>
              <div className="layer-list-group">
                <h3>Декор</h3>
                {layerGroups.decor.map((item) => (
                  <div className={selected?.kind === "object" && selected.id === item.id ? "layer-row active" : "layer-row"} key={item.id}>
                    <button type="button" onClick={() => setSelected({ kind: "object", id: item.id })}>
                      <span>{item.label}</span>
                      <small>{item.visible ? LAYER_LABELS[item.layer] : "скрыт"}{item.locked ? " · заблокирован" : ""}</small>
                    </button>
                    <div className="mini-layer-actions" aria-label={`Слой ${item.label}`}>
                      {(["back", "middle", "front"] as LayerLevel[]).map((layer) => (
                        <button className={item.layer === layer ? "active" : ""} key={layer} type="button" onClick={() => setObjectLayerFromList(item.id, layer)}>
                          {layer === "back" ? "З" : layer === "middle" ? "С" : "П"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="layer-list-group">
                <h3>Фигуры и зоны</h3>
                {layerGroups.shapes.map((item) => (
                  <div className={selected?.kind === "object" && selected.id === item.id ? "layer-row active" : "layer-row"} key={item.id}>
                    <button type="button" onClick={() => setSelected({ kind: "object", id: item.id })}>
                      <span>{item.label}</span>
                      <small>{item.visible ? LAYER_LABELS[item.layer] : "скрыт"}{item.locked ? " · заблокирован" : ""}</small>
                    </button>
                    <div className="mini-layer-actions" aria-label={`Слой ${item.label}`}>
                      {(["back", "middle", "front"] as LayerLevel[]).map((layer) => (
                        <button className={item.layer === layer ? "active" : ""} key={layer} type="button" onClick={() => setObjectLayerFromList(item.id, layer)}>
                          {layer === "back" ? "З" : layer === "middle" ? "С" : "П"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeLeftTab === "help" ? (
            <div className="editor-side-section hotkeys-panel">
              <h3>Быстрые действия</h3>
              <p><kbd>Ctrl</kbd> + <kbd>Z</kbd> отменить действие</p>
              <p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> повторить</p>
              <p><kbd>Ctrl</kbd> + <kbd>C</kbd> скопировать объект</p>
              <p><kbd>Ctrl</kbd> + <kbd>V</kbd> вставить копию</p>
              <p><kbd>Delete</kbd> удалить выбранный объект</p>
              <p><kbd>Esc</kbd> снять выделение</p>
            </div>
          ) : null}
        </aside>

        <section className="panel hall-board-panel hall-editor-canvas-panel">
          <div className="editor-canvas-header">
            <div>
              <p className="eyebrow">Рабочее поле</p>
              <h3>{preview ? "Предпросмотр для гостя" : "Редактирование схемы"}</h3>
            </div>
            <div className="editor-view-options">
              <label><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} /> Сетка</label>
              <label><input type="checkbox" checked={snapToGrid} onChange={(event) => setSnapToGrid(event.target.checked)} /> Привязка</label>
              <button className="button secondary" type="button" onClick={() => setZoom((value) => clamp(value - 0.1, 0.5, 1.8))}>-</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button className="button secondary" type="button" onClick={() => setZoom((value) => clamp(value + 0.1, 0.5, 1.8))}>+</button>
              <button className="button secondary icon-text" type="button" onClick={fitToView}><Maximize2 size={16} aria-hidden />Подогнать</button>
            </div>
          </div>

        <div className="hall-board-shell" ref={shellRef}>
          <div
            className={`hall-board ${showGrid ? "show-grid" : ""} ${preview ? "preview-mode" : ""}`}
            ref={boardRef}
            style={
              {
                "--hall-ratio": `${hallDraft.width} / ${hallDraft.height}`,
                "--grid-size": `${(hallDraft.gridSize / hallDraft.width) * 100}%`,
                "--board-width": `${Math.round(hallDraft.width * zoom)}px`,
                "--board-height": `${Math.round(hallDraft.height * zoom)}px`,
              } as CSSProperties
            }
            onPointerMove={movePointer}
            onPointerUp={stopPointer}
            onPointerLeave={stopPointer}
            onPointerDown={clearSelection}
          >
            {tables.length === 0 && objects.length === 0 ? <div className="hall-board-empty">В этом зале пока нет объектов. Добавьте первый стол или объект интерьера.</div> : null}
            {sortedObjects.map((object) => {
              const key = objectKey(object);
              const objectLayer = layerFromZIndex(object.zIndex);
              const isSelected = selected?.kind === "object" && selected.id === key;
              return (
                <button
                  className={`hall-neutral-object neutral-${object.type} neutral-${object.shape} layer-${objectLayer} ${isSelected ? "selected" : ""}`}
                  key={key}
                  style={{ left: `${(object.x / hallDraft.width) * 100}%`, top: `${(object.y / hallDraft.height) * 100}%`, width: `${(object.width / hallDraft.width) * 100}%`, height: `${(object.height / hallDraft.height) * 100}%`, transform: `rotate(${object.rotation}deg)`, zIndex: selectedStyleZIndex(object.zIndex, isSelected), "--object-color": object.color || "#8a5a44" } as CSSProperties}
                  type="button"
                  onPointerDown={(event) => pointerDown("object", key, event)}
                  aria-label={`Объект ${object.label}`}
                >
                  <span className="hall-object-icon">{object.icon || "•"}</span>
                  <strong>{object.label}</strong>
                  {isSelected ? <em className="layer-badge">{LAYER_LABELS[objectLayer]}</em> : null}
                  {!preview && isSelected ? (
                    <>
                      <span className="rotate-handle" onPointerDown={(event) => startRotate("object", key, event)}><RotateCw size={12} aria-hidden /></span>
                      {RESIZE_HANDLES.map((handle) => (
                        <span
                          aria-label={handle.label}
                          className={`resize-handle resize-${handle.handle}`}
                          key={handle.handle}
                          onPointerDown={(event) => startResize("object", key, handle.handle, event)}
                        />
                      ))}
                    </>
                  ) : null}
                </button>
              );
            })}
            {sortedTables.map((table) => {
              const key = tableKey(table);
              const type = tableTypes.find((item) => item.id === table.tableTypeId);
              const depositRequired = table.depositRequired ?? type?.isDepositRequired;
              const depositAmount = table.depositAmount ?? type?.defaultDepositAmount ?? 0;
              const isSelected = selected?.kind === "table" && selected.id === key;
              return (
                <button
                  className={`hall-table table-${table.shape} ${isSelected ? "selected" : ""} ${table.isActive ? "" : "disabled"}`}
                  key={key}
                  style={{ left: `${(table.x / hallDraft.width) * 100}%`, top: `${(table.y / hallDraft.height) * 100}%`, width: `${(table.width / hallDraft.width) * 100}%`, height: `${(table.height / hallDraft.height) * 100}%`, transform: `rotate(${table.rotation}deg)`, zIndex: selectedStyleZIndex(360, isSelected) } as CSSProperties}
                  type="button"
                  onPointerDown={(event) => pointerDown("table", key, event)}
                  aria-label={`Стол ${table.number}`}
                >
                  <strong>{table.number}</strong>
                  <span>{table.minGuests || 1}-{table.maxGuests || table.seats} гостей</span>
                  {depositRequired && depositAmount > 0 ? <small>{depositAmount} ₽</small> : null}
                  {isSelected ? <em className="layer-badge">Передний план</em> : null}
                  {!preview && isSelected ? (
                    <>
                      <span className="rotate-handle" onPointerDown={(event) => startRotate("table", key, event)}><RotateCw size={12} aria-hidden /></span>
                      {RESIZE_HANDLES.map((handle) => (
                        <span
                          aria-label={handle.label}
                          className={`resize-handle resize-${handle.handle}`}
                          key={handle.handle}
                          onPointerDown={(event) => startResize("table", key, handle.handle, event)}
                        />
                      ))}
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        {error ? <p className="form-error whitespace-pre-line">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}
      </section>

      <aside className="panel table-inspector">
        {selectedTable ? (
          <div className="stack-form">
            <h2>Стол</h2>
            <label><span>Номер стола</span><input value={selectedTable.number} onChange={(event) => updateTable(tableKey(selectedTable), { number: event.target.value })} /></label>
            <label><span>Тип стола</span><select value={selectedTable.tableTypeId || ""} onChange={(event) => {
              remember();
              const tableType = tableTypes.find((type) => type.id === event.target.value);
              updateTable(tableKey(selectedTable), { tableTypeId: event.target.value || null, minGuests: tableType?.minGuests ?? selectedTable.minGuests, maxGuests: tableType?.maxGuests ?? selectedTable.maxGuests, seats: tableType?.maxGuests ?? selectedTable.seats });
            }}><option value="">Без типа</option>{tableTypes.map((type) => <option key={type.id} value={type.id}>{type.title}</option>)}</select></label>
            {selectedType ? <p className="info-note">По типу: {selectedType.minGuests}-{selectedType.maxGuests} гостей, депозит {selectedType.isDepositRequired ? `${selectedType.defaultDepositAmount} ₽` : "не нужен"}.</p> : null}
            <div className="form-grid two">
              <label><span>Мин. гостей</span><input type="number" min="1" value={numberValue(selectedTable.minGuests)} onChange={(event) => updateTable(tableKey(selectedTable), { minGuests: event.target.value ? Number(event.target.value) : null })} /></label>
              <label><span>Макс. гостей</span><input type="number" min="1" value={numberValue(selectedTable.maxGuests)} onChange={(event) => updateTable(tableKey(selectedTable), { maxGuests: event.target.value ? Number(event.target.value) : null, seats: event.target.value ? Number(event.target.value) : selectedTable.seats })} /></label>
            </div>
            <label><span>Вместимость</span><input type="number" min="1" value={selectedTable.seats} onChange={(event) => updateTable(tableKey(selectedTable), { seats: Number(event.target.value) })} /></label>
            <div className="form-grid two">
              <label><span>Ширина</span><input type="number" min="36" value={selectedTable.width} onChange={(event) => updateTable(tableKey(selectedTable), { width: Number(event.target.value) })} /></label>
              <label><span>Высота</span><input type="number" min="36" value={selectedTable.height} onChange={(event) => updateTable(tableKey(selectedTable), { height: Number(event.target.value) })} /></label>
            </div>
            <label><span>Поворот</span><input type="number" value={selectedTable.rotation} onChange={(event) => updateTable(tableKey(selectedTable), { rotation: Number(event.target.value) })} /></label>
            <label><span>Форма</span><select value={selectedTable.shape} onChange={(event) => updateTable(tableKey(selectedTable), { shape: event.target.value })}><option value="rectangle">Прямоугольник</option><option value="square">Квадрат</option><option value="circle">Круг</option></select></label>
            <div className="object-layer-panel">
              <span>Слой</span>
              <strong>Передний план</strong>
              <p>Столы всегда остаются поверх зон и фоновых объектов, чтобы гости могли выбрать их на схеме.</p>
            </div>
            <div className="form-grid two">
              <label><span>Стоимость брони, ₽</span><input type="number" min="0" value={numberValue(selectedTable.bookingPrice)} onChange={(event) => updateTable(tableKey(selectedTable), { bookingPrice: event.target.value ? Number(event.target.value) : null })} /></label>
              <label><span>Депозит, ₽</span><input type="number" min="0" value={numberValue(selectedTable.depositAmount)} onChange={(event) => updateTable(tableKey(selectedTable), { depositAmount: event.target.value ? Number(event.target.value) : null })} /></label>
            </div>
            <label className="check-row"><input type="checkbox" checked={Boolean(selectedTable.depositRequired)} onChange={(event) => updateTable(tableKey(selectedTable), { depositRequired: event.target.checked })} />Депозит обязателен</label>
            <label className="check-row"><input type="checkbox" checked={selectedTable.isActive} onChange={(event) => updateTable(tableKey(selectedTable), { isActive: event.target.checked })} />Стол активен</label>
            <div className="inspector-actions">
              <button className="button secondary icon-text" type="button" onClick={duplicateSelection}><Copy size={17} aria-hidden />Дублировать</button>
              <button className="danger-button icon-text" type="button" onClick={() => void deleteSelectedTable()}><Trash2 size={17} aria-hidden />Удалить стол</button>
            </div>
          </div>
        ) : selectedObject ? (
          <div className="stack-form">
            <h2>Объект</h2>
            <label><span>Название</span><input value={selectedObject.label} onChange={(event) => updateObject(objectKey(selectedObject), { label: event.target.value })} /></label>
            <label><span>Тип объекта</span><select value={selectedObject.type} onChange={(event) => {
              const template = OBJECT_TYPES.find((item) => item.type === event.target.value);
              const defaults = OBJECT_DEFAULTS[event.target.value] ?? {};
              const nextLayer = defaultLayerForType(event.target.value);
              updateObject(objectKey(selectedObject), {
                type: event.target.value,
                icon: template?.icon ?? selectedObject.icon,
                color: template?.color ?? selectedObject.color,
                shape: defaults.shape ?? selectedObject.shape,
                zIndex: zIndexForLayer(nextLayer, defaults.zIndex ?? localZIndex(selectedObject.zIndex)),
              });
            }}>{OBJECT_TYPES.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
            <label><span>Иконка</span><input value={selectedObject.icon || ""} onChange={(event) => updateObject(objectKey(selectedObject), { icon: event.target.value })} /></label>
            <label><span>Цвет</span><input type="color" value={selectedObject.color || "#8a5a44"} onChange={(event) => updateObject(objectKey(selectedObject), { color: event.target.value })} /></label>
            <label><span>Форма</span><select value={selectedObject.shape} onChange={(event) => updateObject(objectKey(selectedObject), { shape: event.target.value })}><option value="rectangle">Прямоугольник</option><option value="square">Квадрат</option><option value="circle">Круг</option><option value="oval">Овал</option><option value="line">Линия</option></select></label>
            <div className="form-grid two">
              <label><span>Ширина</span><input type="number" min="8" value={selectedObject.width} onChange={(event) => updateObject(objectKey(selectedObject), { width: Number(event.target.value) })} /></label>
              <label><span>Высота</span><input type="number" min="8" value={selectedObject.height} onChange={(event) => updateObject(objectKey(selectedObject), { height: Number(event.target.value) })} /></label>
            </div>
            <label><span>Поворот</span><input type="number" value={selectedObject.rotation} onChange={(event) => updateObject(objectKey(selectedObject), { rotation: Number(event.target.value) })} /></label>
            <label><span>Заметка</span><textarea rows={3} value={selectedObject.notes || ""} onChange={(event) => updateObject(objectKey(selectedObject), { notes: event.target.value })} /></label>
            <label className="check-row"><input type="checkbox" checked={selectedObject.isVisible} onChange={(event) => updateObject(objectKey(selectedObject), { isVisible: event.target.checked })} />Показывать на схеме</label>
            <label className="check-row"><input type="checkbox" checked={selectedObject.isLocked} onChange={(event) => updateObject(objectKey(selectedObject), { isLocked: event.target.checked })} />Заблокировать перемещение</label>
            <div className="object-layer-panel">
              <span>Слой объекта</span>
              <div className="layer-segment" role="group" aria-label="Слой объекта">
                {(["back", "middle", "front"] as LayerLevel[]).map((layer) => (
                  <button
                    className={layerFromZIndex(selectedObject.zIndex) === layer ? "active" : ""}
                    key={layer}
                    type="button"
                    onClick={() => setObjectLayer(layer)}
                  >
                    {LAYER_LABELS[layer]}
                  </button>
                ))}
              </div>
            </div>
            <div className="inspector-actions layer-actions">
              <button className="button secondary icon-text" type="button" onClick={() => moveObjectOrder("down")}><MoveDown size={16} aria-hidden />Ниже</button>
              <button className="button secondary icon-text" type="button" onClick={() => moveObjectOrder("up")}><MoveUp size={16} aria-hidden />Выше</button>
            </div>
            <div className="inspector-actions">
              <button className="button secondary icon-text" type="button" onClick={duplicateSelection}><Copy size={17} aria-hidden />Дублировать</button>
              <button className="danger-button icon-text" type="button" onClick={deleteSelectedObject}><Trash2 size={17} aria-hidden />Удалить объект</button>
            </div>
          </div>
        ) : (
          <div className="stack-form">
            <h2>Параметры зала</h2>
            <label><span>Название зала</span><input value={hallDraft.title} onChange={(event) => { setHallDraft((current) => ({ ...current, title: event.target.value })); markDirty(); }} /></label>
            <div className="form-grid two">
              <label><span>Ширина</span><input type="number" min="320" value={hallDraft.width} onChange={(event) => { setHallDraft((current) => ({ ...current, width: Number(event.target.value) })); markDirty(); }} /></label>
              <label><span>Высота</span><input type="number" min="240" value={hallDraft.height} onChange={(event) => { setHallDraft((current) => ({ ...current, height: Number(event.target.value) })); markDirty(); }} /></label>
            </div>
            <label><span>Размер сетки</span><input type="number" min="8" max="80" value={hallDraft.gridSize} onChange={(event) => { setHallDraft((current) => ({ ...current, gridSize: Number(event.target.value) })); markDirty(); }} /></label>
            <p className="info-note">Для сложной формы зала используйте стены, перегородки, колонны и зоны. Рабочая область остается прямоугольной, но планировку можно собрать объектами.</p>
            <div className="inspector-actions">
              <button className="button icon-text" type="button" onClick={() => void save(false)}><Save size={17} aria-hidden />Сохранить схему</button>
              <button className="danger-button icon-text" type="button" onClick={() => void deleteHall()}><Trash2 size={17} aria-hidden />Удалить зал</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  </div>
  );
}
