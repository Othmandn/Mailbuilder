FROM node:lts-alpine

WORKDIR /app

COPY package.json package.json
COPY tsconfig.json tsconfig.json

COPY next-env.d.ts next-env.d.ts
COPY tailwind.config.ts tailwind.config.ts
COPY postcss.config.js postcss.config.js
COPY next.config.mjs next.config.mjs
COPY postcss.config.js postcss.config.js
COPY tailwind.config.ts tailwind.config.ts
COPY jest.config.ts jest.config.ts
COPY jest.setup.ts jest.setup.ts

RUN npm i --legacy-peer-deps

COPY src src

CMD npm start