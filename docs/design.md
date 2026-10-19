# Design

The approved design is in `design-reference/index.html`. Open it in a browser. This file is the rule set behind it. Where they differ, the HTML wins.

**Feel:** a plain, quiet notice board. Lots of white space, one accent color, no decoration.

## Hard rules
- No emojis. No icons. No icon fonts. Buttons and links are text only.
- No shadows, no gradients, no background images, no illustrations.
- One corner radius: 6px (photos and inputs too). Pills are not used.
- One accent color, used only for the primary button, tag text and key links.

## Colors
| Use | Value |
|---|---|
| Page background | #F2F2EE |
| Text | #111111 |
| Secondary text | #3C413D |
| Muted text (meta, dates) | #4A4F4B |
| Hairlines | #D6D7D0 |
| Input border | #B9BBB3 |
| Photo placeholder | #DADBD3 |
| Accent | #2540E8 |
| Input background | #FFFFFF |

All text must keep at least 4.5:1 contrast. Do not lighten the muted text.

## Type
- **Archivo** (500, 700, 800) for everything readable.
- **IBM Plex Mono** (400, 500) for tags, dates, counts and small meta only.
- Wordmark: 18px, 800, lowercase "drop your problems".
- H1: 60px, 800, line-height 1.04, letter-spacing -0.035em. At phone width use about 38px.
- H2: 36px, 800, letter-spacing -0.03em.
- Problem title in a row: 22px, 700, line-height 1.35.
- Body: 17 to 19px, line-height 1.5.
- Labels: 13 to 14px.
- Tag line and meta: mono 12px. Tags are uppercase with 0.06em letter spacing.

## Layout
- Single centered column, max width 880px, 24px side padding.
- Order: header, hero, post form, filters and sort, problem rows, Contributors.
- Big gaps between sections (about 96px before Contributors), tight inside them.
- Phone: everything stacks, wrapping rows, no horizontal scroll.

## Components
- **Header:** wordmark left, two text links right (Board, Contributors). Login appears here as a text link, on the right.
- **Hero:** H1 plus one line of body text, max width about 520px.
- **Post form:** large textarea with 1px #111 border. Below it one row: Speak button, Tag select, Name input (optional), Drop it primary button. Under that, a small link: "Add more detail (year, how often, what you do today)" that reveals the optional fields. Then the login note (see product.md).
- **Speak button:** text only, secondary style, 48px high. Hidden when voice is unsupported. While listening, the label changes to "Listening, tap to stop".
- **Primary button:** accent background, white text, 48px high, radius 6, 700.
- **Secondary button:** transparent, 1px #111 border, radius 6, 700.
- **Filters:** text links. Active one is #111 with a 2px underline; others are muted. Sort sits on the right as two text links, active one bold.
- **Problem row:** no box and no card. Hairline under each row, 28px vertical padding. Top line is the mono tag line: "CANTEEN" or "CANTEEN · BUILDING". Then the title. Then a row with the Me too button and the mono meta (name or Anonymous, year if given, date and time).
- **Me too button:** secondary style, 44px high, label "Me too · 87". After tapping it shows "Me too · 88" with a heavier border; tapping again does nothing.
- **Contributor prompt:** a small line under a row: "10+ me-too reached. [Name] can now add a name and photo to join Contributors." Link text in accent, bold.
- **Contributors grid:** columns of at least 240px, 24px gap. Each item: square photo (aspect 1/1, radius 6) or placeholder with the first letter, then name (700, 17px), problem (14px), mono "64 me-too".
- **Inputs:** 48px high, 1px #B9BBB3, radius 6, white. Every input has a visible label.
- **Focus:** 2px outline in accent, 2px offset, on every interactive element.

## Screens not drawn yet (follow the same rules)
- Login: plain page or small centered panel, two options (Continue with Google, Email me a link), one line saying login is optional.
- After posting: one short line, "Posted. It is saved in this browser only. Log in to keep it for good." with a Log in link.
- Claim contributor form: name input, photo upload with live preview of the small square crop, Submit.
- My problems, Edit post, Admin: plain lists using the problem row style.
- Empty states: one sentence, no illustration. For example "No problems here yet. Be the first to drop one."

## Copy
Short, plain, human. No marketing words. Use "Me too", "Drop it", "Contributors". Dates like "18 Oct, 4:12 pm".

## Accessibility
Real buttons, links, labels. Photos get alt text. Tap targets at least 44px. Do not rely on color alone. Respect reduced motion; there is almost no motion anyway.
