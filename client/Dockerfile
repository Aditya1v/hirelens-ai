# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve stage - SPA mode produces a static build/client directory
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build/client ./build/client
EXPOSE 3000
CMD ["serve", "-s", "build/client", "-l", "3000"]
