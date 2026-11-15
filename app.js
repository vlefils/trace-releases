/* TRACE — page de téléchargement. Aucun module externe ; chaque bloc est indépendant. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const safely = (name, start) => {
    const report = error => console.warn(`[trace] ${name}`, error);
    try { const result = start(); if (result && result.catch) result.catch(report); } catch (error) { report(error); }
  };

  /* ── Défilement : barre, rail latéral, barre du haut ── */
  safely("scroll", () => {
    const bar = $("#progress-bar"), fill = $("#rail-fill"), topbar = $("#topbar");
    const sections = $$("[data-section]");
    const links = new Map($$(".rail a").map(link => [link.dataset.rail, link]));
    let queued = false;
    const update = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const progress = max > 0 ? Math.min(1, scrollY / max) : 0;
      bar.style.transform = `scaleX(${progress})`;
      topbar.classList.toggle("is-solid", scrollY > 40);
      const line = innerHeight * 0.45;
      let current = 0;
      sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= line) current = index; });
      // Le rail se remplit de repère en repère, au rythme de la section traversée.
      const box = sections[current].getBoundingClientRect();
      const within = Math.min(1, Math.max(0, (line - box.top) / Math.max(1, box.height)));
      fill.style.transform = `scaleY(${Math.min(1, (current + within) / Math.max(1, sections.length - 1))})`;
      sections.forEach((section, index) => {
        const link = links.get(section.id);
        if (!link) return;
        link.classList.toggle("is-on", index === current);
        link.classList.toggle("is-past", index < current);
      });
    };
    const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", request);
    update();
  });

  /* ── Apparition au défilement, avec décalage entre voisins ── */
  safely("reveal", () => {
    for (const group of $$(".features, .downloads, .intro")) {
      $$(":scope > .reveal", group).forEach((item, index) => item.style.setProperty("--d", `${index * 90}ms`));
    }
    const items = $$(".reveal");
    if (calm || !("IntersectionObserver" in window)) { items.forEach(item => item.classList.add("is-in")); return; }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-in"); observer.unobserve(entry.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(item => observer.observe(item));
  });

  /* ── Compteurs ── */
  safely("counters", () => {
    const counters = $$("[data-count]");
    if (calm || !("IntersectionObserver" in window)) return;
    const run = element => {
      const target = Number(element.dataset.count), suffix = element.dataset.suffix || "", started = performance.now();
      const step = now => {
        const t = Math.min(1, (now - started) / 1300), eased = 1 - Math.pow(1 - t, 3);
        element.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { run(entry.target); observer.unobserve(entry.target); }
    }, { threshold: 0.6 });
    counters.forEach(counter => observer.observe(counter));
  });

  /* ── Projecteur sur les cartes et boutons aimantés ── */
  safely("pointer", () => {
    if (!finePointer) return;
    for (const card of $$("[data-spot]")) {
      card.addEventListener("pointermove", event => {
        const box = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - box.left}px`);
        card.style.setProperty("--my", `${event.clientY - box.top}px`);
      });
    }
    if (calm) return;
    for (const button of $$("[data-magnetic]")) {
      button.addEventListener("pointermove", event => {
        const box = button.getBoundingClientRect();
        button.style.setProperty("--tx", `${(event.clientX - box.left - box.width / 2) * 0.22}px`);
        button.style.setProperty("--ty", `${(event.clientY - box.top - box.height / 2) * 0.3}px`);
      });
      button.addEventListener("pointerleave", () => { button.style.setProperty("--tx", "0px"); button.style.setProperty("--ty", "0px"); });
    }
  });

  /* ── Accueil : trois décors, fondu par déplacement et lanterne qui suit le pointeur ── */
  safely("hero", () => {
    const stage = $("#hero-stage"), hero = $("#top"), slides = $$(".hero-slide", stage), buttons = $$("#worlds-switch button");
    const HOLD = 8000;
    let current = 0, timer = 0, visible = true, renderer = null;
    $("#worlds-switch").style.setProperty("--world-time", `${HOLD}ms`);

    const show = (index, user) => {
      if (index === current && !user) return;
      current = index;
      slides.forEach((slide, i) => slide.classList.toggle("is-on", i === index));
      buttons.forEach((button, i) => {
        button.classList.remove("is-on");
        if (i === index) { void button.offsetWidth; button.classList.add("is-on"); }
      });
      if (renderer) renderer.goTo(index);
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (calm || !visible || document.hidden) return;
      timer = setTimeout(() => show((current + 1) % slides.length), HOLD);
    };
    buttons.forEach((button, index) => button.addEventListener("click", () => show(index, true)));
    document.addEventListener("visibilitychange", schedule);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (renderer) renderer.setActive(visible); schedule(); }, { threshold: 0.05 }).observe(hero);
    }
    schedule();
    if (calm) return;

    const ready = slides.map(slide => slide.complete && slide.naturalWidth ? Promise.resolve()
      : new Promise((resolve, reject) => { slide.addEventListener("load", resolve, { once: true }); slide.addEventListener("error", reject, { once: true }); }));
    Promise.all(ready).then(() => {
      renderer = createRenderer($("#hero-gl"), slides, hero);
      if (!renderer) return;
      renderer.goTo(current, true);
      stage.classList.add("is-gl");
    }).catch(() => { /* Les images restent affichées par le fondu CSS. */ });
  });

  function createRenderer(canvas, images, hero) {
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return null;
    const vertex = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }";
    const fragment = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_a, u_b;
uniform float u_p, u_time, u_ia, u_ib, u_fa, u_fb;
uniform vec2 u_res, u_mouse;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.; a *= .5; } return v; }
vec2 cover(vec2 uv, float ia, float fx){
  float sa = u_res.x / u_res.y;
  vec2 s = sa > ia ? vec2(1., ia / sa) : vec2(sa / ia, 1.);
  vec2 c = clamp(vec2(fx, .5), s * .5, 1. - s * .5);
  return (uv - .5) * s + c;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  float zoom = 1.07 + .025 * sin(u_time * .11);
  vec2 q = (uv - .5) / zoom + .5 + (u_mouse - .5) * vec2(-.016, -.012);
  float n = fbm(uv * vec2(aspect, 1.) * 2.4 + u_time * .025);
  float t = smoothstep(n - .12, n + .12, u_p * 1.24 - .12);
  vec2 d = vec2(n, noise(uv * 3.1 + 9.)) - .5;
  vec3 a = texture2D(u_a, cover(q + d * .1 * u_p, u_ia, u_fa)).rgb;
  vec3 b = texture2D(u_b, cover(q - d * .1 * (1. - u_p), u_ib, u_fb)).rgb;
  vec3 c = mix(a, b, t);
  c += vec3(.95, .72, .42) * t * (1. - t) * 1.5;
  vec2 m = (uv - u_mouse) * vec2(aspect, 1.);
  float l = exp(-dot(m, m) * 3.4);
  c *= mix(.46, 1.14, l);
  c += vec3(.9, .68, .4) * l * .05;
  c += (hash(gl_FragCoord.xy + fract(u_time) * 61.) - .5) * .035;
  gl_FragColor = vec4(c, 1.);
}`;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "shader");
      return shader;
    };
    let program, textures;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(program);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      // Une image locale ouverte en file:// est refusée ici ; le fondu CSS prend alors le relais.
      textures = images.map(image => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        for (const [name, value] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
          [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, name, value);
        return { texture, aspect: image.naturalWidth / image.naturalHeight, focus: Number(image.dataset.focus) || 0.5 };
      });
    } catch (error) { console.warn("[trace] webgl", error); return null; }

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = Object.fromEntries(["u_a", "u_b", "u_p", "u_time", "u_ia", "u_ib", "u_fa", "u_fb", "u_res", "u_mouse"]
      .map(name => [name, gl.getUniformLocation(program, name)]));
    gl.uniform1i(uniform.u_a, 0); gl.uniform1i(uniform.u_b, 1);

    const FADE = 1900;
    let from = 0, to = 0, startedFade = -1, active = true, lost = false, frame = 0, last = 0;
    let pointerAt = 0;
    const mouse = { x: 0.5, y: 0.55 }, target = { x: 0.5, y: 0.55 };
    const resize = () => {
      const scale = Math.min(Math.min(devicePixelRatio || 1, 1.5), 1440 / Math.max(1, canvas.clientWidth));
      const width = Math.max(2, Math.round(canvas.clientWidth * scale)), height = Math.max(2, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
    };
    const bind = (unit, entry, aspectName, focusName) => {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.uniform1f(uniform[aspectName], entry.aspect); gl.uniform1f(uniform[focusName], entry.focus);
    };
    const draw = now => {
      frame = 0;
      if (!active || lost || document.hidden) return;
      frame = requestAnimationFrame(draw);
      const fading = startedFade >= 0;
      if (!fading && now - last < 30) return;   // Trente images par seconde suffisent hors transition.
      last = now;
      resize();
      let progress = 0;
      if (fading) {
        const t = Math.min(1, (now - startedFade) / FADE);
        progress = t * t * (3 - 2 * t);
        if (t >= 1) { from = to; startedFade = -1; progress = 0; }
      }
      if (now - pointerAt > 3500) {   // Sans pointeur, la lanterne se promène seule.
        target.x = 0.5 + 0.3 * Math.cos(now * 0.00021); target.y = 0.56 + 0.16 * Math.sin(now * 0.00033);
      }
      mouse.x += (target.x - mouse.x) * 0.06; mouse.y += (target.y - mouse.y) * 0.06;
      bind(0, textures[from], "u_ia", "u_fa"); bind(1, textures[to], "u_ib", "u_fb");
      gl.uniform1f(uniform.u_p, progress);
      gl.uniform1f(uniform.u_time, now / 1000);
      gl.uniform2f(uniform.u_res, canvas.width, canvas.height);
      gl.uniform2f(uniform.u_mouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const wake = () => { if (!frame && active && !lost) frame = requestAnimationFrame(draw); };
    hero.addEventListener("pointermove", event => {
      const box = canvas.getBoundingClientRect();
      target.x = (event.clientX - box.left) / box.width; target.y = 1 - (event.clientY - box.top) / box.height;
      pointerAt = performance.now();
    }, { passive: true });
    document.addEventListener("visibilitychange", wake);
    canvas.addEventListener("webglcontextlost", event => { event.preventDefault(); lost = true; canvas.parentElement.classList.remove("is-gl"); });
    wake();
    return {
      goTo(index, instant) {
        if (instant) { from = to = index; startedFade = -1; return; }
        if (startedFade >= 0) from = to;
        if (index === from) return;
        to = index; startedFade = performance.now();
      },
      setActive(value) { active = value; wake(); },
    };
  }

  /* ── Scène jouable ── */
  safely("demo", () => {
    const feed = $("#feed"), choices = $("#choices"), hpValue = $("#hp-value"), hpBar = $("#hp-bar");
    const MAX_HP = 28, intro = feed.innerHTML;
    const state = { profile: "cool", hp: MAX_HP, busy: false, turn: [], hpBefore: MAX_HP };
    const DIE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3l18 10.5v21L24 45 6 34.5v-21L24 3zM24 3v13m0 0l18-2.5M24 16L6 13.5M24 16l-9 16m9-16l9 16m-18 0h18m-18 0L6 34.5M33 32l9 2.5M15 32l9 13 9-13"/></svg>';
    const ACTIONS = [
      { label: "Je longe le mur dans l’ombre jusqu’à la chapelle.", skill: "Discrétion", bonus: 4, difficulty: 16,
        outcome: (won, profile) => won
          ? { text: "Tu te glisses le long du mur, d’une ombre à l’autre. L’arbalétrière ne tourne pas la tête. Dans la chapelle, des bancs renversés font face à un autel fendu ; derrière le chœur, un passage descend." }
          : profile === "cool"
            ? { text: "La cour offre trop peu de couvert : l’arbalétrière t’aperçoit et tire. Le carreau t’entaille l’épaule alors que tu plonges dans la chapelle. Tu perds 3 points de vie, mais tu es à l’intérieur.", damage: 3,
                hint: "Style cool : l’échec coûte, mais l’histoire avance." }
            : { text: "La cour offre trop peu de couvert. L’arbalétrière te repère et tourne son arme vers toi. Tu es encore à découvert, à mi-chemin de la chapelle. Que fais-tu ?",
                hint: "Style strict : un échec vous laisse là où il vous a trouvée." } },
      { label: "Je lui crie que Grisegueule m’envoie relever la garde.", skill: "Charisme", bonus: 1, difficulty: 16,
        outcome: won => won
          ? { text: "Elle te dévisage, puis baisse son arbalète. « Si c’est Grisegueule qui t’envoie… Ne traîne pas dans la cour. » Elle retourne à ses chevaux et te laisse passer." }
          : { text: "Elle plisse les yeux. « Grisegueule n’envoie personne sans mot de passe. » Son arbalète se lève vers toi : te voilà repérée, et elle n’a pas l’air de plaisanter." } },
      { label: "Je vais chercher ma charrette et mon mulet, laissés derrière le porche.",
        outcome: (won, profile) => profile === "cool"
          ? { text: "Tu ressors par le porche. Ta charrette est là, le mulet attaché à un anneau ; il secoue les oreilles en te reconnaissant. De quoi emmener du monde, ou du butin.",
              hint: "Style cool : le maître du jeu accorde ce qui sert l’histoire." }
          : { text: "Derrière le porche, tu ne trouves ni charrette ni mulet. Seulement des ornières dans la boue et le vent qui se lève.",
              hint: "Style strict : ce que la table ne contient pas n’existe pas." } },
    ];

    const pause = ms => new Promise(resolve => setTimeout(resolve, calm ? 0 : ms));
    const follow = () => { feed.scrollTop = feed.scrollHeight; };
    const add = (tag, className, text = "") => {
      const element = document.createElement(tag);
      element.className = className; element.textContent = text;
      feed.append(element); state.turn.push(element); follow();
      return element;
    };
    const type = async (element, text) => {
      if (calm) { element.textContent = text; follow(); return; }
      element.classList.add("caret");
      for (let index = 0; index <= text.length; index += 2) {
        element.textContent = text.slice(0, index); follow();
        await new Promise(requestAnimationFrame);
      }
      element.textContent = text; element.classList.remove("caret");
    };
    const setHp = value => {
      state.hp = value; hpValue.textContent = value;
      hpBar.style.transform = `scaleX(${value / MAX_HP})`;
      hpBar.classList.toggle("is-hurt", value < MAX_HP);
    };
    const roll = async action => {
      const box = add("div", "roll is-rolling");
      box.innerHTML = `<span class="die">${DIE}<b>20</b></span><span>${action.skill} : le dé roule…</span>`;
      const face = $("b", box), line = box.lastElementChild;
      const until = performance.now() + (calm ? 0 : 950);
      while (performance.now() < until) { face.textContent = 1 + Math.floor(Math.random() * 20); await pause(55); }
      const die = 1 + Math.floor(Math.random() * 20), total = die + action.bonus, won = total >= action.difficulty;
      face.textContent = die;
      box.classList.remove("is-rolling"); box.classList.add("is-done", won ? "is-win" : "is-loss");
      line.innerHTML = `${action.skill} : ${die} + ${action.bonus} = <strong>${total}</strong> contre ${action.difficulty}<br><strong>${won ? "Réussite" : "Échec"}</strong>`;
      follow();
      await pause(450);
      return won;
    };
    const button = (label, handler, quiet) => {
      const element = document.createElement("button");
      element.type = "button"; element.className = quiet ? "choice choice-quiet" : "choice"; element.textContent = label;
      element.addEventListener("click", handler);
      choices.append(element);
      return element;
    };
    const offerActions = () => { choices.replaceChildren(); ACTIONS.forEach(action => button(action.label, () => play(action))); };
    const offerAfter = () => {
      choices.replaceChildren();
      button("Corriger cette action", correct, true);
      button("Rejouer la scène depuis le début", reset, true);
    };
    const play = async action => {
      if (state.busy) return;
      state.busy = true; state.turn = []; state.hpBefore = state.hp;
      $$("button", choices).forEach(item => { item.disabled = true; });
      add("p", "you", action.label);
      await pause(350);
      const won = action.skill ? await roll(action) : true;
      const result = action.outcome(won, state.profile);
      await type(add("p", "gm"), result.text);
      if (result.damage) setHp(Math.max(0, state.hp - result.damage));
      if (result.hint) add("p", "hint", result.hint);
      state.busy = false;
      offerAfter();
    };
    const correct = () => {
      if (state.busy || !state.turn.length) return;
      const archive = document.createElement("details"), summary = document.createElement("summary");
      summary.textContent = "Version remplacée : consulter l’ancien passage";
      archive.append(summary, ...state.turn);
      feed.append(archive); state.turn = [];
      setHp(state.hpBefore);
      add("p", "hint", "Action annulée, ses conséquences aussi. À vous de rejouer.");
      state.turn = [];
      offerActions(); follow();
    };
    const reset = () => { if (state.busy) return; feed.innerHTML = intro; state.turn = []; setHp(MAX_HP); offerActions(); };

    for (const toggle of $$("[data-profile]")) {
      toggle.addEventListener("click", () => {
        state.profile = toggle.dataset.profile;
        $$("[data-profile]").forEach(item => item.setAttribute("aria-pressed", String(item === toggle)));
      });
    }
    offerActions();
  });

  /* ── Galerie des mondes ── */
  safely("worlds", () => {
    const panels = $$(".world");
    const open = panel => panels.forEach(item => item.classList.toggle("is-open", item === panel));
    for (const panel of panels) {
      if (finePointer) panel.addEventListener("pointerenter", () => open(panel));
      panel.addEventListener("focus", () => open(panel));
      panel.addEventListener("click", () => open(panel));
    }
  });

  /* ── Bande de portraits : la liste est doublée pour boucler sans couture ── */
  safely("faces", () => {
    const track = $("#faces-track");
    if (calm) return;
    for (const figure of $$("figure", track)) {
      const copy = figure.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      track.append(copy);
    }
  });

  /* ── Onglets du guide ── */
  safely("tabs", () => {
    const tabs = $$('#install-tabs [role="tab"]');
    const select = (tab, focus) => {
      for (const item of tabs) {
        const on = item === tab;
        item.setAttribute("aria-selected", String(on)); item.tabIndex = on ? 0 : -1;
        document.getElementById(item.getAttribute("aria-controls")).hidden = !on;
      }
      if (focus) tab.focus();
    };
    select(tabs.find(tab => tab.getAttribute("aria-selected") === "true") || tabs[0]);
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", event => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        select(tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length], true);
      });
    });
  });

  /* ── Boutons « Copier » ── */
  safely("copy", () => {
    const write = async text => {
      if (navigator.clipboard && isSecureContext) return navigator.clipboard.writeText(text);
      const area = document.createElement("textarea");
      area.value = text; area.setAttribute("readonly", ""); area.style.cssText = "position:fixed;opacity:0";
      document.body.append(area); area.select();
      const copied = document.execCommand("copy");
      area.remove();
      if (!copied) throw new Error("copy");
    };
    for (const button of $$("[data-copy]")) {
      const label = button.textContent;
      button.addEventListener("click", async () => {
        try { await write($("code", button.parentElement).textContent); button.textContent = "Copié"; button.classList.add("is-done"); }
        catch { button.textContent = "Sélectionnez le texte"; }
        setTimeout(() => { button.textContent = label; button.classList.remove("is-done"); }, 2200);
      });
    }
  });

  /* ── Dernière version publiée, lue sur GitHub ── */
  safely("release", async () => {
    const repo = document.body.dataset.releases;
    if (!repo) return;
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) return;   // Les liens « latest » restent valables sans ces détails.
    const release = await response.json();
    const assets = new Map((release.assets || []).map(asset => [asset.name, asset]));
    const version = release.tag_name || release.name || "";
    const date = release.published_at ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(release.published_at)) : "";
    for (const link of $$("[data-asset]")) {
      const asset = assets.get(link.dataset.asset);
      if (asset && asset.browser_download_url) link.href = asset.browser_download_url;
    }
    for (const card of $$(".dl-card")) {
      const asset = assets.get($("[data-primary]", card).dataset.asset);
      if (!asset) continue;
      $("[data-meta]", card).textContent = [version && `Version ${version}`, date, `${Math.round(asset.size / 1e6)} Mo`].filter(Boolean).join(" · ");
    }
    if (version) {
      $("#release-line").textContent = `Version ${version}${date ? `, publiée le ${date}` : ""}. Choisissez le paquet de votre ordinateur.`;
      $("#hero-note").textContent = `Version ${version} · macOS, Windows et Linux · avec Codex ou Claude Code`;
    }
  });

  /* ── Recommander le paquet du visiteur quand le navigateur le permet ── */
  safely("platform", async () => {
    const agent = navigator.userAgent, data = navigator.userAgentData;
    const platform = (data && data.platform) || navigator.platform || "";
    const mobileApple = /iPhone|iPad|iPod/.test(agent) || (/Mac/.test(platform) && navigator.maxTouchPoints > 1);
    const journey = system => { const tab = document.getElementById(`tab-${system}`); if (tab) tab.click(); };
    const recommend = (system, arch) => {
      journey(system);
      const card = $(`.dl-card[data-system="${system}"][data-arch="${arch}"]`);
      if (!card) return;
      card.classList.add("is-match");
      $(".dl-badge", card).hidden = false;
    };
    if (mobileApple || /Android/.test(agent)) {
      const notice = $("#platform-notice");
      notice.textContent = "Vous consultez cette page depuis un téléphone ou une tablette. TRACE s’installe sur un ordinateur : gardez ce lien pour y revenir.";
      notice.hidden = false;
      return;
    }
    if (/Win/.test(platform)) return recommend("windows", "x86_64");
    if (/Linux/.test(platform)) return recommend("linux", "x86_64");
    if (!/mac/i.test(platform)) return;
    journey("macos");
    let arch = null;
    if (data && data.getHighEntropyValues) {
      try { const values = await data.getHighEntropyValues(["architecture"]); arch = values.architecture === "arm" ? "arm64" : values.architecture === "x86" ? "x86_64" : null; } catch { /* inconnu */ }
    }
    if (!arch) {
      try {
        const gl = document.createElement("canvas").getContext("webgl");
        const info = gl && gl.getExtension("WEBGL_debug_renderer_info");
        const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
        if (/Apple M\d/.test(name)) arch = "arm64"; else if (/Intel|AMD|Radeon/.test(name)) arch = "x86_64";
      } catch { /* inconnu */ }
    }
    if (arch) recommend("macos", arch);   // Safari masque le processeur : aucune recommandation plutôt qu'une fausse.
  });
})();
