# Superhuman

Superhuman is an iPhone-first daily routine tracker built as a static progressive web app. It starts with a customizable five-task sample routine and stores routine and completion history in this browser's local storage. There is no account and no server currently receives routine data.

The interface uses a dark neon visual theme, groups tasks into distinct sections, offers 60 task icons, and awards milestone badges for task completions, full routine days, and streaks up to 365 days. The **Better me** progress core grows with routine tasks, full days, and streaks; its lifetime growth record remains after missed days.

The **Conquer smoking** view lets you start a smoke-free timer, optionally enter your usual daily cigarette count and pack price, take a two-minute craving pause, and record a slip. It includes a dedicated set of smoke-free badges and a health-benefit timeline adapted from the FNHA “The Benefits of Quitting Smoking” poster shared with the project. A slip restarts the current timer without deleting earlier attempts or the best smoke-free run; the app responds without judgment. Cigarette and savings counts are rough estimates from the current timer and the personal values entered. The tracker is not medical advice or a substitute for professional cessation support.

The **Journal** supports private text and mood entries with one optional photo per entry and a wider range of moods. Saved entries show their mood and photo. Text and metadata are saved in this browser's local storage; resized photos are saved in this browser's IndexedDB. Nothing is uploaded or synced. Photos and other personal data can be moved to a future Supabase sync implementation; no backend sync is currently configured. Clearing browser site data, uninstalling the browser, or switching devices may remove or leave entries behind. Export and backup are not currently provided.

Routine, smoking, and journal data remain on this device. They are not synced or sent to a server.

## Run locally

Serve this folder from a local web server (service workers and PWA installation require `localhost` or HTTPS), then open the site in a browser. For example, with Python installed:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`. On iPhone, visit the deployed HTTPS site in Safari and choose **Share → Add to Home Screen**.

## Private sync status

Cross-device sync is **not implemented**. Publishing the static website does not make browser-local data public, but local storage does not move between devices and is not encrypted at rest.

Recommended no-account sync design, pending approval:

1. Generate a high-entropy private sync code on the first device and use it on each additional device (for example, share it as a QR code).
2. Derive a client-side encryption key from that code and encrypt the routine and history before sending them.
3. Use a dedicated Supabase project with a small Edge Function that verifies the code and stores or returns only the encrypted blob. Keep the table inaccessible to anonymous direct database access, keep the service-role key only in the function, and add request limits and code rotation/revocation.
4. Do not reuse Project Zero's project or tables. A dedicated backend project and its own function, table, policies, and secrets are required. The sync code is a bearer secret; anyone who obtains it could access that sync space.

The dedicated **Superhuman** Supabase project has been provisioned in the `ap-south-1` (Mumbai) region. The Edge Function, private encrypted storage, and device sync have not yet been configured or deployed; all app data remains local until that work is complete and the user explicitly enables sync.

## Public website and automatic updates

The included GitHub Actions workflow deploys this static site to GitHub Pages whenever a change is pushed to the `main` branch. No build command or third-party hosting account is needed. The GitHub Pages URL follows the form `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/`.

To connect the repository for the first time:

1. Create a **public, empty** GitHub repository for Superhuman. Do not initialize it with a README, license, or `.gitignore`.
2. Connect this local repository to it with `git remote add origin https://github.com/YOUR-GITHUB-USERNAME/YOUR-REPOSITORY-NAME.git`, then push the `main` branch with `git push -u origin main`. GitHub may ask you to sign in or authorize Git Credential Manager.
3. If GitHub Pages is not enabled automatically, open the repository's **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
4. Open the published URL shown under **Settings → Pages** or in the completed **Deploy Superhuman to GitHub Pages** workflow.

For future updates, make and push a commit to `main`; the same workflow republishes the site. The app's routines, quit tracking, and journal remain in each browser's local storage. Publishing the website does not make the personal data public or enable cross-device sync. Supabase sync is not configured.
