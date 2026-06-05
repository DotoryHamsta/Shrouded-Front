import { createMapView } from './ui/map.js?v=1';

const mount = document.getElementById('mapMount');

document.body.insertAdjacentHTML(
  'afterbegin',
  '<div style="position:fixed;top:0;left:0;z-index:99999;background:#ff0;color:#000;padding:12px;font-size:24px;">MAIN.JS TOP LEVEL OK</div>'
);

if (!mount) {
  document.body.innerHTML = '<div style="padding:24px;font-size:32px;color:red;">NO MOUNT</div>';
  throw new Error('No mapMount element found.');
}

mount.innerHTML = '<div style="padding:24px;font-size:32px;color:white;">IMPORTING MAP...</div>';

try {
  const view = createMapView({
    mount,
    stateProvider: () => ({
      selectedSectorId: 'A1',
      hoveredSectorId: null,
      sectorsById: {},
      sectorUnits: {}
    }),
    onSectorSelect: (sector) => {
      mount.insertAdjacentHTML(
        'beforeend',
        `<div style="padding:12px;color:#8fbfff;">Selected: ${sector.code}</div>`
      );
    }
  });

  view.init();
  view.update({
    selectedSectorId: 'A1',
    hoveredSectorId: null,
    sectorsById: {},
    sectorUnits: {}
  });

  mount.insertAdjacentHTML(
    'afterbegin',
    '<div style="padding:12px;color:#7fe6a0;">MAP MODULE OK</div>'
  );
} catch (err) {
  mount.innerHTML = `
    <pre style="white-space:pre-wrap;color:#ff8a8a;padding:24px;font-size:18px;">
${err?.stack || err?.message || String(err)}
    </pre>
  `;
  throw err;
}
