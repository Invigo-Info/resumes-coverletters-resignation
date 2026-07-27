import { Tabs, TabsList, TabsTrigger, TabsContent } from 'resume-co'

export const Default = () => (
  <Tabs defaultValue="resume" style={{ maxWidth: 360 }}>
    <TabsList>
      <TabsTrigger value="resume">Resume</TabsTrigger>
      <TabsTrigger value="cover">Cover letter</TabsTrigger>
      <TabsTrigger value="jobs">Jobs</TabsTrigger>
    </TabsList>
    <TabsContent value="resume">
      <p style={{ margin: '10px 0 0', color: 'var(--muted-foreground)' }}>
        Edit your resume sections and preview changes live.
      </p>
    </TabsContent>
    <TabsContent value="cover"><p>Cover letter</p></TabsContent>
    <TabsContent value="jobs"><p>Jobs</p></TabsContent>
  </Tabs>
)

export const Line = () => (
  <Tabs defaultValue="all" style={{ maxWidth: 360 }}>
    <TabsList variant="line">
      <TabsTrigger value="all">All</TabsTrigger>
      <TabsTrigger value="saved">Saved</TabsTrigger>
      <TabsTrigger value="applied">Applied</TabsTrigger>
    </TabsList>
    <TabsContent value="all">
      <p style={{ margin: '10px 0 0', color: 'var(--muted-foreground)' }}>128 matching jobs.</p>
    </TabsContent>
    <TabsContent value="saved"><p>Saved</p></TabsContent>
    <TabsContent value="applied"><p>Applied</p></TabsContent>
  </Tabs>
)
