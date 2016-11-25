FROM node:7.2.0-alpine

COPY . /tmp/sentry-sourcemaps

# Needed for node-gyp...
RUN apk add --no-cache --update python python-dev build-base

RUN npm --loglevel=http --progress=false --color=false \
  install -g --production /tmp/sentry-sourcemaps \
	&& rm -rf /tmp/sentry-sourcemaps

RUN apk del python python-dev build-base

ENTRYPOINT ["sentry-sourcemaps"]
