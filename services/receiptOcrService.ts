/**
 * Grocery Receipt OCR Service Mock Scaffolding
 *
 * Simulates OCR extraction from receipt photos:
 * - Extracts Store Name, Trip Date (Date Bought), itemized items with Name & Price.
 * - Ready to be replaced by Document AI, Tesseract, Mindee, or Supabase Edge Functions.
 */

export interface ScannedReceiptItem {
  name: string;
  price: number;
  category: string;
  quantity?: string;
}

export interface ScannedReceiptResult {
  storeName: string;
  tripDate: string; // ISO 8601 string
  totalCost: number;
  items: ScannedReceiptItem[];
}

const MOCK_RECEIPT_TEMPLATES: ScannedReceiptResult[] = [
  {
    storeName: "Trader Joe's",
    tripDate: new Date().toISOString(),
    totalCost: 19.16,
    items: [
      { name: 'Organic Baby Spinach', price: 2.99, category: 'Produce', quantity: '1 bag' },
      { name: 'Boneless Chicken Thighs', price: 7.49, category: 'Meat', quantity: '1.2 lbs' },
      { name: 'Heavy Whipping Cream', price: 3.69, category: 'Dairy', quantity: '1 pint' },
      { name: 'Crimini Mushrooms', price: 2.99, category: 'Produce', quantity: '8 oz' },
      { name: 'Sourdough Baguette', price: 2.0, category: 'Bakery', quantity: '1 loaf' },
    ],
  },
  {
    storeName: 'Whole Foods Market',
    tripDate: new Date(Date.now() - 3 * 24 * 36e5).toISOString(),
    totalCost: 27.50,
    items: [
      { name: 'Atlantic Salmon Fillet', price: 11.99, category: 'Seafood', quantity: '0.8 lbs' },
      { name: 'Organic Strawberries', price: 4.99, category: 'Produce', quantity: '1 lb' },
      { name: 'Greek Yogurt Plain', price: 5.49, category: 'Dairy', quantity: '32 oz' },
      { name: 'Avocados (Bag of 4)', price: 5.03, category: 'Produce', quantity: '4 pack' },
    ],
  },
  {
    storeName: 'Local Farmers Market',
    tripDate: new Date(Date.now() - 6 * 24 * 36e5).toISOString(),
    totalCost: 16.25,
    items: [
      { name: 'Heirloom Tomatoes', price: 4.50, category: 'Produce', quantity: '3 pcs' },
      { name: 'Fresh Basil Bunch', price: 2.75, category: 'Produce', quantity: '1 bunch' },
      { name: 'Artisan Goat Cheese', price: 6.50, category: 'Dairy', quantity: '1 log' },
      { name: 'Honey Honeycomb', price: 2.50, category: 'Pantry', quantity: '1 jar' },
    ],
  },
];

let templateIndex = 0;

export async function scanGroceryReceiptMock(): Promise<ScannedReceiptResult> {
  // Simulate OCR image processing delay
  await new Promise((resolve) => setTimeout(resolve, 80));

  const template = MOCK_RECEIPT_TEMPLATES[templateIndex % MOCK_RECEIPT_TEMPLATES.length];
  templateIndex += 1;

  // Clone with fresh timestamps
  return {
    ...template,
    tripDate: new Date().toISOString(),
  };
}
