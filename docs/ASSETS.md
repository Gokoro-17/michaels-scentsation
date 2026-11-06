# Brand and campaign assets

## Supplied brand logo

`public/images/brand-logo.png` is the latest 500 × 500 logo supplied by the owner, saved unchanged from the attachment. This upload contains an opaque black canvas rather than an alpha channel. It is displayed against dark brand surfaces with CSS screen blending, preserving the supplied lettering and bottle monogram. No artwork was redrawn or generated. `src/BrandLogo.tsx` frames the image through an SVG viewport to remove excess outer space in the layout.

The logo is deliberately smaller in the storefront header, footer and admin screens. The favicon embeds the latest image and frames its bottle monogram without depending on external SVG image loading. Regenerate it with `node scripts/brand-favicon.mjs` after replacing the logo asset.

## Interface and social icons

Interface controls use Lucide React. WhatsApp and Instagram links use the standard Font Awesome Free SVG brand marks packaged locally at `public/icons/brands.svg`. Upstream attribution comments, original SVGs, the complete license and source links are preserved in `public/icons/`. See [icon sources and license](../public/icons/SOURCES.md). No icon font or external icon CDN is required at runtime.

## Generated campaign photography

All current website campaign images were generated with the built-in image generation tool. They illustrate the brand and categories; they are not published catalogue items or evidence of inventory. Use actual product photography when adding products in admin.

- `public/images/hero.jpg`: generated brand campaign, optimized from the original PNG.
- `public/images/story.jpg`: alternate optimized crop of the brand campaign.
- `public/images/deodorants.jpg`, `oils.jpg`, `luxury.jpg`, `combos.jpg`: extracted quadrants from a generated category contact sheet, resized and JPEG compressed.

Hero prompt: Premium photorealistic editorial fragrance photograph for MICHAEL'S SCENTSATION. Amber perfume in substantial clear rectangular glass, matte black cap, small ivory brand label, cream travertine plinth, beige plaster wall, sculptural branch, warm afternoon sunlight and realistic glass refraction. No overlaid text or people.

Category prompt: Four independent photographs in an equal 2 by 2 grid, warm ivory/beige/black/amber palette, no text or logos. Top left: black deodorant sprays with champagne caps. Top right: amber roll-on perfume oils on linen with a woody branch. Bottom left: amber sculptural glass perfume on travertine. Bottom right: black deodorant and square perfume beside a cream gift box. Each subject centered and crop safe.
