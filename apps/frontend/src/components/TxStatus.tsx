import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ExternalLink } from "@/components/ExternalLink";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TxStatus({
  hash,
  txUrl,
  ccipUrl,
  pending,
  success,
  error,
}: {
  hash?: string;
  txUrl?: string;
  ccipUrl?: string;
  pending?: boolean;
  success?: boolean;
  error?: Error | null;
}) {
  if (!hash && !pending && !success && !error) return null;
  return (
    <Alert>
      <AlertTitle className="flex items-center gap-2">
        {pending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
        {success ? <CheckCircle2 data-icon="inline-start" className="text-emerald-600" /> : null}
        {error ? <XCircle data-icon="inline-start" className="text-destructive" /> : null}
        Transaction status
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        {pending ? <p>Waiting for confirmation.</p> : null}
        {success ? <p>Transaction confirmed.</p> : null}
        {error ? (
          <p>
            There was an error.{" "}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-auto p-0 align-baseline" variant="link">
                  View details
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transaction error</DialogTitle>
                  <DialogDescription>The full wallet or contract error is shown below.</DialogDescription>
                </DialogHeader>
                <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap text-foreground">
                  {error.message}
                </pre>
              </DialogContent>
            </Dialog>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {hash && txUrl ? <ExternalLink href={txUrl}>View transaction</ExternalLink> : null}
          {ccipUrl ? <ExternalLink href={ccipUrl}>View CCIP message</ExternalLink> : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}
