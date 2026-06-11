# JSA Script Library

A curated collection of scripts for the [JS Automations](https://github.com/rocklobster42195/ha-js_automations_addon) Home Assistant addon.

## Usage

1. Open the library at **https://rocklobster42195.github.io/ha-jsa-library/**
2. Click **JSA URL** (top right) and enter your addon address, e.g. `http://192.168.1.100:8123`
3. Browse scripts — filter by tag, search by name/description, or sort by newest
4. Click **Add to JSA** on any script — the import wizard opens with the URL pre-filled
5. Click **Preview**, then **Import**

## Features

- **Tag filter** — multi-select, AND logic
- **Search** — live filter by name and description
- **Sort** — Default (as listed), A → Z, Newest (fetched from GitHub Gist API)
- **Featured** — scripts with `pinned: true` always appear at the top
- **"New" badge** — shown automatically on scripts updated within the last 14 days
- **Grid / List view** — toggle in the toolbar; preference is saved per browser

## Adding a script

Edit `scripts.json` and add an entry:

```json
{
  "name": "My Script",
  "description": "One or two sentences about what it does.",
  "gist_raw":    "https://gist.githubusercontent.com/rocklobster42195/ID/raw/script.js",
  "tags":        ["mqtt", "presence"],
  "icon":        "mdi:home-account",
  "color":       "#2dba6d",
  "screenshot":  "screenshots/my-script.webp",
  "author":      "rocklobster42195",
  "pinned":      false
}
```

| Field         | Required | Notes                                                                 |
|---------------|----------|-----------------------------------------------------------------------|
| `name`        | ✅        |                                                                       |
| `description` | ✅        |                                                                       |
| `gist_raw`    | ✅        | Raw URL to the `.js` file — Gist page link, version, and "New" badge are derived automatically |
| `tags`        | ✅        | Used for tag filter                                                   |
| `icon`        | ✅        | Any [MDI icon](https://pictogrammers.com/library/mdi/) — `mdi:robot` |
| `color`       | ❌        | Hex color for the icon placeholder background                        |
| `screenshot`  | ❌        | Path relative to repo root — `screenshots/my-script.webp`            |
| `author`      | ❌        | GitHub username — displayed as a `@username` link on the card        |
| `pinned`      | ❌        | `true` to show script at the top of the grid as "Featured"           |

### Screenshot guidelines

- Format: **WebP** (preferred) or PNG
- Size: **800 × 450 px** (16:9)
- Location: `screenshots/` folder in this repo
