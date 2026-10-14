// Company initials get a color picked from the name, so the same company
// always looks the same.
const AVATAR_COLORS = [
  "bg-primary-100 text-primary-700",
  "bg-blue-50 text-blue-700",
  "bg-rose-50 text-rose-600",
  "bg-purple-50 text-purple-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
];

export function CompanyAvatar({ name }: { name: string }) {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${AVATAR_COLORS[hash % AVATAR_COLORS.length]}`}
      aria-hidden="true"
    >
      {name[0]}
    </span>
  );
}
