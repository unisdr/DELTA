import path from "path";
import { Node, Project, SyntaxKind } from "ts-morph";

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

let filesChanged = 0;

for (const sf of project.getSourceFiles()) {
	let changed = false;

	for (const imp of sf.getImportDeclarations()) {
		const mod = imp.getModuleSpecifierValue();
		if (
			mod === "../context" &&
			sf.getFilePath().includes("app\\backend.server\\")
		) {
			imp.setModuleSpecifier("../runtime");
			changed = true;
		}
		if (mod === "../context" && sf.getFilePath().includes("app\\frontend\\")) {
			imp.setModuleSpecifier("../runtime");
			changed = true;
		}
		if (mod === "./frontend/context") {
			imp.setModuleSpecifier("./frontend/runtime");
			changed = true;
		}

		for (const n of imp.getNamedImports()) {
			const name = n.getName();
			if (name === "ServerContext") {
				n.setName("ServerRuntime");
				changed = true;
			}
			if (name === "ViewContext") {
				n.setName("ViewRuntime");
				changed = true;
			}
			if (name === "createTestServerContext") {
				n.setName("createTestServerRuntime");
				changed = true;
			}
		}
	}

	for (const tr of sf.getDescendantsOfKind(SyntaxKind.TypeReference)) {
		const t = tr.getTypeName().getText();
		if (t === "ServerContext") {
			tr.getTypeName().replaceWithText("ServerRuntime");
			changed = true;
		}
		if (t === "ViewContext") {
			tr.getTypeName().replaceWithText("ViewRuntime");
			changed = true;
		}
	}

	for (const ne of sf.getDescendantsOfKind(SyntaxKind.NewExpression)) {
		const e = ne.getExpression();
		if (!Node.isIdentifier(e)) continue;
		const exprText = e.getText();
		if (exprText === "ServerContext") {
			const a0 = ne.getArguments()[0]?.getText() ?? "undefined";
			ne.replaceWithText(`createServerRuntime(${a0})`);
			changed = true;
			continue;
		}
		if (exprText === "ViewContext") {
			ne.replaceWithText("createViewRuntime()");
			changed = true;
		}
	}

	for (const id of sf.getDescendantsOfKind(SyntaxKind.Identifier)) {
		if (id.getText() === "createTestServerContext") {
			id.replaceWithText("createTestServerRuntime");
			changed = true;
		}
	}

	for (const vs of sf.getVariableStatements()) {
		for (const decl of vs.getDeclarations()) {
			const name = decl.getName();
			if (name !== "ctx" && name !== "backendCtx") continue;
			const refs = decl.findReferencesAsNodes();
			if (refs.length <= 1) {
				vs.remove();
				changed = true;
				break;
			}
		}
	}

	if (changed) {
		sf.organizeImports();
		filesChanged += 1;
	}
}

project.saveSync();
console.log(`finish-context-removal: changed ${filesChanged} files`);
