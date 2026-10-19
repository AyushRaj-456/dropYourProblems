# Drop Your Problems: start here

A web platform where people share real-world frustrations and limitations they encounter while using technology, others upvote, and builders discover problems worth solving. Posters of problems that reach 10 upvotes can become listed Contributors.

## What is in this pack
- `CLAUDE.md`: the rules Claude Code must follow
- `docs/product.md`: what to build and for whom
- `docs/design.md`: the exact visual system
- `docs/architecture.md`: Firebase setup, data, security rules, free-plan limits
- `docs/plan.md`: build phases, each with a "Done when" check
- `docs/launch.md`: how to get the first real posts
- `design-reference/index.html`: the approved design as plain HTML. Open it in a browser.

## Your steps
1. Unzip into an empty folder and open it in Claude Code.
2. Paste this as the first prompt:

   > Read START_HERE.md, CLAUDE.md and everything in docs/ and design-reference/. Then do phase 0 of docs/plan.md. Stop when its "Done when" is true and tell me exactly what you need from me.

3. Create one free Firebase project with your Google account, on the Spark plan. When Firebase offers "Upgrade to Blaze", skip it. Put the web config in `.env`, never in git.
4. Go one phase at a time. Test each phase on your phone before the next.

## Rule of the whole project
Everything is free. No paid API, no paid service, no card. Stay on Firebase's Spark plan. That means **no Cloud Storage and no Cloud Functions**; the docs are built around that.
