export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // RSC prefetch requests - return empty 200 to suppress 404 errors
    if (url.pathname.includes('__next.') && url.searchParams.has('_rsc')) {
      return new Response('', { status: 200, headers: { 'content-type': 'text/plain' } });
    }

    // Try to serve static file
    try {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) {
        return response;
      }
    } catch {}

    // SPA fallback - serve index.html for all non-file paths
    const ext = url.pathname.split('.').pop();
    const isFile = ext && ['js', 'css', 'png', 'jpg', 'svg', 'ico', 'json', 'woff', 'woff2', 'txt', 'map'].includes(ext);

    if (!isFile) {
      try {
        const indexResponse = await env.ASSETS.fetch(new URL('/index.html', request.url));
        return new Response(indexResponse.body, {
          status: 200,
          headers: {
            'content-type': 'text/html;charset=UTF-8',
            'cache-control': 'no-cache',
          },
        });
      } catch {}
    }

    return new Response('Not Found', { status: 404 });
  }
};
