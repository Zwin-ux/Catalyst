# Design System - Catalyst

## Product Context
- **What this is:** A hosted Discord-native engagement engine for creator, fandom, and group-chat communities that need recurring rituals, clear summaries, and friendly competition.
- **Who it's for:** Moderators, creators, community leads, and active members who want a room to feel alive without turning it into a noisy mess.
- **Space/industry:** Discord community tooling, social engagement systems, lightweight ops for online groups.
- **Project type:** Discord app with a minimal hosted control surface.

## Aesthetic Direction
- **Direction:** Nocturnal Mascot Console
- **Decoration level:** Intentional
- **Mood:** Quiet, sly, premium, and a little mischievous. The product should feel like a black slug crossed with a control room: low-light surfaces, crisp signals, and one strange mascot that makes the whole thing memorable.
- **Reference sites:** Internal direction only for now. No linked Figma file was available during this pass.

## Typography
- **Display/Hero:** `Instrument Serif` - soft but sharp, with enough drama to make the product feel authored instead of templated.
- **Body:** `Instrument Sans` - clean, human, and restrained without looking like generic startup defaults.
- **UI/Labels:** `Instrument Sans`
- **Data/Tables:** `IBM Plex Mono` - high-legibility console language for routes, states, and board readouts.
- **Code:** `IBM Plex Mono`
- **Loading:** Google Fonts for the web surface until assets are moved to self-hosted production files.
- **Scale:** 14 / 16 / 18 / 24 / 36 / 56 / 78 px, with tight heading tracking and open paragraph leading.

## Color
- **Approach:** Restrained
- **Primary:** `#050608` - slug ink, used for silhouettes, emphasis, and authority.
- **Secondary:** `#66D6FF` - signal blue for active states, links, and live system cues.
- **Neutrals:** `#F4F1E8`, `#D7D2C7`, `#A7B1C3`, `#1B2430`, `#0B0F14`
- **Semantic:** success `#53D48C`, warning `#FF8A63`, error `#E45A5A`, info `#91A7FF`
- **Dark mode:** Dark is the default product mode. Light surfaces are used sparingly as specimen tiles and mascot stages.

## Spacing
- **Base unit:** 4 px
- **Density:** Comfortable-compact
- **Scale:** 2xs(4) xs(8) sm(12) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approach:** Hybrid
- **Grid:** 12 columns desktop, 6 tablet, 4 mobile
- **Max content width:** 1180 px
- **Border radius:** sm 10 px, md 16 px, lg 24 px, pill 999 px

## Motion
- **Approach:** Intentional
- **Easing:** enter `cubic-bezier(0.22, 1, 0.36, 1)`, exit `ease-in`, move `ease-in-out`
- **Duration:** micro 80 ms, short 180 ms, medium 280 ms, long 420 ms

## Brand Assets
- **Mascot:** Black slug silhouette with a white crescent eye.
- **Usage:** Use the slug as the brand stamp, app icon, and hero artifact. It should appear once or twice per surface, not as decoration spam.
- **Asset files:** `assets/brand/catalyst-slug-mark.svg`, `assets/brand/catalyst-slug-app-icon.svg`

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-04 | Established Nocturnal Mascot Console design system | Gives Catalyst a distinct, memorable face that still reads as a serious product |
| 2026-04-04 | Adopted black slug silhouette as the core brand mark | Strong silhouette, easy recognition, and a better identity anchor than generic bot art |
| 2026-04-04 | Kept the hosted web surface minimal and Discord-first | The product should be installed for its in-room behavior, not for a sprawling dashboard |
