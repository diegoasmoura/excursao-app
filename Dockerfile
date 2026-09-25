FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm rebuild sqlite3 --build-from-source
COPY server.cjs ./
COPY scripts ./scripts
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 3005
CMD ["node", "server.cjs"]
