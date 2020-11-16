FROM buildkite/puppeteer:5.2.1

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    curl \
    git \
 && apt-get -y clean \
 && rm -rf /var/lib/apt/lists/* \
 && curl -o- -L https://yarnpkg.com/install.sh | sh
ENV PATH $HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH

WORKDIR /app
COPY . .
RUN yarn install

VOLUME ./tmp
EXPOSE 3000

CMD ["yarn", "start"]
