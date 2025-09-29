"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// 导入您自定义的UI组件
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 加载指示器
function Spinner() {
  return (
    <svg
      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

// 注册表单组件
export default function SignUpViewPage({ stars }: { stars: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "注册失败");
        return;
      }

      // 注册成功，跳转到登录页面
      router.push("/auth/sign-in");
    } catch (error) {
      setError("发生了一个未知错误。");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className={cn("flex w-full max-w-4xl flex-col gap-6")}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">创建账户</h1>
                  <p className="text-muted-foreground text-balance">
                    注册您的 Acme Inc 账户
                  </p>
                </div>

                {/* 错误信息展示区域 */}
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}

                <div className="grid gap-3">
                  <Label htmlFor="name">用户名</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="请输入用户名"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Spinner />}
                  {isLoading ? '注册中...' : '注册'}
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    已有账户？{" "}
                    <a
                      href="/auth/sign-in"
                      className="text-primary hover:underline font-medium"
                    >
                      立即登录
                    </a>
                  </p>
                </div>
                
              </div>
            </form>
            <div className="bg-muted relative hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=2520"
                alt="Image"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.3]"
              />
            </div>
          </CardContent>
        </Card>
        <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
          点击继续，即表示您同意我们的{" "}
          <a href="#">服务条款</a> 和 <a href="#">隐私政策</a>.
        </div>
      </div>
    </div>
  );
}
