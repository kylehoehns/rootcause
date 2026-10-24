# 2026-10-24: Merged is not shipped

**What happened**

- **Three pages in under an hour.** The map (#6 → #22), the county page (#7 → #24) and the drought comparison (#9 → #25) each merged after one approval. #6 asked one live question first (may it delete a second old test?), and was building again a minute after the answer.
- **The deploy was failing the whole time.** Every merge to `main` since #19 had failed to deploy: four runs over eight hours, while the pane showed every ticket green. `publish-live` died on a blank premium amount in some year of the real USDA files. The offline fixtures had no blanks, so `just check` stayed green. A follow-up the factory's reviewer filed from #19 (#20) had predicted exactly this; it sat in `needs-triage`.
- **The fix took two tries.** The agent's fix (#27 → #28) passed every offline check, and its summary said plainly that the sandbox had no network, so it couldn't prove the live path. Running the live publish on the branch before merging found a second failure: 42 livestock and "All Other Crops" groups that have no premium at all. Those groups are now left out (the UI already treats a missing premium as no ratio), a fixture row reproduces the case, and the deploy went green.
- **Real data found what fixtures hid.** Once the live site had real data: the county page said "Polk County County" (#32), the 44 cause names included spelling variants and insurance-plan names posing as causes (#33), and two county codes weren't counties (#36). All three went back in as tickets the same hour, and the two data PRs were run against the live sources before approval: 31 clean causes, exactly 99 counties, Iowa 2012 still 2.23.
- **A guardrail overruled the maintainer.** On #32 the agent asked live whether it could change an existing Playwright journey; the maintainer said yes; the repo's own edit hook still denied it, twice. The risk gate already sends any change to an existing journey to the maintainer, so the hook was a second lock with no key. It now defers to the gate (#35), and AGENTS.md says "ask first" instead of "never".

**Numbers so far (rootcause)**

- 11 factory PRs opened, 10 merged, 0 reverted. 4 deploys failed silently before anyone looked.

**Struggled with**

- **The factory watches PRs, not `main`.** A red deploy after merge shows nowhere: not on a PR, not in the pane. "Merged" was being read as "shipped".
- **Follow-ups need triage to matter.** The right warning existed hours before the failure; nobody reads `needs-triage` on a schedule.
- **Rules in two places drift apart.** The hook and the risk policy each encoded "journeys are protected", differently, and the stricter one won even after the person both were protecting said yes.
- **The maintainer can't approve a PR opened under their own account**, which is how hand-made fixes go up. Those merge on an explicit go-ahead instead.

**Slide material**

- "All green on the board, and the site hadn't deployed in eight hours."
- "The agent said what it couldn't verify. That sentence is why the second bug was caught before merge, not after."
- "Real data is the best reviewer: three bugs in the first five minutes of looking at the live page."
