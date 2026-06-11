# JSA Script Library

A curated collection of scripts for the [JS Automations](https://github.com/rocklobster42195/ha-js_automations_addon) Home Assistant addon.

## Usage

1. Open the library at **https://rocklobster42195.github.io/ha-jsa-library/**
2. Click **JSA URL** (top right) and enter your addon address, e.g. `http://192.168.1.100:8099`
3. Click **Add to JSA** on any script — the import wizard opens with the URL pre-filled
4. Click **Preview**, then **Import**

## Adding a script

Edit `scripts.json` and add an entry:

```json
{
  "name": "My Script",
  "description": "One or two sentences about what it does.",
  "gist_raw": "https://gist.githubusercontent.com/rocklobster42195/ID/raw/script.js",
  "gist_url":  "https://gist.github.com/rocklobster42195/ID",
  "tags":      ["mqtt", "presence"],
  "icon":      "mdi:home-account",
  "color":     "#2dba6d",
  "screenshot": "screenshots/my-script.webp"
}
```

| Field        | Required | Notes                                              |
|--------------|----------|----------------------------------------------------|
| `name`       | ✅        |                                                    |
| `description`| ✅        |                                                    |
| `gist_raw`   | ✅        | Raw URL to the `.js` file                          |
| `gist_url`   | ✅        | Link to the Gist page                              |
| `tags`       | ✅        | Used for filtering                                 |
| `icon`       | ✅        | Any [MDI icon](https://pictogrammers.com/library/mdi/) — `mdi:robot` |
| `color`      | ❌        | Hex color for the icon placeholder                 |
| `screenshot` | ❌        | Path relative to repo root, e.g. `screenshots/my-script.webp` |

### Screenshot guidelines

- Format: **WebP** (preferred) or PNG
- Size: **800 × 450 px** (16:9)
- Location: `screenshots/` folder in this repo
