import { sql } from "drizzle-orm";
import { check, doublePrecision, integer, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workspaceSettingsTable = pgTable(
  "workspace_settings",
  {
    id: integer("id").primaryKey(),
    lowProfitMarginThreshold: doublePrecision("low_profit_margin_threshold").notNull().default(60),
  },
  (table) => [
    check("workspace_settings_threshold_range", sql`${table.lowProfitMarginThreshold} >= 0 AND ${table.lowProfitMarginThreshold} <= 100`),
  ],
);

export const insertWorkspaceSettingsSchema = createInsertSchema(workspaceSettingsTable);
export type InsertWorkspaceSettings = z.infer<typeof insertWorkspaceSettingsSchema>;
export type WorkspaceSettingsRecord = typeof workspaceSettingsTable.$inferSelect;