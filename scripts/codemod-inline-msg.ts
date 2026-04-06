import { Project, Node, SyntaxKind } from "ts-morph";
import path from "path";

const project = new Project({
	tsConfigFilePath: path.resolve("tsconfig.json"),
	skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths([
	"app/**/*.ts",
	"app/**/*.tsx",
	"tests/**/*.ts",
	"tests/**/*.tsx",
]);

let changedFiles = 0;
let replacedCalls = 0;

function getMsgLiteralText(obj: Node): string | null {
	if (!Node.isObjectLiteralExpression(obj)) return null;
	const msgProp = obj
		.getProperties()
		.find((p) => Node.isPropertyAssignment(p) && p.getName() === "msg");
	if (!msgProp || !Node.isPropertyAssignment(msgProp)) return null;
	const init = msgProp.getInitializer();
	if (!init) return null;

	if (
		Node.isStringLiteral(init) ||
		Node.isNoSubstitutionTemplateLiteral(init)
	) {
		return init.getLiteralText();
	}

	if (Node.isArrayLiteralExpression(init)) {
		const parts: string[] = [];
		for (const el of init.getElements()) {
			if (
				Node.isStringLiteral(el) ||
				Node.isNoSubstitutionTemplateLiteral(el)
			) {
				parts.push(el.getLiteralText());
			} else {
				return null;
			}
		}
		return parts.join("\n");
	}

	return null;
}

for (const sf of project.getSourceFiles()) {
	let fileChanged = false;
	const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
	for (const call of calls) {
		const expr = call.getExpression();
		if (!Node.isPropertyAccessExpression(expr)) continue;
		if (expr.getName() !== "t") continue;

		const args = call.getArguments();
		if (args.length === 0) continue;
		const msg = getMsgLiteralText(args[0]);
		if (msg == null) continue;

		call.replaceWithText(JSON.stringify(msg));
		replacedCalls += 1;
		fileChanged = true;
	}

	if (fileChanged) {
		changedFiles += 1;
	}
}

project.saveSync();
console.log(
	`inline-msg codemod: replaced ${replacedCalls} call(s) in ${changedFiles} file(s)`,
);
