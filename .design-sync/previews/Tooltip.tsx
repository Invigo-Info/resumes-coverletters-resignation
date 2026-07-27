import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, Button } from 'resume-co'

export const AtsScore = () => (
  <TooltipProvider>
    <Tooltip defaultOpen>
      <TooltipTrigger render={<Button variant="outline">ATS score</Button>} />
      <TooltipContent>Your resume scores 92 / 100 for ATS compatibility.</TooltipContent>
    </Tooltip>
  </TooltipProvider>
)
