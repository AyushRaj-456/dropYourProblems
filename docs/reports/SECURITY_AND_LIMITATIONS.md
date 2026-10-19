# Security Architecture, Technical Debt & Limitations: Drop Your Problems

---

## 1. Security Architecture & Threat Model

Because **Drop Your Problems** uses a direct client-to-database connection (Firebase Client SDK communicating directly with Cloud Firestore), the entire security perimeter relies on **Cloud Firestore Security Rules** ([firestore.rules](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/firestore.rules)) and **Firebase Authentication**.

```mermaid
graph TD
    UserRequest[Incoming Client Write/Read Request] --> TLS[TLS 1.3 Encryption]
    TLS --> TokenAuth{Firebase Auth JWT Verification}
    
    TokenAuth -->|Invalid/Expired Token| Reject401[401 Unauthorized]
    TokenAuth -->|Valid Token| RulesEngine[Firestore Security Rules Engine]
    
    subgraph Security Rules Gates
        RulesEngine --> SchemaValidation{Schema & String Bounds Check}
        SchemaValidation -->|Fails| Reject403[403 PERMISSION_DENIED]
        SchemaValidation -->|Passes| AuthLevel{Auth Level: Fully Authenticated?}
        AuthLevel -->|Anonymous for Upvotes/Claims| Reject403
        AuthLevel -->|Non-Anonymous| DuplicateCheck{!exists(votes/uid) ?}
        DuplicateCheck -->|Already Voted| Reject403
        DuplicateCheck -->|Unique Vote| Commit[Atomic Database Commit]
    end
```

---

## 2. Implemented Security Controls

### 2.1. Authentication Boundaries
- **Ephemeral Anonymous Sign-In:** Protects against unauthenticated network spam by forcing visitors to obtain a cryptographic Firebase UID before posting.
- **Strict Distinction for Upvoting:**
  ```javascript
  function isFullyAuthenticated() {
    return isSignedIn() && request.auth.token.firebase.sign_in_provider != 'anonymous';
  }
  ```
  Anonymous users can read and drop problems, but cannot upvote, claim contributor profiles, or access admin consoles.
- **Account Linking:** Prevents account takeover by using `linkWithPopup` and `linkWithCredential`, linking existing anonymous sessions to Google or Email identities.

### 2.2. Defense Against Common Vulnerabilities

| Threat | Risk Level | Implemented Mitigation | Effectiveness |
| :--- | :--- | :--- | :--- |
| **Direct Counter Manipulation** | Critical | Firestore rules enforce `request.resource.data.meTooCount == resource.data.meTooCount + 1` and `affectedKeys().hasOnly(['meTooCount'])`. Clients cannot increment by arbitrary amounts. | **Verified (Tested)** |
| **Duplicate Voting** | High | Every vote creates an immutable subcollection document at `/problems/{id}/votes/{uid}`. The problem update rule requires `!exists(votes/{uid})`. | **Verified (Tested)** |
| **Self-Upvoting** | Medium | Rule enforces `request.auth.uid != resource.data.authorUid`. Authors cannot upvote their own submissions. | **Verified (Tested)** |
| **Cross-Site Scripting (XSS)** | Critical | React automatically escapes JSX expressions. Form values are rendered via text nodes, not `dangerouslySetInnerHTML`. | **High** |
| **Cross-Site Request Forgery (CSRF)** | Low | Firebase SDK communicates via gRPC WebSockets and CORS-restricted APIs using bearer tokens; session cookies are not used for ambient authentication. | **High** |
| **Posting Floods / Rate Limiting** | Medium | Firestore rule checks `/userStats/{uid}` timestamp. Enforces a mandatory 30-second cooldown between problem submissions. | **Verified (Tested)** |
| **Payload Bloat / DoS** | Medium | Text length restricted to $\le 600$ characters. Contributor photos capped at 65,000 bytes in rules. | **Verified (Tested)** |
| **Impersonation in Contributors** | High | Rule validates `request.auth.uid == get(...).data.authorUid` and verifies `meTooCount >= 10`. Upvoters cannot claim authorship. | **Verified (Tested)** |

---

## 3. Confirmed Limitations & Technical Debt

### 3.1. Large Frontend Bundle Size (Vite Warning)
- **Observation:** `npm run build` generates a single JavaScript chunk:
  ```text
  dist/assets/index-Bg8KWWpp.js   841.55 kB │ gzip: 252.07 kB
  (!) Some chunks are larger than 500 kB after minification.
  ```
- **Root Cause:** All Firebase SDK libraries (`@firebase/auth`, `@firebase/firestore`), React, and application views are bundled into a single monolithic bundle without dynamic code splitting.
- **Impact:** First Contentful Paint (FCP) on slow 3G mobile connections can experience a 1–2 second delay while parsing 840KB of JavaScript.
- **Remedy:** Implement dynamic `import()` for `/admin` and `/login` routes in `src/App.jsx`.

### 3.2. Administrative Role Provisioning
- **Observation:** In `firestore.rules`:
  ```javascript
  match /admins/{uid} {
    allow read: if isAuthor(uid);
    allow write: if false;
  }
  ```
- **Impact:** Client code cannot promote any user to an admin. An administrator document must be created manually inside the Firebase Console by adding a document with ID = user UID to the `admins` collection.
- **Remedy:** This is safe for a small platform, but as the team grows, a secure Cloud Function or CLI script using Firebase Admin SDK is recommended for role assignment.

### 3.3. Unused Prototype Data
- **Observation:** `src/data/sampleData.js` contains `SAMPLE_PROBLEMS` (4 items) and `SAMPLE_CONTRIBUTORS` (3 items).
- **Impact:** These arrays are never imported by any active application component (only `TAGS` and `FORM_TAGS` are used), adding minor dead code to the repository.
- **Remedy:** Delete `SAMPLE_PROBLEMS` and `SAMPLE_CONTRIBUTORS` from `sampleData.js`.

### 3.4. Lack of React Component Unit Testing
- **Observation:** While `tests/rules.test.js` provides 23 unit tests for the database security layer, there are no Vitest or React Testing Library suites verifying UI state transitions (e.g. form submission reset, modal open/close, error banner timeouts).
- **Remedy:** Add Vitest and `@testing-library/react` to test client-side rendering.

### 3.5. Anonymous Session Accumulation in Firebase Auth
- **Observation:** Every new incognito tab or visitor automatically registers an anonymous account in Firebase Auth.
- **Impact:** Over time, thousands of dormant anonymous accounts will appear in the Firebase Authentication dashboard. While free on the Spark plan, it creates user directory clutter.
- **Remedy:** Set up a scheduled Firebase Extension or cleanup script to purge unlinked anonymous accounts older than 30 days.

---

## 4. Prioritized Recommendations Matrix

| Recommendation | Urgency | Effort | Impact |
| :--- | :--- | :--- | :--- |
| **Deploy Security Rules to Cloud Firestore** | **High** | 2 min | Mandatory to ensure Cloud Firestore enforces rules in production |
| **Add Vercel Domain to Firebase Authorized Domains** | **High** | 1 min | Mandatory for Google Sign-In to function on live URL |
| **Code-split Admin and Login Routes** | Medium | 1 hour | Reduces main bundle size from 840KB to ~400KB |
| **Clean up unused sample data in `sampleData.js`** | Low | 5 min | Removes dead code |
| **Introduce Vitest for React Components** | Low | 1 day | Prevents regressions in UI logic |
