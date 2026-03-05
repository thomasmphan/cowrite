FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json packge-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/
RUN npm ci --workspace=server --workspace=@cowrite/shared

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY packages/shared ./packages/shared
COPY server ./server
COPY tsconfig.base.json package.json package-lock.json ./
RUN npm run build -w @cowrite/shared && npm run build -w server

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/
COPY package.json ./
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
