import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ingredientsRouter from "./ingredients";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingredientsRouter);

export default router;
