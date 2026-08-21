"use client";

import type { AttributeDef, AttributeExtraValue } from "./types";
import { parseOptions } from "@/lib/universal-product";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#e5eaef] outline-none text-sm text-[#2A3547] bg-white transition-colors focus:border-[#0085db] focus:ring-2 focus:ring-[#0085db]/15";
const invalidClass = "border-[#fa896b] bg-[#fff8f6]";
const errorClass = "text-xs text-[#fa896b] mt-1 block font-medium";

function Label({ def }: { def: AttributeDef }) {
  return (
    <label className="block mb-1.5 text-sm font-medium text-[#2A3547]">
      {def.label} {def.required && <span className="text-[#fa896b]">*</span>}
    </label>
  );
}

function EmptyValue() {
  return <p className="text-xs text-[#9aa8bb] italic">—</p>;
}

interface AttributeFieldProps {
  def: AttributeDef;
  value: unknown;
  error?: string;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}

function AttributeField({ def, value, error, disabled, onChange }: AttributeFieldProps) {
  const type = def.type;

  if (type === "TEXT") {
    return (
      <div className="form-group">
        <Label def={def} />
        <input
          type="text"
          value={(value as string) || ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} ${error ? invalidClass : ""}`}
          placeholder={def.label}
        />
        {error && <span className={errorClass}>{error}</span>}
      </div>
    );
  }

  if (type === "NUMBER") {
    return (
      <div className="form-group">
        <Label def={def} />
        <div className="flex gap-2 items-start">
          <input
            type="number"
            value={value === null || value === undefined || value === "" ? "" : String(value)}
            disabled={disabled}
            min={def.minValue ?? undefined}
            max={def.maxValue ?? undefined}
            step="any"
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            className={`${inputClass} ${error ? invalidClass : ""}`}
            placeholder="0"
          />
          {def.unit && (
            <span className="px-3 py-2.5 rounded-lg bg-[#f0f2f5] text-sm text-[#5A6A85] whitespace-nowrap shrink-0">
              {def.unit}
            </span>
          )}
        </div>
        {def.minValue != null || def.maxValue != null ? (
          <p className="text-xs text-[#7c8fac] mt-1">
            {def.minValue != null && `min ${def.minValue}`}
            {def.minValue != null && def.maxValue != null && " — "}
            {def.maxValue != null && `max ${def.maxValue}`}
          </p>
        ) : null}
        {error && <span className={errorClass}>{error}</span>}
      </div>
    );
  }

  if (type === "BOOLEAN") {
    return (
      <div className="form-group">
        <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[#2A3547]">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer accent-[#0085db]"
          />
          <span>
            {def.label} {def.required && <span className="text-[#fa896b]">*</span>}
          </span>
        </label>
        {error && <span className={errorClass}>{error}</span>}
      </div>
    );
  }

  if (type === "SELECT") {
    const opts = parseOptions(def.options);
    return (
      <div className="form-group">
        <Label def={def} />
        <select
          value={(value as string) || ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} ${error ? invalidClass : ""}`}
        >
          <option value="">— Tanlang —</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {error && <span className={errorClass}>{error}</span>}
      </div>
    );
  }

  if (type === "MULTI_SELECT") {
    const opts = parseOptions(def.options);
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="form-group">
        <Label def={def} />
        <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-[#e5eaef] bg-[#fafbfc]">
          {opts.length === 0 && <EmptyValue />}
          {opts.map((o) => {
            const checked = selected.includes(o);
            return (
              <label
                key={o}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                  checked
                    ? "border-[#0085db] bg-[#ecf2ff] text-[#0068ad] font-semibold"
                    : "border-[#e5eaef] bg-white text-[#5A6A85]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, o]
                      : selected.filter((s) => s !== o);
                    onChange(next);
                  }}
                  className="w-3.5 h-3.5 accent-[#0085db]"
                />
                {o}
              </label>
            );
          })}
        </div>
        {error && <span className={errorClass}>{error}</span>}
      </div>
    );
  }

  if (type === "COLOR") {
    return (
      <div className="form-group">
        <Label def={def} />
        <div className="flex gap-2 items-start">
          <input
            type="color"
            value={(value as string) || "#000000"}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-11 h-[42px] rounded-lg border border-[#e5eaef] cursor-pointer bg-white"
          />
          <input
            type="text"
            value={(value as string) || ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.trim())}
            className={`${inputClass} ${error ? invalidClass : ""}`}
            placeholder="#FF0000"
          />
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {parseOptions(def.options).map((o) => (
            <button
              key={o}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o)}
              title={o}
              style={{ background: o }}
              className={`w-7 h-7 rounded-full border ${value === o ? "ring-2 ring-[#0085db] border-white" : "border-[#e5eaef]"}`}
            />
          ))}
        </div>
        {error && <span className={errorClass}>{error}</span>}
      </div>
    );
  }

  if (type === "MEASUREMENT") {
    const obj =
      value && typeof value === "object"
        ? (value as { value?: unknown; unit?: string })
        : null;
    const unit = obj?.unit || def.unit || "";
    return (
      <div className="form-group">
        <Label def={def} />
        <div className="flex gap-2 items-start">
          <input
            type="number"
            value={obj?.value === null || obj?.value === undefined ? "" : String(obj?.value ?? "")}
            disabled={disabled}
            step="any"
            min={def.minValue ?? undefined}
            max={def.maxValue ?? undefined}
            onChange={(e) =>
              onChange({
                value: e.target.value === "" ? "" : Number(e.target.value),
                unit,
              })
            }
            className={`${inputClass} ${error ? invalidClass : ""}`}
            placeholder="0"
          />
          <input
            type="text"
            value={unit}
            disabled={disabled}
            onChange={(e) =>
              onChange({ value: obj?.value ?? "", unit: e.target.value })
            }
            className={`${inputClass} max-w-[110px]`}
            placeholder="birlik"
          />
        </div>
        {error && <span className={errorClass}>{error}</span>}
      </div>
    );
  }

  if (type === "DATE") {
    const d = value ? String(value).slice(0, 10) : "";
    return (
      <div className="form-group">
        <Label def={def} />
        <input
          type="date"
          value={d}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} ${error ? invalidClass : ""}`}
        />
        {error && <span className={errorClass}>{error}</span>}
      </div>
    );
  }

  return (
    <div className="form-group">
      <Label def={def} />
      <EmptyValue />
    </div>
  );
}

export interface AttributeFieldsProps {
  defs: AttributeDef[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  extras?: AttributeExtraValue[];
  disabled?: boolean;
  onChange: (defId: string, value: unknown) => void;
}

export default function AttributeFields({
  defs,
  values,
  errors,
  extras,
  disabled,
  onChange,
}: AttributeFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
      {defs.map((def) => (
        <AttributeField
          key={def.id}
          def={def}
          value={values[def.id]}
          error={errors[def.id]}
          disabled={disabled}
          onChange={(v) => onChange(def.id, v)}
        />
      ))}
      {defs.length === 0 && (
        <p className="text-sm text-[#9aa8bb] italic md:col-span-2 py-2">
          Bu kategoriya uchun xususiyatlar aniqlanmagan.
        </p>
      )}

      {extras && extras.length > 0 && (
        <div className="md:col-span-2 mt-4 rounded-xl border border-[#ffe0a6] bg-[#fff6e6] p-4">
          <h4 className="text-sm font-bold text-[#8a5200] mb-1">
            Boshqa kategoriyadan qolgan xususiyatlar
          </h4>
          <p className="text-xs text-[#b26a00] mb-3">
            Bu qiymatlar joriy kategoriya definitionsiga kirmaydi. Saqlashda ular
            structured formatdan chiqib ketadi (legacy attributes JSON saqlanadi).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {extras.map((def) => (
              <div key={def.attributeDefId} className="form-group">
                <label className="block mb-1.5 text-sm font-medium text-[#2A3547]">
                  {def.label}
                </label>
                <p className="text-sm text-[#5A6A85] bg-white rounded-lg border border-[#ffe0a6] px-3.5 py-2.5">
                  {def.value === null || def.value === undefined || def.value === ""
                    ? "—"
                    : String(def.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
