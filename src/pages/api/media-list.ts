import type { APIRoute } from 'astro';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const S3 = new S3Client({
  region: import.meta.env.IDRIVE_REGION || 'us-west-4',
  endpoint: import.meta.env.IDRIVE_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.R2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

export const GET: APIRoute = async () => {
  try {
    const bucketName = import.meta.env.R2_BUCKET_NAME;
    const command = new ListObjectsV2Command({ Bucket: bucketName });
    const response = await S3.send(command);
    const files = response.Contents || [];

    // Generate a temporary signed download URL valid for 1 hour for every file
    const mediaItems = await Promise.all(files.map(async (file) => {
      const key = file.Key || '';
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

      const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: key });
      const signedUrl = await getSignedUrl(S3, getCommand, { expiresIn: 3600 }); // 1 hour expiration

      return {
        name: key,
        url: signedUrl,
        category,
        icon,
        type,
        size: file.Size ? Math.round(file.Size / 1024 / 1024 * 100) / 100 + ' MB' : 'Unknown'
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