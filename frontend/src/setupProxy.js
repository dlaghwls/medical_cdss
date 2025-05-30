// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    // 첫 번째 인자: 프록시를 적용할 요청 경로의 시작 부분입니다.
    // React 앱에서 '/ws/rest/v1'으로 시작하는 모든 API 요청을 프록시 처리합니다.
    '/ws/rest/v1', 
    createProxyMiddleware({
      // target: 실제 API 서버의 주소입니다.
      // OpenMRS가 http://localhost:8080/openmrs 에서 실행 중이라고 가정합니다.
      target: 'http://localhost:8080/openmrs', 
      changeOrigin: true, // 대상 서버의 호스트 헤더를 변경합니다 (CORS 문제 해결에 도움).
      // 참고: target 주소에는 OpenMRS의 컨텍스트 경로('/openmrs')까지 포함해야 합니다.
      // 그러면 React 앱에서 '/ws/rest/v1/patient'로 요청 시,
      // 실제로는 'http://localhost:8080/openmrs/ws/rest/v1/patient'로 전달됩니다.
    })
  );

  // 만약 다른 API 경로 (예: /openmrs/module/...)도 프록시해야 한다면,
  // 여기에 app.use(...)를 다음과 같이 추가로 설정할 수 있습니다:
  // app.use(
  //   '/module', // 예를 들어 '/module'로 시작하는 경로를 프록시하려면
  //   createProxyMiddleware({
  //     target: 'http://localhost:8080/openmrs',
  //     changeOrigin: true,
  //   })
  // );
};