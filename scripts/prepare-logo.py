from PIL import Image

source = Image.open('/home/ubuntu/upload/1000420751.jpg').convert('RGBA')
pixels = source.load()
for y in range(source.height):
    for x in range(source.width):
        r, g, b, a = pixels[x, y]
        spread = max(r, g, b) - min(r, g, b)
        brightness = (r + g + b) / 3
        if spread < 45 and brightness > 150:
            pixels[x, y] = (r, g, b, 0)
        elif spread < 65 and brightness > 185:
            alpha = max(0, min(255, int((185 - brightness) * 5)))
            pixels[x, y] = (r, g, b, alpha)

bbox = source.getbbox()
if bbox:
    source = source.crop(bbox)
source.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
source.save('/home/ubuntu/financial-dashboard/client/public/branding/borsatyai-logo.png', optimize=True)
