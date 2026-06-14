"use client";

import { Armchair, Loader2 } from "lucide-react";
import { CSSProperties, type MouseEvent as ReactMouseEvent, type TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchJsonWithDiagnostics, isFriendlyAbort } from "@/lib/client-fetch";
import { getPublicSchemeObjectZIndex, getPublicTableZIndex, getSchemeObjectLayer, sortSchemeObjectsForRender } from "@/lib/scheme-layers";

type Pricing = {
  bookingPrice: number;
  depositAmount: number;
  isDepositRequired: boolean;
  appliedRuleId?: string | null;
  explanation: string;
  noShowRiskLevel: string;
};

type HallObject = {
  id: string;
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
  zIndex?: number;
  isVisible?: boolean;
};
type Hall = { id: string; title: string; width: number; height: number; sortOrder?: number; objects?: HallObject[] };
type Seat = { id: string; seatNumber: number; status: "available" | "occupied" | "unavailable" };
export type PublicBookingTable = {
  id: string;
  hallId: string;
  hallTitle: string;
  number: string;
  seats: number;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isActive: boolean;
  minGuests: number;
  maxGuests: number;
  tableType: { id: string; title: string; code: string } | null;
  status: "available" | "occupied" | "too_small" | "disabled";
  reason: string;
  pricing: Pricing;
  seatsMap: Seat[];
};

type Availability = {
  settings: {
    allowTableSelection: boolean;
    allowSeatSelection: boolean;
    reserveWholeTableWhenSeatsSelected: boolean;
    minSeatsSelection: number;
    maxSeatsSelection: number | null;
  };
  halls: Hall[];
  tables: PublicBookingTable[];
};

type Props = {
  restaurantKey: string;
  selectedDate: string;
  selectedStartTime: string;
  selectedEndTime: string;
  guestsCount: number;
  selectedTableId: string;
  selectedSeatIds: string[];
  onSelectTable: (tableId: string, table: PublicBookingTable | null) => void;
  onSelectSeats: (seatIds: string[]) => void;
  onGuestsCountChange?: (guestsCount: number) => void;
  onPricingChange: (pricing: Pricing | null) => void;
  onSeatSelectionAvailability?: (enabled: boolean) => void;
  readonly?: boolean;
};

function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
}

function seatStyle(index: number, total: number) {
  const angle = -Math.PI / 2 + (index / Math.max(1, total)) * Math.PI * 2;
  const radiusX = 58;
  const radiusY = 58;
  return {
    left: `${50 + Math.cos(angle) * radiusX}%`,
    top: `${50 + Math.sin(angle) * radiusY}%`,
  };
}

function tableStateLabel(table: PublicBookingTable) {
  if (table.status === "occupied") return "Недоступен";
  if (table.status === "too_small") return "Мало мест";
  if (table.status === "disabled") return "Недоступен";
  return table.pricing.isDepositRequired ? `Депозит ${formatRub(table.pricing.depositAmount)}` : "Свободен";
}

function clampZoom(value: number) {
  return Math.min(3, Math.max(1, value));
}

function distanceBetweenTouches(event: TouchEvent<HTMLDivElement>) {
  const first = event.touches.item(0);
  const second = event.touches.item(1);
  if (!first || !second) return 0;
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

export function PublicHallBookingWidget({
  restaurantKey,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  guestsCount,
  selectedTableId,
  selectedSeatIds,
  onSelectTable,
  onSelectSeats,
  onGuestsCountChange,
  onPricingChange,
  onSeatSelectionAvailability,
  readonly = false,
}: Props) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [activeHallId, setActiveHallId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequestId = useRef(0);
  const boardViewportRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; zoomMultiplier: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [viewport, setViewport] = useState({ width: 0, maxHeight: Number.POSITIVE_INFINITY });
  const [zoomMultiplier, setZoomMultiplier] = useState(1);

  useEffect(() => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime || guestsCount < 1) return;
    const controller = new AbortController();
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    async function loadAvailability() {
      setPending(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          date: selectedDate,
          time: selectedStartTime,
          endTime: selectedEndTime,
          guestsCount: String(guestsCount),
        });
        const data = await fetchJsonWithDiagnostics<Availability>(`/api/public/restaurants/${restaurantKey}/availability?${params.toString()}`, {
          signal: controller.signal,
          debugLabel: "availability",
          userMessage: "Не удалось загрузить свободные столы. Проверьте интернет и попробуйте ещё раз.",
          logPayload: { restaurantKey, date: selectedDate, startTime: selectedStartTime, endTime: selectedEndTime, guestsCount },
        });
        if (controller.signal.aborted || requestId !== latestRequestId.current) return;
        setAvailability(data);
        setActiveHallId((current) => (current && data.halls.some((hall: Hall) => hall.id === current) ? current : data.halls[0]?.id || ""));
      } catch (loadError) {
        if (!isFriendlyAbort(loadError) && requestId === latestRequestId.current) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить свободные столы. Проверьте интернет и попробуйте ещё раз.");
          setAvailability(null);
          onSelectTable("", null);
          onSelectSeats([]);
          onPricingChange(null);
          onSeatSelectionAvailability?.(true);
        }
      } finally {
        if (!controller.signal.aborted && requestId === latestRequestId.current) setPending(false);
      }
    }
    loadAvailability();
    return () => controller.abort();
  }, [guestsCount, onPricingChange, onSeatSelectionAvailability, onSelectSeats, onSelectTable, restaurantKey, selectedDate, selectedEndTime, selectedStartTime]);

  const activeHall = availability?.halls.find((hall) => hall.id === activeHallId) ?? availability?.halls[0] ?? null;
  const tables = useMemo(() => availability?.tables.filter((table) => table.hallId === activeHall?.id) ?? [], [activeHall?.id, availability?.tables]);
  const hallObjects = useMemo(
    () => sortSchemeObjectsForRender((activeHall?.objects || []).filter((object) => object.isVisible !== false)),
    [activeHall?.objects],
  );
  const selectedTable = availability?.tables.find((table) => table.id === selectedTableId) ?? null;
  const boardWidth = activeHall?.width || 900;
  const boardHeight = activeHall?.height || 520;
  const fitScale = useMemo(() => {
    if (!viewport.width) return 1;
    const scaleByWidth = viewport.width / boardWidth;
    const scaleByHeight = Number.isFinite(viewport.maxHeight) ? viewport.maxHeight / boardHeight : Number.POSITIVE_INFINITY;
    // Fill the available width (scale up when the hall is narrower than the
    // viewport) without overflowing the height. Capped so it can't get absurd.
    return Math.max(0.12, Math.min(scaleByWidth, scaleByHeight, 2.4));
  }, [boardHeight, boardWidth, viewport.maxHeight, viewport.width]);
  const currentScale = fitScale * zoomMultiplier;
  const isZoomed = zoomMultiplier > 1.02;
  const boardViewportHeight = Math.max(180, Math.ceil(boardHeight * fitScale));
  const scaledBoardWidth = Math.ceil(boardWidth * currentScale);
  const scaledBoardHeight = Math.ceil(boardHeight * currentScale);

  useEffect(() => {
    const node = boardViewportRef.current;
    if (!node) return;

    const updateViewport = () => {
      const width = Math.max(1, node.clientWidth);
      const mobileHeight = typeof window === "undefined" ? 420 : Math.min(430, Math.max(260, window.innerHeight * 0.46));
      // Desktop gets a generous height cap so the board can grow to fill the
      // width for typical halls, while never running off the screen vertically.
      const desktopHeight = typeof window === "undefined" ? 760 : Math.min(820, Math.max(420, window.innerHeight * 0.72));
      setViewport({
        width,
        maxHeight: width <= 680 ? mobileHeight : desktopHeight,
      });
    };

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);
    window.addEventListener("resize", updateViewport);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewport);
    };
  }, [activeHall?.id]);

  useEffect(() => {
    setZoomMultiplier(1);
  }, [activeHall?.id, boardHeight, boardWidth]);

  useEffect(() => {
    onPricingChange(selectedTable?.pricing ?? null);
  }, [onPricingChange, selectedTable?.pricing]);

  useEffect(() => {
    if (!availability) return;
    onSeatSelectionAvailability?.(availability.settings.allowSeatSelection !== false);
  }, [availability, onSeatSelectionAvailability]);

  useEffect(() => {
    if (!availability || !selectedTableId) return;
    const table = availability.tables.find((item) => item.id === selectedTableId);
    if (!table || table.status !== "available") {
      onSelectTable("", null);
      onSelectSeats([]);
      onPricingChange(null);
      return;
    }

    const availableSeatIds = new Set(table.seatsMap.filter((seat) => seat.status === "available").map((seat) => seat.id));
    const validSelectedSeats = selectedSeatIds.filter((seatId) => availableSeatIds.has(seatId));
    if (validSelectedSeats.length !== selectedSeatIds.length) onSelectSeats(validSelectedSeats);
  }, [availability, onPricingChange, onSelectSeats, onSelectTable, selectedSeatIds, selectedTableId]);

  function selectTable(table: PublicBookingTable) {
    if (dragging || readonly || table.status !== "available" || availability?.settings.allowTableSelection === false) return;
    onSelectTable(table.id, table);
    const tableMaxGuests = table.maxGuests || table.seats;
    const desiredGuestsCount = Math.min(Math.max(guestsCount, table.minGuests || 1), tableMaxGuests);
    const availableSeats = table.seatsMap.filter((seat) => seat.status === "available");
    const seatLimit = Math.min(availableSeats.length, table.seats, tableMaxGuests, availability?.settings.maxSeatsSelection ?? table.seats, desiredGuestsCount);
    const nextSeats = availability?.settings.allowSeatSelection ? availableSeats.slice(0, seatLimit).map((seat) => seat.id) : [];
    onSelectSeats(nextSeats || []);
    if (nextSeats.length > 0 && nextSeats.length !== guestsCount) onGuestsCountChange?.(nextSeats.length);
  }

  function toggleSeat(table: PublicBookingTable, seat: Seat) {
    if (dragging || readonly || table.status !== "available" || seat.status !== "available" || availability?.settings.allowSeatSelection === false) return;
    const maxSeats = Math.min(table.seats, table.maxGuests || table.seats, availability?.settings.maxSeatsSelection ?? table.seats);
    const sameTableSeats = selectedTableId === table.id ? selectedSeatIds : [];
    const exists = sameTableSeats.includes(seat.id);
    const nextSeats = exists ? sameTableSeats.filter((id) => id !== seat.id) : [...sameTableSeats, seat.id].slice(0, maxSeats);
    onSelectTable(table.id, table);
    onSelectSeats(nextSeats);
    if (nextSeats.length > 0 && nextSeats.length !== guestsCount) onGuestsCountChange?.(nextSeats.length);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      pinchRef.current = { distance: distanceBetweenTouches(event), zoomMultiplier };
      panRef.current = null;
      return;
    }

    if (event.touches.length === 1 && isZoomed && boardViewportRef.current) {
      const touch = event.touches.item(0);
      if (!touch) return;
      panRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        scrollLeft: boardViewportRef.current.scrollLeft,
        scrollTop: boardViewportRef.current.scrollTop,
      };
    }
  }

  useEffect(() => {
    const el = boardViewportRef.current;
    if (!el) return;
    function onTouchMove(event: globalThis.TouchEvent) {
      if (event.touches.length === 2 && pinchRef.current) {
        const nextDistance = distanceBetweenTouches(event as unknown as TouchEvent<HTMLDivElement>);
        if (!nextDistance || !pinchRef.current.distance) return;
        event.preventDefault();
        setZoomMultiplier(clampZoom(pinchRef.current.zoomMultiplier * (nextDistance / pinchRef.current.distance)));
        return;
      }

      if (event.touches.length === 1 && panRef.current && boardViewportRef.current) {
        const touch = event.touches.item(0);
        if (!touch) return;
        event.preventDefault();
        boardViewportRef.current.scrollLeft = panRef.current.scrollLeft - (touch.clientX - panRef.current.x);
        boardViewportRef.current.scrollTop = panRef.current.scrollTop - (touch.clientY - panRef.current.y);
      }
    }
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) pinchRef.current = null;
    if (event.touches.length === 0) panRef.current = null;
  }

  useEffect(() => {
    const el = boardViewportRef.current;
    if (!el) return;
    function onWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      setZoomMultiplier((current) => clampZoom(current + direction * 0.15));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const mousePanRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number; dragged: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isZoomed || event.button !== 0 || !boardViewportRef.current) return;
    mousePanRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: boardViewportRef.current.scrollLeft,
      scrollTop: boardViewportRef.current.scrollTop,
      dragged: false,
    };
  }, [isZoomed]);

  useEffect(() => {
    function onMouseMove(event: globalThis.MouseEvent) {
      if (!mousePanRef.current || !boardViewportRef.current) return;
      const dx = event.clientX - mousePanRef.current.x;
      const dy = event.clientY - mousePanRef.current.y;
      if (!mousePanRef.current.dragged && Math.abs(dx) + Math.abs(dy) < 5) return;
      mousePanRef.current.dragged = true;
      setDragging(true);
      boardViewportRef.current.scrollLeft = mousePanRef.current.scrollLeft - dx;
      boardViewportRef.current.scrollTop = mousePanRef.current.scrollTop - dy;
    }
    function onMouseUp() {
      if (mousePanRef.current?.dragged) {
        setTimeout(() => setDragging(false), 0);
      } else {
        setDragging(false);
      }
      mousePanRef.current = null;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (pending && !availability) {
    return (
      <div className="hall-widget-state">
        <Loader2 size={18} className="spin" aria-hidden />
        Ищем свободные столы
      </div>
    );
  }

  if (error) return <div className="hall-widget-state error-state">{error}</div>;
  if (!availability?.halls.length || !availability.tables.length) {
    return (
      <div className="hall-widget-state">
        <Armchair size={20} aria-hidden />
        <div>
          <strong>Столы пока не добавлены для онлайн-выбора</strong>
          <span>Отправьте заявку, и менеджер подберёт подходящий стол.</span>
        </div>
      </div>
    );
  }

  return (
    <section className="public-hall-widget" aria-label="Выбор стола">
      <div className="hall-widget-head">
        <div>
          <span className="eyebrow">Столы ресторана</span>
          <h3>Выберите стол</h3>
          <p>Нажмите на свободный стол. Если нужно, выберите места рядом с ним.</p>
        </div>
        {pending ? <span className="tiny-status"><Loader2 size={14} className="spin" aria-hidden /> обновляем</span> : null}
      </div>

      {availability.halls.length > 1 ? (
        <div className="hall-tabs" role="tablist" aria-label="Залы ресторана">
          {availability.halls.map((hall) => (
            <button className={hall.id === activeHall?.id ? "active" : ""} key={hall.id} type="button" onClick={() => setActiveHallId(hall.id)}>
              {hall.title}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`public-booking-board-scroll fit-to-view ${isZoomed ? "is-zoomed" : "is-fit"} ${dragging ? "is-dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
        ref={boardViewportRef}
        style={{ "--board-viewport-height": `${boardViewportHeight}px`, cursor: isZoomed ? (dragging ? "grabbing" : "grab") : undefined } as CSSProperties}
      >
        <div className="public-booking-board-zoom" style={{ width: `${scaledBoardWidth}px`, height: `${scaledBoardHeight}px` }}>
      <div
        className="public-booking-board"
        style={{
          aspectRatio: `${boardWidth} / ${boardHeight}`,
          width: `${boardWidth}px`,
          height: `${boardHeight}px`,
          transform: `scale(${currentScale})`,
          "--scheme-board-width": `${boardWidth}px`,
          "--scheme-board-height": `${boardHeight}px`,
        } as CSSProperties}
      >
        {hallObjects.map((object) => {
          const objectLayer = getSchemeObjectLayer(object);
          return (
          <div
            className={`public-neutral-object neutral-${object.type} neutral-${object.shape} public-layer-${objectLayer}`}
            key={object.id}
            style={{
              left: `${(object.x / boardWidth) * 100}%`,
              top: `${(object.y / boardHeight) * 100}%`,
              width: `${(object.width / boardWidth) * 100}%`,
              height: `${(object.height / boardHeight) * 100}%`,
              transform: `rotate(${object.rotation}deg)`,
              zIndex: getPublicSchemeObjectZIndex(object),
              "--object-color": object.color || "#8a5a44",
            } as CSSProperties}
            aria-hidden="true"
          >
            <span>{object.icon || "•"}</span>
            <strong>{object.label}</strong>
          </div>
        );})}
        {tables.map((table) => {
          const left = `${(table.x / boardWidth) * 100}%`;
          const top = `${(table.y / boardHeight) * 100}%`;
          const width = `${(table.width / boardWidth) * 100}%`;
          const height = `${(table.height / boardHeight) * 100}%`;
          const selected = selectedTableId === table.id;
          return (
            <div className={`booking-table ${table.shape === "circle" ? "round" : ""} status-${table.status} ${selected ? "selected" : ""} ${table.pricing.isDepositRequired ? "requires-deposit" : ""}`} key={table.id} style={{ left, top, width, height, transform: `rotate(${table.rotation}deg)`, zIndex: getPublicTableZIndex(selected) }}>
              {table.seatsMap.map((seat, index) => (
                <button
                  aria-label={`Место ${seat.seatNumber} за столом ${table.number}`}
                  className={`seat-dot seat-${seat.status} ${selectedSeatIds.includes(seat.id) ? "selected" : ""}`}
                  disabled={readonly || table.status !== "available" || seat.status !== "available"}
                  key={seat.id}
                  title={table.status === "available" && seat.status === "available" ? `Место ${seat.seatNumber}` : table.reason}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSeat(table, seat);
                  }}
                  style={seatStyle(index, table.seatsMap.length)}
                  type="button"
                >
                  {seat.seatNumber}
                </button>
              ))}
              <button aria-label={`Выбрать стол ${table.number}`} className="booking-table-core" disabled={readonly || table.status !== "available"} onClick={() => selectTable(table)} title={table.reason} type="button">
                <strong>{table.number}</strong>
                <span>{table.seats} мест</span>
                <small>{tableStateLabel(table)}</small>
              </button>
            </div>
          );
        })}
      </div>
        </div>
      </div>

      <div className="hall-legend">
        <span><i className="legend-free" /> свободен</span>
        <span><i className="legend-selected" /> выбран</span>
        <span><i className="legend-busy" /> недоступен</span>
        <span><i className="legend-warning" /> нужен депозит</span>
      </div>

      {selectedTable ? (
        <div className="selected-table-summary">
          <strong>Стол {selectedTable.number} · {selectedSeatIds.length || guestsCount} мест из {selectedTable.seats}</strong>
          <span>{selectedTable.tableType?.title ? `${selectedTable.tableType.title} · ` : ""}{selectedTable.pricing.explanation}</span>
        </div>
      ) : (
        <div className="selected-table-summary muted-summary">
          <strong>Стол не выбран</strong>
          <span>Нажмите на свободный стол. Мы добавим его в заявку.</span>
        </div>
      )}
    </section>
  );
}
