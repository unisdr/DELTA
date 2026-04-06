import { Project, SyntaxKind, Node } from "ts-morph";

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

let updated = 0;

for (const sf of project.getSourceFiles()) {
	const fp = sf.getFilePath().replace(/\\/g, "/");
	if (!fp.includes("/app/frontend/")) continue;
	const text = sf.getFullText();
	if (!text.includes("ctx.")) continue;

	const hasCtxVar = sf
		.getVariableDeclarations()
		.some((d) => d.getName() === "ctx");
	if (hasCtxVar) continue;

	const hasCtxParam = sf
		.getDescendantsOfKind(SyntaxKind.Parameter)
		.some((p) => {
			const n = p.getNameNode();
			if (Node.isIdentifier(n) && n.getText() === "ctx") return true;
			if (Node.isObjectBindingPattern(n)) {
				return n
					.getElements()
					.some((el) => el.getNameNode().getText() === "ctx");
			}
			return false;
		});
	if (hasCtxParam) continue;

	sf.insertStatements(0, [``]);
	updated += 1;
}

await project.save();
console.log(JSON.stringify({ updated }, null, 2));
