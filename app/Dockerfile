# ── Build Stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Export web application
RUN npx expo export --platform web

# ── Runtime Stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine
# Expo SDK 50+ exports to dist/ directory by default
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx configuration for client-side routing if needed
# but default nginx is okay for basic React Native Web if we don't have deeply nested routes
# Expo router usually generates static files for all routes, so default config works.

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
