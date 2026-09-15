from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/upload/Borsaty_AI_logo_design_2K_20260915183523.jpeg')
out = Path('/home/ubuntu/financial-dashboard/client/public/branding')
out.mkdir(parents=True, exist_ok=True)
image = Image.open(source).convert('RGB')
# Preserve the supplied original as a high-resolution brand reference.
image.save(out / 'borsatyai-logo-source.jpg', quality=94, optimize=True)
# The visual mark and wordmark occupy the central area; remove only unused canvas.
crop = image.crop((360, 430, 1690, 1400))
crop.thumbnail((1200, 900), Image.Resampling.LANCZOS)
crop.save(out / 'borsatyai-logo.png', format='PNG', optimize=True)
# Compact square favicon derived from the central emblem, not the wordmark.
emblem = image.crop((650, 500, 1390, 1320))
emblem.thumbnail((512, 512), Image.Resampling.LANCZOS)
emblem.save(out / 'borsatyai-mark.png', format='PNG', optimize=True)
emblem.resize((64, 64), Image.Resampling.LANCZOS).save(out / 'borsatyai-mark-64.png', format='PNG', optimize=True)
print('prepared', out / 'borsatyai-logo.png')
print('sizes', image.size, crop.size, emblem.size)
