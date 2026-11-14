[繁體中文](./README.md) | **English**

# Skills Program Progress Checker (Chrome Extension)

**Silently detects** course completion status on [Google Skills](https://www.skills.google) course / path pages, cross-references it against the master list of the "Google Digital Talent Exploration Program," and displays the completion progress of the three programs in a toolbar popup. It only reads the page — it does not click or submit any data.

## Features

- **Per-program progress list**: AI Workplace Literacy / Digital Marketing / Google Cloud, with each course marked ✓ completed, ✗ not completed, — not detected, ○ Skillshop (pending scan).
- **One-click scan (two-stage)**: First confirm that both the "Google Skills public profile" and "Skillshop certification page" URLs are filled in and saved. Stage one opens only 2 background tabs (public profile + Skillshop certification page); stage two runs only if some courses remain unconfirmed, opening just the program/course pages that own the missing items, then closes them and updates the summary table. Each scan is an authoritative round: an item marked done last round but not found this round (e.g. an expired certification) reverts to not-done instead of staying ✓ forever.
- **Full scan (fallback)**: If stage one misbehaves (not logged in, broken page), use "Full scan" to open every covered page at once and rescan.
- **Both sides reinforce each other**: skills.google courses are detected using both the "public profile" and the "each program page"; a completion confirmed by either side marks it ✓, reducing missed detections caused by a single page not loading properly.
- **Hide completed**: Once the checkbox is ticked, only courses not yet done are shown (the count is not affected, and the state is remembered).
- **Skillshop certification detection**: The first 5 Digital Marketing courses are Skillshop certifications; after logging in to Skillshop, "one-click scan" scans the Skillshop certification page (Credential Wallet) and marks completion by matching certification codes.
- **Manual confirmation items**: Only the capstone course (which goes through the official LINE) cannot be auto-detected, so it is marked separately.

## Installation (development version)

1. `chrome://extensions` → turn on "Developer mode" in the top right
2. Click "Load unpacked" → select this folder
3. Log in to skills.google and Skillshop, click the toolbar icon → fill in the two URLs and "Save URLs" → "One-click scan"

## How it works

- The content script reads the `completed` attribute of `ql-activity-card` on skills.google pages and pairs it with the master list by `course_templates/{id}`.
- The certification table on the Skillshop certification page (`skillshop.docebosaas.com`) is inside a same-origin iframe; the content script enters the iframe via `all_frames` and checks whether the page text contains the master list's certification codes (`code`).
- Completion status is accumulated in `chrome.storage.local` (keyed by the `course_templates` numeric id or the Skillshop certification code).
- See `master-list.js` for the master list (collected on 2026-06-05, three programs).

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension config (MV3) |
| `content.js` | Page detection (silent recording) |
| `popup.html` / `popup.js` | Toolbar popup summary table |
| `master-list.js` | Program course master list |
| `design-demos.html` | Design direction draft (not required for operation) |

## To do

- [ ] **Publish to Chrome Web Store**: package a zip (excluding `store-assets/`, `design-demos.html`, `README.md`). Icons are ready (`icons/icon{16,48,128}.png`, manifest already sets `icons` and `action.default_icon`).

## Limitations

- Skillshop certification detection requires logging in to Skillshop; the certification page only lists "currently valid" certifications (expired ones not ticked to display will not be detected).
- The capstone course goes through the official LINE, is not on any platform, cannot be auto-detected, and requires manual confirmation.
- The outermost rounded corners depend on a recent version of Chrome (roughly 114 or above).
