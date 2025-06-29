const express = require("express");
const path = require("path");
const fs = require("fs");
const basicAuth = require("express-basic-auth");
const { DateTime } = require("luxon");
const { authorize, getStatus } = require("./calendar");

const app = express();
const PORT = process.env.PORT || 3000;

let current = { status: "Loading...", title: "", until: null };
let manualOverride = null;
let clearTimer = null;

// Use JSON body parser
app.use(express.json());

// Serve static public files
app.use(express.static(path.join(__dirname, "public")));

// Admin password from CapRover env var
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

// 🔒 Admin HTTP basic auth
app.use("/admin", basicAuth({
  users: { admin: ADMIN_PASSWORD },
  challenge: true,
  unauthorizedResponse: "Unauthorized"
}));

// Serve protected admin panel HTML
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "protected", "admin.html"));
});

// 📌 Manual status setter
app.post("/admin/set-status", (req, res) => {
  const { status, title, duration } = req.body;

  const until = duration
    ? DateTime.now().plus({ minutes: duration }).setZone("Europe/Vienna").toFormat("HH:mm")
    : null;

  manualOverride = {
    status,
    title: title || "",
    until: until
  };

  if (clearTimer) clearTimeout(clearTimer);
  if (duration && !isNaN(duration)) {
    clearTimer = setTimeout(() => {
      manualOverride = null;
      console.log("🧹 Manual override expired.");
    }, duration * 60 * 1000);
  }

  console.log("✅ Manual status set:", manualOverride);
  res.sendStatus(200);
});

// 🧹 Clear manual override
app.post("/admin/clear-status", (req, res) => {
  manualOverride = null;
  if (clearTimer) clearTimeout(clearTimer);
  console.log("🧹 Manual override cleared.");
  res.sendStatus(200);
});

// 🟢 Status API
app.get("/status", (req, res) => {
  if (manualOverride && manualOverride.status.toLowerCase() !== "free") {
    return res.json(manualOverride);
  }
  res.json(current);
});

// 🔁 Calendar polling
function updateStatus() {
  if (manualOverride && manualOverride.status.toLowerCase() !== "free") {
    return; // manual override active
  }

  authorize(auth => {
    getStatus(auth, result => {
      current = result;
      console.log("🔄 Calendar status updated:", result);
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  updateStatus();
  setInterval(updateStatus, 60 * 1000); // every minute
});
