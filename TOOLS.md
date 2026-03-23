# TOOLS.md - Local Notes

## Active Cron Bots

| Name | Schedule | Purpose |
|------|----------|---------|
| heartbeat-handler | Every 2hrs, 8AM–10PM | Lightweight heartbeat checks HEARTBEAT.md |
| weather-bot | 7 AM daily | Alerts only if notable weather (rain/snow/extremes) |
| daily-digest | 5 PM daily | 3-5 news stories on cars, BMW, business, AI |
| morning-briefing | 7 AM daily | Full morning briefing — weather, tip, goal, motivation |
| heartbeat-night-off | Midnight | Disables heartbeats overnight |
| heartbeat-morning-on | 8 AM | (Redundant — system heartbeat disabled, keep or remove) |

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
