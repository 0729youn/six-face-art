import { handleUpload } from '@vercel/blob/client';

const PATH_RE = /^works\/[A-Za-z0-9]{9}\/(?:face[0-5]_(?:bg|character|frame)_[A-Za-z0-9._-]+|manifest\.json)$/;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default async function handler(request) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const body = await request.json();
    return await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!PATH_RE.test(pathname)) {
          throw new Error('허용되지 않은 업로드 경로입니다.');
        }
        const isManifest = pathname.endsWith('/manifest.json');
        return {
          allowedContentTypes: isManifest ? ['application/json'] : IMAGE_TYPES,
          maximumSizeInBytes: isManifest ? 2 * 1024 * 1024 : 250 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async () => {},
    });
  } catch (error) {
    return Response.json({ error: error?.message || '업로드 권한을 만들지 못했습니다.' }, { status: 400 });
  }
}
