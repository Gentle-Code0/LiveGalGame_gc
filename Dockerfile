FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@9.15.9
COPY desktop/package.json desktop/pnpm-lock.yaml desktop/pnpm-workspace.yaml ./
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && pnpm install --frozen-lockfile
COPY desktop/ ./
RUN pnpm build && pnpm prune --prod

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=7456 LIVEGALGAME_DB_PATH=/app/data/livegalgame.db
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 7456
STOPSIGNAL SIGTERM
CMD ["node", "src/server/index.js"]
