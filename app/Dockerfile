# ── Runtime Stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine
# Copy custom nginx configuration for Expo Router SPA client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy exported web distribution
COPY dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
