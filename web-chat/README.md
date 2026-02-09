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
npm install
npm start
```

## Security notes

- Use HTTPS and a reverse proxy in production.
- Host on a publicly reachable URL (cloud/VPS) so whitelisted members can access it worldwide.
- Rotate invite tokens regularly.
- Consider persisting chat history and user management in a secure database.

## Device support

The UI is responsive and works on modern Android, iOS, and laptop browsers. Mobile layouts stack controls and use touch-friendly sizing by default.
