import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { jobLookupLimiter } from "../middleware/rateLimit.js";
import { getCompanySuggestions, getJobPosting } from "../controllers/jobsController.js";

const router = Router();

router.use(requireAuth);
router.use(jobLookupLimiter);
router.get("/companies", getCompanySuggestions);
router.get("/find-posting", getJobPosting);

export default router;
