import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl bg-card"
      />
    </div>
  );
}

/** Label + arbitrary control (for pickers / autocompletes). */
export function FieldWrap({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
