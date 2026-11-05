FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY . .

RUN pnpm install --dir backend && \
    pnpm install --dir web && \
    pnpm --dir web build

RUN chmod +x /app/backend/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/app/backend/docker-entrypoint.sh"]
