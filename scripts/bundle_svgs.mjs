import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgDir = path.resolve(__dirname, '../ui fridge friends/fridge-friends-handover/assets/characters');
const outputDir = path.resolve(__dirname, '../assets/characters');
const outputFile = path.resolve(outputDir, 'svgData.ts');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(svgDir).filter(f => f.endsWith('.svg'));
console.log(`Found ${files.length} SVG files.`);

const svgMap = {};

for (const file of files) {
  const key = file.replace('.svg', '');
  let content = fs.readFileSync(path.join(svgDir, file), 'utf-8').trim();
  // Strip CSS web filter:saturate which is invalid in react-native-svg parser
  content = content.replace(/\s*style="filter:saturate\([^)]+\)"/g, '');
  content = content.replace(/\s*filter="saturate\([^)]+\)"/g, '');
  svgMap[key] = content;
}

const tsContent = `/**
 * Pre-compiled SVG Assets for Fridge Friends Characters
 * Generated automatically from ui fridge friends/fridge-friends-handover/assets/characters
 */

export const CHARACTER_SVGS: Record<string, string> = ${JSON.stringify(svgMap, null, 2)};

export function getCharacterSvg(foodKey: string, mood: string = 'happy'): string | undefined {
  const directKey = \`\${foodKey}-\${mood}\`;
  if (CHARACTER_SVGS[directKey]) {
    return CHARACTER_SVGS[directKey];
  }
  // Fallback to happy mood for this food
  const happyKey = \`\${foodKey}-happy\`;
  if (CHARACTER_SVGS[happyKey]) {
    return CHARACTER_SVGS[happyKey];
  }
  // Fallback to spinach-happy as absolute fallback
  return CHARACTER_SVGS['spinach-happy'];
}
`;

fs.writeFileSync(outputFile, tsContent, 'utf-8');
console.log(`Successfully generated ${outputFile} with ${Object.keys(svgMap).length} SVG entries.`);
