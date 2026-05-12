import { ExternalLinkIcon } from "lucide-react";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function ExternalLink({
  children,
  className,
  ...props
}: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>) {
  return (
    <a
      className={cn("inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline", className)}
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
      <ExternalLinkIcon className="h-3.5 w-3.5" />
    </a>
  );
}
