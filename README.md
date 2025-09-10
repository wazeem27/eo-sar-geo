# Geo-TIFF Map App

### What it does?

This project is a website that shows maps. It's made of a few different pieces that work together to make the app run.

### Components

The app is made of two main parts that run in separate containers

- **The Website Part**: web app runs in port 5174
- **The API Part**: (backend part tightly coupled with worker job process)

### To get started

To are few pre-requisities, needs to be installed in your local machine

#### Pre-requisites

- Docker
- Docker Compose

#### Quick Start

Once you have these tools, you just need to run one command in your terminal from this folder:

```bash
docker-compose up --build -d
```

with Makefile

```
make up
```
