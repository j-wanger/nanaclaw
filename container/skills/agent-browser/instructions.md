# Agent Browser Instructions

Use `agent-browser` CLI for any task where a browser is useful — research, reading articles, web apps, forms, screenshots, data extraction.

## Core workflow
```bash
agent-browser open <url>
agent-browser snapshot -i    # get interactive elements with refs
agent-browser click @e1      # click by ref
agent-browser fill @e2 "text"
agent-browser close
```

Use proactively when web content would help, not just when explicitly asked.
