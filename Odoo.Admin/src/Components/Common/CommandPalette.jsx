import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { ARAMBH_ROUTES } from "../../config/arambhNav";
import { usePermission } from "../../hooks/usePermission";

/**
 * Lightweight ⌘K / Ctrl+K route search (no cmdk dependency).
 */
const CommandPalette = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARAMBH_ROUTES.filter((r) => !r.perm || can(r.perm)).filter((r) => {
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q)
      );
    });
  }, [query, can]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const go = useCallback(
    (item) => {
      if (!item) return;
      onClose?.();
      navigate(item.path);
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        go(items[activeIndex]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, activeIndex, go, onClose]);

  if (!open) return null;

  return (
    <div
      className="arambh-cmdk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="arambh-cmdk-panel">
        <input
          className="arambh-cmdk-input"
          autoFocus
          placeholder="Search pages… (Esc to close)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="arambh-cmdk-list">
          {items.length === 0 ? (
            <div className="px-3 py-3 text-muted small">No matching pages</div>
          ) : (
            items.map((item, idx) => (
              <button
                key={item.path}
                type="button"
                className={`arambh-cmdk-item ${idx === activeIndex ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => go(item)}
              >
                <span>
                  {item.icon ? <i className={`${item.icon} me-2`} /> : null}
                  {item.label}
                  {item.comingSoon ? (
                    <span className="badge bg-secondary-subtle text-secondary ms-2">
                      Soon
                    </span>
                  ) : null}
                </span>
                <span className="meta">{item.path}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

CommandPalette.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
};

export default CommandPalette;
