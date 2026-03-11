# MCP (Model Context Protocol) API

Application provides a Model Context Protocol (MCP) endpoint that allows AI assistants to interact with the DTS database programmatically.

## Overview

MCP enables AI assistants to:

- List and modify DTS data entities
- Work with disaster records, assets, damages, losses, disruptions
- Manage human effects data
- Access reference data (HIP classifications, sectors, categories)
- Use structured prompts for common workflows

## Configuration

### Authentication

1. Generate an API key in the Delta admin panel
2. Add it to the `X-Auth` header in your MCP configuration

## Connecting MCP

MCP is a generic protocol that supports various agents. See below for example configuration for specific agents.

### MCP client configuration

#### opencode.ai

Configure in `~/.config/opencode/opencode.json`:

```json
{
	"mcp": {
		"delta": {
			"type": "remote",
			"url": "https://[delta-url]/en/api/mcp",
			"enabled": true,
			"oauth": false,
			"headers": {
				"X-Auth": "your-api-key-here"
			}
		}
	}
}
```

#### VS code

- Press the keyboard combination [ctrl][shift][p]
- MCP: Add Server ...
- Choose "HTTP (HTTP or Server-Sent Events) Connect to a remote HTTP server that implements the MCP protocol"
- Enter the MCP server full URL
- Server ID of the MCP e.g. my-mcp-server-delta

```json
{
	"mcp": {
		"delta": {
			"type": "http",
			"url": "https://[delta-url]/en/api/mcp",
			"enabled": true,
			"oauth": false,
			"headers": {
				"X-Auth": "your-api-key-here"
			}
		}
	}
}
```

### Getting started

Give agent an article text about event and ask it to add to the system.

Agent will first get docs to get docs about the data model, entity relationships, and workflow.

And then continue from there.
