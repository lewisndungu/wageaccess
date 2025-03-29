import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

// --- Stepper Context ---

interface StepperContextProps {
  currentStep: number;
  steps: { id: number; label: string }[];
  // Can add functions later if needed, e.g., goToStep: (stepId: number) => void;
}

const StepperContext = React.createContext<StepperContextProps | undefined>(undefined);

const useStepper = () => {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error("useStepper must be used within a Stepper component");
  }
  return context;
};

// --- Stepper Component ---

export interface StepperProps {
  initialStep?: number; // Keep for potential default, though process.tsx controls it
  currentStep: number; // Controlled from outside
  steps: { id: number; label: string }[]; // Renamed 'label' based on process.tsx usage
  children?: React.ReactNode;
  className?: string;
}

const Stepper = ({
  initialStep, // Not used directly if currentStep is controlled
  currentStep,
  steps,
  children,
  className,
}: StepperProps) => {
  const contextValue = { currentStep, steps };

  const renderNavigation = () => {
    const visualSteps = steps.map(step => ({
        id: step.id,
        name: step.label, // Map label to name for visual rendering
        current: step.id === currentStep,
        completed: step.id < currentStep, // Assumes steps are sequential
    }));

    return (
      <div className={cn("w-full py-4", className)}>
        <div className="relative flex justify-between">
          {/* Connector lines */}
          <div className="absolute top-5 left-0 right-0 flex">
            {visualSteps.map((step, idx) => {
              const isLast = idx === visualSteps.length - 1;
              if (isLast) return null;

              const nextStepCompleted = visualSteps[idx + 1]?.completed;
              const nextStepCurrent = visualSteps[idx + 1]?.current;
              // Line is active if current step is completed OR the next step is active/completed
              const isActive = step.completed || nextStepCompleted || nextStepCurrent;

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

          {/* Step indicators */}
          {visualSteps.map((step) => {
            const isActive = step.current;
            const isCompleted = step.completed;

            return (
              <div key={step.id} className="flex flex-col items-center z-10">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex justify-center items-center border-2 bg-background transition-all duration-300",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground" // Use primary-foreground for text on primary bg
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
                    "mt-2 text-sm text-center font-medium transition-colors duration-300", // Added text-center
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
  };

  const activeStepContent = React.Children.toArray(children).find(child =>
    React.isValidElement(child) && child.props.step === currentStep
  );

  return (
    <StepperContext.Provider value={contextValue}>
      <div className={cn("w-full flex flex-col", className)}>
        {renderNavigation()}
        <div className="mt-4"> {/* Content area */}
          {activeStepContent}
        </div>
         {/* Find and render StepperFooter if present */}
         {React.Children.toArray(children).find(child =>
           React.isValidElement(child) && (child.type as any).displayName === 'StepperFooter'
         )}
      </div>
    </StepperContext.Provider>
  );
};

// --- StepperItem Component ---

interface StepperItemProps {
  step: number;
  children: React.ReactNode;
  className?: string;
}

const StepperItem = ({ children, className }: StepperItemProps) => {
  // This component just holds the content for a step.
  // The Stepper component decides whether to render it.
  return <div className={cn(className)}>{children}</div>;
};
StepperItem.displayName = "StepperItem"; // Identify this component type in Stepper

// --- StepperFooter Component ---

interface StepperFooterProps {
  children: React.ReactNode;
  className?: string;
}

const StepperFooter = ({ children, className }: StepperFooterProps) => {
  // useStepper(); // Can use context here if footer needs step info (e.g., disable buttons)
  return (
    <div className={cn("mt-6 pt-4 border-t flex justify-between items-center", className)}>
      {children}
    </div>
  );
};
StepperFooter.displayName = "StepperFooter"; // Identify this component type in Stepper


// --- Exports ---
export { Stepper, StepperItem, StepperFooter, useStepper };
// Remove default export if it causes issues with named imports
// export default Stepper;