FROM node:20-alpine

WORKDIR /app

# Enable pnpm through Corepack
RUN corepack enable

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy application source
COPY . .

EXPOSE 5000

CMD ["pnpm", "start"]