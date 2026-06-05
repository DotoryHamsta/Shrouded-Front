const mount = document.getElementById("mapMount");

document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <div
    style="
      position:fixed;
      top:0;
      left:0;
      z-index:99999;
      background:yellow;
      color:black;
      padding:10px;
      font-size:24px;
    "
  >
    MAIN OK
  </div>
`
);

mount.innerHTML = `
  <div
    style="
      color:white;
      padding:30px;
      font-size:32px;
    "
  >
    IMPORT TEST
  </div>
`;

import("./ui/map.js")
  .then(() => {

    mount.innerHTML += `
      <div
        style="
          color:#7ef0b1;
          padding:20px;
          font-size:24px;
        "
      >
        MAP.JS IMPORT OK
      </div>
    `;

  })
  .catch(err => {

    mount.innerHTML = `
      <pre
        style="
          color:#ff8a8a;
          padding:20px;
          white-space:pre-wrap;
        "
      >
${err.stack || err.message || String(err)}
      </pre>
    `;

  });
