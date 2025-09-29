'use client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { IconLogout } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
export function UserNav() {
  const { data: session } = useSession();
  const user = session?.user; // 这是 next-auth 的 user 对象
  // const userProfileProps = nextAuthUser
  //   ? {
  //       // 将 nextAuthUser.image 映射到 imageUrl
  //       imageUrl: nextAuthUser.image ?? undefined,
  //       // 将 nextAuthUser.name 映射到 fullName
  //       fullName: nextAuthUser.name,
  //       // 将 nextAuthUser.email 映射到一个数组，以满足 emailAddresses 的类型要求
  //       emailAddresses: nextAuthUser.email ? [{ emailAddress: nextAuthUser.email }] : [],
  //     }
  // : null;
  const router = useRouter();
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <UserAvatarProfile user={user} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-56'
          align='end'
          sideOffset={10}
          forceMount
        >
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>
                {user.name}
              </p>
              <p className='text-muted-foreground text-xs leading-none'>
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>New Team</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
                  onClick={() =>
                    signOut({ callbackUrl: '/auth/sign-in' }) // 调用 signOut 函数
                  }
                >
                  <IconLogout className='mr-2 h-4 w-4' />
                  Sign Out
                </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
