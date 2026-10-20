# Plan

Do one phase at a time. Stop at each "Done when", report, and wait for a go.

## Phase 0: Setup
Vite React JavaScript project, git, `.env.example`, Firebase project on Spark (owner creates it; Claude Code guides), enable Anonymous, Google and Email link sign-in, create Firestore, deploy an empty page to Firebase Hosting.
**Done when:** a blank branded page is live on a public URL and the app signs in anonymously.

## Phase 1: Static UI
Build every section from `design-reference/index.html` as React components with sample data. Responsive at 390px and 1280px. Fonts loaded. No icons or emojis.
**Done when:** side by side with the reference it looks the same on desktop and phone, with no horizontal scroll.

## Phase 2: Rules and anonymous posting
Write and emulator-test the Firestore rules first. Then the post form, board reading live data (paginated), tag filter, sort, the login note and the "Posted" line. Edit and delete own post.
**Done when:** a post made on one phone shows on another device, only its author can edit it, and the rules tests pass.

## Phase 3: Upvote and report
Batched upvote and report writes with one-per-person rules. Counts update on screen.
**Done when:** tapping twice does nothing, you cannot vote on your own post, and the count is the same on every device.

## Phase 4: Voice
Speak button with feature detection and a clear listening state.
**Done when:** it works in Chrome on Android and the button is absent in a browser without support, with typing unaffected.

## Phase 5: Login
Google and email link, linking the anonymous account. Login link in header. "My problems" page. Handle the already-exists case with the plain message.
**Done when:** after logging in, earlier posts from that browser are still the user's and editable from another device.

## Phase 6: Contributors
Threshold prompt on eligible posts, name and photo form with browser-side resize to a small square and compressed text storage, Contributors section and page.
**Done when:** a post with 10 Upvotes from other people lets its logged-in author join Contributors with a photo, anonymous authors are told to log in, and the rules reject a claim below 10 or by anyone else.

## Phase 7: Admin
`/admin` for admins only: hide posts, most-reported first, set Building or Launched, remove contributors.
**Done when:** a non-admin cannot do any admin action, even by calling Firestore directly.

## Phase 8: Polish and launch prep
Empty and error states, 404, accessibility pass (keyboard, contrast, labels), meta tags, read-usage check against the free quota, remove sample data.
**Done when:** the keyboard-only flow works end to end, a full board load stays within a sensible read count, and `docs/launch.md` can start.

## Phase 9: Discussion
Per-problem discussion thread with inline expandable view. Anyone can read, only logged-in users can write. Messages stored in subcollection with authorUid, authorName, createdAt, hidden, and optional "POSTER" badge for the problem creator. Problem `commentCount` incremented in the same batched write. Author can edit or delete own message, admin can hide or delete any message and review reports. Rate limiting (10s gap) in rules. Read quota protection: 30 oldest messages initially with Load More.
**Done when:** a logged-in user can post a message that stays after refresh and on another device, a logged-out visitor can read but not write, and the count beside the button stays correct.

## Later
College email restriction, weekly digest.
