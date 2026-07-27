import { ScrollArea } from 'resume-co'

export const JobList = () => (
  <ScrollArea
    className="ring-1 ring-foreground/10"
    style={{ height: 180, width: 280, borderRadius: 10 }}
  >
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        'Senior PM — Datastream',
        'Product Manager — Helix Labs',
        'Product Manager — Northwind',
        'Growth PM — Kite Financial',
        'Group PM — Meridian',
        'Staff PM — Nimbus Data',
        'Product Lead — Loop & Co.',
        'Principal PM — Aurora',
      ].map((j) => (
        <div key={j} style={{ fontSize: 13 }}>{j}</div>
      ))}
    </div>
  </ScrollArea>
)
