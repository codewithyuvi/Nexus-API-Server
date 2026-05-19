# 1. Base Node image
FROM node:20-alpine

# 2. Set work directory
WORKDIR /app

# 3. Copy manifest files and prisma layout first
COPY package*.json ./
COPY prisma ./prisma/

# 4. Install npm packages
RUN npm install

# 5. Build native Prisma Client binaries for the container engine
RUN npx prisma generate

# 6. Copy your code files over
COPY . .

# 7. Expose ports
EXPOSE 5000

# 8. Start watch tool
CMD ["npm", "run", "dev"]