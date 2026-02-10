# Secure Whitelist Chat

This is a minimal invite-only chat for whitelisted users. It requires:

- A valid invite token in the URL, e.g. `http://localhost:3000/?token=invite-123`.
- A username that exists in the server whitelist.
- An alert code entry to broadcast a live alert to everyone in the room.

## Configure

Update the values in `server.js` before running in production:

- `whitelist`: the allowed usernames.
- `accessTokens`: the invite tokens to share privately.
- `session secret`: replace with a long, random value.
- `ALERT_CODE`: set the digits that trigger a live alert (defaults to `911`).

## Run locally

```bash
cd web-chat
npm install
npm start
```

If `npm start` fails, confirm you are inside the `web-chat/` folder and that dependencies are installed.

## Security notes

- Use HTTPS and a reverse proxy in production.
- Host on a publicly reachable URL (cloud/VPS) so whitelisted members can access it worldwide.
- Keep `whitelist`, `accessTokens`, and session secrets private and rotate them regularly.
- Rotate invite tokens regularly.
- Consider persisting chat history and user management in a secure database.

## Device support

The UI is responsive and works on modern Android, iOS, and laptop browsers. Mobile layouts stack controls and use touch-friendly sizing by default.

## Alert code usage

Type the alert digits exactly (for example `911`) in the chat input and press Send. The server ignores whitespace, so `9 1 1` also triggers the alert.

## Join alerts

When a whitelisted user connects, everyone in the room sees a join notification in the chat window.
