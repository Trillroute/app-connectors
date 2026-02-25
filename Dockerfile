FROM node:20-alpine AS base

# Install OpenSSL and libc6-compat for Prisma
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Copy full application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Start production app
ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000
CMD ["npm", "start"]
