import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { text } from '../../i18n/en.js';
import { chartColors, chartHeights } from './chartColors.js';

const categoryAxisWidth = 150;

export function CategoryChart({ categories }) {
  const data = categories.map((category) => ({ name: category.name, total: category.total }));

  return (
    <div aria-label={text.dashboard.categoryChartLabel} role="img" style={{ height: categories.length * chartHeights.categoryRow }}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={chartColors.grid} />
          <XAxis allowDecimals={false} axisLine={false} stroke={chartColors.axis} tickLine={false} type="number" />
          <YAxis axisLine={false} dataKey="name" stroke={chartColors.axis} tickLine={false} type="category" width={categoryAxisWidth} />
          <Tooltip cursor={{ fill: chartColors.grid, opacity: 0.4 }} />
          <Bar dataKey="total" isAnimationActive={false} fill={chartColors.total} maxBarSize={28} name={text.dashboard.total} radius={[0, 4, 4, 0]}>
            <LabelList dataKey="total" isAnimationActive={false} fill={chartColors.axis} position="right" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
