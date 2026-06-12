import { Download, Plus, ChevronRight, Share2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import {
  PrimaryButton,
  GhostButton,
  AiButton,
} from "@/components/brand/brand-buttons";
import { PageShell } from "@/components/layout/page-shell";
import { HelpPill } from "@/components/layout/help-pill";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function Swatch({
  name,
  className,
  hint,
}: {
  name: string;
  className: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className={`h-16 w-full rounded-xl ring-1 ring-border ${className}`} />
      <p className="text-sm font-medium text-foreground">{name}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-2xl font-extrabold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-12">
        <header className="space-y-2">
          <LogoMark />
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
            Design System
          </h1>
          <p className="text-muted-foreground">
            Phase 1 — tokens & primitives for the resume.co clone.
          </p>
        </header>

        <Section title="Brand colors">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="Primary blue" className="bg-primary" hint="CTAs" />
            <Swatch name="Background" className="bg-background" hint="page" />
            <Swatch name="Card" className="bg-card" hint="surfaces" />
            <Swatch name="Secondary" className="bg-secondary" hint="gray pill" />
            <Swatch name="Muted fg" className="bg-muted-foreground" hint="text" />
            <Swatch name="Accent" className="bg-accent" hint="light blue" />
            <Swatch name="Destructive" className="bg-destructive" hint="delete" />
            <Swatch name="Border" className="bg-border" />
          </div>
        </Section>

        <Section title="Gradients">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Swatch
              name="Logo (teal→blue)"
              className="bg-gradient-logo"
              hint=".bg-gradient-logo"
            />
            <Swatch
              name="AI (violet→fuchsia)"
              className="bg-gradient-ai"
              hint=".bg-gradient-ai"
            />
            <Swatch
              name="Progress (orange→lime)"
              className="bg-gradient-progress"
              hint=".bg-gradient-progress"
            />
          </div>
        </Section>

        <Section title="Typography">
          <div className="space-y-3 rounded-2xl bg-card p-6 shadow-card">
            <p className="font-heading text-5xl font-extrabold tracking-tight">
              How should we start?
            </p>
            <p className="font-heading text-2xl font-bold">
              Heading — Gabarito Bold
            </p>
            <p className="text-base text-foreground">
              Body — Inter regular. Fill in your details and the job title you
              are aiming for to make a clear first impression.
            </p>
            <p className="text-sm text-muted-foreground">
              Muted — secondary helper text used under labels and titles.
            </p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-6 shadow-card">
            <PrimaryButton>
              <Download /> Download
            </PrimaryButton>
            <PrimaryButton>
              Next <ChevronRight />
            </PrimaryButton>
            <GhostButton>
              <Share2 /> Share
            </GhostButton>
            <GhostButton>
              <Plus /> Create new resume
            </GhostButton>
            <AiButton>Write with AI</AiButton>
            <span className="text-gradient-ai font-semibold">
              Tailor this resume →
            </span>
          </div>
        </Section>

        <Section title="Card, inputs & badges">
          <Card className="max-w-md space-y-4 p-6">
            <div className="space-y-1.5">
              <Label htmlFor="first">First name</Label>
              <Input id="first" placeholder="John" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Skillful</Badge>
              <Badge className="bg-emerald-100 text-emerald-700">+12%</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Progress 48%</p>
              <Progress value={48} />
            </div>
          </Card>
        </Section>

        <Section title="Elevation">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card p-6 shadow-card">
              <p className="text-sm font-medium">.shadow-card</p>
            </div>
            <div className="rounded-2xl bg-card p-6 shadow-card-lg">
              <p className="text-sm font-medium">.shadow-card-lg</p>
            </div>
          </div>
        </Section>
      </div>
      <HelpPill />
    </PageShell>
  );
}
