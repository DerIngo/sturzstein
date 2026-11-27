(function () {
  "use strict";
  const status = document.getElementById("status");
  try {
    const packs = globalThis.Sturzstein.packs.map((pack) => globalThis.Sturzstein.Levels.validatePack(pack));
    status.textContent = `Bereit: ${packs.length} Levelpack geladen.`;
  } catch (error) {
    console.error(error);
    status.textContent = `Start fehlgeschlagen: ${error.message}`;
  }
})();
