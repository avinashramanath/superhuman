# Superhuman

Superhuman is an iPhone-first daily routine tracker built as a static progressive web app. It starts with a customizable five-task sample routine and saves data locally, with automatic cross-device synchronization when its Supabase sync backend is configured.

The interface uses a dark neon visual theme, groups tasks into sections, offers 60 task icons, and awards milestone badges for task completions, full routine days, and streaks up to 365 days. The Badges view includes 100 additional milestones based on existing progress. Hold and drag a task to reorder it; the other tasks move to make room, and moving it into another group changes its group. Keyboard users can focus the handle and use the up and down arrows. Choose an existing group or create a new one when adding or editing a task. Tap the task name to edit it. The **Better me** view combines the progress core and recent history; its lifetime growth record remains after missed days.

The **Conquer smoking** view lets you start a smoke-free timer, optionally enter your usual daily cigarette count and pack price, take a two-minute craving pause, and record a slip. It includes 100 additional smoke-free badges spread from the first five minutes through one year, alongside the original badges and a health-benefit timeline adapted from the FNHA “The Benefits of Quitting Smoking” poster shared with the project. Expand the badge collection to see them all. Badges are based on your best smoke-free run, so existing progress unlocks qualifying badges automatically and remains after a slip. A slip restarts the current timer without deleting earlier attempts or the best smoke-free run; the app responds without judgment. Cigarette and savings counts are rough estimates from the current timer and the personal values entered. The tracker is not medical advice or a substitute for professional cessation support.

The **Journal** supports text and mood entries, saved in this browser's local storage. Clearing browser site data or uninstalling the browser may remove local entries.

The **Oath** view keeps one editable oath per local calendar day, displays the time remaining until local midnight, and lists past oaths. Oaths sync as separate daily records. Update the app on all devices before using oaths: older versions cannot understand the new sync records and will report a sync error until updated.

**Automatic sync is public, not private.** Anyone can read or change the shared routine, history, smoking data, journal and oaths directly through the backend, even without the website URL. Anyone can delete records or submit data and consume storage or other usage. A publishable key, obscure URL or CORS settings do not prevent this. Do not store anything you want to keep private.

Local edits are saved immediately and automatically synced after a short delay, at startup, when the app returns online or becomes visible, and periodically while visible. The top indicator shows sync progress and errors. Keep the app open briefly after editing so it can upload; browsers can suspend or close background apps. When offline or when the backend is unavailable, changes remain on the device and are retried when the app is open again.

Use only one open Superhuman tab or window per browser at a time. Simultaneous tabs share local storage and can overwrite each other's changes before they sync.

Different records merge independently. Conflicting edits to the same record use the latest device timestamp, with a deterministic device-ID tie-breaker; incorrect device clocks can therefore choose the wrong version. Lifetime growth uses the highest value. During first-time migration, older local values without timestamps are merged automatically: distinct local records are uploaded, existing cloud values and deletions win conflicts, and the higher growth value is retained. Edits queued on the device during migration take precedence over the cloud version observed at that time. A local recovery copy is created before migration. Existing account-only cloud data is not automatically imported: recover it to a device using the older account-enabled app before migrating.

The app no longer stores or syncs journal photos. Previously saved photo files, if any, are not automatically deleted from browser storage or any existing cloud bucket. The public records do not use or modify Project Zero's existing `public.project_zero_state` table.

## Run locally

Serve this folder from a local web server (service workers and PWA installation require `localhost` or HTTPS), then open the site in a browser. For example, with Python installed:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`. On iPhone, visit the deployed HTTPS site in Safari and choose **Share → Add to Home Screen**.

## Sync setup and deployment

The automatic sync backend is defined in `supabase/migrations/20261115000000_superhuman_public_sync.sql`. It creates a separate public record store and RPC functions. Review the migration and its public access policies before applying it to the correct Supabase project. Verify existing migration history first; do not blindly apply unrelated account migrations or alter existing Project Zero data. The frontend uses the project URL and publishable key in `app.js`; these values are public, not secrets. Never put a service-role key in the frontend.

Test the migration and the complete two-device flow in an isolated Supabase project or branch before applying it to production. A Supabase development branch can incur charges. After applying the migration, publish the frontend and verify that changes appear on both devices, including an offline edit. Until the migration is deployed, the app continues to save locally but reports sync errors.

## Backup and restore

Automatic sync is not an independent backup: accidental or unauthorized changes can propagate. The app no longer provides manual export or restore controls. Previously created backup files and encrypted cloud backups are not deleted by this change.

For long-term use, monitor the project's billing and database quotas and set appropriate alerts. Supabase can [pause low-activity Free projects](https://supabase.com/docs/guides/platform/free-project-pausing); check its current restore window and terms. Arrange and test independent, scheduled database backups appropriate to your plan; the repository does not configure scheduled backups. Paid plans and external backup services may incur charges.

Local browser storage is not encrypted by the app. Sync, local recovery copies and the optional backup mechanisms do not guarantee retention against device failure, abuse, provider outages or quota exhaustion.

## Public website and automatic updates

The included GitHub Actions workflow deploys this static site to GitHub Pages whenever a change is pushed to the `main` branch. No build command or third-party hosting account is needed. The GitHub Pages URL follows the form `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/`.

To connect the repository for the first time:

1. Create a **public, empty** GitHub repository for Superhuman. Do not initialize it with a README, license, or `.gitignore`.
2. Connect this local repository to it with `git remote add origin https://github.com/YOUR-GITHUB-USERNAME/YOUR-REPOSITORY-NAME.git`, then push the `main` branch with `git push -u origin main`. GitHub may ask you to sign in or authorize Git Credential Manager.
3. If GitHub Pages is not enabled automatically, open the repository's **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
4. Open the published URL shown under **Settings → Pages** or in the completed **Deploy Superhuman to GitHub Pages** workflow.

For future updates, make and push a commit to `main`; the same workflow republishes the site. The website itself is public, and the automatic sync backend also makes synced data public as described above.
