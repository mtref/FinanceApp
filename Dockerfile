# Stage 1: build frontend
FROM node:18 AS builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN chmod +x node_modules/.bin/vite
RUN npm run build

# Stage 2: build backend container
FROM node:18
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install
COPY backend/ ./
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000
CMD ["node", "index.js"]
