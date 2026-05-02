import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useSync } from "@/contexts/sync-context";

export function TextContent() {
  const { text, setText } = useSync();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full pt-4 flex flex-col" style={{ height: 320 }}>
      <Textarea
        className="flex-1 resize-none focus:ring-2 focus:ring-purple-700"
        placeholder="在此输入文本，将实时同步到其他页面..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-end shrink-0">
        <Button
          className="mt-4 cursor-pointer"
          size="lg"
          onClick={handleCopy}
          variant={copied ? "outline" : "default"}
        >
          {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          {copied ? "已复制" : "复制到剪切板"}
        </Button>
      </div>
    </div>
  );
}
