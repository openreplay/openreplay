import * as React from "react";

import {Accordion as ShadAccordion, AccordionItem, AccordionContent, AccordionTrigger } from "@/shadcn-components/accordion";

type AccordionItemProps = {
  title: string;
  description: string;
}

type AccordionProps = {
  items: AccordionItemProps[];
}

const Accordion: React.FC<AccordionProps> = ({ items }) => {
  return (
    <ShadAccordion type="single" collapsible>
      {items.map((item, index) => (
        <AccordionItem key={index} value={`accordion-item-${index}`}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.description}</AccordionContent>
        </AccordionItem>
      ))}
    </ShadAccordion>
  );
};

Accordion.displayName = "Accordion";

export {Accordion};
