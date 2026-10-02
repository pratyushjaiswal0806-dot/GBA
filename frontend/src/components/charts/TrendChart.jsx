import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { text } from '../../i18n/en.js';
import { chartColors, chartFontSize, chartHeights } from './chartColors.js';

const lineWidth = 3;
const axisTick = { fontSize: chartFontSize };
const dotRadius = 4;
const dateFormats = {
  week: { day: 'numeric', month: 'short', timeZone: 'UTC' },
  month: { month: 'short', year: 'numeric', timeZone: 'UTC' }
};

function formatPeriod(periodStart, interval, options = dateFormats[interval]) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(`${periodStart}T00:00:00Z`));
}

export function TrendChart({ points, interval }) {
  const data = points.map((point) => ({ ...point, label: formatPeriod(point.periodStart, interval) }));
  const tooltipLabel = (label, payload) => {
    const periodStart = payload?.[0]?.payload?.periodStart;
    if (!periodStart) return label;
    return interval === 'week'
      ? `${text.dashboard.weekOf} ${formatPeriod(periodStart, interval, { dateStyle: 'medium', timeZone: 'UTC' })}`
      : label;
  };

  return (
    <div aria-label={text.dashboard.trendChartLabel} role="img" style={{ height: chartHeights.trend }}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis axisLine={false} dataKey="label" minTickGap={16} stroke={chartColors.axis} tick={axisTick} tickLine={false} />
          <YAxis allowDecimals={false} axisLine={false} stroke={chartColors.axis} tick={axisTick} tickLine={false} width={32} />
          <Tooltip labelFormatter={tooltipLabel} />
          <Line
            activeDot={{ r: dotRadius + 2, fill: chartColors.total, stroke: chartColors.surface, strokeWidth: 2 }}
            dataKey="count"
            dot={{ r: dotRadius, fill: chartColors.total, stroke: chartColors.surface, strokeWidth: 2 }}
            isAnimationActive={false}
            name={text.dashboard.trendCount}
            stroke={chartColors.total}
            strokeWidth={lineWidth}
            type="linear"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
