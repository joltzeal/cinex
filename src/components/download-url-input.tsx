"use client";

import { useFieldArray, Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Trash2, PlusCircle } from "lucide-react";
import { z } from "zod";

// 定义表单Schema
const formSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.instanceof(File)).optional(),
  downloadURLs: z.array(
    z.object({
      url: z.string().refine(val => val.trim() !== '', { message: "链接不能为空" }),
    })
  ).min(1, { message: "至少提供一个下载链接" }),
});

type FormSchemaType = z.infer<typeof formSchema>;

interface DownloadURLInputProps {
  control: Control<FormSchemaType>;
}

export const DownloadURLInput: React.FC<DownloadURLInputProps> = ({ control }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "downloadURLs",
  });

  return (
    <div>
      {fields.map((field, index) => (
        <FormField
          key={field.id}
          control={control}
          name={`downloadURLs.${index}.url`}
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 mb-2">
              <FormControl>
                <Input placeholder="https://example.com/file.zip" {...field} />
              </FormControl>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ url: "" })}
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        添加下载链接
      </Button>
    </div>
  );
};