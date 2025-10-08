import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

/**
 * Get the current user session
 * Use this in server components and API routes
 */
export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user;
}

/**
 * Require authentication
 * Redirects to login if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  return user;
}