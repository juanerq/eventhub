import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400 }
      );
    }

    // Set auth cookies
    if (data.session) {
      cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      cookies.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return new Response(
      JSON.stringify({ success: true, user: data.user }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Error del servidor' }),
      { status: 500 }
    );
  }
};
