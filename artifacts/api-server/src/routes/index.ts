import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ingredientsRouter from "./ingredients";
import menuRouter from "./menu";
import settingsRouter from "./settings";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingredientsRouter);
router.use(menuRouter);
router.use(settingsRouter);
router.use(historyRouter);

export default router;
