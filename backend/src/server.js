import "./config/loadEnv.js";
import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initWebSocketServer } from "./sockets/index.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const server = http.createServer(app);
  initWebSocketServer(server);

  server.listen(PORT, () => {
    console.log(
      `[server] CoWriteAI API listening on http://localhost:${PORT}`,
    );
    console.log(`[server] WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });

  const shutdown = (signal) => {
    console.log(`[server] Received ${signal}, shutting down...`);
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
