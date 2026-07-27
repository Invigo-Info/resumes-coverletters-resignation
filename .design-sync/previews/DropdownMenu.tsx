import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, Button,
} from 'resume-co'

export const ResumeActions = () => (
  <DropdownMenu defaultOpen>
    <DropdownMenuTrigger render={<Button variant="outline">Options</Button>} />
    <DropdownMenuContent>
      <DropdownMenuGroup>
        <DropdownMenuLabel>Resume</DropdownMenuLabel>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuItem>
          Download
          <DropdownMenuShortcut>Ctrl D</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
