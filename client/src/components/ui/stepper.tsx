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
      <div className="mx-auto flex max-w-3xl justify-between">
        {steps.map((step, idx) => {
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div className="flex items-center justify-center relative">
                {/* Line before the first step is not needed */}
                {idx !== 0 && (
                  <div 
                    className={cn(
                      "absolute right-full w-full border-t mr-4",
                      step.completed || step.current ? "border-primary" : "border-muted-foreground/30"
                    )}
                  />
                )}
                
                {/* Circle indicator */}
                <div 
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
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
                
                {/* Line after the last step is not needed */}
                {idx !== steps.length - 1 && (
                  <div 
                    className={cn(
                      "absolute left-full w-full border-t ml-4",
                      steps[idx + 1].completed || steps[idx + 1].current ? "border-primary" : "border-muted-foreground/30"
                    )}
                  />
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
          );
        })}
      </div>
    </div>
  );
}

export { Stepper }
export default Stepper;