"use client"

import { Check, Tags } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type TabsSelectTab = {
  name: string
  genres: Array<string | { label?: string; name?: string; value?: string }>
}

function getGenreLabel(
  genre: string | { label?: string; name?: string; value?: string }
) {
  return typeof genre === "string"
    ? genre
    : genre.label || genre.name || genre.value || ""
}

export function TabsSelect({
  tabs,
  value,
  onValueChange,
  placeholder = "选择类型",
  className,
}: {
  tabs: TabsSelectTab[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const activeTab = tabs[0]?.name || ""

  return (
    <Select value={value || undefined} onValueChange={() => undefined}>
      <SelectTrigger className={cn("bg-background w-full", className)}>
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value || placeholder}
        </span>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="w-[min(720px,calc(100vw-2rem))] p-3"
      >
        {tabs.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">暂无类型选项</div>
        ) : (
          <Tabs defaultValue={activeTab} className="gap-3">
            <TabsList className="!h-auto w-full max-w-full flex-wrap justify-start overflow-visible rounded-2xl">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.name} value={tab.name}>
                  {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.name} value={tab.name}>
                <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
                  {tab.genres.map((genre, index) => {
                    const label = getGenreLabel(genre)
                    const selected = value === label

                    return (
                      <Button
                        key={`${tab.name}-${label}-${index}`}
                        type="button"
                        variant={selected ? "default" : "ghost"}
                        size="sm"
                        className="h-auto justify-start gap-2 whitespace-normal px-2 py-1.5 text-left"
                        onClick={() => onValueChange(label)}
                      >
                        {selected ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <Tags className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{label}</span>
                      </Button>
                    )
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </SelectContent>
    </Select>
  )
}
