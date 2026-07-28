export function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{desc}</p>
    </div>
  );
}