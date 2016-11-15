FROM node:6.9.1-alpine

COPY . /tmp/sentry-sourcemaps

RUN npm --loglevel=http --progress=false --color=false install -g /tmp/sentry-sourcemaps \
	&& rm -rf /tmp/sentry-sourcemaps

ENTRYPOINT ["sentry-sourcemaps"]
