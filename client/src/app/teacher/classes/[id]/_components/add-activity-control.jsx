"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * "+ Add {label}" control used on the class detail screen. Opens a small menu
 * with two actions, both scoped to THIS class only:
 *   • Assign existing → pick from the teacher's items and attach to this class
 *   • Create new       → go to the create page with this class pre-selected
 */
export function AddActivityControl({
  label,
  createHref,
  loadItems,
  getId,
  getTitle,
  getSubtitle,
  assign,
  onAdded,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        + Add {label}
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <button
            onClick={() => {
              setMenuOpen(false);
              setPickerOpen(true);
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
          >
            Assign existing {label}
          </button>
          <Link
            href={createHref}
            onClick={() => setMenuOpen(false)}
            className="block w-full border-t border-border px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
          >
            Create new {label}
          </Link>
        </div>
      )}

      {pickerOpen && (
        <PickerModal
          label={label}
          loadItems={loadItems}
          getId={getId}
          getTitle={getTitle}
          getSubtitle={getSubtitle}
          assign={assign}
          onClose={() => setPickerOpen(false)}
          onAdded={() => {
            setPickerOpen(false);
            onAdded?.();
          }}
        />
      )}
    </div>
  );
}

function PickerModal({ label, loadItems, getId, getTitle, getSubtitle, assign, onClose, onAdded }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await loadItems();
        if (active) setItems(list ?? []);
      } catch (err) {
        if (active) setError(err?.response?.data?.error || err.message || "Failed to load.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadItems]);

  const filtered = items.filter((item) =>
    getTitle(item).toLowerCase().includes(keyword.trim().toLowerCase()),
  );

  async function handleAssign(item) {
    setAssigningId(getId(item));
    setError("");
    try {
      await assign(getId(item));
      onAdded();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to assign.");
      setAssigningId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/40 px-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Assign existing {label}
          </h3>
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground/70 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={`Search your ${label}s`}
          className="mb-3 w-full rounded-md border border-border px-3 py-2 text-sm"
        />

        {error && (
          <p className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground/70">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground/70">
              No {label}s available to assign.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((item) => (
                <li
                  key={getId(item)}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {getTitle(item)}
                    </p>
                    {getSubtitle && getSubtitle(item) && (
                      <p className="truncate text-xs text-muted-foreground/70">
                        {getSubtitle(item)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAssign(item)}
                    disabled={assigningId === getId(item)}
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {assigningId === getId(item) ? "Adding..." : "Add"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
