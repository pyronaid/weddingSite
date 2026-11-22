import { fileLabel, isWhite, paint, parseSvgFile, stencil, svgFolder, viewBoxOf } from './svgFiles';

const SOURCE =
  '<svg data-tile="80" DATA-Fit="cover" viewBox="0 0 40 20"><path id="a" fill="#999" d="M0 0"/><path fill="white" d="M1 1"/><path d="M2 2"/></svg>';

describe('SVG files', () => {
  it('reads the settings of a file from its data-* attributes', () => {
    const file = parseSvgFile('my_pattern-1', SOURCE)!;
    expect(file.label).toBe('My pattern 1');
    expect(file.data).toEqual({ tile: '80', fit: 'cover' });
    expect(viewBoxOf(file)).toEqual({ x: 0, y: 0, width: 40, height: 20 });
    expect(fileLabel('stile__02')).toBe('Stile 02');
  });

  it('tells white apart, however it is written', () => {
    for (const white of ['#fff', '#FFFFFF', 'white', 'rgb(255, 255, 255)', 'rgb(100%,100%,100%)']) {
      expect(isWhite(white)).toBe(true);
    }
    for (const other of ['#fffffe', '#eee', 'none', 'url(#a)', 'rgb(99%,100%,100%)'])
      expect(isWhite(other)).toBe(false);
  });

  it('paints in one colour, keeping white only when asked', () => {
    const file = parseSvgFile('f', SOURCE)!;
    expect(paint(file, '#123456', 'p')).toBe(
      '<g fill="#123456" color="#123456"><path id="p-f-a" fill="#123456" d="M0 0"/><path fill="#123456" d="M1 1"/><path d="M2 2"/></g>',
    );
    expect(paint(file, '#123456', 'p', { keepWhite: true })).toContain('<path fill="#ffffff" d="M1 1"/>');
  });

  it('makes a mask: drawing white, white parts black', () => {
    expect(stencil(parseSvgFile('f', SOURCE)!, 'm')).toBe(
      '<g fill="#ffffff" color="#ffffff"><path id="m-f-a" fill="#ffffff" d="M0 0"/><path fill="#000000" d="M1 1"/><path d="M2 2"/></g>',
    );
  });

  describe('a folder loaded when needed', () => {
    const loader = (source: string) => vi.fn(async () => source);

    it('knows the names at once, by name, and reads the drawings once', async () => {
      const loaders = {
        './x/pattern_10.svg': loader(SOURCE),
        './x/pattern_2.svg': loader(SOURCE),
        './x/broken.svg': loader('<p>not an svg</p>'),
      };
      const folder = svgFolder(loaders);
      expect(folder.ids).toEqual(['broken', 'pattern_2', 'pattern_10']);
      expect(folder.has('pattern_2')).toBe(true);
      expect(folder.has('nope')).toBe(false);
      expect(folder.has(42)).toBe(false);
      for (const load of Object.values(loaders)) expect(load).not.toHaveBeenCalled();

      const files = await folder.load();
      // A file that is not a usable SVG is left out.
      expect([...files.keys()]).toEqual(['pattern_2', 'pattern_10']);
      await folder.load();
      expect(loaders['./x/pattern_2.svg']).toHaveBeenCalledTimes(1);
    });

    it('tries again after a failed download', async () => {
      const flaky = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(SOURCE);
      const folder = svgFolder({ './x/a.svg': flaky });
      await expect(folder.load()).rejects.toThrow('offline');
      expect([...(await folder.load()).keys()]).toEqual(['a']);
    });
  });
});
