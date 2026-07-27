import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction,
  Button, Badge,
} from 'resume-co'

export const ResumeCard = () => (
  <Card style={{ maxWidth: 360 }}>
    <CardHeader>
      <CardTitle>Product Manager Resume</CardTitle>
      <CardDescription>Last edited 2 days ago</CardDescription>
      <CardAction>
        <Badge>ATS-friendly</Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
        Tailored for senior B2B SaaS roles. Resume strength 68%.
      </p>
    </CardContent>
    <CardFooter>
      <Button size="sm">Edit</Button>
      <Button size="sm" variant="outline" style={{ marginLeft: 8 }}>
        Download
      </Button>
    </CardFooter>
  </Card>
)

export const Simple = () => (
  <Card size="sm" style={{ maxWidth: 300 }}>
    <CardHeader>
      <CardTitle>Cover letter</CardTitle>
      <CardDescription>Draft for Northwind Technologies</CardDescription>
    </CardHeader>
    <CardContent>
      <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
        Generated from your resume and the job description.
      </p>
    </CardContent>
  </Card>
)
