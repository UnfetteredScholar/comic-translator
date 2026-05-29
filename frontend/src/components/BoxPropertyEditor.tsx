import type { TextBoxLabel } from "@/types/api";

export interface BoxPropertyValues {
  label: TextBoxLabel;
  score: number;
  text?: string;
  translated_text?: string;
  fill_color_hex?: string | null;
  font_color_hex?: string | null;
}

interface BoxPropertyEditorProps {
  box: BoxPropertyValues;
  onChange: (patch: Partial<Pick<BoxPropertyValues, "text"| "translated_text" | "fill_color_hex" | "font_color_hex">>) => void;
  onDelete?: () => void;
}

export function BoxPropertyEditor({ box, onChange, onDelete }: BoxPropertyEditorProps) {
  const fillColor = box.fill_color_hex ?? "#ffffff";
  const fontColor = box.font_color_hex ?? "#000000";

  return (
    <aside className="w-64 shrink-0 space-y-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <h3 className="font-semibold text-slate-900">Box properties</h3>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-600">
        <dt>Label</dt>
        <dd className="font-medium text-slate-900">{box.label}</dd>
        <dt>Score</dt>
        <dd className="font-medium text-slate-900">{box.score.toFixed(3)}</dd>
      </dl>

      <label className="block space-y-1">
        <span className="text-slate-700">Text</span>
        <textarea
          className="w-full resize-y rounded-md border border-slate-300 px-2 py-1.5 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          rows={2}
          value={box.text ?? ""}
          placeholder="Extracted text"
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-slate-700">Translated text</span>
        <textarea
          className="w-full resize-y rounded-md border border-slate-300 px-2 py-1.5 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          rows={2}
          value={box.translated_text ?? ""}
          placeholder="Translated text"
          onChange={(e) => onChange({ translated_text: e.target.value })}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-slate-700">Fill color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-9 w-12 cursor-pointer rounded border border-slate-300"
            value={fillColor}
            onChange={(e) => onChange({ fill_color_hex: e.target.value })}
          />
          <input
            type="text"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs text-slate-900"
            value={fillColor}
            onChange={(e) => onChange({ fill_color_hex: e.target.value })}
          />
        </div>
      </label>

      <label className="block space-y-1">
        <span className="text-slate-700">Font color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-9 w-12 cursor-pointer rounded border border-slate-300"
            value={fontColor}
            onChange={(e) => onChange({ font_color_hex: e.target.value })}
          />
          <input
            type="text"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs text-slate-900"
            value={fontColor}
            onChange={(e) => onChange({ font_color_hex: e.target.value })}
          />
        </div>
      </label>

      {onDelete && (
        <button
          type="button"
          className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          onClick={onDelete}
        >
          Delete box
        </button>
      )}
    </aside>
  );
}
