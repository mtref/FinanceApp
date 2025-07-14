# Stage 1: Build Frontend
FROM node:18 AS builder
WORKDIR /app
ARG VITE_TABLES_APP_URL
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN  VITE_TABLES_APP_URL=${VITE_TABLES_APP_URL} npm run build

# Stage 2: Final Backend Image
FROM node:18
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install
COPY backend/ ./
COPY --from=builder /app/dist ./frontend/dist
EXPOSE 3000
CMD ["node", "index.js"]