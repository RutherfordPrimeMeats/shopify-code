FROM node:24-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-venv && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install apprise

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Expose the Cloud Run port
EXPOSE 8080

CMD [ "node", "app.js" ]
