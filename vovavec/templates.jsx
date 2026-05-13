/* ==================== Templates ====================
   Every text element is wrapped in <E p="key" def="..." /> so it's
   click-to-edit directly on the canvas.
   Templates also use <BacLine /> as the signature animated curve.
   ====================================================== */
(function () {
  const { useMemo } = React;
  const BacLine = window.BacLine;

  // ---------- Inline edit ----------
  function E({ p, def, as: Tag = "span", style, className, multiline }) {
    const ctx = React.useContext(window.EditCtx);
    const ref = React.useRef(null);
    const raw = ctx.getDeep(p);
    const value = (raw == null ? (def ?? "") : raw) + "";

    React.useEffect(() => {
      const el = ref.current;
      if (el && document.activeElement !== el && el.textContent !== value) {
        el.textContent = value;
      }
    }, [value]);

    return (
      <Tag
        ref={ref}
        className={`edit ${className || ""}`}
        style={style}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onFocus={(e) => {
          // Select all on first focus so users can just type to replace
          const range = document.createRange();
          range.selectNodeContents(e.currentTarget);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }}
        onBlur={(e) => ctx.setDeep(p, e.currentTarget.textContent)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !multiline && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.currentTarget.textContent = value;
            e.currentTarget.blur();
          }
        }}
      />
    );
  }
  window.E = E;

  // ---------- helpers ----------
  function Slot({ id, label, shape, radius, style, className }) {
    return React.createElement("image-slot", {
      id, placeholder: label || "screenshot",
      shape: shape || "rounded",
      radius: radius || 24,
      style,
      class: className,
    });
  }

  // Read natural image dimensions for a slot (or null until an image is loaded).
  function useSlotDims(slotId) {
    const ctx = React.useContext(window.SlotDimsCtx);
    return ctx && ctx.get ? ctx.get(slotId) : null;
  }

  function PhoneMock({ slotId, slotLabel, scale = 1, tone = "dark" }) {
    const baseW = 540 * scale, baseH = 1100 * scale;
    const dims = useSlotDims(slotId);
    let w = baseW, h = baseH;
    if (dims && dims.w && dims.h) {
      // Preserve the bezel's original visual area while taking on the uploaded
      // image's aspect ratio: w*h = baseArea; w/h = imgAR.
      const ar = dims.w / dims.h;
      const area = baseW * baseH;
      w = Math.sqrt(area * ar);
      h = Math.sqrt(area / ar);
    }
    const bezel = tone === "dark" ? "#0a0e1c" : "#fff";
    return (
      <div style={{
        position: "relative", width: w, height: h,
        background: bezel,
        borderRadius: 70 * scale,
        padding: 14 * scale,
        boxShadow: `0 ${40*scale}px ${80*scale}px -${20*scale}px rgba(0,0,0,0.5), 0 0 0 ${2*scale}px rgba(255,255,255,0.04)`,
      }}>
        <div style={{
          width: "100%", height: "100%",
          borderRadius: 56 * scale,
          overflow: "hidden",
          background: "var(--p-card)",
          position: "relative",
        }}>
          <Slot id={slotId} label={slotLabel} shape="rect" style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    );
  }

  function AppIcon({ size = 96 }) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.22,
        background: "var(--p-fg)", color: "var(--p-accent)",
        display: "grid", placeItems: "center",
        fontWeight: 900, fontSize: size * 0.5,
        letterSpacing: "-0.04em",
        boxShadow: `0 ${size*0.06}px ${size*0.12}px -${size*0.04}px rgba(0,0,0,0.3)`,
      }}>I</div>
    );
  }

  function LivePill({ pKey = "badge", def = "LIVE", color = "var(--p-accent)" }) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 12,
        background: "rgba(0,0,0,0.06)", padding: "10px 18px", borderRadius: 99,
        fontSize: 22, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
      }}>
        <span className="pulse-dot" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <E p={pKey} def={def} />
      </div>
    );
  }

  // ============================================================
  // 1. FULL BLEED — big line draws across, headline floats hard
  // ============================================================
  function FullBleed({ slotId, graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 7;
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", background: "#000" }}>
        <Slot id={slotId} label="drag in full app screenshot" shape="rect" style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 25%, transparent 50%)" }} />
        {/* Hero line ribbon */}
        <div style={{ position: "absolute", top: 60, left: 40, right: 40, height: 180, color: "var(--p-accent)", opacity: lineOpacity }} className="drift">
          <BacLine width={1000} height={180} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} id="fb-line" />
        </div>
        <div style={{ position: "absolute", left: 60, right: 60, bottom: 80, color: "#fff", fontWeight: 900 }}>
          <E p="badge" def="LIVE BAC" as="div" className="float-big"
             style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase",
                      color: "var(--p-accent)", marginBottom: 20 }} />
          <E p="headline" def="Track the night." as="div" className="float-big"
             style={{ fontSize: 130, lineHeight: 0.92, letterSpacing: "-0.03em", textWrap: "balance" }} multiline />
          <E p="sub" def="Not the morning after." as="div" className="float"
             style={{ marginTop: 24, fontSize: 36, fontWeight: 700, color: "rgba(255,255,255,0.85)", maxWidth: 800, textWrap: "pretty" }} multiline />
        </div>
      </div>
    );
  }

  // ============================================================
  // 2. PHONE FRAME
  // ============================================================
  function PhoneFrameTpl({ slotId, graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 5;
    return (
      <div style={{
        width: "100%", height: "100%", position: "relative", background: "transparent",
        display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 60px 60px",
      }}>
        <div style={{ textAlign: "center", maxWidth: 900 }}>
          <E p="headline" def="One screen, the whole night." as="div" className="float-big"
             style={{ fontSize: 86, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.0, textWrap: "balance" }} multiline />
          <E p="sub" def="Units, BAC, sober-by — all live." as="div" className="float"
             style={{ marginTop: 18, fontSize: 28, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)", textWrap: "pretty" }} multiline />
        </div>
        <div className="drift" style={{ marginTop: 40, flex: 1, display: "grid", placeItems: "center" }}>
          <PhoneMock slotId={slotId} slotLabel="drag in app screenshot" scale={0.78} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 240, color: "var(--p-accent)", opacity: lineOpacity }}>
          <BacLine width={1080} height={240} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} id="phone-line" />
        </div>
      </div>
    );
  }

  // ============================================================
  // 3. SPLIT TEXT + SHOT
  // ============================================================
  function SplitTextShot({ slotId, reverse, graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 6;
    const textSide = (
      <div style={{
        flex: 1, padding: "80px 60px",
        display: "flex", flexDirection: "column", justifyContent: "center", gap: 28,
      }}>
        <E p="badge" def="New" as="div" className="wobble"
           style={{
             alignSelf: "flex-start",
             background: "color-mix(in srgb, var(--p-accent) 15%, transparent)",
             color: "var(--p-accent)",
             padding: "10px 18px", borderRadius: 99,
             fontSize: 20, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
           }} />
        <E p="headline" def="Live BAC." as="div" className="float-big"
           style={{ fontSize: 96, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 0.96, textWrap: "balance" }} multiline />
        <E p="sub" def="Widmark formula + your body stats. Updated every second." as="div" className="float"
           style={{ fontSize: 28, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)", textWrap: "pretty", maxWidth: 480 }} multiline />
        <div className="drift" style={{ marginTop: 12, height: 120, color: "var(--p-accent)", maxWidth: 460, opacity: lineOpacity }}>
          <BacLine width={500} height={120} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} id="split-line" />
        </div>
      </div>
    );
    const shotSide = (
      <div style={{
        flex: 1, position: "relative", background: "var(--p-muted)",
        display: "grid", placeItems: "center", overflow: "hidden",
      }}>
        <div style={{ transform: "scale(0.92)" }}>
          <div className="drift">
            <PhoneMock slotId={slotId} slotLabel="screenshot" scale={0.75} />
          </div>
        </div>
      </div>
    );
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent",
        display: "flex", flexDirection: reverse ? "row-reverse" : "row",
      }}>
        {textSide}
        {shotSide}
      </div>
    );
  }

  // ============================================================
  // 4. SIDE-BY-SIDE
  // ============================================================
  function SideBySide({ slotIds, graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 4;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent",
        display: "flex", flexDirection: "column",
        padding: "80px 60px 60px", gap: 50, position: "relative",
      }}>
        <div className="drift" style={{ flex: 1, display: "flex", gap: 30, alignItems: "center", justifyContent: "center" }}>
          <PhoneMock slotId={slotIds[0]} slotLabel="screenshot A" scale={0.62} />
          <PhoneMock slotId={slotIds[1]} slotLabel="screenshot B" scale={0.62} />
        </div>
        <div style={{ textAlign: "center" }}>
          <E p="headline" def="Before & after." as="div" className="float-big"
             style={{ fontSize: 80, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1, textWrap: "balance" }} multiline />
          <E p="sub" def="Same night. Different story." as="div" className="float"
             style={{ marginTop: 14, fontSize: 28, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)" }} multiline />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 80, color: "var(--p-accent)", opacity: lineOpacity }}>
          <BacLine width={1080} height={80} strokeWidth={lineWidth} showMarkers={graphMarkers === true} id="sbs-line" />
        </div>
      </div>
    );
  }

  // ============================================================
  // 5. STACK
  // ============================================================
  function Stack({ slotIds }) {
    const angles = [-10, 0, 12];
    const offsets = [-180, 0, 180];
    const ys = [60, 0, 40];
    const phones = slotIds.slice(0, 3);
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent",
        position: "relative", padding: "100px 60px 60px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div className="float-big" style={{ textAlign: "center", maxWidth: 900 }}>
          <E p="headline" def="Everything in one app." as="div"
             style={{ fontSize: 92, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 0.98, textWrap: "balance" }} multiline />
          <E p="sub" def="Log, track, share." as="div" className="float"
             style={{ marginTop: 16, fontSize: 28, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)" }} multiline />
        </div>
        <div style={{ flex: 1, position: "relative", width: "100%", display: "grid", placeItems: "center", marginTop: 30 }}>
          <div style={{ position: "relative", width: 700, height: 700 }}>
            {phones.map((id, i) => (
              <div key={i} style={{
                position: "absolute", left: "50%", top: "50%",
                transform: `translate(calc(-50% + ${offsets[i]}px), calc(-50% + ${ys[i]}px)) rotate(${angles[i]}deg)`,
                zIndex: i === 1 ? 2 : 1,
              }}>
                <div className="drift" style={{ animationDelay: `${i * 0.5}s` }}>
                  <PhoneMock slotId={id} slotLabel={`screen ${i+1}`} scale={0.55} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 6. BIG STAT — shimmer + huge floaty number
  // ============================================================
  function BigStat({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 7;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 60,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: lineOpacity, color: "var(--p-accent)" }} className="sweep">
          <BacLine width={1080} height={1080} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} id="bs-line"
                   topPad={300} bottomPad={300} />
        </div>
        <div style={{ position: "relative", textAlign: "center" }}>
          <E p="badge" def="Drinks in the catalog" as="div" className="wobble"
             style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase",
                      color: "color-mix(in srgb, var(--p-fg) 60%, transparent)", marginBottom: 30 }} />
          <E p="headline" def="284" as="div" className="float-big shimmer text-glow"
             style={{ fontSize: 420, fontWeight: 900, lineHeight: 0.85, letterSpacing: "-0.05em",
                      color: "var(--p-accent)" }} />
          <E p="sub" def="And counting." as="div" className="float"
             style={{ marginTop: 32, fontSize: 48, fontWeight: 800, letterSpacing: "-0.01em", textWrap: "balance", maxWidth: 800, marginInline: "auto" }} multiline />
        </div>
      </div>
    );
  }

  // ============================================================
  // 7. QUOTE CARD
  // ============================================================
  function Quote({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 5;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        display: "flex", flexDirection: "column", justifyContent: "center", padding: "100px 90px",
        position: "relative",
      }}>
        <div className="wobble" style={{
          position: "absolute", top: 70, left: 90,
          fontSize: 320, lineHeight: 0.65, fontWeight: 900,
          color: "var(--p-accent)", opacity: 0.85,
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>"</div>
        <E p="headline" def="Track the night, not the morning after." as="div" className="float-big"
           style={{
             fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em",
             textWrap: "balance", marginTop: 80,
           }} multiline />
        <E p="sub" def="iDrinkALot" as="div" className="float"
           style={{ marginTop: 36, fontSize: 32, fontWeight: 700, color: "color-mix(in srgb, var(--p-fg) 60%, transparent)" }}
           transform={(v) => `— ${v}`} />
        <div style={{ position: "absolute", left: 90, right: 90, bottom: 90, height: 100, color: "var(--p-accent)", opacity: lineOpacity }}>
          <BacLine width={900} height={100} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} id="q-line" />
        </div>
      </div>
    );
  }

  // ============================================================
  // 8. COMPARISON GRID
  // ============================================================
  function Comparison({ rows, cols }) {
    const C = cols || [
      { name: "Guessing", rows: [false, false, false, false] },
      { name: "Other apps", rows: [true, false, true, false] },
      { name: "iDrinkALot", rows: [true, true, true, true] },
    ];
    const R = rows || ["Live BAC", "Group sessions", "Offline", "300+ drinks"];
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        padding: "80px 60px 60px",
        display: "flex", flexDirection: "column", gap: 40,
      }}>
        <div className="float-big">
          <E p="headline" def="Not all trackers are equal." as="div"
             style={{ fontSize: 74, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1, textWrap: "balance" }} multiline />
          <E p="sub" def="Pick the one that doesn't moralize." as="div" className="float"
             style={{ marginTop: 14, fontSize: 26, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 60%, transparent)" }} multiline />
        </div>
        <div style={{
          flex: 1,
          background: "var(--p-card)", border: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)",
          borderRadius: 24, padding: 30,
          display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
          gridTemplateRows: "auto repeat(4, 1fr)", alignItems: "center",
        }}>
          <div />
          {C.map((c, i) => (
            <E key={i} p={`cols.${i}.name`} def={c.name} as="div"
              style={{
                textAlign: "center", fontSize: 28, fontWeight: 800,
                padding: "16px 8px",
                color: i === C.length - 1 ? "var(--p-accent)" : "var(--p-fg)",
                borderBottom: "2px solid color-mix(in srgb, var(--p-fg) 12%, transparent)",
              }} />
          ))}
          {R.map((rowLabel, r) => (
            <React.Fragment key={r}>
              <E p={`rows.${r}`} def={rowLabel} as="div"
                 style={{ fontSize: 28, fontWeight: 700, padding: "0 12px" }} />
              {C.map((c, ci) => (
                <div key={ci} style={{ display: "grid", placeItems: "center", fontSize: 60, fontWeight: 900 }}>
                  {c.rows[r] ? (
                    <span style={{ color: "var(--p-accent)" }}>✓</span>
                  ) : (
                    <span style={{ color: "color-mix(in srgb, var(--p-fg) 30%, transparent)" }}>×</span>
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // 9. SOCIAL PROOF
  // ============================================================
  function SocialProof({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 5;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: 80, position: "relative", textAlign: "center",
      }}>
        <div className="float-big" style={{ display: "flex", gap: 14, marginBottom: 40 }}>
          {[0,1,2,3,4].map(i => (
            <span key={i} style={{ fontSize: 90, color: "var(--p-accent)", animationDelay: `${i * 0.15}s` }}>★</span>
          ))}
        </div>
        <E p="headline" def="Finally a drink tracker that doesn't moralize." as="div" className="float-big"
           style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", textWrap: "balance", maxWidth: 900 }}
           transform={(v) => `"${v}"`} multiline />
        <E p="sub" def="Henrik, beta tester" as="div" className="float"
           style={{ marginTop: 40, fontSize: 30, fontWeight: 700, color: "color-mix(in srgb, var(--p-fg) 60%, transparent)" }}
           transform={(v) => `— ${v}`} />
        <E p="badge" def="5-star beta review" as="div" className="wobble"
           style={{
             marginTop: 30, fontSize: 18, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
             color: "var(--p-accent)",
           }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 200, color: "var(--p-accent)", opacity: lineOpacity }}>
          <BacLine width={1080} height={200} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} id="sp-line" />
        </div>
      </div>
    );
  }

  // ============================================================
  // 10. BEFORE / AFTER
  // ============================================================
  function BeforeAfter({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 7;
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "transparent" }}>
        <div style={{ padding: "60px 60px 30px", textAlign: "center" }}>
          <E p="headline" def="Guessing vs Knowing." as="div" className="float-big"
             style={{ fontSize: 68, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1, textWrap: "balance" }} multiline />
          <E p="sub" def="Same night. Different ending." as="div" className="float"
             style={{ marginTop: 14, fontSize: 24, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 60%, transparent)" }} multiline />
        </div>
        <div style={{ flex: 1, display: "flex" }}>
          <div style={{
            flex: 1, background: "color-mix(in srgb, var(--p-fg) 8%, var(--p-bg))",
            padding: 60, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30,
            position: "relative",
          }}>
            <E p="leftLabel" def="Without iDrinkALot" as="div"
               style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
                        color: "color-mix(in srgb, var(--p-fg) 50%, transparent)" }} />
            <E p="leftText" def="How drunk am I?" as="div" className="wobble"
               style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.0, opacity: 0.55, textWrap: "balance" }} multiline />
            <div className="pulse-dot" style={{ fontSize: 220, fontWeight: 900, color: "color-mix(in srgb, var(--p-fg) 25%, transparent)" }}>?</div>
          </div>
          <div style={{
            flex: 1, background: "var(--p-accent)", color: "var(--p-bg)",
            padding: 60, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30,
            position: "relative", overflow: "hidden",
          }}>
            <E p="rightLabel" def="With iDrinkALot" as="div"
               style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }} />
            <E p="rightText" def="0.78 ‰. Sober by 02:30." as="div" className="float-big"
               style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.0, textWrap: "balance" }} multiline />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 280, color: "var(--p-bg)", opacity: 0.75 * lineOpacity }}>
              <BacLine width={540} height={280} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} showFill={true} showPeak={true} id="ba-line" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 11. SOBER BY / COUNTDOWN
  // ============================================================
  function SoberBy({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 9;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: 60, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "55%", height: 430, color: "var(--p-accent)", opacity: lineOpacity }}>
          <BacLine width={1080} height={430} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} showFill={true}
                   showNow={true} showPeak={true} id="sb-line" />
        </div>
        <div style={{ position: "relative", textAlign: "center", marginBottom: 30 }}>
          <E p="badge" def="Sober by" as="div" className="wobble"
             style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase",
                      color: "color-mix(in srgb, var(--p-fg) 60%, transparent)", marginBottom: 26 }} />
          <E p="headline" def="02:30" as="div" className="float-big shimmer text-glow"
             style={{ fontSize: 320, fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.04em",
                      color: "var(--p-accent)" }} />
          <E p="sub" def="Live estimate from your BAC curve." as="div" className="float"
             style={{ marginTop: 24, fontSize: 36, fontWeight: 700, maxWidth: 900, marginInline: "auto", textWrap: "balance" }} multiline />
        </div>
      </div>
    );
  }

  // ============================================================
  // 12. MINIMAL BADGE
  // ============================================================
  function MinimalBadge({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 5;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: 60, gap: 50, position: "relative",
      }}>
        <div className="drift"><AppIcon size={220} /></div>
        <div style={{ textAlign: "center" }}>
          <E p="headline" def="iDrinkALot" as="div" className="float-big"
             style={{ fontSize: 110, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1 }} />
          <E p="sub" def="Drink tracker for nights out." as="div" className="float"
             style={{ marginTop: 26, fontSize: 36, fontWeight: 700, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)", maxWidth: 800, textWrap: "balance" }} multiline />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 200, color: "var(--p-accent)", opacity: lineOpacity }}>
          <BacLine width={1080} height={200} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} id="mb-line" />
        </div>
      </div>
    );
  }

  // ============================================================
  // 13. FEATURE HIGHLIGHT
  // ============================================================
  function FeatureHighlight({ slotId }) {
    const dims = useSlotDims(slotId);
    const wrapperStyle = dims && dims.w && dims.h
      ? { flex: "none", width: "100%", aspectRatio: `${dims.w} / ${dims.h}`, position: "relative", borderRadius: 28, overflow: "hidden", background: "var(--p-muted)", border: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)" }
      : { flex: 1, position: "relative", borderRadius: 28, overflow: "hidden", background: "var(--p-muted)", border: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)" };
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        padding: "60px", display: "flex", flexDirection: "column", gap: 30,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }} className="wobble">
          <E p="badge" def="New" as="div"
             style={{
               background: "color-mix(in srgb, var(--p-accent) 18%, transparent)", color: "var(--p-accent)",
               padding: "10px 18px", borderRadius: 99,
               fontSize: 22, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
             }} />
          <E p="version" def="iDrinkALot · v1.0" as="div"
             style={{ fontSize: 22, fontWeight: 700, color: "color-mix(in srgb, var(--p-fg) 55%, transparent)", letterSpacing: "0.04em" }} />
        </div>
        <E p="headline" def="Live BAC, in your pocket." as="div" className="float-big"
           style={{ fontSize: 92, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 0.98, textWrap: "balance", maxWidth: 900 }} multiline />
        <E p="sub" def="Watch the curve move as you drink." as="div" className="float"
           style={{ fontSize: 30, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)", maxWidth: 800, textWrap: "pretty" }} multiline />
        <div className="drift" style={wrapperStyle}>
          <Slot id={slotId} label="drag in feature screenshot" shape="rect" style={{ position: "absolute", inset: 0 }} />
        </div>
      </div>
    );
  }

  // ============================================================
  // 14. SHOWCASE
  // ============================================================
  function Showcase({ slotId }) {
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        display: "flex", flexDirection: "column", alignItems: "center", padding: "70px 60px 50px",
      }}>
        <div className="drift" style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <PhoneMock slotId={slotId} slotLabel="hero screenshot" scale={0.92} />
        </div>
        <E p="headline" def="Your night, on one screen." as="div" className="float-big"
           style={{ marginTop: 40, fontSize: 60, fontWeight: 900, letterSpacing: "-0.02em", textAlign: "center", textWrap: "balance" }} multiline />
      </div>
    );
  }

  // ============================================================
  // 15. GROUP SESSION TEASER
  // ============================================================
  function GroupTeaser({ members }) {
    const M = members || [
      { name: "Sara", drinks: 4, bac: "0.62" },
      { name: "Mikkel", drinks: 6, bac: "0.91", leader: true },
      { name: "Anna", drinks: 3, bac: "0.48" },
      { name: "Tom", drinks: 5, bac: "0.74" },
    ];
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        padding: "60px", display: "flex", flexDirection: "column", gap: 28,
      }}>
        <LivePill pKey="badge" def="Group session" />
        <E p="headline" def="The whole table, in sync." as="div" className="float-big"
           style={{ fontSize: 84, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1, textWrap: "balance" }} multiline />
        <E p="sub" def="Drink count and BAC update live across every member." as="div" className="float"
           style={{ fontSize: 26, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)", maxWidth: 800 }} multiline />
        <div style={{
          flex: 1, background: "var(--p-card)",
          border: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)",
          borderRadius: 28, padding: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
        }}>
          {M.map((m, i) => (
            <div key={i} className="drift" style={{
              animationDelay: `${i * 0.3}s`,
              background: "color-mix(in srgb, var(--p-fg) 5%, transparent)",
              border: m.leader ? `2px solid var(--p-accent)` : `1.5px solid color-mix(in srgb, var(--p-fg) 10%, transparent)`,
              borderRadius: 20, padding: 24,
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: `linear-gradient(135deg, var(--p-accent), color-mix(in srgb, var(--p-accent) 50%, var(--p-fg)))`,
                color: "var(--p-bg)",
                display: "grid", placeItems: "center", fontSize: 32, fontWeight: 900,
                flexShrink: 0,
              }}>{(m.name || "?")[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <E p={`members.${i}.name`} def={m.name} />
                  {m.leader && <span style={{ color: "var(--p-accent)", fontSize: 16, fontWeight: 800, letterSpacing: "0.08em" }}>★ LEADER</span>}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "color-mix(in srgb, var(--p-fg) 60%, transparent)", marginTop: 6, letterSpacing: "0.04em" }}>
                  <E p={`members.${i}.drinks`} def={m.drinks} /> drinks · <E p={`members.${i}.bac`} def={m.bac} /> ‰
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // 16. NIGHT OUT RECAP
  // ============================================================
  function NightRecap({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 7;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        padding: "70px 60px", display: "flex", flexDirection: "column", gap: 26,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <E p="kicker" def="Night Out · Recap" as="div" className="wobble"
               style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--p-fg) 55%, transparent)" }} />
            <E p="headline" def="The Rusty Anchor" as="div" className="float-big"
               style={{ fontSize: 76, fontWeight: 900, marginTop: 10, letterSpacing: "-0.025em", lineHeight: 1, textWrap: "balance" }} multiline />
            <E p="date" def="Sat, May 9 · 21:14 → 02:48" as="div" className="float"
               style={{ fontSize: 22, fontWeight: 700, marginTop: 10, color: "color-mix(in srgb, var(--p-fg) 60%, transparent)" }} />
          </div>
          <AppIcon size={80} />
        </div>
        <div className="drift" style={{
          background: "var(--p-card)",
          border: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)",
          borderRadius: 28, padding: 30, position: "relative", overflow: "hidden",
        }}>
          <E p="graphLabel" def="BAC over the night" as="div"
             style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "color-mix(in srgb, var(--p-fg) 60%, transparent)", marginBottom: 16 }} />
          <div style={{ height: 280, color: "var(--p-accent)", opacity: lineOpacity }}>
            <BacLine width={960} height={280} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} showFill={true} showPeak={true} id="nr-line" />
          </div>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
        }}>
          {[
            { key: "peak", label: "Peak", def: "0.91 ‰" },
            { key: "drinks", label: "Drinks", def: "6" },
            { key: "duration", label: "Duration", def: "5h 34m" },
          ].map((s, i) => (
            <div key={i} className="float" style={{
              animationDelay: `${i * 0.2}s`,
              background: "var(--p-card)",
              border: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)",
              borderRadius: 20, padding: "24px 20px", textAlign: "center",
            }}>
              <E p={s.key} def={s.def} as="div"
                 style={{ fontSize: 52, fontWeight: 900, color: "var(--p-accent)", letterSpacing: "-0.02em" }} />
              <E p={`${s.key}Label`} def={s.label} as="div"
                 style={{ fontSize: 18, fontWeight: 700, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase", color: "color-mix(in srgb, var(--p-fg) 60%, transparent)" }} />
            </div>
          ))}
        </div>
        <E p="sub" def="" as="div" className="float"
           style={{ fontSize: 22, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 60%, transparent)" }} multiline />
      </div>
    );
  }

  // ============================================================
  // 17. FEED POST PREVIEW
  // ============================================================
  function FeedPost({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 7;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, gap: 36,
      }}>
        <E p="headline" def="Your night, post-able." as="div" className="float-big"
           style={{ fontSize: 68, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1, textWrap: "balance" }} multiline />
        <div className="drift" style={{
          background: "var(--p-card)",
          border: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)",
          borderRadius: 28, padding: 26, display: "flex", flexDirection: "column", gap: 16,
          boxShadow: "0 30px 60px -30px rgba(0,0,0,0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: `linear-gradient(135deg, var(--p-accent), color-mix(in srgb, var(--p-accent) 50%, var(--p-fg)))`,
              color: "var(--p-bg)", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 24,
              flexShrink: 0,
            }}>M</div>
            <div style={{ flex: 1 }}>
              <E p="username" def="mikkel" as="div" style={{ fontSize: 24, fontWeight: 800 }} />
              <E p="meta" def="The Rusty Anchor · 2h" as="div"
                 style={{ fontSize: 16, fontWeight: 700, color: "color-mix(in srgb, var(--p-fg) 55%, transparent)" }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "color-mix(in srgb, var(--p-fg) 35%, transparent)" }}>···</div>
          </div>
          <div style={{
            borderRadius: 18, background: "color-mix(in srgb, var(--p-fg) 6%, transparent)",
            padding: 24, height: 280, color: "var(--p-accent)", position: "relative", overflow: "hidden",
          }}>
            <div style={{ opacity: lineOpacity }}>
              <BacLine width={900} height={230} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} showFill={true} showPeak={true} id="fp-line" />
            </div>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10,
            paddingTop: 6,
          }}>
            {[
              { key: "peak", label: "Peak", def: "0.91 ‰" },
              { key: "drinks", label: "Drinks", def: "6" },
              { key: "duration", label: "Duration", def: "5h 34m" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <E p={s.key} def={s.def} as="div" style={{ fontSize: 32, fontWeight: 900, color: "var(--p-fg)" }} />
                <E p={`${s.key}Label`} def={s.label} as="div"
                   style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "color-mix(in srgb, var(--p-fg) 55%, transparent)" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, paddingTop: 6, fontWeight: 800, fontSize: 20, color: "color-mix(in srgb, var(--p-fg) 70%, transparent)" }}>
            <span>♥ <E p="likes" def="124" /></span>
            <span>💬 <E p="comments" def="18" /></span>
          </div>
        </div>
        <E p="sub" def="Built-in share card. Drop it anywhere." as="div" className="float"
           style={{ fontSize: 26, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 60%, transparent)", textWrap: "pretty" }} multiline />
      </div>
    );
  }

  // ============================================================
  // 18. DRINKDEX PROGRESS
  // ============================================================
  function Drinkdex({ tried, total }) {
    const _total = parseInt(total) || 284;
    const _tried = parseInt(tried) || 70;
    const pct = Math.round((_tried / _total) * 100);
    const drinks = ["🍺","🍷","🥃","🍸","🍹","🥂","🍶","🍾"];
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        padding: 60, display: "flex", flexDirection: "column", gap: 36,
      }}>
        <div className="float-big">
          <E p="kicker" def="Drinkdex" as="div"
             style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--p-accent)" }} />
          <E p="headline" def="How many have you tried?" as="div"
             style={{ fontSize: 80, fontWeight: 900, marginTop: 14, letterSpacing: "-0.025em", lineHeight: 1, textWrap: "balance" }} multiline />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
          <div className="shimmer" style={{ fontSize: 220, fontWeight: 900, color: "var(--p-accent)", letterSpacing: "-0.04em", lineHeight: 0.85, display: "flex", alignItems: "baseline" }}>
            <E p="tried" def="70" />
            <span style={{ fontSize: 90, color: "color-mix(in srgb, var(--p-fg) 50%, transparent)" }}>/<E p="total" def="284" /></span>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, paddingBottom: 24, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)" }}>
            {pct}% tried
          </div>
        </div>
        <div style={{
          height: 40, background: "color-mix(in srgb, var(--p-fg) 8%, transparent)",
          borderRadius: 99, overflow: "hidden", position: "relative",
        }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "var(--p-accent)", borderRadius: 99,
          }} />
        </div>
        <div className="letter-bob" style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", fontSize: 90 }}>
          {drinks.map((d, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.18}s` }}>{d}</span>
          ))}
        </div>
        <E p="sub" def="" as="div" className="float"
           style={{ fontSize: 26, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 60%, transparent)", textAlign: "center", textWrap: "pretty" }} multiline />
      </div>
    );
  }

  // ============================================================
  // 19. OFFLINE BADGE
  // ============================================================
  function OfflineBadge() {
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: 60, position: "relative",
      }}>
        <div className="drift wobble" style={{ marginBottom: 50 }}>
          <svg width="240" height="240" viewBox="0 0 24 24" fill="none">
            <path d="M2 8.5C5 5.5 8.5 4 12 4c3.5 0 7 1.5 10 4.5M5 12c2-2 4.5-3 7-3 2.5 0 5 1 7 3M8.5 15.5c1-1 2.5-1.5 3.5-1.5 1 0 2.5.5 3.5 1.5M12 19a1 1 0 100 .01"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
            <line x1="3" y1="3" x2="21" y2="21" stroke="var(--p-accent)" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <E p="headline" def="Works underground." as="div" className="float-big"
           style={{ fontSize: 140, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 0.95, textAlign: "center", textWrap: "balance" }} multiline />
        <E p="sub" def="Drinks save locally. Sync when you're back online." as="div" className="float"
           style={{ marginTop: 30, fontSize: 32, fontWeight: 700, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)", textAlign: "center", maxWidth: 850, textWrap: "balance" }} multiline />
      </div>
    );
  }

  // ============================================================
  // 20. BAC GRAPH CALLOUT — the line, hero
  // ============================================================
  function GraphCallout({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 10;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        padding: 60, display: "flex", flexDirection: "column", gap: 28,
      }}>
        <LivePill pKey="badge" def="Live BAC" />
        <E p="headline" def="Watch your curve in real time." as="div" className="float-big"
           style={{ fontSize: 100, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 0.96, textWrap: "balance" }} multiline />
        <E p="sub" def="Widmark formula + your body stats + stomach state." as="div" className="float"
           style={{ fontSize: 30, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)", maxWidth: 800, textWrap: "pretty" }} multiline />
        <div style={{
          flex: 1, marginTop: 10,
          background: "var(--p-card)", border: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)",
          borderRadius: 28, padding: "40px 30px",
          display: "flex", flexDirection: "column", gap: 16, position: "relative",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 20, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "color-mix(in srgb, var(--p-fg) 55%, transparent)",
          }}>
            <E p="unit" def="‰ Promille" />
            <span style={{ color: "var(--p-accent)" }}>● Peak <E p="peak" def="0.91" /></span>
          </div>
          <div style={{ flex: 1, color: "var(--p-accent)", opacity: lineOpacity }}>
            <BacLine width={960} height={420} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} showFill={true} showNow={true} showPeak={true} showGrid={true} id="gc-line" />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 16, fontWeight: 700, color: "color-mix(in srgb, var(--p-fg) 55%, transparent)",
            letterSpacing: "0.04em",
          }}>
            {["21:00","22:00","23:00","00:00","01:00","02:00"].map((t, i) => (
              <E key={i} p={`time.${i}`} def={t} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 21. CATALOG SHOWCASE
  // ============================================================
  function CatalogShowcase({ items }) {
    const I = items || [
      { name: "🍺 Tuborg", abv: "4.6%" },
      { name: "🍷 Pinot Noir", abv: "13.5%" },
      { name: "🥃 Jameson", abv: "40%" },
      { name: "🍸 Negroni", abv: "24%" },
      { name: "🍹 Margarita", abv: "21%" },
      { name: "🥂 Cava", abv: "11.5%" },
      { name: "🍺 IPA", abv: "6.2%" },
      { name: "🍷 Malbec", abv: "14%" },
    ];
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        padding: 60, display: "flex", flexDirection: "column", gap: 26,
      }}>
        <div className="float-big">
          <E p="kicker" def="Catalog" as="div"
             style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--p-accent)" }} />
          <E p="headline" def="300+" as="div" className="shimmer"
             style={{ fontSize: 130, fontWeight: 900, color: "var(--p-accent)", marginTop: 10, letterSpacing: "-0.04em", lineHeight: 0.9 }} />
          <E p="subhead" def="drinks, two taps." as="div"
             style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1, marginTop: 6, textWrap: "balance" }} multiline />
        </div>
        <E p="sub" def="Beer, shots, wine, cocktails. Adjustable volume and ABV." as="div" className="float"
           style={{ fontSize: 26, fontWeight: 600, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)", maxWidth: 800 }} multiline />
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {I.map((it, i) => (
            <div key={i} className="drift" style={{
              animationDelay: `${i * 0.15}s`,
              background: "var(--p-card)", border: "1.5px solid color-mix(in srgb, var(--p-fg) 10%, transparent)",
              borderRadius: 16, padding: "20px 24px", fontSize: 30, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            }}>
              <E p={`items.${i}.name`} def={it.name} />
              <E p={`items.${i}.abv`} def={it.abv}
                 style={{ color: "var(--p-accent)", fontSize: 18, fontWeight: 800, letterSpacing: "0.06em" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // 22. SHARE CARD
  // ============================================================
  function ShareCard({ graphMarkers, graphOpacity, graphStrokeWidth }) {
    const lineOpacity = (graphOpacity ?? 100) / 100;
    const lineWidth = Number(graphStrokeWidth) || 8;
    return (
      <div style={{
        width: "100%", height: "100%", background: "transparent", color: "var(--p-fg)",
        padding: 60, display: "grid", placeItems: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div className="drift" style={{
          width: 760,
          background: "linear-gradient(155deg, var(--p-card), color-mix(in srgb, var(--p-accent) 12%, var(--p-card)))",
          border: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)",
          borderRadius: 36, padding: 50,
          boxShadow: "0 40px 80px -30px rgba(0,0,0,0.4)",
          display: "flex", flexDirection: "column", gap: 26,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
            <AppIcon size={70} />
            <E p="meta" def="Session · Sat May 9" as="div"
               style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--p-fg) 55%, transparent)" }} />
          </div>
          <E p="headline" def="Best night this month." as="div" className="float-big"
             style={{ fontSize: 60, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1, textWrap: "balance" }} multiline />
          <div style={{ height: 220, color: "var(--p-accent)", opacity: lineOpacity }}>
            <BacLine width={660} height={220} strokeWidth={lineWidth} showMarkers={graphMarkers !== false} showFill={true} showPeak={true} id="sc-line" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, borderTop: "1.5px solid color-mix(in srgb, var(--p-fg) 12%, transparent)", paddingTop: 22 }}>
            {[
              { key: "peak", label: "Peak BAC", def: "0.91 ‰" },
              { key: "drinks", label: "Drinks", def: "6" },
              { key: "duration", label: "Duration", def: "5h 34m" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <E p={s.key} def={s.def} as="div" style={{ fontSize: 36, fontWeight: 900, color: "var(--p-accent)" }} />
                <E p={`${s.key}Label`} def={s.label} as="div"
                   style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "color-mix(in srgb, var(--p-fg) 55%, transparent)", marginTop: 6 }} />
              </div>
            ))}
          </div>
          <E p="sub" def="" as="div" className="float"
             style={{ fontSize: 20, fontWeight: 700, color: "color-mix(in srgb, var(--p-fg) 65%, transparent)" }} multiline />
        </div>
      </div>
    );
  }

  // ---------- Manifest ----------
  const TEMPLATES = [
    { id: "fullBleed",       group: "Screenshots", name: "Full bleed",         needs: 1, Component: FullBleed,    defaults: { badge: "LIVE BAC", headline: "Track the night.", sub: "Not the morning after.", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 7 }},
    { id: "phoneFrame",      group: "Screenshots", name: "Phone frame",        needs: 1, Component: PhoneFrameTpl, defaults: { headline: "One screen, the whole night.", sub: "Units, BAC, sober-by — all live.", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 5 }},
    { id: "splitText",       group: "Screenshots", name: "Split — text + shot", needs: 1, Component: SplitTextShot, defaults: { headline: "Live BAC.", sub: "Widmark formula + your body stats. Updated every second.", badge: "New", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 6 }},
    { id: "splitTextR",      group: "Screenshots", name: "Split — flipped",    needs: 1, Component: (p)=>SplitTextShot({...p, reverse: true}), defaults: { headline: "Group sessions.", sub: "The whole table, one screen.", badge: "New", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 6 }},
    { id: "sideBySide",      group: "Screenshots", name: "Side-by-side",       needs: 2, Component: SideBySide,   defaults: { headline: "Before & after.", sub: "Same night. Different story.", graphMarkers: false, graphOpacity: 100, graphStrokeWidth: 4 }},
    { id: "stack",           group: "Screenshots", name: "Screenshot stack",   needs: 3, Component: Stack,        defaults: { headline: "Everything in one app.", sub: "Log, track, share." }},
    { id: "featureHi",       group: "Screenshots", name: "Feature highlight",  needs: 1, Component: FeatureHighlight, defaults: { badge: "New", version: "iDrinkALot · v1.0", headline: "Live BAC, in your pocket.", sub: "Watch the curve move as you drink." }},
    { id: "showcase",        group: "Screenshots", name: "Showcase",           needs: 1, Component: Showcase,     defaults: { headline: "Your night, on one screen." }},
    { id: "catalog",         group: "Screenshots", name: "Catalog showcase",   needs: 0, Component: CatalogShowcase, defaults: { kicker: "Catalog", headline: "300+", subhead: "drinks, two taps.", sub: "Beer, shots, wine, cocktails. Adjustable volume and ABV." }},

    { id: "graphCallout",    group: "The Line", name: "BAC graph callout",     needs: 0, Component: GraphCallout, defaults: { badge: "Live BAC", headline: "Watch your curve in real time.", sub: "Widmark formula + your body stats + stomach state.", unit: "‰ Promille", peak: "0.91", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 10 }},
    { id: "shareCard",       group: "The Line", name: "Share card",            needs: 0, Component: ShareCard,    defaults: { meta: "Session · Sat May 9", headline: "Best night this month.", peak: "0.91 ‰", drinks: "6", duration: "5h 34m", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 8 }},
    { id: "nightRecap",      group: "The Line", name: "Night out recap",       needs: 0, Component: NightRecap,   defaults: { kicker: "Night Out · Recap", headline: "The Rusty Anchor", date: "Sat, May 9 · 21:14 → 02:48", graphLabel: "BAC over the night", peak: "0.91 ‰", drinks: "6", duration: "5h 34m", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 7 }},
    { id: "feedPost",        group: "The Line", name: "Feed post preview",     needs: 0, Component: FeedPost,     defaults: { headline: "Your night, post-able.", username: "mikkel", meta: "The Rusty Anchor · 2h", peak: "0.91 ‰", drinks: "6", duration: "5h 34m", likes: "124", comments: "18", sub: "Built-in share card. Drop it anywhere.", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 7 }},

    { id: "groupTeaser",     group: "Social", name: "Group session teaser",    needs: 0, Component: GroupTeaser,  defaults: { badge: "Group session", headline: "The whole table, in sync.", sub: "Drink count and BAC update live across every member.",
      members: [
        { name: "Sara", drinks: 4, bac: "0.62" },
        { name: "Mikkel", drinks: 6, bac: "0.91", leader: true },
        { name: "Anna", drinks: 3, bac: "0.48" },
        { name: "Tom", drinks: 5, bac: "0.74" },
      ]
    }},
    { id: "drinkdex",        group: "Social", name: "Drinkdex progress",       needs: 0, Component: Drinkdex,     defaults: { kicker: "Drinkdex", headline: "How many have you tried?", tried: "70", total: "284" }},

    { id: "bigStat",         group: "Text", name: "Big stat",                  needs: 0, Component: BigStat,      defaults: { badge: "Drinks in the catalog", headline: "284", sub: "And counting.", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 7 }},
    { id: "quote",           group: "Text", name: "Quote card",                needs: 0, Component: Quote,        defaults: { headline: "Track the night, not the morning after.", sub: "iDrinkALot", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 5 }},
    { id: "comparison",      group: "Text", name: "Comparison grid",           needs: 0, Component: Comparison,   defaults: { headline: "Not all trackers are equal.", sub: "Pick the one that doesn't moralize.",
      rows: ["Live BAC", "Group sessions", "Offline", "300+ drinks"],
      cols: [
        { name: "Guessing", rows: [false, false, false, false] },
        { name: "Other apps", rows: [true, false, true, false] },
        { name: "iDrinkALot", rows: [true, true, true, true] },
      ]
    }},
    { id: "socialProof",     group: "Text", name: "Social proof",              needs: 0, Component: SocialProof,  defaults: { headline: "Finally a drink tracker that doesn't moralize.", sub: "Henrik, beta tester", badge: "5-star beta review", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 5 }},
    { id: "beforeAfter",     group: "Text", name: "Before / after",            needs: 0, Component: BeforeAfter,  defaults: { headline: "Guessing vs Knowing.", sub: "Same night. Different ending.", leftLabel: "Without iDrinkALot", leftText: "How drunk am I?", rightLabel: "With iDrinkALot", rightText: "0.78 ‰. Sober by 02:30.", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 7 }},
    { id: "soberBy",         group: "Text", name: "Sober by · countdown",      needs: 0, Component: SoberBy,      defaults: { badge: "Sober by", headline: "02:30", sub: "Live estimate from your BAC curve.", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 9 }},
    { id: "minimalBadge",    group: "Text", name: "Minimal badge",             needs: 0, Component: MinimalBadge, defaults: { headline: "iDrinkALot", sub: "Drink tracker for nights out.", graphMarkers: true, graphOpacity: 100, graphStrokeWidth: 5 }},
    { id: "offlineBadge",    group: "Text", name: "Offline badge",             needs: 0, Component: OfflineBadge, defaults: { headline: "Works underground.", sub: "Drinks save locally. Sync when you're back online." }},
  ];

  window.TEMPLATES = TEMPLATES;
})();
