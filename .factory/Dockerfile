# The factory's sandbox image for this repo (factory-kit builds it with `npm run build-images`): what an agent gets,
# and nothing else. mise installs the pinned Python, Node, uv, pnpm and just from the repo's mise.toml on first use;
# Chromium's system libraries are installed here because that needs root.
# Deliberately no gh and no GitHub credentials: agents never talk to GitHub.
FROM ubuntu:24.04

RUN apt-get update \
  && apt-get install -y --no-install-recommends git curl jq ca-certificates unzip xz-utils libatomic1 \
  && rm -rf /var/lib/apt/lists/*

ENV MISE_VERSION=v2026.10.18 MISE_INSTALL_PATH=/usr/local/bin/mise MISE_YES=1
RUN curl -fsSL https://mise.run | sh

# Playwright's Chromium needs these system libraries; the browser itself is downloaded into a cache at run time.
RUN mise exec node@26 -- npx -y playwright@1.64.0 install-deps chromium && rm -rf /root/.local/share/mise /var/lib/apt/lists/*

# Match the host user's UID/GID so files in the bind-mounted worktree keep the right owner.
ARG AGENT_UID=1000
ARG AGENT_GID=1000
RUN userdel -r ubuntu 2>/dev/null || true \
  && (getent group "$AGENT_GID" || groupadd -g "$AGENT_GID" agent) \
  && useradd -o -u "$AGENT_UID" -g "$AGENT_GID" -m -d /home/agent -s /bin/bash agent
USER ${AGENT_UID}:${AGENT_GID}

RUN curl -fsSL https://claude.ai/install.sh | bash -s 2.1.307
ENV PATH="/home/agent/.local/share/mise/shims:/home/agent/.local/bin:$PATH"
# The repo's mise.toml is trusted: the sandbox only ever checks out this repo.
ENV MISE_TRUSTED_CONFIG_PATHS=/home/agent/workspace

WORKDIR /home/agent
# Sandcastle bind-mounts the git worktree at /home/agent/workspace and runs the agent there.
ENTRYPOINT ["sleep", "infinity"]
