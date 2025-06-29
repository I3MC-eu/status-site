const express = require("express");
const path = require("path");
const fs = require("fs");
const basicAuth = require("express-basic-auth");
const { authorize, getStatus } = require("./calendar");

const app = express();
const PORT = process.env.PORT || 3000;

let current = { status: "Loading...", title: "" };
let manualOverride = null;
let clearTimer = null;

// Use JSON body parser
app.use(express.json());

// Serve static site files
app.use(express.static(path.join(__dirname, "public")));

// Set up admin password from environment variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

// ✅ Admin basic authentication
app.use("/admin", basicAuth({
  users: { "admin": ADMIN_PASSWORD },
  challenge: true,
  unauthorizedResponse: "Unauthorized"
}));

// ✅ Serve protected admin panel HTML
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "protected", "admin.html"));
});

// ✅ Manual override set
app.post("/admin/set-status", (req, res) => {
  const { status, title, duration } = req.body;
  manualOverride = {
    status,
    title: title || ""
  };

  if (clearTimer) clearTimeout(clearTimer);
  if (duration && !isNaN(duration)) {
    clearTimer = setTimeout(() => {
      manualOverride = null;
      console.log("🧹 Manual override expired.");
    }, duration * 60 * 1000); // Convert minutes to ms
  }

  console.log("✅ Manual status set:", manualOverride);
  res.sendStatus(200);
});

// ✅ Manual override clear
app.post("/admin/clear-status", (req, res) => {
  manualOverride = null;
  if (clearTimer) clearTimeout(clearTimer);
  console.log("🧹 Manual override cleared.");
  res.sendStatus(200);
});

// ✅ Status fetch route
app.get("/status", (req, res) => {
  if (manualOverride && manualOverride.status.toLowerCase() !== "free") {
    return res.json(manualOverride);
  }
  res.json(current);
});

// ✅ Calendar status updater
function updateStatus() {
  authorize(auth => {
    getStatus(auth, result => {
      current = result;
      console.log("🔄 Calendar status updated:", result);
    });
  });
}

// Start the app
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  updateStatus();
  setInterval(updateStatus, 60 * 1000); // update every minute
});
