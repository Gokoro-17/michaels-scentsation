# Brand and campaign assets

## Supplied brand logo

`public/images/brand-logo.png` is the latest 500 × 500 logo supplied by the owner, saved unchanged from the attachment. This upload contains an opaque black canvas rather than an alpha channel. It is displayed against dark brand surfaces with CSS screen blending, preserving the supplied lettering and bottle monogram. No artwork was redrawn or generated. `src/BrandLogo.tsx` frames the image through an SVG viewport to remove excess outer space in the layout.

The logo is deliberately smaller in the storefront header, footer and admin screens. The favicon embeds the latest image and frames its bottle monogram without depending on external SVG image loading. Regenerate it with `node scripts/brand-favicon.mjs` after replacing the logo asset.

## Interface and social icons

Interface controls use Lucide React. WhatsApp and Instagram links use the standard Font Awesome Free SVG brand marks packaged locally at `public/icons/brands.svg`. Upstream attribution comments, original SVGs, the complete license and source links are preserved in `public/icons/`. See [icon sources and license](../public/icons/SOURCES.md). No icon font or external icon CDN is required at runtime.

## Generated campaign photography

The brand and category campaign photography listed here was generated with the built-in image generation tool. It illustrates the brand and categories; it is not published catalogue inventory. The video posters described below come from licensed footage. Use actual product photography when adding products in admin.

- `public/images/hero.jpg`: generated brand campaign, optimized from the original PNG.
- `public/images/story.jpg`: alternate optimized crop of the brand campaign.
- `public/images/deodorants.jpg`, `oils.jpg`, `luxury.jpg`, `combos.jpg`: extracted quadrants from a generated category contact sheet, resized and JPEG compressed.
- `public/images/fragrance-ritual-v2.jpg`: built-in image generation output featuring an adult Black man's deep brown hands, converted to a 1536 × 1024 JPEG for the final photograph in the homepage media carousel.

Hero prompt: Premium photorealistic editorial fragrance photograph for MICHAEL'S SCENTSATION. Amber perfume in substantial clear rectangular glass, matte black cap, small ivory brand label, cream travertine plinth, beige plaster wall, sculptural branch, warm afternoon sunlight and realistic glass refraction. No overlaid text or people.

Category prompt: Four independent photographs in an equal 2 by 2 grid, warm ivory/beige/black/amber palette, no text or logos. Top left: black deodorant sprays with champagne caps. Top right: amber roll-on perfume oils on linen with a woody branch. Bottom left: amber sculptural glass perfume on travertine. Bottom right: black deodorant and square perfume beside a cream gift box. Each subject centered and crop safe.

Fragrance ritual prompt: Generate a premium photorealistic landscape 3:2 fragrance campaign photograph, 1536 by 1024 pixels if available, for MICHAEL'S SCENTSATION. Show an adult Black man with rich deep brown skin applying perfume to his opposite wrist. Close crop of natural hands and wrists, an ivory linen shirt, and a small elegant amber glass atomizer; no face in frame. His deep brown skin tone must be clearly visible and naturally lit. One hand presses the atomizer and a very fine perfume mist catches warm side lighting near the other wrist. Anatomically correct hands, realistic skin texture, subtle highlights, realistic amber glass. Restrained luxury fragrance aesthetic with beige stone, ivory linen and a softly blurred dark warm brown background. Center the hands and bottle in the middle two thirds so a phone crop preserves the fragrance ritual. No lettering, labels, logos, watermark, collage, grids or interface elements. This is a new standalone photograph featuring a Black adult, not a recoloring of an existing person's image.

## Licensed homepage video footage

The carousel includes actual footage downloaded from Pexels on 6 November 2026. The [Pexels license](https://www.pexels.com/license/) permits website and commercial use and modification, without implying endorsement by the people or brands shown. These clips illustrate fragrance application; they are not customer testimonials or evidence of the store's stock.

| Local video                         | Creator           | Original footage                                                                                                        |
| ----------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `public/videos/ritual-presence.mp4` | SHVETS production | [Perfume applied at a vanity](https://www.pexels.com/video/woman-smelling-a-perfume-7192338/)                           |
| `public/videos/ritual-essence.mp4`  | Anna Shvets       | [Fragrant liquid prepared in glassware](https://www.pexels.com/video/a-woman-pouring-liquid-on-a-glass-bottle-5758913/) |

Both clips feature Black women as identified by the source descriptions/tags and were visually reviewed before use. The first clip uses the first 5.8 seconds; the second uses seconds 2–10. Both are silent, 960 × 540 H.264 MP4s at 24 fps with `yuv420p` and fast-start metadata. The portrait source for the second clip is framed with a blurred background made from that same footage to preserve the person and glassware in a wide layout. Skin tones were not recolored. The final files are 404,913 and 160,535 bytes respectively. Full decoding verified 139 and 192 frames and actual movement. `public/images/ritual-presence.jpg` and `ritual-essence.jpg` are poster frames extracted from the corresponding optimized clips.

The website serves its own copies; visitors do not depend on a third-party video player or external video CDN. Vercel's SPA rewrite excludes `/videos/` so media requests and HTTP byte ranges reach the static files.
