import { useState } from "react";
import { Button } from "./ui/button";
import { ForwardIcon, XIcon, FileIcon, StopCircleIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSync } from "@/contexts/sync-context";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileContent() {
  const [files, setFiles] = useState<File[]>([]);
  const { sendFile, outgoingTransfers, cancelSend } = useSync();

  const handleShare = () => {
    for (const f of files) sendFile(f);
    setFiles([]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const transfers = Array.from(outgoingTransfers.entries());

  return (
    <div className="w-full pt-4 flex flex-col" style={{ height: 320 }}>
      {/* Drop zone / file picker */}
      <label className="flex-1 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-muted-foreground/50 transition-colors">
        <FileIcon size={28} className="text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground">
          点击选择文件或拖拽到此处
        </span>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const newFiles = e.target.files ? Array.from(e.target.files) : [];
            setFiles((prev) => [...prev, ...newFiles]);
            e.target.value = "";
          }}
        />
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-1.5"
            >
              <FileIcon size={14} className="shrink-0 text-muted-foreground" />
              <span className="truncate flex-1">{f.name}</span>
              <span className="text-muted-foreground shrink-0">
                {formatSize(f.size)}
              </span>
              <button
                onClick={() => removeFile(i)}
                className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                <XIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Share button */}
      <div className="flex justify-end shrink-0">
        <Button
          className="mt-4 cursor-pointer"
          size="lg"
          disabled={files.length === 0}
          onClick={handleShare}
        >
          <ForwardIcon size={16} />
          共享 ({files.length})
        </Button>
      </div>

      {/* Transfer progress */}
      {transfers.length > 0 && (
        <div className="mt-2 space-y-2 border-t pt-3">
          <p className="text-sm font-medium">传输中</p>
          {transfers.map(([transferId, transfer]) => {
            const totalProgress = Array.from(
              transfer.progress.values()
            ).reduce(
              (acc, p) => ({
                sent: acc.sent + p.sent,
                total: acc.total || p.total,
              }),
              { sent: 0, total: 0 }
            );
            const pct =
              totalProgress.total > 0
                ? Math.round(
                    (totalProgress.sent /
                      totalProgress.total /
                      transfer.acceptedBy.length) *
                      100
                  )
                : 0;

            return (
              <div key={transferId} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="truncate">{transfer.file.name}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-muted-foreground">
                      {transfer.acceptedBy.length} 个接收方 · {pct}%
                    </span>
                    <button
                      onClick={() => cancelSend(transferId)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <StopCircleIcon size={16} />
                    </button>
                  </div>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
