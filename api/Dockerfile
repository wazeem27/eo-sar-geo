FROM node:20-alpine

# Set the working directory
WORKDIR /app

RUN apk add --no-cache \
    python3 \
    py3-pip \
    gdal \
    gdal-dev \
    py3-numpy \
    build-base \
    python3-dev \
    linux-headers

COPY ./api/package.json ./
RUN npm install

COPY ./worker/requirements.txt ./worker/
RUN pip install --no-cache-dir -r ./worker/requirements.txt --break-system-packages

COPY ./api/src ./src
COPY ./api/package.json ./package.json

COPY ./worker/ ./worker/

RUN mkdir -p /app/data/logs /app/data/uploads /app/data/outputs && chown -R node:node /app/data

EXPOSE 8080

CMD [ "node", "src/index.js" ]