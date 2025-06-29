let override = null;
let overrideUntil = null;
let message = "";

function setOverrideStatus(newStatus, durationMinutes = 0, customMessage = "") {
  if (newStatus === "Free") {
    override = null;
    overrideUntil = null;
    message = "";
    console.log("🟢 Manual override cleared — switching to calendar status");
    return;
  }

  override = newStatus;
  message = customMessage;

  if (durationMinutes > 0) {
    overrideUntil = Date.now() + durationMinutes * 60000;
  } else {
    overrideUntil = null;
  }

  console.log(`🔒 Manual override set to "${override}" for ${durationMinutes}min`);
}

function getOverrideStatus() {
  if (overrideUntil && Date.now() > overrideUntil) {
    override = null;
    overrideUntil = null;
    message = "";
    console.log("🕓 Manual override expired — switching back to calendar");
    return null;
  }

  return override;
}

function getMessage() {
  return message;
}

function getOverrideUntil() {
  return overrideUntil;
}

module.exports = {
  setOverrideStatus,
  getOverrideStatus,
  getMessage,
  getOverrideUntil,
};
