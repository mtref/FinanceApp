# Stage 1: build frontend
FROM node:18 AS builder
WORKDIR /app/frontend

# Copy only package.json to ensure a fresh install
COPY frontend/package.json ./

# Install dependencies. This will create a fresh package-lock.json inside the container.
RUN npm install

# Copy the rest of the frontend source code
COPY frontend/ ./
RUN chmod +x node_modules/.bin/vite
RUN npm run build

# Stage 2: build backend container
FROM node:18
WORKDIR /app
# Copy backend package files
COPY backend/package.json backend/package-lock.json* ./
# Install backend dependencies
RUN npm install

# Copy backend source code
COPY backend/ ./
# Copy built frontend from the builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000
CMD ["node", "index.js"]