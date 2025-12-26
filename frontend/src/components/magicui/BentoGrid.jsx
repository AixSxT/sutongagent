import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";

export const BentoGrid = ({ children, className, ...props }) => {
  return (
    <div
      className={cn("grid w-full auto-rows-auto grid-cols-2 gap-4", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}) => (
  <div
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      "dark:bg-background transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
      className,
    )}
    {...props}
  >
    {background && <div>{background}</div>}
    <a
      className="z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-5"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <Icon className="text-neutral-700 h-12 w-12 origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-60" />
      <h3 className="text-neutral-700 dark:text-neutral-300 text-xl font-semibold">
        {name}
      </h3>
      <p className="text-neutral-400 max-w-lg">{description}</p>
    </a>

    <div className="pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
      <div className="pointer-events-auto">
        <a
          className="text-muted-foreground inline-flex items-center gap-2 text-sm"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
  </div>
);
