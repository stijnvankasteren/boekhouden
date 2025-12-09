# ---------- BUILD STAGE ----------
FROM node:20 AS builder

WORKDIR /app

# Copy only package.json first for better layer caching
COPY package.json ./

# Install dependencies (less strict than npm ci)
RUN npm install

# Copy the rest of the project
COPY . .

# Ensure directory for SQLite DB exists
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/boekhouding.db"

# Generate Prisma client and build Next.js app
RUN npx prisma generate
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/boekhouding.db"

# Create non-root user
RUN useradd -m nextjs

# Copy necessary files from build stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Database directory with proper ownership
RUN mkdir -p /app/data && chown -R nextjs:nextjs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations on start then launch standalone Next server
CMD ["sh", "-c", "npm run migrate:deploy && node server.js"]
