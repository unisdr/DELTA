import { Project, SyntaxKind, Node, ObjectBindingPattern } from "ts-morph";

function isCtxName(name: string) {
	return name === "ctx" || name === "_ctx";
}

function removeCtxFromBindingPattern(pattern: ObjectBindingPattern): number {
	let removed = 0;
	const keptElements: string[] = [];
	for (const element of pattern.getElements()) {
		const nameNode = element.getNameNode();
		if (Node.isIdentifier(nameNode) && isCtxName(nameNode.getText())) {
			removed += 1;
			continue;
		}
		const propertyName = element.getPropertyNameNode();
		if (
			propertyName &&
			Node.isIdentifier(propertyName) &&
			isCtxName(propertyName.getText())
		) {
			removed += 1;
			continue;
		}
		keptElements.push(element.getText());
	}

	if (removed > 0 && keptElements.length > 0) {
		pattern.replaceWithText(`{ ${keptElements.join(", ")} }`);
	}
	return removed;
}

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const sourceFiles = project.getSourceFiles().filter((sf) => {
	const fp = sf.getFilePath().replace(/\\/g, "/");
	return (
		(fp.includes("/app/") ||
			fp.includes("/scripts/") ||
			fp.includes("/tests/")) &&
		(fp.endsWith(".ts") || fp.endsWith(".tsx")) &&
		!fp.includes("/build/")
	);
});

let removedParams = 0;
let removedCallArgs = 0;
let removedJsxProps = 0;
let removedObjectProps = 0;

for (const sf of sourceFiles) {
	for (const fn of sf.getDescendantsOfKind(SyntaxKind.Parameter)) {
		const nameNode = fn.getNameNode();
		if (Node.isIdentifier(nameNode)) {
			if (isCtxName(nameNode.getText())) {
				fn.remove();
				removedParams += 1;
			}
			continue;
		}

		if (Node.isObjectBindingPattern(nameNode)) {
			const removed = removeCtxFromBindingPattern(nameNode);
			removedParams += removed;
			if (nameNode.getElements().length === 0) {
				fn.remove();
			}
		}
	}

	for (const callExpr of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const args = callExpr.getArguments();
		for (let i = args.length - 1; i >= 0; i -= 1) {
			const a = args[i];
			if (Node.isIdentifier(a) && isCtxName(a.getText())) {
				callExpr.removeArgument(i);
				removedCallArgs += 1;
			}
		}
	}

	for (const jsx of sf.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
		const n = jsx.getNameNode().getText();
		if (n === "ctx" || n === "_ctx") {
			jsx.remove();
			removedJsxProps += 1;
		}
	}

	for (const obj of sf.getDescendantsOfKind(
		SyntaxKind.ObjectLiteralExpression,
	)) {
		for (const p of [...obj.getProperties()]) {
			if (Node.isPropertyAssignment(p)) {
				const n = p.getNameNode().getText().replace(/['\"]/g, "");
				if (isCtxName(n)) {
					p.remove();
					removedObjectProps += 1;
				}
			} else if (Node.isShorthandPropertyAssignment(p)) {
				const n = p.getNameNode().getText();
				if (isCtxName(n)) {
					p.remove();
					removedObjectProps += 1;
				}
			}
		}
	}
}

await project.save();

console.log(
	JSON.stringify(
		{ removedParams, removedCallArgs, removedJsxProps, removedObjectProps },
		null,
		2,
	),
);
