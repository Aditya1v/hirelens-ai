import mongoose from "mongoose";

/**
 * connectDB
 * Opens a single shared Mongoose connection using MONGODB_URI.
 * Fails loudly on startup rather than letting the app run against a dead DB,
 * since every route in this app depends on persistence.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and configure it.");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  console.log(`[db] connected -> ${mongoose.connection.name}`);

  mongoose.connection.on("error", (err) => {
    console.error("[db] connection error:", err.message);
  });

  return mongoose.connection;
}
