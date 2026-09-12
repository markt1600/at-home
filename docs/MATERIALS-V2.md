# House material revision

Asset: `public/art/house-surfaces-v2.png`. Generated with the built-in image-generation tool. This image contains only newly generated material samples; no private source photographs or address details.

The game extracts six tiles and maps them in metres before static mesh batching. Wood floor joins, tinted dark wood and upholstery color variants are applied in code. Bump strengths remain below 1 mm to avoid rough, oversized wall and cabinet grain.

## Final generation prompt

Use case: photorealistic-natural. Asset type: a single 3D game material texture atlas, six equal square panels in exactly 3 columns by 2 rows, total landscape 1536x1024. Orthographic perfectly flat photographed material samples, no perspective. Top left: smooth warm off-white interior painted plaster, extremely subtle fine stipple, no large ridges. Top middle: muted sage olive cabinet paint, satin smooth even color, very subtle fine texture. Top right: warm ivory cream limestone with quiet faint delicate beige mineral veining, no grout. Bottom left: natural honey light oak straight fine vertical grain, no plank seams, no knots, no waviness. Bottom middle: polished white marble breccia with strong irregular black charcoal broken veins and small muted taupe mineral islands, like dramatic black-and-white stone on a kitchen island. Bottom right: warm neutral light grey fine woven upholstery fabric, small tight threads. Edge-to-edge each panel covers exactly its sixth of the atlas, no gaps borders labels text watermarks objects or bevels. Each sample should tile seamlessly with its own opposite edges. Flat uniform diffuse lighting, albedo texture without shadows highlights or lighting gradients. Realistic restrained interior finishes, not distressed or grungy.
