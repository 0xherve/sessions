# Sessions

Give your agents controlled access to your real browser.

Sessions has three parts:

- A Chrome extension where you pair your browser and choose which tabs or tab groups to share.
- A local service that tracks shared sessions and which agent has claimed each one.
- An MCP server that lets coding agents discover and claim those sessions.

While an agent is attached to a tab, your browser shows its debugger banner. Selecting **Cancel** on that banner detaches the agent and ends the session.

## Requirements

- A browser based on Chromium 116 or newer
- A Linux (x64) or macOS (Apple Silicon) machine

> [!WARNING]
> Windows is not supported.

## Install the CLI

```sh
curl -fsSL https://raw.githubusercontent.com/0xherve/sessions/main/install.sh | sh
```

If it doesn't match your platform, download a binary from the [releases page](https://github.com/0xherve/sessions/releases) directly.

Check it has installed correctly with `sessions --help`. To update, run the install command again.

## Install the extension

Download [`sessions-extension.zip`](https://github.com/0xherve/sessions/releases/latest/download/sessions-extension.zip) and unzip it.

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the unzipped `dist` directory.

## Start and pair

Start the local service and leave this terminal open:

```sh
sessions start
```

The service listens only on `127.0.0.1:47821`.

In a second terminal, create a pairing code:

```sh
sessions pair
```

Open the Sessions popup in Chrome, paste the code, and select **Pair**. The code expires after 10 minutes.

Pairing is done once per browser profile. The extension keeps its identity in `chrome.storage.local`; the service keeps the paired browser records in `~/.sessions/profiles.json`.

Check the setup with `sessions status`, or `sessions status --json` for machine-readable output.

## Share a browser session

1. Open the tab you want an agent to use.
2. Open the Sessions popup.
3. Select **Share this tab** or **Share this tab group**.

Only shared sessions are visible to agents. A session can be claimed by one agent at a time. You can stop sharing from the popup, or cancel Chrome's debugger banner while an agent is attached.

## Connect an MCP client

Add Sessions to your MCP client's configuration:

```json
{
  "mcpServers": {
    "sessions": {
      "command": "sessions",
      "args": ["mcp"]
    }
  }
}
```

Restart or reload the MCP client after changing its configuration. The client launches the MCP server itself and communicates with it over stdio. Keep `sessions start` running separately; the MCP server connects to that service over its local websocket.

The MCP server exposes:

| Tool                 | Purpose                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| `session_list`       | List browser sessions the user has shared                                      |
| `session_use`        | Claim a shared session so you can act on it                                    |
| `session_release`    | Release the claimed session so other agents can use it                         |
| `page_snapshot`      | Read the claimed tab as an accessibility snapshot; element refs come from here |
| `page_navigate`      | Navigate the claimed tab to a URL; returns a fresh snapshot                    |
| `page_navigate_back` | Go back in the claimed tab's history                                           |
| `page_screenshot`    | Capture a screenshot of the claimed tab                                        |
| `page_evaluate`      | Evaluate JavaScript in the claimed tab and return the result                   |
| `page_click`         | Click an element by its snapshot ref; returns a fresh snapshot                 |
| `page_type`          | Type into an element by ref, optionally pressing Enter after                   |
| `page_select`        | Select option values in a dropdown by ref                                      |
| `page_press_key`     | Press a key in the claimed tab, such as Enter, Escape or ArrowDown             |

For example, ask the agent to list the available Sessions browser sessions, claim the one you shared, and take a snapshot.

## CLI commands

| Command                  | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `sessions start`         | Run the local browser-and-agent service                   |
| `sessions stop`          | Stop the running service                                  |
| `sessions pair`          | Pair a browser profile with a short-lived code            |
| `sessions mcp`           | Serve MCP over stdio; normally launched by the MCP client |
| `sessions status`        | Show paired browsers and service status                   |
| `sessions status --json` | Print status as JSON                                      |
| `sessions list`          | Show sessions currently shared from browsers              |
| `sessions list --json`   | Print shared sessions as JSON                             |
| `sessions unpair <id>`   | Remove a paired browser                                   |

## Troubleshooting

**The MCP tools report that the service is not running**

Start it with `sessions start` in a separate terminal.

**No sessions appear in `session_list`**

Confirm that the browser is paired and that you shared a tab or tab group from the extension popup.

**The pairing code no longer works**

Pairing codes expire after 10 minutes. Run `sessions pair` again.

**The extension still behaves like an older version**

Download the latest `sessions-extension.zip`, unzip it over the old `dist` directory, then use the reload button on its card at `chrome://extensions`.

**A paired browser keeps reconnecting or shouldn't have access anymore**

Remove it with `sessions unpair <id>` (see `sessions status` for ids). It can pair again with a new code.
