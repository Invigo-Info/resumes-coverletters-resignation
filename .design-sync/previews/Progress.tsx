import { Progress, ProgressLabel, ProgressValue } from 'resume-co'

export const ResumeStrength = () => (
  <div style={{ maxWidth: 320 }}>
    <Progress value={68}>
      <ProgressLabel>Resume strength</ProgressLabel>
      <ProgressValue />
    </Progress>
  </div>
)

export const Steps = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 320 }}>
    <Progress value={25} />
    <Progress value={60} />
    <Progress value={100} />
  </div>
)
