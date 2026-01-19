"use client";

import React, { useState, useEffect } from "react";
import { Key, Copy, Eye, EyeOff, Settings2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// 1. 定义接口


interface TelegramConfigSectionProps {
  // 从父组件传入的当前设置
  settings: TelegramConfig; 
  // 父组件处理保存逻辑
  onSave: (newSettings: TelegramConfig) => void; 
}

export function TelegramConfigSection({ settings, onSave }: TelegramConfigSectionProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<TelegramConfig>(settings);
  console.log(formData);
  
  const [showToken, setShowToken] = useState(false);

  // 当弹窗打开时，重置表单数据为当前 settings (回显)
  useEffect(() => {
    if (open) {
      setFormData(settings);
    }
  }, [open, settings]);

  const hasConfig = !!settings.botToken;

  const handleSave = () => {
    onSave(formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* --- Trigger: 右上角的卡片 --- */}
      <Card className={`py-1 bg-card border-border shadow-sm md:col-span-2 group relative overflow-hidden ${!hasConfig ? "border-yellow-500/50" : ""}`}>
        {/* 未配置时的背景装饰 */}
        {!hasConfig && (
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle size={120} className="text-yellow-500" />
           </div>
        )}
        
        <CardContent className="p-5 h-32 flex flex-col justify-between relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm font-medium">Telegram Configuration</span>
              {hasConfig ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] px-1.5 py-0">Active</Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] px-1.5 py-0">Missing Config</Badge>
              )}
            </div>
            <Settings2 className="text-muted-foreground" size={18} />
          </div>

          <div className="flex items-center gap-3 mt-2">
            {hasConfig ? (
              // 状态 1: 已配置，显示 Masked Token
              <div className="flex-1 bg-muted border border-border rounded-md px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Key size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-xs font-mono select-none">TOKEN:</span>
                  <code className="font-mono text-sm tracking-wider truncate">
                    {settings.botToken.substring(0, 6)}...{settings.botToken.slice(-6)}
                  </code>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                  <Copy size={14} />
                </Button>
              </div>
            ) : (
              // 状态 2: 未配置，显示警告提示
              <div className="flex-1 bg-yellow-500/5 border border-yellow-500/20 rounded-md px-3 py-2 flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                <AlertTriangle size={16} />
                <span className="text-xs font-medium">Bot Token not configured</span>
              </div>
            )}

            {/* 编辑按钮 (Trigger) */}
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className={!hasConfig ? "border-yellow-500/30 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10" : ""}>
                {hasConfig ? "Edit" : "Setup"}
              </Button>
            </DialogTrigger>
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">
            {hasConfig ? "API connected. Webhook active." : "Required for bot functionality."}
          </p>
        </CardContent>
      </Card>

      {/* --- Dialog: 设置表单 --- */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Telegram Settings</DialogTitle>
          <DialogDescription>
            Configure your Telegram Application credentials. These can be found in my.telegram.org.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* API ID */}
          <div className="grid gap-2">
            <Label htmlFor="apiId">API ID</Label>
            <Input
              id="apiId"
              placeholder="e.g. 12345678"
              value={formData.apiId}
              onChange={(e) => setFormData({ ...formData, apiId: e.target.value })}
            />
          </div>

          {/* API Hash */}
          <div className="grid gap-2">
            <Label htmlFor="apiHash">API Hash</Label>
            <Input
              id="apiHash"
              type="text" // Hash 通常作为密钥隐藏，也可改为 text
              placeholder="e.g. a1b2c3d4..."
              value={formData.apiHash}
              onChange={(e) => setFormData({ ...formData, apiHash: e.target.value })}
            />
          </div>

          {/* Bot Token (带显示/隐藏切换) */}
          <div className="grid gap-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <div className="relative">
              <Input
                id="botToken"
                type="text"
                placeholder="e.g. 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                value={formData.botToken}
                onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}