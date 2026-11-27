(function () {
  "use strict";
  const get = (id) => document.getElementById(id);
  const canvas = get("board");
  const overlay = get("overlay");
  const primary = get("primary");
  const secondary = get("secondary");
  const status = get("status");
  const app = globalThis.Sturzstein;
  let state;
  let previous;
  let renderer;
  let clock;
  let input;
  let pack;
  let level;
  let screen = "loading";
  let beforeConfirm = "playing";
  let lastFrame = 0;

  function show(next, message = "") {
    screen = next;
    input?.clear();
    overlay.hidden = next === "playing";
    get("pause").disabled = !["playing", "paused"].includes(next);
    get("pause").textContent = next === "paused" ? "Fortsetzen" : "Pause";
    get("restart").disabled = ["loading", "start", "error", "confirm"].includes(next);
    primary.disabled = next === "error" || next === "loading";
    secondary.hidden = next !== "confirm";
    const dialogs = {
      start: ["Ein Funkeln im Dunkeln", level?.description || "", "Höhle betreten"],
      paused: ["Pause", message || "Die Höhle wartet. Zeit und Physik sind angehalten.", "Fortsetzen"],
      confirm: ["Neu beginnen?", "Die aktuelle Partie wird verworfen. Dieselbe Höhle startet mit voller Zeit neu.", "Neu starten"],
      won: ["Ausgang erreicht!", `Du hast die Höhle geschafft. ${state?.score || 0} Punkte – gut gemacht!`, "Noch einmal"],
      lost: ["Verschüttet?", state?.reason || "Diese Runde ist vorbei.", "Erneut versuchen"],
      error: ["Start nicht möglich", message, "Nicht verfügbar"],
    };
    if (dialogs[next]) {
      const [title, text, label] = dialogs[next];
      get("dialog-title").textContent = title;
      get("dialog-text").textContent = text;
      primary.textContent = label;
    }
    if (next === "playing") {
      clock.reset(performance.now());
      canvas.focus();
    } else if (next === "confirm") {
      secondary.focus();
    } else if (!primary.disabled) {
      primary.focus();
    }
  }
  function updateHud() {
    get("gems").textContent = `${state.collected} / ${state.quota}`;
    const seconds = Math.ceil(state.remainingTicks / 10);
    get("time").textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    get("score").textContent = String(state.score);
    status.textContent = state.collected >= state.quota
      ? "Die Quote ist erfüllt. Der grün leuchtende Ausgang ist offen!"
      : `Noch ${state.quota - state.collected} Edelsteine bis zum offenen Ausgang.`;
  }
  function restart() {
    state = app.Simulation.createState(pack, level.id);
    previous = structuredClone(state);
    renderer.reset();
    updateHud();
    show("playing");
  }
  function confirm() {
    if (screen === "start" || screen === "won" || screen === "lost" || screen === "confirm") restart();
    else if (screen === "paused") show("playing");
  }
  function command(action) {
    if (["loading", "error"].includes(screen)) return;
    if (action === "confirm") { confirm(); return; }
    if (action === "restart" && ["playing", "paused"].includes(screen)) {
      beforeConfirm = screen;
      show("confirm");
    } else if (action === "restart" && ["won", "lost"].includes(screen)) {
      restart();
    } else if (action === "escape" && screen === "confirm") {
      show(beforeConfirm);
    } else if (["escape", "pause"].includes(action)) {
      if (screen === "playing") show("paused");
      else if (screen === "paused") show("playing");
    }
  }
  function fail(error) {
    console.error(error);
    show("error", error.message);
    status.textContent = `Fehler: ${error.message}`;
  }
  function frame(now) {
    try {
      // Gleiche Zeitquelle wie reset(): Firefox kann ältere rAF-Zeitstempel liefern.
      const alpha = clock.frame(performance.now(), screen === "playing");
      renderer.draw(state, previous, screen === "playing" ? alpha : 1, now - lastFrame);
      lastFrame = now;
    } catch (error) {
      fail(error);
      return;
    }
    requestAnimationFrame(frame);
  }
  function pauseForInterruption() {
    if (screen === "playing") show("paused", "Das Spiel wurde wegen einer Unterbrechung pausiert. Setze bewusst fort.");
    input?.clear();
  }
  window.addEventListener("blur", pauseForInterruption);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseForInterruption(); });
  primary.addEventListener("click", confirm);
  secondary.addEventListener("click", () => show(beforeConfirm));
  get("pause").addEventListener("click", () => command("pause"));
  get("restart").addEventListener("click", () => command("restart"));
  overlay.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || primary.disabled) return;
    event.preventDefault();
    if (!secondary.hidden && document.activeElement === primary) secondary.focus();
    else primary.focus();
  });

  async function boot() {
    pack = app.Levels.validatePack(app.packs[0]);
    level = pack.levels[0];
    state = app.Simulation.createState(pack, level.id);
    previous = structuredClone(state);
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Eigene Sprites konnten nicht geladen werden: assets/tiles.png"));
      image.src = "assets/tiles.png";
    });
    renderer = new app.Renderer(canvas, image);
    input = new app.KeyboardInput(window, command);
    clock = new app.FixedClock(() => {
      if (screen !== "playing") return;
      previous = structuredClone(state);
      app.Simulation.step(state, input.sample());
      updateHud();
      if (state.status !== "playing") show(state.status);
    }, pauseForInterruption);
    get("level-name").textContent = `01 · ${level.name}`;
    updateHud();
    show("start");
    requestAnimationFrame(frame);
  }
  boot().catch(fail);
})();
