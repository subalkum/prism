import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { fqs } from "@/data/faq";
const FAQ = () => {
  return (
    <div className="my-36 grid md:grid-cols-2 md:px-32">
      <div className="">
        <h2 className="font-display text-3xl flex md:flex-col tracking-tight text-tx md:text-6xl">
            <span>
          Frequently 
            </span>
            <span>
          Asked Questions
            </span>
        </h2>
      </div>
      <div className="">
        <Accordion
          type="single"
          collapsible
          defaultValue="shipping"
          className="max-w-lg space-y-4"
          
        >
        {fqs.map((fq,i)=>(
          <AccordionItem value={i.toString()} className="text-2xl" key={i}>
            <AccordionTrigger className="text-xl ">{fq.question}</AccordionTrigger>
            <AccordionContent>
              {fq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
        </Accordion>
      </div>
    </div>
  );
};

export default FAQ;
