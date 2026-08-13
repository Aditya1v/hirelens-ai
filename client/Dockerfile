# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Frontend API URL
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL

# Build React application
RUN pnpm build


# Serve stage
FROM node:20-alpine

WORKDIR /app

# Install static file server
RUN npm install -g serve

# Copy production build
COPY --from=build /app/build/client ./build/client

EXPOSE 3000

CMD ["serve", "-s", "build/client", "-l", "3000"]