const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const path    = require("path");
require("dotenv").config();

const { initDB } = require("./db/database");
const classifyRouter  = require("./routes/classify");
const searchRouter    = require("./routes/search");
const dialogRouter    = require("./routes/dialog");
const generateRouter  = require("./routes/generate");
const ticketsRouter   = require("./routes/tickets");
const analyticsRouter = require("./routes/analytics");
const operatorsRouter = require("./routes/operators");
const authRouter      = require("./routes/auth");
const messagesRouter  = require("./routes/messages");

const app  = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({   contentSecurityPolicy: {     directives: {       defaultSrc: ["'self'"],       scriptSrc: ["'self'", "https://accounts.google.com", "https://*.googleusercontent.com", "'unsafe-inline'"],       frameSrc: ["'self'", "https://accounts.google.com", "https://*.google.com"],       connectSrc: ["'self'", "https://accounts.google.com", "https://*.googleapis.com"],       imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],       styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],     }   } }));
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/classify-ticket", classifyRouter);
app.use("/api/search",          searchRouter);
app.use("/api/dialog",          dialogRouter);
app.use("/api/generate-answer", generateRouter);
app.use("/api/tickets",         ticketsRouter);
app.use("/api/analytics",       analyticsRouter);
app.use("/api/operators",       operatorsRouter);
app.use("/api/auth",            authRouter);
app.use("/api/messages",        messagesRouter);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_, res) =>
  res.json({ status: "ok", ts: new Date().toISOString() })
);

// ─── Serve Frontend in production ─────────────────────────────────────────────
const FRONTEND_DIST = path.join(__dirname, "../frontend/dist");
if (isProd) {
  app.use(express.static(FRONTEND_DIST));
  app.get("*", (req, res) =>
    res.sendFile(path.join(FRONTEND_DIST, "index.html"))
  );
}

// ─── Start ────────────────────────────────────────────────────────────────────
(async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`✅  Backend listening on http://localhost:${PORT}`);
    if (isProd) console.log(`🌐  Serving frontend from ${FRONTEND_DIST}`);
    else        console.log(`📡  Dev mode — run "npm run dev:frontend" for React`);
  });
})();
