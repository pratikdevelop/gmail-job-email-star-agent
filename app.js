require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");

const app = express();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "http://localhost:3000/oauth2callback"
);

// Step 1: Ask for user consent
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // IMPORTANT (for refresh token)
    scope: ["https://www.googleapis.com/auth/gmail.modify"],
    prompt: "consent"
  });
  res.redirect(url);
});

// Step 2: Handle callback
app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);

  console.log("TOKENS:", tokens); // SAVE THESE
  res.send("✅ Gmail connected successfully. You can close this.");
});

app.listen(3000, () =>
  console.log("Server running → http://localhost:3000/auth")
);
