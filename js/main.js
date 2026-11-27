(function () {
  "use strict";
  const get = (id) => document.getElementById(id);
  const canvas = get("board");
  const overlay = get("overlay");
  const primary = get("primary");
  const secondary = get("secondary");
  const replayExport = get("replay-export");
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
  let focused = true;
  let recorder;
  let history;

  function menuButtons() {
    return [primary, secondary, replayExport].filter((button) => !button.hidden && !button.disabled);
  }

  function show(next, message = "") {
    screen = next;
    input?.setContext(["playing", "rewinding"].includes(next) ? "play" : next === "lost" ? "lost" : "menu",
      { preserveHeld: next === "rewinding" });
    overlay.hidden = ["playing", "rewinding"].includes(next);
    get("pause").disabled = !["playing", "rewinding", "paused"].includes(next);
    get("pause").textContent = next === "paused" ? "Fortsetzen" : "Pause";
    get("restart").disabled = ["loading", "start", "error", "confirm", "rewinding"].includes(next);
    primary.disabled = next === "error" || next === "loading";
    secondary.hidden = next !== "confirm";
    replayExport.hidden = !["paused", "won", "lost"].includes(next);
    replayExport.disabled = !recorder?.ticks;
    const dialogs = {
      start: ["Ein Funkeln im Dunkeln", level?.description || "", "Höhle betreten"],
      paused: ["Pause", message || "Die Höhle wartet. Zeit und Physik sind angehalten.", "Fortsetzen"],
      confirm: ["Neu beginnen?", "Die aktuelle Partie wird verworfen. Dieselbe Höhle startet mit voller Zeit neu.", "Neu starten"],
      won: ["Ausgang erreicht!", `Du hast die Höhle geschafft. ${state?.score || 0} Punkte – gut gemacht!`, "Noch einmal"],
      lost: ["Verschüttet?", `${state?.reason || "Diese Runde ist vorbei."} Z/U oder die Controller-Rückspultaste halten, um zurückzugehen.`, "Erneut versuchen"],
      error: ["Start nicht möglich", message, "Nicht verfügbar"],
    };
    if (dialogs[next]) {
      const [title, text, label] = dialogs[next];
      get("dialog-title").textContent = title;
      get("dialog-text").textContent = text;
      primary.textContent = label;
    }
    if (next === "playing" || next === "rewinding") {
      clock.reset(performance.now());
      canvas.focus();
    } else if (next === "confirm") {
      secondary.focus();
    } else if (!primary.disabled) {
      primary.focus();
    }
    if (state) updateHud();
  }
  function updateHud() {
    get("gems").textContent = `${state.collected} / ${state.quota}`;
    const seconds = Math.ceil(state.remainingTicks / 10);
    get("time").textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    get("score").textContent = String(state.score);
    get("rewind-time").textContent = `${((history?.availableTicks || 0) * app.Simulation.TICK_MS / 1000).toFixed(1).replace(".", ",")} s`;
    get("rewind-status").textContent = `${recorder?.replay.usedRewind ? "Mit Rückspulen" : "Ohne Rückspulen"} · Z/U oder Controller-Rückspultaste halten, auch nach einer Niederlage.`;
    status.textContent = screen === "rewinding"
      ? history.availableTicks ? "Rückspulen … Zum Weiterspielen loslassen." : "Anfang des verfügbaren Verlaufs erreicht. Zum Weiterspielen loslassen."
      : state.collected >= state.quota
      ? "Die Quote ist erfüllt. Der grün leuchtende Ausgang ist offen!"
      : `Noch ${state.quota - state.collected} Edelsteine bis zum offenen Ausgang.`;
  }
  function restart() {
    state = app.Simulation.createState(pack, level.id);
    recorder = new app.Replay.Recorder(pack, level.id);
    history = new app.Rewind.RewindHistory(state);
    get("feature-notice").textContent = "";
    previous = structuredClone(state);
    renderer.reset();
    show("playing");
  }
  function confirm() {
    if (screen === "start" || screen === "won" || screen === "lost" || screen === "confirm") restart();
    else if (screen === "paused") show("playing");
  }
  function command(action, direction) {
    if (["loading", "error"].includes(screen)) return;
    if (action === "navigate" && !overlay.hidden) {
      const buttons = menuButtons();
      const index = buttons.indexOf(document.activeElement);
      const step = direction === "up" || direction === "left" ? -1 : 1;
      buttons[(index + step + buttons.length) % buttons.length]?.focus();
      return;
    }
    if (action === "confirm") {
      if (!overlay.hidden && menuButtons().includes(document.activeElement)) document.activeElement.click();
      else confirm();
      return;
    }
    if (action === "rewind") {
      if (["playing", "lost"].includes(screen)) {
        get("feature-notice").textContent = "";
        show("rewinding");
      }
      return;
    }
    if (action === "mute") {
      get("feature-notice").textContent = "Tonsteuerung ist vorbereitet und folgt mit den Soundeffekten in S14.";
      return;
    }
    if (action === "restart" && ["playing", "paused"].includes(screen)) {
      beforeConfirm = screen;
      show("confirm");
    } else if (action === "restart" && ["won", "lost"].includes(screen)) {
      restart();
    } else if (action === "escape" && screen === "confirm") {
      show(beforeConfirm);
    } else if (action === "escape" && ["won", "lost"].includes(screen)) {
      show("start");
    } else if (["escape", "pause"].includes(action)) {
      if (screen === "playing" || screen === "rewinding") show(state.status === "playing" ? "paused" : state.status);
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
      if (focused && !document.hidden) input.update(performance.now());
      if (screen === "rewinding" && !input.rewinding()) show(state.status === "playing" ? "playing" : state.status);
      // Gleiche Zeitquelle wie reset(): Firefox kann ältere rAF-Zeitstempel liefern.
      const alpha = clock.frame(performance.now(), screen === "playing" || screen === "rewinding");
      renderer.draw(state, previous, screen === "playing" ? alpha : 1, now - lastFrame);
      lastFrame = now;
    } catch (error) {
      fail(error);
      return;
    }
    requestAnimationFrame(frame);
  }
  function pauseForInterruption() {
    if (screen === "playing" || screen === "rewinding") {
      show(state.status === "playing" ? "paused" : state.status, "Das Spiel wurde wegen einer Unterbrechung pausiert. Setze bewusst fort.");
    }
    input?.suspend();
  }
  window.addEventListener("blur", () => { focused = false; pauseForInterruption(); });
  window.addEventListener("focus", () => { focused = true; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseForInterruption(); });
  primary.addEventListener("click", confirm);
  secondary.addEventListener("click", () => show(beforeConfirm));
  replayExport.addEventListener("click", () => {
    try {
      const text = app.Replay.stringifyReplay(recorder.replay);
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const link = document.createElement("a");
      try {
        link.href = url;
        link.download = `${pack.id}--${level.id}.replay.json`;
        document.body.append(link);
        link.click();
        get("feature-notice").textContent = "Replay-Download angefordert. Nur ein Verlauf bis zum Sieg gilt als Lösungsnachweis.";
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      console.error("Replay-Export fehlgeschlagen:", error);
      get("feature-notice").textContent = `Replay konnte nicht exportiert werden: ${error.message}`;
    }
  });
  get("pause").addEventListener("click", () => command("pause"));
  get("restart").addEventListener("click", () => command("restart"));
  overlay.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || primary.disabled) return;
    event.preventDefault();
    const buttons = menuButtons();
    const index = buttons.indexOf(document.activeElement);
    buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
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
    input = new app.InputManager(window, navigator, {
      onCommand: command,
      onDevice(device, profile) {
        get("input-hints").textContent = device === "gamepad"
          ? profile === "competition-pro"
            ? "Competition Pro: Joystick bewegen · Links groß + Richtung graben · Rechts klein Pause · Links klein Neustart · Links groß bestätigen · Rechts groß im Spiel / nach Niederlage halten: Rückspulen; sonst zurück"
            : "Gamepad: Steuerkreuz / linker Stick bewegen · A + Richtung graben · Start Pause · Y Neustart · A bestätigen · B im Spiel / nach Niederlage halten: Rückspulen; sonst zurück"
          : `${device === "mouse" ? "Maus: Menüs anklicken. " : ""}Tastatur: Pfeile / WASD bewegen · Leertaste / Umschalt + Richtung graben · Z/U halten: Rückspulen · Esc / P Pause · R Neustart · Enter bestätigen`;
      },
      onStatus(message) { get("gamepad-status").textContent = message; },
      onDisconnect() {
        if (screen === "playing" || screen === "rewinding") {
          show(state.status === "playing" ? "paused" : state.status, "Der aktive Controller wurde getrennt. Verbinde ihn erneut oder nutze die Tastatur.");
        }
      },
    });
    clock = new app.FixedClock(() => {
      if (screen === "rewinding") {
        const restored = history.back();
        if (restored) {
          state = restored;
          recorder.truncate(state.tick);
          previous = structuredClone(state);
          renderer.reset();
          updateHud();
        }
        return;
      }
      if (screen !== "playing") return;
      previous = structuredClone(state);
      const command = recorder.record(input.sample());
      app.Simulation.step(state, command);
      history.push(state, command);
      updateHud();
      if (state.status !== "playing") show(state.status);
    }, pauseForInterruption);
    get("level-name").textContent = `01 · ${level.name}`;
    show("start");
    requestAnimationFrame(frame);
  }
  boot().catch(fail);
})();
