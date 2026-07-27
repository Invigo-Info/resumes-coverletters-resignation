import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button,
} from 'resume-co'

export const DownloadDialog = () => (
  <Dialog defaultOpen>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Download your resume</DialogTitle>
        <DialogDescription>
          Your resume will be exported as an ATS-friendly PDF with selectable text.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter showCloseButton>
        <Button>Download PDF</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
