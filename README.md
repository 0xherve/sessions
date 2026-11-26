# Sessions

Give your agents controlled access to your real browser.

Sessions has three parts:

- A Chrome extension where you pair your browser and choose which tabs or tab groups to share.
- A local service that tracks shared sessions and which agent has claimed each one.
- An MCP server that lets coding agents discover and claim those sessions.

While an agent is attached to a tab, your browser shows its debugger banner. Selecting **Cancel** on that banner detaches the agent and ends the session.

## Requirements

- [Bun](https://bun.sh/)
- A browser based on Chromium 116 or newer

## Install

Clone the repository and install its dependencies:

```sh
git clone https://github.com/0xherve/sessions
cd sessions
bun install
```

Build the extension and the CLI:

```sh
bun run --cwd apps/extension build
bun run --cwd apps/sessions build
```

Run the CLI commands below from the repository root with `bun run sessions`.

## Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository's `apps/extension/dist` directory.

## Start and pair

Start the local service and leave this terminal open:

```sh
bun run sessions start
```

The service listens only on `127.0.0.1:47821`.

In a second terminal, create a pairing code:

```sh
bun run sessions pair
```

Open the Sessions popup in Chrome, paste the code, and select **Pair**. The code expires after 10 minutes.

Pairing is done once per browser profile. The extension keeps its identity in `chrome.storage.local`; the service keeps the paired browser records in `~/.sessions/profiles.json`.

Check the setup with:

```sh
bun run sessions status
```

Use `bun run sessions status --json` for machine-readable output.

## Share a browser session

1. Open the tab you want an agent to use.
2. Open the Sessions popup.
3. Select **Share this tab** or **Share this tab group**.

Only shared sessions are visible to agents. A session can be claimed by one agent at a time. You can stop sharing from the popup, or cancel Chrome's debugger banner while an agent is attached.

## Connect an MCP client

Add Sessions to your MCP client's configuration, replacing the `--cwd` value with the absolute path to your repository:

```json
{
  "mcpServers": {
    "sessions": {
      "command": "bun",
      "args": ["run", "--cwd", "/absolute/path/to/sessions", "sessions", "mcp"]
    }
  }
}
```

Restart or reload the MCP client after changing its configuration. The client launches the MCP server itself and communicates with it over stdio. Keep `bun run sessions start` running separately; the MCP server connects to that service over its local websocket.

The MCP server on main currently exposes:

| Tool           | Purpose                               |
| -------------- | ------------------------------------- |
| `session_list` | List sessions shared from the browser |
| `session_use`  | Claim a shared session by its id      |

For example, ask the agent to list the available Sessions browser sessions and claim the one you shared.

## CLI commands

| Command                          | Purpose                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `bun run sessions start`         | Run the local browser-and-agent service                   |
| `bun run sessions pair`          | Pair a browser profile with a short-lived code            |
| `bun run sessions mcp`           | Serve MCP over stdio; normally launched by the MCP client |
| `bun run sessions status`        | Show paired browsers and service status                   |
| `bun run sessions status --json` | Print status as JSON                                      |

## Rebuild after changes

```sh
bun run --cwd apps/extension build
bun run --cwd apps/sessions build
```

After changing the extension, reload it from `chrome://extensions`. After changing the CLI or MCP server, rebuild the executable and restart the service or MCP client as appropriate.

## Troubleshooting

**The MCP tools report that the service is not running**

Start it with `bun run sessions start` in a separate terminal.

**No sessions appear in `session_list`**

Confirm that the browser is paired and that you shared a tab or tab group from the extension popup.

**The pairing code no longer works**

Pairing codes expire after 10 minutes. Run `bun run sessions pair` again.

**The extension still behaves like an older version**

Rebuild it, then use the reload button on its card at `chrome://extensions`.
