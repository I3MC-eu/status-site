const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const { DateTime } = require("luxon");

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const TOKEN_PATH = "token.json";

function authorize(callback) {
  const credentials = JSON.parse(fs.readFileSync("credentials.json"));
  const { client_secret, client_id, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    callback(oAuth2Client);
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({ access_type: "offline", scope: SCOPES });
    console.log("Authorize this app by visiting this URL:\n", authUrl);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Enter the code from that page here: ", (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error("❌ Error retrieving token", err);
        oAuth2Client.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        console.log("✅ Token saved to", TOKEN_PATH);
        callback(oAuth2Client);
      });
    });
  }
}

function getStatus(auth, callback) {
  const calendar = google.calendar({ version: "v3", auth });
  const now = DateTime.now().setZone("Europe/Vienna");
  const in30 = now.plus({ minutes: 30 });

  calendar.events.list({
    calendarId: "primary",
    timeMin: now.toUTC().toISO(),
    timeMax: in30.toUTC().toISO(),
    singleEvents: true,
    orderBy: "startTime",
  }, (err, res) => {
    if (err) {
      console.error("❌ API error:", err);
      return callback({ status: "Error", title: "API failed", until: null });
    }

    const events = res.data.items || [];
    const event = events.find(ev => {
      const start = DateTime.fromISO(ev.start.dateTime || ev.start.date);
      const end = DateTime.fromISO(ev.end.dateTime || ev.end.date);
      return now >= start && now < end;
    });

    if (!event) return callback({ status: "Free", title: "", until: null });

    const summary = (event.summary || "").toLowerCase();
    const end = DateTime.fromISO(event.end.dateTime || event.end.date).setZone("Europe/Vienna");
    const until = end.toRelative({ base: now, unit: ["minutes", "hours"] });

    if (summary.includes("imp")) {
      return callback({
        status: "Do Not Disturb",
        title: summary.includes("private") ? "" : event.summary,
        until: `ends ${until}`
      });
    }

    if (summary.includes("sleep")) {
      return callback({
        status: "Asleep",
        title: summary.includes("private") ? "" : event.summary,
        until: `ends ${until}`
      });
    }

    if (summary.includes("private")) {
      return callback({ status: "Busy", title: "", until: `ends ${until}` });
    }

    return callback({ status: "Busy", title: event.summary, until: `ends ${until}` });
  });
}

module.exports = { authorize, getStatus };
