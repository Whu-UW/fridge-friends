# Fridge Friends FYI: design handover

A phone app that tracks the food in your fridge and pantry, shows each ingredient as a character whose mood shows how long it has left, and lets you cook with friends before food goes bad.

Start with `handover.md`. Its last section, Open decisions, lists the questions to settle first.

## What is here

| File | What it is |
| --- | --- |
| `handover.md` | The design and back-end spec: design system, character kit, motion, screens, data model, freshness logic, feature specs, privacy rules, open decisions |
| `character-demo.html` | Open in a browser. An animated demo of every food, mood, and the rescued and failed reactions. It is the reference for motion |
| `screens.pdf` | All 17 screens, exported from the design canvas (Export PDF, then All artboards). Open it for a quick look at every screen without the design tool |
| `../../assets/characters/*.svg` | One SVG per food and mood, plus `bodies/` with no faces |
| `../../assets/characters/characters.json` | Machine-readable character kit: foods, colors, face positions, categories, and mood tables |
| `../../assets/characters/motion.css` | Keyframes and classes for every motion and reaction |

## Source of truth

This folder is a snapshot taken September 19, 2026. Until development starts, the living versions win, because that is where design edits happen:

- Design canvas (17 clickable screens): https://claude.ai/artifact/NLBaK6Vq159rkyb2vPzJVf
- Handover doc: https://claude.ai/artifact/A7Mm51WFwsWhvd9CToKSTa

`screens.pdf` is exported from the canvas, so re-export it whenever the canvas changes.

Both are private until their owner shares them. If this repo is public, delete these two links first. Once the dev team starts building, decide whether the repo copy becomes the source of truth and say so here.

## Using the character art

- Inline the SVG in your markup so CSS can animate it. An `<img>` tag shows the picture but cannot be animated by outside styles.
- Add one motion class from `motion.css` to the `<g class="character">` element. Which class to use comes from the mood table in `characters.json` (`categories`).
- Inside each SVG the parts are named by class: `.character`, `.body`, `.eyes`, `.tear`, `.drop`, `.fume`, `.tox`.
- Filenames are `<food>-<mood>.svg`, for example `milk-toxic.svg` and `spinach-wilting.svg`. `joy` is the rescued reaction, `scared` comes just before a crush, and `done` is the crushed ingredient.
- Hard-expiry foods (milk, eggs) have no gradual fade: they keep full color until `toxic`. The other categories lose color as they age, which the files show with a saturation filter.

## Sample data

Food names, prices, friend names, dates, and shelf lives in the canvas and in `characters.json` are placeholders. Do not treat the shelf lives as food-safety data.
