FROM node:18-slim

WORKDIR /app

# Install build tools for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# Expose port
EXPOSE 3001

# Start server with explicit memory limit for 256MB VM
CMD ["node", "--max-old-space-size=200", "server/index.js"]
