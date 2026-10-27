interface Env { SYNC_SERVICE?: Fetcher }

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SYNC_SERVICE) {
    return Response.json({ error: 'Device sync is not configured. Bind SYNC_SERVICE to the pairing Worker in Cloudflare Pages.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    return await env.SYNC_SERVICE.fetch(request)
  } catch {
    return Response.json({ error: 'Pairing service unavailable. Check the Worker deployment and Pages binding.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
