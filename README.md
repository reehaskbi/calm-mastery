# NeuroLens

A personal system for emotional regulation (impatience, raised voice, sulking), clearer thinking and reading people, run in 41-day cycles over about six months. About 6 minutes a day.

## Run it

```powershell
node server.js
```

Then open http://localhost:5173.

## Screens

- **Today**: daily principle (with research source), this week's drill, physiological-sigh breathing timer, one focus for the day, one body-language cue to watch for (from Day 22), posture set, your if-then plans, and a weekly-review prompt when due.
- **Capture**: three parts.
  - *Trigger*: tap the moment you feel triggered. Guided steps for that kind of trigger, your if-then plan, emotion labelling, and a timer that measures your recovery time. Also one-tap "handled it well" wins.
  - *Observe*: log what you noticed in someone (cues, facts, two possible meanings, a prediction), then later mark which meaning was right.
  - *People*: each person's baseline, what sets them off, what helps, their most frequent cues and your read accuracy for them.
- **Night**: someone you observed (fact, first read, two alternatives), your emotional moment and how you handled it, optional "Why × 3", five 1–5 ratings, one insight.
- **Library**: how the system works, the 6-month journey, a body-language cue checklist, the emotional toolkit and key ideas from the reference books.
- **Progress**: 6-month journey, 41-day grid ("never miss twice"), recovery-time trend against a 10-minute goal, triggers, wins, read accuracy, weekly ratings, weekly reviews, all-cycles summary, calendar reminders, backup export/import.
- **Weekly review**: summary of the last 7 days against the week before, your top two triggers and an if-then plan for each.

## Programme

- Days 1–21 (internal): voice & breath → patience & delegation → trigger deconstruction.
- Days 22–41 (external): reading people → integration.
- Cycles 2+ (months 2–6): synthesis and pattern mastery.

## Files

- `app/content.js`: all programme content and research sources. Edit or translate this file without touching the code.
- `app/app.js`: app logic.
- `app/styles.css`, `app/index.html`, `app/manifest.json`, `app/sw.js`: UI shell, installable-app manifest, offline support.
- `server.js`: tiny local server, no dependencies.

## Data and privacy

Everything is stored in the browser's localStorage on the device you use. Nothing is sent anywhere. Use **Progress → Export backup** regularly. Clearing browser data erases it.

## Using it on your phone

Data lives per device, so pick the one device you'll use daily (your phone is best for the Trigger button).
To install it on a phone as an app with offline support, it needs to be served over HTTPS, for example by deploying the `app/` folder to a free static host (GitHub Pages, Netlify or Cloudflare Pages). Data still stays on the phone.

## Live site (GitHub Pages)

https://reehaskbi.github.io/calm-mastery/ is served from the `gh-pages` branch, which holds only the contents of `app/`.
After committing changes to `main`, publish them with:

```bash
git subtree split --prefix app -b gh-pages-tmp && git push -f origin gh-pages-tmp:gh-pages && git branch -D gh-pages-tmp
```
