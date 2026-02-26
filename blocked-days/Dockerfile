FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

# Expose the Cloud Run port
EXPOSE 8080

CMD [ "node", "app.js" ]
