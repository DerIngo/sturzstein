(function () {
  "use strict";
  const get = (id) => document.getElementById(id);
  const canvas = get("board");
  const overlay = get("overlay");
  const primary = get("primary");
  const secondary = get("secondary");
  const replayExport = get("replay-export");
  const toggleHints = get("toggle-hints");
  const nextLevel = get("next-level");
  const storageReset = get("storage-reset");
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
  let saveStore;
  let started = false;
  let confirmation = "restart";
  let pendingLevel = null;
  let pendingPack = null;
  let collectionAction = null;
  let collectionReturn = "start";
  let viewReturn = "start";
  let viewFocus = null;
  let viewGeneration = 0;
  let confirmationFocus = null;

  function menuButtons() {
    return [...overlay.querySelectorAll("button")].filter((button) => !button.hidden && !button.disabled && !button.closest("[hidden]"));
  }
  function nextPlayableLevel() {
    const current = pack.levels.findIndex((entry) => entry.id === level.id);
    for (let offset = 1; offset < pack.levels.length; offset++) {
      const candidate = pack.levels[(current + offset) % pack.levels.length];
      if (!saveStore.builtins.some((p) => p.id === pack.id) || saveStore.data.progress.some((entry) => entry.packId === pack.id && entry.levelId === candidate.id && entry.unlocked)) return candidate;
    }
    return null;
  }
  function updateProfile() {
    if (!saveStore) return;
    get("level-name").textContent = `${pack.title} · ${String(pack.levels.findIndex((entry) => entry.id === level.id) + 1).padStart(2, "0")} · ${level.name}`;
    const next = nextPlayableLevel();
    nextLevel.hidden = !next || !["start", "resume", "paused", "lost", "won"].includes(screen);
    nextLevel.textContent = next ? `Nächste Höhle: ${next.name} …` : "Keine weitere Höhle freigeschaltet";
    get("input-hints").hidden = !saveStore.data.settings.showHints;
    toggleHints.textContent = `Bedienhinweise: ${saveStore.data.settings.showHints ? "an" : "aus"}`;
    storageReset.hidden = !saveStore.blocked || !["start", "resume", "paused", "lost", "won"].includes(screen);
    const progress = saveStore.data.progress.filter((entry) => entry.packId === pack.id && pack.levels.some((level) => level.id === entry.levelId));
    get("progress-status").textContent = `Fortschritt: ${progress.filter((entry) => entry.solved).length} / ${pack.levels.length} gelöst · ${progress.filter((entry) => entry.unlocked).length} freigeschaltet.`;
    const best = (rewind) => {
      const entry = app.Storage.bestFor(saveStore.data, pack, level, rewind);
      return entry ? `${entry.score} Punkte (${(entry.ticks * app.Simulation.TICK_MS / 1000).toFixed(1).replace(".", ",")} s)` : "noch keiner";
    };
    get("best-status").textContent = `Bestwert ohne Rückspulen: ${best(false)} · mit Rückspulen: ${best(true)}`;
  }
  function saveCurrent() {
    if (!started || !saveStore || !recorder) return;
    saveStore.capture(pack, state, recorder);
    updateProfile();
  }

  function show(next, message = "") {
    if (next === "confirm") confirmationFocus = document.activeElement;
    screen = next;
    viewGeneration++;
    overlay.querySelector(".panel").scrollTop = 0;
    input?.setContext(["playing", "rewinding"].includes(next) ? "play" : next === "lost" ? "lost" : "menu",
      { preserveHeld: next === "rewinding" });
    overlay.hidden = ["playing", "rewinding"].includes(next);
    get("pause").disabled = !["playing", "rewinding", "paused"].includes(next);
    get("pause").textContent = next === "paused" ? "Fortsetzen" : "Pause";
    get("restart").disabled = !["playing", "paused", "lost", "won"].includes(next);
    primary.disabled = next === "error" || next === "loading";
    primary.hidden = ["packs", "help", "settings"].includes(next);
    get("continue").hidden = next !== "start";
    get("continue").disabled = !(started || saveStore?.restored) || state?.status === "won";
    const menu = ["start", "resume", "paused", "lost", "won"].includes(next);
    get("help").hidden = !menu;
    get("settings").hidden = !menu;
    get("main-menu").hidden = !["resume", "paused", "lost", "won"].includes(next);
    get("help-content").hidden = next !== "help";
    get("level-help").textContent = level ? level.name + " · " + level.description : "";
    get("manage-packs").hidden = !["start", "resume", "paused", "lost", "won"].includes(next);
    get("import-pack").hidden = next !== "packs";
    get("pack-list").hidden = next !== "packs";
    secondary.hidden = !["confirm", "resume", "packs", "help", "settings"].includes(next);
    secondary.textContent = next === "resume" ? "Neues Spiel …" : "Zurück";
    toggleHints.hidden = next !== "settings";
    replayExport.hidden = !["paused", "won", "lost"].includes(next);
    replayExport.disabled = !recorder?.ticks;
    const dialogs = {
      start: ["Sturzstein", "Sammle Edelsteine und finde den Ausgang. Neues Spiel beginnt in der ersten Kampagnenhöhle. Über die Levelauswahl erreichst du freigeschaltete und eigene Höhlen.", "Neues Spiel"],
      help: ["Hilfe", "Mit oben/unten oder dem Mausrad scrollen. Zurück oder Esc schließt die Hilfe.", ""],
      settings: ["Einstellungen", "Bedienhinweise lassen sich unter dem Spielfeld ein- oder ausblenden. Die Auswahl wird in diesem Browser gespeichert.", ""],
      resume: ["Partie fortsetzen?", state?.status === "lost"
        ? "Der gespeicherte Versuch war bereits beendet. Ohne gespeicherten Rückspulverlauf kannst du ihn nur neu starten oder als Replay exportieren."
        : "Dein letzter Zustand ist geladen. Zeit vergeht erst nach deiner Bestätigung. Der Rückspulverlauf beginnt hier neu.",
        state?.status === "lost" ? "Letzten Versuch anzeigen" : "Gespeicherte Partie fortsetzen"],
      paused: ["Pause", message || "Die Höhle wartet. Zeit und Physik sind angehalten.", "Fortsetzen"],
      packs: ["Levelauswahl", "Die Kampagne öffnet gelöste und die ersten drei ungelösten Höhlen. Zusatzhöhlen sind direkt zugänglich.", ""],
      confirm: confirmation === "collection"
        ? [collectionAction === "remove" ? "Levelpack entfernen?" : "Levelpack übernehmen?",
          collectionAction === "remove"
            ? `${pendingPack.title}: Pack, Fortschritt, Bestwerte und eine zugehörige gespeicherte Partie werden entfernt.`
            : `${pendingPack.title} · Autor ${pendingPack.author} · Revision ${pendingPack.revision}. ${pendingPack.source} · ${pendingPack.license}. Lösbarkeit ungeprüft. Eine gleiche Pack-ID wird ersetzt. Fortschritte und Partien geänderter Level werden verworfen.`,
          collectionAction === "remove" ? "Entfernen" : "Übernehmen"]
        : confirmation === "level"
        ? ["Höhle wechseln?", `${pendingLevel.name} · Schwierigkeit ${pendingLevel.difficulty}/5 · ${pendingLevel.quota} Edelsteine · ${pendingLevel.timeLimit} Sekunden. ${pendingLevel.description} Eine vorhandene Partie wird ersetzt; Fortschritt und Bestwerte bleiben erhalten.`, "Höhle betreten"]
        : confirmation === "storage"
        ? ["Speicherdaten ersetzen?", "Vorhandene Browserdaten werden durch die Daten dieser Sitzung ersetzt. Beschädigte oder inkompatible Partien gehen verloren. Nicht lesbare Bestwerte und Einstellungen können nicht übernommen werden.", "Daten ersetzen"]
        : confirmation === "newgame"
        ? ["Neu beginnen?", "Die aktuelle Partie wird durch einen neuen Versuch in der ersten Kampagnenhöhle ersetzt. Fortschritt und Bestwerte bleiben erhalten.", "Neues Spiel"]
        : ["Neu beginnen?", "Die aktuelle Partie wird verworfen. Dieselbe Höhle startet mit voller Zeit neu.", "Neu starten"],
      won: ["Ausgang erreicht!", `Du hast die Höhle geschafft. ${state?.score || 0} Punkte – gut gemacht!`, "Noch einmal"],
      lost: ["Verschüttet?", `${state?.reason || "Diese Runde ist vorbei."} ${history?.availableTicks
        ? "Z/U oder die Controller-Rückspultaste halten, um zurückzugehen."
        : "Kein Rückspulverlauf verfügbar; starte die Höhle neu."}`, "Erneut versuchen"],
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
    } else if (next === "help" || next === "settings") {
      secondary.focus();
    } else if (next === "packs") {
      get("import-pack").focus();
    } else if (!primary.disabled) {
      primary.focus();
    }
    if (state) updateHud();
    updateProfile();
    if (["playing", "paused", "lost", "won", "confirm"].includes(next)) saveCurrent();
  }
  function updateHud() {
    get("gems").textContent = `${state.collected} / ${state.quota}`;
    const seconds = Math.ceil(state.remainingTicks / 10);
    get("time").textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    get("score").textContent = String(state.score);
    get("rewind-time").textContent = `${((history?.availableTicks || 0) * app.Simulation.TICK_MS / 1000).toFixed(1).replace(".", ",")} s`;
    get("rewind-status").textContent = `${recorder?.replay.usedRewind ? "Mit Rückspulen" : "Ohne Rückspulen"} · Z/U oder Controller-Rückspultaste halten, auch nach einer Niederlage.`;
    status.textContent = state.status === "lost" ? state.reason
      : state.status === "won" ? `Ausgang erreicht · ${state.score} Punkte.`
      : screen === "rewinding"
      ? history.availableTicks ? "Rückspulen … Zum Weiterspielen loslassen." : "Anfang des verfügbaren Verlaufs erreicht. Zum Weiterspielen loslassen."
      : state.collected >= state.quota
      ? "Die Quote ist erfüllt. Der grün leuchtende Ausgang ist offen!"
      : `Noch ${state.quota - state.collected} Edelsteine bis zum offenen Ausgang.`;
  }
  function restart() {
    state = app.Simulation.createState(pack, level.id);
    recorder = new app.Replay.Recorder(pack, level.id);
    history = new app.Rewind.RewindHistory(state);
    started = true;
    get("feature-notice").textContent = "";
    previous = structuredClone(state);
    renderer.reset();
    show("playing");
  }
  function newGame() {
    pendingPack = saveStore.packs[0];
    pendingLevel = pendingPack.levels[0];
    if ((started || saveStore.restored) && state.status !== "won") {
      beforeConfirm = screen;
      confirmation = "newgame";
      show("confirm");
    } else {
      pack = pendingPack;
      level = pendingLevel;
      restart();
    }
  }
  function returnFromView() {
    show(viewReturn);
    if (viewFocus && !viewFocus.hidden) viewFocus.focus();
  }
  function cancelConfirmation() {
    show(beforeConfirm);
    if (confirmationFocus?.isConnected && confirmationFocus.closest("#overlay")
      && !confirmationFocus.closest("[hidden]") && !confirmationFocus.disabled) confirmationFocus.focus();
  }
  function confirm() {
    if (screen === "start") { newGame(); return; }
    if (screen === "confirm" && confirmation === "collection") {
      try {
        // Die angehaltene Partie wurde bereits beim Öffnen der Verwaltung gesichert.
        const activeAffected = pendingPack.id === pack.id;
        const persisted = collectionAction === "remove"
          ? saveStore.removePack(pendingPack.id) : saveStore.importPack(pendingPack);
        if (activeAffected) {
          const updated = saveStore.packs.find((p) => p.id === pack.id);
          const compatible = updated && app.Packs.compatible(level, updated.levels.find((l) => l.id === level.id));
          if (compatible) { pack = updated; level = pack.levels.find((l) => l.id === level.id); }
          else {
            pack = saveStore.packs[0];
            level = pack.levels[0];
            state = app.Simulation.createState(pack, level.id);
            previous = structuredClone(state);
            started = false;
            recorder = null;
            history = null;
            renderer.reset();
            collectionReturn = "start";
          }
        }
        renderPacks();
        show("packs");
        get("dialog-text").textContent = persisted ? "Sammlung lokal gespeichert."
          : "Änderung nur temporär nutzbar. Der bisherige Speicher bleibt erhalten. " + saveStore.message;
      } catch (error) { show("packs"); get("dialog-text").textContent = error.message; }
      return;
    }
    if (screen === "resume") {
      started = true;
      show(state.status === "playing" ? "playing" : state.status);
      return;
    }
    if (screen === "confirm" && confirmation === "storage") {
      if (saveStore.reset()) saveCurrent();
      show(beforeConfirm);
      return;
    }
    if (screen === "confirm" && ["level", "newgame"].includes(confirmation)) {
      if (pendingPack) pack = pendingPack;
      level = pendingLevel;
    }
    if (screen === "start" || screen === "won" || screen === "lost" || screen === "confirm") restart();
    else if (screen === "paused") show("playing");
  }
  function command(action, direction) {
    if (["loading", "error"].includes(screen)) return;
    if (action === "navigate" && screen === "help" && ["up", "down"].includes(direction)) {
      overlay.querySelector(".panel").scrollBy({ top: direction === "down" ? 100 : -100 });
      return;
    }
    if (action === "navigate" && !overlay.hidden) {
      const buttons = menuButtons();
      const index = buttons.indexOf(document.activeElement);
      const step = direction === "up" || direction === "left" ? -1 : 1;
      buttons[(index + step + buttons.length) % buttons.length]?.focus();
      return;
    }
    if (action === "confirm") {
      if (!overlay.hidden && menuButtons().includes(document.activeElement)) document.activeElement.click();
      else if (!["packs", "help", "settings"].includes(screen)) confirm();
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
      confirmation = "restart";
      show("confirm");
    } else if (action === "restart" && ["won", "lost"].includes(screen)) {
      restart();
    } else if (action === "escape" && ["help", "settings"].includes(screen)) {
      returnFromView();
    } else if (action === "escape" && screen === "packs") {
      show(collectionReturn);
    } else if (action === "escape" && screen === "confirm") {
      cancelConfirmation();
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
  window.addEventListener("pagehide", saveCurrent);
  primary.addEventListener("click", confirm);
  secondary.addEventListener("click", () => {
    if (screen === "resume") newGame();
    else if (["help", "settings"].includes(screen)) returnFromView();
    else if (screen === "confirm") cancelConfirmation();
    else show(screen === "packs" ? collectionReturn : beforeConfirm);
  });
  toggleHints.addEventListener("click", () => {
    saveStore.data.settings.showHints = !saveStore.data.settings.showHints;
    saveStore.persist();
    updateProfile();
  });
  nextLevel.addEventListener("click", () => {
    pendingPack = pack;
    pendingLevel = nextPlayableLevel();
    if (!pendingLevel) throw new Error("Keine weitere freigeschaltete Höhle verfügbar.");
    beforeConfirm = screen;
    confirmation = "level";
    show("confirm");
  });
  storageReset.addEventListener("click", () => {
    beforeConfirm = screen;
    confirmation = "storage";
    show("confirm");
  });
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

  function collectionConfirm(action, candidate) {
    pendingPack = candidate;
    collectionAction = action;
    beforeConfirm = "packs";
    confirmation = "collection";
    show("confirm");
  }
  function renderPacks() {
    const list = get("pack-list");
    list.replaceChildren();
    for (const candidate of saveStore.packs) {
      const title = document.createElement("p");
      title.textContent = candidate.title + " · " + candidate.author;
      list.append(title);
      for (const entry of candidate.levels) {
        const unlocked = !saveStore.builtins.some((p) => p.id === candidate.id)
          || saveStore.data.progress.some((p) => p.packId === candidate.id && p.levelId === entry.id && p.unlocked);
        const button = document.createElement("button");
        const progress = saveStore.data.progress.find((p) => p.packId === candidate.id && p.levelId === entry.id);
        const builtin = saveStore.builtins.some((p) => p.id === candidate.id);
        button.textContent = entry.name + (builtin
          ? progress?.solved ? " · gelöst" : unlocked ? "" : " · gesperrt"
          : " · Lösbarkeit ungeprüft");
        button.disabled = !unlocked;
        button.addEventListener("click", () => {
          pendingPack = candidate;
          pendingLevel = entry;
          beforeConfirm = "packs";
          confirmation = "level";
          show("confirm");
        });
        list.append(button);
      }
      if (!saveStore.builtins.some((p) => p.id === candidate.id)) {
        const remove = document.createElement("button");
        remove.textContent = candidate.title + " entfernen …";
        remove.addEventListener("click", () => collectionConfirm("remove", candidate));
        list.append(remove);
      }
    }
  }
  get("continue").addEventListener("click", () => {
    started = true;
    show(state.status === "playing" ? "playing" : state.status);
  });
  get("main-menu").addEventListener("click", () => {
    saveCurrent();
    show("start");
  });
  for (const name of ["help", "settings"]) {
    get(name).addEventListener("click", () => {
      viewReturn = screen;
      viewFocus = get(name);
      saveCurrent();
      show(name);
    });
  }
  get("manage-packs").addEventListener("click", () => {
    collectionReturn = screen;
    saveCurrent();
    renderPacks();
    show("packs");
  });
  get("import-pack").addEventListener("click", () => get("pack-file").click());
  get("pack-file").addEventListener("change", async () => {
    const file = get("pack-file").files[0];
    get("pack-file").value = "";
    if (!file) return;
    const generation = ++viewGeneration;
    try {
      if (file.size > app.Levels.limits.bytes) throw new Error(file.name + ": Datei überschreitet 1 MiB.");
      const candidate = app.Levels.parsePack(await file.text(), file.name);
      if (screen !== "packs" || generation !== viewGeneration) return;
      if (saveStore.builtins.some((p) => p.id === candidate.id)) throw new Error(file.name + ": Integriertes Pack ist geschützt.");
      const previous = saveStore.packs.find((p) => p.id === candidate.id);
      if (previous) app.Packs.replacement(previous, candidate);
      app.Packs.validateCollection([...saveStore.packs.filter((p) => !saveStore.builtins.some((b) => b.id === p.id) && p.id !== candidate.id), candidate], saveStore.builtins);
      collectionConfirm("import", candidate);
    } catch (error) { if (screen === "packs" && generation === viewGeneration) get("dialog-text").textContent = file.name + ": " + error.message; }
  });

  async function boot() {
    pack = app.Levels.validatePack(app.packs[0]);
    level = pack.levels[0];
    state = app.Simulation.createState(pack, level.id);
    const packs = app.packs.map((entry) => app.Levels.validatePack(entry));
    saveStore = new app.Storage.SaveStore(() => window.localStorage, packs,
      (message) => { get("storage-status").textContent = message; });
    if (saveStore.restored) {
      ({ pack, state, recorder } = saveStore.restored);
      level = pack.levels.find((entry) => entry.id === state.levelId);
      history = new app.Rewind.RewindHistory(state);
    }
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
        get("help-controls").textContent = get("input-hints").textContent;
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
          if (state.tick % 10 === 0) saveCurrent();
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
      else if (state.tick % 10 === 0) saveCurrent();
    }, pauseForInterruption);
    show(saveStore.restored ? "resume" : "start");
    requestAnimationFrame(frame);
  }
  boot().catch(fail);
})();
