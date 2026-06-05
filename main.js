const mount = document.getElementById('mapMount');

document.body.insertAdjacentHTML(
  'afterbegin',
  '<div style="position:fixed;top:0;left:0;z-index:99999;background:yellow;color:black;padding:10px;font-size:24px;">MAIN OK</div>'
);

if (!mount) {
  document.body.innerHTML = '<div style="padding:24px;color:red;">NO MOUNT</div>';
  throw new Error('No mapMount element found.');
}

mount.innerHTML = '<div style="padding:24px;font-size:32px;color:white;">IMPORTING ui/map.js...</div>';

import('./ui/map.js?v=' + Date.now())
  .then((mod) => {
    mount.innerHTML = `
      <div style="padding:24px;font-size:32px;color:white;">ui/map.js IMPORT OK</div>
      <pre style="padding:24px;color:#7fe6a0;">exports: ${Object.keys(mod).join(', ')}</pre>
    `;
  })
  .catch((err) => {
    mount.innerHTML = `
      <pre style="white-space:pre-wrap;color:#ff8a8a;padding:24px;font-size:18px;">
${err?.stack || err?.message || String(err)}
      </pre>
    `;
  });
