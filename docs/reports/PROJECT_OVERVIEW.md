# Project Overview: Drop Your Problems

---

## 1. Executive Summary

**Drop Your Problems** is an open, minimalist, public problem-discovery platform. It enables everyday computer and phone users, developers, knowledge workers, and students to document and share real-world frustrations, workflow friction, broken software behaviors, and unmet technical needs they encounter while using technology.

The core philosophy of the application is:
> *Great products and tools are born from genuine, unresolved human frustrations.*

Rather than starting with speculative startup ideas or artificial product hypotheses, software developers, indie hackers, designers, and students can explore the **Drop Your Problems** live public board to discover authentic problems worth solving.

---

## 2. The Problem It Solves

### The Dilemma for Builders
Builders (software engineers, open-source maintainers, indie makers) frequently spend months creating products nobody needs because they start with a *solution* in search of a problem. Discovering real user pain points traditionally requires tedious user interviews, trawling through customer support forums, or browsing unstructured social media complaints.

### The Dilemma for Everyday Users
Every day, people struggle with:
- State government portals expiring active sessions every two minutes and losing entered data.
- Banking apps disabling copy-paste on account numbers and causing errors.
- Coding assistants hallucinating imports across monorepos.
- Browser tabs mixing across workspaces after unexpected crashes.

Users rarely have a low-friction place to drop these complaints without signing up for complex issue trackers (like Jira or GitHub Issues) or writing long forum essays (like Reddit or Product Hunt).

### The Solution Provided
**Drop Your Problems** removes all barrier to entry:
1. **Zero-friction problem dropping:** Anyone can post a problem immediately without prior account creation or password setup (utilizing seamless anonymous sessions).
2. **Curated problem categorization:** Categorized by modern technology sectors (Websites, AI Tools, Developer Tools, Mobile Apps, Browser Extensions, etc.).
3. **Verified community upvoting:** Real users authenticate to upvote problems they also suffer from, quantifying the demand.
4. **Recognition via Contributors:** When a submitted problem reaches 10 verified upvotes, the author earns contributor status and is showcased on the platform.
5. **Project Lifecycle Visibility:** Admins mark problems as *Open*, *Building*, or *Launched*, keeping the community updated when someone builds a solution.

---

## 3. Intended Users & Personas

The platform connects three primary audiences:

| User Persona | Goals on Platform | Interaction Flow |
| :--- | :--- | :--- |
| **Everyday Technology Users & Complainants** | Voice specific annoyances with tools, software, websites, or apps; validate that others experience the same friction. | Opens site, speaks or types their frustration, picks a category, drops the problem in seconds. |
| **Upvoters & Community Members** | Signal that a problem is widespread and urgent; validate existing submissions. | Browses the board, filters by category, logs in with Google/Email, casts an upvote. |
| **Builders, Founders & Indie Hackers** | Discover high-value, validated software ideas backed by real demand and upvote counts. | Sorts by *"Most upvotes"*, inspects user-reported workarounds, builds a fix, and monitors the board. |
| **Platform Administrators / Curators** | Moderate content, hide spam, update problem statuses (*Open* → *Building* → *Launched*). | Accesses the protected `/admin` console, reviews moderation queues, manages contributor entries. |

---

## 4. Key Implemented Features

### 4.1. Fast Problem Submission (Text & Speech)
- Single-field textarea (max 600 characters) designed for quick capture.
- **Integrated Browser Web Speech API:** Users can dictate their problem hands-free using their device microphone (no third-party speech API key required).
- **Optional Structured Context:** Users can expand an optional drawer to specify the exact product/tool name, frequency of occurrence, and current workaround.
- **Anonymous Posting:** Guests can post without an initial login step.

### 4.2. Category Filtering & Real-Time Sorting
- 12 technology-focused categories:
  - *Websites*, *Browser Extensions*, *Mobile Apps*, *AI Tools*, *Developer Tools*, *Productivity*, *Gaming*, *Social Media*, *Digital Services*, *Hardware*, *Accessibility*, *Other*.
- Dual sorting options:
  - **Most upvotes:** Prioritizes highest community pain points.
  - **Newest:** Displays latest incoming frustrations chronologically.

### 4.3. Verified Upvoting System
- Terminology strictly standardized to **"Upvote"**.
- Non-anonymous authentication required to cast an upvote.
- Instant client feedback and inline notice directing unauthenticated guests to `/login`.
- One-vote-per-user constraint enforced deterministically at the database level using Firebase UIDs.
- Self-upvotes by the problem author are strictly blocked.

### 4.4. Contributor Milestone System
- Automatic qualification when a submitted problem reaches **10 verified upvotes**.
- Verified problem author can claim their contributor card by providing their name and an optional photo.
- Client-side canvas compression downsizes user photos to 300x300 square JPEGs (<60KB base64 strings) stored directly in Firestore, requiring zero paid Cloud Storage buckets.

### 4.5. Hybrid Authentication Flow
- Silent anonymous session initialized on first visit so visitors have a stable author identity.
- **Google OAuth Popup Sign-In.**
- **Passwordless Email Magic Link Sign-In.**
- Seamless account upgrading: When an anonymous user logs in with Google or Email, their anonymous UID is linked to their permanent account, transferring ownership of their earlier posts.

### 4.6. Author Problem Management (`/me`)
- Dedicated view where authenticated users can view all problems they personally dropped.
- In-place editing of text, categories, product names, and workarounds.
- Direct problem deletion.

### 4.7. Admin Moderation & Lifecycle Dashboard (`/admin`)
- Accessible only to accounts with an explicit record in the `/admins` Firestore collection.
- Status updates: Transition problems from `open` → `building` → `launched`.
- Moderation tools: Hide spam or abusive posts; delete malicious records; review reported problems.

---

## 5. What the Application Can and Cannot Do

### What It Can Do (Current Capabilities)
- Serve real-time, paginated problem boards with responsive mobile/desktop UI.
- Handle speech-to-text input across Chrome, Edge, and Safari with Web Speech support.
- Authenticate users via Google and Email Magic Links.
- Enforce strict database rules preventing duplicate votes, direct counter inflation, and unauthorized edits.
- Compress and store user avatars without external media services.
- Protect administrative routes from unauthorized access.

### What It Cannot Do (Current Architectural Boundaries)
- **No Full-Text Search Index:** Problems cannot be searched by arbitrary keywords; exploration relies on category tags and upvote sorting.
- **No In-Platform Comments or Discussion Threads:** The application intentionally maintains a quiet, clean board without distracting comment sections.
- **No Native Push or Email Notifications:** Users are not sent email notifications when their problem is upvoted or claimed; progress is viewed on the board.
- **No Direct Message or User-to-User Chat:** Builders contact contributors externally or build in public.

---

## 6. Design & Aesthetic Identity

The application strictly implements an editorial, minimalist newspaper aesthetic:
- **Masthead & Hero Typography:** Rendered in **Manufacturing Consent** (designed by Fredrick Brennan), evoking historic newspaper mastheads and authoritative broadsheet printing.
- **Body & Interface Typography:** Rendered in **Josefin Sans** (Google Fonts), providing geometric, vintage-modern readability.
- **Metadata & Tags:** Rendered in **IBM Plex Mono** for technical crispness.
- **Palette:** Soft newsprint canvas (`#F2F2EE`), rich deep ink (`#111111`), hairline borders (`#D6D7D0`), and a single electric cobalt blue accent (`#2540E8`) reserved for primary action buttons.
- **Rules:** Zero emojis, zero icon fonts, text-only buttons, and consistent 6px corner radii throughout.
