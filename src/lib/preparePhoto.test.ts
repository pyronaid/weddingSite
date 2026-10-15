import { PhotoCheckError, preparePhoto } from './preparePhoto';

const bitmap = (width: number, height: number) => ({ width, height, close: vi.fn() });

describe('preparePhoto', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects files that are not images', async () => {
    const pdf = new File(['%PDF'], 'invite.pdf', { type: 'application/pdf' });
    await expect(preparePhoto(pdf)).rejects.toBeInstanceOf(PhotoCheckError);
  });

  it('rejects images the browser cannot decode, unless the server accepts the format', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('cannot decode')));
    const heic = new File(['raw'], 'photo.heic', { type: 'image/heic' });
    await expect(preparePhoto(heic)).rejects.toThrow(/not supported/);

    const jpeg = new File(['raw'], 'photo.jpg', { type: 'image/jpeg' });
    await expect(preparePhoto(jpeg)).resolves.toBe(jpeg);
  });

  it('rejects pictures too small to show a scene', async () => {
    const tiny = bitmap(300, 1000);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(tiny));
    await expect(preparePhoto(new File(['x'], 'icon.png', { type: 'image/png' }))).rejects.toThrow(/too small/);
    expect(tiny.close).toHaveBeenCalled();
  });

  it('shrinks the long side and always re-encodes as JPEG (dropping EXIF data)', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap(4000, 3000)));
    const drawImage = vi.fn();
    const encoded = new Blob(['jpeg'], { type: 'image/jpeg' });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(encoded));

    await expect(preparePhoto(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }), 2048)).resolves.toBe(encoded);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1536);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85);
  });
});
