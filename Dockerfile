FROM node:22-bookworm-slim

# Fonts for chart text, tzdata for local times
RUN apt-get update \
 && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core tzdata \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production TZ=Europe/Helsinki

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY index.js web.js newrelic.js ./
COPY app ./app
COPY scripts ./scripts

# Never run as root; code is owned by root so the bot can't modify itself
USER node
CMD ["node", "index.js"]
