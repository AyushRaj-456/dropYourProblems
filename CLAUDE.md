# CLAUDE.md

## What this is
"Drop Your Problems": a web app for students of one college (SIT Tumakuru). Students post problems they face, others tap "Me too", problems are ranked by Me-too count. A poster whose problem reaches 10 Me-too can add a name and photo and be listed as a Contributor. The goal is to discover which real problems are worth building.

Read `docs/product.md`, `docs/design.md`, `docs/architecture.md`, `docs/plan.md` before writing code. Build in the order of `docs/plan.md`, one phase at a time, and stop at each "Done when".

## Hard rules
- **Everything free, Firebase Spark plan only.** No paid API, no paid service, no card, never upgrade to Blaze. That rules out Cloud Storage and Cloud Functions. Use Firestore, Firebase Auth and Firebase Hosting only.
- **React with plain JavaScript.** No TypeScript. Vite for the build.
- **No emojis and no icons**, anywhere in UI, copy, or docs. Text only.
- **Match the design exactly.** Follow `docs/design.md` and `design-reference/index.html`. No gradients, shadows, animations for show, or extra decoration.
- **Anonymous posting must always work.** Everyone is signed in anonymously by default; login upgrades that same identity. Login is never required to post or to say "Me too".
- **Mobile first.** Most users are on phones. Check every screen at 390px and at 1280px.
- **Voice input** uses the browser's Web Speech API. Show the Speak button only when the browser supports it. Typing always works.
- **Stay small.** Do not add features that are not in v1 of `docs/product.md`.

## Security
- All protection lives in Firestore Security Rules, because there is no server. Write them carefully, deny by default, and test them with the Firebase Emulator Suite.
- The Firebase web config is public by design. Never commit service accounts or admin keys.
- Never use `dangerouslySetInnerHTML`. Treat all user text as untrusted.
- Keep reads low: paginate the board, no live listeners on the whole list (free plan has a daily read limit).

## Freedom
You decide folder structure, state management, routing library, and small details the docs do not specify. Keep dependencies few. If a doc is wrong or impossible, change your approach, then write a short note under "Decisions" at the end of `docs/architecture.md`.

## Working style
- Small commits, one per task.
- After each phase, tell me what works, what to test on a phone, and what you need from me.
- Do not ask questions the docs already answer.
