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
    className={cn("flex items-center w-full text-sm text-gray-500 font-medium sm:text-base mb-12", className)}
    {...props}
  >
    {steps.map((step, index) => (
      <li
        key={step.id}
        className={cn(
          "flex md:w-full items-center",
          step.completed || step.current ? "text-indigo-600" : "text-gray-600",
          index < steps.length - 1 
            ? "sm:after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-4 xl:after:mx-8" 
            : ""
        )}
      >
        <div className="flex items-center whitespace-nowrap after:content-['/'] sm:after:hidden after:mx-2">
          <span 
            className={cn(
              "w-6 h-6 border rounded-full flex justify-center items-center mr-3 text-sm lg:w-10 lg:h-10",
              step.completed || step.current 
                ? "bg-indigo-600 border-indigo-200 text-white"
                : "bg-gray-100 border-gray-200 text-gray-600"
            )}
          >
            {step.id}
          </span>
          {step.name}
        </div>
      </li>
    ))}
  </ol>
))

Stepper.displayName = "Stepper"