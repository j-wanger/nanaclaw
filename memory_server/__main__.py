"""Memory MCP Server entry point."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from server import create_server


def main():
    server = create_server()
    server.run(transport="stdio")


if __name__ == "__main__":
    main()
