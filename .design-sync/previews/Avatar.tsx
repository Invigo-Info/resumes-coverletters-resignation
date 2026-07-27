import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from 'resume-co'

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Avatar size="sm"><AvatarFallback>AN</AvatarFallback></Avatar>
    <Avatar><AvatarFallback>MC</AvatarFallback></Avatar>
    <Avatar size="lg"><AvatarFallback>SM</AvatarFallback></Avatar>
  </div>
)

export const Group = () => (
  <AvatarGroup>
    <Avatar><AvatarFallback>AN</AvatarFallback></Avatar>
    <Avatar><AvatarFallback>MC</AvatarFallback></Avatar>
    <Avatar><AvatarFallback>SM</AvatarFallback></Avatar>
    <AvatarGroupCount>+3</AvatarGroupCount>
  </AvatarGroup>
)
