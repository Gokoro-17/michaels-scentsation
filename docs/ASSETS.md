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
- `public/images/fragrance-ritual.jpg`: built-in image generation output, converted to a 1536 × 1024 JPEG for the final photograph in the homepage media carousel.

Hero prompt: Premium photorealistic editorial fragrance photograph for MICHAEL'S SCENTSATION. Amber perfume in substantial clear rectangular glass, matte black cap, small ivory brand label, cream travertine plinth, beige plaster wall, sculptural branch, warm afternoon sunlight and realistic glass refraction. No overlaid text or people.

Category prompt: Four independent photographs in an equal 2 by 2 grid, warm ivory/beige/black/amber palette, no text or logos. Top left: black deodorant sprays with champagne caps. Top right: amber roll-on perfume oils on linen with a woody branch. Bottom left: amber sculptural glass perfume on travertine. Bottom right: black deodorant and square perfume beside a cream gift box. Each subject centered and crop safe.

Fragrance ritual prompt: Create one premium photorealistic editorial fragrance campaign photograph for a black, champagne gold and ivory boutique website called MICHAEL'S SCENTSATION. Landscape 3:2 composition, at least 1536 by 1024 pixels if available. An adult person in an ivory linen shirt applies fragrance: a natural anatomically correct hand holds a small elegant amber glass perfume atomizer near the opposite wrist, with a delicate fine mist visibly suspended in warm side light. Close crop of hands, wrist and shirt only; no face, no identifiable person. Quiet tactile setting, warm beige stone and softly blurred deep brown background, restrained luxury styling, realistic glass and skin textures, natural color and soft shadows. Both hands and the perfume bottle remain in the center two thirds so the image can be cropped on phones. This is a fragrance ritual photograph, not a website mockup. No lettering, labels, logos, watermark, grids, collage or decorative overlays.

## Licensed homepage video footage

The carousel includes actual footage downloaded from Pexels on 6 November 2026. The [Pexels license](https://www.pexels.com/license/) permits website and commercial use and modification, without implying endorsement by the people or brands shown. These clips illustrate fragrance application; they are not customer testimonials or evidence of the store's stock.

| Local video                      | Creator          | Original footage                                                                                                        |
| -------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `public/videos/ritual-wrist.mp4` | cottonbro studio | [Perfume applied to a wrist](https://www.pexels.com/video/hands-hand-perfume-cosmetics-4154241/)                        |
| `public/videos/ritual-mist.mp4`  | Yaroslav Shuraev | [Perfume sprayed beside a window](https://www.pexels.com/video/close-up-footage-of-a-woman-spraying-a-perfume-5084552/) |

Both originals were trimmed from second 1 to second 9, stripped of audio, and encoded as 960 × 506 H.264 MP4s at 24 fps with `yuv420p` and fast-start metadata. The final files are 442,114 and 305,124 bytes respectively. Each was fully decoded to verify 192 frames and actual movement. `public/images/ritual-wrist.jpg` and `ritual-mist.jpg` are poster frames extracted from the corresponding optimized clips.

The website serves its own copies; visitors do not depend on a third-party video player or external video CDN. Vercel's SPA rewrite excludes `/videos/` so media requests and HTTP byte ranges reach the static files.
