const express = require("express");
const http = require("http");
const cors = require("cors");
const axios = require("axios");
const cron = require("node-cron");
const socketIo = require("socket.io");
require("dotenv").config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

/* ---------------- API BASE ---------------- */
const API_BASE = `${process.env.SPORTS_API_URL}/${process.env.SPORTS_API_KEY}`;

/* ---------------- CONNECT CLIENTS ---------------- */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("message", "Connected to World Cup MCP Live Server");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

/* ---------------- FETCH LIVE MATCHES ---------------- */
async function fetchLiveMatches() {
  try {
    const res = await axios.get(`${API_BASE}/livescore.php?l=World Cup`);

    if (!res.data || !res.data.events) return [];

    return res.data.events.map((m) => ({
      id: m.idEvent,
      homeTeam: m.strHomeTeam,
      awayTeam: m.strAwayTeam,
      homeScore: m.intHomeScore,
      awayScore: m.intAwayScore,
      status: m.strStatus,
      minute: m.strProgress,
    }));
  } catch (err) {
    console.log("API error:", err.message);
    return [];
  }
}

/* ---------------- BROADCAST UPDATES ---------------- */
async function broadcastUpdates() {
  const matches = await fetchLiveMatches();

  io.emit("live-matches-update", matches);

  console.log("Broadcasted:", matches.length, "matches");
}

/* ---------------- AUTO UPDATE EVERY 15 SECONDS ---------------- */
cron.schedule("*/15 * * * * *", async () => {
  await broadcastUpdates();
});

/* ---------------- MANUAL TEST ENDPOINT ---------------- */
app.get("/refresh", async (req, res) => {
  await broadcastUpdates();
  res.json({ success: true });
});

/* ---------------- BASIC STATUS ROUTE ---------------- */
app.get("/", (req, res) => {
  res.send("World Cup MCP Server is running");
});

/* ---------------- START SERVER ---------------- */
server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
