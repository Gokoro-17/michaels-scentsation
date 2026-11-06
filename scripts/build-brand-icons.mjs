import { readFile, writeFile } from 'node:fs/promises';

const symbols = await Promise.all(
  ['whatsapp', 'instagram'].map(async (name) => {
    const svg = await readFile(`public/icons/${name}.svg`, 'utf8');
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
    if (!viewBox || !svg.includes('<path') || svg.includes('<script'))
      throw new Error(`Invalid icon: ${name}`);
    const content = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    return `<symbol id="${name}" viewBox="${viewBox}">${content}</symbol>`;
  }),
);
await writeFile(
  'public/icons/brands.svg',
  `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`,
);
console.log('Packaged two standard brand icons with attribution.');
