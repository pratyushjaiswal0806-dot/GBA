import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { text } from '../../i18n/en.js';
import { chartColors, chartFontSize, chartHeights } from './chartColors.js';

const categoryAxisWidth = 140;
const axisTick = { fontSize: chartFontSize };

export function CategoryChart({ categories }) {
  const data = categories.map((category) => ({ name: category.name, total: category.total }));

  return (
    <>
      <div aria-label={text.dashboard.categoryChartLabel} role="img" style={{ height: categories.length * chartHeights.categoryRow }}>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={chartColors.grid} />
            <XAxis allowDecimals={false} axisLine={false} stroke={chartColors.axis} tick={axisTick} tickLine={false} type="number" />
            <YAxis axisLine={false} dataKey="name" stroke={chartColors.axis} tick={axisTick} tickLine={false} type="category" width={categoryAxisWidth} />
            <Tooltip cursor={{ fill: chartColors.grid, opacity: 0.4 }} />
            <Bar dataKey="total" isAnimationActive={false} fill={chartColors.total} maxBarSize={28} name={text.dashboard.total} radius={[0, 6, 6, 0]}>
              <LabelList dataKey="total" isAnimationActive={false} fill={chartColors.axis} fontSize={chartFontSize} position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 overflow-hidden">
        <table className="portal-table min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="font-semibold" scope="col">{text.dashboard.categoryColumn}</th>
              <th className="text-right font-semibold" scope="col">{text.dashboard.total}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <tr key={category.code}>
                <th className="break-words text-slate-900" scope="row">{category.name}</th>
                <td className="portal-data text-right text-slate-700">{category.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
