export function StatCard({ label, value }) {
  return (
    <div className="portal-card min-w-0 p-4 sm:p-5">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="portal-data mt-2 break-words text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
