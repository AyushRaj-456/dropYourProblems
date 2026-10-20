# Architecture

## Principle
Free, small, boring. A React front end talking straight to Firebase. No server of our own, so security lives in Firestore rules.

## Stack
- **Front end:** React, plain JavaScript, Vite. Any small router.
- **Firebase, Spark plan only:** Firestore (data), Authentication (anonymous, Google, email link), Hosting (deploy).
- **Voice:** browser Web Speech API. No service involved.
- **Nothing else.** No paid or key-based third-party API.

## Spark-plan constraints (verify current limits in the Firebase console)
- **No Cloud Storage.** As of 2026 Cloud Storage for Firebase needs the paid Blaze plan, so contributor photos are stored as small compressed text strings inside Firestore documents.
- **No Cloud Functions.** Anything a function would have done must be done by the client plus security rules.
- Firestore free quota is limited per day (reads, writes, deletes) and in total size. The read quota is the one to protect:
  - paginate the board (about 20 problems per page)
  - no real-time listeners on the full list
  - store `meTooCount` on the problem so counts need no extra reads
- Phone auth is not used.

## Auth model
- On first load, sign in anonymously. Every post and vote is tied to that uid.
- "Log in" links the anonymous account to Google or an email link, which keeps the same uid and all earlier posts.
- If the chosen account already exists, linking fails. Show the known-limit message from `product.md` and sign in to the existing account.

## Data (Firestore)
- **problems/{id}:** text, tag, year?, frequency?, workaround?, displayName?, authorUid, status (open, building, launched), meTooCount, commentCount, reportCount, hidden, createdAt
- **problems/{id}/votes/{uid}:** createdAt. The document id is the voter's uid, so one vote per person is enforced by the id.
- **problems/{id}/reports/{uid}:** createdAt. Same one-per-person trick.
- **problems/{id}/messages/{messageId}:** text (1 to 1000 chars), authorUid, authorName (1 to 50 chars), createdAt (server timestamp), hidden (boolean).
- **problems/{id}/messages/{messageId}/reports/{uid}:** createdAt. One report per person.
- **contributors/{problemId}:** authorUid, name, photoData? (small text string), title, meTooCount, createdAt
- **admins/{uid}:** exists only for admins. Created by hand in the console.
- **userStats/{uid}:** lastPostAt (30s cooldown for problems), lastMessageAt (10s cooldown for discussion messages).

## Security rules (write these first, test in the emulator)
Deny everything by default, then allow only:
- **Read problems:** anyone, only when `hidden` is false. The board query must filter on hidden.
- **Create problem:** signed in, own uid as authorUid, text 1 to 600 characters, tag from the fixed list, status open, counts zero (`meTooCount: 0, commentCount: 0, reportCount: 0`), hidden false, server timestamp, and a minimum gap since `userStats.lastPostAt` (for example 30 seconds) updated in the same batch.
- **Edit or delete problem:** only the author, only text and optional fields, never counts, status or hidden.
- **Upvote:** in one batched write, create `votes/{uid}` and raise `meTooCount` by exactly 1. The rule checks: user is authenticated and non-anonymous, the vote document did not exist, the voter is not the author, and nothing else on the problem changes.
- **Report:** create `reports/{uid}` and raise `reportCount` by exactly 1, same pattern.
- **Discussion messages:**
  - Read: anyone can read if `hidden` is false; admins can read all.
  - Create: non-anonymous authenticated user (`isFullyAuthenticated()`), authorUid matches auth.uid, authorName length 1 to 50, text length 1 to 1000, hidden is false, createdAt is request.time. Must be submitted in a batched write that simultaneously increments problem `commentCount` by exactly 1 and records `lastMessageAt` on `userStats/{uid}` (enforcing a 10-second gap).
  - Edit: author only, only `text` can be updated (length 1 to 1000). Author cannot alter authorUid, createdAt, or hidden.
  - Delete: author or admin.
  - Moderate (hide): admin only can toggle `hidden`.
  - Report message: `messages/{id}/reports/{uid}` created with server timestamp.
- **Problem commentCount increment:** can only be incremented by exactly 1 by an authenticated non-anonymous user, strictly in tandem with creating a new message. Direct modification without a message document is denied.
- **Contributors:** anyone reads. Create only when the user is not anonymous, is the problem's author, and the problem's `meTooCount` is at least 10. Name length limited. `photoData` limited to a small size (about 60,000 characters). Edit own only. Delete: owner or admin.
- **Admin:** an admin (document exists in `admins`) may set `status`, set `hidden`, and delete contributors.
- Enforced security: Upvotes and discussion messages require fully authenticated accounts (non-anonymous). Duplicate votes and self-votes are strictly denied at the database rule level.

## Routes
`/` board, `/contributors`, `/me`, `/login`, `/admin`.

## Key flows
1. **Post:** guest anonymous or authenticated sign-in, submit form, confirmation line.
2. **Upvote:** authenticated user taps, batched write creates `votes/{uid}` and increments count, active visual state shown. Guests see login prompt.
3. **Discussion:** user taps "Discuss · N" on problem row to toggle inline thread. Oldest 30 messages fetched. Logged-in user posts a message; batched write increments `commentCount`, saves message, updates `lastMessageAt`.
4. **Reaching 10:** the logged-in author sees the prompt, submits name and photo, appears in Contributors.
5. **Upgrade identity:** Log in links the account, posts stay.
6. **Moderation:** admin page lists hidden-able posts, most-reported first, and admin can hide/delete messages.

## Hosting
Firebase Hosting on Spark (free). A single console and CLI for everything. Set up SPA rewrites to index.html.

## Quality bar
- Fast first load: small bundle, system fallback fonts while web fonts load.
- Voice is an enhancement only; errors there never break posting.
- Basic SEO and social preview tags with a text-only title and description.

## Decisions
- 2026-10-20: Phase 9 Discussion added. "Me too" button renamed to "Upvote" across all copy and docs. Rate limit for discussion messages set to 10s cooldown tracked in `userStats/{uid}.lastMessageAt`. Problem document maintains `commentCount` incremented in batched write with message creation. Plain text only (no markdown, no links, no icons/emojis). Display name prompted once if user account lacks one.

