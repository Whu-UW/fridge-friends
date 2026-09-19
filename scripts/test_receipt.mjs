/**
 * Standalone Gemini Receipt OCR Tester
 *
 * Usage:
 *   node scripts/test_receipt.mjs <path-to-receipt-image> [GEMINI_API_KEY]
 *
 * Or set environment variable:
 *   set GEMINI_API_KEY=your_key (Windows)
 *   export GEMINI_API_KEY=your_key (Mac/Linux)
 *   node scripts/test_receipt.mjs <path-to-receipt-image>
 */

import fs from 'fs';
import path from 'path';

const imagePath = process.argv[2];
const apiKey = process.argv[3] || process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!imagePath) {
  console.error('\n❌ Please provide a path to a receipt image.');
  console.log('Usage: node scripts/test_receipt.mjs <path-to-receipt.jpg> [api_key]\n');
  process.exit(1);
}

if (!apiKey) {
  console.error('\n❌ Gemini API Key not found.');
  console.log('Get a free key from https://aistudio.google.com/ and either:');
  console.log('  1. Pass it as the second argument: node scripts/test_receipt.mjs <image> <key>');
  console.log('  2. Set GEMINI_API_KEY in your environment or in .env.local\n');
  process.exit(1);
}

if (!fs.existsSync(imagePath)) {
  console.error(`\n❌ File not found: ${imagePath}\n`);
  process.exit(1);
}

// Determine mime type
const ext = path.extname(imagePath).toLowerCase();
const mimeTypeMap = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const mimeType = mimeTypeMap[ext] || 'image/jpeg';

const imageBuffer = fs.readFileSync(imagePath);
const base64Data = imageBuffer.toString('base64');

console.log(`\n📄 Sending receipt to Gemini Flash (${(imageBuffer.length / 1024).toFixed(1)} KB)...`);

const promptText = `
You are an expert grocery receipt parser and culinary food safety system.
Analyze this grocery receipt photo and extract all items accurately.
Return a STRICT JSON object matching this exact schema:
{
  "storeName": "Name of grocery store (e.g. Trader Joe's, Whole Foods)",
  "tripDate": "Transaction date in ISO format YYYY-MM-DD (or today's date if missing)",
  "totalCost": 0.00,
  "items": [
    {
      "name": "Standardized human-readable grocery food name (e.g. decode 'ORG BBY SPNCH' to 'Organic Baby Spinach')",
      "rawReceiptText": "Exact text line from receipt",
      "price": 0.00,
      "category": "Produce | Meat | Seafood | Dairy | Bakery | Pantry | Beverages | Snacks",
      "quantity": "Quantity or '1 item'",
      "shelfLifeDays": 5
    }
  ]
}
Important:
- Standardize cryptic abbreviations into clear culinary grocery names.
- Extract the actual unit price paid for each food item.
- Ignore non-food items (e.g. plastic bags, batteries, paper towels, tax).
- Provide a realistic estimated refrigerated shelf life in days for each food item.
`;

const payload = {
  contents: [
    {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: promptText,
        },
      ],
    },
  ],
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.1,
  },
};

const modelsToTry = ['gemini-flash-latest', 'gemini-3.6-flash'];
let rawJson = null;
let lastError = null;

const startTime = Date.now();
for (const model of modelsToTry) {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const result = await res.json();
      rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) break;
    } else {
      const errText = await res.text();
      lastError = new Error(`Model ${model} returned ${res.status}: ${errText}`);
    }
  } catch (e) {
    lastError = e;
  }
}

if (!rawJson) {
  console.error('\n❌ Gemini models failed to return content:', lastError?.message || lastError);
  process.exit(1);
}

try {
  const parsed = JSON.parse(rawJson);
  const durationMs = Date.now() - startTime;

  console.log(`\n✅ Gemini Extraction Succeeded in ${durationMs}ms!\n`);
  console.log('='.repeat(50));
  console.log(`🏪 Store:      ${parsed.storeName}`);
  console.log(`📅 Date:       ${parsed.tripDate}`);
  console.log(`💵 Total:      $${Number(parsed.totalCost).toFixed(2)}`);
  console.log(`🥗 Items:      ${parsed.items?.length || 0} grocery items found`);
  console.log('='.repeat(50));

  console.log('\nExtracted Line Items:');
  parsed.items?.forEach((item, index) => {
    console.log(
      `  ${index + 1}. ${item.name.padEnd(28)} | $${Number(item.price).toFixed(2).padStart(6)} | ${item.category.padEnd(10)} | Shelf Life: ${item.shelfLifeDays} days`
    );
  });

  console.log('\nFull JSON Output:');
  console.log(JSON.stringify(parsed, null, 2));
} catch (error) {
  console.error('\n❌ JSON parse error on Gemini response:', error);
  process.exit(1);
}
