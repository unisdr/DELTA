import path from "path";
import { Node, Project, SyntaxKind } from "ts-morph";

const project = new Project({
	tsConfigFilePath: path.resolve("tsconfig.json"),
	skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths(["app/**/*.ts", "app/**/*.tsx"]);

function msgFromObj(arg: Node): string | null {
	if (!Node.isObjectLiteralExpression(arg)) return null;
	const msgProp = arg
		.getProperties()
		.find((p) => Node.isPropertyAssignment(p) && p.getName() === "msg");
	if (!msgProp || !Node.isPropertyAssignment(msgProp)) return null;
	const init = msgProp.getInitializer();
	if (!init) return null;
	if (Node.isStringLiteral(init) || Node.isNoSubstitutionTemplateLiteral(init))
		return init.getLiteralText();
	return null;
}

let filesChanged = 0;
for (const sf of project.getSourceFiles()) {
	let changed = false;

	for (const tr of sf.getDescendantsOfKind(SyntaxKind.TypeReference)) {
		const t = tr.getTypeName().getText();
		if (
			t === "ViewRuntime" ||
			t === "ServerRuntime" ||
			t === "RuntimeContext"
		) {
			tr.replaceWithText("any");
			changed = true;
		}
	}

	for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const expr = call.getExpression();
		if (!Node.isPropertyAccessExpression(expr) || expr.getName() !== "t")
			continue;
		const args = call.getArguments();
		if (args.length === 0) continue;
		const a0 = args[0];
		if (Node.isObjectLiteralExpression(a0)) {
			const msg = msgFromObj(a0);
			if (msg !== null) {
				call.replaceWithText(JSON.stringify(msg));
				changed = true;
				continue;
			}
			const codeProp = a0
				.getProperties()
				.find((p) => Node.isPropertyAssignment(p) && p.getName() === "code");
			if (codeProp && Node.isPropertyAssignment(codeProp)) {
				const codeInit = codeProp.getInitializer();
				if (codeInit) {
					if (
						Node.isStringLiteral(codeInit) ||
						Node.isNoSubstitutionTemplateLiteral(codeInit)
					) {
						call.replaceWithText(JSON.stringify(codeInit.getLiteralText()));
						changed = true;
						continue;
					}
					if (Node.isIdentifier(codeInit)) {
						const msgByName = a0
							.getProperties()
							.find(
								(p) => Node.isPropertyAssignment(p) && p.getName() === "msg",
							);
						if (msgByName && Node.isPropertyAssignment(msgByName)) {
							const mInit = msgByName.getInitializer();
							if (mInit && Node.isIdentifier(mInit)) {
								call.replaceWithText(mInit.getText());
								changed = true;
								continue;
							}
						}
					}
				}
			}
		}
	}

	for (const vs of sf.getVariableStatements()) {
		let removeStatement = false;
		for (const decl of vs.getDeclarations()) {
			const name = decl.getName();
			if (name !== "ctx" && name !== "backendCtx") continue;
			const refs = decl.findReferencesAsNodes();
			if (refs.length <= 1) {
				removeStatement = true;
				changed = true;
			}
		}
		if (removeStatement) {
			vs.remove();
		}
	}

	if (changed) {
		sf.organizeImports();
		filesChanged += 1;
	}
}

project.saveSync();
console.log(`cleanup-runtime-usage: changed ${filesChanged} files`);
