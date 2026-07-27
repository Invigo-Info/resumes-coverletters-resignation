import { Textarea, Label } from 'resume-co'

export const WithValue = () => (
  <Textarea
    defaultValue="Product designer with 9 years across fintech and consumer apps. I pair systems thinking with strong visual craft, and lead design from research through polished, shippable UI."
    style={{ maxWidth: 360 }}
  />
)

export const WithLabel = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
    <Label htmlFor="summary">Professional summary</Label>
    <Textarea id="summary" placeholder="Write a short summary of your experience..." />
  </div>
)
