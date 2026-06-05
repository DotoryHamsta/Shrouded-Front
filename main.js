const mount = document.getElementById('mapMount');

if (!mount) {
  document.body.innerHTML = '<div style="padding:24px;color:red;">NO MOUNT</div>';
  throw new Error('No mapMount element found.');
}

mount.innerHTML = '<div style="padding:24px;font-size:32px;color:white;">MAIN.JS WORKS</div>';
