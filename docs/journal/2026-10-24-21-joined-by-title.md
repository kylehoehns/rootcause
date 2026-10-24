# 2026-10-24: Joined by title

**What happened**

- **A green PR waited four hours.** #34 (cause names) had green CI, a passing second opinion and a low tier, and sat unmerged from mid-afternoon to evening. One review thread was still open. The factory found threads by their bold title, and the reviewer had written `?cause=` in backticks in the thread but not in the JSON title, so the factory never closed it. The pane said "idle: nothing ready" the whole time.
- **The fix was one writer, joined by ID.** Two systems wrote each finding: the second opinion posted the thread, and separately wrote the finding as JSON; the factory joined them by title. Now the second opinion only writes its summary, and the factory posts every thread itself and keeps the ID GitHub returns (factory-kit v1.2.0). The independent reviewer lost its write access to the PR as a side effect. The review fixer now answers findings by number, not by copying titles.
- **The factory says why a PR waits.** Each time the reason changes, an event like "PR #34: waiting: unresolved review threads" goes to the pane.
- **Triage, then a batch.** Of 13 follow-ups: 2 were already done (the live publish runs on every deploy; deep links already worked), 1 was folded into another, 7 went to the factory, and 3 wait. One ticket asked a question first (drop blank drought rows, or change the published schema?); the answer took one line. Six of the seven merged as low risk within about an hour, the seventh after the re-run below, and every deploy went green.
- **A second opinion failed without a word.** On #49 the reviewer hit a denied tool call, ended after six turns and posted nothing. Its status said "no readable second opinion", but the pane only said "not low tier, and no maintainer approval". A re-run passed, and the PR merged itself.

**Numbers so far (rootcause)**

- 18 factory PRs opened, 18 merged, 0 reverted. 4 deploys failed silently, all before entry 20; none since.

**Struggled with**

- **Joins by free text break quietly.** Anything a model types twice will differ eventually. If two records have to match, one system should write both, or store an ID.
- **The waiting reason was true but not the cause.** "No maintainer approval" was correct, but the real problem was that the second opinion had errored. The factory doesn't retry an errored second opinion yet.
- **Hand-made changes to the kit have no factory around them.** The kit isn't built by the factory, and a setup step done by hand broke the factory's restart and slipped one stray file into a commit. Both were caught and fixed within minutes, but by a person looking, not a check.

**Slide material**

- "Four hours, one backtick."
- "Two writers joined by title will drift. One writer joined by ID won't."
- "Seven tickets triaged, seven merged, seven green deploys, one question asked."
