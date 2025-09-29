// /components/ui/input-with-icon.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input'; // 我们只需要导入 Input 组件

// 错误： interface InputWithIconProps extends InputProps { ... }
// 正确：直接继承 React 的标准 HTML Input 属性
export interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {icon}
        </div>
        <Input
          type={type}
          className={cn('pl-10', className)}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
InputWithIcon.displayName = 'InputWithIcon';

export { InputWithIcon };