import * as React from "react"
import { cn } from "@/lib/utils"

export interface StepperProps {
  steps: {
    id: number;
    name: string;
    completed?: boolean;
    current?: boolean;
  }[];
  className?: string;
}

export const Stepper = React.forwardRef<
  HTMLOListElement,
  React.HTMLAttributes<HTMLOListElement> & StepperProps
>(({ className, steps, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn("flex items-center w-full text-sm font-medium sm:text-base mb-8 relative", className)}
    {...props}
  >
    {/* Background line that spans the entire stepper */}
    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted-foreground/30 -translate-y-1/2"></div>
    
    {/* Progress line that fills based on current step */}
    <div 
      className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-500" 
      style={{ 
        width: `${(Math.max(0, steps.findIndex(s => s.current) || (steps.filter(s => s.completed).length)) / (steps.length - 1)) * 100}%` 
      }}
    ></div>
    
    {steps.map((step, index) => (
      <li
        key={step.id}
        className={cn(
          "flex items-center justify-center z-10 px-4 first:pl-0 last:pr-0",
          step.completed || step.current ? "text-primary" : "text-muted-foreground"
        )}
        style={{ width: `${100 / steps.length}%` }}
      >
        <div className="flex flex-col items-center whitespace-nowrap">
          <span 
            className={cn(
              "w-8 h-8 border rounded-full flex justify-center items-center mb-2 text-sm lg:w-10 lg:h-10 transition-colors",
              step.completed || step.current 
                ? "bg-primary border-primary/20 text-primary-foreground"
                : "bg-background border-muted-foreground/30 text-muted-foreground"
            )}
          >
            {step.id}
          </span>
          <span className="text-center">{step.name}</span>
        </div>
      </li>
    ))}
  </ol>
))

Stepper.displayName = "Stepper"