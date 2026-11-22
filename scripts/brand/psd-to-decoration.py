#!/usr/bin/env python3
"""
Turns a Photoshop file (or a big PNG) into a side decoration for the
invitations: src/prints/decorations/<name>.webp.

    pip install psd-tools          # once (it brings Pillow)
    python scripts/brand/psd-to-decoration.py artwork.psd src/prints/decorations/watercolour_roses.webp

What it does:
1. PSD: keeps the artwork only. Stock files often add a fake checkerboard
   "transparent background" (a layer named like "BG DELETE ME"): the layer
   called OBJECT is used when there is one (or the one given with --layer);
   otherwise every layer or group whose name contains "delete" or
   "background" is hidden and the rest is flattened.
2. Crops it to the drawing, so its corner is the picture's corner (the
   designer places it in the card's corner).
3. Makes it at most 2400 pixels on its long side: 300 dpi for a corner made
   more than twice as big on an A4.
4. Saves it as WebP (quality 90, with transparency: a few hundred kB), or PNG
   if the output name ends in .png.

The decoration is drawn for the TOP LEFT corner (the bottom right one is the
same, turned round). Name the file as it should appear in the designer.
"""
import argparse
import re
import sys

from PIL import Image

MAX_SIDE = 2400


def artwork_of_psd(path, layer_name):
    from psd_tools import PSDImage

    psd = PSDImage.open(path)
    layers = list(psd.descendants())
    wanted = layer_name or ('OBJECT' if any(layer.name == 'OBJECT' for layer in layers) else None)
    canvas = Image.new('RGBA', psd.size, (0, 0, 0, 0))
    if wanted:
        layer = next((layer for layer in layers if layer.name == wanted), None)
        if layer is None:
            sys.exit(f'No layer called {wanted!r}. Layers: {[layer.name for layer in layers]}')
        canvas.alpha_composite(layer.composite().convert('RGBA'), dest=(layer.left, layer.top))
        return canvas
    for layer in layers:
        if re.search(r'delete|background', layer.name, re.IGNORECASE):
            layer.visible = False
    return psd.composite(force=True).convert('RGBA')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('source', help='a .psd (or a .png with transparency)')
    parser.add_argument('output', help='src/prints/decorations/<name>.webp (or .png)')
    parser.add_argument('--layer', help='the layer with the artwork (default: OBJECT, if there is one)')
    args = parser.parse_args()

    if args.source.lower().endswith('.psd'):
        picture = artwork_of_psd(args.source, args.layer)
    else:
        picture = Image.open(args.source).convert('RGBA')

    box = picture.getbbox()
    if not box:
        sys.exit('The picture is empty (fully transparent).')
    picture = picture.crop(box)
    scale = MAX_SIDE / max(picture.size)
    if scale < 1:
        picture = picture.resize((round(picture.width * scale), round(picture.height * scale)), Image.LANCZOS)

    if args.output.lower().endswith('.png'):
        picture.save(args.output, optimize=True)
    else:
        picture.save(args.output, quality=90, method=6, alpha_quality=100)
    print(f'{args.output}: {picture.width} x {picture.height} px')


if __name__ == '__main__':
    main()
