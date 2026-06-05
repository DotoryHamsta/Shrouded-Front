document.body.style.background = '#111827';
document.body.style.margin = '0';

const mount = document.getElementById('mapMount');

if (!mount) {
  document.body.innerHTML = '<div style="padding:24px;color:red;font-size:32px;">NO MOUNT</div>';
  throw new Error('No mapMount element found.');
}

mount.innerHTML = `
  <div style="
    margin:24px;
    padding:24px;
    background:#ffeb3b;
    color:#000;
    font-size:32px;
    font-weight:800;
    border-radius:12px;
  ">
    MAIN.JS WORKS
  </div>
`;
