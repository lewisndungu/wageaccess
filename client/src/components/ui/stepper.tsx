import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

export interface StepperProps {
  steps: {
    id: number;
    name: string;
    completed?: boolean;
    current?: boolean;
  }[];
  className?: string;
}

const Stepper = ({ steps, className }: StepperProps) => {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="mx-auto flex max-w-3xl items-center">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            {/* Step with circle indicator */}
            <div className="flex flex-col items-center z-10">
              <div 
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
                  step.completed 
                    ? "bg-primary border-primary" 
                    : step.current
                      ? "border-primary bg-background"
                      : "border-muted-foreground/30 bg-background"
                )}
              >
                {step.completed ? (
                  <CheckIcon className="h-5 w-5 text-white" />
                ) : (
                  <span 
                    className={cn(
                      "text-sm font-medium", 
                      step.current ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step.id}
                  </span>
                )}
              </div>
              
              {/* Step label */}
              <div className="mt-2 text-center">
                <span 
                  className={cn(
                    "text-sm font-medium",
                    step.completed || step.current ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </div>
            </div>
            
            {/* Connecting line */}
            {idx < steps.length - 1 && (
              <div className="flex-1 mx-2">
                <div 
                  className={cn(
                    "h-0.5 w-full",
                    steps[idx].completed ? "bg-primary" : "bg-muted-foreground/30"
                  )} 
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export { Stepper }
export default Stepper;