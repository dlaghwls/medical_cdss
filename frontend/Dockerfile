FROM node:16-alpine

WORKDIR /app

# npm이 항상 legacy-peer-deps 모드로 동작하도록 환경 변수 설정
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

COPY package.json package-lock.json ./

# 이제 옵션 없이도 npm install이 legacy-peer-deps 모드로 실행됩니다
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
