import { Router, type IRouter } from "express";
import healthRouter from "./health";
import itemsRouter from "./items";
import kitsRouter from "./kits";
import inventoryRouter from "./inventory";
import exportRouter from "./export";

const router: IRouter = Router();

router.use(healthRouter);
router.use(itemsRouter);
router.use(kitsRouter);
router.use(inventoryRouter);
router.use(exportRouter);

export default router;
