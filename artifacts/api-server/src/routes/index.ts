import { Router, type IRouter } from "express";
import healthRouter from "./health";
import patientsRouter from "./patients";
import complaintCodesRouter from "./complaint-codes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/patients", patientsRouter);
router.use("/complaint-codes", complaintCodesRouter);

export default router;
