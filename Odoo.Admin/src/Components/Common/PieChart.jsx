import React, { useMemo } from "react";
import PropTypes from "prop-types";

const PALETTE = ["#3eb474", "#0f7a4a", "#f0b429", "#2f6fed", "#e85d4c", "#7c5cbf", "#5b6b7c"];

/**
 * Lightweight SVG donut/pie — no chart library dependency.
 */
const PieChart = ({ items = [], size = 180, thickness = 36, emptyLabel = "No data" }) => {
  const { slices, total, gradient } = useMemo(() => {
    const cleaned = (items || [])
      .map((it, i) => ({
        label: it.label || it.name || it.status || it.sport || `Item ${i + 1}`,
        value: Number(it.value ?? it.count ?? 0) || 0,
        color: it.color || PALETTE[i % PALETTE.length],
      }))
      .filter((it) => it.value > 0);
    const sum = cleaned.reduce((s, it) => s + it.value, 0);
    if (!sum) {
      return { slices: [], total: 0, gradient: "conic-gradient(#e9ecef 0 100%)" };
    }
    let cursor = 0;
    const parts = cleaned.map((it) => {
      const start = cursor;
      const pct = (it.value / sum) * 100;
      cursor += pct;
      return { ...it, start, end: cursor, pct };
    });
    const grad = `conic-gradient(${parts
      .map((p) => `${p.color} ${p.start}% ${p.end}%`)
      .join(", ")})`;
    return { slices: parts, total: sum, gradient: grad };
  }, [items]);

  if (!total) {
    return <p className="text-muted mb-0">{emptyLabel}</p>;
  }

  const hole = Math.max(0, 100 - (thickness / size) * 100 * 2);

  return (
    <div className="d-flex flex-column flex-md-row align-items-center gap-3">
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: gradient,
          position: "relative",
          flexShrink: 0,
        }}
        role="img"
        aria-label={`Pie chart totaling ${total}`}
      >
        <div
          style={{
            position: "absolute",
            inset: `${(100 - hole) / 2}%`,
            borderRadius: "50%",
            background: "var(--arambh-surface, #fff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div className="fw-bold fs-4" style={{ lineHeight: 1 }}>
            {total}
          </div>
          <div className="small text-muted">total</div>
        </div>
      </div>
      <ul className="list-unstyled mb-0 flex-fill">
        {slices.map((s) => (
          <li key={s.label} className="d-flex align-items-center justify-content-between mb-2 small">
            <span className="d-flex align-items-center gap-2">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: s.color,
                  display: "inline-block",
                }}
              />
              <span className="text-capitalize">{s.label.replace(/_/g, " ")}</span>
            </span>
            <span className="fw-semibold">
              {s.value} · {Math.round(s.pct)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

PieChart.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  size: PropTypes.number,
  thickness: PropTypes.number,
  emptyLabel: PropTypes.string,
};

export default PieChart;
