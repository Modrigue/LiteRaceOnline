FROM node:14.15.1

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install
RUN npm install -g typescript
RUN npm install -g nodemon

COPY . .

RUN npm run build

ENV PORT=13000

EXPOSE 13000

CMD ["npm", "start"]

# for debug mode only
#CMD ["npm", "run", "dev"]