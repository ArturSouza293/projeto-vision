export function StepHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle && <p className="mt-1.5 max-w-2xl text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
