import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate, analyzeSchema, improveBulletSchema } from "../middleware/validate.js";
import {
  createAnalysis,
  listAnalyses,
  getAnalysis,
  deleteAnalysis,
  improveBullet,
} from "../controllers/analysisController.js";

const router = Router();

router.use(requireAuth);
router.post("/", aiLimiter, validate(analyzeSchema), createAnalysis);
router.get("/", listAnalyses);
router.get("/:id", getAnalysis);
router.delete("/:id", deleteAnalysis);
router.post("/improve-bullet", aiLimiter, validate(improveBulletSchema), improveBullet);

export default router;
