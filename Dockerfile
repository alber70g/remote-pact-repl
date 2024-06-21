#FROM node:18.17.0
FROM oven/bun:debian

# Set the PATH environment variable to include the Pact binary
ENV PATH="/home/bun/app/pact-bin:${PATH}"

# RUN apt-get update && apt-get install -y \
# 	wget \
# 	unzip \
# 	&& rm -rf /var/lib/apt/lists/* \
# 	&& wget https://github.com/kadena-io/pact/releases/download/v4.11.0/pact-4.11.0-linux-22.04.zip \
# 	&& unzip pact-4.11.0-linux-22.04.zip \
# 	&& chmod +x pact \
# 	&& echo $PWD

# TODO: set env var $PATH to include pact

# Set the working directory to /app
WORKDIR /app

# copy pact binaries
COPY ./pact-bin ./pact-bin

# copy package.json and lockfile
COPY package.json ./

# Install dependencies
RUN bun install

# copy source code
COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json

# RUN pnpm run build:app

EXPOSE 3000

# Start the application
CMD ["bun", "./src/server.ts"]
