require("dotenv").config();
const { google } = require("googleapis");
const https = require("https");
const { program } = require("commander");  // npm install commander for CLI flags

/* ---------------- SMART JOB EMAIL DETECTOR ---------------- */
function isJobEmailSmart(subject, from = "") {
  let score = 0;

  const subjectLower = subject.toLowerCase();
  const fromLower = from.toLowerCase();

  // Extract sender domain more robustly
  const domainMatch = fromLower.match(/@([a-z0-9.-]+)/i);
  const senderDomain = domainMatch ? domainMatch[1].toLowerCase() : "";

  // Strong signals: High-priority job progression keywords
  const strongSignals = [
    "interview", "offer letter", "job offer", "employment offer", "shortlisted",
    "selected for", "congratulations on", "hired", "onboarding", "selection process",
    "technical round", "hr round", "final round", "assessment", "coding test",
    "phone screen", "video interview", "zoom interview", "microsoft teams interview"
  ];

  // Medium signals: General job-related terms (expanded for app confirmations)
  const mediumSignals = [
    "job application", "career opportunity", "hiring", "recruiter", "talent acquisition",
    "position", "role", "opening", "vacancy", "join our team", "resume received",
    "application received", "we're hiring",
    "application success", "application submitted", "your application", 
    "application has been", "successfully submitted", "application successful",
    "application", "submitted", "success"
  ];

  // Recruiter / job platform domains (India-focused)
  const recruiterDomains = [
    "linkedin.com", "indeed.com", "naukri.com", "wellfound.com", "greenhouse.io", "lever.co",
    "workable.com", "bamboohr.com", "monster.com", "glassdoor.com", "ziprecruiter.com",
    "dice.com", "careerbuilder.com", "hired.com", "talent.com", "reed.co.uk", "seek.com.au",
    "hirist.tech", "foundit.in", "shine.com", "timesjobs.com", "internshala.com", "apna.co",
    "monsterindia.com"
  ];

  // Negative signals: Common non-job spam
  const negativeSignals = [
    "invoice", "receipt", "order confirmation", "subscription", "newsletter", "promotion",
    "sale", "discount", "free trial", "webinar", "marketing", "update your", "password reset",
    "account verification", "confirm your email", "unsubscribe", "special offer", "limited time"
  ];

  // Helper: Flexible matching (phrases exact, words with boundaries)
  function matchesSignal(text, signal) {
    if (signal.includes(" ")) {
      return text.includes(signal);
    } else {
      return text.includes(signal) || new RegExp(`\\b${signal}\\b`).test(text);
    }
  }

  // Score subject
  strongSignals.forEach(signal => {
    if (matchesSignal(subjectLower, signal)) score += 3;
  });
  mediumSignals.forEach(signal => {
    if (matchesSignal(subjectLower, signal)) score += 2;
  });
  negativeSignals.forEach(signal => {
    if (matchesSignal(subjectLower, signal)) score -= 3;
  });

  // Score sender domain
  const isRecruiterDomain = recruiterDomains.includes(senderDomain);
  if (isRecruiterDomain) {
    score += 4;
  }

  // Penalize no-reply only if not recruiter
  if (!isRecruiterDomain &&
      (fromLower.includes("noreply") || fromLower.includes("no-reply") || fromLower.includes("do-not-reply"))) {
    score -= 2;
  }

  return score >= 4;
}

/* ---------------- GMAIL AUTH ---------------- */
const auth = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);

auth.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
const gmail = google.gmail({ version: "v1", auth });

/* ---------------- FETCH UNREAD EMAILS ---------------- */
async function getUnreadEmails() {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread in:inbox",
    maxResults: 100,
  });
  return res.data.messages || [];
}

/* ---------------- BATCH FETCH EMAIL CONTENTS ---------------- */
async function getEmailContentsBatch(messageIds) {
  if (messageIds.length === 0) return [];

  const accessToken = await auth.getAccessToken();
  const boundary = "batch_" + Date.now();
  const host = "gmail.googleapis.com";
  const batchPath = "/batch/gmail/v1";

  const requests = messageIds.map((msg, index) => ({
    method: "GET",
    path: `/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
    headers: null,
    body: null,
    contentId: `msg${index + 1}`,
  }));

  let body = "";
  requests.forEach((req) => {
    body += `--${boundary}\r\n`;
    body += `Content-Type: application/http\r\n`;
    body += `Content-ID: <${req.contentId}>\r\n\r\n`;
    body += `${req.method} ${req.path} HTTP/1.1\r\n\r\n`;
  });
  body += `--${boundary}--`;

  const options = {
    hostname: host,
    path: batchPath,
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
      "Content-Length": Buffer.byteLength(body),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => (responseBody += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Batch failed: ${res.statusCode}`));
        }

        // Parse multipart response (simplified)
        const parts = responseBody.split(`--${boundary}`);
        const results = [];

        for (let i = 1; i < parts.length - 1; i++) {
          const part = parts[i].trim();
          const [headerSection, bodySection] = part.split("\r\n\r\n", 2);
          if (!bodySection) continue;

          try {
            const jsonBody = JSON.parse(bodySection);
            const contentId = headerSection.match(/Content-ID: <response-(msg\d+)>/)?.[1];
            if (!contentId) continue;

            const originalIndex = parseInt(contentId.replace("msg", "")) - 1;
            const originalId = messageIds[originalIndex].id;

            const headers = jsonBody.payload?.headers || [];
            const subject = headers.find(h => h.name === "Subject")?.value || "";
            const from = headers.find(h => h.name === "From")?.value || "";

            results.push({ id: originalId, subject, from });
          } catch (e) {
            // Skip parse errors
          }
        }
        resolve(results);
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/* ---------------- STAR EMAIL ---------------- */
async function starEmail(messageId) {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds: ["STARRED"] },
  });
}

/* ---------------- MAIN AGENT ---------------- */
async function runEmailStarredAgent(dryRun = false) {
  console.log("🤖 Gmail Job Email Star Agent started");

  const emails = await getUnreadEmails();
  console.log(`📩 Found ${emails.length} unread emails in inbox`);

  if (emails.length === 0) {
    console.log("ℹ️ No unread emails to process.");
    return;
  }

  const contents = await getEmailContentsBatch(emails);
  let starred = 0;

  for (const { id, subject, from } of contents) {
    if (isJobEmailSmart(subject, from)) {
      if (!dryRun) {
        await starEmail(id);
      }
      console.log(`⭐ Starred: "${subject}" from ${from}`);
      starred++;
    }
  }

  console.log(`✅ Finished: ${starred} job emails ${dryRun ? 'would be' : 'were'} starred.`);
}

/* ---------------- CLI SETUP ---------------- */
program
  .option('-d, --dry-run', 'Test without actually starring emails')
  .parse();

const { dryRun } = program.opts();

/* ---------------- RUN ---------------- */
runEmailStarredAgent(dryRun).catch(console.error);