# Contributing

## Status Monitors

The footer status badge opens `VITE_STATUS_PAGE_URL` and, when configured, polls
`VITE_STATUS_BADGE_JSON_URL` every 60 seconds.

Use a managed provider such as BetterUptime or Instatus, then configure monitors
for every public Wraith service:

- `https://usewraith.xyz`
- `https://demo.usewraith.xyz`
- `https://docs.usewraith.xyz`
- `https://www.npmjs.com/package/@wraith-protocol/sdk`
- Gateway health endpoint, when public
- Spectre health endpoint, when public

When adding a new service:

1. Add a provider monitor for the service URL or health endpoint.
2. Add the service to the public status page.
3. Trigger a provider test incident and confirm the footer badge changes state.
4. Resolve the incident and confirm the badge returns to normal.

Required deployment variables:

```text
VITE_STATUS_PAGE_URL=https://status.usewraith.xyz
VITE_STATUS_BADGE_JSON_URL=<provider badge/status JSON endpoint>
```

`status.usewraith.xyz` still needs a DNS `CNAME` pointing at the selected status
provider before the public page is live.
