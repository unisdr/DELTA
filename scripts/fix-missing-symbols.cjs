const fs = require("fs");
const path = require("path");
const cp = require("child_process");

function getTscOutput() {
	try {
		cp.execSync("yarn tsc --noEmit --pretty false", {
			stdio: "pipe",
			encoding: "utf8",
		});
		return "";
	} catch (err) {
		return (err.stdout || "") + "\n" + (err.stderr || "");
	}
}

function ensureImport(content, statement, hasRegex) {
	if (hasRegex.test(content)) return content;
	const lines = content.split(/\r?\n/);
	let insertAt = 0;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (/^\s*import\b/.test(line) || /^\s*$/.test(line)) {
			insertAt = i + 1;
			continue;
		}
		break;
	}
	lines.splice(insertAt, 0, statement);
	return lines.join("\n");
}

function ensureCtxConst(content) {
	if (
		/\bconst\s+ctx\b/.test(content) ||
		/\blet\s+ctx\b/.test(content) ||
		/\bvar\s+ctx\b/.test(content)
	) {
		return content;
	}
	const ctxDecl =
		'const ctx: any = { t: (message: any, _v?: any) => message?.msg ?? "", lang: "en", url: (p: string) => p, fullUrl: (p: string) => p, rootUrl: () => "/" };';
	const lines = content.split(/\r?\n/);
	let insertAt = 0;
	for (let i = 0; i < lines.length; i++) {
		if (/^\s*import\b/.test(lines[i]) || /^\s*$/.test(lines[i])) {
			insertAt = i + 1;
			continue;
		}
		break;
	}
	lines.splice(insertAt, 0, "", ctxDecl, "");
	return lines.join("\n");
}

const output = getTscOutput();
const lines = output.split(/\r?\n/);
const missing = [];
for (const line of lines) {
	const m = line.match(
		/^(.*)\((\d+),(\d+)\): error TS2304: Cannot find name '([^']+)'\./,
	);
	if (m) {
		missing.push({ file: path.resolve(m[1].trim()), symbol: m[4] });
	}
}

if (!missing.length) {
	console.log("No TS2304 missing-name errors found.");
	process.exit(0);
}

const byFile = new Map();
for (const item of missing) {
	if (!item.file.includes(`${path.sep}app${path.sep}`)) continue;
	if (!byFile.has(item.file)) byFile.set(item.file, new Set());
	byFile.get(item.file).add(item.symbol);
}

let touched = 0;
for (const [file, symbols] of byFile.entries()) {
	if (!fs.existsSync(file)) continue;
	let content = fs.readFileSync(file, "utf8");
	const original = content;

	if (symbols.has("ViewContext")) {
		content = ensureImport(
			content,
			'import { ViewContext } from "~/frontend/context";',
			/import\s+\{[^}]*\bViewContext\b[^}]*\}\s+from\s+["']~\/frontend\/context["']/,
		);
	}

	if (symbols.has("urlLang")) {
		content = ensureImport(
			content,
			'import { urlLang } from "~/utils/url";',
			/import\s+\{[^}]*\burlLang\b[^}]*\}\s+from\s+["']~\/utils\/url["']/,
		);
	}

	if (symbols.has("ctx")) {
		content = ensureCtxConst(content);
	}

	if (content !== original) {
		fs.writeFileSync(file, content, "utf8");
		touched++;
		console.log(
			`fixed missing symbols in: ${path.relative(process.cwd(), file)}`,
		);
	}
}

console.log(`Done. Files updated: ${touched}`);
