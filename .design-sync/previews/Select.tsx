import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'resume-co'

export const WorkType = () => (
  <Select defaultValue="remote">
    <SelectTrigger style={{ width: 200 }}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="remote">Remote</SelectItem>
      <SelectItem value="hybrid">Hybrid</SelectItem>
      <SelectItem value="onsite">On-site</SelectItem>
    </SelectContent>
  </Select>
)
