# Clocked — Polls Feature Concept
*Saved 2026-04-25 | Status: CONCEPT ONLY — do not deploy*
*Note: Polls + Daily Prompts will be side tabs added to the app navigation*

## Core Concept
Polls are NOT a separate post type — they're an optional module inside the Create screen.

Users can:
- Post text only
- Post poll only
- Post text + poll together

## Create Screen Layout
Single unified flow:
1. Text / Review input (optional)
2. "Add Poll (Optional)" section (always visible or expandable)

No separate "Create Poll" or "Create Review" buttons — everything in one place.

## Poll Module Behavior

### Default State
- Collapsed or lightly visible
- Label: "Add a Poll (Optional)"

### When User Activates It
Show:
- Poll Question (required if poll is used)
- Answer Options (2–10)
- Poll Type Toggle: Single Choice (default) / Multi-Select

## Posting Logic
User can post if:
- ✅ Text is filled (with or without poll)
- ✅ Poll is filled (with or without text)

Validation rules (if poll is used):
- Must have a question
- Must have at least 2 options

## Output Types (Auto-Handled)
System determines post type automatically — no user selection needed:
- Text Only Post
- Poll Only Post
- Text + Poll Post

## Feed Display
**Poll Only:** Large, clean poll UI — focus on voting
**Text + Poll:** Text/review at top, poll directly underneath

## Interaction System (Unified)
Every post type supports the same interactions:
- Like
- Comment
- Share
- Save (optional)

No different layouts, no extra steps based on post type.

## Voting Rules
- Must vote to see results
- 1 vote per user
- Results show: percentages + total votes

## Comments on Polls
Poll-only posts still allow full comment threads + replies.
Turns polls into conversation starters, not just votes.

Example:
- Poll: "Is management fair here?"
- Comments: users explain answers, share experiences

## Example User Flows

**Flow 1 – Poll Only**
Open Create → Skip text → Fill poll → Post

**Flow 2 – Review + Poll**
Write review → Add poll ("Do you agree?") → Post both

**Flow 3 – Text Only**
Ignore poll section → Post normally

## Key Design Principles
- Reduce friction, not features
- Don't force users to choose a post type
- Let polls be natural additions, not separate workflows
- Keep everything in one simple flow
- No learning curve — polls feel identical to normal posts except for the voting component
