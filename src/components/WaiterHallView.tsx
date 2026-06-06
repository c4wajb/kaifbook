"use client";

import { CSSProperties, useState } from "react";
import { X } from "lucide-react";

type Table = {
  id: string;
  number: string;
  seats: number;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isActive: boolean;
};

type HallObject = {
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
};

type Reservation = {
  id: string;
  customerName: string;
  customerPhone: string;
  guestsCount: number;
  startTime: string;
  endTime: string;
  status: string;
  tableId: string | null;
};

type Hall = {
  id: string;
  title: string;
  width: number;
  height: number;
  tables: Table[];
  objects?: HallObject[];
};

type Props = {
  hall: Hall;
  reservations: Reservation[];
};

const ACTIVE_STATUSES = new Set(["confirmed", "confirmed_by_restaurant", "confirmed_by_guest", "deposit_paid", "seated"]);

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "Новая",
    confirmed: "Подтверждена",
    confirmed_by_restaurant: "Подтверждена",
    confirmed_by_guest: "Гость подтвердил",
    deposit_paid: "Депозит оплачен",
    seated: "Сидит",
    completed: "Завершена",
  };
  return labels[status] || status;
}

export function WaiterHallView({ hall, reservations }: Props) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const reservationsByTable = new Map<string, Reservation[]>();
  for (const r of reservations) {
    if (r.tableId && ACTIVE_STATUSES.has(r.status)) {
      const list = reservationsByTable.get(r.tableId) || [];
      list.push(r);
      reservationsByTable.set(r.tableId, list);
    }
  }

  const selectedTable = hall.tables.find((t) => t.id === selectedTableId);
  const selectedReservations = selectedTableId ? reservationsByTable.get(selectedTableId) || [] : [];

  return (
    <div className="waiter-hall-layout">
      <div className="waiter-hall-board-wrap">
        <div
          className="hall-board waiter-hall-board"
          style={{ "--hall-ratio": `${hall.width} / ${hall.height}` } as CSSProperties}
        >
          {hall.objects?.map((obj, i) => (
            <div
              className={`hall-neutral-object neutral-${obj.type} neutral-${obj.shape}`}
              key={i}
              style={{
                left: `${(obj.x / hall.width) * 100}%`,
                top: `${(obj.y / hall.height) * 100}%`,
                width: `${(obj.width / hall.width) * 100}%`,
                height: `${(obj.height / hall.height) * 100}%`,
                transform: `rotate(${obj.rotation}deg)`,
                zIndex: obj.zIndex,
                "--object-color": obj.color || "#8a5a44",
              } as CSSProperties}
            >
              <span className="hall-object-icon">{obj.icon || "•"}</span>
              <strong>{obj.label}</strong>
            </div>
          ))}

          {hall.tables.filter((t) => t.isActive).map((table) => {
            const tableReservations = reservationsByTable.get(table.id) || [];
            const isOccupied = tableReservations.length > 0;
            const isSeated = tableReservations.some((r) => r.status === "seated");
            const isSelected = selectedTableId === table.id;

            return (
              <button
                className={`hall-table table-${table.shape} waiter-table ${isOccupied ? "occupied" : "free"} ${isSeated ? "seated" : ""} ${isSelected ? "selected" : ""}`}
                key={table.id}
                style={{
                  left: `${(table.x / hall.width) * 100}%`,
                  top: `${(table.y / hall.height) * 100}%`,
                  width: `${(table.width / hall.width) * 100}%`,
                  height: `${(table.height / hall.height) * 100}%`,
                  transform: `rotate(${table.rotation}deg)`,
                  zIndex: 360,
                } as CSSProperties}
                type="button"
                onClick={() => setSelectedTableId(isSelected ? null : table.id)}
              >
                <strong>{table.number}</strong>
                {isOccupied ? (
                  <span className="waiter-table-guest">{tableReservations[0].customerName.split(" ")[0]}</span>
                ) : (
                  <span>Свободен</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside className={`waiter-table-info panel ${selectedTable ? "open" : ""}`}>
        {selectedTable ? (
          <>
            <div className="section-heading">
              <h3>Стол {selectedTable.number}</h3>
              <button className="icon-only" type="button" onClick={() => setSelectedTableId(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="waiter-table-meta">
              <span>Мест: {selectedTable.seats}</span>
            </div>
            {selectedReservations.length > 0 ? (
              <div className="waiter-reservations-list">
                {selectedReservations.map((r) => (
                  <div className="waiter-reservation-card" key={r.id}>
                    <strong>{r.customerName}</strong>
                    <span>{r.customerPhone}</span>
                    <span>{r.guestsCount} гост. · {r.startTime}–{r.endTime}</span>
                    <span className={`badge badge-${r.status.replaceAll("_", "-")}`}>{statusLabel(r.status)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Стол свободен</div>
            )}
          </>
        ) : (
          <div className="empty-state">Нажмите на стол, чтобы увидеть информацию</div>
        )}
      </aside>
    </div>
  );
}
