import { Router, type IRouter } from "express";
import healthRouter from "./health";
import patientsRouter from "./patients";
import complaintCodesRouter from "./complaint-codes";
import sheetsRouter from "./sheets";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/patients", patientsRouter);
router.use("/complaint-codes", complaintCodesRouter);
router.use("/sheets", sheetsRouter);

export default router;
