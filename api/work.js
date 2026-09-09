import { head } from '@vercel/blob';

export default async function handler(request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[A-Za-z0-9]{9}$/.test(id)) {
    return Response.json({ error: '잘못된 작품 번호입니다.' }, { status: 400 });
  }
  try {
    const blob = await head(`works/${id}/manifest.json`);
    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('manifest unavailable');
    return new Response(await response.text(), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
    });
  } catch {
    return Response.json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });
  }
}
