FROM node:24.1.0-alpine


WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5998

CMD [ "node", "src/app.js" ]