import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// 支持 Clerk 和 Better Auth 两种格式
type ClerkUser = {
  imageUrl?: string;
  fullName?: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
};

type BetterAuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: ClerkUser | BetterAuthUser | null;
}

// 类型守卫函数
function isClerkUser(user: any): user is ClerkUser {
  return user && 'emailAddresses' in user;
}

export function UserAvatarProfile({
  className,
  showInfo = false,
  user
}: UserAvatarProfileProps) {
  // 根据不同的用户类型提取信息
  const imageUrl = isClerkUser(user) ? user.imageUrl : user?.image;
  const fullName = isClerkUser(user) ? user.fullName : user?.name;
  const email = isClerkUser(user)
    ? user.emailAddresses[0]?.emailAddress
    : user?.email;

  return (
    <div className='flex items-center gap-2'>
      <Avatar className={className}>
        <AvatarImage src={imageUrl || ''} alt={fullName || ''} />
        <AvatarFallback className='rounded-lg'>
          {fullName?.slice(0, 2)?.toUpperCase() || 'CN'}
        </AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <span className='truncate font-semibold'>{fullName || ''}</span>
          <span className='truncate text-xs'>{email || ''}</span>
        </div>
      )}
    </div>
  );
}
