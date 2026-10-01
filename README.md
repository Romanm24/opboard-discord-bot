# OpBoard Discord Bot

A live squad sign-up board that lives directly in Discord. Post it once with
`/board-setup`, and people click buttons to join a squad, leave a squad, or
set themselves as a squad leader — the one message updates in place for
everyone, no refreshing, no separate website needed.

Roster structure (edit in `squads.js` if you need to change it):

| Squad | Role | Size |
|---|---|---|
| Alpha | Assault 1 (+medic) | 5 |
| Bravo | Assault 2 (+medic) | 5 |
| Charlie | Recon | 5 |
| Delta | Support (+medic) | 5 |
| Echo | FOB/Base Defense + QRF | 10 |
| Foxtrot | Logistics | 5 |
| Bench | Reserve | 5 |

---

## 1. Create the bot in Discord's Developer Portal

1. Go to https://discord.com/developers/applications and click **New Application**. Name it (e.g. "OpBoard").
2. In the left sidebar, click **Bot**.
   - Click **Reset Token** (or **View Token**) and copy it. This is your `DISCORD_TOKEN` — treat it like a password, never share it or commit it to any public repo.
   - Turn **off** any Privileged Gateway Intents toggles — this bot doesn't need them (it only listens for slash commands and button clicks).
3. In the left sidebar, click **General Information** and copy the **Application ID** — this is your `CLIENT_ID`.

## 2. Invite the bot to your test server

1. In the left sidebar, click **OAuth2** → **URL Generator**.
2. Under **Scopes**, check: `bot` and `applications.commands`.
3. Under **Bot Permissions**, check: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`.
4. Copy the generated URL at the bottom, open it in your browser, and select your own (test) server to invite it.

## 3. Get your test server's ID

In Discord, go to **User Settings → Advanced** and turn on **Developer Mode**.
Then right-click your server's icon in the sidebar → **Copy Server ID**. This
is your `GUILD_ID`.

## 4. Configure and install

```bash
cd opboard-bot
cp .env.example .env
```

Open `.env` and fill in `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` from the
steps above. Then install dependencies:

```bash
npm install
```

## 5. Register the slash commands

```bash
npm run deploy-commands
```

You only need to re-run this if you add or change a slash command later.
Guild-scoped commands (what this uses) show up instantly in your test server.

## 6. Run the bot

```bash
npm start
```

You should see `Logged in as OpBoard#1234` in the terminal. Leave this
running — closing the terminal stops the bot (see **Keeping it running**
below for how to host it 24/7 later).

## 7. Post the board

In any channel the bot can see, type `/board-setup`. It'll post the live
roster with buttons. Click **Join Alpha**, **Leave my slot**, or **Set as
squad leader** to try it out — the message updates immediately.

`/board-reset` clears all sign-ups — useful between practice runs.

`/board-remove @person` removes someone from their slot or leader spot
without clearing anyone else — handy if someone signed up under the wrong
name or needs to be bumped.

Both of those require **Manage Server** permission by default. If you want
to let a squad leader or mod do this without giving them full server admin,
run `/board-set-admin-role @role` (you need Manage Server to set this). From
then on, anyone with that role can also use `/board-reset` and
`/board-remove`, alongside anyone with real Manage Server permission.

---

## How state is stored

Sign-ups are saved to `state.json` in this folder, one entry per Discord
server (guild) the bot is in. That means:
- Restarting the bot does **not** lose sign-ups.
- Each Discord server that adds this bot gets its **own independent** board —
  Team A's server and Team B's server won't share a roster, which is exactly
  what you want once other communities start adding it.
- If you ever move hosting, just bring `state.json` along with you (or start
  fresh — it's just a plain JSON file).

## Keeping it running 24/7

Running `npm start` on your own computer only works while your computer is
on and connected. Once you're happy with how it behaves on your test server,
move it to a host that stays on, such as:
- **Railway** (railway.app) — connect a GitHub repo, set the same three
  environment variables in its dashboard, done.
- **Render** (render.com) — similar, free tier available for small bots.
- A small VPS you already have, running `npm start` inside `pm2` or `screen`
  so it survives you closing the terminal.

None of these require code changes — just re-set `DISCORD_TOKEN`, `CLIENT_ID`,
and `GUILD_ID` (or drop `GUILD_ID` entirely and switch `deploy-commands.js`
to `Routes.applicationCommands` for global commands once you're ready to run
this across multiple servers instead of just your test one).

## Rolling out to other Discords

Free for any server, no payment, no gating. `deploy-commands.js` registers
commands **globally** by default — run `npm run deploy-commands` once
(takes up to ~1hr to propagate everywhere the first time), and the same
invite URL from Step 2 works for any server, not just your test one. Each
server that adds the bot gets its own separate board and roster
automatically the first time someone runs `/board-setup` there — no extra
setup needed on your end.
