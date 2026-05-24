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
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy source and build the React app
COPY . ./
RUN --mount=type=secret,id=REACT_APP_SPORT80_API_TOKEN \
    --mount=type=secret,id=REACT_APP_GOOGLE_API_KEY \
    REACT_APP_SPORT80_API_TOKEN=$(cat /run/secrets/REACT_APP_SPORT80_API_TOKEN 2>/dev/null || true) \
    REACT_APP_GOOGLE_API_KEY=$(cat /run/secrets/REACT_APP_GOOGLE_API_KEY 2>/dev/null || true) \
    npm run build

# Final image: copy built assets and production node_modules
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copy built frontend and node_modules from build stage
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY server ./server
COPY package.json ./

EXPOSE 8080

# Start the Express server which will serve the build and proxy API
CMD ["node", "server/index.js"]