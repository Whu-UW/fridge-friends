/**
 * Grocery Receipt OCR Service
 *
 * Features:
 * 1. Resilient Multi-Model Failover:
 *    If Google's free-tier server experiences a transient 503 (high demand) or 429 (rate limit),
 *    it automatically retries with backoff and rotates across candidate models
 *    (gemini-flash-latest -> gemini-3.6-flash -> gemini-3.5-flash -> gemini-3.8-flash).
 * 2. Instant Mock Fallback when running offline or without an API key.
 */

export interface ScannedReceiptItem {
  name: string;
  price: number;
  category: string;
  quantity?: string;
  shelfLifeDays?: number;
  dateExpired?: string;
}

export interface ScannedReceiptResult {
  storeName: string;
  tripDate: string; // ISO 8601 string
  totalCost: number;
  items: ScannedReceiptItem[];
}

/** What a person sees when a scan cannot be completed. No vendor, no model, no status code. */
const SCAN_BUSY_ERROR =
  'Receipt scanning is busy right now. Please try again in a moment.';
const SCAN_FAILED_ERROR =
  'Could not read that receipt. Please try again, or add the items yourself.';

export const isGeminiKeyConfigured = (): boolean => {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0 && !key.includes('your_'));
};

const MOCK_RECEIPT_TEMPLATES: ScannedReceiptResult[] = [
  {
    storeName: "Trader Joe's",
    tripDate: new Date().toISOString(),
    totalCost: 19.16,
    items: [
      { name: 'Organic Baby Spinach', price: 2.99, category: 'Produce', quantity: '1 bag', shelfLifeDays: 4 },
      { name: 'Boneless Chicken Thighs', price: 7.49, category: 'Meat', quantity: '1.2 lbs', shelfLifeDays: 3 },
      { name: 'Heavy Whipping Cream', price: 3.69, category: 'Dairy', quantity: '1 pint', shelfLifeDays: 5 },
      { name: 'Crimini Mushrooms', price: 2.99, category: 'Produce', quantity: '8 oz', shelfLifeDays: 4 },
      { name: 'Sourdough Baguette', price: 2.0, category: 'Bakery', quantity: '1 loaf', shelfLifeDays: 5 },
    ],
  },
  {
    storeName: 'Whole Foods Market',
    tripDate: new Date(Date.now() - 3 * 24 * 36e5).toISOString(),
    totalCost: 27.50,
    items: [
      { name: 'Atlantic Salmon Fillet', price: 11.99, category: 'Seafood', quantity: '0.8 lbs', shelfLifeDays: 2 },
      { name: 'Organic Strawberries', price: 4.99, category: 'Produce', quantity: '1 lb', shelfLifeDays: 4 },
      { name: 'Greek Yogurt Plain', price: 5.49, category: 'Dairy', quantity: '32 oz', shelfLifeDays: 14 },
      { name: 'Avocados (Bag of 4)', price: 5.03, category: 'Produce', quantity: '4 pack', shelfLifeDays: 5 },
    ],
  },
];

let templateIndex = 0;

export async function scanGroceryReceiptMock(): Promise<ScannedReceiptResult> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const template = MOCK_RECEIPT_TEMPLATES[templateIndex % MOCK_RECEIPT_TEMPLATES.length];
  templateIndex += 1;

  return {
    ...template,
    tripDate: new Date().toISOString(),
  };
}

/**
 * Parses real receipt photo using Google Gemini Vision with automatic 503 retry and model failover
 */
export async function scanGroceryReceiptWithGemini(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  onStatusUpdate?: (status: string) => void
): Promise<ScannedReceiptResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    throw new Error(SCAN_FAILED_ERROR);
  }

  // Active verified models available for this API key
  const candidateModels = [
    'gemini-flash-latest',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ];

  const prompt = `
Analyze this grocery receipt photo and extract all purchased grocery food items accurately.
Return a STRICT JSON object with this exact schema:
{
  "storeName": "Name of grocery store",
  "tripDate": "Transaction date YYYY-MM-DD (or today's date if not visible)",
  "totalCost": 0.00,
  "items": [
    {
      "name": "Standardized clean grocery food name (e.g. expand 'ORG BBY SPNCH' to 'Organic Baby Spinach')",
      "price": 0.00,
      "category": "Produce | Meat | Seafood | Dairy | Bakery | Pantry | Beverages | Snacks",
      "quantity": "Quantity or '1 item'",
      "shelfLifeDays": 5
    }
  ]
}
Rules:
- Standardize cryptic receipt abbreviations into clear, culinary grocery food names.
- Extract the actual unit price for each food item.
- Ignore non-food items (plastic bags, paper towels, taxes, deposits).
- Provide an estimated refrigerated shelf life in days for each food item.
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
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  };

  let lastError: Error | null = null;
  let rawJson: string | null = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const model = candidateModels[mIdx];

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (mIdx > 0 || attempt > 1) {
          // The model being tried is our business, not the user's
          console.log(`Receipt scan: retrying with ${model}`);
          onStatusUpdate?.('Still reading, this one is taking a moment...');
          // Short pause before retrying busy cluster
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) break;
        } else if (response.status === 503 || response.status === 429) {
          // 503 High demand or 429 Rate limit: proceed to next attempt or model
          const errText = await response.text();
          console.warn(`Receipt scan: ${model} busy (${response.status})`);
          lastError = new Error(SCAN_BUSY_ERROR);
          continue;
        } else {
          const errText = await response.text();
          console.warn(`Receipt scan failed (${response.status}): ${errText.slice(0, 200)}`);
          lastError = new Error(SCAN_FAILED_ERROR);
          break; // Don't retry client errors (400, etc.) on the same model
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (rawJson) break;
  }

  if (!rawJson) {
    throw lastError || new Error(SCAN_BUSY_ERROR);
  }

  const parsed = JSON.parse(rawJson);

  return {
    storeName: parsed.storeName || 'Grocery Store',
    tripDate: parsed.tripDate || new Date().toISOString(),
    totalCost: Number(parsed.totalCost) || 0,
    items: Array.isArray(parsed.items)
      ? parsed.items.map((item: any) => ({
          name: item.name || 'Grocery Item',
          price: Number(item.price) || 2.5,
          category: item.category || 'Produce',
          quantity: item.quantity || '1 item',
          shelfLifeDays: Number(item.shelfLifeDays) || 5,
        }))
      : [],
  };
}
