#!/bin/sh
set -e

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) asset=sessions-linux-x64 ;;
  Darwin-arm64) asset=sessions-darwin-arm64 ;;
  *)
    echo "no prebuilt binary for $(uname -s)-$(uname -m)" >&2
    echo "download one from https://github.com/0xherve/sessions/releases" >&2
    exit 1
    ;;
esac

mkdir -p ~/.local/bin
tmp=$(mktemp ~/.local/bin/.sessions.XXXXXX)
trap 'rm -f "$tmp"' EXIT
curl -fsSL "https://github.com/0xherve/sessions/releases/latest/download/$asset" \
  -o "$tmp"
chmod +x "$tmp"
mv -f "$tmp" ~/.local/bin/sessions
echo "installed ~/.local/bin/sessions"

case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *)
    case "$(basename "${SHELL:-sh}")" in
      zsh) rc=~/.zshrc ;;
      bash) rc=~/.bashrc ;;
      *) rc=~/.profile ;;
    esac
    printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$rc"
    echo "added ~/.local/bin to $rc"
    echo "RESTART YOUR SHELL (or run: . $rc) BEFORE USING SESSIONS"
    ;;
esac
