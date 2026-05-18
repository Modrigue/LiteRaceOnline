FROM node:24.14.1

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY . .

RUN npm run build

ENV PORT=13000

EXPOSE 13000

CMD ["npm", "start"]

# for debug mode only
#CMD ["npm", "run", "dev"]