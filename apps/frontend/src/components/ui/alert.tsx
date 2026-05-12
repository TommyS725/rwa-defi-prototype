import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Alert = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border bg-card p-4 text-sm", className)} {...props} />
));
Alert.displayName = "Alert";

export const AlertTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h5 ref={ref} className={cn("mb-1 font-medium", className)} {...props} />,
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-muted-foreground", className)} {...props} />,
);
AlertDescription.displayName = "AlertDescription";
