FROM node:20-alpine
RUN npm install -g pnpm@10.26.2

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./


RUN pnpm install

COPY . .

EXPOSE 5000
CMD ["pnpm", "dev"]