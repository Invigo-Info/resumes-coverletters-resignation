import { Input } from 'resume-co'

export const Default = () => <Input placeholder="you@example.com" style={{ maxWidth: 280 }} />

export const WithValue = () => <Input defaultValue="Marcus Chen" style={{ maxWidth: 280 }} />

export const Disabled = () => <Input placeholder="Unavailable" disabled style={{ maxWidth: 280 }} />

export const Invalid = () => <Input defaultValue="not-an-email" aria-invalid style={{ maxWidth: 280 }} />
