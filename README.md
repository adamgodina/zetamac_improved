# Zetamac++

A local mental-math trainer for quant interview prep, in the spirit of [zetamac.com](https://arithmetic.zetamac.com/):

- **Two ways to play, one switch.** *Auto-submit* (the default) accepts an answer
  the instant it's correct, like classic Zetamac — the run ends when time runs
  out. Flip the switch off for *sudden death*: you press `Enter` to submit, and
  your first wrong answer ends the run.
- **Listen mode (optional).** The problem is *spoken aloud and never shown on screen* — you still type the answer. Good practice for verbal phone screens where you have to hold the problem in your head.

It also tracks every run locally and shows your **daily high score** and **trends** over time.

## Run it

**Easiest: double-click `Launch Zetamac++.command`** in Finder. It starts a tiny
local server and opens the app at a fixed URL (`http://localhost:8765`). A
Terminal window stays open while you play — keep it open, and close it (or press
`Ctrl-C`) when you're done.

Using the launcher every time is recommended because it always loads the app from
the **same origin**, which is what keeps your saved stats in one continuous
history (see *Your data* below).

You can also just open the file directly:

```bash
open index.html        # macOS — runs over file://
```

Both work for every feature. The only difference is where your stats are stored
(again, see *Your data*).

> First time: if double-clicking the `.command` ever opens it as text instead of
> running it, right-click → **Open With → Terminal**, or run
> `chmod +x "Launch Zetamac++.command"` once in this folder.

## How it works

- **Play tab** — choose operations and number ranges (defaults match Zetamac's
  classic setup: +/− over 2–100, ×/÷ with 2–12 × 2–100), set the duration
  (default 120s), then **Start**. Subtraction and division are generated as the
  inverses of addition and multiplication, so every answer is a clean integer.
- **Auto-submit switch** — on (default): answers are accepted the moment they're
  correct, no Enter needed, and the run lasts until the timer ends. Off: press
  `Enter` to submit, and your first wrong answer ends the run (sudden death).
- **Listen mode** — each problem is spoken instead of displayed; you type the
  answer exactly as in normal play. Press `R` (or the **Repeat** button) to hear
  it again. Uses your browser's built-in text-to-speech — no microphone involved,
  and it works over `file://` too.
- **Themes** — five palettes, monkeytype-inspired: **Serika** (default — yellow
  on graphite), **Ocean** (teal on dark blue), **Matrix** (green on pure black),
  **Stealth** (monochrome black/gray/white), and **Sakura** (pink on navy).
  Pick one in settings; it sticks per device.
- **Keypad for mobile** — an on-screen 0–9 pad with big tap targets, on by
  default on phones/tablets and off on desktop. On phones it sits flush with the
  bottom of the screen, like a real keyboard. With auto-submit the bottom-right
  key is **C** (clear a mistyped answer); otherwise it's **↵** (submit).
- **Stats tab** — today's high, all-time high, games today, 7-day average,
  a 14-day daily-high chart, your recent runs, and per-operation accuracy.
  Only runs played on the **default problem set** (all four operations, standard
  ranges, 120s) are recorded, so custom-range experiments can't skew your
  trends — the results screen tells you when a run wasn't saved. A **Reset to
  defaults** button in settings puts everything back to the standard setup.
  Use the **All / Typed / Listen** toggle at the top to view each mode's
  progress separately — typed and listen runs are tracked as independent
  histories (and "new high score" banners only compare within the same mode).

## Use it on your iPhone

1. Put your iPhone on the **same Wi-Fi network** as this Mac.
2. Start the app with `Launch Zetamac++.command` (the server it starts is
   reachable from other devices on your network).
3. Find your Mac's local IP: run `ipconfig getifaddr en0` in Terminal (or look
   in System Settings → Wi-Fi → Details). It'll be something like `192.168.1.23`.
4. On the iPhone, open Safari and visit `http://<that-ip>:8765` — e.g.
   `http://192.168.1.23:8765`.
5. Optional: tap **Share → Add to Home Screen** to get a full-screen app icon.

On a phone the big-button keypad turns on automatically, and auto-submit is
already the default — settings stick once set. Note that
stats are stored **per device**, so your iPhone history and your Mac history
are separate records (macOS may also ask once to allow Python to accept
incoming network connections — say yes).

### Making it permanent on the phone

The home-screen icon from the steps above still loads from your Mac, so it only
works while the Mac's server is running. The app ships with a service worker
(`sw.js`) + web manifest that make it a full offline PWA, but browsers only
activate service workers on a **secure origin** (`https://` or `localhost`) —
not on a plain `http://192.168.x.x` LAN address. Two ways to get there:

1. **Host it over HTTPS once** (easiest: a free static host like GitHub Pages
   or Netlify — it's just these few files). Open that URL on the iPhone, tap
   **Add to Home Screen**, and from then on the app launches instantly and works
   fully offline, forever, with stats saved on the phone. The Mac can be off.
2. **Serve it on the phone itself** with a local-web-server app (e.g.
   *WorldWideWeb* by The Iconfactory, free): copy this folder to the phone via
   AirDrop/Files, point the app at it, and open `http://localhost:…` in Safari.
   `localhost` counts as secure, so the service worker installs and the
   home-screen copy keeps working offline afterward.

## Your data

Everything is stored in your browser's `localStorage` on this machine only —
nothing leaves your computer. Use **Export data (JSON)** to back it up, or
**Reset all stats** to wipe it.

`localStorage` is tied to the exact **origin** (URL) and browser you open the app
from, so `http://localhost:8765` (the launcher) and `file://…/index.html`
(double-clicking the HTML) keep **separate** histories, as do different browsers.
Pick one way to launch — the `Launch Zetamac++.command` file is the simplest
consistent choice — and your daily highs and trends will all accumulate together.
