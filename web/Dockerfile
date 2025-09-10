# Stage 1: Build the React application
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker layer caching
# This is explicitly copying the files from the web/ directory
COPY web/package.json ./

# Install dependencies, including dev dependencies for the build
RUN npm install

# Copy the rest of the application source code from the 'web' directory
# This command now copies the contents of 'web/' into the container's /app directory
COPY web/ .

# Build the React application
RUN npm run build

# Stage 2: Serve the application with a lightweight Nginx web server
FROM nginx:alpine

# Copy the custom Nginx configuration to handle client-side routing
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Command to run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
