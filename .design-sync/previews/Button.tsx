import { Button } from 'resume-co'

export const Variants = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button>Build resume</Button>
    <Button variant="outline">See templates</Button>
    <Button variant="secondary">Import</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="destructive">Delete</Button>
    <Button variant="link">Learn more</Button>
  </div>
)

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <Button size="sm">Small</Button>
    <Button>Default</Button>
    <Button size="lg">Large</Button>
  </div>
)

export const States = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <Button>Enabled</Button>
    <Button disabled>Disabled</Button>
  </div>
)
