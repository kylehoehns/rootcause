# 2026-10-24: Seeing inside the factory

**What happened**

- **The factory was a black box.** It ran in a terminal in the background, and the only way to know what an agent was doing was to ask. The maintainer wanted to look in from where they already work: inside Claude Code.
- **A pane beside the chat.** A Claude Code mod (`factory-watch`) reads what the factory writes to `~/.cache/factory/` (running sessions, a status file, an event log) and GitHub, and shows it in four tabs: **Now** (what each agent is doing), **Inbox** (what's waiting on a person), **Board** (every ticket by stage) and **Machine** (the factory process itself). Everything is keyboard-driven.
- **Agents ask, live, first.** When an agent needs a decision it now pipes one question at a time to a small `ask` helper and waits up to nine minutes for an answer from the pane. If nobody answers, it falls back to the old path: questions posted on the ticket, `needs-info`, stop. A person who is around can unblock it in seconds; one who isn't costs nothing extra.
- **The factory became controllable.** `bin/factoryctl start|stop|restart|poll|status`: one instance (a pidfile lock), a graceful stop that lets running agents finish, and orphaned tickets released on start. The pane's Machine tab drives the same commands.
- **The pane was designed by a panel of agents.** Personas reviewed the first version, two competing designs were judged (a calm console beat a mission-control dashboard by one point), a spec of 51 acceptance criteria was written, built, and checked by verifiers that found 8 failures, all fixed in one round.

**Struggled with**

- **Keys belong to the host.** Left and right arrows in a pane are Claude Code's, not the pane's (right arrow offers to background the session), so navigation had to be redesigned around up/down, Tab and letter hotkeys.
- **Irreversible actions from a keyboard** need a second press. Approving a PR and stopping the factory both arm first, then act.
- **A precise question is still a question.** #6's ticket already said one old test could be deleted; the agent found a second one testing the same page and asked about that too rather than assume. Answered in a sentence, re-queued, building again a minute later.

**Slide material**

- "The factory doesn't need a dashboard product. It needs to write down what it's doing, and something you already have open to read it."
- "Answer the agent in the moment if you're there; it falls back to the ticket if you're not."
