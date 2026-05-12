import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  title,
  value,
  detail,
  loading,
}: {
  title: string;
  value: string;
  detail?: string | string[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-semibold">{value}</div>}
        {detail ? Array.isArray(detail) ? <>
          {detail.map((line) => (
            <p key={`${line}`} className="mt-2 text-xs text-muted-foreground">
              {line}
            </p>
          ))}
        </> :
          <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
          : null}
      </CardContent>
    </Card>
  );
}
