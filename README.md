# Health Logger

A Progressive Web App for daily health check-ins with voice input, Notion integration, and Bevel tag generation. Single HTML file, no framework, no build step.

## What It Does

- **Morning check-in** (auto-opens before 12:00): Sleep quality, energy, stress, intention
- **Evening review** (auto-opens after 17:00): Sport (per-activity durations), study/work hours, screen time, caffeine (mg), calories (kcal), water (L), social contact, reflection
- **Voice input** (de-DE) on free-text fields via Web Speech API
- **Bevel tag generation**: auto-suggests health tags based on your inputs (Poor Sleep, Workout, High Caffeine, etc.)
- **Saves to Notion** via serverless API proxy
- **PWA**: installable on phone home screen, offline-capable, dark theme

## Stack

- Vanilla HTML/CSS/JS (single `index.html`)
- Web Speech API for voice
- Vercel serverless function (`api/notion.js`) for Notion API proxy
- Service worker for offline caching

## File Structure

```
index.html          Main app (UI + logic)
api/notion.js       Vercel serverless Notion proxy
api/calendar.js     Vercel serverless Google Calendar proxy
api/trends.js       Vercel serverless Notion query for trends
manifest.json       PWA manifest
sw.js               Service worker
icon-192.svg        App icon (small)
icon-512.svg        App icon (large)
```

## Notion Database

- **Database ID:** `8a0752eb807143e2bcc610ac4b952ac7`
- **Data Source ID:** `8a4e61c3-57ad-4cbc-ae4e-c1af8ae63944`

### Properties

| Property | Type | Notes |
|---|---|---|
| Entry | Title | "Morning 2026-04-06" |
| Date | Date | Auto-filled |
| Entry Type | Select | Morning / Evening |
| Sleep Quality | Number | 1-10 |
| Energy Level | Number | 1-10 |
| Stress Level | Number | 1-10 |
| Study Hours | Number | |
| Work Hours | Number | |
| Screen Time | Number | Hours |
| Social Media Hrs | Number | Hours |
| Sport Type | Multi-select | Volleyball, Gym, Padel, Run, Walk, Gymnastics, Swim |
| Sport Duration | Number | Total minutes |
| Caffeine | Number | mg |
| Calories | Number | kcal |
| Hydration L | Number | Liters |
| Social Contact | Select | None / Light / Moderate / Rich |
| Intention | Rich text | Morning |
| Reflection | Rich text | Evening |
| Bevel Tags | Rich text | Auto-generated |
| Raw Transcript | Rich text | Voice transcript backup |
| Resting HR | Number | bpm (Apple Health import) |
| HRV | Number | ms SDNN (Apple Health import) |
| Sleep Duration | Number | hours (Apple Health import) |
| Steps | Number | Apple Health import |
| Active Calories | Number | kcal (Apple Health import) |
| SpO2 | Number | percent (Apple Health import) |

## Setup

1. Clone the repo
2. Deploy to Vercel
3. Add environment variables:
   - `NOTION_TOKEN` = your Notion integration token
   - `GOOGLE_CALENDAR_CREDENTIALS` = full JSON key of a Google Service Account (with Calendar API enabled, calendar shared with the service account email)
4. Open on phone, add to home screen

### Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project
2. Enable the Google Calendar API
3. Create a Service Account and download the JSON key
4. Share your Google Calendar with the service account email (read-only)
5. Paste the full JSON key as the `GOOGLE_CALENDAR_CREDENTIALS` env var in Vercel

## What's Built

- [x] Phase 1: Static HTML with morning/evening flows, dark theme, navigation
- [x] Phase 2: Voice input (Web Speech API, de-DE)
- [x] Phase 3: Notion integration (serverless proxy + save logic)
- [x] Phase 4: PWA setup (manifest, service worker, icons)
- [x] Phase 5: Polish (slide animations, haptic feedback, auto-detect mode, localStorage drafts)
- [x] Google Calendar integration (auto-suggest study, sport, screen time from today's events)
- [x] Apple Health XML import (resting HR, HRV, sleep, steps, active calories, SpO2)
- [x] Trends dashboard (Chart.js charts, correlation cards, date range picker)

## Apple Health Import

Upload your Apple Health export XML from the home screen. The parser:
- Streams the file in 2MB chunks (handles 100MB+ exports)
- Filters records to the selected date only
- Extracts: Resting Heart Rate, HRV (SDNN), Sleep Duration, Step Count, Active Energy Burned, SpO2
- Displays metrics on a summary card and saves to Notion

To export from iPhone: Settings > Health > Export All Health Data

## Trends Dashboard

Accessible from the home screen, the Trends page queries your Notion Health Log and displays:

- **Sleep & Recovery** (line chart): Sleep Quality + Energy Level over time
- **Activity** (bar chart): Study Hours, Sport Duration, Screen Time per day
- **Biometrics** (dual-axis line chart): Resting HR + HRV over time
- **Correlations** (comparison cards):
  - Sleep quality on sport days vs rest days
  - Energy on low screen time (<2h) vs high (>4h)
  - HRV on light study (<4h) vs heavy (>6h)

Date range picker: 7 days, 30 days, All time. Loading skeletons during fetch.

## Google Calendar Keyword Mapping

Events are categorized by title keywords:

| Category | Keywords | Pre-fills |
|---|---|---|
| Study | study, lernen, thesis, uni, library, studium, vorlesung, seminar, hausarbeit | Study Hours |
| Sport | volleyball, padel, gym, gymnastics, sport, training, run, walk, swim | Sport Type + Duration |
| Screen | instagram, netflix, youtube, gaming, tiktok, twitch, tv, fernsehen | Screen Time |

## Future Ideas

- Weekly trend reports generated by Claude
- Trend visualization ("HRV is 12% higher on days you studied <4hrs and did sport")
- Notion-side weekly summary automation
