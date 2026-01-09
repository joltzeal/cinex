// import { auth } from '@clerk/nextjs/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Page() {
  // const { userId } = await auth();
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return redirect('/auth/sign-in');
  } else {
    redirect('/dashboard/overview');
  }
}
