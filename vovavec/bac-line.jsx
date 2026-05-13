/* BAC line component — the brand signature line.
   Generates a smooth BAC-style curve and renders an animated SVG.
   Exported to window so other JSX scripts can use it. */

(function () {
  const { useMemo } = React;

  // Sum-of-Gaussians BAC-ish curve generator.
  // Returns SVG path "M ... C ..." plus computed peak/markers.
  function buildBacPath({
    width = 1000,
    height = 320,
    leftPad = 0,
    rightPad = 0,
    topPad = 20,
    bottomPad = 20,
    peaks = [
      { t: 0.18, h: 0.35, sigma: 0.07 },
      { t: 0.38, h: 0.78, sigma: 0.09 },
      { t: 0.58, h: 1.0,  sigma: 0.10 },
      { t: 0.72, h: 0.85, sigma: 0.12 },
      { t: 0.86, h: 0.55, sigma: 0.14 },
    ],
    samples = 80,
    decay = 0.12, // metabolic decay over full t (slows tail)
  }) {
    const innerW = width - leftPad - rightPad;
    const innerH = height - topPad - bottomPad;
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      let y = 0;
      for (const p of peaks) {
        const dt = t - p.t;
        y += p.h * Math.exp(-(dt * dt) / (2 * p.sigma * p.sigma));
      }
      y -= decay * t * t; // gentle long tail down
      pts.push({ t, y });
    }
    // Normalize y to 0..1 (use max found)
    const maxY = Math.max(...pts.map(p => p.y));
    const minY = 0;
    const norm = pts.map(p => ({
      x: leftPad + p.t * innerW,
      y: topPad + innerH - ((p.y - minY) / (maxY - minY)) * innerH,
    }));

    // Build smooth Catmull-Rom -> cubic
    function smooth(points) {
      if (points.length < 2) return "";
      let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
      }
      return d;
    }

    const d = smooth(norm);
    // peak point on curve
    const peakIdx = norm.reduce((bi, p, i) => (p.y < norm[bi].y ? i : bi), 0);

    return {
      d,
      norm,
      peak: norm[peakIdx],
      ptsForMarkers: norm,
    };
  }

  /**
   * BacLine — renders the signature curve.
   * Props:
   *   width, height
   *   color (line color)
   *   strokeWidth
   *   showMarkers (drink ticks)
   *   showFill (gradient under curve)
   *   showNow (vertical "now" indicator)
   *   showPeak (peak callout dot)
   *   peaks (custom peak config)
   *   className
   */
  function BacLine(props) {
    const {
      width = 1000,
      height = 320,
      color = "var(--p-accent, #ea7a53)",
      strokeWidth = 8,
      showMarkers = true,
      showFill = false,
      showNow = false,
      showPeak = false,
      showGrid = false,
      peaks,
      leftPad = 0,
      rightPad = 0,
      topPad,
      bottomPad,
      className = "",
      id,
    } = props;

    const built = useMemo(() => buildBacPath({
      width, height, peaks, leftPad, rightPad,
      topPad: topPad ?? Math.max(strokeWidth, 20),
      bottomPad: bottomPad ?? Math.max(strokeWidth, 20),
    }), [width, height, JSON.stringify(peaks || null), leftPad, rightPad, strokeWidth, topPad, bottomPad]);

    // Compute approximate path length for stroke-dasharray animation
    const len = useMemo(() => {
      const pts = built.ptsForMarkers;
      let L = 0;
      for (let i = 1; i < pts.length; i++) {
        L += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      }
      return Math.ceil(L) + 200;
    }, [built]);

    const gradId = `bacfill-${id || Math.random().toString(36).slice(2, 8)}`;

    // Marker x-positions — pick a few intermediate path points
    const markerXs = useMemo(() => {
      const pts = built.ptsForMarkers;
      const targets = [0.15, 0.30, 0.42, 0.55, 0.70, 0.83];
      return targets.map(t => pts[Math.floor(t * (pts.length - 1))].x);
    }, [built]);

    const nowX = leftPad + (width - leftPad - rightPad) * 0.78;

    return (
      <svg
        className={`bac-svg ${className}`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ "--len": len, display: "block", overflow: "visible" }}
      >
        {showFill && (
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
        )}
        {showGrid && [0.25, 0.5, 0.75].map((g, i) => (
          <line key={i}
            x1={leftPad} x2={width - rightPad}
            y1={(topPad ?? 20) + (height - (topPad ?? 20) - (bottomPad ?? 20)) * g}
            y2={(topPad ?? 20) + (height - (topPad ?? 20) - (bottomPad ?? 20)) * g}
            stroke="currentColor" strokeOpacity="0.10" strokeWidth="1.5" strokeDasharray="4 8"
          />
        ))}
        {showFill && (
          <path
            d={`${built.d} L ${width - rightPad} ${height - (bottomPad ?? 20)} L ${leftPad} ${height - (bottomPad ?? 20)} Z`}
            fill={`url(#${gradId})`}
            opacity="0.85"
          />
        )}
        {showMarkers && markerXs.map((x, i) => (
          <line key={i}
            x1={x} x2={x}
            y1={(topPad ?? 20) - 6}
            y2={height - (bottomPad ?? 20) + 6}
            stroke={color} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round"
          />
        ))}
        {showNow && (
          <>
            <line x1={nowX} x2={nowX} y1={topPad ?? 20} y2={height - (bottomPad ?? 20)}
                  stroke="var(--green, #16a34a)" strokeWidth="3" strokeDasharray="6 8" />
            <circle cx={nowX} cy={topPad ?? 20} r="6" fill="var(--green, #16a34a)" />
          </>
        )}
        <path
          className="draw-path"
          d={built.d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ "--len": len }}
        />
        {showPeak && built.peak && (
          <g>
            <circle cx={built.peak.x} cy={built.peak.y} r="14"
              fill={color} opacity="0.25" className="pulse-dot" style={{transformOrigin:`${built.peak.x}px ${built.peak.y}px`}} />
            <circle cx={built.peak.x} cy={built.peak.y} r="8" fill={color} />
            <circle cx={built.peak.x} cy={built.peak.y} r="3.5" fill="#fff" />
          </g>
        )}
      </svg>
    );
  }

  window.BacLine = BacLine;
  window.buildBacPath = buildBacPath;
})();
