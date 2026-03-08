import { sql } from "drizzle-orm";
import { date, index, integer, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const profileDailyStats = pgTable(
  "profile_daily_stats",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userDayPk: primaryKey({ columns: [table.userId, table.day] }),
    userDayIndex: index("profile_daily_stats_user_day_idx").on(
      table.userId,
      table.day,
    ),
  }),
);

export type ProfileDailyStat = typeof profileDailyStats.$inferSelect;
