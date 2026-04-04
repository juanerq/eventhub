import type { AstroCookies } from 'astro';
import { supabase } from './supabase';

export async function getUser(cookies: AstroCookies) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken) {
    return null;
  }

  try {
    // Set the session using the tokens from cookies
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      // Try to refresh the session if we have a refresh token
      if (refreshToken) {
        const { data, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (!refreshError && data.session) {
          // Update cookies with new tokens
          cookies.set('sb-access-token', data.session.access_token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
          });

          cookies.set('sb-refresh-token', data.session.refresh_token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
          });

          return data.user;
        }
      }

      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export function requireAuth(user: any) {
  if (!user) {
    return Response.redirect('/login', 302);
  }
  return null;
}
