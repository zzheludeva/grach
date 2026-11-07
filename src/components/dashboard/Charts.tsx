"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/i18n/I18nProvider";
import type { CurrencyCode } from "@/lib/types";

/* Validated categorical palette (scripts/validate_palette.js: lightness, chroma, CVD pass;
   contrast WARN → legend + table view are always provided). Fixed order, never cycled. */
export const SERIES = [
  { key: "products", color: "#C2652F" },
  { key: "workshops", color: "#1F9E98" },
  { key: "tutorials", color: "#E0890A" },
] as const;

const axis = { stroke: "#8a9799", fontSize: 12, tickLine: false, axisLine: false } as const;

export function IncomeChart({ data, currency }: { data: { label: string; products: number; workshops: number; tutorials: number }[]; currency: CurrencyCode }) {
  const { t, money, num } = useI18n();
  const peak = Math.max(1, ...data.map((d) => d.products + d.workshops + d.tutorials));
  const step = Math.pow(10, Math.floor(Math.log10(peak)));
  const top = Math.ceil((peak * 1.1) / step) * step;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#e7e3dd" strokeDasharray="0" />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} width={56} domain={[0, top]} tickCount={4} tickFormatter={(v) => num(v, { notation: "compact" })} />
          <Tooltip
            cursor={{ fill: "rgba(21,72,76,0.06)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e7e3dd", fontSize: 13 }}
            formatter={(v, name) => [money({ amount: Number(v ?? 0), currency }), t(`dashboard.src.${String(name)}`)]}
          />
          {SERIES.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} stroke="#fff" strokeWidth={2} radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={44} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FollowersChart({ data }: { data: { label: string; count: number }[] }) {
  const { t, num } = useI18n();
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e3dd" />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} width={36} allowDecimals={false} />
          <Tooltip cursor={{ stroke: "#15484c", strokeDasharray: "3 3" }} contentStyle={{ borderRadius: 12, border: "1px solid #e7e3dd", fontSize: 13 }} formatter={(v) => [num(Number(v ?? 0)), t("dashboard.followers")]} />
          <Line type="monotone" dataKey="count" stroke="#15484c" strokeWidth={2} dot={{ r: 4, fill: "#15484c", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
