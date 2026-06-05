export function createMapView({ mount } = {}) {
  if (!mount) {
    throw new Error('createMapView: mount is required');
  }

  return {
    init() {
      mount.innerHTML = `
        <div style="
          width: 100%;
          height: 80vh;
          background: #111827;
          border: 1px solid #304155;
          border-radius: 18px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 800;
        ">
          MAP MODULE OK
        </div>
      `;
    },
    update() {}
  };
}
