import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon, XIcon } from "lucide-react";
import type { FileOffer } from "@/lib/types";
import { OFFER_TIMEOUT_MS } from "@/lib/constants";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileNotification({
  offer,
  onAccept,
  onReject,
}: {
  offer: FileOffer;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [remaining, setRemaining] = useState(OFFER_TIMEOUT_MS);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - offer.receivedAt;
      const left = Math.max(0, OFFER_TIMEOUT_MS - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onReject();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [offer.receivedAt, onReject]);

  const seconds = Math.ceil(remaining / 1000);
  const pct = (remaining / OFFER_TIMEOUT_MS) * 100;

  return (
    <Card className="w-72 shadow-lg">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{offer.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(offer.fileSize)} · 来自 {offer.fromPeerId.slice(0, 6)}
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground ml-2 shrink-0">
            {seconds}s
          </span>
        </div>

        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 cursor-pointer"
            onClick={onAccept}
          >
            <CheckIcon size={14} />
            接受
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={onReject}
          >
            <XIcon size={14} />
            拒绝
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
