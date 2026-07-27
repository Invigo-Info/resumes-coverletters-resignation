import { Label, Input } from 'resume-co'

export const FormField = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 280 }}>
    <Label htmlFor="job-title">Job title</Label>
    <Input id="job-title" placeholder="Senior Product Designer" />
  </div>
)

export const Required = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 280 }}>
    <Label htmlFor="email">Email address</Label>
    <Input id="email" type="email" placeholder="you@example.com" />
  </div>
)
