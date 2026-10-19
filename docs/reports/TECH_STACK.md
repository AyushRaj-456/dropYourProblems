# Complete Technology Stack: Drop Your Problems

---

## 1. Technology Classification Matrix

To maintain rigorous technical accuracy, every technology associated with the repository is classified into one of three categories:
1. **Implemented & Active:** Actively executed in development or production.
2. **Configured but Unused:** Present in configuration or files but not invoked by active application runtime.
3. **Merely Mentioned / External:** Documented in discussions or markdown but not present in software dependencies.

---

## 2. Comprehensive Technology Breakdown

### 2.1. Frontend Framework & Runtime

#### **React 19 (`react` ^19.3.1, `react-dom` ^19.3.1)**
- **Status:** Implemented & Active.
- **Why Chosen:** Provides component-based UI composition, declarative state management, and modern concurrent DOM rendering.
- **Where Used:** Entire UI layer under `src/components/`, `src/pages/`, and `src/App.jsx`.
- **Responsibility:** Manages reactive views, input forms, modal dialogs, and component lifecycle.
- **Communication:** Communicates with the DOM via `react-dom/client` in `src/main.jsx`.
- **Replaceability:** High effort to replace. Could technically be replaced by Vue 3, Svelte 5, or Preact, but would require rewriting all JSX components.

#### **JavaScript (ECMAScript 2022+ / ES Modules)**
- **Status:** Implemented & Active.
- **Why Chosen:** Standard language of the web; ES Modules (`"type": "module"`) allow native module resolution without legacy CommonJS bundling overhead.
- **Where Used:** All files in `src/`, `tests/`, and build configuration.
- **Responsibility:** Application logic, service calls, and DOM interactions.
- **Replaceability:** TypeScript was deliberately avoided per project constraints to keep configuration lightweight and dependencies minimal.

---

### 2.2. Build Tools, Bundler & Linters

#### **Vite 8 (`vite` ^8.3.4, `@vitejs/plugin-react` ^6.1.2)**
- **Status:** Implemented & Active.
- **Why Chosen:** Ultra-fast Hot Module Replacement (HMR) powered by native ES modules, instant server start, and optimized production bundling with Rollup.
- **Where Used:** `vite.config.js`, `package.json` scripts (`dev`, `build`, `preview`).
- **Responsibility:** Compiles JSX, injects environment variables, minifies JavaScript and CSS, and builds the `dist/` directory.
- **Replaceability:** Could be replaced by Next.js, Parcel, or esbuild, but Vite is currently the industry gold standard for React SPAs.

#### **Oxlint (`oxlint` ^1.88.0)**
- **Status:** Implemented & Active.
- **Why Chosen:** High-performance, Rust-based JavaScript linter (50-100x faster than legacy ESLint), requiring zero complex configuration plugins.
- **Where Used:** Configured in `.oxlintrc.json` and executed via `npm run lint`.
- **Responsibility:** Static code analysis, catching syntax bugs, unhandled edge cases, and unused variables.
- **Replaceability:** Could be replaced by ESLint or Biome.

---

### 2.3. Styling & Typography

#### **Vanilla CSS & Custom Properties (Design System)**
- **Status:** Implemented & Active.
- **Why Chosen:** Deliberately chosen over Tailwind CSS or CSS-in-JS to eliminate build-step style bloat, maximize style transparency, and strictly enforce the minimalist broadsheet design system.
- **Where Used:** `src/index.css` (design tokens, CSS variables, global resets) and `src/App.css` (component styles, layout grid, typography rules).
- **Responsibility:** Defines color variables (`--bg`, `--text`, `--accent`), 6px border radii, grid layouts, responsive breakpoints, and micro-animations.
- **Replaceability:** Fully portable CSS; no dependencies.

#### **Google Fonts CDN**
- **Status:** Implemented & Active.
- **Fonts Loaded ([index.html](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/index.html)):**
  1. **Manufacturing Consent (by Fredrick Brennan):** Blackletter / Fraktur masthead font used for the site header wordmark and the hero headline *"What frustrates you about technology?"*.
  2. **Josefin Sans:** Geometric, vintage-modern sans-serif used for all body text, navigation, buttons, forms, and cards.
  3. **IBM Plex Mono:** Monospace font used for tags, category chips, dates, and counters.
- **Where Used:** Linked in `index.html` via `<link rel="stylesheet">`.
- **Replaceability:** Fonts could be self-hosted in `public/fonts/` for offline performance or strict privacy compliance.

---

### 2.4. Backend-as-a-Service (BaaS) & Database

#### **Firebase SDK (`firebase` ^13.0.0)**
- **Status:** Implemented & Active.
- **Modules Consumed:**
  - `firebase/app`: Client initialization (`initializeApp`).
  - `firebase/auth`: Authentication state listener, Google OAuth, Email Link sign-in, Anonymous sign-in.
  - `firebase/firestore`: Multi-collection document database operations, atomic batch writes (`writeBatch`), query cursors, and server timestamps.
- **Where Used:** `src/firebase.js`, `src/services/authService.js`, `src/services/problemService.js`, `src/services/contributorService.js`, `src/services/adminService.js`.
- **Replaceability:** Could be replaced by Supabase (PostgreSQL + GoTrue Auth) or Appwrite. However, Firestore was chosen to leverage its zero-maintenance Spark free tier.

#### **Cloud Firestore (NoSQL Database)**
- **Status:** Implemented & Active.
- **Collections:** `problems`, `problems/{id}/votes`, `problems/{id}/reports`, `contributors`, `admins`, `userStats`.
- **Indexes ([firestore.indexes.json](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/firestore.indexes.json)):** Composite indexes supporting combined queries on `hidden + tag + meTooCount` and `hidden + tag + createdAt`.
- **Security Rules ([firestore.rules](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/firestore.rules)):** Server-side declarative authorization rules that restrict reads, validate schemas, and prevent unauthorized writes.

---

### 2.5. Browser APIs & Hardware Integrations

#### **Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)**
- **Status:** Implemented & Active.
- **Why Chosen:** Enables voice-to-text dictation directly inside the browser without incurring API costs or sending audio recordings to third-party cloud servers.
- **Where Used:** `src/components/PostForm.jsx` (`hasSpeech` detection, continuous listening mode).
- **Communication:** Directly interfaces with the client operating system's speech engine (Windows Speech, Apple Dictation, Android Speech).
- **Graceful Degradation:** The *"Speak"* button automatically hides if the visitor's browser does not support the Web Speech API.

#### **HTML5 Canvas API (`HTMLCanvasElement`, `CanvasRenderingContext2D`)**
- **Status:** Implemented & Active.
- **Why Chosen:** Replaces external cloud image processing services (like Cloudinary or AWS Lambda) with client-side computation.
- **Where Used:** `src/utils/imageResize.js`.
- **Responsibility:** Crops contributor profile pictures to 1:1 squares, resizes them to 300x300 pixels, and compresses them to JPEG quality 0.7 (<60KB base64 strings).

---

### 2.6. Routing & State Management

#### **Custom HTML5 History Router ([src/utils/router.jsx](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/src/utils/router.jsx))**
- **Status:** Implemented & Active.
- **Why Chosen:** Avoids the heavy bundle footprint of `react-router-dom` (~35KB gzipped) for a simple 5-route single-page application.
- **Where Used:** `src/App.jsx`, `src/components/Header.jsx`.
- **Responsibility:** Listens to `popstate` events, pushes browser history states via `pushState`, and exports custom `<Link>` component.

#### **Local Storage (`window.localStorage`)**
- **Status:** Implemented & Active.
- **Responsibility:**
  1. Caches voter UIDs (`voted_{uid}`) to prevent duplicate UI clicks across sessions.
  2. Caches reported problems (`reported_{uid}`).
  3. Caches pending passwordless email login addresses (`emailForSignIn`).

---

### 2.7. Hosting, Deployment & Infrastructure

#### **Vercel**
- **Status:** Implemented & Active.
- **Why Chosen:** Automatic Git integration, sub-second edge deployment, automated SSL certificates, and zero configuration setup for Vite SPAs.
- **Configuration ([vercel.json](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/vercel.json)):** Enforces wildcard routing rewrites to `index.html`.

#### **GitHub (`https://github.com/AyushRaj-456/dropYourProblems`)**
- **Status:** Implemented & Active.
- **Responsibility:** Version control, source code hosting, and webhook triggers for production deployment.

---

### 2.8. Testing & Quality Assurance

#### **`@firebase/rules-unit-testing` (^5.0.2) & Node Test Runner (`node:test`)**
- **Status:** Implemented & Active (Development/CI).
- **Why Chosen:** Allows running end-to-end security rule simulations against the official Firebase Local Emulator without touching production databases.
- **Where Used:** `tests/rules.test.js`, executed via `npm run test:rules`.
- **Test Count:** 23 passing tests verifying authentication boundaries, rate limiting, and duplicate vote rejection.

---

## 3. Technology Status Summary

| Technology | Category | Role | Status |
| :--- | :--- | :--- | :--- |
| **React 19** | Frontend Framework | UI Component Tree | **Active** |
| **Vite 8** | Build Tool / Bundler | Dev server & Rollup build | **Active** |
| **Vanilla CSS** | Styling System | Design Tokens & Responsive UI | **Active** |
| **Manufacturing Consent** | Typography | Newspaper Masthead & Hero Font | **Active** |
| **Josefin Sans** | Typography | Primary Body & UI Font | **Active** |
| **IBM Plex Mono** | Typography | Technical Metadata Font | **Active** |
| **Firebase Auth** | Identity Provider | Anonymous, Google & Email Link | **Active** |
| **Cloud Firestore** | NoSQL Database | Realtime data persistence | **Active** |
| **Firestore Rules** | Security Engine | Backend authorization logic | **Active** |
| **Web Speech API** | Browser Native API | Voice dictation | **Active** |
| **HTML5 Canvas** | Browser Native API | Client image compression | **Active** |
| **Vercel** | Hosting Platform | Global Edge CDN & SSL | **Active** |
| **Oxlint** | Static Analysis | Rust-based linter | **Active** |
| **SAMPLE_PROBLEMS** | Mock Data ([src/data/sampleData.js](file:///c:/Users/Ayush/Desktop/Codes/drop_your_Problem/src/data/sampleData.js)) | Initial prototype data | **Configured but Unused** |
| **Firebase Hosting** | Hosting Platform | Defined in `firebase.json` | **Configured but Unused** (Vercel is active) |
| **AI Models (LLMs)** | Machine Learning | Mentioned in tags/docs | **Not Implemented / Nonexistent** |
| **AWS S3 / Cloud Storage** | Object Storage | Replaced by Canvas base64 | **Not Implemented / Replaced** |
