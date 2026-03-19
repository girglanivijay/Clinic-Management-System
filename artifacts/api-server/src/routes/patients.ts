import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { patientsTable } from "@workspace/db/schema";
import { eq, ilike, or, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { date, search } = req.query as { date?: string; search?: string };
    let query = db.select().from(patientsTable);

    if (date) {
      const rows = await db
        .select()
        .from(patientsTable)
        .where(eq(patientsTable.visitDate, date))
        .orderBy(desc(patientsTable.createdAt));
      res.json(rows.map(formatPatient));
      return;
    }

    if (search) {
      const rows = await db
        .select()
        .from(patientsTable)
        .where(
          or(
            ilike(patientsTable.name, `%${search}%`),
            ilike(patientsTable.mobile, `%${search}%`)
          )
        )
        .orderBy(desc(patientsTable.createdAt));
      res.json(rows.map(formatPatient));
      return;
    }

    const rows = await db
      .select()
      .from(patientsTable)
      .orderBy(desc(patientsTable.createdAt))
      .limit(100);
    res.json(rows.map(formatPatient));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const visitDate = body.visitDate || new Date().toISOString().split("T")[0];
    const [row] = await db
      .insert(patientsTable)
      .values({
        name: body.name,
        age: body.age,
        address: body.address,
        mobile: body.mobile,
        complaintCode: body.complaintCode || null,
        complaint: body.complaint || null,
        treatment: body.treatment || null,
        advice: body.advice || null,
        reports: body.reports || null,
        fees: body.fees?.toString() || "0",
        visitDate,
      })
      .returning();
    res.status(201).json(formatPatient(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/daily", async (req, res) => {
  try {
    const { date } = req.query as { date?: string };
    const targetDate = date || new Date().toISOString().split("T")[0];
    const patients = await db
      .select()
      .from(patientsTable)
      .where(eq(patientsTable.visitDate, targetDate))
      .orderBy(patientsTable.createdAt);

    const totalFees = patients.reduce((sum, p) => sum + parseFloat(p.fees || "0"), 0);

    res.json({
      date: targetDate,
      totalPatients: patients.length,
      totalFees,
      patients: patients.map(formatPatient),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lookup/mobile/:mobile", async (req, res) => {
  try {
    const { mobile } = req.params;
    const rows = await db
      .select()
      .from(patientsTable)
      .where(ilike(patientsTable.mobile, `%${mobile}%`))
      .orderBy(desc(patientsTable.createdAt));

    const latest = rows[0];
    const latestInfo = latest
      ? { name: latest.name, age: latest.age, address: latest.address, mobile: latest.mobile }
      : undefined;

    res.json({ latestInfo, history: rows.map(formatPatient) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lookup/name/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const rows = await db
      .select()
      .from(patientsTable)
      .where(ilike(patientsTable.name, `%${name}%`))
      .orderBy(desc(patientsTable.createdAt));

    const latest = rows[0];
    const latestInfo = latest
      ? { name: latest.name, age: latest.age, address: latest.address, mobile: latest.mobile }
      : undefined;

    res.json({ latestInfo, history: rows.map(formatPatient) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(patientsTable).where(eq(patientsTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatPatient(row));
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
      .update(patientsTable)
      .set({
        name: body.name,
        age: body.age,
        address: body.address,
        mobile: body.mobile,
        complaintCode: body.complaintCode || null,
        complaint: body.complaint || null,
        treatment: body.treatment || null,
        advice: body.advice || null,
        reports: body.reports || null,
        fees: body.fees?.toString() || "0",
        visitDate: body.visitDate,
      })
      .where(eq(patientsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatPatient(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(patientsTable).where(eq(patientsTable.id, id));
    res.json({ success: true, message: "Patient deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatPatient(p: typeof patientsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    address: p.address,
    mobile: p.mobile,
    complaintCode: p.complaintCode,
    complaint: p.complaint,
    treatment: p.treatment,
    advice: p.advice,
    reports: p.reports,
    fees: parseFloat(p.fees || "0"),
    visitDate: p.visitDate,
    createdAt: p.createdAt?.toISOString(),
  };
}

export default router;
