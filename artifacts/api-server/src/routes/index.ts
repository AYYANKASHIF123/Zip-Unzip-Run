import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cancerClassifierRouter from "./cancer-classifier";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cancerClassifierRouter);

export default router;
