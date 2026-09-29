import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ingredientsRouter from "./ingredients";
import menuRouter from "./menu";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingredientsRouter);
router.use(menuRouter);
router.use(settingsRouter);

export default router;
