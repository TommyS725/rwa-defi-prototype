import type { ComponentProps, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function FieldGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-5", className)} {...props} />;
}

function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm leading-none font-medium", className)} {...props} />;
}

function FieldDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function FieldError({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-destructive", className)} {...props} />;
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel };
