// frontend/public/app-config.js
window.config = {
  routerBasename: '/',
  servers: {
    dicomWeb: [
      {
        name: 'ORTHANC',
        qidoRoot: 'http://localhost:8042/dicom-web',
        wadoRoot: 'http://localhost:8042/dicom-web',
        wadoUriRoot: 'http://localhost:8042/dicom-web',
      },
    ],
  },
};
