# Base image
FROM node:20-alpine AS base
WORKDIR /app

# Install system dependencies for Prisma compatibility
RUN apk add --no-cache openssl libssl3 bash

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --production=false

# Copy the app source code
COPY . .

# Install Prisma CLI and generate Prisma Client
RUN npx prisma generate

# Build the app for production
FROM base AS builder
RUN npm run build

# Development Stage
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production Stage
FROM base AS prod
COPY --from=builder /app/.next ./.next
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
