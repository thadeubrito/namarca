FROM node:24.11.1-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/campaign/package.json ./apps/campaign/package.json
COPY apps/site/package.json ./apps/site/package.json
COPY packages/editor/package.json ./packages/editor/package.json
RUN npm ci --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
