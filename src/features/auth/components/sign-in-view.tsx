"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// 导入您自定义的UI组件
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 这是一个加载指示器，您可以根据需要自定义
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

// 登录表单组件
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSignUpLink, setShowSignUpLink] = useState(false);

  // 检查是否需要显示注册链接
  useEffect(() => {
    const checkUserExists = async () => {
      try {
        const response = await fetch('/api/auth/check-users');
        const data = await response.json();
        setShowSignUpLink(data.userCount === 0);
      } catch (error) {
        console.error('检查用户失败:', error);
      }
    };
    
    checkUserExists();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("登录失败：邮箱或密码不正确。");
      } else {
        // 登录成功，跳转到仪表盘
        // router.push 会进行客户端导航，router.refresh 会刷新服务器组件以获取最新会话状态
        router.push("/dashboard/overview");
        router.refresh();
      }
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
                  <h1 className="text-2xl font-bold">欢迎回来</h1>
                  <p className="text-muted-foreground text-balance">
                    登录到您的 Cinex 账户
                  </p>
                </div>

                {/* 错误信息展示区域 */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

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
                  <div className="flex items-center">
                    <Label htmlFor="password">密码</Label>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      忘记密码?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Spinner />}
                  {isLoading ? '登录中...' : '登录'}
                </Button>
                
                {/* 仅在没有用户时显示注册链接 */}
                {showSignUpLink && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      还没有账户？{" "}
                      <a
                        href="/auth/sign-up"
                        className="text-primary hover:underline font-medium"
                      >
                        立即注册
                      </a>
                    </p>
                  </div>
                )}
                
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

      </div>
    </div>
  );
}