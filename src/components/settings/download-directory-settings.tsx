'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Folder, Save, PlusCircle, GripVertical, X } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// 定义保存到数据库的单个目录配置的接口

// 组件内部状态使用的接口，增加了别名和临时ID
interface DirectoryConfigForState extends DirectoryConfigData {
  id: string; // 仅用于React key和状态管理，保存时会移除
  alias: string;
}

// 组件的 Props，initialData 现在是一个对象
interface DirectorySettingsProps {
  initialData?: Record<string, DirectoryConfigData>;
}

// 创建一个新的、空的配置项（供组件内部使用）
const createNewConfig = (): DirectoryConfigForState => ({
  id: uuidv4(),
  alias: '',
  mediaType: 'movie',
  downloadDir: '',
  mediaLibraryDir: '',
  organizeMethod: 'hardlink',
  smartRename: true,
  scrapeMetadata: true,
  sendNotification: true,
});

export function DirectorySettingsComponent({ initialData }: DirectorySettingsProps) {
  const [configs, setConfigs] = useState<DirectoryConfigForState[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 如果有初始数据（对象格式），则转换为数组格式以供组件状态使用
    if (initialData) {
      const configArray = Object.entries(initialData).map(([alias, data]) => ({
        id: uuidv4(),
        alias,
        ...data,
      }));
      setConfigs(configArray);
    }
  }, [initialData]);

  // 更新特定配置项的函数
  const handleUpdateConfig = (id: string, field: keyof DirectoryConfigForState, value: any) => {
    setConfigs(prev =>
      prev.map(config =>
        config.id === id ? { ...config, [field]: value } : config
      )
    );
  };

  // 添加新的配置项
  const handleAddConfig = () => {
    setConfigs(prev => [...prev, createNewConfig()]);
  };

  // 删除配置项
  const handleRemoveConfig = (id: string) => {
    setConfigs(prev => prev.filter(config => config.id !== id));
  };

  // 保存设置
  const handleSave = async () => {
    setIsLoading(true);

    // 校验：检查是否有空的或重复的别名
    const aliases = configs.map(c => c.alias.trim());
    if (aliases.some(alias => !alias)) {
      toast.error('保存失败', { description: '所有配置项都必须填写别名。' });
      setIsLoading(false);
      return;
    }
    if (new Set(aliases).size !== aliases.length) {
      toast.error('保存失败', { description: '别名不能重复。' });
      setIsLoading(false);
      return;
    }
    
    // 将数组转换为以别名为键的对象，并移除临时id
    const dataToSave = configs.reduce((acc, config) => {
      const { id, alias, ...rest } = config;
      acc[alias.trim()] = rest;
      return acc;
    }, {} as Record<string, DirectoryConfigData>);

    console.log('正在保存的数据结构:', dataToSave);

    try {
      // 模拟API调用
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'downloadDirectoryConfig',
          value: dataToSave,
        }),
      });
      if (response.ok) {
        toast.success('目录设置已成功保存！');
      } else {
        toast.error('保存失败，请重试。');
      }
      // await new Promise(resolve => setTimeout(resolve, 1000));
      // toast.success('目录设置已成功保存！');
    } catch (err) {
      toast.error('保存失败', { description: err instanceof Error ? err.message : '发生未知错误' });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          目录
        </CardTitle>
        <CardDescription>
          设置媒体文件整理目录结构，按先后顺序依次匹配。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 网格布局容器 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config) => (
            <div key={config.id} className="border p-4 rounded-lg flex flex-col space-y-3">
              {/* 卡片头部 */}
              <div className="flex justify-between items-center pb-2 border-b">
                  <div className="flex items-center gap-2 cursor-grab">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold truncate">{config.alias || '新配置'}</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveConfig(config.id)} className="flex-shrink-0">
                      <X className="h-4 w-4" />
                  </Button>
              </div>

              {/* 卡片内容 */}
              <div className="space-y-3 flex-grow">
                <div className="space-y-1.5">
                  <Label htmlFor={`alias-${config.id}`}>别名</Label>
                  <Input id={`alias-${config.id}`} value={config.alias} onChange={(e) => handleUpdateConfig(config.id, 'alias', e.target.value)} placeholder="例如：电影" />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>媒体类型</Label>
                      <Select value={config.mediaType} onValueChange={(value) => handleUpdateConfig(config.id, 'mediaType', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="movie">电影</SelectItem>
                          <SelectItem value="magnet">磁力</SelectItem>
                          <SelectItem value="telegram">Telegram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor={`downloadDir-${config.id}`}>下载目录</Label>
                        <Input id={`downloadDir-${config.id}`} value={config.downloadDir} onChange={(e) => handleUpdateConfig(config.id, 'downloadDir', e.target.value)} placeholder="/downloads" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                      <Label>整理方式</Label>
                      <Select value={config.organizeMethod} onValueChange={(value) => handleUpdateConfig(config.id, 'organizeMethod', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hardlink">硬链接</SelectItem>
                          <SelectItem value="move">移动</SelectItem>
                          <SelectItem value="copy">复制</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`mediaLibraryDir-${config.id}`}>媒体库目录</Label>
                      <Input id={`mediaLibraryDir-${config.id}`} value={config.mediaLibraryDir} onChange={(e) => handleUpdateConfig(config.id, 'mediaLibraryDir', e.target.value)} placeholder="/media/Movies" />
                    </div>
                    
                </div>
                
                <div className="grid grid-cols-3 gap-2 items-center pt-2">
                    <div className="flex items-center space-x-2">
                        <Switch id={`smartRename-${config.id}`} checked={config.smartRename} onCheckedChange={(checked) => handleUpdateConfig(config.id, 'smartRename', checked)} />
                        <Label htmlFor={`smartRename-${config.id}`} className="text-xs">智能重命名</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id={`scrapeMetadata-${config.id}`} checked={config.scrapeMetadata} onCheckedChange={(checked) => handleUpdateConfig(config.id, 'scrapeMetadata', checked)} />
                        <Label htmlFor={`scrapeMetadata-${config.id}`} className="text-xs">刮削元数据</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id={`sendNotification-${config.id}`} checked={config.sendNotification} onCheckedChange={(checked) => handleUpdateConfig(config.id, 'sendNotification', checked)} />
                        <Label htmlFor={`sendNotification-${config.id}`} className="text-xs">发送通知</Label>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex flex-col space-y-2 pt-4">
            <Button variant="outline" className="w-full" onClick={handleAddConfig}>
              <PlusCircle className="h-4 w-4 mr-2" />
              添加配置
            </Button>

            <Button onClick={handleSave} disabled={isLoading || configs.length === 0} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? '保存中...' : '保存设置'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}