import {
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from 'npm:@aws-sdk/client-s3@3.1101.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.1101.0';
import { requireAdmin } from '../_shared/requireAdmin.ts';
import {
  createSadhanaMediaHandler,
  type PracticeMediaObject,
} from '../_shared/sadhanaMedia.ts';

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name} configuration.`);
  return value;
}

function storageConfig() {
  const accountId = requiredEnvironment('R2_ACCOUNT_ID');
  const bucket = requiredEnvironment('R2_BUCKET');
  const publicBase = requiredEnvironment('R2_PUBLIC_URL');
  const parsedBase = new URL(publicBase);
  if (parsedBase.protocol !== 'https:' || parsedBase.username || parsedBase.password ||
      parsedBase.search || parsedBase.hash) {
    throw new Error('R2_PUBLIC_URL must be a public HTTPS base URL.');
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnvironment('R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnvironment('R2_SECRET_ACCESS_KEY'),
    },
  });
  return { bucket, publicBase: publicBase.replace(/\/+$/, ''), client };
}

const handler = createSadhanaMediaHandler({
  async authorize(request) {
    await requireAdmin(request, true);
  },
  async createSignedUpload({ objectKey, contentType, contentLength }) {
    const { bucket, client } = storageConfig();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: contentLength,
      IfNoneMatch: '*',
    });
    return await getSignedUrl(client, command, { expiresIn: 300 });
  },
  async inspectObject(objectKey): Promise<PracticeMediaObject | null> {
    const { bucket, client } = storageConfig();
    try {
      const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
      if (typeof result.ContentLength !== 'number' || typeof result.ContentType !== 'string') return null;
      const sample = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Range: 'bytes=0-31',
      }));
      if (!sample.Body) return null;
      const signature = await sample.Body.transformToByteArray();
      return { contentLength: result.ContentLength, contentType: result.ContentType, signature };
    } catch (error) {
      if (error instanceof Error && ('name' in error && error.name === 'NotFound' ||
          '$metadata' in error && typeof error.$metadata === 'object' && error.$metadata !== null &&
          'httpStatusCode' in error.$metadata && error.$metadata.httpStatusCode === 404)) return null;
      throw error;
    }
  },
  publicUrl(objectKey) {
    const { publicBase } = storageConfig();
    return `${publicBase}/${objectKey}`;
  },
});

Deno.serve(handler);
