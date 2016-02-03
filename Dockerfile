FROM node:5.5.0

COPY . /tmp/sentry-sourcemaps

RUN npm --loglevel=http --progress=false --color=false install -g /tmp/sentry-sourcemaps \
	&& rm -rf /tmp/sentry-sourcemaps

ENTRYPOINT ["sentry-sourcemaps"]
