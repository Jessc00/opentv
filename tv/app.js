/* OpenTV. Everything is driven by arrow keys + Enter + Esc, the same keys a TV remote sends,
   so this exact page can run in Chrome on a Mac or as an app on a TV.
   Home is a launcher (your apps, your background, your look). AI Studio is one app inside it. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage");

  // ---------------------------------------------------------------- catalog

  // mono = single-colour mark (Simple Icons), drawn as a mask so it can be white or brand-coloured.
  // Otherwise it's the official multi-colour wordmark as an image.
  // bg/fg = the app's real icon colours, used by the colourful designs. img = how a wordmark image is tinted
  // on its coloured tile (white, black or its own colours). dark = the tile is light, so text goes dark.
  var APPS = {
    netflix: { name: "Netflix", logo: "netflix", mono: true, color: "#E50914", url: "https://www.netflix.com",
               bg: "linear-gradient(150deg,#242424,#050505)", fg: "#E50914", tag: "Movies, shows and games" },
    youtube: { name: "YouTube", logo: "youtube", mono: true, color: "#FF0000", url: "https://www.youtube.com",
               bg: "linear-gradient(150deg,#FF2A2A,#D90000)", fg: "#FFFFFF", tag: "Videos from everyone" },
    primevideo: { name: "Prime Video", logo: "primevideo", wide: true, url: "https://www.primevideo.com",
                  bg: "linear-gradient(150deg,#1FA8FF,#0A6FD6)", img: "white", tag: "Originals, movies and live sports" },
    disneyplus: { name: "Disney+", logo: "disneyplus", wide: true, url: "https://www.disneyplus.com",
                  bg: "linear-gradient(150deg,#1C3F9E,#071447)", img: "white", tag: "Disney, Pixar, Marvel and Star Wars" },
    appletv: { name: "Apple TV", logo: "appletv", mono: true, wide: true, color: "#FFFFFF", url: "https://tv.apple.com",
               bg: "linear-gradient(150deg,#3A3A3E,#0B0B0C)", fg: "#FFFFFF", tag: "Apple Originals" },
    hbomax: { name: "HBO Max", logo: "hbomax", mono: true, wide: true, color: "#FFFFFF", url: "https://www.hbomax.com",
              bg: "linear-gradient(150deg,#3D4BF5,#1A1499)", fg: "#FFFFFF", tag: "HBO, movies and more" },
    hulu: { name: "Hulu", logo: "hulu", wide: true, small: true, url: "https://www.hulu.com",
            bg: "linear-gradient(150deg,#3DF59A,#14C96F)", img: "black", dark: true, tag: "TV, movies and live TV" },
    spotify: { name: "Spotify", logo: "spotify", mono: true, color: "#1ED760", url: "https://open.spotify.com",
               bg: "linear-gradient(150deg,#262626,#0B0B0B)", fg: "#1ED760", tag: "Music and podcasts" },
    paramountplus: { name: "Paramount+", logo: "paramountplus", mono: true, color: "#0064FF", url: "https://www.paramountplus.com",
                     bg: "linear-gradient(150deg,#1A7BFF,#0040B8)", fg: "#FFFFFF", tag: "A mountain of entertainment" },
    peacock: { name: "Peacock", logo: "peacock", wide: true, url: "https://www.peacocktv.com",
               bg: "linear-gradient(150deg,#FFFFFF,#E9E9EC)", img: "none", dark: true, tag: "Shows, movies and sports" },
    youtubetv: { name: "YouTube TV", logo: "youtubetv", mono: true, wide: true, color: "#FF0000", url: "https://tv.youtube.com",
                 bg: "linear-gradient(150deg,#FFFFFF,#ECECEC)", fg: "#FF0000", dark: true, tag: "Live TV from 100+ channels" },
    twitch: { name: "Twitch", logo: "twitch", mono: true, color: "#9146FF", url: "https://www.twitch.tv",
              bg: "linear-gradient(150deg,#A970FF,#772CE8)", fg: "#FFFFFF", tag: "Live streams" },
    plex: { name: "Plex", logo: "plex", mono: true, color: "#EBAF00", url: "https://app.plex.tv",
            bg: "linear-gradient(150deg,#2B2B2B,#111111)", fg: "#EBAF00", tag: "Your own media, anywhere" },
    crunchyroll: { name: "Crunchyroll", logo: "crunchyroll", mono: true, color: "#FF5E00", url: "https://www.crunchyroll.com",
                   bg: "linear-gradient(150deg,#FF7A26,#E84E00)", fg: "#FFFFFF", tag: "Anime" },
    tubi: { name: "Tubi", logo: "tubi", mono: true, wide: true, color: "#7408FF", url: "https://tubitv.com",
            bg: "linear-gradient(150deg,#8A2BFF,#5200CC)", fg: "#FFFFFF", tag: "Free movies and TV" },
    youtubemusic: { name: "YouTube Music", logo: "youtubemusic", mono: true, color: "#FF0000", url: "https://music.youtube.com",
                    bg: "linear-gradient(150deg,#262626,#050505)", fg: "#FF0000", tag: "Music videos and mixes" },
    applemusic: { name: "Apple Music", logo: "applemusic", mono: true, color: "#FA243C", url: "https://music.apple.com",
                  bg: "linear-gradient(150deg,#FF6B81,#F0243C)", fg: "#FFFFFF", tag: "100 million songs" },
    stremio: { name: "Stremio", logo: "stremio", mono: true, color: "#8A5AAB", url: "https://web.stremio.com",
               bg: "linear-gradient(150deg,#9C6BC0,#5B2D88)", fg: "#FFFFFF", tag: "All your add-ons in one place" },
    vimeo: { name: "Vimeo", logo: "vimeo", mono: true, color: "#1AB7EA", url: "https://vimeo.com",
             bg: "linear-gradient(150deg,#36C6F4,#0E96C8)", fg: "#FFFFFF", tag: "Films from independent creators" },
    studio: { name: "AI Studio", logo: "higgsfield", mono: true, color: "#D1FE17",
              bg: "linear-gradient(150deg,#DDFF4A,#B8E600)", fg: "#1A1A1A", dark: true, tag: "Make videos and backgrounds with Higgsfield" }
  };
  var PRESETS = window.NOVA_PRESETS;
  var DESIGNS = window.NOVA_DESIGNS;   // shared with the phone remote, see tv/designs.js
  var LAYOUTS = [["grid", "Grid"], ["icons", "App icons"], ["spotlight", "Spotlight"], ["mosaic", "Mosaic"], ["sidebar", "Sidebar"], ["dock", "Dock"], ["minimal", "Minimal"]]
    .filter(function (l) { return !window.NOVA_LAYOUTS || window.NOVA_LAYOUTS.indexOf(l[0]) >= 0; });
  var LOOK = [
    ["layout", "Layout", LAYOUTS],
    ["tiles", "Tiles", [["glass", "Glass"], ["brand", "Brand colors"], ["frost", "Frosted"], ["dark", "Dark glass"], ["clear", "Clear"]]],
    ["labels", "Labels", [["both", "Logo and name"], ["logo", "Logo only"], ["name", "Name only"]]],
    ["logo", "Logo color", [["white", "White"], ["brand", "Brand colors"]]],
    ["font", "Font", [["modern", "Modern"], ["elegant", "Elegant"], ["rounded", "Rounded"], ["grotesk", "Grotesk"]]],
    ["clock", "Clock", [["show", "Show"], ["hide", "Hide"]]]
  ];
  var IDEAS = [
    "A golden retriever surfing a giant wave at sunset, slow motion",
    "A paper boat sailing down a rainy cobblestone street, macro lens",
    "A cozy ramen shop on a rainy street at night, steam rising",
    "A city in the year 2080 at dusk, flying cars between glass towers"
  ];
  var PHOTO_IDEAS = [
    "They turn and smile at the camera as a breeze moves their hair",
    "Slow cinematic push-in, the scene gently comes alive",
    "Snow starts falling softly over everything"
  ];
  var BG_IDEAS = [
    "A quiet Japanese garden in autumn, red maple leaves over a koi pond",
    "Northern lights over a frozen lake with snowy pines",
    "A Mediterranean village on a cliff at sunset",
    "Rain on a window at night, city lights blurred behind it"
  ];
  var GRID_ICON = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></svg>';

  // ---------------------------------------------------------------- state

  var S = null;
  var P = null;               // appearance prefs
  var seenJobs = {};
  var stack = ["home"];
  var focusEl = null, focusOwner = null;
  var lastFocusByScreen = {};
  var lookOpen = false, lookFocus = null;
  var makeMode = "video", makeEngine = null, makeLength = 5, photoData = null;
  var bgType = "photo";
  var readyQueue = [];
  var playing = null;
  var confirmAction = null;
  var idleAt = Date.now();
  var actions = {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function api(path, body) {
    var opt = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
    return fetch(path, opt).then(function (r) { return r.json(); });
  }
  function bind(key, fn) { actions[key] = fn; }
  bind("nav-back", function () { back(); });
  bind("nav-home", function () { goHome(); });
  function itemById(id) {
    if (!S) return null;
    for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i];
    return null;
  }
  function money(v) { return v == null ? "..." : (v > 0 && v < 0.05 ? "1¢" : "$" + Number(v).toFixed(2)); }
  function mmss(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2); }
  function engineLabel(e) { return S && S.engines[e] ? S.engines[e].label : e; }
  function isImage(it) { return it && /\.(jpg|jpeg|png|webp)$/i.test(it.file); }

  // ---------------------------------------------------------------- stage scale + clock

  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = "scale(" + s + ")";
  }
  window.addEventListener("resize", fit);
  fit();

  function tick() {
    var d = new Date();
    var t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
    $("time").textContent = t;
    $("saverClock").textContent = t;
    $("date").textContent = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    var timers = document.querySelectorAll("[data-started]");
    for (var i = 0; i < timers.length; i++) {
      timers[i].textContent = mmss(Date.now() / 1000 - Number(timers[i].getAttribute("data-started")));
    }
    renderMakingPill();
    if (current() === "home" && !lookOpen && !stage.classList.contains("saving") && Date.now() - idleAt > 180000) showSaver();
  }
  setInterval(tick, 1000);
  tick();

  // ---------------------------------------------------------------- appearance

  function applyPrefs() {
    if (!P) return;
    var keep = stage.className.split(/\s+/).filter(function (c) {
      return c && !/^(font|tiles|labels|logo|layout|clock)-/.test(c);
    });
    keep.push("font-" + P.font, "tiles-" + P.tiles, "labels-" + P.labels, "logo-" + P.logo, "layout-" + P.layout, "clock-" + P.clock);
    stage.className = keep.join(" ");
    setBackground();
  }
  function bgOptions() {
    var list = PRESETS.map(function (p) {
      return { key: "preset:" + p[0], name: p[1], thumb: "/tv/backgrounds/" + p[0] + ".jpg", bg: { type: "preset", id: p[0] } };
    });
    (S ? S.items : []).forEach(function (it) {
      list.push({ key: "item:" + it.id, name: it.title + (isImage(it) ? "" : " (moving)"),
                  thumb: "/library/" + (it.poster || it.file), bg: { type: "item", id: it.id } });
    });
    return list;
  }
  function bgKey(bg) { return bg ? bg.type + ":" + bg.id : ""; }
  function setBackground() {
    if (!P) return;
    var img = $("bgImg"), vid = $("bgVideo"), bg = P.bg || {}, src = "", video = false;
    if (bg.type === "item") {
      var it = itemById(bg.id);
      if (it) { src = "/library/" + it.file; video = !isImage(it); }
    }
    if (!src) src = "/tv/backgrounds/" + (bg.type === "preset" ? bg.id : "misty-coast") + ".jpg";
    if (video) {
      img.classList.remove("on");
      if (vid.getAttribute("data-src") !== src) {
        vid.setAttribute("data-src", src);
        vid.classList.remove("on");
        vid.src = src;
        vid.oncanplay = function () { vid.classList.add("on"); };
      }
      vid.play().catch(function () {});
    } else {
      vid.classList.remove("on");
      vid.oncanplay = null;   // a video still loading must not come back over the photo
      vid.pause();
      vid.removeAttribute("data-src");
      if (img.getAttribute("data-src") !== src) {
        img.setAttribute("data-src", src);
        img.onload = function () { img.classList.add("on"); };
        img.src = src;
      } else img.classList.add("on");
    }
  }
  function savePrefs(changes) {
    for (var k in changes) P[k] = changes[k];
    applyPrefs();
    renderHome();
    if (lookOpen) renderLook();
    api("/api/prefs", changes);
  }

  // ---------------------------------------------------------------- focus engine

  function layer() {
    if (!$("confirm").classList.contains("hidden")) return $("confirm");
    if (!$("ready").classList.contains("hidden")) return $("ready");
    if (lookOpen) return $("look");
    return $(current());
  }
  function focusables() {
    var all = Array.prototype.slice.call(layer().querySelectorAll(".focusable")), out = [];
    if (layer() === $(current()) && current() !== "home") all = all.concat(Array.prototype.slice.call($("nav").children));
    for (var i = 0; i < all.length; i++) if (all[i].offsetParent !== null) out.push(all[i]);
    return out;
  }
  function typing() { return focusEl && (focusEl.tagName === "INPUT" || focusEl.tagName === "TEXTAREA"); }
  function setFocus(el) {
    if (!el) return;
    if (focusEl) focusEl.classList.remove("focused");
    focusEl = el;
    focusOwner = layer() === $(current()) ? current() : null;
    el.classList.add("focused");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.focus({ preventScroll: true });
    else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    var row = railOf(el);
    if (row) scrollRail(row, el);
    if (P && P.layout === "sidebar" && el.hasAttribute("data-app") && el.closest("#tiles")) showPreview(el.getAttribute("data-app"));
    var tip = el.getAttribute("data-tip");
    $("tip").textContent = tip || "";
    $("tip").classList.toggle("on", !!tip);
    if (lookOpen && layer() === $("look")) lookFocus = el.getAttribute("data-key");
    else if (layer() === $(current()) && !el.closest("#nav")) lastFocusByScreen[current()] = el.getAttribute("data-key") || el.id;
  }
  function railOf(el) {
    var p = el.parentNode;
    if (!p || !p.classList) return null;
    if (p.classList.contains("rail")) return p;
    if (p.classList.contains("grid") && P && /^(dock|minimal|spotlight)$/.test(P.layout)) return p;
    return null;
  }
  function scrollRail(rail, el) {
    var view = rail.parentNode.clientWidth - (P && P.layout === "dock" && rail.classList.contains("grid") ? 80 : 0);
    var x = Number(rail.getAttribute("data-x") || 0);
    var left = el.offsetLeft + x, right = left + el.offsetWidth;
    if (right > view - 20) x = view - 20 - el.offsetLeft - el.offsetWidth;
    if (left < 20) x = 20 - el.offsetLeft;
    x = Math.min(0, x);
    rail.setAttribute("data-x", x);
    rail.style.transform = "translateX(" + x + "px)";
  }
  function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function move(dir) {
    var list = focusables();
    if (!list.length) return;
    if (!focusEl || list.indexOf(focusEl) < 0) return setFocus(list[0]);
    if (lookOpen && layer() === $("look") && (dir === "left" || dir === "right") && focusEl.hasAttribute("data-look")) {
      return cycleLook(focusEl.getAttribute("data-look"), dir === "right" ? 1 : -1);
    }
    if (focusEl.closest("#nav") && (dir === "left" || dir === "right")) {
      var nb = dir === "right" ? focusEl.nextElementSibling : focusEl.previousElementSibling;
      if (nb) setFocus(nb);
      return;
    }
    var rail = railOf(focusEl);
    if (P && P.layout === "sidebar" && focusEl.closest("#tiles") && (dir === "up" || dir === "down")) {
      var rows = Array.prototype.slice.call($("tiles").querySelectorAll(".tile"));
      var k = rows.indexOf(focusEl) + (dir === "down" ? 1 : -1);
      if (rows[k]) { setFocus(rows[k]); scrollList(rows[k]); return; }
      if (dir === "down") return;
    }
    if (rail && (dir === "left" || dir === "right")) {
      var sibs = Array.prototype.filter.call(rail.children, function (c) { return c.classList.contains("focusable"); });
      var i = sibs.indexOf(focusEl) + (dir === "right" ? 1 : -1);
      if (sibs[i]) setFocus(sibs[i]);
      return;
    }
    var a = focusEl.getBoundingClientRect(), ac = center(a), best = null, bestScore = Infinity;
    list.forEach(function (el) {
      if (el === focusEl) return;
      var b = el.getBoundingClientRect(), bc = center(b), main, cross;
      if (dir === "down") { if (b.top < a.bottom - 4) return; main = b.top - a.bottom; cross = Math.abs(bc.x - ac.x); }
      if (dir === "up") { if (b.bottom > a.top + 4) return; main = a.top - b.bottom; cross = Math.abs(bc.x - ac.x); }
      if (dir === "right") { if (b.left < a.right - 4) return; main = b.left - a.right; cross = Math.abs(bc.y - ac.y); }
      if (dir === "left") { if (b.right > a.left + 4) return; main = a.left - b.right; cross = Math.abs(bc.y - ac.y); }
      var score = main + cross * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) setFocus(best);
  }
  function restoreFocus(screen) {
    var key = lastFocusByScreen[screen], list = focusables(), el = null;
    if (key) el = layer().querySelector('[data-key="' + key + '"]') || $(key);
    if (!el || list.indexOf(el) < 0) el = list[0];
    setFocus(el);
    flushReady();
  }
  function keepFocusAfterRender() {
    if (layer() !== $(current()) || focusOwner !== current()) return;
    var key = focusEl && focusEl.getAttribute("data-key");
    var el = key ? $(current()).querySelector('[data-key="' + key + '"]') : null;
    if (el) setFocus(el);
    else if (!focusEl || !document.body.contains(focusEl)) restoreFocus(current());
  }

  // ---------------------------------------------------------------- screens

  function current() { return stack[stack.length - 1]; }
  function show(name) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.toggle("active", screens[i].id === name);
    stage.classList.toggle("inside", name !== "home");
    if (name !== "player") { stopPlayer(); $("nav").classList.remove("gone"); }
  }
  function open(name, setup) {
    closeLook(true);
    if (current() !== name) stack.push(name);
    show(name);
    if (setup) setup();
    renderScreen(name);
    restoreFocus(name);
  }
  function back() {
    if (!$("confirm").classList.contains("hidden")) return closeConfirm();
    if (!$("ready").classList.contains("hidden")) return hideReady();
    if (lookOpen) return closeLook();
    if (stack.length > 1) stack.pop();
    show(current());
    renderScreen(current());
    restoreFocus(current());
  }
  function goHome() {
    stack = ["home"];
    closeLook(true);
    $("ready").classList.add("hidden");
    $("confirm").classList.add("hidden");
    show("home");
    renderScreen("home");
    restoreFocus("home");
  }
  function renderScreen(name) {
    if (name === "home") renderHome();
    if (name === "apps") renderApps();
    if (name === "designs") renderDesigns();
    if (name === "studio") renderStudio();
    if (name === "make") renderMake();
    if (name === "bgmake") renderBgMake();
    if (name === "library") renderLibrary();
    if (name === "settings") renderSettings();
    if (name === "phone") drawQRs();
  }

  // ---------------------------------------------------------------- home

  function logoHtml(app) {
    var src = "/tv/logos/" + app.logo + ".svg";
    if (app.mono) {
      return '<span class="mask ' + (app.wide ? "wd" : "sq") + '" style="-webkit-mask-image:url(' + src + ');mask-image:url(' + src +
        ');--brand:' + app.color + '"></span>';
    }
    return '<img class="' + (app.wide ? "wide" : "") + (app.small ? " sm" : "") + '" src="' + src + '" alt="">';
  }
  var IMG_TINT = { white: "brightness(0) invert(1)", black: "brightness(0)", none: "none" };
  function tileHtml(id, key, extra) {
    var app = APPS[id];
    var vars = "--tbg:" + app.bg + ";--tfg:" + (app.fg || "#fff") + ";--timg:" + IMG_TINT[app.img || "white"] +
      ";--tname:" + (app.dark ? "#111" : "#fff");
    return '<div class="tile focusable" data-key="' + key + '" data-app="' + id + '" style="' + vars + '">' + (extra || "") +
      '<div class="logo">' + logoHtml(app) + '</div><div class="name">' + esc(app.name) + '</div></div>';
  }
  // On the TV the service opens the TV's own app (Netflix, YouTube...). Anywhere else, the website.
  function launch(id) {
    if (id === "studio") return open("studio");
    var app = APPS[id];
    if (!app) return;
    toast("Opening " + app.name + "...");
    api("/api/launch", { app: id }).then(function (r) {
      if (r.ok) return;
      if (r.web && app.url) { hideToast(); return window.open(app.url, "_blank"); }
      toast(r.error || "Couldn't open " + app.name + ".", 6000);
    }).catch(function () { toast("Couldn't open " + app.name + ".", 6000); });
  }
  var toastTimer = null;
  function toast(text, ms) {
    $("toast").textContent = text;
    $("toast").classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms || 3000);
  }
  function hideToast() { $("toast").classList.remove("on"); }
  function renderHome() {
    if (!P) return;
    bind("q-studio", function () { open("studio"); });
    bind("q-look", openLook);
    bind("q-settings", function () { open("settings"); });
    var ids = P.apps.filter(function (id) { return APPS[id]; });
    var cols = ids.length <= 9 ? 3 : ids.length <= 12 ? 4 : 5;
    var h = new Date().getHours();
    $("heroEyebrow").textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    $("tiles").innerHTML = '<div class="grid c' + cols + '">' + ids.map(function (id) {
      bind("app-" + id, function () { launch(id); });
      return tileHtml(id, "app-" + id);
    }).join("") + "</div>";
    if (P.layout === "mosaic") {
      // 6 x 3 cells: the first app is big (4 cells), then widen apps until the grid is exactly full
      var tiles = $("tiles").querySelectorAll(".tile"), spare = 18 - 4 - (tiles.length - 1);
      for (var i = 1; i < tiles.length && spare > 0; i++, spare--) tiles[i].classList.add("w2");
    }
    keepFocusAfterRender();
    if (P.layout === "sidebar") showPreview((focusEl && focusEl.getAttribute("data-app")) || ids[0]);
  }
  function showPreview(id) {
    var app = APPS[id];
    if (!app) return;
    var pv = $("preview");
    pv.setAttribute("style", "--tbg:" + app.bg + ";--tfg:" + (app.fg || "#fff") + ";--timg:" + IMG_TINT[app.img || "white"] +
      ";--tname:" + (app.dark ? "#111" : "#fff"));
    pv.innerHTML = '<div class="pvLogo">' + logoHtml(app) + '</div><div class="pvText"><div class="pvName">' + esc(app.name) +
      '</div><div class="pvTag">' + esc(app.tag || "") + '</div><div class="pvHint">Press OK to open</div></div>';
  }
  function scrollList(el) {
    var box = $("tiles"), top = el.offsetTop, bottom = top + el.offsetHeight;
    if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 6;
    if (top < box.scrollTop) box.scrollTop = top - 6;
  }

  // ---------------------------------------------------------------- appearance sheet

  function openLook() {
    lookOpen = true;
    $("look").classList.remove("hidden");
    stage.classList.add("looking");
    renderLook();
    var el = lookFocus && $("look").querySelector('[data-key="' + lookFocus + '"]');
    setFocus(el || $("look").querySelector(".focusable"));
  }
  function closeLook(silent) {
    if (!lookOpen) return;
    lookOpen = false;
    $("look").classList.add("hidden");
    stage.classList.remove("looking");
    if (!silent) restoreFocus(current());
  }
  function renderLook() {
    var opts = bgOptions(), cur = bgKey(P.bg), bi = 0;
    opts.forEach(function (o, i) { if (o.key === cur) bi = i; });
    var bgo = opts[bi] || opts[0];
    var d = currentDesign();
    var html = '<button class="lrow focusable" data-key="look-design" data-look="design"><span class="lname">Design</span>' +
      '<span class="lval"><span class="arrow">&#8249;</span>' + (d ? d.name : "Custom") + '<span class="arrow">&#8250;</span></span></button>';
    html += '<button class="lrow focusable" data-key="look-bg" data-look="bg"><span class="lname">Background</span>' +
      '<span class="lval"><span class="arrow">&#8249;</span><span class="thumb" style="background-image:url(\'' + bgo.thumb + '\')"></span>' +
      esc(bgo.name) + '<span class="arrow">&#8250;</span></span></button>';
    LOOK.forEach(function (row) {
      var val = row[2].filter(function (o) { return o[0] === P[row[0]]; })[0] || row[2][0];
      html += '<button class="lrow focusable" data-key="look-' + row[0] + '" data-look="' + row[0] + '"><span class="lname">' + row[1] +
        '</span><span class="lval"><span class="arrow">&#8249;</span>' + val[1] + '<span class="arrow">&#8250;</span></span></button>';
    });
    html += '<button class="lrow action focusable" data-key="look-designs">' + GRID_ICON + 'See all designs</button>';
    html += '<button class="lrow action focusable" data-key="look-make"><img src="/tv/logos/higgsfield.svg" alt="">Make a background with AI</button>';
    html += '<button class="lrow action focusable" data-key="look-apps">' + GRID_ICON + 'Choose apps</button>';
    $("lookRows").innerHTML = html;
    bind("look-make", function () { open("bgmake"); });
    bind("look-designs", function () { open("designs"); });
    bind("look-apps", function () { open("apps"); });
    if (lookFocus) {
      var el = $("look").querySelector('[data-key="' + lookFocus + '"]');
      if (el && layer() === $("look")) { if (focusEl) focusEl.classList.remove("focused"); focusEl = el; el.classList.add("focused"); }
    }
  }
  function currentDesign() {
    return DESIGNS.filter(function (d) {
      return Object.keys(d.p).every(function (k) { return JSON.stringify(d.p[k]) === JSON.stringify(P[k]); });
    })[0] || null;
  }
  function cycleLook(key, step) {
    if (key === "design") {
      var cur = currentDesign(), at = cur ? DESIGNS.indexOf(cur) : -1;
      return savePrefs(JSON.parse(JSON.stringify(DESIGNS[(at + step + DESIGNS.length) % DESIGNS.length].p)));
    }
    if (key === "bg") {
      var opts = bgOptions(), cur = bgKey(P.bg), i = 0;
      opts.forEach(function (o, n) { if (o.key === cur) i = n; });
      var next = opts[(i + step + opts.length) % opts.length];
      return savePrefs({ bg: next.bg });
    }
    var row = LOOK.filter(function (r) { return r[0] === key; })[0];
    var vals = row[2].map(function (o) { return o[0]; });
    var j = vals.indexOf(P[key]);
    var change = {};
    change[key] = vals[(j + step + vals.length) % vals.length];
    savePrefs(change);
  }

  // ---------------------------------------------------------------- designs gallery

  function renderDesigns() {
    var cur = currentDesign();
    $("designGrid").innerHTML = DESIGNS.map(function (d) {
      bind("design-" + d.id, function () { savePrefs(JSON.parse(JSON.stringify(d.p))); goHome(); });
      return '<div class="dcard focusable" data-key="design-' + d.id + '"><div class="dthumb" style="background-image:url(\'/tv/designs/' +
        d.id + '.jpg\')">' + (cur && cur.id === d.id ? '<div class="badge">On now</div>' : '') + '</div><div class="dname">' + d.name +
        '</div><div class="ddesc">' + d.desc + '</div></div>';
    }).join("");
  }

  // ---------------------------------------------------------------- choose apps

  function renderApps() {
    $("appGrid").innerHTML = Object.keys(APPS).map(function (id) {
      var on = P.apps.indexOf(id) >= 0;
      bind("pick-" + id, function () {
        var list = P.apps.slice(), at = list.indexOf(id);
        if (at >= 0) { if (list.length > 1) list.splice(at, 1); }
        else if (list.length < 15) list.push(id);
        savePrefs({ apps: list });
        renderApps();
        setFocus($("appGrid").querySelector('[data-key="pick-' + id + '"]'));
      });
      return tileHtml(id, "pick-" + id, on ? '<span class="check">&#10003;</span>' : "").replace('class="tile', 'class="tile' + (on ? "" : " off"));
    }).join("");
  }

  // ---------------------------------------------------------------- AI studio

  function renderStudio() {
    var firstVideo = S.items.filter(function (i) { return i.kind === "video" && i.poster; })[0];
    var cards = [
      ["make", "Make a video", "Describe anything, watch it in minutes", firstVideo ? "/library/" + firstVideo.poster : "/tv/backgrounds/golden-hour.jpg", function () { openMake("video"); }],
      ["photo", "Bring a photo to life", "Turn any photo into a moving scene", "/tv/backgrounds/quiet-cove.jpg", function () { openMake("photo"); }],
      ["bg", "New background", "Your home screen, anything you imagine", "/tv/backgrounds/mountain-valley.jpg", function () { open("bgmake"); }]
    ];
    $("studioCards").innerHTML = cards.map(function (c) {
      bind("sc-" + c[0], c[4]);
      return '<div class="scard focusable" data-key="sc-' + c[0] + '" style="background-image:url(\'' + c[3] + '\')"><div class="sname">' +
        c[1] + '</div><div class="ssub">' + c[2] + '</div></div>';
    }).join("");
    var cardsHtml = jobCards().concat(S.items.slice(0, 8).map(itemCard));
    if (S.items.length > 8) {
      bind("see-all", function () { open("library"); });
      cardsHtml.push('<div class="card focusable" data-key="see-all"><div class="thumb" style="display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:600">See all ' + S.items.length + '</div></div>');
    }
    $("creations").innerHTML = cardsHtml.length ? cardsHtml.join("") : '<div class="emptyNote">Nothing yet. Pick one of the options above.</div>';
    keepFocusAfterRender();
  }
  function jobCards() {
    var out = [];
    S.jobs.forEach(function (j) {
      if (j.status === "done") return;
      var key = "job-" + j.id;
      if (j.status === "failed") {
        bind(key, function () { api("/api/dismiss", { id: j.id }); });
        out.push('<div class="card failed focusable" data-key="' + key + '"><div class="thumb">' + esc(j.error) +
          '</div><div class="ctitle">' + esc(j.title) + '</div><div class="csub">Didn\'t work. Select to clear.</div></div>');
        return;
      }
      bind(key, function () {});
      out.push('<div class="card making focusable" data-key="' + key + '"><div class="thumb"><div class="mstate">' + jobWords(j) +
        '</div><div class="mtime" data-started="' + j.started + '">' + mmss(Date.now() / 1000 - j.started) +
        '</div><div class="bar"></div></div><div class="ctitle">' + esc(j.title) + '</div><div class="csub">' + kindLabel(j.kind) + '</div></div>');
    });
    return out;
  }
  function jobWords(j) {
    return { queued: "Starting", uploading: "Sending your photo", making: j.phase === "queued" ? "Waiting in line" : "Making it", saving: "Almost ready" }[j.status] || "Working";
  }
  function kindLabel(k) { return { video: "Video", photo: "From a photo", wallpaper: "Moving background", background: "Background" }[k] || "Video"; }
  function itemCard(it) {
    bind("item-" + it.id, function () { play(it.id); });
    var poster = it.poster ? "background-image:url('/library/" + encodeURI(it.poster) + "')" : "";
    var on = P && P.bg && P.bg.type === "item" && P.bg.id === it.id;
    return '<div class="card focusable" data-key="item-' + it.id + '"><div class="thumb" style="' + poster + '">' +
      (on ? '<div class="badge">Your background</div>' : '') + '</div><div class="ctitle">' + esc(it.title) +
      '</div><div class="csub">' + kindLabel(it.kind) + (it.duration ? " &middot; " + it.duration + " sec" : "") + '</div></div>';
  }
  function renderLibrary() {
    $("libGrid").innerHTML = S.items.map(itemCard).join("");
    keepFocusAfterRender();
  }
  function renderMakingPill() {
    if (!S) return;
    var live = S.jobs.filter(function (j) { return j.status !== "done" && j.status !== "failed"; });
    $("making").classList.toggle("hidden", !live.length || current() === "player");
    if (live.length) {
      var j = live[0];
      $("makingText").textContent = (live.length > 1 ? "Making " + live.length + " things" : "Making “" + j.title + "”") +
        " · " + mmss(Date.now() / 1000 - j.started);
    }
  }

  // ---------------------------------------------------------------- make (video + photo)

  function openMake(mode, prompt) {
    open("make", function () {
      makeMode = mode;
      makeEngine = makeEngine || S.engine || "seedance";
      $("prompt").value = prompt || "";
      $("makeError").textContent = "";
      if (mode !== "photo") photoData = null;
      lastFocusByScreen.make = prompt ? "makeGo" : "prompt";
    });
  }
  function renderOptions(box, prefix, chosen, onPick) {
    box.innerHTML = Object.keys(S.engines).map(function (e) {
      bind(prefix + "-" + e, function () { onPick(e); });
      return '<button class="opt focusable' + (chosen === e ? " chosen" : "") + '" data-key="' + prefix + "-" + e + '"><div class="optName">' +
        esc(S.engines[e].label) + '</div><div class="optSub">' + esc(S.engines[e].note) + '</div></button>';
    }).join("");
  }
  function renderMake() {
    var photo = makeMode === "photo";
    $("makeEyebrow").textContent = photo ? "Photo to video" : "Make a video";
    $("makeTitle").textContent = photo ? "Bring a photo to life" : "What should it show?";
    $("photoBox").classList.toggle("hidden", !photo);
    $("photoActions").classList.toggle("hidden", !photo || S.on_tv);   // a TV has no photos to choose; they come from the phone
    $("photoBox").classList.toggle("has", !!photoData);
    if (photoData) $("photoPreview").src = photoData;
    $("promptLabel").textContent = photo ? "What should happen in the photo?" : "Describe your video";
    $("prompt").placeholder = photo ? PHOTO_IDEAS[0] : IDEAS[0];
    $("prompt").rows = photo ? 2 : 3;
    $("makeGo").textContent = photo ? "Bring it to life" : "Make this video";
    $("makeIdeas").innerHTML = (photo ? PHOTO_IDEAS : IDEAS).map(function (t, i) {
      bind("chip-" + i, function () { $("prompt").value = t; setFocus($("makeGo")); });
      return '<button class="chip focusable" data-key="chip-' + i + '">' + esc(t) + '</button>';
    }).join("");
    renderOptions($("engineOpts"), "eng", makeEngine, function (e) { makeEngine = e; renderMake(); setFocus($("engineOpts").querySelector('[data-key="eng-' + e + '"]')); });
    $("lengthOpts").innerHTML = [5, 10].map(function (n) {
      bind("len-" + n, function () { makeLength = n; renderMake(); setFocus($("lengthOpts").querySelector('[data-key="len-' + n + '"]')); });
      return '<button class="opt focusable' + (makeLength === n ? " chosen" : "") + '" data-key="len-' + n + '"><div class="optName">' + n +
        ' seconds</div><div class="optSub">' + (n === 5 ? "Quicker to make" : "Longer scene") + '</div></button>';
    }).join("");
    api("/api/price?engine=" + makeEngine + "&duration=" + makeLength).then(function (r) { $("price").textContent = money(r.usd); });
    drawQRs();
  }
  function startJob(body, errEl, onOk) {
    errEl.textContent = "";
    api("/api/create", body).then(function (r) {
      if (!r.ok) { errEl.textContent = r.error; return; }
      seenJobs[r.job.id] = r.job.status;
      S.jobs.unshift(r.job);
      if (onOk) onOk(r.job);
    });
  }
  function submitMake() {
    var prompt = $("prompt").value.trim();
    if (makeMode === "photo" && !photoData) { $("makeError").textContent = "Choose a photo first."; return; }
    if (makeMode !== "photo" && !prompt) { $("makeError").textContent = "Describe what you want to see first."; setFocus($("prompt")); return; }
    startJob({ kind: makeMode, prompt: prompt, engine: makeEngine, duration: makeLength, image: photoData }, $("makeError"), function (job) {
      photoData = null;
      stack = ["home", "studio"];
      lastFocusByScreen.studio = "job-" + job.id;
      show("studio"); renderStudio(); restoreFocus("studio");
    });
  }
  $("fileInput").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    shrink(f, function (data) { photoData = data; renderMake(); setFocus($("prompt")); });
    this.value = "";
  });
  function shrink(file, done) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      done(c.toDataURL("image/jpeg", 0.9));
    };
    img.src = url;
  }

  // ---------------------------------------------------------------- new background

  function renderBgMake() {
    $("bgIdeas").innerHTML = BG_IDEAS.map(function (t, i) {
      bind("bgi-" + i, function () { $("bgPrompt").value = t; setFocus($("bgGo")); });
      return '<button class="chip focusable" data-key="bgi-' + i + '">' + esc(t) + '</button>';
    }).join("");
    var types = [["photo", "Photo", "Real-looking, ready in seconds"], ["living", "Moving", "A 10 second video loop"]];
    $("bgTypeOpts").innerHTML = types.map(function (t) {
      bind("bgt-" + t[0], function () { bgType = t[0]; renderBgMake(); setFocus($("bgTypeOpts").querySelector('[data-key="bgt-' + t[0] + '"]')); });
      return '<button class="opt focusable' + (bgType === t[0] ? " chosen" : "") + '" data-key="bgt-' + t[0] + '"><div class="optName">' + t[1] +
        '</div><div class="optSub">' + t[2] + '</div></button>';
    }).join("");
    if (bgType === "photo") $("bgPrice").textContent = money(S.bg_price);
    else api("/api/price?engine=" + S.engine + "&duration=10").then(function (r) { $("bgPrice").textContent = money(r.usd); });
  }
  function submitBg() {
    var prompt = $("bgPrompt").value.trim();
    if (!prompt) { $("bgError").textContent = "Describe your view first, or pick an idea."; setFocus($("bgPrompt")); return; }
    startJob({ kind: bgType === "photo" ? "background" : "wallpaper", prompt: prompt, duration: 10 }, $("bgError"), function () {
      $("bgPrompt").value = "";
      goHome();
    });
  }

  // ---------------------------------------------------------------- settings

  function renderSettings() {
    $("keyStatus").textContent = S.has_key ? "Connected. Paste a new key below to switch accounts." : "No key yet. Paste yours below.";
    renderOptions($("defaultEngineOpts"), "def", S.engine, function (e) {
      api("/api/settings", { engine: e }).then(function () { S.engine = e; makeEngine = e; renderSettings(); setFocus($("defaultEngineOpts").querySelector('[data-key="def-' + e + '"]')); });
    });
    $("stats").innerHTML = S.items.length + (S.items.length === 1 ? " creation" : " creations") + " &middot; " + money(S.spent) + " spent so far";
  }
  function saveSettings() {
    var k = $("keyId").value.trim(), s = $("keySecret").value.trim();
    var msg = $("settingsMsg");
    if (!k && !s) { msg.className = "hint ok"; msg.textContent = "Nothing to change."; return; }
    if (!k || !s) { msg.className = "hint"; msg.textContent = "Paste both the key and the secret."; return; }
    api("/api/settings", { api_key: k, secret: s }).then(function () {
      $("keyId").value = ""; $("keySecret").value = "";
      msg.className = "hint ok"; msg.textContent = "Saved.";
      refresh();
    });
  }

  // ---------------------------------------------------------------- player

  function play(id) {
    var it = itemById(id);
    if (!it) return;
    playing = it;
    open("player", function () {
      var v = $("playerVideo"), img = $("playerImg"), still = isImage(it);
      v.classList.toggle("hidden", still);
      img.classList.toggle("hidden", !still);
      $("pPlay").classList.toggle("hidden", still);
      if (still) { img.src = "/library/" + it.file; v.removeAttribute("src"); }
      else { v.src = "/library/" + it.file; v.muted = false; v.play().catch(function () {}); }
      $("playerKind").textContent = kindLabel(it.kind) + (it.engine && !still ? " · " + engineLabel(it.engine) : "");
      $("playerTitle").textContent = it.title;
      $("playerPrompt").textContent = it.prompt;
      $("pPlay").textContent = "Pause";
      var on = P.bg && P.bg.type === "item" && P.bg.id === it.id;
      $("pWall").textContent = on ? "This is your background" : "Use as background";
      lastFocusByScreen.player = still ? "pWall" : "pPlay";
      wakeOverlay();
    });
  }
  var overlayTimer = null;
  function wakeOverlay() {
    $("playerOverlay").classList.remove("gone");
    $("nav").classList.remove("gone");
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(function () {
      if (current() === "player" && playing && !isImage(playing) && !$("playerVideo").paused) { $("playerOverlay").classList.add("gone"); $("nav").classList.add("gone"); }
    }, 3500);
  }
  function stopPlayer() { var v = $("playerVideo"); if (!v.paused) v.pause(); }
  $("playerVideo").addEventListener("ended", function () { $("pPlay").textContent = "Play again"; wakeOverlay(); });

  // ---------------------------------------------------------------- ready card + confirm

  function showReady(item) {
    // never interrupt someone mid-sentence or mid-video; it waits until they move on
    if (!$("ready").classList.contains("hidden") || current() === "player" || typing() || lookOpen) { readyQueue.push(item); return; }
    var bg = item.kind === "background" || item.kind === "wallpaper";
    $("readyEyebrow").textContent = bg ? "Your new background is on" : "Ready to watch";
    $("readyTitle").textContent = item.title;
    $("readyPoster").src = item.poster ? "/library/" + item.poster : "";
    $("ready").setAttribute("data-id", item.id);
    $("ready").setAttribute("data-bg", bg ? "1" : "");
    $("readyWatch").textContent = bg ? "Show me" : "Watch now";
    $("ready").classList.remove("hidden");
    setFocus($("readyWatch"));
  }
  function hideReady() {
    $("ready").classList.add("hidden");
    restoreFocus(current());
  }
  function flushReady() {
    if (readyQueue.length && $("ready").classList.contains("hidden") && current() !== "player" && !typing() && !lookOpen) {
      showReady(readyQueue.shift());
    }
  }
  function askConfirm(text, yes) {
    $("confirmText").textContent = text;
    confirmAction = yes;
    $("confirm").classList.remove("hidden");
    setFocus($("confirmNo"));
  }
  function closeConfirm() {
    $("confirm").classList.add("hidden");
    confirmAction = null;
    restoreFocus(current());
  }

  // ---------------------------------------------------------------- screensaver

  function showSaver() { stage.classList.add("saving"); $("saver").classList.remove("hidden"); }
  function hideSaver() {
    if (!stage.classList.contains("saving")) return false;
    stage.classList.remove("saving");
    $("saver").classList.add("hidden");
    return true;
  }

  // ---------------------------------------------------------------- select (Enter)

  function select() {
    if (!focusEl) return;
    var key = focusEl.getAttribute("data-key");
    if (focusEl.hasAttribute("data-look")) return cycleLook(focusEl.getAttribute("data-look"), 1);
    if (key && actions[key]) return actions[key]();
    switch (focusEl.id) {
      case "makeGo": return submitMake();
      case "pickPhoto": return $("fileInput").click();
      case "bgGo": return submitBg();
      case "saveSettings": return saveSettings();
      case "openPhone": return open("phone");
      case "readyWatch":
        var id = $("ready").getAttribute("data-id"), isBg = $("ready").getAttribute("data-bg");
        $("ready").classList.add("hidden");
        return isBg ? goHome() : play(id);
      case "readyLater": return hideReady();
      case "confirmNo": return closeConfirm();
      case "confirmYes":
        var fn = confirmAction;
        $("confirm").classList.add("hidden");
        confirmAction = null;
        return fn && fn();
      case "pPlay":
        var v = $("playerVideo");
        if (v.paused) { v.play(); $("pPlay").textContent = "Pause"; } else { v.pause(); $("pPlay").textContent = "Play"; }
        return wakeOverlay();
      case "pWall":
        if (!playing) return;
        savePrefs({ bg: { type: "item", id: playing.id } });
        $("pWall").textContent = "This is your background";
        return wakeOverlay();
      case "pDelete":
        if (!playing) return;
        var gone = playing;
        return askConfirm("Delete “" + gone.title + "”?", function () {
          api("/api/delete", { id: gone.id }).then(function () { back(); });
        });
    }
    if (focusEl.id === "prompt") return setFocus($("makeGo"));
    if (focusEl.id === "bgPrompt") return setFocus($("bgGo"));
    if (focusEl.id === "keyId") return setFocus($("keySecret"));
    if (focusEl.id === "keySecret") return setFocus($("saveSettings"));
  }

  // ---------------------------------------------------------------- input

  function command(cmd) {
    idleAt = Date.now();
    if (hideSaver()) return;
    if (current() === "player") wakeOverlay();
    if (cmd === "up" || cmd === "down" || cmd === "left" || cmd === "right") return move(cmd);
    if (cmd === "ok") return select();
    if (cmd === "back") return back();
    if (cmd === "home") return goHome();
    // the phone remote can jump straight to a screen
    if (cmd === "open:look") { goHome(); return openLook(); }
    if (cmd === "open:studio" || cmd === "open:settings" || cmd === "open:designs") { goHome(); return open(cmd.slice(5)); }
    if (cmd.indexOf("play:") === 0) return play(cmd.slice(5));
  }
  document.addEventListener("keydown", function (e) {
    var t = e.target, inText = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA"), k = e.key;
    if (inText) {
      // in a text box, arrows move the cursor until it reaches the edge
      var atStart = t.selectionStart === 0 && t.selectionEnd === 0, atEnd = t.selectionStart === t.value.length;
      if (k === "ArrowLeft" && !atStart) return;
      if (k === "ArrowRight" && !atEnd) return;
      if (k === "Enter" && t.tagName === "TEXTAREA" && e.shiftKey) return;
      if (!/^(Arrow(Up|Down|Left|Right)|Enter|Escape)$/.test(k)) { idleAt = Date.now(); return; }
    }
    var map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "ok", Escape: "back",
                Backspace: "back", XF86Back: "back", GoBack: "back", BrowserBack: "back" };
    if (!inText && (k === "s" || k === "S") && current() === "home" && !lookOpen) { e.preventDefault(); return showSaver(); }
    if (map[k]) { e.preventDefault(); command(map[k]); }
    else if (e.keyCode === 10009 || e.keyCode === 461) { e.preventDefault(); command("back"); }   // Samsung Return / LG Back key
    else if (e.keyCode === 10252 || e.keyCode === 415 || e.keyCode === 19 || e.keyCode === 413) {   // Samsung play/pause, play, pause, stop
      e.preventDefault();
      mediaKey(e.keyCode);
    }
  });
  function mediaKey(code) {
    idleAt = Date.now();
    if (current() !== "player" || !playing || isImage(playing)) return;
    var v = $("playerVideo");
    if (code === 413) return back();
    if (code === 415 || (code === 10252 && v.paused)) { v.play(); $("pPlay").textContent = "Pause"; }
    else { v.pause(); $("pPlay").textContent = "Play"; }
    wakeOverlay();
  }
  stage.addEventListener("click", function (e) {
    idleAt = Date.now();
    if (hideSaver()) return;
    var el = e.target.closest(".focusable");
    if (!el || focusables().indexOf(el) < 0) return;
    setFocus(el);
    if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") select();
  });
  stage.addEventListener("mousemove", function () { if (current() === "player") wakeOverlay(); });

  // ---------------------------------------------------------------- QR codes

  function drawQRs() {
    if (!S || typeof qrcode !== "function") return;
    $("remoteUrl").textContent = S.remote_url.replace("http://", "");
    var canv = document.querySelectorAll("canvas.qr");
    for (var i = 0; i < canv.length; i++) {
      var c = canv[i];
      if (c.getAttribute("data-url") === S.remote_url) continue;
      var q = qrcode(0, "M");
      q.addData(S.remote_url);
      q.make();
      var n = q.getModuleCount(), cell = Math.floor(Number(c.getAttribute("data-size")) / n);
      c.width = c.height = cell * n;
      c.style.width = c.style.height = cell * n + "px";
      var g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#111";
      for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) if (q.isDark(r, col)) g.fillRect(col * cell, r * cell, cell, cell);
      c.setAttribute("data-url", S.remote_url);
    }
  }

  // ---------------------------------------------------------------- live updates

  function refresh() {
    return api("/api/state").then(function (st) {
      S = st;
      var prefsChanged = JSON.stringify(P) !== JSON.stringify(st.prefs);
      if (!stage.classList.contains("shot")) P = st.prefs; else prefsChanged = false;
      if (!makeEngine) makeEngine = S.engine;
      S.jobs.forEach(function (j) {
        var was = seenJobs[j.id];
        if (was !== undefined && was !== "done" && j.status === "done") {
          var it = itemById(j.item);
          if (it) showReady(it);
        }
        seenJobs[j.id] = j.status;
      });
      if (prefsChanged) { applyPrefs(); renderHome(); }
      if (lookOpen) renderLook();
      var name = current();
      if (name === "studio" || name === "library" || name === "settings") renderScreen(name);
      if (name === "player" && playing && !itemById(playing.id)) back();
      setBackground();
      renderMakingPill();
    });
  }
  var ev = -1, rn = -1;
  function listen() {
    fetch("/api/wait?e=" + ev + "&r=" + rn).then(function (r) { return r.json(); }).then(function (w) {
      var changed = w.event !== ev;
      if (rn !== -1 && w.remote.n !== rn && w.remote.cmd) command(w.remote.cmd);
      ev = w.event; rn = w.remote.n;
      return changed ? refresh() : null;
    }).catch(function () {
      return new Promise(function (res) { setTimeout(res, 2000); });
    }).then(listen);
  }

  var q = {};
  location.search.replace(/[?&]([^=&]+)=([^&]*)/g, function (m, k, v) { q[k] = decodeURIComponent(v); });
  refresh().then(function () {
    if (q.design) {
      var d = DESIGNS.filter(function (x) { return x.id === q.design; })[0];
      if (d) for (var k in d.p) P[k] = d.p[k];
    }
    if (q.shot) stage.classList.add("shot");
    S.jobs.forEach(function (j) { seenJobs[j.id] = j.status; });
    lastFocusByScreen.home = "app-" + P.apps[0];
    applyPrefs();
    renderHome();
    restoreFocus("home");
    if (q.open === "look") openLook();
    else if (q.open) open(q.open);
    if (!q.shot) listen();   // screenshots need a page that goes quiet
  });
})();
