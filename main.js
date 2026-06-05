const mount = document.getElementById('mapMount');

document.body.insertAdjacentHTML(
  'afterbegin',
  '<div style="position:fixed;top:0;left:0;z-index:99999;background:#ff0;color:#000;padding:12px;font-size:24px;">MAIN.JS TOP LEVEL OK</div>'
);

if (mount) {
  mount.innerHTML = '<div style="padding:24px;font-size:32px;color:white;">MAIN.JS WORKS</div>';
} else {
  document.body.innerHTML = '<div style="padding:24px;font-size:32px;color:red;">NO MOUNT</div>';
}
