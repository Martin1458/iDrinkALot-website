/* iDrinkALot Post Builder — main app shell */
(function () {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const TEMPLATES = window.TEMPLATES;
  const BacLine = window.BacLine;

  // ============ Image-slot export swap ============
  // Replace every <image-slot> in the subtree with a plain div+img mirror of
  // its current state, run `fn`, then put the originals back. html-to-image's
  // shadow DOM serialization eats the slot's image and leaves the dashed
  // placeholder ring visible; the mirror is pure light DOM so it survives.
  async function withSlotMirrors(rootEl, fn) {
    const slots = Array.from(rootEl.querySelectorAll("image-slot"));
    const swaps = [];
    for (const slot of slots) {
      const clone = slot.__exportClone && slot.__exportClone();
      if (!clone) {
        console.warn("[export] slot has no clone (no image yet?)", slot.id);
        continue;
      }
      // Mirror layout-relevant inline styles so the clone occupies the same
      // box. (We rely on template-supplied inline styles for sizing.)
      clone.style.cssText = (slot.getAttribute("style") || "") + ";" + clone.style.cssText;
      slot.parentNode.replaceChild(clone, slot);
      swaps.push({ slot, clone });
    }
    console.log("[export] swapped", swaps.length, "slot(s) with light-DOM mirrors");
    try {
      return await fn();
    } finally {
      for (const { slot, clone } of swaps) {
        if (clone.parentNode) clone.parentNode.replaceChild(slot, clone);
      }
    }
  }

  // ============ Lazy script loader (for ffmpeg.wasm) ============
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-lazy-src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true" || existing.readyState === "complete") {
          resolve();
        } else {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("Failed to load " + src)), { once: true });
        }
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.dataset.lazySrc = src;
      s.onload = () => {
        s.dataset.loaded = "true";
        resolve();
      };
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  // ============ Edit context ============
  // Provides getDeep/setDeep for inline editable text in templates.
  const EditCtx = React.createContext({ getDeep: () => "", setDeep: () => {} });
  window.EditCtx = EditCtx;

  // Per-slot natural image dimensions, populated when image-slot fires
  // 'slot-image-loaded'. Templates can read this to size their chrome
  // (phone bezel, card wrapper, etc) to match the uploaded image's AR.
  const SlotDimsCtx = React.createContext({ get: () => null });
  window.SlotDimsCtx = SlotDimsCtx;

  function getDeepPath(obj, path) {
    if (!path) return undefined;
    const parts = String(path).split(".");
    let cur = obj;
    for (const k of parts) {
      if (cur == null) return undefined;
      cur = cur[k];
    }
    return cur;
  }
  function setDeepPath(obj, path, value) {
    const parts = String(path).split(".");
    const next = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
    let cur = next;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      const nextKey = parts[i + 1];
      const childIsArr = /^\d+$/.test(nextKey);
      const existing = cur[k];
      cur[k] = childIsArr
        ? (Array.isArray(existing) ? [...existing] : [])
        : { ...(typeof existing === "object" && existing !== null ? existing : {}) };
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
    return next;
  }

  // ============ Palettes ============
  const PALETTES = [
    { id: "cream",     name: "Cream",     bg: "#fff9e3", fg: "#081126", accent: "#ea7a53" },
    { id: "dark",      name: "Midnight",  bg: "#0c0f24", fg: "#fff9e3", accent: "#ea7a53" },
    { id: "charcoal",  name: "Charcoal",  bg: "#1a1a1a", fg: "#fff9e3", accent: "#ea7a53" },
    { id: "wine",      name: "Wine",      bg: "#6b1d2e", fg: "#fff9e3", accent: "#f0c454" },
    { id: "ember",     name: "Ember",     bg: "#b73a16", fg: "#fff9e3", accent: "#f0c454" },
    { id: "citrus",    name: "Citrus",    bg: "#ea7a53", fg: "#081126", accent: "#081126" },
    { id: "forest",    name: "Forest",    bg: "#1d3a2e", fg: "#fff9e3", accent: "#ea7a53" },
    { id: "olive",     name: "Olive",     bg: "#4a4a22", fg: "#fff9e3", accent: "#f0c454" },
    { id: "sunset",    name: "Sunset",    bg: "#d63d63", fg: "#fff9e3", accent: "#f0c454" },
    { id: "bruise",    name: "Bruise",    bg: "#382850", fg: "#fff9e3", accent: "#ea7a53" },
    { id: "bone",      name: "Bone",      bg: "#f3ead8", fg: "#3a2a18", accent: "#b73a16" },
    { id: "acid",      name: "Acid",      bg: "#fff9e3", fg: "#081126", accent: "#c7d655" },
  ];

  const ASPECTS = [
    { id: "1:1",  label: "1:1",  w: 1080, h: 1080 },
    { id: "4:5",  label: "4:5",  w: 1080, h: 1350 },
    { id: "9:16", label: "9:16", w: 1080, h: 1920 },
  ];

  // ============ Persistence ============
  const STATE_KEY = "idal_postbuilder_state_v1";
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); } catch { return {}; }
  }
  function saveState(s) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {}
  }

  // ============ Tiny swatch icon for the thumbnail previews ============
  function TplThumb({ tpl, palette }) {
    // Simple representative diagram per template id
    const bg = palette.bg, fg = palette.fg, accent = palette.accent;
    const common = { width: "100%", height: "100%", background: bg, color: fg, display: "flex", padding: 5 };
    const linePts = "M2,28 C8,28 12,18 18,12 S30,10 36,18 S50,25 58,16";
    const block = (extra) => ({ background: "currentColor", opacity: 0.85, ...extra });
    switch (tpl.id) {
      case "fullBleed":
        return (<div style={{ ...common, background: accent, position: "relative", padding: 0 }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(0,0,0,0.6), transparent 50%)` }} />
          <div style={{ position: "absolute", left: 6, right: 6, bottom: 6, height: 8, background: "#fff", borderRadius: 1 }} />
        </div>);
      case "phoneFrame":
        return (<div style={{ ...common, flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: 6 }}>
          <div style={{ height: 4, width: "60%", background: "currentColor", borderRadius: 1, opacity: 0.85 }} />
          <div style={{ width: 18, height: 30, background: fg, borderRadius: 4, padding: 1.5 }}>
            <div style={{ width: "100%", height: "100%", background: accent, borderRadius: 3 }} />
          </div>
          <div />
        </div>);
      case "splitText": case "splitTextR":
        return (<div style={{ ...common, padding: 0, flexDirection: tpl.id === "splitTextR" ? "row-reverse" : "row" }}>
          <div style={{ flex: 1, padding: 4, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
            <div style={{ height: 4, width: "70%", background: "currentColor", borderRadius: 1 }} />
            <div style={{ height: 2, width: "60%", background: "currentColor", opacity: 0.5 }} />
          </div>
          <div style={{ flex: 1, background: accent, display: "grid", placeItems: "center" }}>
            <div style={{ width: 10, height: 20, background: fg, borderRadius: 2 }} />
          </div>
        </div>);
      case "sideBySide":
        return (<div style={{ ...common, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ width: 9, height: 20, background: fg, borderRadius: 2 }} />
            <div style={{ width: 9, height: 20, background: fg, borderRadius: 2 }} />
          </div>
          <div style={{ height: 2, width: "60%", background: "currentColor", opacity: 0.5 }} />
        </div>);
      case "stack":
        return (<div style={{ ...common, display: "grid", placeItems: "center" }}>
          <div style={{ position: "relative", width: 32, height: 30 }}>
            <div style={{ position: "absolute", left: 0, top: 4, width: 12, height: 22, background: fg, borderRadius: 2, transform: "rotate(-10deg)" }} />
            <div style={{ position: "absolute", left: 11, top: 0, width: 12, height: 26, background: accent, borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 22, top: 4, width: 12, height: 22, background: fg, borderRadius: 2, transform: "rotate(10deg)" }} />
          </div>
        </div>);
      case "bigStat":
        return (<div style={{ ...common, display: "grid", placeItems: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: accent, lineHeight: 1 }}>284</div>
        </div>);
      case "quote":
        return (<div style={{ ...common, flexDirection: "column", justifyContent: "center", padding: 6, gap: 2 }}>
          <div style={{ fontSize: 14, color: accent, lineHeight: 0.6, fontWeight: 900 }}>"</div>
          <div style={{ height: 3, width: "70%", background: "currentColor" }} />
          <div style={{ height: 3, width: "55%", background: "currentColor" }} />
        </div>);
      case "comparison":
        return (<div style={{ ...common, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 1, padding: 4 }}>
          {[0,1,2,3,4,5,6,7,8].map(i => {
            const lastCol = i % 3 === 2;
            return <div key={i} style={{ display: "grid", placeItems: "center", color: lastCol ? accent : (i < 3 ? fg : "currentColor"), fontSize: 7, opacity: lastCol ? 1 : 0.7 }}>{lastCol || i % 3 === 1 ? "✓" : (i < 3 ? "·" : "×")}</div>;
          })}
        </div>);
      case "socialProof":
        return (<div style={{ ...common, flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 3 }}>
          <div style={{ color: accent, fontSize: 9, letterSpacing: 1 }}>★★★★★</div>
          <div style={{ height: 2, width: "60%", background: "currentColor" }} />
          <div style={{ height: 2, width: "40%", background: "currentColor", opacity: 0.6 }} />
        </div>);
      case "beforeAfter":
        return (<div style={{ ...common, padding: 0 }}>
          <div style={{ flex: 1, opacity: 0.4, display: "grid", placeItems: "center", fontSize: 16, fontWeight: 900 }}>?</div>
          <div style={{ flex: 1, background: accent, color: bg, display: "grid", placeItems: "center" }}>
            <svg width="80%" height="50%" viewBox="0 0 60 30"><path d={linePts} stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </div>
        </div>);
      case "soberBy":
        return (<div style={{ ...common, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: accent, fontSize: 22, fontWeight: 900, letterSpacing: -1 }}>02:30</div>
          <div style={{ marginTop: 2, color: accent, opacity: 0.6, width: "80%" }}>
            <svg viewBox="0 0 60 16"><path d="M2,12 C8,12 12,4 18,4 S38,12 58,8" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </div>
        </div>);
      case "minimalBadge":
        return (<div style={{ ...common, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <div style={{ width: 14, height: 14, background: fg, borderRadius: 3, color: accent, display: "grid", placeItems: "center", fontSize: 9, fontWeight: 900 }}>I</div>
          <div style={{ height: 2, width: 30, background: "currentColor" }} />
        </div>);
      case "featureHi":
        return (<div style={{ ...common, flexDirection: "column", padding: 4, gap: 2 }}>
          <div style={{ width: 12, height: 3, background: accent, borderRadius: 2 }} />
          <div style={{ height: 3, width: "80%", background: "currentColor" }} />
          <div style={{ flex: 1, background: accent, opacity: 0.4, borderRadius: 2, marginTop: 2 }} />
        </div>);
      case "showcase":
        return (<div style={{ ...common, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <div style={{ width: 14, height: 28, background: fg, borderRadius: 3, padding: 1.5 }}>
            <div style={{ width: "100%", height: "100%", background: accent, borderRadius: 2 }} />
          </div>
          <div style={{ height: 2, width: "40%", background: "currentColor" }} />
        </div>);
      case "catalog":
        return (<div style={{ ...common, padding: 5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ height: 8, background: "currentColor", opacity: 0.6, borderRadius: 2 }}/>)}
        </div>);
      case "graphCallout":
        return (<div style={{ ...common, flexDirection: "column", padding: 4, gap: 2 }}>
          <div style={{ height: 2, width: 14, background: accent, borderRadius: 1 }} />
          <div style={{ flex: 1, color: accent, display: "grid", placeItems: "center" }}>
            <svg width="90%" height="80%" viewBox="0 0 60 24"><path d="M2,20 C8,20 12,4 18,4 S30,18 38,10 S52,18 58,14" stroke="currentColor" strokeWidth="2.5" fill="none"/></svg>
          </div>
        </div>);
      case "shareCard":
        return (<div style={{ ...common, display: "grid", placeItems: "center", padding: 4 }}>
          <div style={{ width: "85%", height: "80%", background: accent, opacity: 0.2, borderRadius: 4, border: `1px solid ${accent}`, display: "grid", placeItems: "center", color: accent }}>
            <svg width="70%" height="40%" viewBox="0 0 60 24"><path d="M2,20 C8,20 14,4 22,6 S40,16 58,10" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </div>
        </div>);
      case "nightRecap":
        return (<div style={{ ...common, flexDirection: "column", padding: 4, gap: 1.5 }}>
          <div style={{ height: 2, width: "60%", background: "currentColor" }} />
          <div style={{ flex: 1, background: accent, opacity: 0.18, borderRadius: 2, color: accent, display: "grid", placeItems: "center" }}>
            <svg width="80%" height="60%" viewBox="0 0 60 20"><path d="M2,16 C8,16 12,4 22,4 S38,16 58,10" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </div>
          <div style={{ display: "flex", gap: 1.5 }}>
            {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 5, background: "currentColor", opacity: 0.3 }}/>)}
          </div>
        </div>);
      case "feedPost":
        return (<div style={{ ...common, display: "grid", placeItems: "center" }}>
          <div style={{ width: "85%", padding: 3, background: "currentColor", opacity: 0.15, borderRadius: 3 }}>
            <div style={{ width: "100%", height: 14, background: accent, opacity: 0.5, borderRadius: 2 }} />
          </div>
        </div>);
      case "groupTeaser":
        return (<div style={{ ...common, padding: 4, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: accent }}/>
            <div style={{ flex: 1, height: 3, background: "currentColor", opacity: 0.5 }}/>
          </div>)}
        </div>);
      case "drinkdex":
        return (<div style={{ ...common, flexDirection: "column", padding: 4, gap: 3, justifyContent: "center" }}>
          <div style={{ color: accent, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>70<span style={{ opacity: 0.6, fontSize: 9 }}>/284</span></div>
          <div style={{ height: 3, background: "currentColor", opacity: 0.15, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: "25%", height: "100%", background: accent }}/>
          </div>
        </div>);
      case "offlineBadge":
        return (<div style={{ ...common, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 8c3-3 6-4 10-4s7 1 10 4" stroke="currentColor" strokeWidth="2" opacity="0.5"/><line x1="3" y1="3" x2="21" y2="21" stroke={accent} strokeWidth="2"/></svg>
          <div style={{ height: 2, width: 30, background: "currentColor" }} />
        </div>);
      default:
        return <div style={common}></div>;
    }
  }

  // ============ The toggle component ============
  function Toggle({ on, onClick }) {
    return <button className={`tog ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on}></button>;
  }

  // ============ Floating geometry backdrop ============
  function makeRng(seed) {
    let t = seed % 2147483647;
    if (t <= 0) t += 2147483646;
    return () => (t = (t * 16807) % 2147483647) / 2147483647;
  }

  function FloatingGeometry({ density, palette, aspect, animate, opacityMul, blurMul, seed }) {
    const count = Math.max(0, Math.round(density));
    const shapes = useMemo(() => {
      if (count === 0) return [];
      const bakedSeed = (palette.id.length * 97 + aspect.id.length * 193 + count * 13 + seed * 101) % 2147483647;
      const rand = makeRng(bakedSeed);
      const colors = [palette.accent, palette.fg, palette.bg];
      const kinds = ["orb", "pill", "diamond"];
      return Array.from({ length: count }, (_, i) => {
        const size = 120 + rand() * 220;
        const x = 6 + rand() * 88;
        const y = 6 + rand() * 88;
        const kind = kinds[Math.floor(rand() * kinds.length)];
        const color = colors[Math.floor(rand() * colors.length)];
        const h = kind === "pill" ? size * 0.55 : size;
          return {
          id: `${palette.id}-${aspect.id}-${i}`,
          x,
          y,
          size,
          h,
          kind,
          color,
            opacity: opacityMul,
            blur: (2 + rand() * 10) * blurMul,
          rotate: Math.round(rand() * 360),
          delay: (rand() * -4).toFixed(2),
          duration: (10 + rand() * 12).toFixed(2),
        };
      });
      }, [count, palette.id, palette.accent, palette.fg, palette.bg, aspect.id, opacityMul, blurMul, seed]);

    if (!animate || count === 0) return null;

    return (
      <div className="geom-layer" aria-hidden="true">
        {shapes.map((s) => (
          <div
            key={s.id}
            className={`geom ${s.kind}`}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.h}px`,
              background: s.color,
              opacity: s.opacity,
              filter: `blur(${s.blur}px)`,
              "--geom-rot": `${s.rotate}deg`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>
    );
  }

  // ============ Right panel for the current template ============
  function ControlsPanel({ tpl, settings, onChange, aspect, setAspect, palette, setPalette, animate, setAnimate, animSeconds, setAnimSeconds, floatDensity, setFloatDensity, floatOpacity, setFloatOpacity, floatBlur, setFloatBlur, randomizeGeometry, exportScale, setExportScale, videoScale, setVideoScale, exportPng, exporting }) {
    if (!tpl) return null;

    function patch(field, value) {
      onChange({ ...settings, [field]: value });
    }

    const showLineOptions = [
      "fullBleed",
      "phoneFrame",
      "splitText",
      "splitTextR",
      "sideBySide",
      "bigStat",
      "quote",
      "socialProof",
      "beforeAfter",
      "soberBy",
      "minimalBadge",
      "graphCallout",
      "nightRecap",
      "shareCard",
      "feedPost",
    ].includes(tpl.id);

    // Determine which fields to show based on template id
    const fields = (() => {
      switch (tpl.id) {
        case "fullBleed": return [["headline","Headline","textarea"],["sub","Subtext","textarea"]];
        case "phoneFrame": return [["headline","Headline","textarea"],["sub","Subtext","text"]];
        case "splitText": case "splitTextR": return [["badge","Badge","text"],["headline","Headline","textarea"],["sub","Subtext","textarea"]];
        case "sideBySide": return [["headline","Headline","textarea"],["sub","Subtext","text"]];
        case "stack": return [["headline","Headline","textarea"],["sub","Subtext","text"]];
        case "bigStat": return [["badge","Top label","text"],["headline","Big stat","text"],["sub","Below","textarea"]];
        case "quote": return [["headline","Quote","textarea"],["sub","Attribution","text"]];
        case "comparison": return [["headline","Headline","textarea"],["sub","Subtext","text"]];
        case "socialProof": return [["headline","Review text","textarea"],["sub","Attribution","text"],["badge","Footer note","text"]];
        case "beforeAfter": return [
          ["headline","Headline","textarea"], ["sub","Subtext","text"],
          ["leftLabel","Left label","text"], ["leftText","Left text","textarea"],
          ["rightLabel","Right label","text"], ["rightText","Right text","textarea"],
        ];
        case "soberBy": return [["badge","Top label","text"],["headline","Big number","text"],["sub","Subtext","textarea"]];
        case "minimalBadge": return [["headline","App name","text"],["sub","Tagline","textarea"]];
        case "featureHi": return [["badge","Badge","text"],["headline","Headline","textarea"],["sub","Subtext","textarea"]];
        case "showcase": return [["headline","Caption","textarea"]];
        case "catalog": return [["headline","Big number","text"],["sub","Subtext","textarea"]];
        case "graphCallout": return [["badge","Badge","text"],["headline","Headline","textarea"],["sub","Subtext","textarea"]];
        case "shareCard": return [["headline","Headline","textarea"],["sub","Subtext","textarea"]];
        case "nightRecap": return [
          ["headline","Venue","text"], ["date","Date","text"],
          ["peak","Peak BAC","text"], ["drinks","Drinks","text"], ["duration","Duration","text"],
          ["sub","Footer note","text"],
        ];
        case "feedPost": return [["headline","Headline","textarea"],["sub","Subtext","textarea"]];
        case "groupTeaser": return [["headline","Headline","textarea"],["sub","Subtext","textarea"]];
        case "drinkdex": return [["headline","Headline","textarea"],["tried","Tried","text"],["total","Total","text"],["sub","Subtext","textarea"]];
        case "offlineBadge": return [["headline","Headline","textarea"],["sub","Subtext","textarea"]];
        default: return [["headline","Headline","textarea"],["sub","Subtext","textarea"]];
      }
    })();

    return (
      <div className="sidebar-r">
        <div className="panel-group">
          <h3>Canvas</h3>
          <div className="field">
            <label>Aspect ratio</label>
            <div className="seg" style={{ width: "100%" }}>
              {ASPECTS.map(a => (
                <button key={a.id} className={aspect.id === a.id ? "on" : ""} onClick={() => setAspect(a)} style={{ flex: 1 }}>{a.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-group">
          <h3>Palette</h3>
          <div className="palette-row">
            {PALETTES.map(p => (
              <button key={p.id}
                className={`pal-swatch ${palette.id === p.id ? "on" : ""}`}
                style={{ background: p.bg }}
                onClick={() => setPalette(p)}
                title={p.name}>
                <div className="pal-top" style={{ background: p.bg }} />
                <div className="pal-bot">
                  <span style={{ background: p.fg }} />
                  <span style={{ background: p.accent }} />
                </div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "var(--muted-fg)", textAlign: "center", letterSpacing: "0.02em" }}>
            {palette.name}
          </div>
        </div>

        <div className="panel-group">
          <h3>Animation</h3>
          <div className="toggle-row">
            <div>
              <div className="label">Animate the line</div>
              <div className="desc">Line draws, text floats. Screen-record for video.</div>
            </div>
            <Toggle on={animate} onClick={() => setAnimate(!animate)} />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Animation length (seconds)</label>
            <input
              type="number"
              min="2"
              max="30"
              step="0.5"
              value={animSeconds}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setAnimSeconds(Math.min(30, Math.max(2, n)));
              }}
            />
          </div>
          {showLineOptions && (
            <div className="toggle-row" style={{ marginTop: 8 }}>
              <div>
                <div className="label">Vertical markers</div>
                <div className="desc">Toggle the vertical tick lines on the graph.</div>
              </div>
              <Toggle on={settings.graphMarkers !== false} onClick={() => patch("graphMarkers", settings.graphMarkers === false)} />
            </div>
          )}
        </div>

        {showLineOptions && (
          <div className="panel-group">
            <h3>Graph</h3>
            <div className="field slider-row">
              <label>Transparency {settings.graphOpacity ?? 100}%</label>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.graphOpacity ?? 100}
                onChange={(e) => patch("graphOpacity", parseInt(e.target.value, 10))}
              />
            </div>
            <div className="field">
              <label>Line width</label>
              <input
                type="number"
                min="2"
                max="16"
                step="1"
                value={settings.graphStrokeWidth ?? 7}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  patch("graphStrokeWidth", Math.min(16, Math.max(2, Math.round(n))));
                }}
              />
            </div>
          </div>
        )}

        <div className="panel-group">
          <h3>Atmosphere</h3>
          <div className="field slider-row">
            <label>Objects {floatDensity}</label>
            <input
              type="range"
              min="0"
              max="50"
              value={floatDensity}
              onChange={(e) => setFloatDensity(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field slider-row">
            <label>Transparency {floatOpacity}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={floatOpacity}
              onChange={(e) => setFloatOpacity(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field slider-row">
            <label>Blur</label>
            <input
              type="range"
              min="0"
              max="100"
              value={floatBlur}
              onChange={(e) => setFloatBlur(parseInt(e.target.value, 10))}
            />
          </div>
          <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={randomizeGeometry}>
            Randomize geometry
          </button>
        </div>

        <div className="panel-group">
          <h3>Copy</h3>
          {fields.map(([key, label, type]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              {type === "textarea"
                ? <textarea value={settings[key] || ""} onChange={e => patch(key, e.target.value)} rows={2} />
                : <input type="text" value={settings[key] || ""} onChange={e => patch(key, e.target.value)} />}
            </div>
          ))}
        </div>

        {tpl.needs > 0 && (
          <div className="panel-group">
            <h3>Screenshots</h3>
            <div className="note">
              Drag image files directly onto the screenshot slots in the canvas. They persist locally.
            </div>
          </div>
        )}

        <div className="panel-group">
          <h3>Export</h3>
          <div className="field">
            <label>Export scale</label>
            <input
              type="number"
              min="1"
              max="4"
              step="1"
              value={exportScale}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setExportScale(Math.min(4, Math.max(1, Math.round(n))));
              }}
            />
          </div>
          <div className="field">
            <label>Video scale</label>
            <input
              type="number"
              min="1"
              max="3"
              step="1"
              value={videoScale}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setVideoScale(Math.min(3, Math.max(1, Math.round(n))));
              }}
            />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={exportPng} disabled={exporting}>
            {exporting ? "Rendering…" : "Download PNG"}
          </button>
          <div className="note" style={{ marginTop: 10 }}>
            <b>Video?</b> Turn animation on, then screen-record the canvas with QuickTime or your phone. Real video export needs encoding we can't do in-browser.
          </div>
        </div>
      </div>
    );
  }

  // ============ Left sidebar template gallery ============
  function TemplateGallery({ current, setCurrent, palette }) {
    const groups = useMemo(() => {
      const g = {};
      TEMPLATES.forEach(t => { (g[t.group] = g[t.group] || []).push(t); });
      return g;
    }, []);

    return (
      <div className="sidebar-l">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <h2>{group}</h2>
            <div className="tpl-grid">
              {items.map(t => (
                <button key={t.id}
                  className={`tpl-card ${current.id === t.id ? "on" : ""}`}
                  onClick={() => setCurrent(t)}>
                  <div className="thumb"><TplThumb tpl={t} palette={palette}/></div>
                  <div>
                    <div className="label">{t.name}</div>
                    {t.needs > 0 && (
                      <div className="needs">· {t.needs} screenshot{t.needs>1?"s":""}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ============ Top bar ============
  function TopBar({ aspect, setAspect, animate, setAnimate, exportPng, exportVideo, exporting, videoProgress }) {
    const videoLabel = videoProgress
      ? `${videoProgress.stage}… ${videoProgress.pct}%`
      : "Download MP4";
    return (
      <div className="topbar">
        <div className="brand">
          <div className="mark">I</div>
          <span>iDrinkALot</span>
          <span className="sub">Post Builder</span>
        </div>
        <div className="actions">
          <div className="seg">
            {ASPECTS.map(a => <button key={a.id} className={aspect.id === a.id ? "on" : ""} onClick={() => setAspect(a)}>{a.label}</button>)}
          </div>
          <button className={`btn ${animate ? "btn-primary" : ""}`} onClick={() => setAnimate(!animate)}>
            {animate ? "⏸ Pause" : "▶ Play"}
          </button>
          <button className="btn" onClick={exportPng} disabled={exporting}>
            {exporting && !videoProgress ? "Rendering…" : "Download PNG"}
          </button>
          <button className="btn btn-primary" onClick={exportVideo} disabled={exporting}>
            {videoLabel}
          </button>
        </div>
      </div>
    );
  }

  // ============ Scaled canvas wrapper ============
  function StageCanvas({ tpl, settings, setSettings, aspect, palette, animate, animSeconds, floatDensity, floatOpacity, floatBlur, floatSeed, canvasRef, stageRef, slotDimsCtxValue, exporting }) {
    const [scale, setScale] = useState(1);

    useEffect(() => {
      function resize() {
        const stage = stageRef.current;
        if (!stage) return;
        const padX = 48;
        const padY = 80; /* room for foot pill */
        const availW = stage.clientWidth - padX;
        const availH = stage.clientHeight - padY;
        if (availW <= 0 || availH <= 0) return;
        const sx = availW / aspect.w;
        const sy = availH / aspect.h;
        setScale(Math.min(sx, sy, 1));
      }
      resize();
      const ro = new ResizeObserver(resize);
      if (stageRef.current) ro.observe(stageRef.current);
      window.addEventListener("resize", resize);
      return () => { ro.disconnect(); window.removeEventListener("resize", resize); };
    }, [aspect, stageRef]);

    const editCtxValue = useMemo(() => ({
      getDeep: (p) => getDeepPath(settings, p),
      setDeep: (p, v) => setSettings(setDeepPath(settings, p, v)),
    }), [settings, setSettings]);

    const Comp = tpl.Component;
    // unique slot IDs scoped to this template
    const slotIds = useMemo(() => Array.from({ length: 3 }, (_, i) => `slot-${tpl.id}-${i}`), [tpl.id]);
    const contentScale = useMemo(() => {
      const ratio = aspect.h / aspect.w;
      if (ratio <= 1) return 1;
      return Math.min(1.5, 1 + (ratio - 1) * 0.5);
    }, [aspect]);
    const contentOffsetY = useMemo(() => {
      const scaled = aspect.w * contentScale;
      return Math.round((aspect.h - scaled) / 2);
    }, [aspect, contentScale]);

    return (
      <div className="canvas-wrap" data-ar={aspect.id}
        style={{
          transform: `translate(-50%, -50%) scale(${scale})`,
          background: palette.bg,
          width: aspect.w, height: aspect.h,
        }}>
        <div ref={canvasRef} className={`post ${palette.id} editable ${animate ? "animate" : ""} ${exporting ? "exporting" : ""}`}
          data-screen-label={tpl.name}
          style={{
            // override CSS vars per palette so they don't depend on the .post.X class names
            "--p-bg": palette.bg,
            "--p-fg": palette.fg,
            "--p-accent": palette.accent,
            "--p-muted": `color-mix(in srgb, ${palette.fg} 8%, transparent)`,
            "--p-card": `color-mix(in srgb, ${palette.fg} 4%, ${palette.bg})`,
            "--anim-mul": (animSeconds / 5.5).toFixed(3),
          }}>
          <div className="post-inner" style={{
            transform: `translateY(${contentOffsetY}px) scale(${contentScale})`,
            transformOrigin: "top center",
            width: aspect.w,
            height: aspect.w,
          }}>
            <EditCtx.Provider value={editCtxValue}>
              <SlotDimsCtx.Provider value={slotDimsCtxValue}>
                <Comp {...settings} slotId={slotIds[0]} slotIds={slotIds} />
              </SlotDimsCtx.Provider>
            </EditCtx.Provider>
          </div>
          <FloatingGeometry
            density={floatDensity}
            palette={palette}
            aspect={aspect}
            animate={animate}
            opacityMul={(100 - floatOpacity) / 100}
            blurMul={floatBlur / 100}
            seed={floatSeed}
          />
        </div>
      </div>
    );
  }

  // ============ Root app ============
  function App() {
    const initial = loadState();
    const [currentTpl, setCurrentTpl] = useState(() => {
      const id = initial.tplId;
      return TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
    });
    const [allSettings, setAllSettings] = useState(() => initial.settings || {});
    const [aspect, setAspect] = useState(() => ASPECTS.find(a => a.id === initial.aspectId) || ASPECTS[0]);
    const [palette, setPalette] = useState(() => PALETTES.find(p => p.id === initial.paletteId) || PALETTES[0]);
    const [animate, setAnimate] = useState(initial.animate ?? true);
    const [floatDensity, setFloatDensity] = useState(initial.floatDensity ?? 30);
    const [floatOpacity, setFloatOpacity] = useState(initial.floatOpacity ?? 70);
    const [floatBlur, setFloatBlur] = useState(initial.floatBlur ?? 60);
    const [floatSeed, setFloatSeed] = useState(initial.floatSeed ?? 1);
    const [animSeconds, setAnimSeconds] = useState(initial.animSeconds ?? 5.5);
    const [exportScale, setExportScale] = useState(initial.exportScale ?? 3);
    const [videoScale, setVideoScale] = useState(initial.videoScale ?? 2);
    const [exporting, setExporting] = useState(false);
    const [videoProgress, setVideoProgress] = useState(null);
    const [slotDims, setSlotDims] = useState({});
    const canvasRef = useRef(null);
    const stageRef = useRef(null);

    useEffect(() => {
      const handler = (e) => {
        const d = e.detail;
        if (!d || !d.id || !d.naturalW || !d.naturalH) return;
        setSlotDims(prev => {
          const cur = prev[d.id];
          if (cur && cur.w === d.naturalW && cur.h === d.naturalH) return prev;
          return { ...prev, [d.id]: { w: d.naturalW, h: d.naturalH } };
        });
      };
      document.addEventListener("slot-image-loaded", handler);
      return () => document.removeEventListener("slot-image-loaded", handler);
    }, []);

    const slotDimsCtxValue = useMemo(() => ({
      get: (id) => slotDims[id] || null,
    }), [slotDims]);

    // Per-template settings, falling back to template defaults
    const settings = useMemo(() => ({
      ...currentTpl.defaults,
      ...(allSettings[currentTpl.id] || {}),
    }), [currentTpl, allSettings]);

    const setSettings = useCallback((next) => {
      setAllSettings(prev => ({ ...prev, [currentTpl.id]: next }));
    }, [currentTpl.id]);

    // Persist
    useEffect(() => {
      saveState({
        tplId: currentTpl.id,
        aspectId: aspect.id,
        paletteId: palette.id,
        animate,
        floatDensity,
        floatOpacity,
        floatBlur,
        floatSeed,
        animSeconds,
        exportScale,
        videoScale,
        settings: allSettings,
      });
    }, [currentTpl, aspect, palette, animate, floatDensity, floatOpacity, floatBlur, floatSeed, animSeconds, exportScale, videoScale, allSettings]);

    const randomizeGeometry = useCallback(() => {
      setFloatSeed((s) => (s + 1) % 2147483647);
    }, []);

    const exportPng = useCallback(async () => {
      if (!canvasRef.current) return;
      setExporting(true);
      try {
        // Wait a frame so any pending state lands
        await new Promise(r => requestAnimationFrame(() => r()));
        const dataUrl = await withSlotMirrors(canvasRef.current, () =>
          window.htmlToImage.toPng(canvasRef.current, {
            pixelRatio: exportScale,
            backgroundColor: palette.bg,
            cacheBust: true,
          })
        );
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `idrinkalot-${currentTpl.id}-${aspect.id.replace(":","x")}.png`;
        a.click();
      } catch (e) {
        console.error(e);
        alert("Export failed. Check console.");
      } finally {
        setExporting(false);
      }
    }, [currentTpl, aspect, palette, exportScale]);

    const exportVideo = useCallback(async () => {
      if (!canvasRef.current) return;
      const fps = 30;
      const videoScalePx = 1;
      const durationSec = Math.max(2, Number(animSeconds) || 5.5);
      const frameCount = Math.max(1, Math.round(fps * durationSec));
      const frameDurationMs = 1000 / fps;

      setExporting(true);
      setVideoProgress({ stage: "Loading encoder", pct: 0 });
      let ffmpeg;
      const writtenFrames = [];

      try {
        // Lazy-load ffmpeg.wasm UMD bundle + single-threaded core (no SAB/COOP/COEP needed)
        console.log("[export] loading ffmpeg scripts");
        await loadScript("https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js");
        console.log("[export] loaded @ffmpeg/util");
        await loadScript("https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
        console.log("[export] loaded @ffmpeg/ffmpeg");

        const FFmpegCtor = (window.FFmpegWASM && window.FFmpegWASM.FFmpeg) || (window.FFmpeg && window.FFmpeg.FFmpeg);
        if (!FFmpegCtor) throw new Error("FFmpeg constructor not found on window");
        const toBlobURL = (window.FFmpegUtil && window.FFmpegUtil.toBlobURL) || (async (url, type) => {
          const r = await fetch(url);
          return URL.createObjectURL(new Blob([await r.arrayBuffer()], { type }));
        });
        ffmpeg = new FFmpegCtor();
        ffmpeg.on("log", (e) => console.log("[ffmpeg log]", e));
        ffmpeg.on("progress", (e) => console.log("[ffmpeg progress]", e));
        // Web Workers can only spawn from same-origin or blob URLs. We still
        // feed core/wasm via blob URLs to avoid cross-origin issues. We also
        // swap the UMD worker script with a same-origin blob.
        const coreBase = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        const workerScriptUrl = "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js";
        console.log("[export] fetching ffmpeg core/wasm + worker blob");
        const fetchBlob = async (url, type, label) => {
          const r = await fetch(url);
          console.log(`[export] fetch ${label}`, { url, ok: r.ok, status: r.status });
          const buf = await r.arrayBuffer();
          console.log(`[export] fetch ${label} bytes`, buf.byteLength);
          return URL.createObjectURL(new Blob([buf], { type }));
        };
        const [coreURL, wasmURL, workerBlobURL] = await Promise.all([
          fetchBlob(`${coreBase}/ffmpeg-core.js`, "text/javascript", "core.js"),
          fetchBlob(`${coreBase}/ffmpeg-core.wasm`, "application/wasm", "core.wasm"),
          fetchBlob(workerScriptUrl, "text/javascript", "worker.js"),
        ]);
        console.log("[export] loading ffmpeg core", { coreURL, wasmURL, workerBlobURL });
        const OriginalWorker = window.Worker;
        window.Worker = function WorkerWrapper(url, opts) {
          const urlStr = String(url);
          const finalUrl = urlStr.includes("/814.ffmpeg.js") ? workerBlobURL : url;
          console.log("[export] Worker created", { url: urlStr, finalUrl: String(finalUrl), opts });
          const w = new OriginalWorker(finalUrl, opts);
          w.addEventListener("error", (e) => {
            console.error("[export] Worker error", {
              message: e.message,
              filename: e.filename,
              lineno: e.lineno,
              colno: e.colno,
              error: e.error,
            });
          });
          w.addEventListener("messageerror", (e) => console.error("[export] Worker message error", e));
          return w;
        };
        const loadTimeoutMs = 20000;
        try {
          await Promise.race([
            ffmpeg.load({ coreURL, wasmURL }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("ffmpeg.load() timed out")), loadTimeoutMs)),
          ]);
        } finally {
          window.Worker = OriginalWorker;
        }
        console.log("[export] ffmpeg loaded");

        // Freeze all CSS animations so we can step them frame-by-frame.
        const anims = canvasRef.current.getAnimations({ subtree: true });
        anims.forEach(a => a.pause());

        // BAC line dashoffset can't ride CSS vars through html-to-image's
        // SVG serialization reliably (both stroke-dasharray and -dashoffset
        // read var(--len) from a stylesheet rule). Resolve the per-path
        // length up front and write both directly as inline styles per frame.
        const drawPaths = Array.from(canvasRef.current.querySelectorAll(".bac-svg .draw-path"));
        const drawPathLens = drawPaths.map(p => {
          const v = parseFloat(getComputedStyle(p).getPropertyValue("--len"));
          return Number.isFinite(v) ? v : 4000;
        });
        drawPaths.forEach((p, idx) => {
          p.style.strokeDasharray = `${drawPathLens[idx]}px`;
        });

        try {
          // Swap image-slots for light-DOM mirrors once for the whole capture;
          // their state doesn't change between frames so no need to redo per-frame.
          await withSlotMirrors(canvasRef.current, async () => {
            for (let i = 0; i < frameCount; i++) {
              const t_ms = i * frameDurationMs;
              const exportProgress = Math.min(1, t_ms / (durationSec * 1000));
              canvasRef.current.style.setProperty("--export-line-progress", exportProgress.toFixed(4));
              drawPaths.forEach((p, idx) => {
                p.style.strokeDashoffset = `${drawPathLens[idx] * (1 - exportProgress)}px`;
              });
              anims.forEach(a => { try { a.currentTime = t_ms; } catch {} });
              // Let layout/paint settle for the new animation state.
              await new Promise(r => requestAnimationFrame(() => setTimeout(r, 16)));

              const dataUrl = await window.htmlToImage.toPng(canvasRef.current, {
                pixelRatio: videoScalePx,
                backgroundColor: palette.bg,
                cacheBust: false,
              });
              const buf = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
              const name = `f${String(i).padStart(4, "0")}.png`;
              await ffmpeg.writeFile(name, buf);
              writtenFrames.push(name);
              setVideoProgress({ stage: "Capturing", pct: Math.round(((i + 1) / frameCount) * 80) });
            }
          });
        } finally {
          if (canvasRef.current) {
            canvasRef.current.style.removeProperty("--export-line-progress");
          }
          drawPaths.forEach(p => {
            p.style.removeProperty("stroke-dashoffset");
            p.style.removeProperty("stroke-dasharray");
          });
          anims.forEach(a => { try { a.play(); } catch {} });
        }

        setVideoProgress({ stage: "Encoding MP4", pct: 85 });
        await ffmpeg.exec([
          "-framerate", String(fps),
          "-i", "f%04d.png",
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-crf", "22",
          "-preset", "ultrafast",
          "-threads", "1",
          "-color_primaries", "bt709",
          "-color_trc", "bt709",
          "-colorspace", "bt709",
          "-movflags", "+faststart",
          "out.mp4",
        ]);

        setVideoProgress({ stage: "Downloading", pct: 98 });
        const data = await ffmpeg.readFile("out.mp4");
        const blob = new Blob([data.buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `idrinkalot-${currentTpl.id}-${aspect.id.replace(":", "x")}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error(e);
        alert("Video export failed. Check console.");
      } finally {
        if (ffmpeg) {
          for (const name of writtenFrames) {
            try { await ffmpeg.deleteFile(name); } catch {}
          }
          try { await ffmpeg.deleteFile("out.mp4"); } catch {}
          try { ffmpeg.terminate(); } catch {}
        }
        setExporting(false);
        setVideoProgress(null);
      }
    }, [currentTpl, aspect, palette, animSeconds, exportScale, videoScale]);

    return (
      <div className="app">
        <TopBar aspect={aspect} setAspect={setAspect} animate={animate} setAnimate={setAnimate} exportPng={exportPng} exportVideo={exportVideo} exporting={exporting} videoProgress={videoProgress} />
        <TemplateGallery current={currentTpl} setCurrent={setCurrentTpl} palette={palette} />
        <div className="stage" ref={stageRef}>
          <StageCanvas
            tpl={currentTpl}
            settings={settings}
            setSettings={setSettings}
            aspect={aspect}
            palette={palette}
            animate={animate}
            animSeconds={animSeconds}
            floatDensity={floatDensity}
            floatOpacity={floatOpacity}
            floatBlur={floatBlur}
            floatSeed={floatSeed}
            canvasRef={canvasRef}
            stageRef={stageRef}
            slotDimsCtxValue={slotDimsCtxValue}
            exporting={exporting}
          />
          <div className="stage-foot">
            {currentTpl.name} · {aspect.label} · {palette.name}
          </div>
        </div>
        <ControlsPanel
          tpl={currentTpl}
          settings={settings}
          onChange={setSettings}
          aspect={aspect} setAspect={setAspect}
          palette={palette} setPalette={setPalette}
          animate={animate} setAnimate={setAnimate}
          animSeconds={animSeconds} setAnimSeconds={setAnimSeconds}
          floatDensity={floatDensity} setFloatDensity={setFloatDensity}
          floatOpacity={floatOpacity} setFloatOpacity={setFloatOpacity}
          floatBlur={floatBlur} setFloatBlur={setFloatBlur}
          randomizeGeometry={randomizeGeometry}
          exportScale={exportScale} setExportScale={setExportScale}
          videoScale={videoScale} setVideoScale={setVideoScale}
          exportPng={exportPng} exporting={exporting}
        />
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
