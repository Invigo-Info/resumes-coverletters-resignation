import { Separator } from 'resume-co'

export const Horizontal = () => (
  <div style={{ maxWidth: 280 }}>
    <div style={{ fontSize: 14, fontWeight: 600 }}>Experience</div>
    <Separator style={{ margin: '10px 0' }} />
    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Senior Product Manager, Datastream</div>
  </div>
)

export const Vertical = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 24 }}>
    <span style={{ fontSize: 13 }}>Resumes</span>
    <Separator orientation="vertical" />
    <span style={{ fontSize: 13 }}>Cover letters</span>
    <Separator orientation="vertical" />
    <span style={{ fontSize: 13 }}>Jobs</span>
  </div>
)
