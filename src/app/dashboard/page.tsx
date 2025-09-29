import { auth } from '@/auth'; 
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return redirect('/auth/sign-in');
  } else {
    redirect('/dashboard/overview');
  }

}