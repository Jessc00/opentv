/* OpenTV service: the on-TV half of OpenTV. TizenBrew runs this file in its own Node process on the TV.

   It is a port of Nova's server.py, so the TV screen and the phone remote work exactly as before, just without
   a computer: it serves the screens on port 4940, keeps the Higgsfield key and your creations on the TV, makes
   the Higgsfield calls, opens the TV's own apps (Netflix, YouTube...) and answers the phone remote.

   TizenBrew runs this inside a vm sandbox on whatever Node the TV ships (old ones are Node 4), so it is plain
   ES5 with only Node's built-in modules: no let/const, arrow functions, template strings or npm packages. */
(function (G) {
  "use strict";

  var http = require("http"), https = require("https"), fs = require("fs"), path = require("path"),
      os = require("os"), urlmod = require("url"), crypto = require("crypto");
  var Buf = require("buffer").Buffer;
  var timers = require("timers");
  var setTimeout = timers.setTimeout, clearTimeout = timers.clearTimeout;
  var TIZEN = typeof G.tizen !== "undefined" ? G.tizen : (typeof tizen !== "undefined" ? tizen : null);

  var PORT = 4940;
  var HF_BASE = "https://api.higgsfield.ai";
  var UA = "opentv/1.0";                 // Cloudflare blocks requests with no User-Agent (error 1010)
  var MAX_RENDERS = 3;                   // the account allows about 4 at once; keep one spare
  var BG_PATH = "/higgsfield-ai/soul/v2/standard";
  var BG_PRICE = 0.01;
  var DURATIONS = [5, 10];

  var ENGINES = {
    seedance: { label: "Seedance 2.0", t2v: "/bytedance/seedance-2.0/text-to-video",
                i2v: "/bytedance/seedance-2.0/image-to-video", extra: { resolution: "720p" }, note: "Most cinematic" },
    kling: { label: "Kling 3.0", t2v: "/kling-video/v3.0/std/text-to-video",
             i2v: "/kling-video/v3.0/std/image-to-video", extra: { sound: "on" }, note: "Lower price" }
  };

  var DEFAULT_PREFS = {
    bg: { type: "preset", id: "misty-coast" },
    layout: "grid", tiles: "glass", labels: "both", logo: "white", font: "modern", clock: "show",
    apps: ["netflix", "youtube", "primevideo", "disneyplus", "appletv", "hbomax", "hulu", "spotify", "studio"]
  };

  // The names each tile's app goes by on a Samsung TV, most specific first.
  var TV_APP_NAMES = {
    netflix: ["netflix"], youtube: ["youtube"], primevideo: ["prime video", "amazon prime video"],
    disneyplus: ["disney+", "disney plus"], appletv: ["apple tv"], hbomax: ["hbo max", "max"], hulu: ["hulu"],
    spotify: ["spotify"], paramountplus: ["paramount+", "paramount plus"], peacock: ["peacock"],
    youtubetv: ["youtube tv"], twitch: ["twitch"], plex: ["plex"], crunchyroll: ["crunchyroll"], tubi: ["tubi"],
    youtubemusic: ["youtube music"], applemusic: ["apple music"], stremio: ["stremio"], vimeo: ["vimeo"]
  };

  function log() {
    try { console.log.apply(console, ["[OpenTV]"].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
  }

  // ---------------------------------------------------------------- where things live on the TV

  function mkdirs(dir) {
    if (fs.existsSync(dir)) return;
    mkdirs(path.dirname(dir));
    fs.mkdirSync(dir);
  }
  function writable(dir) {
    try {
      mkdirs(dir);
      var probe = path.join(dir, ".probe");
      fs.writeFileSync(probe, "ok");
      fs.unlinkSync(probe);
      return true;
    } catch (e) { return false; }
  }
  function pickDataDir() {
    var tries = [];
    if (G.OPENTV_DATA_DIR) tries.push(G.OPENTV_DATA_DIR);
    try {   // TizenBrew's own private folder survives reboots
      tries.push("/opt/usr/home/owner/apps_rw/" + TIZEN.application.getAppInfo().packageId + "/data/opentv");
    } catch (e) {}
    try { tries.push(path.join(os.homedir(), "opentv")); } catch (e) {}
    tries.push(path.join(os.tmpdir(), "opentv"));
    for (var i = 0; i < tries.length; i++) if (writable(tries[i])) return tries[i];
    return tries[tries.length - 1];
  }
  var DATA_DIR = pickDataDir();
  var LIB = path.join(DATA_DIR, "library");
  var UPLOADS = path.join(LIB, "uploads");
  var STATIC_CACHE = path.join(DATA_DIR, "static");
  var CONFIG = path.join(DATA_DIR, "config.json");
  var DATA = path.join(LIB, "library.json");
  var PREFS = path.join(LIB, "prefs.json");
  try { mkdirs(UPLOADS); mkdirs(STATIC_CACHE); } catch (e) { log("cannot create data folders", e); }
  log("data in", DATA_DIR);

  // ---------------------------------------------------------------- config + library

  function readJson(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return fallback; }
  }
  function writeJson(file, obj) {
    var tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
    fs.renameSync(tmp, file);
  }
  function cfg() { return readJson(CONFIG, {}); }
  function saveCfg(c) { writeJson(CONFIG, c); }
  function lib() { return readJson(DATA, { items: [], wallpaper: null, spent: 0 }); }
  function saveLib(d) { writeJson(DATA, d); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }

  function prefs() {
    var p = copy(DEFAULT_PREFS), saved = readJson(PREFS, {});
    for (var k in saved) if (saved.hasOwnProperty(k)) p[k] = saved[k];
    return p;
  }
  function savePrefs(changes) {
    var p = prefs();
    for (var k in changes) if (changes.hasOwnProperty(k) && DEFAULT_PREFS.hasOwnProperty(k)) p[k] = changes[k];
    writeJson(PREFS, p);
    bump();
    return p;
  }

  // ---------------------------------------------------------------- live updates (TV and phone long-poll)

  var EVENTS = { n: 0 };
  var REMOTE = { cmd: null, n: 0 };
  var waiters = [];

  function wakeWaiters() {
    var still = [];
    waiters.forEach(function (w) {
      if (EVENTS.n !== w.ev || REMOTE.n !== w.rn) w.done();
      else still.push(w);
    });
    waiters = still;
  }
  function bump() { EVENTS.n += 1; wakeWaiters(); }
  function waitForChange(ev, rn, reply) {
    var w = { ev: ev, rn: rn, sent: false };
    w.done = function () {
      if (w.sent) return;
      w.sent = true;
      clearTimeout(w.timer);
      reply({ event: EVENTS.n, remote: { cmd: REMOTE.cmd, n: REMOTE.n } });
    };
    if (EVENTS.n !== ev || REMOTE.n !== rn) return w.done();
    w.timer = setTimeout(function () {
      waiters = waiters.filter(function (x) { return x !== w; });
      w.done();
    }, 20000);
    waiters.push(w);
  }

  function lanIp() {
    var nets = os.networkInterfaces(), name, i, a;
    for (name in nets) {
      for (i = 0; i < nets[name].length; i++) {
        a = nets[name][i];
        if ((a.family === "IPv4" || a.family === 4) && !a.internal) return a.address;
      }
    }
    return "127.0.0.1";
  }

  // ---------------------------------------------------------------- outgoing requests

  // request("GET", url, {headers, body, timeout}, cb(err, status, headers, bodyBuffer)), following redirects
  function request(method, url, opt, cb, hops) {
    opt = opt || {};
    var u = urlmod.parse(url), mod = u.protocol === "https:" ? https : http, finished = false;
    var headers = {};
    for (var h in (opt.headers || {})) headers[h] = opt.headers[h];
    if (opt.body != null) headers["Content-Length"] = Buf.byteLength(opt.body);
    function finish(err, status, hdrs, body) {
      if (finished) return;
      finished = true;
      cb(err, status, hdrs, body);
    }
    var req = mod.request({ method: method, hostname: u.hostname, port: u.port, path: u.path, headers: headers }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (hops || 0) < 5) {
        res.resume();
        var next = urlmod.resolve(url, res.headers.location);
        return request(method === "POST" ? "GET" : method, next, method === "POST" ? { headers: opt.headers, timeout: opt.timeout } : opt,
                       finish, (hops || 0) + 1);
      }
      if (opt.saveTo) {
        if (res.statusCode >= 400) { res.resume(); return finish(new Error("HTTP " + res.statusCode), res.statusCode, res.headers); }
        var out = fs.createWriteStream(opt.saveTo);
        res.pipe(out);
        out.on("finish", function () { finish(null, res.statusCode, res.headers); });
        out.on("error", function (e) { finish(e); });
        res.on("error", function (e) { finish(e); });
        return;
      }
      var chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () { finish(null, res.statusCode, res.headers, Buf.concat(chunks)); });
      res.on("error", function (e) { finish(e); });
    });
    req.on("error", function (e) { finish(e); });
    req.setTimeout(opt.timeout || 45000, function () { req.abort(); finish(new Error("timed out")); });
    if (opt.body != null) req.write(opt.body);
    req.end();
  }

  // ---------------------------------------------------------------- Higgsfield

  function hf(method, urlOrPath, body, cb, timeout) {
    var k = cfg().higgsfield || {};
    var url = /^https?:/.test(urlOrPath) ? urlOrPath : HF_BASE + urlOrPath;
    request(method, url, {
      headers: { "Authorization": "Key " + (k.api_key || "") + ":" + (k.secret || ""), "Content-Type": "application/json",
                 "Accept": "application/json", "User-Agent": UA },
      body: body != null ? JSON.stringify(body) : null, timeout: timeout || 45000
    }, function (err, status, hdrs, raw) {
      if (err) return cb(0, { detail: String(err.message || err).slice(0, 200) });
      var o = {};
      try { o = raw && raw.length ? JSON.parse(raw.toString("utf8")) : {}; } catch (e) { o = {}; }
      cb(status, o);
    });
  }

  function friendly(code, detail) {
    var d = String(detail || "").toLowerCase();
    if (code === 401 || code === 403) return "Your Higgsfield key was rejected. Check it in Settings.";
    if (code === 402 || d.indexOf("credit") >= 0 || d.indexOf("balance") >= 0 || d.indexOf("insufficient") >= 0)
      return "Your Higgsfield balance is empty. Top it up, then try again.";
    if (d.indexOf("copyright") >= 0) return "The video model thought this looked like someone else's character or brand. Try different wording.";
    if (d.indexOf("nsfw") >= 0 || d.indexOf("moderation") >= 0) return "The safety filter blocked this one. Try different wording.";
    if (d.indexOf("timed out") >= 0) return "This one took too long. Try again.";
    return (String(detail || "") || "Something went wrong. Try again.").slice(0, 160);
  }

  function bodyFor(engine, prompt, duration, imageUrl) {
    var e = ENGINES[engine], b = { prompt: prompt, duration: Number(duration) }, k;
    for (k in e.extra) b[k] = e.extra[k];
    if (imageUrl) b.image_url = imageUrl;     // image-to-video takes its shape from the photo
    else b.aspect_ratio = "16:9";
    return b;
  }

  var EST_CACHE = {};
  // Dollars for one video, before any account discount. Free to ask.
  function price(engine, duration, cb) {
    duration = Number(duration);
    if (engine === "seedance") {
      var tokens = Math.ceil(duration * 1280 * 720 * 24 / 1024);
      return cb(Math.round(tokens * 0.014 / 1000 * 100) / 100);
    }
    var key = engine + ":" + duration, hit = EST_CACHE[key];
    if (hit && Date.now() - hit.at < 600000) return cb(hit.usd);
    hf("POST", "/estimate" + ENGINES[engine].t2v, bodyFor(engine, "price check", duration), function (c, o) {
      if (c !== 200 || o.usd == null || o.usd === "") return cb(null);
      var usd = Math.round(Number(o.usd) * 100) / 100;
      EST_CACHE[key] = { at: Date.now(), usd: usd };
      cb(usd);
    });
  }

  function mimeOf(file) {
    var ext = path.extname(file).toLowerCase();
    return { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
             ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
             ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".ico": "image/x-icon" }[ext] ||
      "application/octet-stream";
  }

  function upload(file, cb) {
    var ct = mimeOf(file);
    if (ct.indexOf("image/") !== 0) ct = "image/jpeg";
    hf("POST", "/files/generate-upload-url", { content_type: ct }, function (c, o) {
      if ((c !== 200 && c !== 201) || !o.upload_url) return cb(null);
      var hdrs = o.upload_headers || { "Content-Type": ct };
      request("PUT", o.upload_url, { headers: hdrs, body: fs.readFileSync(file), timeout: 90000 }, function (err, status) {
        cb(err || status >= 400 ? null : o.public_url);
      });
    });
  }

  // Never more than MAX_RENDERS at once; the rest wait their turn.
  var running = 0, queue = [];
  function acquire(fn) {
    if (running < MAX_RENDERS) { running += 1; return fn(release); }
    queue.push(fn);
  }
  function release() {
    running -= 1;
    if (queue.length) { running += 1; queue.shift()(release); }
  }

  // One render, polled to the end. Never retries a POST that might have been billed.
  function submitAndWait(job, apiPath, body, cb) {
    acquire(function (done) {
      function out(url, err) { done(); cb(url, err); }
      var attempt = 0;
      function submit() {
        hf("POST", apiPath, body, function (code, o) {
          if ((code === 200 || code === 201 || code === 202) && o.request_id) return poll(o);
          var detail = String(o.detail || JSON.stringify(o));
          attempt += 1;
          if (attempt >= 8) return out(null, "Higgsfield is busy. Try again in a minute.");
          if (code === 400 && detail.toLowerCase().indexOf("concurrent") >= 0) return setTimeout(submit, 4000 + attempt * 3000);
          if (code === 502 || code === 504) return setTimeout(submit, 3000);
          out(null, friendly(code, detail));
        });
      }
      function poll(o) {
        setJob(job, { status: "making", request_id: o.request_id });
        var su = o.status_url || HF_BASE + "/requests/" + o.request_id + "/status";   // status_url lives on platform.higgsfield.ai
        var t0 = Date.now(), delay = 3000;
        function check() {
          if (Date.now() - t0 > 1500000) return out(null, friendly(0, "timed out"));
          hf("GET", su, null, function (c, s) {
            var st = s.status;
            if (st === "queued" || st === "in_progress") setJob(job, { phase: st });
            if (st === "completed") {
              var url = (s.video || {}).url || ((s.images || [{}])[0] || {}).url;
              return url ? out(url, null) : out(null, "Finished without a file. Try again.");
            }
            if (st === "failed" || st === "nsfw" || st === "canceled") return out(null, friendly(0, s.error || st));
            delay = Math.min(delay * 1.3, 10000);
            setTimeout(check, delay);
          });
        }
        setTimeout(check, delay);
      }
      submit();
    });
  }

  // ---------------------------------------------------------------- jobs

  var JOBS = {};   // id -> job (in memory; the library is what persists)

  function setJob(job, kw) {
    for (var k in kw) job[k] = kw[k];
    bump();
  }

  var LEAD = ["a", "an", "the", "make", "me", "please", "show", "video", "of"];
  var TAIL = ["a", "an", "the", "of", "to", "toward", "towards", "at", "as", "and", "with", "in", "on", "into", "over", "its",
              "his", "her", "their", "from", "by", "for"];
  function titleFrom(prompt) {
    var words = String(prompt).replace(/[^\w\s'-]/g, " ").split(/\s+/).filter(Boolean);
    while (words.length > 2 && LEAD.indexOf(words[0].toLowerCase()) >= 0) words.shift();
    var keep = words.slice(0, 6);
    while (keep.length > 2 && TAIL.indexOf(keep[keep.length - 1].toLowerCase()) >= 0) keep.pop();
    var t = keep.join(" ");
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Untitled";
  }

  function addItem(job, item) {
    var d = lib();
    d.items.unshift(item);
    d.spent = Math.round((Number(d.spent || 0) + Number(job.price || 0)) * 100) / 100;
    saveLib(d);
  }

  function runJob(job, photoPath) {
    function fail(err) { setJob(job, { status: "failed", error: err }); }
    function render(imageUrl) {
      if (job.kind === "background") {
        return submitAndWait(job, BG_PATH, { prompt: job.prompt, aspect_ratio: "16:9", resolution: "1080p" }, function (url, err) {
          if (err) return fail(err);
          saveBackground(job, url);
        });
      }
      var engine = job.engine;
      submitAndWait(job, ENGINES[engine][imageUrl ? "i2v" : "t2v"], bodyFor(engine, job.prompt, job.duration, imageUrl), function (url, err) {
        if (err && engine === "seedance" && err.indexOf("someone else's character") >= 0) {
          // Seedance's copyright filter is strict; blocked requests aren't charged, so quietly try Kling instead
          engine = "kling";
          return price(engine, job.duration, function (usd) {
            setJob(job, { engine: engine, price: usd, status: "queued", phase: "queued" });
            submitAndWait(job, ENGINES[engine][imageUrl ? "i2v" : "t2v"], bodyFor(engine, job.prompt, job.duration, imageUrl), function (url2, err2) {
              if (err2) return fail(err2);
              saveVideo(job, url2);
            });
          });
        }
        if (err) return fail(err);
        saveVideo(job, url);
      });
    }
    if (!photoPath) return render(null);
    setJob(job, { status: "uploading" });
    upload(photoPath, function (imageUrl) {
      if (!imageUrl) return fail("The photo didn't upload. Try again.");
      render(imageUrl);
    });
  }

  // Finished files are saved on the TV right away because Higgsfield deletes outputs after 7 days.
  function saveVideo(job, url) {
    setJob(job, { status: "saving" });
    var vfile = job.id + ".mp4";
    request("GET", url, { headers: { "User-Agent": UA }, saveTo: path.join(LIB, vfile), timeout: 180000 }, function (err) {
      if (err) return setJob(job, { status: "failed", error: friendly(0, err.message) });
      addItem(job, { id: job.id, title: job.title, prompt: job.prompt, kind: job.kind, engine: job.engine, duration: job.duration,
                     file: vfile, poster: null, photo: job.photo, price: job.price, created: Date.now() / 1000, from: job.from });
      if (job.kind === "wallpaper") savePrefs({ bg: { type: "item", id: job.id } });
      setJob(job, { status: "done", item: job.id, finished: Date.now() / 1000 });
    });
  }

  function saveBackground(job, url) {
    setJob(job, { status: "saving" });
    var tmp = path.join(LIB, job.id + ".src");
    request("GET", url, { headers: { "User-Agent": UA }, saveTo: tmp, timeout: 120000 }, function (err, status, hdrs) {
      if (err) return setJob(job, { status: "failed", error: friendly(0, err.message) });
      var ct = String((hdrs || {})["content-type"] || ""), ext = /png/.test(ct) || /\.png(\?|$)/i.test(url) ? ".png" :
        /webp/.test(ct) || /\.webp(\?|$)/i.test(url) ? ".webp" : ".jpg";
      var file = job.id + ext;
      fs.renameSync(tmp, path.join(LIB, file));
      addItem(job, { id: job.id, title: job.title, prompt: job.prompt, kind: "background", engine: "soul", duration: 0, file: file,
                     poster: file, price: job.price, created: Date.now() / 1000, from: job.from });
      savePrefs({ bg: { type: "item", id: job.id } });
      setJob(job, { status: "done", item: job.id, finished: Date.now() / 1000 });
    });
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function newId() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()) +
      pad(d.getSeconds()) + "-" + crypto.randomBytes(2).toString("hex");
  }

  function startJob(d, reply) {
    var prompt = String(d.prompt || "").trim();
    var kind = ["video", "wallpaper", "photo", "background"].indexOf(d.kind) >= 0 ? d.kind : "video";
    if (!prompt && kind !== "photo") return reply({ ok: false, error: "Describe what you want to see first." });
    var c = cfg();
    if (!(c.higgsfield || {}).api_key) return reply({ ok: false, error: "Add your Higgsfield key in Settings first." });
    var engine = ENGINES[d.engine] ? d.engine : (c.engine || "seedance");
    var duration = Number(d.duration || (kind === "wallpaper" ? 10 : 5));
    if (DURATIONS.indexOf(duration) < 0) duration = 5;
    var iid = newId(), photoPath = null, photoFile = null;
    if (kind === "photo") {
      var m = /^data:(image\/[\w.+-]+);base64,([\s\S]*)$/.exec(d.image || "");
      if (!m) return reply({ ok: false, error: "Pick a photo first." });
      var ext = { "image/png": ".png", "image/webp": ".webp" }[m[1]] || ".jpg";
      photoFile = "uploads/" + iid + ext;
      photoPath = path.join(LIB, photoFile);
      // Node 4.4's Buffer.from is the wrong (typed-array) one; Buffer.alloc arrived with the right one
      fs.writeFileSync(photoPath, Buf.alloc ? Buf.from(m[2], "base64") : new Buf(m[2], "base64"));
      prompt = prompt || "Bring this photo to life with gentle, natural movement";
    }
    if (kind === "wallpaper") prompt = prompt + ". Slow, calm, seamless ambient motion, no people talking, no text.";
    if (kind === "background") {
      prompt = "Wide landscape photograph, " + prompt + ". Shot on a full-frame camera, natural light, " +
        "ultra detailed, calm composition with open space, no people, no text, no watermark.";
    }
    function go(usd) {
      var job = { id: iid, kind: kind, prompt: prompt, title: titleFrom(d.prompt || prompt), engine: engine, duration: duration,
                  status: "queued", phase: "queued", price: usd, started: Date.now() / 1000, error: null, item: null,
                  from: d.from === "phone" ? "phone" : "tv", photo: photoFile };
      JOBS[iid] = job;
      bump();
      runJob(job, photoPath);
      reply({ ok: true, job: job });
    }
    if (kind === "background") go(BG_PRICE);
    else price(engine, duration, go);
  }

  function state() {
    var d = lib(), c = cfg(), k = c.higgsfield || {}, engines = {}, n;
    var jobs = Object.keys(JOBS).map(function (id) { return JOBS[id]; })
      .sort(function (a, b) { return b.started - a.started; }).slice(0, 12);
    for (n in ENGINES) engines[n] = { label: ENGINES[n].label, note: ENGINES[n].note };
    return { items: d.items, prefs: prefs(), spent: d.spent || 0, jobs: jobs, bg_price: BG_PRICE,
             event: EVENTS.n, remote: { cmd: REMOTE.cmd, n: REMOTE.n }, remote_url: "http://" + lanIp() + ":" + PORT + "/remote",
             engine: c.engine || "seedance", has_key: !!k.api_key, key_hint: k.api_key ? "..." + String(k.api_key).slice(-4) : "",
             engines: engines, on_tv: !!TIZEN };
  }

  // ---------------------------------------------------------------- opening the TV's own apps

  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").trim(); }
  function launchApp(id, reply) {
    var names = TV_APP_NAMES[id];
    if (!names) return reply({ ok: false, error: "OpenTV doesn't know that app." });
    if (!TIZEN) return reply({ ok: false, web: true, error: "Not running on a TV." });
    try {
      TIZEN.application.getAppsInfo(function (apps) {
        var found = null, i, j;
        for (i = 0; i < names.length && !found; i++) {
          for (j = 0; j < apps.length; j++) if (norm(apps[j].name) === names[i]) { found = apps[j]; break; }
        }
        for (i = 0; i < names.length && !found; i++) {   // "Netflix (Kids)" and friends
          if (names[i].length < 5) continue;
          for (j = 0; j < apps.length; j++) if (norm(apps[j].name).indexOf(names[i]) === 0) { found = apps[j]; break; }
        }
        if (!found) return reply({ ok: false, error: "This TV doesn't have that app yet. Install it from the Samsung Apps store." });
        TIZEN.application.launch(found.id, function () { reply({ ok: true, appId: found.id }); },
          function (e) { reply({ ok: false, error: "The TV wouldn't open " + found.name + " (" + (e && e.message) + ")." }); });
      }, function (e) { reply({ ok: false, error: "Couldn't read the TV's app list (" + (e && e.message) + ")." }); });
    } catch (e) {
      reply({ ok: false, error: "Couldn't open the app (" + e.message + ")." });
    }
  }

  // ---------------------------------------------------------------- the screens themselves

  /* The TV screen, remote and pictures come from wherever TizenBrew installed OpenTV from (jsDelivr, through
     TizenBrew's own local proxy). The launcher page tells us that address the first time; each file is kept on
     the TV too, so OpenTV still opens if the internet is down. */
  var STATIC_BASE = G.OPENTV_STATIC_BASE || cfg().static_base || null;
  var memCache = {};

  function setModule(encoded) {
    if (G.OPENTV_STATIC_BASE || !encoded) return;
    var base = "http://127.0.0.1:8081/module/" + encodeURIComponent(encoded) + "/";
    if (base === STATIC_BASE) return;
    STATIC_BASE = base;
    memCache = {};
    var c = cfg();
    c.static_base = base;
    saveCfg(c);
  }

  function getStatic(rel, cb) {
    if (memCache[rel]) return cb(null, memCache[rel]);
    var disk = path.join(STATIC_CACHE, rel);
    function fromDisk(err) {
      fs.readFile(disk, function (e, buf) { cb(e ? (err || e) : null, buf); });
    }
    if (!STATIC_BASE) return fromDisk(new Error("OpenTV hasn't been opened from TizenBrew yet."));
    request("GET", STATIC_BASE + rel, { timeout: 20000 }, function (err, status, hdrs, buf) {
      if (err || status !== 200) return fromDisk(err || new Error("HTTP " + status));
      memCache[rel] = buf;
      try { mkdirs(path.dirname(disk)); fs.writeFileSync(disk, buf); } catch (e) {}
      cb(null, buf);
    });
  }

  // ---------------------------------------------------------------- HTTP

  function cors(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  function sendJson(res, obj, code) {
    var raw = JSON.stringify(obj);
    res.writeHead(code || 200, { "Content-Type": "application/json", "Cache-Control": "no-store",
                                 "Content-Length": Buf.byteLength(raw) });
    res.end(raw);
  }
  function notFound(res) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); }

  function sendStatic(res, rel) {
    getStatic(rel, function (err, buf) {
      if (err) { res.writeHead(502, { "Content-Type": "text/plain" }); return res.end("OpenTV couldn't load " + rel + ": " + err.message); }
      res.writeHead(200, { "Content-Type": mimeOf(rel), "Content-Length": buf.length,
                           "Cache-Control": /\.(html|js|css)$/.test(rel) ? "no-cache" : "max-age=3600" });
      res.end(buf);
    });
  }

  function sendFile(req, res, file) {
    fs.stat(file, function (err, st) {
      if (err || !st.isFile()) return notFound(res);
      var size = st.size, start = 0, end = size - 1, code = 200;
      var hdrs = { "Content-Type": mimeOf(file), "Accept-Ranges": "bytes", "Cache-Control": "max-age=3600" };
      var m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
      if (m && (m[1] || m[2])) {
        if (m[1]) { start = Number(m[1]); end = m[2] ? Number(m[2]) : size - 1; }
        else start = Math.max(0, size - Number(m[2]));
        end = Math.min(end, size - 1);
        code = 206;
        hdrs["Content-Range"] = "bytes " + start + "-" + end + "/" + size;
      }
      hdrs["Content-Length"] = end - start + 1;
      res.writeHead(code, hdrs);
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(file, { start: start, end: end }).on("error", function () { res.end(); }).pipe(res);
    });
  }

  function readBody(req, cb) {
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () {
      var d = {};
      try { d = JSON.parse(Buf.concat(chunks).toString("utf8") || "{}"); } catch (e) { d = {}; }
      cb(d && typeof d === "object" ? d : {});
    });
  }

  function handle(req, res) {
    cors(res);
    var u = urlmod.parse(req.url, true), p = decodeURIComponent(u.pathname || "/"), q = u.query || {};
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    if (req.method === "GET" || req.method === "HEAD") {
      if (p === "/api/ping") return sendJson(res, { ok: true, ready: !!STATIC_BASE });
      if (p === "/" || p === "/index.html") { if (q.m) setModule(q.m); return sendStatic(res, "tv/index.html"); }
      if (p === "/remote" || p === "/remote/") return sendStatic(res, "remote/index.html");
      if (p === "/api/state") return sendJson(res, state());
      if (p === "/api/wait") return waitForChange(Number(q.e == null ? -1 : q.e), Number(q.r == null ? -1 : q.r), function (o) { sendJson(res, o); });
      if (p === "/api/price") {
        var engine = ENGINES[q.engine] ? q.engine : "seedance", dur = Number(q.duration || 5);
        return price(engine, DURATIONS.indexOf(dur) >= 0 ? dur : 5, function (usd) { sendJson(res, { usd: usd }); });
      }
      if (/^\/(tv|remote|vendor)\//.test(p)) {
        var rel = path.normalize(p.slice(1));
        if (rel.indexOf("..") >= 0) return notFound(res);
        return sendStatic(res, rel);
      }
      if (p.indexOf("/library/") === 0) {
        var full = path.normalize(path.join(LIB, p.slice("/library/".length)));
        if (full.indexOf(LIB + path.sep) !== 0 || /\.json$/.test(full)) return notFound(res);
        return sendFile(req, res, full);
      }
      return notFound(res);
    }
    if (req.method !== "POST") return notFound(res);
    readBody(req, function (d) {
      if (p === "/api/create") return startJob(d, function (o) { sendJson(res, o); });
      if (p === "/api/launch") return launchApp(String(d.app || ""), function (o) { sendJson(res, o); });
      if (p === "/api/remote") {
        REMOTE.cmd = String(d.cmd || "").slice(0, 60);
        REMOTE.n += 1;
        wakeWaiters();
        return sendJson(res, { ok: true });
      }
      if (p === "/api/prefs") return sendJson(res, { ok: true, prefs: savePrefs(d) });
      if (p === "/api/delete") {
        var lb = lib(), keep = [];
        lb.items.forEach(function (i) {
          if (i.id !== d.id) return keep.push(i);
          [i.file, i.poster].forEach(function (f) {
            if (f && fs.existsSync(path.join(LIB, f))) { try { fs.unlinkSync(path.join(LIB, f)); } catch (e) {} }
          });
        });
        lb.items = keep;
        saveLib(lb);
        var bg = prefs().bg;
        if (bg && bg.type === "item" && bg.id === d.id) savePrefs({ bg: DEFAULT_PREFS.bg });
        bump();
        return sendJson(res, { ok: true });
      }
      if (p === "/api/settings") {
        var c = cfg();
        if (d.api_key && d.secret) {
          c.higgsfield = { api_key: String(d.api_key).trim(), secret: String(d.secret).trim() };
          EST_CACHE = {};
        }
        if (ENGINES[d.engine]) c.engine = d.engine;
        saveCfg(c);
        bump();
        return sendJson(res, { ok: true });
      }
      if (p === "/api/dismiss") {
        delete JOBS[d.id];
        bump();
        return sendJson(res, { ok: true });
      }
      notFound(res);
    });
  }

  var server = http.createServer(function (req, res) {
    try { handle(req, res); } catch (e) {
      log("request failed", req.url, e && e.stack);
      try { sendJson(res, { ok: false, error: "Something went wrong. Try again." }, 500); } catch (e2) {}
    }
  });
  server.on("error", function (e) {
    // TizenBrew can start the service twice; the first copy is already answering on this port.
    log(e.code === "EADDRINUSE" ? "already running on port " + PORT : "server error", e.message);
  });
  server.listen(PORT, function () { log("listening on", PORT, "remote at", "http://" + lanIp() + ":" + PORT + "/remote"); });

  module.exports = { port: PORT, dataDir: DATA_DIR };
})(this);
