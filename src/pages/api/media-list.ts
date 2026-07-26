import type { APIRoute } from 'astro';
import { AwsClient } from 'aws4fetch';

const s3 = new AwsClient({
  accessKeyId: import.meta.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta.env.R2_SECRET_ACCESS_KEY || '',
  region: import.meta.env.IDRIVE_REGION || 'us-west-4',
  service: 's3',
});

export const GET: APIRoute = async () => {
  try {
    const bucketName = import.meta.env.R2_BUCKET_NAME;
    const endpoint = import.meta.env.IDRIVE_ENDPOINT.replace(/\/$/, ''); // Remove trailing slash if present
    
    // 1. List objects in the bucket
    const listUrl = `${endpoint}/${bucketName}?list-type=2`;
    const listResponse = await s3.fetch(listUrl);
    
    if (!listResponse.ok) {
      throw new Error(`Failed to list objects: ${listResponse.statusText}`);
    }

    const xmlText = await listResponse.text();

    // Lightweight regex-based XML parsing to extract keys and sizes without heavy dependencies
    const contents: { key: string; size: number }[] = [];
    const itemRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];
      const keyMatch = /<Key>(.*?)<\/Key>/.exec(itemContent);
      const sizeMatch = /<Size>(.*?)<\/Size>/.exec(itemContent);
      
      if (keyMatch) {
        contents.push({
          key: decodeURIComponent(keyMatch[1]),
          size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
        });
      }
    }

    // 2. Generate pre-signed URLs (valid for 1 hour using aws4fetch signPoint)
    const mediaItems = await Promise.all(contents.map(async (file) => {
      const key = file.key;
      const ext = key.split('.').pop()?.toLowerCase() || '';
      
      let category = 'document';
      let icon = '📄';
      let type = 'document';

      if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
        category = 'video';
        icon = '🎬';
        type = 'video';
      } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
        category = 'image';
        icon = '🎨';
        type = 'image';
      } else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
        category = 'audio';
        icon = '🎵';
        type = 'audio';
      }

      // Generate a presigned URL valid for 3600 seconds (1 hour)
      const objectUrl = `${endpoint}/${bucketName}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
      const signed = await s3.sign(new Request(objectUrl, { method: 'GET' }), { 
        aws: { signQuery: true, expires: 3600 } 
      });

      return {
        name: key,
        url: signed.url,
        category,
        icon,
        type,
        size: file.size ? Math.round(file.size / 1024 / 1024 * 100) / 100 + ' MB' : 'Unknown'
      };
    }));

    return new Response(JSON.stringify(mediaItems), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("IDrive e2 Error:", error);
    return new Response(JSON.stringify({ error: 'Failed to fetch media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};