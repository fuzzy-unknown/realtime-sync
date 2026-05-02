import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { TextContent } from "./TextContent"
import { FileContent } from './FileContent'
import { TextIcon, FileIcon, MoonIcon, SunIcon, UsersIcon } from "lucide-react"
import { useSync } from "@/contexts/sync-context"
import { useTheme } from "@/hooks/use-theme"

export function TabsDemo() {
  const { isConnected, peers } = useSync()
  const { dark, toggle } = useTheme()
  const onlineCount = isConnected ? peers.length + 1 : 0

  return (
    <Tabs defaultValue="text" className="w-full h-full">
      <div className="flex items-center justify-between mb-2">
        <TabsList variant="line">
          <TabsTrigger value="text">
            <TextIcon size={14} />
            同步文本
          </TabsTrigger>
          <TabsTrigger value="file">
            <FileIcon size={14} />
            传输文件
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium ${
              isConnected
                ? "text-green-600 dark:text-green-400"
                : "text-gray-400"
            }`}
          >
            <UsersIcon size={13} />
            {isConnected ? `${onlineCount} 人在线` : "未连接"}
          </span>
          <button
            onClick={toggle}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
          >
            {dark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </div>
      </div>

      <TabsContent value="text">
        <TextContent />
      </TabsContent>
      <TabsContent value="file">
        <FileContent />
      </TabsContent>
    </Tabs>
  )
}
