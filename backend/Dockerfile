FROM node:18-alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

CMD ["sh", "docker-entrypoint.sh"]
