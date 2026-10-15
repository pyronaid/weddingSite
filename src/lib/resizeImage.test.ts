import { resizeImage } from './resizeImage';

describe('resizeImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the original file when the browser cannot decode it', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported (e.g. HEIC)')));
    const file = new File(['raw'], 'photo.heic', { type: 'image/heic' });
    await expect(resizeImage(file)).resolves.toBe(file);
  });

  it('scales the long side down to the limit and re-encodes as JPEG', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }));
    const drawImage = vi.fn();
    const smaller = new Blob(['small'], { type: 'image/jpeg' });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(smaller));

    const file = new File(['x'.repeat(5000)], 'photo.jpg', { type: 'image/jpeg' });
    await expect(resizeImage(file, 2048)).resolves.toBe(smaller);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1536);
    expect(close).toHaveBeenCalled();
  });
});
