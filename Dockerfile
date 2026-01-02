# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS build

WORKDIR /app

# Install build tools for native modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential python3 python3-dev python-is-python3 make g++ ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy package manifests and install deps (including dev for build)
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Copy source and build the React app
COPY . ./
RUN npm run build

# Final image: copy built assets and production node_modules
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy built frontend and node_modules from build stage
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY server ./server
COPY package.json ./

EXPOSE 3000

# Start the Express server which will serve the build and proxy API
CMD ["node", "server/index.js"]
# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app