const mount = document.getElementById('mapMount');

if (mount) {
  mount.innerHTML = '<div style="padding:24px;font-size:32px;color:white;">MAIN.JS WORKS</div>';
} else {
  document.body.innerHTML = '<div style="padding:24px;font-size:32px;color:red;">NO MOUNT</div>';
}
