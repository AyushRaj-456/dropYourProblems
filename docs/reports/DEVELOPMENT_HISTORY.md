# Development History: Confirmed Problems & Solutions

---

## 1. Overview of Development Evolution

During the engineering lifecycle of **Drop Your Problems**, several critical architectural, functional, and deployment challenges were encountered and methodically solved. 

This document provides a factual record of each confirmed issue, supported by verifiable code changes, git logs, test suites, and build artifacts.

---

## 2. Confirmed Development Problems & Technical Resolutions

### Challenge 1: Product Concept Pivot (Campus Complaints → Technology Frustrations)
- **Problem:** The early prototype was structured around college campus complaints (*Canteen, Hostel, Academics, Placements*).
- **Symptoms:** The UI asked students for campus issues rather than capturing user pain points with software, tools, and modern tech.
- **Root Cause:** Initial requirements misunderstood the core mission: creating an open directory of real-world technology friction to inspire software builders and indie developers.
- **Solution:** 
  1. Updated the primary tags in [sampleData.js](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/src/data/sampleData.js) and [PostForm.jsx](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/src/components/PostForm.jsx) to technology categories (*Websites, Browser Extensions, Mobile Apps, AI Tools, Developer Tools, Productivity, Gaming, Social Media, Digital Services, Hardware, Accessibility, Other*).
  2. Maintained backward compatibility in [firestore.rules](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/firestore.rules#L21-L28) by retaining legacy tags in `isValidTag()` so existing database documents would not fail validation.
  3. Rewrote the hero copy to: *"What frustrates you about technology?"*.
- **Verification:** Live browser verification on `http://localhost:5173/` and 23/23 passing emulator tests.

---

### Challenge 2: "Me Too" to "Upvote" Terminology Normalization
- **Problem:** The platform used informal "Me Too" phrasing across buttons, counts, and contributor prompts, which was ambiguous and didn't clearly convey an upvoting mechanism.
- **Symptoms:** Confusion over whether "Me Too" allowed vote retraction, and how it mapped to community prioritization.
- **Solution:** 
  1. Renamed all UI components to use the standard term **"Upvote"**.
  2. Changed button labels to `{hasVoted ? 'Upvoted' : 'Upvote'} · {count}` with active solid styling.
  3. Renamed the sort filter from *"Most me-too"* to *"Most upvotes"*.
  4. Updated documentation, contributor modals, and administrative tables.
- **Files Modified:** `src/components/ProblemRow.jsx`, `src/components/FiltersAndSort.jsx`, `src/components/ContributorsSection.jsx`, `src/pages/AdminPage.jsx`, `src/App.css`.

---

### Challenge 3: Anonymous Upvoting & Security Vulnerabilities
- **Problem:** Unauthenticated guests could upvote problems, enabling spam, bot inflation, and unverified counts.
- **Symptoms:** Vote counts could be manipulated by clearing cookies or opening private browsing windows.
- **Root Cause:** The application automatically initializes an anonymous Firebase session (`signInAnonymously`) so guests can drop problems without account friction. Because of this, traditional security checks (`request.auth != null`) treated anonymous guests as authenticated users.
- **Solution:**
  1. Created a dedicated helper function in [firestore.rules](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/firestore.rules#L9-L11):
     ```javascript
     function isFullyAuthenticated() {
       return isSignedIn() && request.auth.token.firebase.sign_in_provider != 'anonymous';
     }
     ```
  2. Updated the problem upvote rule to require `isFullyAuthenticated()`.
  3. Updated [ProblemRow.jsx](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/src/components/ProblemRow.jsx#L83-L88) to check `currentUser && !currentUser.isAnonymous`. If false, an inline prompt is displayed: *"You must be logged in to upvote. [Log in now]"* with a direct link to `/login`.
- **Verification:** Unit tests in `tests/rules.test.js` (`anonymous user cannot cast an upvote`) successfully rejected anonymous votes with `PERMISSION_DENIED`.

---

### Challenge 4: Preventing Duplicate & Race-Condition Votes
- **Problem:** Users could click the upvote button multiple times rapidly, refresh the page, or use multiple browser tabs to duplicate votes.
- **Symptoms:** Rapid clicking created multiple votes from the same account.
- **Root Cause:** Client-side button disabling (`disabled={isVoting}`) does not protect against parallel network requests, tab desynchronization, or direct Firestore REST calls.
- **Solution:**
  1. **Deterministic Subcollection:** Stored each vote in `/problems/{problemId}/votes/{voterUid}`.
  2. **Rule-Level Existence Check:** In [firestore.rules](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/firestore.rules#L109), the problem update rule requires:
     ```javascript
     !exists(/databases/$(database)/documents/problems/$(problemId)/votes/$(request.auth.uid))
     ```
  3. **Write Batch Immutability:** Votes are committed as an atomic batch write in [problemService.js](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/src/services/problemService.js#L234-L242). Once written, `votes/{voterUid}` has `allow update, delete: if false;`.
- **Verification:** Unit test `user cannot upvote twice on the same problem` passed in the Firebase emulator.

---

### Challenge 5: Contributor Eligibility & Anti-Impersonation
- **Problem:** Risk of users claiming contributor recognition for problems they did not author, or claiming before reaching the required milestone.
- **Root Cause:** Without database-level checks, any authenticated user could write a document to `/contributors/{problemId}`.
- **Solution:** In [firestore.rules](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/firestore.rules#L154-L167), enforced:
  1. Author identity verification: `request.auth.uid == get(...).data.authorUid`.
  2. Threshold validation: Verified against the database document that `meTooCount >= 10`.
  3. Anonymous exclusion: `request.auth.token.firebase.sign_in_provider != 'anonymous'`.
- **Verification:** Verified via emulator test cases:
  - Problem with 9 upvotes rejected (`assertFails`).
  - Non-author claiming rejected (`assertFails`).
  - Problem with 10 upvotes succeeded (`assertSucceeds`).

---

### Challenge 6: Zero-Cost Image Storage Under Spark Plan Limits
- **Problem:** Contributor profiles allow uploading photos, but Firebase Cloud Storage buckets require paid billing configurations on Google Cloud, violating the zero-cost Spark constraint.
- **Solution:** 
  1. Created a client-side image cropping and compression pipeline using the HTML5 Canvas API in [imageResize.js](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/src/utils/imageResize.js).
  2. Downsampled all uploaded images to a 300x300 pixel square JPEG at 0.7 quality.
  3. Ensured exported base64 data URLs remain under 60KB and embedded them directly in the Firestore contributor document (`photoData`).
  4. Protected Firestore by adding a 65,000-byte size limit in `firestore.rules`.

---

### Challenge 7: Vercel Build Dependency Conflict (`ERESOLVE`)
- **Problem:** Production build on Vercel failed during `Installing dependencies...` with exit code 1.
- **Symptoms:**
  ```text
  npm error code ERESOLVE
  npm error While resolving: @firebase/rules-unit-testing@5.0.2
  npm error Found: firebase@13.0.0
  npm error Could not resolve dependency:
  npm error peer firebase@"^12.0.0" from @firebase/rules-unit-testing@5.0.2
  ```
- **Root Cause:** `@firebase/rules-unit-testing` was added to `devDependencies` for local security rule emulation. It specifies a peer dependency range of `firebase@^12.0.0`. However, the root application upgraded to `firebase@^13.0.0`. npm v10 strictly aborts on peer dependency mismatches unless instructed otherwise.
- **Solution:** Configured Vercel's build settings to use `npm install --legacy-peer-deps` (and verified local resolution with `--legacy-peer-deps`), bypassing the strict peer check while preserving all working packages.
- **Verification:** Subsequent build completed successfully on Vercel.

---

### Challenge 8: Single-Page Application Deep Linking 404s
- **Problem:** Direct visits or page refreshes on `/login`, `/me`, or `/admin` when hosted on Vercel returned a 404 Not Found error.
- **Root Cause:** Vercel looks for static files matching the URL path on the edge file system. In an SPA, only `index.html` physically exists.
- **Solution:** Created [vercel.json](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/vercel.json) configuring wildcard rewrite rules:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/" }
    ]
  }
  ```
- **Verification:** Direct navigation to all routes now properly routes to `index.html` and executes client-side routing.

---

### Challenge 9: Typography Evolution for Eye-Catching Masthead
- **Problem:** The default `Archivo` sans-serif font made the title and hero headline blend into standard body text, lacking visual distinction.
- **Solution:** 
  1. Imported **Manufacturing Consent** (designed by Fredrick Brennan) from Google Fonts for the wordmark and the hero headline *"What frustrates you about technology?"*, giving it a traditional newspaper masthead look.
  2. Imported **Josefin Sans** for all general UI, buttons, and form labels, creating a geometric contrast.
- **Files Modified:** `index.html`, `src/index.css`, `src/App.css`.
- **Verification:** Verified in browser screenshots and production bundle build.
