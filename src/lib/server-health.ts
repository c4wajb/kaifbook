import { exec } from "child_process";
import { promisify } from "util";

const run = promisify(exec);

async function sh(cmd: string): Promise<string> {
  try {
    const { stdout } = await run(cmd, { timeout: 8000 });
    return stdout.trim();
  } catch {
    return "";
  }
}

function parseNginxLogLine(line: string) {
  const m = line.match(
    /^(\S+) \S+ \S+ \[([^\]]+)] "(\S+) (\S+) [^"]*" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"/,
  );
  if (!m) return null;
  return {
    ip: m[1],
    time: m[2],
    method: m[3],
    path: m[4],
    status: parseInt(m[5]),
    size: m[6] === "-" ? 0 : parseInt(m[6]),
    referer: m[7] === "-" ? "" : m[7],
    ua: m[8],
  };
}

export async function getServerHealth() {
  const [
    uptimeRaw, loadRaw, memRaw, diskRaw, cpuCount, nodeVersion,
    nextPid, nginxStatus, healthLog, connCount, reqCount,
    nginxAccessRaw, nginxErrorRaw, topProcsRaw, diskBreakdownRaw,
  ] = await Promise.all([
    sh("cat /proc/uptime"),
    sh("cat /proc/loadavg"),
    sh("free -b"),
    sh("df -B1 /"),
    sh("nproc"),
    sh("node -v"),
    sh("pgrep -f 'next-server' | head -1"),
    sh("systemctl is-active nginx"),
    sh("tail -20 /var/log/kaifbook-health.log 2>/dev/null"),
    sh("ss -s"),
    sh("wc -l < /var/log/nginx/access.log 2>/dev/null"),
    sh("tail -200 /var/log/nginx/access.log 2>/dev/null"),
    sh("tail -30 /var/log/nginx/error.log 2>/dev/null"),
    sh("ps aux --sort=-%mem | head -11"),
    sh("du -sb /opt/reserve-kursk/current/public/uploads /opt/reserve-kursk/current/.next /var/log/nginx /var/log 2>/dev/null | sort -rn"),
  ]);

  // Uptime
  const uptimeSec = Math.floor(parseFloat(uptimeRaw.split(" ")[0] || "0"));

  // Load average
  const loadParts = loadRaw.split(" ");
  const load = { "1m": parseFloat(loadParts[0]) || 0, "5m": parseFloat(loadParts[1]) || 0, "15m": parseFloat(loadParts[2]) || 0 };

  // Memory
  const memLines = memRaw.split("\n");
  const memParts = memLines[1]?.split(/\s+/) || [];
  const totalMem = parseInt(memParts[1]) || 0;
  const usedMem = parseInt(memParts[2]) || 0;
  const swapParts = memLines[2]?.split(/\s+/) || [];
  const totalSwap = parseInt(swapParts[1]) || 0;
  const usedSwap = parseInt(swapParts[2]) || 0;

  // Disk
  const diskLines = diskRaw.split("\n");
  const diskParts = diskLines[1]?.split(/\s+/) || [];
  const totalDisk = parseInt(diskParts[1]) || 0;
  const usedDisk = parseInt(diskParts[2]) || 0;

  // CPU cores
  const cores = parseInt(cpuCount) || 1;

  // Next.js process memory
  let appMemMb = 0;
  if (nextPid) {
    const rss = await sh(`cat /proc/${nextPid}/status 2>/dev/null | grep VmRSS | awk '{print $2}'`);
    appMemMb = Math.round((parseInt(rss) || 0) / 1024);
  }

  // App status
  const appStatus = await sh("systemctl is-active reserve-kursk");
  const appUptime = await sh("systemctl show reserve-kursk --property=ActiveEnterTimestamp --value");

  // Connections
  const tcpLine = connCount.split("\n").find((l) => l.startsWith("TCP:")) || "";
  const estabMatch = tcpLine.match(/estab\s+(\d+)/);
  const tcpEstab = parseInt(estabMatch?.[1] || "0");

  // Health check history
  const healthEntries = healthLog
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const match = line.match(/^(\S+)\s+(WARN|ACTION|RESULT):\s+(.+)$/);
      if (!match) return null;
      return { time: match[1], level: match[2], message: match[3] };
    })
    .filter(Boolean);

  // Nginx access log parsing
  const accessLines = nginxAccessRaw.split("\n").filter((l) => l.trim());
  const parsedLogs = accessLines.map(parseNginxLogLine).filter(Boolean).reverse();
  const recentLogs = parsedLogs.slice(0, 50);

  // Request statistics
  const statusCounts: Record<string, number> = {};
  const pathCounts: Record<string, number> = {};
  let totalSize = 0;

  for (const entry of parsedLogs) {
    if (!entry) continue;
    const group = `${Math.floor(entry.status / 100)}xx`;
    statusCounts[group] = (statusCounts[group] || 0) + 1;
    const normalizedPath = entry.path
      .replace(/\/[a-f0-9-]{36}/g, "/:id")
      .replace(/\/\d+/g, "/:id")
      .split("?")[0];
    pathCounts[normalizedPath] = (pathCounts[normalizedPath] || 0) + 1;
    totalSize += entry.size;
  }

  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, count]) => ({ path, count }));

  const todayLogCount = await sh(`grep -c "$(date +'%d/%b/%Y')" /var/log/nginx/access.log 2>/dev/null`);
  const lastHourLogCount = await sh(
    `awk -v d="$(date -d '1 hour ago' +'%d/%b/%Y:%H')" '$0 ~ d' /var/log/nginx/access.log 2>/dev/null | wc -l`,
  );

  const requestStats = {
    total: parseInt(reqCount) || 0,
    today: parseInt(todayLogCount) || 0,
    lastHour: parseInt(lastHourLogCount) || 0,
    last200: parsedLogs.length,
    statusCodes: statusCounts,
    topPaths,
    totalBandwidth: totalSize,
  };

  // Nginx error log
  const nginxErrors = nginxErrorRaw
    .split("\n")
    .filter((l) => l.trim())
    .reverse()
    .slice(0, 20)
    .map((line) => {
      const m = line.match(/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.+)/);
      if (m) return { time: m[1], level: m[2], message: m[3].slice(0, 300) };
      return { time: "", level: "info", message: line.slice(0, 300) };
    });

  // Top processes
  const procLines = topProcsRaw.split("\n").slice(1);
  const topProcesses = procLines
    .filter((l) => l.trim())
    .slice(0, 10)
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        user: parts[0],
        pid: parts[1],
        cpu: parseFloat(parts[2]) || 0,
        mem: parseFloat(parts[3]) || 0,
        rss: parseInt(parts[5]) || 0,
        command: parts.slice(10).join(" ").slice(0, 120),
      };
    });

  // Disk breakdown
  const diskBreakdown = diskBreakdownRaw
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const parts = line.trim().split(/\t/);
      const bytes = parseInt(parts[0]) || 0;
      const fullPath = parts[1] || "";
      let label = fullPath;
      if (fullPath.includes("/uploads")) label = "Загрузки (uploads)";
      else if (fullPath.includes("/.next")) label = "Next.js build (.next)";
      else if (fullPath.includes("postgresql")) label = "База данных (PostgreSQL)";
      else if (fullPath === "/var/log/nginx") label = "Логи Nginx";
      else if (fullPath === "/var/log") label = "Все логи (/var/log)";
      return { path: fullPath, bytes, label };
    });

  // Database stats (PostgreSQL)
  let dbStats = { fileSize: 0, tables: [] as Array<{ name: string; rows: number }> };
  try {
    const dbSizeRaw = await sh(`sudo -u postgres psql -t -A -c "SELECT pg_database_size('kaifbook');" 2>/dev/null`);
    dbStats.fileSize = parseInt(dbSizeRaw) || 0;
    const tablesRaw = await sh(
      `sudo -u postgres psql -t -A kaifbook -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT LIKE '_prisma%' ORDER BY table_name;" 2>/dev/null`,
    );
    const tableNames = tablesRaw.split("\n").filter((t) => t.trim());
    if (tableNames.length > 0) {
      const countQueries = tableNames.map((t) => `SELECT '${t}' AS t, COUNT(*) AS c FROM "${t}"`).join(" UNION ALL ");
      const countsRaw = await sh(`sudo -u postgres psql -t -A kaifbook -c "${countQueries};" 2>/dev/null`);
      dbStats.tables = countsRaw
        .split("\n")
        .filter((l) => l.trim())
        .map((line) => {
          const [name, count] = line.split("|");
          return { name, rows: parseInt(count) || 0 };
        })
        .sort((a, b) => b.rows - a.rows);
    }
  } catch {
    // ignore
  }

  return {
    timestamp: new Date().toISOString(),
    uptime: uptimeSec,
    cpu: { cores, load },
    memory: {
      total: totalMem,
      used: usedMem,
      percent: totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0,
      swap: { total: totalSwap, used: usedSwap },
    },
    disk: {
      total: totalDisk,
      used: usedDisk,
      percent: totalDisk > 0 ? Math.round((usedDisk / totalDisk) * 100) : 0,
      breakdown: diskBreakdown,
    },
    app: {
      status: appStatus,
      memoryMb: appMemMb,
      startedAt: appUptime,
      nodeVersion,
    },
    nginx: { status: nginxStatus },
    network: { tcpEstablished: tcpEstab, totalRequests: parseInt(reqCount) || 0 },
    healthLog: healthEntries,
    requestStats,
    recentLogs,
    nginxErrors,
    topProcesses,
    dbStats,
  };
}
