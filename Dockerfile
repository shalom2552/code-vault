FROM node:24-alpine
RUN apk add --no-cache g++ make
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build
EXPOSE 5174
CMD ["node", "server/index.js"]
