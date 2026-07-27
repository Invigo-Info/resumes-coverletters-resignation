import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'resume-co'

export const FAQ = () => (
  <Accordion defaultValue={['ats']} style={{ maxWidth: 400 }}>
    <AccordionItem value="ats">
      <AccordionTrigger>Is my resume ATS-friendly?</AccordionTrigger>
      <AccordionContent>
        Every template is structured plain text in reading order, so applicant tracking systems parse it correctly.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="edit">
      <AccordionTrigger>Can I edit after downloading?</AccordionTrigger>
      <AccordionContent>
        Yes. Your resume is saved to your account, so you can re-edit and download it anytime.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="cancel">
      <AccordionTrigger>How do I cancel my plan?</AccordionTrigger>
      <AccordionContent>Manage your subscription from Account settings and cancel in one click.</AccordionContent>
    </AccordionItem>
  </Accordion>
)
