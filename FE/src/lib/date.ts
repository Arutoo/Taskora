export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function formatDueDate(iso: string): { text: string; urgent: boolean } {
  const d = new Date(iso);
  const now = new Date();
  if (Number.isNaN(d.getTime())) return { text: iso, urgent: false };

  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, urgent: true };
  if (diffDays === 0) return { text: "Due today", urgent: true };
  if (diffDays === 1) return { text: "Due tomorrow", urgent: true };
  return { text: `Due in ${diffDays}d`, urgent: diffDays <= 3 };
}
