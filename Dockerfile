FROM node:20

WORKDIR /app

# 1) package-informatie + prisma-schema kopiëren
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# 2) env voor Prisma (postinstall) zodat npm install niet crasht
ENV DATABASE_URL="mysql://boekhouding:boekhouding-password@boekhouding-db:3306/boekhouding-db"
ENV NODE_ENV=development

# 3) dependencies installeren
RUN npm install

# 4) rest van de code kopiëren
COPY . .

EXPOSE 3000

# 5) GEEN npm run build meer, alleen dev-server starten
CMD ["npm", "run", "dev"]
