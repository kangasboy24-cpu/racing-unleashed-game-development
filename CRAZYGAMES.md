# Publishing Racing Unleashed on CrazyGames

## Build
```bash
pnpm install            # refreshes pnpm-lock.yaml after @vercel/analytics was removed
pnpm build:crazygames   # next build --webpack, then checks ./out
cd out && zip -r ../racing-unleashed-crazygames.zip .
```
`index.html` must sit at the root of the zip. Test it locally first (`npx serve out`, then open it
inside a sub-folder URL if you can) and use the CrazyGames developer preview before submitting.

If `--webpack` is not accepted by your Next version, change the script in `package.json` to plain
`next build`; the post-build script will still report any absolute paths.

## What is already integrated
- SDK v3 loaded synchronously in `<head>`; every call is a safe no-op outside CrazyGames.
- `loadingStart` / `loadingStop` around boot, `gameplayStart` / `gameplayStop` around live racing
  (stopped on pause, results, ads and unmount), `happytime` on a podium finish.
- Midgame ad before every race except the first. Audio is muted and an overlay is shown while it plays;
  if the ad is blocked, unfilled or on cooldown, the race simply starts.
- Best laps saved through the SDK data module, with a localStorage fallback.
- No third-party analytics or fonts; the hero image is 73 KB (was 1.5 MB).
- Arrow keys / Space never scroll the page; the game pauses when the tab is hidden.

## Still on you
- Cover art and screenshots in the sizes CrazyGames asks for (check their current requirements).
- The display font now falls back to system fonts. To get Chakra Petch back, self-host the .woff2
  files in `public/fonts` and load them with an `@font-face` using a relative URL.
- Review track/car/driver names and the "legendary-inspired" wording against CrazyGames' content rules.
