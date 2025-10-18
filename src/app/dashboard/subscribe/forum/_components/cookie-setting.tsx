'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
// import { updateCookieSettings } from "@/services/settings";
import { toast } from "sonner";
import { useState } from "react";

// This is the type definition based on your provided function


export function CookieSettingsDialog({ currentSettings }: { currentSettings: ForumCookie }) {
  const [open, setOpen] = useState(false);


  const handleSubmit = async (formData: FormData) => {
    const response = await fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({
        key: 'forumCookie',
        value: {
          javbus: formData.get('javbus'),
          southplus: formData.get('southplus'),
        },
      }),
    });
    if (response.ok) {
      toast.success('Cookie设置更新成功');
      setOpen(false);
    } else {
      toast.error('Cookie设置更新失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className=" w-full">
        <DialogHeader>
          <DialogTitle>论坛Cookie设置</DialogTitle>
          <DialogDescription>
            输入论坛的cookie，用于获取论坛的帖子列表。
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid w-full gap-3">
              <Label htmlFor="javbus">Javbus</Label>
              <Textarea placeholder="Type your message here." id="javbus" name="javbus" rows={5} className="h-[120px] resize-none" defaultValue={currentSettings?.javbus || ""} />
            </div>
            <div className="grid w-full gap-3">
              <Label htmlFor="southplus">南+</Label>
              <Textarea placeholder="Type your message here." id="southplus" name="southplus" rows={5} className="h-[120px] resize-none" defaultValue={currentSettings?.southplus || ""} />
            </div>
            
          </div>
          <DialogFooter>
            <Button type="submit" className="mt-4">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
