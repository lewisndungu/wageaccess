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
      <div className="relative flex justify-between">
        {/* Connector lines first (in background) */}
        <div className="absolute top-5 left-0 right-0 flex">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            // Don't render a line after the last step
            if (isLast) return null;

            const nextStepCompleted = steps[idx + 1]?.completed;
            const nextStepCurrent = steps[idx + 1]?.current;
            const isActive = step.completed || (nextStepCompleted || nextStepCurrent);

            return (
              <div key={`line-${idx}`} className="flex-1">
                <div className={cn(
                  "h-px w-full",
                  isActive ? "bg-primary" : "bg-muted-foreground/30"
                )} />
              </div>
            );
          })}
        </div>

        {/* Steps with circles and labels */}
        {steps.map((step, idx) => {
          const isActive = step.current;
          const isCompleted = step.completed;

          return (
            <div key={step.id} className="flex flex-col items-center z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex justify-center items-center border-2 bg-background",
                  isCompleted
                    ? "bg-primary border-primary text-white"
                    : isActive
                      ? "border-primary text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>

              <span
                className={cn(
                  "mt-2 text-sm font-medium",
                  isCompleted || isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { Stepper }
export default Stepper;