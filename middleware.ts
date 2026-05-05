import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Получаем текущего пользователя
  const { data: { user }, error } = await supabase.auth.getUser();

  // Если пользователь не авторизован и пытается доступ к защищенным маршрутам
  if (error || !user) {
    // Разрешаем доступ к GET запросам (просмотр очереди)
    if (request.method === 'GET') {
      return supabaseResponse;
    }
    
    // Для POST/PUT/DELETE требуем авторизацию
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return supabaseResponse;
}

// Middleware для защиты API маршрутов /api/queue/*
export function middleware(request: NextRequest) {
  // Проверяем, является ли запрос защищенным API маршрутом
  const path = request.nextUrl.pathname;
  const isQueueApi = path.startsWith('/api/queue/') && path !== '/api/queue/current' && path !== '/api/queue/next';

  // GET запросы к /api/queue/current разрешены без авторизации
  if (path === '/api/queue/current') {
    return updateSession(request);
  }
  
  // POST запросы к /api/queue/next разрешены без авторизации для кнопки "Играть"
  if (path === '/api/queue/next' && request.method === 'POST') {
    return NextResponse.next({
      request,
    });
  }
  
  // Для других /api/queue/* маршрутов требуем авторизацию
  if (isQueueApi) {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
