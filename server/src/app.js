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

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

function getAllowedOrigins() {
  const configuredOrigins =
    process.env.CLIENT_ORIGIN || "http://localhost:5173";

  return configuredOrigins
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function createApp() {
  const app = express();

  const allowedOrigins = getAllowedOrigins();

  // SECURITY
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  app.use(compression());

  // CORS
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without Origin:
        // curl, Postman, server-to-server, health checks, etc.
        if (!origin) {
          return callback(null, true);
        }

        const normalizedOrigin = origin.trim().replace(/\/+$/, "");

        if (allowedOrigins.includes(normalizedOrigin)) {
          return callback(null, true);
        }

        // Do not throw an application error here.
        // Simply deny the CORS request.
        return callback(null, false);
      },

      credentials: true,

      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    }),
  );

  //BODY PARSING
  app.use(
    express.json({
      limit: "1mb",
    }),
  );
  app.use(cookieParser());

  //DATABASE INPUT SANITIZATION
  app.use(mongoSanitize());

  // RATE LIMITING
  app.use("/api", globalLimiter);

  // HEALTH CHECK
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: "ok",
        environment: process.env.NODE_ENV || "development",
        time: new Date().toISOString(),
      },
    });
  });

  // API ROUTES
  app.use("/api/auth", authRoutes);
  app.use("/api/resumes", resumeRoutes);
  app.use("/api/analyses", analysisRoutes);
  app.use("/api/jobs", jobsRoutes);

  // ERROR HANDLING
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
