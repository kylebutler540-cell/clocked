# TOOLS.md - Local Notes

## Active Cron Bots

| Name | Schedule | Model | Purpose |
|------|----------|-------|---------|
| morning-reminder | 7 AM daily | — | "Good morning 🌅 Turn your ringer on and say good morning to your girlfriend 💜" |
| clocked-keepalive | every 9 min | — | Pings backend /health so Railway never cold-starts |

## Coding Agent Defaults

### ⚠️ Token Cost Priority: Minimize spend. $100 burned in 2 days — never again.

| Task | Model Flag | When |
|------|-----------|------|
| Small UI fixes, single-file, simple logic | `--model claude-haiku-3-5` | Default for most Clocked UI tweaks |
| Multi-file, moderate complexity | `google/gemini-2.5-flash-preview` (via main session agent) | Medium tasks |
| Complex architecture, subtle bugs, risky refactors | `--model claude-sonnet-4-6` | Only when quality truly requires it |

- **Always specify `--model claude-haiku-3-5`** in `claude` CLI calls unless the task is clearly complex
- **Tight prompts** — only include what the agent needs, no extra context or file reads
- **Batch related changes** into one agent session — never spawn multiple agents for related work
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
