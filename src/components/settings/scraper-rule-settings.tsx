'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// 导入 shadcn/ui 组件
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Info } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Folder, File } from 'lucide-react'; // 使用图标增强视觉效果
import { variableRegex } from '@/lib/parse/file-number-parser';
const EXAMPLE_VALUES: Record<string, string> = {
  title: '極品巨乳女優三上悠亞持續強硬挑逗 敏感身體扭動春藥高潮大絶頂性愛',
  originaltitle: 'Robot Dreams',
  actor: '三上悠亜',
  all_actor: '三上悠亜, 蒂托·罗伯特',
  first_actor: '三上悠亜',
  number: 'SSNI-939',
  letters: 'SSNI',
  first_letter: 'S',
  director: 'キョウセイ',
  series: '恍惚キメセク大絶頂FUCK',
  studio: '梦工厂动画',
  publisher: '环球影业',
  release: '2020-12-17',
  year: '2020',
  runtime: '153',
};
// const tagsEnum = [
//   'title', 'originaltitle', 'actor', 'all_actor', 'first_actor', 'number', 'letters', 'first_letter',
//   'director', 'series', 'studio', 'publisher', 'release', 'year', 'runtime', '4k'
// ];
// // 创建一个正则表达式，它只会匹配 {有效的变量} 或 [有效的变量]
// const variableRegex = new RegExp(`(${tagsEnum.join('|')})`, 'gi');


// --- 类型与 Schema 定义 ---
const tags = [
  'title （标题）',
  'originaltitle （原标题）',
  'actor （女演员）',
  'all_actor （男女演员）',
  'first_actor （首位演员）',
  'number （番号）',
  'letters （番号前缀）',
  'first_letter （番号首字符）',
  'director （导演）',
  'series （系列）',
  'studio （片商）',
  'publisher （发行商）',
  'release （发行日期）',
  'year （年代）',
  'runtime （时长）',
  '4K （4K）'
] as const;
// 水印类型选项，方便在 UI 中渲染
const watermarkItems = [
  { id: 'subtitles', label: '字幕' },
  { id: 'cracked', label: '破解' },
  { id: 'leaked', label: '流出' },
  { id: 'uncensored', label: '无码' },
] as const;

const scraperRuleSchema = z.object({
  // 命名规则
  fileNamingRule: z.string().min(1, '文件命名规则不能为空'),
  directoryRule: z.string().min(1, '目录规则不能为空'),
  nfoTitleRule: z.string().min(1, 'NFO 标题规则不能为空'),

  // 功能开关
  downloadFanart: z.boolean(),
  enableAiTranslation: z.boolean(),

  // 水印类型 (存储一个字符串数组)
  watermarkTypes: z.array(z.string()),

  // 清理规则
  cleanupExtensions: z.string(),
  cleanupFilenameContains: z.string(),
  cleanupMinFileSize: z.number().min(0, '文件大小不能为负').optional(),
});

type ScraperRuleFormValues = z.infer<typeof scraperRuleSchema>;

interface ScraperRuleSettingsProps {
  initialData?: ScraperRuleFormValues | null;
}
// =================================================================
// ✨ 核心重构：可复用的解析函数与专用预览组件
// =================================================================

/**
 * 核心复用函数：接收任何规则字符串，返回替换了示例值的结果。
 * @param rule 用户输入的规则，例如 'year/[number]-actor'
 * @returns 替换后的字符串，例如 '2020/[SSNI-939]-三上悠亜'
 */
const generateExampleFromRule = (rule: string): string => {
  if (!rule || !rule.trim()) {
    return '';
  }
  return rule.replace(variableRegex, (matchedWord) => {
    if (Object.prototype.hasOwnProperty.call(EXAMPLE_VALUES, matchedWord)) {
      return EXAMPLE_VALUES[matchedWord as keyof typeof EXAMPLE_VALUES];
    }
    return matchedWord;
  });
};

/**
 * 预览组件 1：用于显示简单的单行文本预览
 */
const SimpleTextPreview = ({ rule, label }: { rule: string; label: string }) => {
  const exampleText = generateExampleFromRule(rule);
  if (!exampleText) {
    return null;
  }
  return (
    <div className="p-2 mt-2 border rounded-md bg-muted text-sm break-all">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-semibold">{exampleText}.mp4</span>
    </div>
  );
};
type TreeNode = {
  name: string;
  children: TreeNode[];
};
const DirectoryTree = ({ node }: { node: TreeNode }) => {
  const isFolder = node.children.length > 0;
  return (
    <li style={{ listStyleType: 'none' }}>
      <div className="flex flex-row justify-start items-center"><Folder className="w-4 h-4 mr-2" /> {node.name}</div>
      {isFolder && (
        <ul style={{ paddingLeft: '20px', margin: 0, listStyleType: 'none' }}>
          {node.children.map((child, index) => (
            <DirectoryTree key={index} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
};
const DirectoryTreePreview = ({ rule }: { rule: string }) => {
  const examplePath = generateExampleFromRule(rule);
  if (!examplePath) {
    return null;
  }

  const pathSegments = examplePath.split("/").filter(p => p);

  // 如果没有路径分隔符，只显示一个文件
  if (pathSegments.length <= 1) {
    return (
      <div className="p-2 mt-2 border rounded-md bg-muted text-sm break-all">
        <ul style={{ padding: 0, margin: 0 }}>
          <DirectoryTree node={{ name: examplePath, children: [] }} />
        </ul>
      </div>
    );
  }

  // 构建树形数据结构
  const root: TreeNode = { name: pathSegments[0], children: [] };
  let currentNode = root;
  for (let i = 1; i < pathSegments.length; i++) {
    const newNode: TreeNode = { name: pathSegments[i], children: [] };
    currentNode.children.push(newNode);
    currentNode = newNode;
  }

  // 准备示例路径的显示
  const finalPathSegments = examplePath.split('/');
  const lastSegment = finalPathSegments.pop() || '';
  const directoryPath = finalPathSegments.length > 0 ? `/${finalPathSegments.join('/')}/` : '/';

  return (
    <div>

      <p className="text-sm font-medium mt-4">预览:</p>
      <div className="p-2 mt-1 border rounded-md bg-muted">
        <ul style={{ padding: 0, margin: 0 }}>
          <DirectoryTree node={root} />
        </ul>
      </div>
    </div>
  );
};

// const parseAndRenderDirectoryRule = (rule: string) => {
//   if (!rule.trim()) {
//     return null;
//   }

//   // 1. 使用正则表达式全局匹配所有有效的变量名 (例如: 'title', 'actor', 'year' 等)
//   const variableRegex = new RegExp(`(${tagsEnum.join('|')})`, 'g');

//   // 2. 使用 replace 方法，将所有匹配到的变量名替换成示例值
//   const examplePath = rule.replace(variableRegex, (matchedWord) => {
//     // 检查匹配到的单词是否是 EXAMPLE_VALUES 中的一个键
//     if (Object.prototype.hasOwnProperty.call(EXAMPLE_VALUES, matchedWord)) {
//       return EXAMPLE_VALUES[matchedWord as keyof typeof EXAMPLE_VALUES];
//     }
//     // 如果不是一个有效的变量名，则保持原样
//     return matchedWord;
//   });

//   const pathSegments = examplePath.split("/").filter(p => p);
//   if (pathSegments.length === 0) {
//     return null;
//   }

//   // 3. 构建树结构 (此部分逻辑不变)
//   const root: TreeNode = { name: pathSegments[0], children: [] };
//   let currentNode = root;
//   for (let i = 1; i < pathSegments.length; i++) {
//     const newNode: TreeNode = { name: pathSegments[i], children: [] };
//     currentNode.children.push(newNode);
//     currentNode = newNode;
//   }

//   const finalPathSegments = examplePath.split('/');
//   const lastSegment = finalPathSegments.pop() || '';
//   const directoryPath = finalPathSegments.length > 0 ? `/${finalPathSegments.join('/')}/` : '/';

//   return (
//     <div>
//       <p className="text-sm font-medium mt-4">目录树预览:</p>
//       <div className="p-2 mt-1 border rounded-md bg-muted">
//         <ul style={{ padding: 0, margin: 0 }}>
//           <DirectoryTree node={root} />
//         </ul>
//       </div>
//     </div>
//   );
// };

// --- 主组件 ---

export function ScraperRuleSettings({ initialData }: ScraperRuleSettingsProps) {
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<ScraperRuleFormValues>({
    resolver: zodResolver(scraperRuleSchema),
    defaultValues: initialData || {
      fileNamingRule: 'number',
      directoryRule: 'year/letters/[number]-actor',
      nfoTitleRule: 'number title',
      downloadFanart: true,
      enableAiTranslation: false,
      watermarkTypes: ['subtitles', 'cracked', 'leaked', 'uncensored'],
      cleanupExtensions: '.html|.url',
      cleanupFilenameContains: '直 播 盒 子|最 新 情 報|最 新 位 址|注册免费送|房间火爆|美女荷官|妹妹直播|精彩直播',
      cleanupMinFileSize: 100,
    },
  });
  const watchedFileNamingRule = form.watch("fileNamingRule");
  const watchedDirectoryRule = form.watch("directoryRule");
  const watchedNfoTitleRule = form.watch("nfoTitleRule");



  // const 


  // 使用 useEffect 来正确回显异步加载的初始数据
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form.reset]);

  const onSubmit = async (values: ScraperRuleFormValues) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'scraperRuleConfig',
          value: values,
        }),
      });

      if (response.ok) {
        toast.success('规则设置已成功保存！');
      } else {
        toast.error('保存失败，请重试。');
      }
    } catch (error) {
      toast.error('保存时发生网络错误。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>刮削与清理规则</CardTitle>
        <CardDescription>
          配置媒体文件的命名、元数据刮削以及后续的文件清理规则。
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            {/* 使用 Grid 布局创建清晰的两栏结构，并增加间距 */}
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">

              {/* === 左侧：命名与元数据规则 === */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium tracking-tight">命名与元数据</h3>

                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="flex flex-row justify-start items-center cursor-pointer">
                        <p className="text-sm text-muted-foreground">
                          定义文件、目录和 NFO 的命名格式。查看格式
                        </p>
                        <Info className="w-4 h-4" />
                      </div>
                      {/* <Info className="w-4 h-4" /> */}
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="grid gap-1">
                        {tags.map((tag) => (
                          <React.Fragment key={tag}>
                            <div className="flex flex-row justify-between">
                              <div className="text-sm">{tag.split(' ')[0]}</div>
                              <div className="text-sm">{tag.split(' ')[1]}</div>
                            </div>

                            <Separator className="my-2" />
                          </React.Fragment>
                        ))}

                      </div>
                    </PopoverContent>
                  </Popover>

                </div>

                <FormField control={form.control} name="fileNamingRule" render={({ field }) => (
                  <FormItem>
                    <FormLabel>文件命名规则</FormLabel>
                    <FormControl><Input placeholder="number-actor" {...field} /></FormControl>

                    <FormDescription>
                      <SimpleTextPreview rule={watchedFileNamingRule} label="预览" />
                    </FormDescription>
                  </FormItem>
                )} />
                <FormField control={form.control} name="directoryRule" render={({ field }) => (
                  <FormItem>
                    <FormLabel>目录规则</FormLabel>
                    <FormControl><Input placeholder="year/letters/[number]-actor" {...field} /></FormControl>
                    <FormDescription>
                      <DirectoryTreePreview rule={watchedDirectoryRule} />
                    </FormDescription>
                  </FormItem>
                )} />

                <FormField control={form.control} name="nfoTitleRule" render={({ field }) => (
                  <FormItem>
                    <FormLabel>NFO 视频标题规则</FormLabel>
                    <FormControl><Input placeholder="title - actor" {...field} /></FormControl>
                    <FormDescription>
                      <SimpleTextPreview rule={watchedNfoTitleRule} label="预览" />
                    </FormDescription>
                  </FormItem>
                )} />

                <FormField control={form.control} name="downloadFanart" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">下载剧照</FormLabel>
                      <FormDescription>下载电影剧集，保存在[extrafanart]文件夹中</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="enableAiTranslation" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">启用 AI 翻译</FormLabel>
                      <FormDescription>使用AI翻译剧情简介，需要在配置大模型 API Key</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>


              {/* === 右侧：内容与清理规则 === */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium tracking-tight">内容与清理</h3>
                  <p className="text-sm text-muted-foreground">
                    过滤不需要的水印类型，并自动清理多余的文件。
                  </p>
                </div>

                <FormField control={form.control} name="watermarkTypes" render={() => (
                  <FormItem className="rounded-lg border p-4">
                    <div className="mb-4">
                      <FormLabel className="text-base">添加水印</FormLabel>
                      <FormDescription>在封面中添加水印，根据类型自动添加</FormDescription>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {watermarkItems.map((item) => (
                        <FormField key={item.id} control={form.control} name="watermarkTypes" render={({ field }) => (
                          <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, item.id])
                                    : field.onChange(field.value?.filter((value) => value !== item.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{item.label}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </FormItem>
                )} />

                <div className="space-y-1 pt-4">
                  <h4 className="text-base font-medium tracking-tight">文件清理规则</h4>
                  <p className="text-sm text-muted-foreground">刮削完成后，自动删除符合以下规则的文件。</p>
                </div>

                <FormField control={form.control} name="cleanupExtensions" render={({ field }) => (
                  <FormItem>
                    <FormLabel>扩展名等于</FormLabel>
                    <FormControl><Textarea placeholder="txt, dat, url" {...field} /></FormControl>
                    <FormDescription>多个扩展名请用 `|` 分隔。</FormDescription>
                  </FormItem>
                )} />

                <FormField control={form.control} name="cleanupFilenameContains" render={({ field }) => (
                  <FormItem>
                    <FormLabel>文件名包含</FormLabel>
                    <FormControl><Textarea placeholder="sample, trailer, AD" {...field} /></FormControl>
                    <FormDescription>多个关键字请用 `|` 分隔。</FormDescription>
                  </FormItem>
                )} />

                <FormField control={form.control} name="cleanupMinFileSize" render={({ field }) => (
                  <FormItem>
                    <FormLabel>文件大小小于 (MB)</FormLabel>
                    <FormControl><Input type="number" placeholder="100" {...field} onChange={event => field.onChange(+event.target.value)} /></FormControl>
                    <FormDescription>删除小于指定大小（MB）的文件，留空则不启用。</FormDescription>
                  </FormItem>
                )} />
              </div>

            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4 mt-6">
            <div className="flex w-full justify-end">
              <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                {isSaving ? '保存中...' : '保存更改'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}