import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileIcon, StopCircleIcon } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileReceivingProgress({
  fileName,
  fileSize,
  sent,
  total,
  onCancel,
}: {
  fileName: string;
  fileSize: number;
  sent: number;
  total: number;
  onCancel: () => void;
}) {
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;

  return (
    <Card className="w-72 shadow-lg">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <FileIcon size={18} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(sent)} / {formatSize(fileSize)}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
          >
            <StopCircleIcon size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>正在接收...</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
      </CardContent>
    </Card>
  );
}
