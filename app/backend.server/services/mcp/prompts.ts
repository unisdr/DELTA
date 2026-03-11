export interface Prompt {
	name: string;
	title: string;
	description: string;
}

export function getAllPrompts(): Prompt[] {
	return [
		{
			name: "add-disaster-data",
			title: "Add disaster data",
			description:
				"Add disaster data based on pasted text or provided URL",
		},
	];
}

export function getPromptContent(promptName: string): string {
	switch (promptName) {
		case "add-disaster-data":
			return `		
You are adding disaster data to the DELTA system.

# Understand the system

- Use docs tool to get the data model documentation.
- Use human-effects_docs to understand human effects API.

# Ask user for data

User must provide you with the data to enter. It could be a pasted text or if you have necessary tools installed for fetching webpages a URL.

# Add the data

See the docs for an example workflow.
`;

		default:
			throw new Error(`Unknown prompt: ${promptName}`);
	}
}
