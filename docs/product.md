# Product

## Purpose
A platform where people share real-world problems, limitations, frustrations, and difficulties they encounter while using technology. Genuine problems collected from real users inspire developers, students, indie hackers, startups, and builders to build meaningful technological solutions.

## Users
Anyone who regularly uses digital products and technology: working professionals, students, developers, freelancers, content creators, gamers, designers, entrepreneurs, small business owners, and everyday internet users.

## v1 features
1. **Post a problem.** Text box, optional voice, category, optional name, date and time added automatically. Optional extras behind "Add more detail": product or tool involved, how often (daily, weekly, rarely, every time I use it), what they do today (workaround).
2. **Board.** List of problems. Filter by category. Sort by Most upvotes or Newest.
3. **Upvote.** One authenticated vote per person. Shows the count. Requires user to be logged in.
4. **Report.** Flags a post for review.
5. **Login (optional for posting, required for upvoting).** Google and email link.
6. **My problems.** Everything this person posted.
7. **Contributors.** Section on the site listing people whose problem reached 10 upvotes.
8. **Status labels.** Open (not shown), Building, Launched. Set only by the admin.
9. **Admin page.** Hide posts, remove contributors, set status.
10. **Discussion.** Separate thread per problem. Anyone can read, only logged-in users can write. Messages show author name, timestamp, and a "POSTER" badge for the problem creator. 10s cooldown between messages.

Categories (fixed list): Websites, Browser Extensions, Mobile Apps, AI Tools, Developer Tools, Productivity, Gaming, Social Media, Digital Services, Hardware, Accessibility, Other.

## Identity: anonymous first, login to keep
Every visitor is signed in anonymously and silently. That identity lives in their browser. Logging in later upgrades the same identity, so nothing posted before is lost.

| | Not logged in | Logged in |
|---|---|---|
| Post a problem | Yes | Yes |
| Upvote | No, must log in first | Yes |
| Read discussion | Yes | Yes |
| Write in discussion | No, must log in first | Yes |
| Report | Yes | Yes |
| Edit or delete own post | Yes, but only in this browser | From any device |
| "My problems" | Only in this browser | From any device |
| Become a Contributor | No, must log in first | Yes |

Note shown on the post form, near the Drop it button:
"You can post without logging in. But you may lose access to your post if you close this window or clear your browser. Log in first to keep it and to get the chance to become a Contributor."

After an anonymous post, show a short confirmation: "Posted. It is saved in this browser only. Log in to keep it for good." with a Log in link.

Known limit: if someone who already has an account logs in on a browser that holds anonymous posts, those posts cannot be moved into the existing account. Tell them plainly and encourage logging in before posting.
43: 
44: ## Contributor rule
45: - The threshold is 10 upvotes, kept as one constant shared by the app and the security rules.
46: - The poster's own tap does not count.
47: - When a logged-in poster's problem reaches the threshold, they see a prompt on that post: add a display name (required) and a photo (optional), then submit.
48: - The post then appears in the Contributors section with photo, name, problem title and upvote count.
49: - An anonymous poster who reaches the threshold sees "Log in to claim this."
50: - Admin can remove any contributor.
51: - Photos are resized in the browser to a small square (about 300px) and stored as a compressed text string inside the contributor record, well under 60 KB. There is no file storage.
52: 
53: ## Not in v1
54: Images on problems, notifications, search, dark mode, multiple colleges.
55: 
56: ## v2 candidates
57: Restrict to college email, weekly top-problems digest, public "built because of this problem" page.
58: 
59: ## Success
60: - 30 real problems posted in the first week
61: - Top 5 problems have 20 or more Upvotes each
62: - At least one problem moves to Building
