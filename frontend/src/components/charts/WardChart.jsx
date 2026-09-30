import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { text } from '../../i18n/en.js';
import { chartColors, chartHeights } from './chartColors.js';

const wardAxisWidth = 110;
const segmentGap = { stroke: chartColors.surface, strokeWidth: 2 };

export function WardChart({ wards }) {
  const data = wards.map((ward) => ({ ward: ward.ward, resolved: ward.resolved, pending: ward.open }));

  return (
    <div>
      <div aria-label={text.dashboard.wardChartLabel} role="img" style={{ height: wards.length * chartHeights.wardRow + chartHeights.legend }}>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={chartColors.grid} />
            <XAxis allowDecimals={false} axisLine={false} stroke={chartColors.axis} tickLine={false} type="number" />
            <YAxis axisLine={false} dataKey="ward" stroke={chartColors.axis} tickLine={false} type="category" width={wardAxisWidth} />
            <Tooltip cursor={{ fill: chartColors.grid, opacity: 0.4 }} />
            <Legend formatter={(value) => <span style={{ color: chartColors.axis }}>{value}</span>} />
            <Bar dataKey="resolved" isAnimationActive={false} fill={chartColors.resolved} maxBarSize={48} name={text.dashboard.resolved} stackId="tickets" {...segmentGap} />
            <Bar dataKey="pending" isAnimationActive={false} fill={chartColors.pending} maxBarSize={48} name={text.dashboard.pending} radius={[0, 4, 4, 0]} stackId="tickets" {...segmentGap} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 font-semibold sm:px-4" scope="col">{text.dashboard.wardColumn}</th>
              <th className="px-2 py-2 text-right font-semibold sm:px-4" scope="col">{text.dashboard.totalShort}</th>
              <th className="px-2 py-2 text-right font-semibold sm:px-4" scope="col">{text.dashboard.resolved}</th>
              <th className="px-2 py-2 text-right font-semibold sm:px-4" scope="col">{text.dashboard.pending}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {wards.map((ward) => (
              <tr key={ward.ward}>
                <th className="px-2 py-2 font-medium sm:px-4 text-slate-900" scope="row">{ward.ward}</th>
                <td className="px-2 py-2 sm:px-4 text-right text-slate-700">{ward.total}</td>
                <td className="px-2 py-2 sm:px-4 text-right text-slate-700">{ward.resolved}</td>
                <td className="px-2 py-2 sm:px-4 text-right text-slate-700">{ward.open}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
