import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(UPLOAD_ROOT, String(req.user._id));
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const safeBase = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.fieldname === "preview" ? EXT_BY_MIME[file.mimetype] || ".jpg" : ".pdf";
    cb(null, `${safeBase}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (file.fieldname === "resume" && file.mimetype === "application/pdf") return cb(null, true);
  if (file.fieldname === "preview" && file.mimetype.startsWith("image/")) return cb(null, true);
  cb(new Error(`Unsupported file for field "${file.fieldname}"`));
}

const maxSizeBytes = (Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024;

// Accepts two fields in one multipart request: the PDF ("resume") and a
// client-rendered preview PNG ("preview", optional - the frontend still
// renders the first page to an image client-side via pdf.js, since that's
// a display concern, not a sensitive operation).
export const uploadResumeFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeBytes },
}).fields([
  { name: "resume", maxCount: 1 },
  { name: "preview", maxCount: 1 },
]);
