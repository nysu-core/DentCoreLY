import { useState } from "react";

interface Props {
  options: string[];
  onChange: (opts: string[]) => void;
  disabled?: boolean;
}

export function OptionsEditor({ options, onChange, disabled }: Props) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed || options.includes(trimmed)) return;
    onChange([...options, trimmed]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(options.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...options];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }

  function moveDown(idx: number) {
    if (idx === options.length - 1) return;
    const next = [...options];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    onChange(next);
  }

  function editInline(idx: number, val: string) {
    const next = [...options];
    next[idx] = val;
    onChange(next);
  }

  return (
    <div className="mt-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
      <p className="text-xs font-medium text-slate-500 mb-2">Options</p>

      <ul className="space-y-1 mb-2">
        {options.map((opt, idx) => (
          <li key={idx} className="flex items-center gap-1">
            <input
              type="text"
              value={opt}
              disabled={disabled}
              onChange={(e) => editInline(idx, e.target.value)}
              className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs bg-white disabled:bg-slate-100"
            />
            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  disabled={idx === 0}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  disabled={idx === options.length - 1}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="p-1 text-red-400 hover:text-red-600"
                  title="Remove option"
                >
                  ✕
                </button>
              </>
            )}
          </li>
        ))}
        {options.length === 0 && (
          <li className="text-xs text-slate-400 italic">No options yet — add one below.</li>
        )}
      </ul>

      {!disabled && (
        <div className="flex gap-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="New option..."
            className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={add}
            className="px-3 py-1 bg-brand-500 text-white text-xs rounded hover:bg-brand-600"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
