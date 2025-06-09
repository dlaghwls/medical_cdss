// frontend/src/setupProxy.js

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // OpenMRS REST API 프록시 (기존)
  app.use(
    '/ws/rest/v1',
    createProxyMiddleware({
      target: 'http://openmrs-backend:8080/openmrs',
      changeOrigin: true,
    })
  );

  // DICOMweb QIDO-RS / WADO-RS 프록시
  app.use(
    '/dicom-web',
    createProxyMiddleware({
      // Orthanc 컨테이너 서비스 이름과 포트를 사용
      target: 'http://orthanc:8042',
      changeOrigin: true,
    })
  );

  // STOW-RS (/dicom-web/studies) 대신 네이티브 REST /instances 프록시
  app.use(
    '/instances',
    createProxyMiddleware({
      target: 'http://orthanc:8042',
      changeOrigin: true,
    })
  );

  // Django Channels WebSocket 프록시 (필요 시)
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'ws://django-backend:8000',
      ws: true,
      changeOrigin: true,
    })
  );
};
