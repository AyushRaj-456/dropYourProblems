# Developer Guide: Setup, Maintenance & Operations

---

## 1. Prerequisites

Before setting up **Drop Your Problems** locally, ensure your machine has:
- **Node.js:** v18.0.0 or higher (recommended: v20.x or v22.x LTS).
- **npm:** v9.x or higher.
- **Git:** Installed and configured with your GitHub credentials.
- **Java Runtime (Optional, for rules testing only):** JRE 11+ is required by Firebase Local Emulator Suite if executing `npm run test:rules`.

---

## 2. Installation & Local Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/AyushRaj-456/dropYourProblems.git
cd dropYourProblems
```

### Step 2: Install Dependencies
Because `@firebase/rules-unit-testing` has a strict peer dependency on `firebase@12.x` while the project uses `firebase@13.x`, use the `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

### Step 3: Configure Environment Variables
Copy the example environment template:
```bash
cp .env.example .env
```
Open `.env` and paste your Firebase configuration parameters:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=drop-your-problems.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=drop-your-problems
VITE_FIREBASE_STORAGE_BUCKET=drop-your-problems.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=70464241376
VITE_FIREBASE_APP_ID=1:70464241376:web:...
```

---

## 3. Development Commands Reference

| Command | Action | Notes |
| :--- | :--- | :--- |
| `npm run dev` | Launches local Vite development server | Opens by default at `http://localhost:5173/` with instant HMR |
| `npm run build` | Compiles production assets into `dist/` | Runs Vite Rollup bundler; checks for syntax and type errors |
| `npm run preview` | Previews the compiled `dist/` build locally | Tests production bundle performance and routing |
| `npm run lint` | Runs Oxlint linter | Super-fast static code analysis across JavaScript and JSX |
| `npm run test:rules` | Runs Firestore security rules unit tests | Launches Firebase Emulator on port 8080 and runs 23 tests |

---

## 4. Key Workflows for Contributors

### How to Add a New Category Tag
Categories are strictly validated at both the frontend and database levels. To introduce a new category (e.g., `"Cloud Services"`):
1. **Frontend:** Open [src/data/sampleData.js](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/src/data/sampleData.js) and add the category to `TAGS` and `FORM_TAGS`.
2. **Backend / Database Rules:** Open [firestore.rules](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/firestore.rules#L21-L28) and append the category string to `isValidTag()`:
   ```javascript
   function isValidTag(tag) {
     return tag in [
       'Websites', 'Browser Extensions', 'Mobile Apps', 'AI Tools', 'Developer Tools',
       'Productivity', 'Gaming', 'Social Media', 'Digital Services', 'Hardware',
       'Accessibility', 'Other', 'Cloud Services',
       'Canteen', 'Academics', 'Hostel', 'Transport', 'Placements', 'Money'
     ];
   }
   ```
3. Deploy the updated security rules to Cloud Firestore.

### How to Provision an Admin Account
To grant an account access to the moderation dashboard at `/admin`:
1. Have the user sign in once to the application via `/login` using Google or Email.
2. In the [Firebase Console](https://console.firebase.google.com/), open **Firestore Database**.
3. Create a collection named `admins` (if it does not already exist).
4. Add a document where the **Document ID** is the user's Firebase UID. The document data can be `{ "role": "admin" }`.
5. The user can now navigate to `/admin` and view moderation controls.

### How to Deploy Updates to Production
The production deployment pipeline is automated through Vercel:
1. Commit your changes locally:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```
2. Push to the `main` branch:
   ```bash
   git push origin main
   ```
3. Vercel automatically detects the push, runs `npm install --legacy-peer-deps`, compiles the build via Vite, and updates the live site with zero downtime.

---

## 5. Troubleshooting Common Failures

### Issue 1: Google Login Fails with `auth/unauthorized-domain`
- **Cause:** The live Vercel domain has not been whitelisted in Firebase Auth.
- **Fix:** In Firebase Console → Authentication → Settings tab → **Authorized domains**, click **Add domain** and enter your Vercel URL (e.g. `drop-your-problems.vercel.app`).

### Issue 2: Direct Page Refresh Returns 404 on Vercel
- **Cause:** Vercel requires wildcard SPA routing.
- **Fix:** Ensure [vercel.json](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/vercel.json) is present in the repository root with:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/" }]
  }
  ```

### Issue 3: `FirebaseError: The query requires an index`
- **Cause:** Complex multi-property Firestore queries (`hidden == false` + `tag == X` + `orderBy('meTooCount', 'desc')`) require a composite index.
- **Fix:** The repository includes a pre-configured [firestore.indexes.json](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/firestore.indexes.json). Deploy indexes using `firebase deploy --only firestore:indexes` or click the direct creation link provided in the browser developer console.
