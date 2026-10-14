import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStorageService, createStorageService, MemoryStorageService, LocalDiskStorageService } from '../src/services/storage.service';

describe('SupabaseStorageService Unit Tests (TDD)', () => {
  let mockUpload: ReturnType<typeof vi.fn>;
  let mockGetPublicUrl: ReturnType<typeof vi.fn>;
  let mockDownload: ReturnType<typeof vi.fn>;
  let mockCreateSignedUrl: ReturnType<typeof vi.fn>;
  let mockListBuckets: ReturnType<typeof vi.fn>;
  let mockCreateBucket: ReturnType<typeof vi.fn>;
  let mockClient: any;
  let service: SupabaseStorageService;

  beforeEach(() => {
    mockUpload = vi.fn().mockResolvedValue({ error: null });
    mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/previews/album-1/photo-1.webp' }
    });
    mockDownload = vi.fn().mockResolvedValue({
      data: { arrayBuffer: async () => new TextEncoder().encode('FAKE_IMAGE_BYTES').buffer },
      error: null
    });
    mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://test.supabase.co/storage/v1/object/sign/originals/album-1/photo-1.jpg?token=abc' },
      error: null
    });
    mockListBuckets = vi.fn().mockResolvedValue({
      data: [{ name: 'previews' }],
      error: null
    });
    mockCreateBucket = vi.fn().mockResolvedValue({ error: null });

    mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
          download: mockDownload,
          createSignedUrl: mockCreateSignedUrl
        }),
        listBuckets: mockListBuckets,
        createBucket: mockCreateBucket
      }
    };

    service = new SupabaseStorageService(mockClient);
  });

  it('savePreview debe subir la imagen a "previews" con content-type WebP y retornar la publicUrl', async () => {
    const buffer = Buffer.from('TEST_PREVIEW_BUFFER');
    const result = await service.savePreview('album-1', 'photo-1', buffer);

    expect(mockClient.storage.from).toHaveBeenCalledWith('previews');
    expect(mockUpload).toHaveBeenCalledWith('album-1/photo-1.webp', buffer, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '31536000'
    });
    expect(result.publicUrl).toBe('https://test.supabase.co/storage/v1/object/public/previews/album-1/photo-1.webp');
    expect(result.sizeBytes).toBe(buffer.length);
    expect(result.relativePath).toBe('previews/album-1/photo-1.webp');
  });

  it('saveOriginal debe subir la foto a "originals" de forma privada y con mime type correcto', async () => {
    const buffer = Buffer.from('TEST_ORIGINAL_HD');
    const result = await service.saveOriginal('album-1', 'photo-1', '.jpg', buffer);

    expect(mockClient.storage.from).toHaveBeenCalledWith('originals');
    expect(mockUpload).toHaveBeenCalledWith('album-1/photo-1.jpg', buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });
    expect(result.publicUrl).toBeUndefined();
    expect(result.relativePath).toBe('originals/album-1/photo-1.jpg');
    expect(result.sizeBytes).toBe(buffer.length);
  });

  it('createSignedDownloadUrl debe solicitar una URL firmada con vencimiento de 72 horas por defecto', async () => {
    const url = await service.createSignedDownloadUrl('album-1', 'photo-1', '.jpg');

    expect(mockClient.storage.from).toHaveBeenCalledWith('originals');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      'album-1/photo-1.jpg',
      259200, // 72 horas en segundos
      { download: 'LA_TERCERA_album-1_photo-1.jpg' }
    );
    expect(url).toContain('https://test.supabase.co/storage/v1/object/sign/originals/');
  });

  it('getOriginalBuffer debe descargar el objeto y retornar un Buffer binario', async () => {
    const buffer = await service.getOriginalBuffer('album-1', 'photo-1', '.jpg');
    expect(mockClient.storage.from).toHaveBeenCalledWith('originals');
    expect(mockDownload).toHaveBeenCalledWith('album-1/photo-1.jpg');
    expect(buffer).not.toBeNull();
    expect(buffer?.toString()).toBe('FAKE_IMAGE_BYTES');
  });

  it('getOriginalBuffer debe retornar null si ocurre un error en la descarga', async () => {
    mockDownload.mockResolvedValueOnce({ data: null, error: new Error('Not found') });
    const buffer = await service.getOriginalBuffer('album-1', 'no-existe', '.jpg');
    expect(buffer).toBeNull();
  });

  it('ensureBucketsExist debe crear el bucket originals si solo previews existe', async () => {
    await service.ensureBucketsExist();
    expect(mockListBuckets).toHaveBeenCalled();
    expect(mockCreateBucket).toHaveBeenCalledWith('originals', expect.objectContaining({
      public: false,
      fileSizeLimit: 52428800
    }));
  });

  it('createStorageService debe retornar MemoryStorageService si STORAGE_PROVIDER=memory', () => {
    const prevEnv = process.env.STORAGE_PROVIDER;
    try {
      process.env.STORAGE_PROVIDER = 'memory';
      const storage = createStorageService();
      expect(storage).toBeInstanceOf(MemoryStorageService);
    } finally {
      process.env.STORAGE_PROVIDER = prevEnv;
    }
  });

  it('createStorageService debe retornar LocalDiskStorageService si STORAGE_PROVIDER=local', () => {
    const prevEnv = process.env.STORAGE_PROVIDER;
    try {
      process.env.STORAGE_PROVIDER = 'local';
      const storage = createStorageService();
      expect(storage).toBeInstanceOf(LocalDiskStorageService);
    } finally {
      process.env.STORAGE_PROVIDER = prevEnv;
    }
  });
});
