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

Start the local service in the background:

```sh
sessions start
```

It prints `started the service` and returns.

The service listens only on `127.0.0.1:47821`.

Create a pairing code:

```sh
sessions pair
```

Copy the code printed by `sessions pair`, open the Sessions popup in Chrome, paste the code, and click **Pair**.

Check the setup with `sessions status`, or `sessions status --json` for machine-readable output.

## Share a browser session

1. Open the tab you want an agent to use.
2. Open the Sessions popup.
3. Select **Share this tab** or **Share this tab group**.

Share a normal website tab. Chrome doesn't let agents use its own pages, such as `chrome://extensions`.

## Connect an MCP client

Claude Code:

```sh
claude mcp add --scope project sessions -- sessions mcp
```

opencode:

```sh
opencode mcp add sessions -- sessions mcp
```

Run these in your project folder. They add Sessions to that project only. Check the connection with `claude mcp list` or `opencode mcp list`.

> [!NOTE]
> For other clients, add a server that runs `sessions mcp`. Setup guides: [Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [Cursor](https://cursor.com/docs/context/mcp), [Pi](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/mcp.md).


## CLI commands

| Command                  | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `sessions start`         | Start the service in the background                       |
| `sessions stop`          | Stop the running service                                  |
| `sessions pair`          | Pair a browser profile with a short-lived code            |
| `sessions mcp`           | Serve MCP over stdio; normally launched by the MCP client |
| `sessions status`        | Show paired browsers and service status                   |
| `sessions status --json` | Print status as JSON                                      |
| `sessions list`          | Show sessions currently shared from browsers              |
| `sessions list --json`   | Print shared sessions as JSON                             |
| `sessions unpair <id>`   | Remove a paired browser                                   |
