import type { Font } from "@/types/api";

interface FontSelectorProps {
  value: Font;
  onChange: (value: Font) => void;
}

export function FontSelector({ value, onChange }: FontSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Font)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    >
    <option value="Atkinson Hyperlegible Mono Regular">Atkinson Hyperlegible Mono Regular</option>
    <option value="Atkinson Hyperlegible Next Regular">Atkinson Hyperlegible Next Regular</option>
    <option value="Atkinson Hyperlegible Regular">Atkinson Hyperlegible Regular</option>
    <option value="Coolvetica Regular">Coolvetica Regular</option>
    <option value="Noto Sans Regular">Noto Sans Regular</option>
    </select>
  );
}