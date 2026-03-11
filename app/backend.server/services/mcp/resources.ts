import { DOCS, HUMAN_EFFECTS_DOCS } from "./docs";

export interface Resource {
	uri: string;
	name: string;
	title: string;
	description: string;
	mimeType: string;
}

export function getAllResources(): Resource[] {
	return [
		{
			uri: "docs://docs",
			name: "docs",
			title: "Docs",
			description: "Documentation including entity relationships and workflow",
			mimeType: "text/plain",
		},
		{
			uri: "docs://human-effects",
			name: "human-effects",
			title: "Human Effects API",
			description:
				"Human effects API documentation for deaths, injuries, displaced data",
			mimeType: "text/plain",
		},
	];
}

export function getResourceContent(uri: string): string | null {
	switch (uri) {
		case "docs://docs":
			return DOCS;
		case "docs://human-effects":
			return HUMAN_EFFECTS_DOCS;
		default:
			return null;
	}
}
