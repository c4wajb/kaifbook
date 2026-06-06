/**
 * Migrate data from SQLite to PostgreSQL.
 * Usage: DATABASE_URL=<pg_url> SQLITE_PATH=<path> node scripts/migrate-sqlite-to-pg.mjs
 */
import Database from "better-sqlite3";
import pg from "pg";

const sqlitePath = process.env.SQLITE_PATH || "/opt/reserve-kursk/shared/prod.db";
const pgUrl = process.env.DATABASE_URL;

if (!pgUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });
const pool = new pg.Pool({ connectionString: pgUrl });

// Tables in dependency order (parents first)
const TABLES = [
  { sqlite: "User", pg: "User" },
  { sqlite: "Business", pg: "Business" },
  { sqlite: "Customer", pg: "Customer" },
  { sqlite: "Lead", pg: "Lead" },
  { sqlite: "Promo", pg: "Promo" },
  { sqlite: "GeneratedContent", pg: "GeneratedContent" },
  { sqlite: "ReviewReplyTemplate", pg: "ReviewReplyTemplate" },
  { sqlite: "restaurants", pg: "restaurants" },
  { sqlite: "restaurant_working_hours", pg: "restaurant_working_hours" },
  { sqlite: "restaurant_reviews", pg: "restaurant_reviews" },
  { sqlite: "restaurant_staff_access", pg: "restaurant_staff_access" },
  { sqlite: "menu_categories", pg: "menu_categories" },
  { sqlite: "menu_items", pg: "menu_items" },
  { sqlite: "table_types", pg: "table_types" },
  { sqlite: "halls", pg: "halls" },
  { sqlite: "hall_objects", pg: "hall_objects" },
  { sqlite: "restaurant_tables", pg: "restaurant_tables" },
  { sqlite: "reservation_settings", pg: "reservation_settings" },
  { sqlite: "reservation_deposit_settings", pg: "reservation_deposit_settings" },
  { sqlite: "no_show_settings", pg: "no_show_settings" },
  { sqlite: "guests", pg: "guests" },
  { sqlite: "booking_pricing_rules", pg: "booking_pricing_rules" },
  { sqlite: "reservations", pg: "reservations" },
  { sqlite: "reservation_audit_logs", pg: "reservation_audit_logs" },
  { sqlite: "payments", pg: "payments" },
  { sqlite: "notifications", pg: "notifications" },
  { sqlite: "recommendations", pg: "recommendations" },
  { sqlite: "restaurant_leads", pg: "restaurant_leads" },
  { sqlite: "restaurant_page_events", pg: "restaurant_page_events" },
  { sqlite: "waitlist_entries", pg: "waitlist_entries" },
  { sqlite: "phone_login_codes", pg: "phone_login_codes" },
  { sqlite: "verification_sessions", pg: "verification_sessions" },
];

// Known boolean columns
const BOOL_COLS = new Set([
  "isActive", "isClosed", "isAvailable", "isFeatured", "isDepositRequired",
  "isLocked", "isVisible", "isRead", "depositEnabled", "depositRequired",
  "reminderEnabled", "secondReminderEnabled", "requireGuestConfirmation",
  "autoMarkAtRiskEnabled", "autoConfirmEnabled", "allowTableSelection",
  "allowSeatSelection", "reserveWholeTableWhenSeatsSelected",
  "requirePhoneConfirmation", "requireDepositForLargeTables",
  "requireDepositForPeakHours", "requireDepositForHighRiskGuests",
  "paymentRequired", "isPaymentEnabled", "showDepositInfo",
  "contactPhoneMatched",
]);

// Known datetime columns (by naming convention)
const DATE_SUFFIXES = ["At", "Date"];
const DATE_EXACT = new Set([
  "createdAt", "updatedAt", "expiresAt", "confirmedAt", "cancelledAt",
  "completedAt", "paidAt", "refundedAt", "startDate", "endDate",
  "publishedAt", "notifiedAt", "lastReservationAt", "lastVisitAt",
  "guestConfirmedAt", "confirmationRequestedAt", "reminderSentAt",
  "secondReminderSentAt", "markedAtRiskAt", "approvedAt", "rejectedAt",
  "paymentMarkedPaidAt", "codeExpiresAt", "messengerCodeSentAt",
  "messengerCodeConsumedAt", "verifiedAt", "consumedAt", "reservationDate",
  "desiredDate", "birthday",
]);

function isDateColumn(colName) {
  if (DATE_EXACT.has(colName)) return true;
  return DATE_SUFFIXES.some(s => colName.endsWith(s) && colName.length > s.length);
}

function convertValue(val, colName) {
  if (val === null || val === undefined) return null;
  // Booleans: SQLite 0/1 → PostgreSQL true/false
  if (BOOL_COLS.has(colName) && typeof val === "number") {
    return val === 1;
  }
  // Dates: SQLite stores as Unix ms timestamps → ISO string
  if (isDateColumn(colName) && typeof val === "number") {
    // Prisma SQLite stores dates as ms since epoch
    return new Date(val).toISOString();
  }
  return val;
}

async function migrateTable(tableDef) {
  const rows = sqlite.prepare(`SELECT * FROM "${tableDef.sqlite}"`).all();
  if (rows.length === 0) {
    console.log(`  ${tableDef.sqlite}: 0 rows (skip)`);
    return;
  }

  const columns = Object.keys(rows[0]);
  const quotedCols = columns.map(c => `"${c}"`).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const insertSql = `INSERT INTO "${tableDef.pg}" (${quotedCols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let inserted = 0;
    for (const row of rows) {
      const values = columns.map(col => convertValue(row[col], col));
      try {
        await client.query(insertSql, values);
        inserted++;
      } catch (err) {
        console.error(`  ERROR inserting into ${tableDef.pg}:`, err.message);
        console.error(`  Row:`, JSON.stringify(row).slice(0, 200));
      }
    }
    await client.query("COMMIT");
    console.log(`  ${tableDef.sqlite}: ${inserted}/${rows.length} rows`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`  ROLLBACK ${tableDef.sqlite}:`, err.message);
  } finally {
    client.release();
  }
}

async function main() {
  console.log("Migrating SQLite → PostgreSQL...");
  console.log(`  SQLite: ${sqlitePath}`);
  console.log(`  PostgreSQL: ${pgUrl.replace(/:[^@]+@/, ":***@")}\n`);

  for (const table of TABLES) {
    await migrateTable(table);
  }

  console.log("\nDone!");
  sqlite.close();
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
