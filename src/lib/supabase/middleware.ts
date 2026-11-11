import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
}

interface CookiePayload {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Graceful fallback if environment variables are not yet provided
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookiePayload[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Do not use getSession() in server middleware as it cannot guarantee authenticity.
  // Instead use getUser() which queries the Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAppRoute = pathname.startsWith("/app");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  // 1. Unauthenticated user trying to access protected /app/* or /onboarding
  if (!user) {
    if (isAppRoute || isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // 2. Authenticated user
  if (user) {
    // Check onboarding status from profiles table
    let onboardingCompleted = false;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && typeof profile === "object" && "onboarding_completed" in profile) {
        onboardingCompleted = Boolean(profile.onboarding_completed);
      }
    } catch {
      // In case database table is not yet initialized or query fails,
      // fallback safely to allow access without infinite loop
      onboardingCompleted = true;
    }

    // Authenticated user on /login, /register, or /forgot-password
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.searchParams.delete("redirect");
      url.pathname = onboardingCompleted ? "/app/dashboard" : "/onboarding";
      return NextResponse.redirect(url);
    }

    // Authenticated user with incomplete onboarding trying to access /app/*
    if (isAppRoute && !onboardingCompleted) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // Authenticated user with completed onboarding trying to access /onboarding
    if (isOnboardingRoute && onboardingCompleted) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
