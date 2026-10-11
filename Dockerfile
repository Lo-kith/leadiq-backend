FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER nodeuser

EXPOSE 3000

CMD ["node", "dist/index.js"]
