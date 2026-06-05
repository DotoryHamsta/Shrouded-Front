document.body.style.background = '#0f1319';
document.body.style.margin = '0';

const mount = document.getElementById('mapMount');

document.body.insertAdjacentHTML(
  'afterbegin',
  '<div style="position:fixed;top:0;left:0;z-index:99999;background:yellow;color:black;padding:10px;font-size:24px;">MAIN.JS TOP LEVEL OK</div>'
);

if (!mount) {
  document.body.innerHTML = '<div style="padding:24px;color:red;font-size:32px;">NO MOUNT</div>';
  throw new Error('No mapMount element found.');
}

mount.innerHTML = `
  <div style="padding:24px;color:white;font-size:28px;">
    LOADING MAP MODULE...
  </div>
`;

import('./ui/map.js?v=' + Date.now())
  .then(({ createMapView }) => {
    mount.innerHTML = `
      <div id="mapOnlyMount" style="
        width: 100%;
        height: 80vh;
        min-height: 700px;
        margin-top: 12px;
      "></div>
    `;

    const mapOnlyMount = document.getElementById('mapOnlyMount');

    const view = createMapView({
      mount: mapOnlyMount,
      stateProvider: () => ({
        selectedSectorId: 'A1',
        hoveredSectorId: null,
        sectorsById: {},
        sectorUnits: {}
      }),
      onSectorSelect: (sector) => {
        console.log('selected', sector.code);
      }
    });

    view.init();
    view.update({
      selectedSectorId: 'A1',
      hoveredSectorId: null,
      sectorsById: {},
      sectorUnits: {}
    });
  })
  .catch((err) => {
    mount.innerHTML = `
      <pre style="white-space:pre-wrap;color:#ff8a8a;padding:24px;font-size:18px;">
${err?.stack || err?.message || String(err)}
      </pre>
    `;
  });
