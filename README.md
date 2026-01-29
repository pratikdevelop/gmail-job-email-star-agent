
# Gmail Job Email Star Agent

Automatically detects and **stars** important job-related emails in your Gmail inbox — application confirmations, interview invites, offer letters, and more — especially from popular Indian job portals like **Hirist**, **Naukri**, **Foundit**, **Internshala**, **LinkedIn**, and others.

Built with **Node.js** + **Google Gmail API**  
Perfect for job seekers who receive dozens of application updates and don't want to miss critical messages.

![Demo screenshot placeholder](https://via.placeholder.com/800x400?text=Console+Output+Example)  
*(Add a real screenshot later if you want — console showing starred emails)*

## ✨ Features

- Smart scoring system (keywords + sender domains)
- India-focused detection (Hirist.tech, Naukri.com, etc.)
- Batch processing of up to 100 unread inbox emails
- Dry-run mode (`--dry-run`) — test without modifying anything
- Easy one-time OAuth setup using a simple local server
- Runs completely locally — no data leaves your computer
- MIT licensed — free to use, modify, fork

## 📋 Requirements

- Node.js ≥ 18
- A Google account (Gmail)
- A Google Cloud project with Gmail API enabled

## 🚀 Quick Setup (10–15 minutes)

### Step 1: Enable Gmail API & Create OAuth Credentials

1. Go to https://console.cloud.google.com
2. Create/select a project
3. **APIs & Services** → **Library** → Search **Gmail API** → **Enable**
4. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: e.g. "Gmail Job Star Agent"
   - **Authorized redirect URIs**:  
     `http://localhost:3000/oauth2callback`
   - Create → Download / copy **Client ID** and **Client Secret**

### Step 2: Set up OAuth Consent Screen (required even for personal use)

1. **APIs & Services** → **OAuth consent screen**
2. User Type: **External**
3. Fill required fields (App name, your email, etc.)
4. **Scopes** → Add or remove scopes → Manually add:  
   `https://www.googleapis.com/auth/gmail.modify`
5. **Test users** → Add your own Gmail address
6. Save and continue

### Step 3: Clone & Install

```bash
git clone https://github.com/pratikdevelop/gmail-job-email-star-agent.git
cd gmail-job-email-star-agent
npm install
```

### Step 4: Create `.env` file

Create a file named `.env` in the root folder:

```env
CLIENT_ID=your-client-id.apps.googleusercontent.com
CLIENT_SECRET=your-client-secret
# REFRESH_TOKEN=     ← you'll fill this in Step 5
```

### Step 5: Get your Refresh Token (one-time only)

Run the helper script:

```bash
node app.js
```

1. Open your browser and go to:  
   http://localhost:3000/auth
2. Sign in with your Google account
3. Allow the requested permissions
4. After redirect → look at your terminal/console. You should see something like:

   ```
   TOKENS: {
     access_token: '...',
     refresh_token: '1//04long-string-here...',
     ...
   }
   ```

5. Copy the **refresh_token** value
6. Paste it into your `.env` file:

   ```env
   REFRESH_TOKEN=1//04your-refresh-token-here...
   ```

7. You can now stop the server (Ctrl+C)

### Step 6: Run the agent!

Test mode (no emails will be starred):

```bash
node index.js --dry-run
```

Live mode (actually stars job emails):

```bash
node index.js
```

## 🛠️ Customization

You can easily modify these parts in `index.js`:

- Add more job platforms → edit `recruiterDomains` array
- Change scoring logic → adjust points in `isJobEmailSmart()`
- Change threshold (currently ≥ 4)
- Replace starring with adding a custom label (change `addLabelIds: ["STARRED"]`)

## ⚙️ Available Commands

```bash
node index.js               # Normal run (stars emails)
node index.js --dry-run     # Simulate without making changes
```

## 🔧 Troubleshooting

- **"Invalid Grant" / token expired** → re-run `node app.js` and get fresh tokens
- **No emails processed** → make sure you have unread emails in **Primary** inbox
- **Quota exceeded** → rare for personal use — wait a few minutes or reduce `maxResults`
- **Redirect URI mismatch** → double-check the URI is exactly `http://localhost:3000/oauth2callback`

## 📄 License

[MIT License](LICENSE) — feel free to use, modify, and distribute.

## ❤️ Acknowledgments & Contribute

Built by [Pratik](https://github.com/pratikdevelop) from Indore, India 🇮🇳  
Inspired by the daily struggle of managing job application emails.

Found it helpful?  
→ **Star** the repo  
→ Share with friends/job seekers  
→ Open issues / submit PRs for improvements

Happy job hunting! 🚀
