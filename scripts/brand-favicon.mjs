import { readFile, writeFile } from 'node:fs/promises';

// Embed the original pixels so SVG favicon image restrictions cannot hide the artwork.
const original = await readFile('public/images/brand-logo.png');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="180 146 140 140"><image width="500" height="500" href="data:image/png;base64,${original.toString('base64')}"/></svg>\n`;
await writeFile('public/favicon.svg', svg);
console.log('Favicon updated with the supplied brand symbol.');
