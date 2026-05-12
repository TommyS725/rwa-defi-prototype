import { Separator } from "@/components/ui/separator";

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 py-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="break-all text-right text-sm font-medium">{value}</span>
      </div>
      <Separator />
    </div>
  );
}
