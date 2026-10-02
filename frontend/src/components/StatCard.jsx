import { Icon } from './Icon.jsx';

export function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <span className="icon-chip"><Icon name={icon} /></span>
      <p className="stat-card__label">{label}</p>
      <p className="portal-data stat-card__value">{value}</p>
    </div>
  );
}
