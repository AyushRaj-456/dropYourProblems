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
- **problems/{id}:** text, tag, year?, frequency?, workaround?, displayName?, authorUid, status (open, building, launched), meTooCount, reportCount, hidden, createdAt
- **problems/{id}/votes/{uid}:** createdAt. The document id is the voter's uid, so one vote per person is enforced by the id.
- **problems/{id}/reports/{uid}:** createdAt. Same one-per-person trick.
- **contributors/{problemId}:** authorUid, name, photoData? (small text string), title, meTooCount, createdAt
- **admins/{uid}:** exists only for admins. Created by hand in the console.
- **userStats/{uid}:** lastPostAt, used to enforce a minimum gap between posts.

## Security rules (write these first, test in the emulator)
Deny everything by default, then allow only:
- **Read problems:** anyone, only when `hidden` is false. The board query must filter on hidden.
- **Create problem:** signed in, own uid as authorUid, text 1 to 600 characters, tag from the fixed list, status open, counts zero, hidden false, server timestamp, and a minimum gap since `userStats.lastPostAt` (for example 30 seconds) updated in the same batch.
- **Edit or delete problem:** only the author, only text and optional fields, never counts, status or hidden.
- **Upvote:** in one batched write, create `votes/{uid}` and raise `meTooCount` by exactly 1. The rule checks: user is authenticated and non-anonymous, the vote document did not exist, the voter is not the author, and nothing else on the problem changes.
- **Report:** create `reports/{uid}` and raise `reportCount` by exactly 1, same pattern.
- **Contributors:** anyone reads. Create only when the user is not anonymous, is the problem's author, and the problem's `meTooCount` is at least 10. Name length limited. `photoData` limited to a small size (about 60,000 characters). Edit own only. Delete: owner or admin.
- **Admin:** an admin (document exists in `admins`) may set `status`, set `hidden`, and delete contributors.
- Enforced security: Upvotes require fully authenticated accounts (non-anonymous). Duplicate votes and self-votes are strictly denied at the database rule level.

## Routes
`/` board, `/contributors`, `/me`, `/login`, `/admin`.

## Key flows
1. **Post:** guest anonymous or authenticated sign-in, submit form, confirmation line.
2. **Upvote:** authenticated user taps, batched write creates `votes/{uid}` and increments count, active visual state shown. Guests see login prompt.
3. **Reaching 10:** the logged-in author sees the prompt, submits name and photo, appears in Contributors.
4. **Upgrade identity:** Log in links the account, posts stay.
5. **Moderation:** admin page lists hidden-able posts, most-reported first.

## Hosting
Firebase Hosting on Spark (free). A single console and CLI for everything. Set up SPA rewrites to index.html.

## Quality bar
- Fast first load: small bundle, system fallback fonts while web fonts load.
- Voice is an enhancement only; errors there never break posting.
- Basic SEO and social preview tags with a text-only title and description.

## Decisions
(Claude Code: add short dated notes here when you deviate from these docs.)
