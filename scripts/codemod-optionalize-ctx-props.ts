import { Project, SyntaxKind, Node } from "ts-morph";

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

let changed = 0;

for (const sf of project.getSourceFiles()) {
	const fp = sf.getFilePath().replace(/\\/g, "/");
	if (
		!(
			fp.includes("/app/") ||
			fp.includes("/scripts/") ||
			fp.includes("/tests/")
		)
	) {
		continue;
	}
	if (fp.includes("/build/")) {
		continue;
	}

	for (const prop of sf.getDescendantsOfKind(SyntaxKind.PropertySignature)) {
		const nameNode = prop.getNameNode();
		if (!Node.isIdentifier(nameNode)) {
			continue;
		}
		const name = nameNode.getText();
		if ((name === "ctx" || name === "_ctx") && !prop.hasQuestionToken()) {
			prop.setHasQuestionToken(true);
			changed += 1;
		}
	}
}

await project.save();
console.log(JSON.stringify({ changed }, null, 2));
