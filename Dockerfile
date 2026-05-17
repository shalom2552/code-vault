FROM node:24-alpine
RUN apk add --no-cache gcc g++ make python3
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build
EXPOSE 5174
CMD ["node", "server/index.js"]
