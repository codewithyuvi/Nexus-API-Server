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

# 7. Compile TypeScript to JavaScript
RUN npm run build

# 8. Expose ports
EXPOSE 5000

# 9. Start Production Server (Default to API, override on Render for Worker)
CMD ["npm", "run", "start:api"]
# CMD ["npm", "run", "start:worker"]