# Fridge Friends

Fridge Friends is a mobile app for wasting less food. You log what is in your fridge and pantry, and each item shows up as a small character whose mood follows the number of days it has left. Food that is close to going off can become a recipe, or a shared meal with friends who have ingredients of their own to use up.

It is built with Expo and React Native. The API it talks to is a FastAPI service that runs separately and is not part of this repo.

## What the app does

There are four tabs.

- Fridge is the home screen. Items sit on wooden shelves as characters, each with a chip that reads Fresh, Use soon or Use now and a time left. Add groceries by hand, or take a photo of a receipt and let Gemini read it. Tap an item to open a sheet where you can toss it, which counts as waste, or remove it because you added it by mistake. Press and hold to select several items and send them to Rescue or Feast mode.
- Meals lists your feasts by state: invites waiting on you, feasts waiting on RSVPs, feasts being cooked and finished ones. Saved recipes are here too.
- Friends is where you invite people by username, accept requests and browse a friend's fridge.
- You has your buddy character, your account, your food preferences (diets, foods to avoid, favorite cuisines) and a chart of money spent, wasted and rescued by week or month.

Rescue mode takes the items you selected and suggests five recipes that use them. Once you have cooked, you check in. "We ate it! Rescued" plays a celebration. "Didn't work out" plays a scene where a press flattens the ingredient.

Feast mode is the group version. You pick which friends to cook with, choose one of the suggested recipes, send invites and wait for RSVPs. Invites arrive as push notifications and as alerts inside the app, with a count on the Meals tab.

## Tech stack

- Expo SDK 57, React Native 0.86, React 19.2 and TypeScript in strict mode
- Expo Router for navigation, with typed routes on
- react-native-svg and react-native-reanimated for the food characters and their motion
- expo-image-picker for receipt photos and expo-notifications for push
- AsyncStorage for the small amount of data kept on the device
- Google Gemini for reading receipts
- The FastAPI backend for accounts, groceries, friends, feasts, notifications and stats

## Getting started

You need npm and Node 22.13 or newer, which is the minimum Node version for Expo SDK 57. The SDK supports iOS 16.4 and newer and Android 7 and newer. To run on a simulator you also need Xcode for iOS, or Android Studio with Android SDK Platform 36 for Android.

```bash
git clone https://github.com/Whu-UW/fridge-friends.git
cd fridge-friends
npm install
```

### Environment variables

Create a `.env` file in the project root:

```dotenv
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

That key is for receipt scanning. You can get one from [Google AI Studio](https://aistudio.google.com/). Without a key the app still runs, but the scanner hands back sample receipts instead of reading your photo.

The app uses the hosted backend at `https://fridge-friends-be-144bbbd9.fastapicloud.dev` unless you set `EXPO_PUBLIC_BACKEND_URL` to something else.

Expo copies `EXPO_PUBLIC_` variables into the JavaScript bundle, so anyone who unpacks a build can read the Gemini key. Use one with a low quota. Restart the dev server after you edit `.env`.

### Running the app

- `npm run ios` builds the native app and opens it in the iOS simulator.
- `npm run android` does the same for an Android emulator or a connected device.
- `npm start` starts the dev server without building anything.
- `npm run start:sim` is `npm start` with the dev server address set to 127.0.0.1. Use it if the iOS simulator cannot reach the server over your network address.
- `npm run web` starts the web target.

The first native build generates the `ios/` and `android/` folders. They are gitignored, so they never end up in a commit.

On the login screen you can sign up with a username, password and buddy, or use "Skip & explore demo shelf" to look around without an account.

### Push notifications

Remote push needs a development build on a physical device. Expo Go on Android has not supported remote push since SDK 53, and the app skips push registration on simulators and emulators. Once the app is connected to the backend, it registers the device's Expo push token there. See the [expo-notifications page for SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) for setup details.

## Working on the code

This project is on Expo SDK 57, which differs from older SDKs in places. When you look something up, use the [SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/) and not an older tutorial.

### Project layout

```
app/                     Screens and routes (Expo Router)
  (tabs)/                Fridge, Meals, Friends and You tabs, plus the feast flow
  rescue.tsx             Recipe suggestions for the selected items
  recipe/[id].tsx        Recipe steps and the check-in after cooking
  friend/[id].tsx        A friend's fridge
  login.tsx, signup.tsx, onboarding.tsx
components/              Character renderer, modals and the sticker-style UI pieces
constants/Theme.ts       Colors and fonts
context/AppContext.tsx   App state, backend sync and most actions
services/
  backendApi.ts          API client and the adapters between API and app types
  foodCharacterLookup.ts Food name to character, category and mood
  llmService.ts          Stand-in for recipe and shelf-life generation
  receiptOcrService.ts   Receipt photo to line items, through Gemini
  notificationService.ts Push token registration and notification handlers
  supabase/              Row types the app uses, plus an unused Supabase client
assets/characters/       Generated SVG data for the characters
scripts/                 SVG bundling and the test scripts
utils/dateUtils.ts       Local date helpers
ui fridge friends/       Design handover: spec, character art, screen PDF
```

State lives in one React context. `AppContext` signs the user in, loads their fridge, friends and feasts from the API, and hands them to screens through `useApp()`. It reloads on launch and polls every 20 seconds for new feast invitations and notifications. `services/backendApi.ts` is the typed API client. It converts API responses into the row types the screens use, so screens never handle raw API shapes. The signed-in user's id is kept in AsyncStorage.

### How characters and freshness work

`lookupFoodCharacter` in `services/foodCharacterLookup.ts` matches a food name to one of nine characters by keyword: milk, egg, salmon, spinach, bell pepper, eggplant, lemon, canned tomatoes and pasta. Cheese and yogurt get the milk carton, chicken gets the salmon, and anything it does not recognize gets the spinach. Each character has one of three categories, and the category sets how its mood changes as the days run down.

- Hard expiry foods (dairy, eggs, meat and fish) are happy with more than 3 days left, uneasy with 1 to 3 days left and toxic once the days run out.
- Gradual decline foods (produce and fruit) follow days left divided by shelf life. They are happy from 75 to 100 percent, uneasy from 50 to 75, nervous from 25 to 50, wilting from 5 to 25 and done below 5.
- Shelf-stable foods (canned goods, pasta, grains, bread) use the same ratio. They are happy and rolling from 50 to 100 percent, uneasy from 15 to 50 and done below 15.

The chip on each item is separate and depends only on days left: Fresh above 5 days, Use soon at 3 to 5, Use now at 2 or fewer. Use soon and Use now items count as at risk.

When you add an item by hand you pick its expiry date. For a scanned receipt, Gemini guesses a shelf life for each line, and you can change the date before you add the items. These shelf lives are rough estimates, so do not treat them as food safety advice.

### Character art

The character SVGs come from the design handover. `scripts/bundle_svgs.mjs` reads every SVG in `ui fridge friends/fridge-friends-handover/assets/characters/` and writes them into `assets/characters/svgData.ts`, which is the file the app imports. Run it again whenever you change an SVG.

```bash
node scripts/bundle_svgs.mjs
```

It strips the CSS saturate filter from the files first, because react-native-svg cannot parse it.

### Checks and scripts

There is no linter or test suite yet. `npx tsc --noEmit` type-checks the project.

`npm run test:backend` is a smoke test for the API. It creates and deletes a grocery item and a friend request, and it creates a feast and answers its RSVP without deleting the feast afterwards. It targets the hosted backend by default, so set `EXPO_PUBLIC_BACKEND_URL` in your shell to a backend you are happy to fill with test data before you run it.

To try the receipt reader without the app, point it at an image file:

```bash
node --env-file=.env scripts/test_receipt.mjs path/to/receipt.jpg
```

## Building with EAS

`eas.json` defines three profiles. `development` builds a development client for internal distribution, `preview` is a plain internal build and `production` auto-increments the build number. For example:

```bash
npx eas-cli build --profile preview --platform android
```

The project ID in `app.json` points at an existing Expo project, so you need access to it to build. If you are working from a fork, run `npx eas-cli init` to link your own project first.

## Known gaps

- Recipes are templates. `services/llmService.ts` fills a handful of fixed recipes with the names of your ingredients. It is shaped like an LLM client so a real model can replace it, but nothing calls one yet. The same file holds a keyword table that guesses a shelf life for items that arrive without an expiry date.
- Recipes ignore diets, foods to avoid and cuisines. The app collects them and saves them to the backend, but recipe suggestions do not use them yet. The "Matches everyone's preferences" label on the feast recipe screen is static text.
- Feast chat is a local mock. Messages stay on your device, and the conversation starts with sample text.
- Feast outcomes and saved recipes are stored on the device. The backend has no place for them yet, so they do not follow you to another phone.
- The app needs the backend. If it cannot reach the API, the fridge, friends and feasts lists come up empty.
- `services/supabase/` has a Supabase client and auth helpers that no screen uses. Accounts go through the FastAPI backend, and only the row types in `services/supabase/types.ts` are in use.

## Design docs

`ui fridge friends/fridge-friends-handover/docs/design/` has the original design handover. [handover.md](ui%20fridge%20friends/fridge-friends-handover/docs/design/handover.md) covers the design system, character kit, motion, screen flows, data model and freshness rules. `character-demo.html` is an animated demo of every character and mood, and `screens.pdf` shows all the screens. It is a snapshot from September 19, 2026, and the app has moved on in places. The Shelf, for one, is now the Fridge tab.

## License

MIT. See [LICENSE](LICENSE).
