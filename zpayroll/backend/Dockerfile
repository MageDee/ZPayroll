FROM rust:1.78-slim AS builder

RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    build-essential \
    cmake \
    clang \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone https://github.com/zingolabs/zingolib.git
RUN cd zingolib && \
    LIBSQLITE3_SYS_BUNDLED=1 \
    cargo build --release --package zingo-cli

FROM node:20-slim

RUN apt-get update && apt-get install -y \
    libssl3 \
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