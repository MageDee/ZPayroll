FROM rust:1.90-slim AS builder

RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    build-essential \
    cmake \
    clang \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone https://github.com/zingolabs/zingolib.git && \
    cd zingolib && \
    git checkout $(git rev-list -n 1 --before="2026-09-15" origin/dev)
RUN cd zingolib && \
    LIBSQLITE3_SYS_BUNDLED=1 \
    cargo build --release --package zingo-cli

FROM node:20-slim

RUN apt-get update && apt-get install -y \
    libssl3 \
    libsqlite3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

COPY --from=builder /build/zingolib/target/release/zingo-cli /app/zingo-cli
RUN chmod +x /app/zingo-cli

ENV ZINGO_BIN=/app/zingo-cli
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001
CMD ["node", "server.js"]
