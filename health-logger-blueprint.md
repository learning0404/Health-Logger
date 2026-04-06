# Daily Health Logger — Project Blueprint

> **What this is:** A single-page Progressive Web App (PWA) you bookmark on your phone's home screen. Morning and evening prompts with voice input. Writes to Notion. Generates Bevel tag suggestions. No backend, no database, no subscription.

---

## 1. Architecture Overview

```
┌─────────────────────────────────┐
│  Your Phone (PWA in browser)    │
│  ┌───────────────────────────┐  │
│  │  index.html               │  │
│  │  - Web Speech API (voice) │  │
│  │  - Morning/Evening mode   │  │
│  │  - Bevel tag generator    │  │
│  └───────────┬───────────────┘  │
└──────────────┼──────────────────┘
               │ HTTPS POST
               ▼
    ┌──────────────────┐
    │  Notion API      │
    │  (Direct, no     │
    │   middleware)     │
    └──────────────────┘
               │
               ▼
    ┌──────────────────┐
    │  Notion Database  │
    │  "Health Log"     │
    │  (structured      │
    │   daily entries)  │
    └──────────────────┘
```

**Stack:**
- Frontend: Vanilla HTML + CSS + JS (single file, no framework)
- Voice: Web Speech API (built into Chrome/Safari)
- Storage: Notion API (direct from browser — no server needed for Notion's API with an integration token)
- Hosting: Vercel (free tier, static deploy)
- PWA: manifest.json + service worker for home screen install

**Important:** The Notion API token will be embedded in the client-side JS. This is acceptable here because:
- The app is only for you (not public)
- The token only has access to one database
- You can rotate it anytime
- For a future multi-user version, you'd add a serverless function as a proxy

---

## 2. Notion Database Schema

Create a new database in Notion called **"Health Log"**

### Properties:

| Property Name     | Type          | Purpose                                      |
|-------------------|---------------|-----------------------------------------------|
| Date              | Date          | Auto-filled, one entry per day                |
| Entry Type        | Select        | "Morning" or "Evening"                        |
| Sleep Quality     | Number (1-10) | Subjective morning rating                     |
| Energy Level      | Number (1-10) | How you feel right now                        |
| Stress Level      | Number (1-10) | Current perceived stress                      |
| Study Hours       | Number        | Hours studied today (evening)                 |
| Screen Time       | Number        | Total hours non-productive screen (evening)   |
| Social Media Hrs  | Number        | Instagram/TikTok/YouTube hours (evening)      |
| Sport Type        | Multi-select  | Volleyball, Gymnastics, Padel, Gym, Run, Walk |
| Sport Duration    | Number        | Minutes of sport today (evening)              |
| Caffeine          | Number        | Cups of coffee/energy drinks                  |
| Alcohol           | Select        | None, Light (1-2), Moderate (3-4), Heavy (5+) |
| Meals Quality     | Number (1-10) | How well you ate today (evening)              |
| Hydration         | Select        | Poor, OK, Good, Great                         |
| Social Contact    | Select        | None, Light, Moderate, Rich                   |
| Intention         | Rich text     | Morning: what you want to focus on today      |
| Reflection        | Rich text     | Evening: free-text how the day went           |
| Bevel Tags        | Rich text     | Auto-generated: which tags to set in Bevel    |
| Raw Transcript    | Rich text     | Full voice transcript (backup)                |

### Notion Setup Steps:
1. Go to notion.so → Create new full-page database → name it "Health Log"
2. Add all properties above
3. Go to notion.so/my-integrations → Create new integration → name it "Health Logger"
4. Copy the integration token (starts with `ntn_`)
5. Go back to the database → Click "..." → "Connections" → Add your integration
6. Copy the database ID from the URL: `notion.so/YOUR-WORKSPACE/DATABASE_ID?v=...`

---

## 3. Prompt Flows

### Morning Flow (triggered when you open the app before 12:00)

The app shows prompts one at a time. Each prompt supports voice input (tap mic → speak → tap done) or manual text/number entry.

```
Screen 1: "Guten Morgen. Wie hast du geschlafen?" 
  → Sleep Quality: slider 1-10

Screen 2: "Wie ist dein Energielevel gerade?"
  → Energy Level: slider 1-10

Screen 3: "Stress Level?"
  → Stress Level: slider 1-10

Screen 4: "Was willst du heute schaffen?"
  → Intention: voice/text input (free-form)

Screen 5: SUMMARY + BEVEL TAGS
  → Shows: your inputs summarized
  → Shows: "Set these Bevel tags: [list]"
  → Button: "Save to Notion"
```

### Evening Flow (triggered when you open the app after 17:00, or manual toggle)

```
Screen 1: "Wie war dein Tag insgesamt?" 
  → Energy Level: slider 1-10

Screen 2: "Sport heute?"
  → Sport Type: multi-select buttons (Volleyball, Gym, Padel, etc.)
  → Sport Duration: number input (minutes)

Screen 3: "Wie viele Stunden hast du gelernt?"
  → Study Hours: number input

Screen 4: "Screen Time — wie viel unproduktiv?"
  → Screen Time: number input (hours)
  → Social Media: number input (hours)

Screen 5: "Koffein und Alkohol?"
  → Caffeine: number (cups)
  → Alcohol: select (None / Light / Moderate / Heavy)

Screen 6: "Essen und Trinken?"
  → Meals Quality: slider 1-10
  → Hydration: select (Poor / OK / Good / Great)

Screen 7: "Sozialer Kontakt heute?"
  → Social Contact: select (None / Light / Moderate / Rich)

Screen 8: "Freie Reflexion — wie war der Tag?"
  → Reflection: voice/text input (free-form)

Screen 9: SUMMARY + BEVEL TAGS
  → Shows: all inputs summarized
  → Shows: "Set these Bevel tags: [list]"
  → Shows: comparison to morning intention
  → Button: "Save to Notion"
```

### Between 12:00–17:00
→ Show both options: "Morning check-in" / "Evening review"

---

## 4. Bevel Tag Mapping Logic

Bevel's Journal has preset tags. Your inputs map to them like this:

```javascript
function generateBevelTags(data) {
  const tags = [];
  
  // Sleep-related (morning)
  if (data.sleepQuality <= 4) tags.push("Poor Sleep");
  if (data.sleepQuality >= 8) tags.push("Great Sleep");
  
  // Substance
  if (data.caffeine >= 3) tags.push("High Caffeine");
  if (data.caffeine >= 1) tags.push("Caffeine");
  if (data.alcohol === "Moderate" || data.alcohol === "Heavy") tags.push("Alcohol");
  
  // Activity
  if (data.sportDuration > 0) tags.push("Workout");
  if (data.sportDuration >= 60) tags.push("Heavy Training");
  if (data.sportType?.includes("Volleyball")) tags.push("Team Sport");
  
  // Screen / Stress
  if (data.screenTime >= 4) tags.push("High Screen Time");
  if (data.socialMedia >= 2) tags.push("Social Media");
  if (data.stressLevel >= 7) tags.push("High Stress");
  if (data.stressLevel <= 3) tags.push("Low Stress");
  
  // Nutrition
  if (data.mealsQuality <= 4) tags.push("Poor Nutrition");
  if (data.hydration === "Poor") tags.push("Dehydrated");
  
  // Social
  if (data.socialContact === "Rich") tags.push("Socializing");
  if (data.socialContact === "None") tags.push("Isolation");
  
  // Study
  if (data.studyHours >= 6) tags.push("Heavy Mental Load");
  
  return tags;
}
```

The summary screen shows these as tappable chips. You open Bevel, tap the matching tags in the Journal. Takes 15 seconds.

---

## 5. File Structure

```
health-logger/
├── index.html          ← Single-page app (HTML + CSS + JS all-in-one)
├── manifest.json       ← PWA manifest (name, icon, theme)
├── sw.js               ← Service worker (offline support + caching)
├── icon-192.png        ← App icon for home screen
├── icon-512.png        ← App icon large
├── vercel.json         ← Vercel config (optional, for headers)
└── README.md           ← Setup instructions
```

That's it. One HTML file does all the work. No node_modules, no build step, no framework.

---

## 6. Key Implementation Details

### Voice Input (Web Speech API)
```javascript
function startVoiceInput(callback) {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'de-DE'; // German primary, switch to en-US if needed
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    callback(transcript);
  };
  
  recognition.start();
  return recognition; // so you can call .stop() when done
}
```

**Note:** Web Speech API works in Chrome and Safari on iOS/Android. It requires HTTPS (which Vercel provides). On iOS Safari, the user must tap a button to trigger it (no auto-start). The app handles this by showing a mic button on each voice-enabled screen.

### Notion API Write
```javascript
async function writeToNotion(data) {
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + NOTION_TOKEN,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: { database_id: DATABASE_ID },
      properties: {
        'Date': { date: { start: new Date().toISOString().split('T')[0] } },
        'Entry Type': { select: { name: data.entryType } },
        'Sleep Quality': { number: data.sleepQuality },
        'Energy Level': { number: data.energyLevel },
        // ... all other properties
        'Bevel Tags': { 
          rich_text: [{ text: { content: data.bevelTags.join(', ') } }] 
        }
      }
    })
  });
  return response.json();
}
```

**CORS Note:** Notion API does NOT support direct browser requests (CORS blocked). You have two options:
1. **Simple:** Use a Vercel serverless function as a thin proxy (add one `api/notion.js` file)
2. **Simpler:** Use a CORS proxy like Notion's official client via a Vercel Edge Function

→ Go with option 1. It adds one file but keeps everything clean and secure (token stays server-side).

Updated file structure:
```
health-logger/
├── index.html
├── api/
│   └── notion.js       ← Vercel serverless function (Notion proxy)
├── manifest.json
├── sw.js
├── icon-192.png
├── icon-512.png
└── README.md
```

The serverless function is ~20 lines:
```javascript
// api/notion.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify(req.body)
  });
  
  const data = await response.json();
  res.status(200).json(data);
}
```

Token goes in Vercel's environment variables → never exposed to the browser.

---

## 7. PWA Setup (Home Screen Install)

### manifest.json
```json
{
  "name": "Health Logger",
  "short_name": "Health",
  "description": "Daily health check-in with voice input",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0D0D0D",
  "theme_color": "#0D0D0D",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

After deploying to Vercel, open the URL on your phone → Chrome: "Add to Home Screen" / Safari: Share → "Add to Home Screen". It now looks and behaves like a native app.

---

## 8. Design Direction

Dark theme matching your wearable aesthetic. Minimal, one-question-per-screen flow. Large touch targets. Mic button prominent. Progress dots at the top showing which screen you're on.

Color palette:
- Background: `#0D0D0D`
- Card: `#1A1A1A`
- Accent (morning): `#FFB347` (warm amber)
- Accent (evening): `#7B68EE` (soft purple)
- Text: `#F0EDE8`
- Success: `#4ADE80`

Typography: System font stack for speed. Large numbers. Minimal text.

---

## 9. Build Order for Claude Code

Do it in this sequence — each step is independently testable:

```
Step 1: Static HTML with the prompt flow
  - Build the morning and evening screens
  - Hard-code all questions
  - Navigation between screens (next/back)
  - Summary screen with Bevel tag generation
  - TEST: Open in browser, click through all screens

Step 2: Voice input
  - Add Web Speech API to free-text fields
  - Mic button with visual feedback (recording indicator)
  - TEST: Tap mic, speak, see transcript appear

Step 3: Notion integration
  - Create the serverless function (api/notion.js)
  - Wire up the "Save to Notion" button
  - TEST: Complete a flow, check Notion database for new entry

Step 4: PWA setup
  - Add manifest.json and service worker
  - Add meta tags for iOS Safari
  - TEST: Deploy to Vercel, install on phone home screen

Step 5: Polish
  - Animations between screens
  - Haptic feedback on save (navigator.vibrate)
  - Auto-detect morning/evening based on time
  - Local storage for draft (in case you close mid-flow)
```

---

## 10. Claude Code Session Starter Prompt

When you open Claude Code, paste this to kick off the build:

```
I'm building a Progressive Web App (PWA) called "Health Logger" — a daily 
check-in tool with voice input that writes to Notion and generates Bevel 
health app tag suggestions.

Read the blueprint at: [paste path or content of this file]

Start with Step 1: Build the static HTML with the full morning and evening 
prompt flows. Single index.html file. Dark theme. One question per screen 
with next/back navigation. Summary screen at the end with Bevel tag 
generation logic.

My Notion database ID is: [paste yours]
The database has these properties: Date, Entry Type, Sleep Quality, 
Energy Level, Stress Level, Study Hours, Screen Time, Social Media Hrs, 
Sport Type, Sport Duration, Caffeine, Alcohol, Meals Quality, Hydration, 
Social Contact, Intention, Reflection, Bevel Tags, Raw Transcript.

Build Step 1 now. We'll add voice and Notion in subsequent steps.
```

---

## 11. Future Upgrades (post-MVP)

These are stored separately — remind me when you ask "what else can we build":
- Auto-pull Apple Health data exports
- Google Calendar API integration for activity correlation
- Aggregation dashboards over time  
- Weekly trend reports generated by Claude
- Trend visualization: "your HRV is 12% higher on days you studied <4hrs and did sport"
- Notion-side automation: weekly summary page auto-generated
- Screen Time integration (if Apple ever opens the API, or via manual Shortcut bridge)
