import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, workspaceSettingsTable } from "@workspace/db";
import {
  GetWorkspaceSettingsResponse,
  UpdateWorkspaceSettingsBody,
  UpdateWorkspaceSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const SETTINGS_ID = 1;

router.get("/settings", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(workspaceSettingsTable)
    .where(eq(workspaceSettingsTable.id, SETTINGS_ID));
  res.json(GetWorkspaceSettingsResponse.parse({
    lowProfitMarginThreshold: settings?.lowProfitMarginThreshold ?? 60,
  }));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateWorkspaceSettingsBody.safeParse(req.body);
  if (!parsed.success || !Number.isFinite(parsed.data.lowProfitMarginThreshold)) {
    res.status(400).json({ error: "Enter a threshold from 0% to 100%." });
    return;
  }
  const [settings] = await db.insert(workspaceSettingsTable)
    .values({ id: SETTINGS_ID, lowProfitMarginThreshold: parsed.data.lowProfitMarginThreshold })
    .onConflictDoUpdate({
      target: workspaceSettingsTable.id,
      set: { lowProfitMarginThreshold: parsed.data.lowProfitMarginThreshold },
    })
    .returning();
  res.json(UpdateWorkspaceSettingsResponse.parse({
    lowProfitMarginThreshold: settings.lowProfitMarginThreshold,
  }));
});

export default router;