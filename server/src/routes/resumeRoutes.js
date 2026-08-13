import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { uploadResumeFiles } from "../middleware/upload.js";
import {
  uploadResume,
  listResumes,
  getResumeFile,
  getResumePreview,
  deleteResume,
} from "../controllers/resumeController.js";

const router = Router();

router.use(requireAuth);
router.post("/", uploadResumeFiles, uploadResume);
router.get("/", listResumes);
router.get("/:id/file", getResumeFile);
router.get("/:id/preview", getResumePreview);
router.delete("/:id", deleteResume);

export default router;
