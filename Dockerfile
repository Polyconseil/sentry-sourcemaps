FROM node:11-alpine

COPY . /tmp/sentry-sourcemaps

RUN npm --loglevel=http --progress=false --color=false \
  install -g --production /tmp/sentry-sourcemaps \
	&& rm -rf /tmp/sentry-sourcemaps

ENTRYPOINT ["sentry-sourcemaps"]
