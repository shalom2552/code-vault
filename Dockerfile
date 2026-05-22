FROM node:24-alpine
# Add compilers, runtimes, and tailscale
RUN apk add --no-cache gcc g++ make python3 tailscale \
    go rust ruby openjdk17-jdk php83
RUN npm install -g tsx

WORKDIR /app

# In development, we don't COPY the code because we bind-mount it.
# But we copy the entrypoint to the root so it's always available.
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5174
ENTRYPOINT ["/entrypoint.sh"]
