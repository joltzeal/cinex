'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

// 1. Zod Schema remains the same
const formSchema = z.object({
  proxyUrl: z.string().url('请输入有效的 URL 地址，例如：http://127.0.0.1:7890').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface ProxySettingsProps {
  initialData?: FormValues;
}

type TestStatus = 'pending' | 'success' | 'failure';

interface TestResult {
  site: string;
  status: TestStatus;
  details?: string; // Optional field for more details like status code or error
}

// Update the list of sites to match the backend
const SITES_TO_TEST = [
  "https://www.javbus.com",
  "https://javdb.com",
  "https://www.avfan.com",
  "https://onejav.com",
  "https://www.sehuatang.net"
];

export function ProxySettingsComponent({ initialData }: ProxySettingsProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  console.log(initialData);
  

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      proxyUrl: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form.reset]);

  // THIS IS THE MAIN CHANGED FUNCTION
  const handleTestConnection = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error('请先修正表单中的错误。');
      return;
    }

    setIsTesting(true);
    const initialResults = SITES_TO_TEST.map(site => ({
      site,
      status: 'pending' as TestStatus,
    }));
    setTestResults(initialResults);

    const values = form.getValues();

    try {
      // Call the new backend API endpoint
      const response = await fetch('/api/settings/proxy/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxyUrl: values.proxyUrl }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const resultsFromApi: { site: string; success: boolean; status: number | null; error?: string }[] = await response.json();

      // Map API results to the format required by the frontend state
      const finalResults = SITES_TO_TEST.map(siteUrl => {
        const result = resultsFromApi.find(r => r.site === siteUrl);
        if (!result) {
            return { site: siteUrl, status: 'failure' as TestStatus, details: 'No result from API' };
        }
        return {
            site: result.site.replace('https://', '').replace('www.',''), // Clean up for display
            status: result.success ? 'success' : 'failure',
            details: result.success ? `Status: ${result.status}` : (result.error || `Status: ${result.status}`),
        };
      });
      
      setTestResults(finalResults as TestResult[]);
      toast.success('代理连接测试完成。');

    } catch (error) {
      console.error('Failed to test proxy connection:', error);
      toast.error('测试请求失败，请检查网络或服务器日志。');
      // On failure, update all results to 'failure'
      const failureResults = SITES_TO_TEST.map(site => ({
        site,
        status: 'failure' as TestStatus,
        details: 'Request Failed'
      }));
      setTestResults(failureResults);
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      // This part remains the same, assuming you have a save endpoint
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'proxyConfig', value: values }),
      });

      if (response.ok) {
        toast.success('代理设置已成功保存！');
      } else {
        toast.error('保存失败，请重试。');
      }
    } catch (error) {
      toast.error('保存时发生网络错误。');
    } finally {
      setIsSaving(false);
    }
  };
  
  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>代理设置</CardTitle>
        <CardDescription>配置网络代理以连接到外部服务。</CardDescription>
      </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
              {/* Left Side: Form Input */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="proxyUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>代理地址</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：http://127.0.0.1:7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Side: Test Results */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">连接测试结果</h3>
                <div className="rounded-md border p-4 min-h-[140px]">
                  {testResults ? (
                    <ul className="space-y-3">
                      {testResults.map(({ site, status, details }) => (
                        <li key={site} className="flex items-center justify-between" title={details}>
                          <span className="text-sm text-muted-foreground">{site.replace('https://', '').replace('www.','')}</span>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(status)}
                            <span className="text-sm capitalize w-16">{status}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground">
                        点击“测试连接”以检查代理状态。
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Separator className="my-0" />

            <CardFooter className="flex justify-end space-x-2 py-4 px-6">
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isTesting ? '测试中...' : '测试连接'}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}