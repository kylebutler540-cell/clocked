# TOOLS.md - Local Notes

## Active Cron Bots

| Name | Schedule | Model | Purpose |
|------|----------|-------|---------|
| heartbeat-handler | Every 4hrs, 8AM/12/4PM/8PM | ollama/qwen2.5:0.5b | Lightweight heartbeat checks HEARTBEAT.md |
| weather-bot | 7 AM daily | google/gemini-flash-2.0 | Alerts only if notable weather (rain/snow/extremes) |
| morning-briefing | 7 AM daily | google/gemini-2.5-flash-preview | Full morning briefing — weather, trading bot summary, tip |
| heartbeat-night-off | Midnight | — | Disables heartbeats overnight |
| heartbeat-morning-on | 8 AM | — | Re-enables morning heartbeat |

## Coding Agent Defaults (Cost Optimization)
- **Default model for coding tasks:** `google/gemini-2.5-flash-preview` — fast, cheap, solid for 80% of tasks
- **Use Claude Sonnet only when:** complex multi-file reasoning, subtle bugs, architecture decisions
- **Rule:** Always state which model you're using when spawning a coding agent
- **Batching:** Group feature requests into single coding sessions — don't spawn multiple agents for related tasks

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
