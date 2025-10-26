
FROM node:24.1.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

COPY data ./data

EXPOSE 3002

CMD [ "node", "src/server.js" ]