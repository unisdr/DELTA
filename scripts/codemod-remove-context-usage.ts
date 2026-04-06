import path from "path";
import { Node, Project, QuoteKind, SyntaxKind } from "ts-morph";

const project = new Project({
	tsConfigFilePath: path.resolve("tsconfig.json"),
	skipAddingFilesFromTsConfig: true,
	manipulationSettings: {
		quoteKind: QuoteKind.Single,
	},
});

project.addSourceFilesAtPaths([
	"app/**/*.ts",
	"app/**/*.tsx",
	"tests/**/*.ts",
	"tests/**/*.tsx",
]);

function normalizePathLiteral(value: string): string {
	if (!value) return "/";
	return value.startsWith("/") ? value : `/${value}`;
}

function msgFromObject(obj: Node): string | null {
	if (!Node.isObjectLiteralExpression(obj)) return null;
	const props = obj.getProperties();
	const msgProp = props.find(
		(p) => Node.isPropertyAssignment(p) && p.getName() === "msg",
	);
	if (msgProp && Node.isPropertyAssignment(msgProp)) {
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
	}

	const msgsProp = props.find(
		(p) => Node.isPropertyAssignment(p) && p.getName() === "msgs",
	);
	if (msgsProp && Node.isPropertyAssignment(msgsProp)) {
		const init = msgsProp.getInitializer();
		if (init && Node.isObjectLiteralExpression(init)) {
			const msgItems = init
				.getProperties()
				.filter(Node.isPropertyAssignment)
				.map((p) => ({ name: p.getName(), init: p.getInitializer() }));
			const pick = msgItems.find((x) => x.name === "other") ?? msgItems[0];
			if (
				pick?.init &&
				(Node.isStringLiteral(pick.init) ||
					Node.isNoSubstitutionTemplateLiteral(pick.init))
			) {
				return pick.init.getLiteralText();
			}
		}
	}

	const codeProp = props.find(
		(p) => Node.isPropertyAssignment(p) && p.getName() === "code",
	);
	if (codeProp && Node.isPropertyAssignment(codeProp)) {
		const init = codeProp.getInitializer();
		if (
			init &&
			(Node.isStringLiteral(init) || Node.isNoSubstitutionTemplateLiteral(init))
		) {
			return init.getLiteralText();
		}
	}

	return null;
}

let changedFiles = 0;
let tCalls = 0;
let urlCalls = 0;
let langRefs = 0;
let ctorRewrites = 0;
let typeRewrites = 0;
let importRewrites = 0;

for (const sf of project.getSourceFiles()) {
	let fileChanged = false;

	for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		let expr;
		try {
			expr = call.getExpression();
		} catch {
			continue;
		}
		if (!Node.isPropertyAccessExpression(expr)) continue;

		if (expr.getName() === "t") {
			const args = call.getArguments();
			if (args.length === 0) continue;
			let msg: string | null = null;
			const a0 = args[0];
			if (
				Node.isStringLiteral(a0) ||
				Node.isNoSubstitutionTemplateLiteral(a0)
			) {
				msg = a0.getLiteralText();
			} else {
				msg = msgFromObject(a0);
			}
			if (msg !== null) {
				call.replaceWithText(JSON.stringify(msg));
				tCalls += 1;
				fileChanged = true;
			}
			continue;
		}

		if (expr.getName() === "url") {
			const args = call.getArguments();
			if (args.length !== 1) continue;
			const a0 = args[0];
			if (
				Node.isStringLiteral(a0) ||
				Node.isNoSubstitutionTemplateLiteral(a0)
			) {
				call.replaceWithText(
					JSON.stringify(normalizePathLiteral(a0.getLiteralText())),
				);
			} else {
				call.replaceWithText(
					`('/' + String(${a0.getText()}).replace(/^\\/+/, ''))`,
				);
			}
			urlCalls += 1;
			fileChanged = true;
		}
	}

	for (const prop of sf.getDescendantsOfKind(
		SyntaxKind.PropertyAccessExpression,
	)) {
		let text: string;
		try {
			text = prop.getText();
		} catch {
			continue;
		}
		if (text !== "ctx.lang") continue;
		prop.replaceWithText(`'en'`);
		langRefs += 1;
		fileChanged = true;
	}

	for (const newExpr of sf.getDescendantsOfKind(SyntaxKind.NewExpression)) {
		const expr = newExpr.getExpression();
		if (!Node.isIdentifier(expr)) continue;
		const exprText = expr.getText();
		if (exprText === "ServerContext") {
			const args = newExpr.getArguments();
			const a0 = args[0]?.getText() ?? "undefined";
			newExpr.replaceWithText(`createServerRuntime(${a0})`);
			ctorRewrites += 1;
			fileChanged = true;
			continue;
		}
		if (exprText === "ViewContext") {
			newExpr.replaceWithText("createViewRuntime()");
			ctorRewrites += 1;
			fileChanged = true;
		}
	}

	for (const tn of sf.getDescendantsOfKind(SyntaxKind.TypeReference)) {
		const text = tn.getTypeName().getText();
		if (text === "ServerContext") {
			tn.getTypeName().replaceWithText("ServerRuntime");
			typeRewrites += 1;
			fileChanged = true;
		}
		if (text === "ViewContext") {
			tn.getTypeName().replaceWithText("ViewRuntime");
			typeRewrites += 1;
			fileChanged = true;
		}
		if (text === "AppContext") {
			tn.getTypeName().replaceWithText("RuntimeContext");
			typeRewrites += 1;
			fileChanged = true;
		}
	}

	for (const imp of sf.getImportDeclarations()) {
		const mod = imp.getModuleSpecifierValue();
		if (mod === "~/backend.server/context") {
			imp.setModuleSpecifier("~/backend.server/runtime");
			const names = imp.getNamedImports().map((n) => n.getName());
			const out = new Set<string>();
			for (const name of names) {
				if (name === "ServerContext") out.add("ServerRuntime");
				else if (name === "createTestServerContext")
					out.add("createTestServerRuntime");
				else out.add(name);
			}
			out.add("createServerRuntime");
			imp.removeNamedImports();
			imp.addNamedImports(Array.from(out));
			importRewrites += 1;
			fileChanged = true;
		}
		if (
			mod === "~/frontend/context" ||
			mod === "./context" ||
			mod === "../frontend/context"
		) {
			imp.setModuleSpecifier("~/frontend/runtime");
			const names = imp.getNamedImports().map((n) => n.getName());
			const out = new Set<string>();
			for (const name of names) {
				if (name === "ViewContext") out.add("ViewRuntime");
				else out.add(name);
			}
			out.add("createViewRuntime");
			imp.removeNamedImports();
			imp.addNamedImports(Array.from(out));
			importRewrites += 1;
			fileChanged = true;
		}
		if (mod === "~/utils/context" || mod === "./context") {
			imp.setModuleSpecifier("~/utils/runtime");
			const names = imp.getNamedImports().map((n) => n.getName());
			const out = names.map((name) =>
				name === "AppContext" ? "RuntimeContext" : name,
			);
			imp.removeNamedImports();
			imp.addNamedImports(out);
			importRewrites += 1;
			fileChanged = true;
		}
	}

	if (fileChanged) changedFiles += 1;
}

project.saveSync();
console.log(
	`remove-context codemod: changedFiles=${changedFiles}, tCalls=${tCalls}, urlCalls=${urlCalls}, langRefs=${langRefs}, ctorRewrites=${ctorRewrites}, typeRewrites=${typeRewrites}, importRewrites=${importRewrites}`,
);
