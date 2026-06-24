import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import goalsRouter from "./goals";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(goalsRouter);
router.use(aiRouter);

export default router;
