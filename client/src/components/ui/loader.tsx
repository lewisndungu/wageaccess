import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const loaderVariants = cva(
  "animate-spin rounded-full border-t-transparent inline-block", 
  {
    variants: {
      variant: {
        default: "border-primary",
        secondary: "border-secondary",
        destructive: "border-destructive",
        muted: "border-muted-foreground"
      },
      size: {
        sm: "h-4 w-4 border-2",
        default: "h-8 w-8 border-2",
        lg: "h-12 w-12 border-4",
        xl: "h-16 w-16 border-4"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof loaderVariants> {
  fullPage?: boolean;
  text?: string;
}

const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, variant, size, fullPage, text, ...props }, ref) => {
    const loader = (
      <div
        className={cn(loaderVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );

    if (fullPage) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          {loader}
          {text && <p className="mt-4 text-sm text-muted-foreground">{text}</p>}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
        {loader}
        {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
      </div>
    );
  }
);

Loader.displayName = "Loader";

export { Loader, loaderVariants }; 