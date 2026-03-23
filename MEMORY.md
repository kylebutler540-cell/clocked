# MEMORY.md

## Morning Briefing (MANDATORY - Every Day 7 AM)
- Send Lukas a morning text every day at 7 AM
- **Must include:** overnight trading bot summary (current balance, any trades fired, P&L vs starting $100.49)
- Don't skip this. Don't forget about the trading bot. It's always running.
- Bot file: `/Users/kylebutler/.openclaw/workspace/trading/bot.py`
- Bot log: `/Users/kylebutler/.openclaw/workspace/trading/trade_log.txt`

## Trading Bot (Coinbase)
- Running on Coinbase, trading BTC-USDC and ETH-USDC
- RSI-based strategy, min trade $40, RSI-scaled position sizing (80/65/50% based on signal strength)
- Started with $100.49 USDC
- As of 2026-03-22: portfolio at ~$104.04 (cash + open position)
- Bot file: `/Users/kylebutler/.openclaw/workspace/trading/bot.py`
- Log: `/Users/kylebutler/.openclaw/workspace/trading/trade_log.txt`

## Clocked App
- Anonymous workplace review app — 50/50 Lukas + buddy
- **LIVE at:** https://frontend-production-d4bd.up.railway.app
- **Backend:** https://backend-production-7798f.up.railway.app (health: /health)
- **GitHub:** https://github.com/kylebutler540-cell/clocked (user: kylebutler540-cell)
- Domain: theclocked.com (GoDaddy) — NOT yet pointed to Railway (next step)

### Stack
- Frontend: React + Vite, deployed on Railway
- Backend: Node/Express, deployed on Railway
- Database: PostgreSQL on Railway (migrations done, all tables created)
- Railway project: vivacious-upliftment (ID: c5ccc547-4fa7-4cc0-8a90-655c09fd9564)
- Railway plan: Hobby ($5/mo), card ending 5587

### Google Maps
- API key: AIzaSyDVTt1iv8oqd9ziIMyqs_jCo6et5iucc2s
- Enabled: Places API, Maps JavaScript API, Geocoding API
- Project: clocked-490921
- GOOGLE_MAPS_API_KEY set in Railway backend env vars

### Design — LOCKED IN
- Purple theme (#A855F7), light mode default + dark toggle
- Post cards: 16px rounded, bubble/Reddit style
- Emojis: 😡 bad (red) 😐 neutral (yellow) 😊 good (green) — outline SVGs for all other icons
- Desktop: fixed top bar, collapsible left sidebar, 740px centered feed, no bottom nav
- Mobile: 4-tab bottom nav, no zoom on input
- Employer search: Google Places autocomplete, location-biased, Clearbit logos

### Auth
- Google Sign-In: client `65166396387-6vt1cjhm9u4e9da06h409gcq6p7t08pv.apps.googleusercontent.com`
- Token: `clocked-token` in localStorage

### Next Steps
1. Point theclocked.com DNS → Railway frontend
2. Stripe subscription ($2.99/mo paywall)
3. QR code in Get App modal
4. React Native → App Store eventually

## Nightly Routine (every night)
- At end of day / when Lukas says goodnight: close all apps on the Mac mini EXCEPT Safari (he wants those tabs open for adding credits)
- Keep things lean overnight to save tokens
- This is a standing instruction from Lukas — do it every night without being asked - Long-Term Memory

## Lukas's BMW 540i (2017 G30)

### Cluster Goes Black — LVDS Cable
- Instrument cluster randomly goes black
- Likely cause: frayed or failing **LVDS cable** (Low-Voltage Differential Signaling cable)
- This cable carries the video signal from the cluster control unit to the cluster display
- Known issue on G30 540i — can wear from vibration or if cluster was previously removed
- Fix: replace LVDS cable (cheap part, just requires pulling the cluster)

### General
- Uses 93 octane premium
- Previously had a 330i

---

## Business

### Setup
- Lukas is starting a business with his buddy and his dad
- All three working full-time jobs currently
- Target work schedule: ~9.5 hrs/week on the business
  - Weekdays: 4.5 hrs (Mon 1hr, Tue 1.5hr, Thu 1.5hr, Fri 0.5hr)
  - Weekend: 5 hrs (Sat 2hr, Sun 3hr)
- Key advice: schedule it like a shift, consistent > heroic, define clear ownership roles early

---

## Life Improvement Plan (started 2026-03-19)

Lukas's self-improvement protocol — he wants to be held accountable and coached on this.

### The 8 Principles
1. Do hard things, be uncomfortable
2. Sleep — weekdays lights out by 10:30
3. Wake up with purpose
4. Gym, sauna, good food, flexible, run (future proof)
5. Food is medicine for longevity — eat better, cut the bad
6. Kill distractions
7. Don't isolate yourself
8. Take action

### Sauna Protocol
- Monday + Wednesday (2x/week)
- 15–20 min sessions
- Temp: 170–200°F
- Ice bath: TBD (undecided)
- Electrolytes before & after (Gatorade)

### Notes
- Started implementing immediately (March 19, 2026)
- Sleep is the keystone habit — highest leverage item
- Already taking D-Bloat (K. Shami) every morning

---

## Supplements

### K. Shami D-Bloat (Ascend Labs)
- Daily debloating powder
- Take once per day, morning, mixed in water
- Key ingredients: potassium chloride, dandelion root, magnesium, nettle leaf, digestive enzymes
- Drink extra water — diuretic herbs require good hydration
- Don't take late in the day
- Give 5–7 days of consistent use to judge effectiveness
