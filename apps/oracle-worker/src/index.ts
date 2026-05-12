import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "./lib/types";
import { renderAdminPage } from "./lib/html";
import { getOrInitReport, saveReport } from "./lib/kv";
import { buildReport } from "./lib/report";
import { adminUpdateSchema } from "./lib/types";

type AppEnv = { Bindings: Env };

const app = new Hono<AppEnv>();
const factory = createFactory<AppEnv>();

const SERVICE_NAME = "rwa-oracle-worker";

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: SERVICE_NAME }));

app.get("/admin", async (c) => {
  const report = await getOrInitReport(c.env.RWA_ORACLE_KV);
  return c.html(renderAdminPage(report));
});

app.post(
  "/admin/update",
  zValidator("form", adminUpdateSchema, async (result, c) => {
    if (result.success) return;
    const message = result.error.issues
      .map((issue) => issue.message)
      .join("; ");
    if (
      c.env === undefined ||
      "RWA_ORACLE_KV" in c.env === false ||
      c.env.RWA_ORACLE_KV === null ||
      typeof c.env.RWA_ORACLE_KV !== "object"
    ) {
      return c.html(renderAdminPage(null, `Update failed: ${message}`), 500);
    }
    const report = await getOrInitReport(
      c.env.RWA_ORACLE_KV as Env["RWA_ORACLE_KV"],
    );
    return c.html(renderAdminPage(report, `Update failed: ${message}`), 400);
  }),
  async (c) => {
    try {
      const parsed = c.req.valid("form");
      const report = await buildReport(parsed);

      await saveReport(c.env.RWA_ORACLE_KV, report);
      return c.html(renderAdminPage(report, "Report updated successfully."));
    } catch (error) {
      const report = await getOrInitReport(c.env.RWA_ORACLE_KV);
      const message =
        error instanceof Error
          ? `Update failed: ${error.message}`
          : "Update failed.";
      return c.html(renderAdminPage(report, message));
    }
  },
);

const handleLatestReserve = factory.createHandlers(async (c) => {
  const report = await getOrInitReport(c.env.RWA_ORACLE_KV);
  return c.json(report);
});

app.get("/api/v1/reserve/latest", ...handleLatestReserve);
app.get("/api/reserve/latest", ...handleLatestReserve);

export default app;
