# Photo Folders App

A React Native (Expo) app + Node/Express/MongoDB backend that lets you:

- Capture a photo with the camera
- Immediately enter **name**, **price**, and **date**
- See photos grouped into **folders by person name** (a folder is created automatically the first time a name is used)
- **Search folders by name** on the home screen, and **export every folder + photo as a single .zip** from there too
- Open a folder to see all photos inside it, and **search/sort by price or date**
- Tap a photo to see it **full screen** with **pinch-to-zoom / double-tap-to-zoom**, swipe between photos in the folder, then **download** it to your device or **share** it
- **Multi-select** photos (long-press one, then tap others — just like Google Photos) to download or share several at once
- Tap "Edit" from the full-screen viewer to change name/price/date or delete a photo
- If you **change the name while editing**, the photo automatically appears under the new folder next time you look (folders aren't real disk folders — they're just a live grouping by the `name` field, so "moving" is instant and automatic)

Images are stored directly inside MongoDB as base64 strings, as requested.

## Project structure

```
photo-folders-app/
├── backend/          Node + Express + Mongoose API
│   ├── models/Item.js
│   ├── routes/items.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── mobile/           Expo React Native app
    ├── App.js
    ├── app.json
    ├── package.json
    └── src/
        ├── api.js
        ├── utils/
        │   ├── mediaActions.js     (download/share helpers)
        │   └── exportZip.js        (bundles every folder + photo into a .zip)
        └── screens/
            ├── HomeScreen.js        (folder grid, searchable, Export ZIP)
            ├── CaptureScreen.js     (camera + form)
            ├── FolderScreen.js      (photos in a folder, searchable/sortable, multi-select)
            ├── ImageViewerScreen.js (full-screen zoomable/swipeable viewer, download/share)
            └── ItemDetailScreen.js  (edit / delete)
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- If you have MongoDB running locally: `MONGO_URI=mongodb://localhost:27017/photo_folders`
- If you'd rather use MongoDB Atlas (recommended, since it works from your phone without extra networking setup): create a free cluster at https://www.mongodb.com/cloud/atlas, and paste your connection string.

Start the server:
```bash
npm run dev
# or: npm start
```
You should see `MongoDB connected` and `Server running on port 5000`.

## 2. Mobile app setup

```bash
cd mobile
npx expo install
```
(This installs the packages listed in `package.json`, including `expo-file-system`, `expo-sharing`, and `expo-media-library` used for download/share, plus `react-native-image-zoom-viewer` (pinch/double-tap zoom in the full-screen viewer) and `jszip` (building the "Export ZIP" file), all at versions compatible with this Expo SDK. `npx expo install` is preferred over plain `npm install` here so the native-module versions stay compatible with Expo Go.)

Open `src/api.js` and set `API_BASE_URL` to your computer's **local network IP** (not `localhost` — your phone/emulator can't reach your computer's localhost):

```js
const API_BASE_URL = 'http://192.168.1.10:5000/api'; // example
```

Find your IP with `ipconfig` (Windows) or `ifconfig` / `ip a` (Mac/Linux). Your phone and computer must be on the same Wi-Fi network.

Then start Expo:
```bash
npx expo start
```
Scan the QR code with the **Expo Go** app (Android/iOS) to run it on your phone, or press `a`/`i` for an emulator.

## How it works

- **Capture flow**: `CaptureScreen` opens the camera, then shows a form for name/price/date. On save, it `POST`s `{ name, price, date, image(base64) }` to `/api/items`.
- **Folders**: `HomeScreen` calls `GET /api/items/folders/all`, which uses a MongoDB aggregation to group items by `name` and return one card per distinct name, with a thumbnail and photo count.
- **Folder contents**: `FolderScreen` calls `GET /api/items/folder/:name` to list every photo with that name.
- **Edit / auto-move**: `ItemDetailScreen` calls `PUT /api/items/:id`. Since folders are computed live from the `name` field, changing the name there is all it takes for the photo to "move" to (or create) a different folder.
- **Delete**: `DELETE /api/items/:id` removes the document (and its image) from MongoDB.
- **Full-screen viewer**: tapping a photo (outside of selection mode) opens `ImageViewerScreen` with the whole folder's (filtered/sorted) photo list, so you can swipe left/right through them. **Pinch or double-tap to zoom** in/out (powered by `react-native-image-zoom-viewer`, pure JS so it works in Expo Go with no native rebuild). It has Download and Share buttons and an Edit shortcut into `ItemDetailScreen`.
- **Download**: saves the photo to your device's Photos/Gallery app via `expo-media-library`. You'll be asked for photo library permission the first time.
- **Share**: opens your device's native share sheet via `expo-sharing`, so you can send the photo to WhatsApp, email, AirDrop, etc.
- **Multi-select**: long-press a photo in a folder to enter selection mode, then tap other photos to add them (a checkmark appears; tap the search bar area is replaced by a "N selected / Select all" bar). A bottom bar lets you Download or Share the whole selection.
  - **Download** saves every selected photo to the device gallery in one action.
  - **Share** opens the native share sheet once per selected photo, one after another — iOS/Android's built-in share sheet (which is what `expo-sharing` uses, so this works inside plain Expo Go) only accepts one file at a time, so there isn't a single combined "share 5 photos" dialog without adding a native module. You're warned about this before it starts. If you want a true single-sheet multi-photo share (like Google Photos), swap in [`react-native-share`](https://github.com/react-native-share/react-native-share)'s `Share.open({ urls: [...] })` — it works well, but needs a custom dev client / EAS build rather than plain Expo Go, since it isn't part of the managed Expo SDK.
- **Export ZIP**: the "⬇ Export ZIP" button on the Home screen calls `GET /api/items` (the existing flat "all items" route) to fetch every photo across every folder, groups them back into one sub-folder per person/name (matching what you see on Home), and zips it all up client-side with `jszip`. The finished `.zip` is written to the device and handed to the native share sheet, so you pick where to save it — Files/Drive on Android, "Save to Files" on iOS, etc. A progress modal shows packing/compressing status. Note: since zipping happens entirely on the phone, exporting a very large photo library may take a while and use noticeable memory — fine for typical personal use, but for thousands of large photos consider adding a server-side export endpoint instead.

## Notes & possible upgrades

- Images are stored as base64 in MongoDB for simplicity, per your request. For a production app with many/large photos, storing images in cloud storage (e.g. S3/Cloudinary) and only the URL in MongoDB would be faster and cheaper — happy to convert it to that if you want.
- There's no login/auth — anyone with the API URL can read/write. Add auth (e.g. JWT) before shipping this publicly.
- Currency symbol is hardcoded to ₹ (rupee) in `FolderScreen.js` — change it if needed.
