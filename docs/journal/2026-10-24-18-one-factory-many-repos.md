# 2026-10-24: One factory, many repos

**What happened**

- **The factory left the repo it was born in.** Everything that wasn't rsvp-factory-specific moved to [factory-kit](https://github.com/kylehoehns/factory-kit): the loop, the prompts, the risk gate and the second opinion (as reusable workflows pinned at `@v1`). The kit is TypeScript only, runs on Node 26 with no build step, and is linted and formatted with Biome. The Python risk gate was ported so a consumer doesn't need two runtimes.
- **Each repo describes itself in `.factory/`.** `config.yml` holds the done command, the risk tiers, the deny paths and the maintainers; `Dockerfile` is the sandbox the agents run in. The factory reads both from `origin/main`, so a change to a repo's rules goes through review like any other change. It's deliberately not under `.github/`.
- **One loop now watches two repos** with a shared work-in-progress limit. rsvp-factory moved onto the kit (#89), dropped CLAUDE.md since Claude Code reads AGENTS.md (#90), and switched to a generically named GitHub App (#91), all with CI staying green.
- **A second, very different repo.** rootcause is a monorepo for Iowa crop-insurance losses and drought: dbt + DuckDB build one JSON file per screen, a Vite/React page reads them, `contracts/` holds the JSON Schemas both sides agree on, and it deploys to free Cloudflare static hosting. The hand-built part was the bare minimum: one seed row flowing all the way to one live page.
- **A spec, then seven tickets.** The first spec (#2) was grilled into four data tickets and three page tickets, linked with "blocked by". The factory took the four data tickets (#11, #14, #15, #19). Each merged in 10–25 minutes after the maintainer's approval, since every one of them touched `contracts/` and so was high risk.

**Numbers so far (rootcause)**

- 4 factory PRs, 4 merged, 0 reverted. 6 follow-up issues filed by the factory from review findings it judged out of scope.

**Struggled with**

- **Fixtures aren't the world.** Five of the six follow-ups say the same thing in different words: `just check` runs offline against three-county fixtures, so nothing proves the real 2001–now downloads have the same shape, or that all 99 counties arrive. A web app's tests can run the real thing; a data pipeline's tests can't, cheaply. The reviewers noticed every time and filed it rather than guessing.
- **Kit bugs land everywhere at once.** A refactor made the kit's comment helper call itself; the stack overflow swallowed a ticket's questions. Fixed with a fake `gh` in the kit's tests, but it showed that a shared factory needs its own tests more than a single-repo one did.
- **Restarting the factory killed a running agent**, leaving its ticket labelled in-progress forever. The kit now releases orphaned tickets on start and only restarts when idle (entry 19).
- **Setup on a new repo is per-repo work**: the second opinion failed on rootcause until its GitHub App was installed there, and a cache bind mount broke executable bits in the sandbox (#10).

**Slide material**

- "Same factory, different stack: a Spring Boot service and a dbt + React monorepo, one loop, one config file each."
- "In a data repo, the tests pass on fixtures. The reviewer's recurring note was: the real data has never been through this."
