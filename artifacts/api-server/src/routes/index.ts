import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ingredientsRouter from "./ingredients";
import menuRouter from "./menu";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingredientsRouter);
router.use(menuRouter);

export default router;
