import { Badge } from 'resume-co'

export const Variants = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    <Badge>ATS-friendly</Badge>
    <Badge variant="secondary">Draft</Badge>
    <Badge variant="destructive">Expired</Badge>
    <Badge variant="outline">Remote</Badge>
    <Badge variant="ghost">Archived</Badge>
  </div>
)

export const StatusPills = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    <Badge>Premium</Badge>
    <Badge variant="secondary">Free plan</Badge>
    <Badge variant="outline">3 days left</Badge>
  </div>
)
