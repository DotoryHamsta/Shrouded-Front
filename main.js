document.body.style.margin = '0';
document.body.style.background = '#0f1319';
document.body.style.color = '#e8eff8';
document.body.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

const mount = document.getElementById('mapMount');

document.body.insertAdjacentHTML(
  'afterbegin',
  '<div style="position:fixed;top:0;left:0;z-index:99999;background:#ff0;color:#000;padding:12px 16px;font-size:22px;font-weight:800;">MAIN.JS START</div>'
);

if (!mount) {
  document.body.innerHTML = '<div style="padding:24px;color:red;font-size:32px;">NO MOUNT</div>';
  throw new Error('No mapMount element found.');
}

mount.innerHTML = `
  <div style="
    margin:24px;
    padding:24px;
    background:#111827;
    border:1px solid #304155;
    border-radius:18px;
    font-size:28px;
    font-weight:800;
  ">
    LOADING MAP MODULE...
  </div>
`;

import('./ui/map.js?v=' + Date.now())
  .then(({ createMapView }) => {
    mount.innerHTML = '<div id="mapOnlyMount" style="width:100%;height:80vh;min-height:700px;"></div>';

    const mapOnlyMount = document.getElementById('mapOnlyMount');

    const view = createMapView({
      mount: mapOnlyMount,
      stateProvider: () => ({
        selectedSectorId: 'A1',
        hoveredSectorId: null,
        sectorsById: {},
        sectorUnits: {}
      })
    });

    view.init();

    mount.insertAdjacentHTML(
      'afterbegin',
      '<div style="padding:12px 24px;color:#7fe6a0;font-size:20px;font-weight:800;">MAP MODULE OK</div>'
    );
  })
  .catch((err) => {
    mount.innerHTML = `
      <pre style="white-space:pre-wrap;color:#ff8a8a;padding:24px;font-size:18px;">
${err?.stack || err?.message || String(err)}
      </pre>
    `;
  });
