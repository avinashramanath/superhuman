# Superhuman

Superhuman is an iPhone-first daily routine tracker built as a static progressive web app. It starts with a customizable five-task sample routine and stores routine and completion history in this browser's local storage. There is no account; data stays on this device unless you explicitly choose private sync.

The interface uses a dark neon visual theme, groups tasks into distinct sections, offers 60 task icons, and awards milestone badges for task completions, full routine days, and streaks up to 365 days. The **Better me** progress core grows with routine tasks, full days, and streaks; its lifetime growth record remains after missed days.

The **Conquer smoking** view lets you start a smoke-free timer, optionally enter your usual daily cigarette count and pack price, take a two-minute craving pause, and record a slip. It includes a dedicated set of smoke-free badges and a health-benefit timeline adapted from the FNHA “The Benefits of Quitting Smoking” poster shared with the project. A slip restarts the current timer without deleting earlier attempts or the best smoke-free run; the app responds without judgment. Cigarette and savings counts are rough estimates from the current timer and the personal values entered. The tracker is not medical advice or a substitute for professional cessation support.

The **Journal** supports private text and mood entries with one optional photo per entry and a wider range of moods. Saved entries show their mood and photo. Text and metadata are saved in this browser's local storage; resized photos are saved in this browser's IndexedDB. Entries and photos stay on this device unless you explicitly include them in an encrypted sync backup. Clearing browser site data, uninstalling the browser, or switching devices may remove or leave entries behind.

Routine, smoking, and journal data remain on this device by default. Sync is manual and opt-in; the app does not automatically upload changes.

## Run locally

Serve this folder from a local web server (service workers and PWA installation require `localhost` or HTTPS), then open the site in a browser. For example, with Python installed:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`. On iPhone, visit the deployed HTTPS site in Safari and choose **Share → Add to Home Screen**.

## Private sync

Private sync is available as an optional, manual backup across devices. Open **Private sync settings** from the profile button and generate or enter the same 43-character sync code on each device. The app never saves the code; keep it private and store a copy somewhere safe. Anyone with the code can access that sync space, and a lost code cannot be recovered.

Before upload, the browser encrypts routine data, quit history, journal entries, and photos with AES-GCM using a key derived from the sync code. Supabase receives the encrypted backup, an opaque sync identifier, and an update time—not the plaintext or the code. Backups are limited to 2.75 MiB of plaintext per transfer.

Sync is hosted in a dedicated `superhuman` schema in the existing **Project Zero** Supabase project. Its `sync_vault` table has row-level security enabled and is inaccessible to anonymous and authenticated database roles; only the Edge Function can access it with the project service role. The existing `public.project_zero_state` table is separate and is not used by Superhuman sync. The `superhuman-sync` Edge Function is deployed and uses Supabase's built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables.

Upload replaces the cloud backup for that code; restore replaces this device's routine, quit history, journal, and photos; delete removes the cloud backup. Each operation requires an explicit confirmation. Sync does not merge devices or run automatically. Local browser storage is not encrypted at rest, and this feature does not replace a separate device backup.

## Public website and automatic updates

The included GitHub Actions workflow deploys this static site to GitHub Pages whenever a change is pushed to the `main` branch. No build command or third-party hosting account is needed. The GitHub Pages URL follows the form `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/`.

To connect the repository for the first time:

1. Create a **public, empty** GitHub repository for Superhuman. Do not initialize it with a README, license, or `.gitignore`.
2. Connect this local repository to it with `git remote add origin https://github.com/YOUR-GITHUB-USERNAME/YOUR-REPOSITORY-NAME.git`, then push the `main` branch with `git push -u origin main`. GitHub may ask you to sign in or authorize Git Credential Manager.
3. If GitHub Pages is not enabled automatically, open the repository's **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
4. Open the published URL shown under **Settings → Pages** or in the completed **Deploy Superhuman to GitHub Pages** workflow.

For future updates, make and push a commit to `main`; the same workflow republishes the site. The app's routines, quit tracking, and journal remain in each browser's local storage unless you explicitly use the manual encrypted sync described above. Publishing the website does not make personal data public.
