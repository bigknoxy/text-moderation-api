FROM oven/bun:latest
WORKDIR /app
COPY . .
COPY public ./public
RUN bun install
EXPOSE 3000
CMD ["bun", "run", "index.ts"]
