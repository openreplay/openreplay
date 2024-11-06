import * as React from "react";

import {
  Accordion as ShadAccordion,
  AccordionItem,
  AccordionContent,
  AccordionTrigger,
} from "@/shadcn-components/accordion";

type AccordionItemProps = {
  title: string;
  description: string;
};

type AccordionProps = {
  items: AccordionItemProps[];
};

const Accordion: React.FC<AccordionProps> = ({ items }) => {
  return (
    <ShadAccordion type="single" collapsible>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          value={`accordion-item-${index}`}
          className="hover:bg-accordion-background-hover px-4 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent className="text-accordion-description">
            {item.description}
          </AccordionContent>
        </AccordionItem>
      ))}
    </ShadAccordion>
  );
};

Accordion.displayName = "Accordion";

export { Accordion };
