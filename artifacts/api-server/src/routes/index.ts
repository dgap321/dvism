import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import itemsRouter from "./items";
import kitsRouter from "./kits";
import inventoryRouter from "./inventory";
import exportRouter from "./export";
import exportStudioRouter from "./export-studio";
import authRouter from "./auth";
import adminRouter from "./admin";
import formationsRouter from "./formations";
import resetDbRouter from "./reset-db";
import importCsvRouter from "./import-csv";
import photoMapRouter from "./photo-map";

const router: IRouter = Router();

router.use(authRouter);

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "unauthenticated", message: "Login required." });
    return;
  }
  next();
}

router.use(healthRouter);
router.use(requireAuth);
router.use(itemsRouter);
router.use(kitsRouter);
router.use(inventoryRouter);
router.use(exportRouter);
router.use(exportStudioRouter);
router.use(adminRouter);
router.use(formationsRouter);
router.use(resetDbRouter);
router.use(importCsvRouter);
router.use(photoMapRouter);

export default router;
