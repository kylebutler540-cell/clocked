# TOOLS.md - Local Notes

## Active Cron Bots

| Name | Schedule | Model | Purpose |
|------|----------|-------|---------|
| heartbeat-handler | Every 4hrs, 8AM/12/4PM/8PM | ollama/qwen2.5:0.5b | Lightweight heartbeat checks HEARTBEAT.md |
| weather-bot | 7 AM daily | google/gemini-flash-2.0 | Alerts only if notable weather (rain/snow/extremes) |
| morning-briefing | 7 AM daily | google/gemini-2.5-flash-preview | Full morning briefing — weather, trading bot summary, tip |
| heartbeat-night-off | Midnight | — | Disables heartbeats overnight |
| heartbeat-morning-on | 8 AM | — | Re-enables morning heartbeat |

## Coding Agent Defaults
- **Default model:** `google/gemini-2.5-flash-preview` — use for most coding tasks
- **Auto-upgrade to `anthropic/claude-sonnet-4-6`** when: complex multi-file logic, subtle bugs, architecture decisions, or quality is at risk — no need to ask, just do it and say which model was used
- **Priority order:** App quality first → token savings second
- **Batching:** Group related tasks into one agent session
- **Always deploy frontend via:** `cd clocked/app/frontend && railway up --service frontend`
- **Never rely on git push alone for frontend** — Railway frontend is CLI-deployed only

## Clocked App — Deploy Process
- **Frontend:** `cd /Users/kylebutler/.openclaw/workspace/clocked/app/frontend && railway up --service frontend`
- **Backend:** git push to main (Railway auto-deploys backend from GitHub)
- **Verify deploy:** `curl -s https://frontend-production-d4bd.up.railway.app | grep -o 'assets/index-[^"]*js'` — hash should change after deploy

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
