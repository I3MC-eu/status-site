const express = require("express");
const path = require("path");
const basicAuth = require("express-basic-auth");
const { authorize, getStatus } = require("./calendar");

const app = express();
const PORT = process.env.PORT || 3000;

let current = { status: "Loading...", title: "" };
let override = null;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Protect /admin route
app.get("/admin", basicAuth({
  users: { "admin": "LgLm" }, // 👈 change to a strong password
  challenge: true
}), (req, res) => {
  res.sendFile(path.join(__dirname, "protected", "admin.html"));
});

// Handle manual status set
app.post("/admin/set-status", (req, res) => {
  const { status, title, duration } = req.body;
  if (!status) return res.status(400).send("Missing status");

  override = { status, title: title || "", expires: null };

  if (duration) {
    const expiresAt = Date.now() + duration * 60000;
    override.expires = expiresAt;
    setTimeout(() => {
      if (override && override.expires === expiresAt) {
        override = null;
        console.log("⏱️ Manual override cleared by timer");
      }
    }, duration * 60000);
  }

  console.log("📝 Manual override set:", override);
  res.sendStatus(200);
});

// Handle override clear
app.post("/admin/clear-status", (req, res) => {
  override = null;
  console.log("🧹 Manual override cleared manually");
  res.sendStatus(200);
});

// Status API
app.get("/status", (req, res) => {
  res.json(override || current);
});

function updateStatus() {
  if (override && override.status.toLowerCase() !== "free") {
    return;
  }

  authorize(auth => {
    getStatus(auth, result => {
      current = result;
      console.log("🔄 Updated status:", result);
    });
  });
}

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  updateStatus();
  setInterval(updateStatus, 60 * 1000); // every 60s
});
