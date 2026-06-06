"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  FileText,
  Globe,
  HardDrive,
  Layers,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  XCircle,
  Zap,
} from "lucide-react";

type LogEntry = {
  ip: string;
  time: string;
  method: string;
  path: string;
  status: number;
  size: number;
  referer: string;
  ua: string;
};

type HealthData = {
  timestamp: string;
  uptime: number;
  cpu: { cores: number; load: { "1m": number; "5m": number; "15m": number } };
  memory: { total: number; used: number; percent: number; swap: { total: number; used: number } };
  disk: {
    total: number;
    used: number;
    percent: number;
    breakdown: Array<{ path: string; bytes: number; label: string }>;
  };
  app: { status: string; memoryMb: number; startedAt: string; nodeVersion: string };
  nginx: { status: string };
  network: { tcpEstablished: number; totalRequests: number };
  healthLog: Array<{ time: string; level: string; message: string }> | null;
  requestStats: {
    total: number;
    today: number;
    lastHour: number;
    last200: number;
    statusCodes: Record<string, number>;
    topPaths: Array<{ path: string; count: number }>;
    totalBandwidth: number;
  };
  recentLogs: LogEntry[];
  nginxErrors: Array<{ time: string; level: string; message: string }>;
  topProcesses: Array<{ user: string; pid: string; cpu: number; mem: number; rss: number; command: string }>;
  dbStats: { fileSize: number; tables: Array<{ name: string; rows: number }> };
};

type Tab = "overview" | "requests" | "logs" | "processes" | "database";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}д ${hours}ч ${mins}м`;
  if (hours > 0) return `${hours}ч ${mins}м`;
  return `${mins}м`;
}

function formatTimeSince(dateStr: string) {
  if (!dateStr) return "\u2014";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 0) return "только что";
  return formatUptime(diff);
}

function formatNumber(n: number) {
  return n.toLocaleString("ru-RU");
}

function StatusBadge({ status }: { status: string }) {
  const isOk = status === "active" || status === "running";
  return (
    <span className={`server-status-badge ${isOk ? "ok" : "bad"}`}>
      {isOk ? <CheckCircle size={14} /> : <XCircle size={14} />}
      {status}
    </span>
  );
}

function GaugeBar({ percent, warn = 70, crit = 90 }: { percent: number; warn?: number; crit?: number }) {
  const level = percent >= crit ? "crit" : percent >= warn ? "warn" : "ok";
  return (
    <div className="server-gauge">
      <div className={`server-gauge-fill ${level}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      <span>{percent}%</span>
    </div>
  );
}

function HttpStatusBadge({ status }: { status: number }) {
  let cls = "info";
  if (status >= 500) cls = "error";
  else if (status >= 400) cls = "warn";
  else if (status >= 300) cls = "redirect";
  else if (status >= 200) cls = "success";
  return <span className={`server-http-badge ${cls}`}>{status}</span>;
}

function StatusCodeBar({ code, count, max }: { code: string; count: number; max: number }) {
  const percent = max > 0 ? (count / max) * 100 : 0;
  let cls = "info";
  if (code === "5xx") cls = "error";
  else if (code === "4xx") cls = "warn";
  else if (code === "3xx") cls = "redirect";
  else if (code === "2xx") cls = "success";
  return (
    <div className="server-status-code-row">
      <span className={`server-status-code-label ${cls}`}>{code}</span>
      <div className="server-status-code-bar-track">
        <div className={`server-status-code-bar-fill ${cls}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="server-status-code-count">{formatNumber(count)}</span>
    </div>
  );
}

// === Tab: Overview ===
function OverviewTab({ data }: { data: HealthData }) {
  const loadPercent = Math.round((data.cpu.load["1m"] / data.cpu.cores) * 100);

  return (
    <>
      {/* Status cards */}
      <div className="server-status-row">
        <div className="server-card mini">
          <Server size={20} />
          <div>
            <span className="server-card-label">Uptime</span>
            <strong>{formatUptime(data.uptime)}</strong>
          </div>
        </div>
        <div className="server-card mini">
          <Activity size={20} />
          <div>
            <span className="server-card-label">Приложение</span>
            <StatusBadge status={data.app.status} />
          </div>
        </div>
        <div className="server-card mini">
          <Network size={20} />
          <div>
            <span className="server-card-label">Nginx</span>
            <StatusBadge status={data.nginx.status} />
          </div>
        </div>
        <div className="server-card mini">
          <Zap size={20} />
          <div>
            <span className="server-card-label">Запросов сегодня</span>
            <strong>{formatNumber(data.requestStats.today)}</strong>
          </div>
        </div>
      </div>

      {/* Main metrics */}
      <div className="server-metrics-grid">
        {/* CPU */}
        <div className="server-card">
          <div className="server-card-head">
            <Cpu size={18} />
            <h3>CPU</h3>
            <span className="server-card-sub">{data.cpu.cores} ядер</span>
          </div>
          <GaugeBar percent={loadPercent} />
          <div className="server-detail-grid">
            <div><span>1 мин</span><strong>{data.cpu.load["1m"].toFixed(2)}</strong></div>
            <div><span>5 мин</span><strong>{data.cpu.load["5m"].toFixed(2)}</strong></div>
            <div><span>15 мин</span><strong>{data.cpu.load["15m"].toFixed(2)}</strong></div>
          </div>
        </div>

        {/* Memory */}
        <div className="server-card">
          <div className="server-card-head">
            <MemoryStick size={18} />
            <h3>Память</h3>
            <span className="server-card-sub">{formatBytes(data.memory.total)}</span>
          </div>
          <GaugeBar percent={data.memory.percent} />
          <div className="server-detail-grid">
            <div><span>Занято</span><strong>{formatBytes(data.memory.used)}</strong></div>
            <div><span>Свободно</span><strong>{formatBytes(data.memory.total - data.memory.used)}</strong></div>
            <div><span>Swap</span><strong>{formatBytes(data.memory.swap.used)}</strong></div>
          </div>
        </div>

        {/* Disk */}
        <div className="server-card">
          <div className="server-card-head">
            <HardDrive size={18} />
            <h3>Диск</h3>
            <span className="server-card-sub">{formatBytes(data.disk.total)}</span>
          </div>
          <GaugeBar percent={data.disk.percent} warn={80} crit={95} />
          <div className="server-detail-grid">
            <div><span>Занято</span><strong>{formatBytes(data.disk.used)}</strong></div>
            <div><span>Свободно</span><strong>{formatBytes(data.disk.total - data.disk.used)}</strong></div>
            <div><span>Использовано</span><strong>{data.disk.percent}%</strong></div>
          </div>
          {data.disk.breakdown.length > 0 && (
            <div className="server-disk-breakdown">
              <span className="server-breakdown-title">Разбивка по директориям</span>
              {data.disk.breakdown.map((entry) => (
                <div key={entry.path} className="server-breakdown-row">
                  <span className="server-breakdown-label">{entry.label}</span>
                  <strong>{formatBytes(entry.bytes)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* App */}
        <div className="server-card">
          <div className="server-card-head">
            <Activity size={18} />
            <h3>Приложение</h3>
          </div>
          <div className="server-detail-grid wide">
            <div><span>Статус</span><StatusBadge status={data.app.status} /></div>
            <div><span>Память</span><strong>{data.app.memoryMb} MB</strong></div>
            <div><span>Запущено</span><strong>{formatTimeSince(data.app.startedAt)} назад</strong></div>
            <div><span>TCP соед.</span><strong>{data.network.tcpEstablished}</strong></div>
            <div><span>Всего запросов</span><strong>{formatNumber(data.network.totalRequests)}</strong></div>
            <div><span>Node.js</span><strong>{data.app.nodeVersion}</strong></div>
          </div>
        </div>
      </div>

      {/* Health log */}
      <div className="server-card">
        <div className="server-card-head">
          {data.healthLog && data.healthLog.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <h3>Журнал здоровья</h3>
        </div>
        {data.healthLog && data.healthLog.length > 0 ? (
          <div className="server-log">
            {data.healthLog.map((entry, i) => (
              <div key={i} className={`server-log-entry ${entry.level.toLowerCase()}`}>
                <span className="server-log-time">{new Date(entry.time).toLocaleString("ru-RU")}</span>
                <span className={`server-log-level ${entry.level.toLowerCase()}`}>{entry.level}</span>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ padding: "12px 0" }}>Инцидентов не зафиксировано. Сервер работает стабильно.</p>
        )}
      </div>
    </>
  );
}

// === Tab: Requests ===
function RequestsTab({ data }: { data: HealthData }) {
  const { requestStats } = data;
  const maxStatusCount = Math.max(...Object.values(requestStats.statusCodes), 1);

  return (
    <>
      {/* Request counters */}
      <div className="server-status-row">
        <div className="server-card mini">
          <Globe size={20} />
          <div>
            <span className="server-card-label">Всего запросов</span>
            <strong>{formatNumber(requestStats.total)}</strong>
          </div>
        </div>
        <div className="server-card mini">
          <Clock size={20} />
          <div>
            <span className="server-card-label">За последний час</span>
            <strong>{formatNumber(requestStats.lastHour)}</strong>
          </div>
        </div>
        <div className="server-card mini">
          <Zap size={20} />
          <div>
            <span className="server-card-label">Сегодня</span>
            <strong>{formatNumber(requestStats.today)}</strong>
          </div>
        </div>
        <div className="server-card mini">
          <Layers size={20} />
          <div>
            <span className="server-card-label">Трафик (последние)</span>
            <strong>{formatBytes(requestStats.totalBandwidth)}</strong>
          </div>
        </div>
      </div>

      <div className="server-metrics-grid">
        {/* Status codes */}
        <div className="server-card">
          <div className="server-card-head">
            <Activity size={18} />
            <h3>Коды ответов</h3>
            <span className="server-card-sub">последние {requestStats.last200}</span>
          </div>
          <div className="server-status-codes">
            {["2xx", "3xx", "4xx", "5xx"].map((code) => (
              <StatusCodeBar key={code} code={code} count={requestStats.statusCodes[code] || 0} max={maxStatusCount} />
            ))}
          </div>
        </div>

        {/* Top paths */}
        <div className="server-card">
          <div className="server-card-head">
            <FileText size={18} />
            <h3>Популярные эндпоинты</h3>
          </div>
          <div className="server-top-paths">
            {requestStats.topPaths.map((entry) => (
              <div key={entry.path} className="server-top-path-row">
                <code>{entry.path}</code>
                <span>{entry.count}</span>
              </div>
            ))}
            {requestStats.topPaths.length === 0 && <p className="muted">Нет данных</p>}
          </div>
        </div>
      </div>
    </>
  );
}

// === Tab: Logs ===
function LogsTab({ data }: { data: HealthData }) {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredLogs = data.recentLogs.filter((entry) => {
    if (statusFilter !== "all") {
      const group = `${Math.floor(entry.status / 100)}xx`;
      if (group !== statusFilter) return false;
    }
    if (filter) {
      const q = filter.toLowerCase();
      return entry.path.toLowerCase().includes(q) || entry.ip.includes(q) || entry.method.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      {/* Access logs */}
      <div className="server-card">
        <div className="server-card-head">
          <FileText size={18} />
          <h3>Логи запросов</h3>
          <span className="server-card-sub">последние {data.recentLogs.length}</span>
        </div>
        <div className="server-log-filters">
          <input
            type="text"
            placeholder="Фильтр по пути, IP, методу..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="server-log-search"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="server-log-select">
            <option value="all">Все статусы</option>
            <option value="2xx">2xx</option>
            <option value="3xx">3xx</option>
            <option value="4xx">4xx</option>
            <option value="5xx">5xx</option>
          </select>
        </div>
        <div className="server-access-log">
          <div className="server-access-header">
            <span>Время</span>
            <span>Метод</span>
            <span>Путь</span>
            <span>Статус</span>
            <span>Размер</span>
            <span>IP</span>
          </div>
          {filteredLogs.map((entry, i) => (
            <div key={i} className="server-access-row">
              <span className="server-access-time">{entry.time.split(" ")[1]?.split(" ")[0] || entry.time.slice(12)}</span>
              <span className={`server-access-method ${entry.method.toLowerCase()}`}>{entry.method}</span>
              <span className="server-access-path" title={entry.path}>{entry.path}</span>
              <HttpStatusBadge status={entry.status} />
              <span className="server-access-size">{entry.size > 0 ? formatBytes(entry.size) : "\u2014"}</span>
              <span className="server-access-ip">{entry.ip}</span>
            </div>
          ))}
          {filteredLogs.length === 0 && <p className="muted" style={{ padding: 16 }}>Нет записей по фильтру</p>}
        </div>
      </div>

      {/* Nginx errors */}
      {data.nginxErrors.length > 0 && (
        <div className="server-card" style={{ marginTop: 16 }}>
          <div className="server-card-head">
            <AlertTriangle size={18} />
            <h3>Ошибки Nginx</h3>
          </div>
          <div className="server-log">
            {data.nginxErrors.map((entry, i) => (
              <div key={i} className="server-log-entry action">
                <span className="server-log-time">{entry.time}</span>
                <span className={`server-log-level ${entry.level === "error" ? "action" : "warn"}`}>{entry.level}</span>
                <span className="server-log-message">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// === Tab: Processes ===
function ProcessesTab({ data }: { data: HealthData }) {
  return (
    <div className="server-card">
      <div className="server-card-head">
        <Cpu size={18} />
        <h3>Топ процессов по памяти</h3>
      </div>
      <div className="server-process-table">
        <div className="server-process-header">
          <span>PID</span>
          <span>Пользователь</span>
          <span>CPU %</span>
          <span>MEM %</span>
          <span>RSS</span>
          <span>Команда</span>
        </div>
        {data.topProcesses.map((proc) => (
          <div key={proc.pid} className="server-process-row">
            <span className="server-process-pid">{proc.pid}</span>
            <span>{proc.user}</span>
            <span className={proc.cpu > 50 ? "server-val-warn" : ""}>{proc.cpu.toFixed(1)}%</span>
            <span className={proc.mem > 30 ? "server-val-warn" : ""}>{proc.mem.toFixed(1)}%</span>
            <span>{formatBytes(proc.rss * 1024)}</span>
            <span className="server-process-cmd" title={proc.command}>{proc.command}</span>
          </div>
        ))}
        {data.topProcesses.length === 0 && <p className="muted" style={{ padding: 16 }}>Нет данных</p>}
      </div>
    </div>
  );
}

// === Tab: Database ===
function DatabaseTab({ data }: { data: HealthData }) {
  const { dbStats } = data;
  const totalRows = dbStats.tables.reduce((sum, t) => sum + t.rows, 0);

  return (
    <>
      <div className="server-status-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="server-card mini">
          <Database size={20} />
          <div>
            <span className="server-card-label">Размер БД</span>
            <strong>{formatBytes(dbStats.fileSize)}</strong>
          </div>
        </div>
        <div className="server-card mini">
          <Layers size={20} />
          <div>
            <span className="server-card-label">Таблиц</span>
            <strong>{dbStats.tables.length}</strong>
          </div>
        </div>
        <div className="server-card mini">
          <FileText size={20} />
          <div>
            <span className="server-card-label">Всего записей</span>
            <strong>{formatNumber(totalRows)}</strong>
          </div>
        </div>
      </div>

      <div className="server-card">
        <div className="server-card-head">
          <Database size={18} />
          <h3>Таблицы</h3>
        </div>
        <div className="server-db-table">
          <div className="server-db-header">
            <span>Таблица</span>
            <span>Записей</span>
            <span>Доля</span>
          </div>
          {dbStats.tables.map((table) => {
            const pct = totalRows > 0 ? (table.rows / totalRows) * 100 : 0;
            return (
              <div key={table.name} className="server-db-row">
                <code>{table.name}</code>
                <strong>{formatNumber(table.rows)}</strong>
                <div className="server-db-bar-wrap">
                  <div className="server-db-bar" style={{ width: `${Math.max(pct, 0.5)}%` }} />
                  <span>{pct.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
          {dbStats.tables.length === 0 && <p className="muted" style={{ padding: 16 }}>Не удалось получить данные</p>}
        </div>
      </div>
    </>
  );
}

// === Main Dashboard ===
const TABS: { key: Tab; label: string; icon: typeof Server }[] = [
  { key: "overview", label: "Обзор", icon: Server },
  { key: "requests", label: "Запросы", icon: Globe },
  { key: "logs", label: "Логи", icon: FileText },
  { key: "processes", label: "Процессы", icon: Cpu },
  { key: "database", label: "База данных", icon: Database },
];

export function ServerDashboard({ apiUrl = "/api/admin/server-health" }: { apiUrl?: string } = {}) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(apiUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  return (
    <div className="page server-dashboard">
      <div className="server-dash-header">
        <div>
          <p className="eyebrow">Админ-панель</p>
          <h1>Мониторинг сервера</h1>
          {lastUpdate && (
            <p className="muted">
              Обновлено {lastUpdate.toLocaleTimeString("ru-RU")}
              {autoRefresh && " \u00b7 автообновление 15с"}
            </p>
          )}
        </div>
        <div className="server-dash-controls">
          <label className="server-toggle">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span>Авто</span>
          </label>
          <button className="secondary-button" onClick={fetchData} disabled={loading} type="button">
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Обновить
          </button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="server-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "is-active" : ""}
            onClick={() => setTab(t.key)}
            type="button"
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="server-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {data && (
        <>
          {tab === "overview" && <OverviewTab data={data} />}
          {tab === "requests" && <RequestsTab data={data} />}
          {tab === "logs" && <LogsTab data={data} />}
          {tab === "processes" && <ProcessesTab data={data} />}
          {tab === "database" && <DatabaseTab data={data} />}
        </>
      )}
    </div>
  );
}
