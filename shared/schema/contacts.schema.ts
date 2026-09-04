import { sql } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users.schema";

export const contactStatusEnum = pgEnum("contact_status", [
  "unread",
  "read",
  "archived",
]);

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    message: text("message").notNull(),
    status: contactStatusEnum("status").notNull().default("unread"),
    adminNotes: text("admin_notes"),
    resolvedByAdminId: integer("resolved_by_admin_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    statusIdx: index("contacts_status_idx").on(table.status),
    createdAtIdx: index("contacts_created_at_idx").on(table.createdAt),
  }),
);

export const insertContactSchema = createInsertSchema(contacts);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
