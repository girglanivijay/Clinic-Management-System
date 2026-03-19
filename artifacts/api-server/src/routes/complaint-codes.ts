import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { complaintCodesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(complaintCodesTable).orderBy(complaintCodesTable.code);
    res.json(rows.map(formatCode));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .insert(complaintCodesTable)
      .values({
        code: body.code.toUpperCase(),
        complaint: body.complaint,
        treatment: body.treatment,
      })
      .returning();
    res.status(201).json(formatCode(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db
      .update(complaintCodesTable)
      .set({
        code: body.code.toUpperCase(),
        complaint: body.complaint,
        treatment: body.treatment,
      })
      .where(eq(complaintCodesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatCode(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(complaintCodesTable).where(eq(complaintCodesTable.id, id));
    res.json({ success: true, message: "Complaint code deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatCode(c: typeof complaintCodesTable.$inferSelect) {
  return {
    id: c.id,
    code: c.code,
    complaint: c.complaint,
    treatment: c.treatment,
    createdAt: c.createdAt?.toISOString(),
  };
}

export default router;
