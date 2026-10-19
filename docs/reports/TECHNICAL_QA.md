# Technical Q&A & Interview Guide: Drop Your Problems

---

## 1. Project Pitches

### The 30-Second Elevator Pitch
> *"Drop Your Problems is an open-source, public problem-discovery board where everyday users document friction and frustrations they encounter with modern software, tools, and technology. Instead of builders guessing what to create, indie hackers and software engineers explore verified, community-upvoted problems to discover meaningful products worth building. It's built with React 19, zero-cost Firebase BaaS, and native browser APIs."*

---

### The 2-Minute Technical Deep Dive
> *"Architecturally, Drop Your Problems is a serverless, zero-maintenance single-page application built with React 19, Vite, and Cloud Firestore. It solves the cold-start problem by allowing guests to drop frustrations instantly using anonymous authentication and native browser speech-to-text dictation.*
>
> *To maintain strict data integrity without running a continuous Node.js backend, all business logic and authorization rules are pushed directly into Cloud Firestore Security Rules. Upvoting strictly requires non-anonymous authentication (Google OAuth or passwordless Email magic links) and enforces an atomic batched subcollection write (`/problems/{id}/votes/{uid}`) alongside a deterministic database-level uniqueness check to eliminate duplicate votes, race conditions, and counter tampering.*
>
> *When a problem reaches 10 verified upvotes, the original submitter qualifies for contributor status. To operate 100% within Firebase's zero-cost Spark tier, contributor profile photos are cropped and compressed client-side using the HTML5 Canvas API into 300x300 JPEGs under 60KB, embedded directly in Firestore documents without expensive cloud storage buckets. The entire application is styled with a custom broadsheet typography system featuring Manufacturing Consent and Josefin Sans, and deployed to Vercel's global edge network."*

---

## 2. Top 10 Technical Questions & Code-Grounded Answers

### Q1: Why did you choose a Firebase Serverless BaaS architecture instead of a custom Node/Express backend?
**Answer:**
> *"For a public notice board, maintaining an Express server introduces server provisioning, operating system security patching, PM2 process management, and scaling bottlenecks. With Firebase Authentication and Cloud Firestore, we achieve multi-region horizontal scaling and 99.99% availability on a free tier. By implementing declarative Firestore Security Rules, the database itself acts as our authorization and validation middleware, eliminating intermediary network hops."*

---

### Q2: How do you prevent duplicate votes if there is no backend API endpoint handling the request?
**Answer:**
> *"We enforce duplicate vote prevention through a three-layer defense:
> 1. **Client-side:** Votes are cached in `localStorage` keyed by user UID, and the UI immediately renders an active dark state.
> 2. **Deterministic Data Model:** Every vote writes to `/problems/{problemId}/votes/{request.auth.uid}`. The rules specify `allow update, delete: if false;`, making vote documents immutable once created.
> 3. **Database Precondition:** In `firestore.rules`, the problem update requires `!exists(/databases/.../votes/$(request.auth.uid))` and exactly `meTooCount + 1`. If a user attempts to call Firestore directly or clicks concurrently across multiple browser tabs, Cloud Firestore evaluates the batch atomically and rejects subsequent attempts with `PERMISSION_DENIED`."*

---

### Q3: How does the application allow anonymous posting while strictly forbidding anonymous upvoting?
**Answer:**
> *"We utilize Firebase Anonymous Authentication to silently assign each new visitor a stable UID on first load. This gives guest submissions a stable author identity. However, in `firestore.rules`, we define:
> ```javascript
> function isFullyAuthenticated() {
>   return isSignedIn() && request.auth.token.firebase.sign_in_provider != 'anonymous';
> }
> ```
> While problem creation requires `isSignedIn()`, upvoting and contributor claiming require `isFullyAuthenticated()`. On the client, clicking upvote while anonymous triggers an inline prompt with direct navigation to `/login`."*

---

### Q4: How do you handle profile pictures without a paid Cloud Storage bucket?
**Answer:**
> *"Firebase Cloud Storage requires a paid Google Cloud billing account. To keep the app 100% free on the Spark tier, we built a client-side image processing pipeline using the HTML5 Canvas API (`src/utils/imageResize.js`). When a contributor selects an image, the browser center-crops it to a 1:1 square, scales it to 300x300 pixels, and compresses it to a 0.7 quality JPEG. The resulting base64 data string is verified to be under 60KB and stored directly in the Firestore document, protected by a 65,000-byte security rule limit."*

---

### Q5: How does hands-free voice dictation work without external API costs?
**Answer:**
> *"We integrate the browser's native Web Speech API (`SpeechRecognition || webkitSpeechRecognition`) in `PostForm.jsx`. When the user taps 'Speak', the browser activates their device's native speech recognition engine (Windows SAPI, Apple CoreSpeech, or Android Speech Engine) in continuous mode. Transcripts stream into the textarea in real time with zero external API latency, zero backend processing, and zero ongoing costs."*

---

### Q6: Why did you build a custom router instead of using `react-router-dom`?
**Answer:**
> *"The application has five primary routes (`/`, `/login`, `/me`, `/admin`, `/contributors`). `react-router-dom` adds approximately 35KB of gzipped code and external dependencies. In `src/utils/router.jsx`, we implemented a lightweight router in under 55 lines of code using `window.history.pushState` and `popstate` event listeners, keeping bundle size small and eliminating dependency vulnerability surface."*

---

### Q7: What happens when two users upvote the exact same problem at the exact same millisecond?
**Answer:**
> *"In `src/services/problemService.js`, the vote count is incremented using Firestore's atomic field transform `increment(1)` inside a `writeBatch`. Cloud Firestore handles concurrency at the storage layer via optimistic concurrency control, serializing the operations and guaranteeing that both votes increment the counter accurately without lost updates."*

---

### Q8: If an anonymous user creates 5 problems and then decides to log in with Google, what happens to their posts?
**Answer:**
> *"In `src/services/authService.js`, we utilize `linkWithPopup(currentUser, provider)`. When an anonymous session logs in via Google, Firebase upgrades the existing anonymous account in place. The user's UID remains identical, automatically preserving ownership of all their previously dropped problems and allowing them to manage them in `/me`."*

---

### Q9: How is rate limiting implemented without a Redis server?
**Answer:**
> *"When a user drops a problem, the atomic write batch updates a companion document at `/userStats/{uid}` with `lastPostAt: serverTimestamp()`. In `firestore.rules`, creating a problem checks:
> ```javascript
> !exists(/databases/.../userStats/$(request.auth.uid)) ||
> request.time > get(/databases/.../userStats/$(request.auth.uid)).data.lastPostAt + duration.value(30, 's')
> ```
> This enforces a mandatory 30-second cooldown directly at the database level, preventing automated spam scripts without requiring an external Redis cache."*

---

### Q10: How do you verify contributor eligibility without trusting client-side claims?
**Answer:**
> *"The client cannot fabricate contributor eligibility. In `firestore.rules`, the creation rule for `/contributors/{problemId}` performs two verified lookups against the live problem record:
> 1. `get(/databases/.../problems/$(problemId)).data.authorUid == request.auth.uid`
> 2. `get(/databases/.../problems/$(problemId)).data.meTooCount >= 10`
> Even if a malicious user alters the client JavaScript or issues a manual REST request, Firestore validates the problem's stored upvote tally and author ownership before committing the contributor profile."*
