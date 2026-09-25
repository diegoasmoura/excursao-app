FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.cjs ./
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 3005
CMD ["node", "server.cjs"]
