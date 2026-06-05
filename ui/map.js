import { MAP } from '../data/map.js';

export function createMapView({ mount } = {}) {
  if (!mount) throw new Error('mount required');

  return {
    init() {
      mount.innerHTML = `
        <div style="
          padding:24px;
          color:#fff;
          background:#111827;
          border:1px solid #304155;
          border-radius:18px;
          font-size:28px;
          font-weight:800;
        ">
          MAP OK — sectors: ${MAP.sectors.length}
        </div>
      `;
    },
    update() {}
  };
}
