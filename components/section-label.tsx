/** A plain section label, shared by every section. */
export function SectionLabel({ name, className = "" }: { name: string; className?: string }) {
  return <p className={`sec-label ${className}`}>{name}</p>;
}
