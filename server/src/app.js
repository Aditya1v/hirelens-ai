import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import jobsRoutes from "./routes/jobsRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

function getAllowedOrigins() {
  const origins = process.env.CLIENT_ORIGIN || "http://localhost:5173";

  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp() {
  const app = express();

  const allowedOrigins = getAllowedOrigins();

  app.use(helmet());
  app.use(compression());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no Origin header
        // (health checks, server-to-server requests, etc.)
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(
          new Error(`CORS blocked origin: ${origin}`)
        );
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use(mongoSanitize());

  app.use("/api", globalLimiter);

  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      data: {
        status: "ok",
        time: new Date().toISOString(),
      },
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/resumes", resumeRoutes);
  app.use("/api/analyses", analysisRoutes);
  app.use("/api/jobs", jobsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}