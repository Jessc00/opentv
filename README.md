# OpenTV

A home screen for Samsung TVs that runs on the TV itself through [TizenBrew](https://github.com/reisxd/TizenBrew):
your apps, designs, photo backgrounds, a phone remote and an AI Studio powered by Higgsfield. No computer needed
once it's installed.

## Install

1. Install TizenBrew on the TV (one time). Follow the TizenBrew guide: turn on Developer Mode on the TV, then use
   the TizenBrew Installer on a computer. On 2023 and newer TVs it asks you to sign in to a Samsung account.
2. Open TizenBrew on the TV, press the **green** button to add a module, choose **GitHub**, and type
   `Jessc00/opentv`.
3. Open **OpenTV** from TizenBrew. The first start downloads it, so it takes a few seconds.
4. Optional: set OpenTV to auto-launch in TizenBrew, so opening TizenBrew goes straight to OpenTV.

Phone remote: in OpenTV, open Settings, then Connect your phone, and scan the QR code. The phone has to be on
the same Wi-Fi as the TV. The address looks like `http://TV-ADDRESS:4940/remote`.

## How it works

- `app/index.html` is the page TizenBrew opens. It waits for the service, then moves to `http://127.0.0.1:4940/`.
- `service/service.js` runs in TizenBrew's Node service on the TV. It serves the TV screen and the phone remote
  on port 4940, keeps the Higgsfield key and your creations on the TV, makes the Higgsfield calls, and opens the
  TV's own apps (Netflix, YouTube...) with `tizen.application.launch`. It is plain ES5 with only Node built-ins,
  because older TVs run Node 4.
- `tv/`, `remote/`, `vendor/` are the screens. TizenBrew fetches them from jsDelivr, and the service keeps a copy
  on the TV so OpenTV still opens without internet.

## Limits

- OpenTV can't replace Samsung's own home screen. The Home button on the Samsung remote still goes there.
- An app tile only works if that app is installed on the TV.
- Videos made in AI Studio have no poster picture, because the TV has no ffmpeg to make one.
