import { Project, Node, PropertyAssignment } from 'ts-morph';
import fs from 'fs';
import path from 'path';

type TranslationValue = string | Record<string, string>;

type TranslationEntry = {
    id: string;
    translation: TranslationValue;
    description: string;
};

const project = new Project({
    tsConfigFilePath: 'tsconfig.json',
});

const resultsMap = new Map<string, TranslationEntry>();
let duplicateCount = 0;

function getObjectProp(props: readonly Node[], name: string): Node | undefined {
    const prop = props.find((p): p is PropertyAssignment => {
        if (!Node.isPropertyAssignment(p)) return false;

        const nameNode = p.getNameNode();

        if (Node.isIdentifier(nameNode)) {
            return nameNode.getText() === name;
        }

        if (Node.isStringLiteral(nameNode)) {
            return nameNode.getLiteralText() === name;
        }

        return false;
    });

    return prop?.getInitializer();
}

function extractMsg(node: Node): string | undefined {
    if (Node.isStringLiteral(node)) {
        return node.getLiteralText();
    }

    if (Node.isArrayLiteralExpression(node)) {
        const parts: string[] = [];

        for (const el of node.getElements()) {
            if (!Node.isStringLiteral(el)) return;
            parts.push(el.getLiteralText());
        }

        return parts.join('\n');
    }

    return;
}

function extractPlural(node: Node): Record<string, string> | undefined {
    if (!Node.isObjectLiteralExpression(node)) return;

    const result: Record<string, string> = {};

    for (const prop of node.getProperties()) {
        if (!Node.isPropertyAssignment(prop)) continue;

        const nameNode = prop.getNameNode();
        const valueNode = prop.getInitializer();

        if (!valueNode || !Node.isStringLiteral(valueNode)) continue;

        let key: string | undefined;

        if (Node.isIdentifier(nameNode)) {
            key = nameNode.getText();
        } else if (Node.isStringLiteral(nameNode)) {
            key = nameNode.getLiteralText();
        }

        if (!key) continue;

        result[key] = valueNode.getLiteralText();
    }

    return Object.keys(result).length ? result : undefined;
}

for (const sourceFile of project.getSourceFiles(['app/**/*.ts', 'app/**/*.tsx'])) {
    sourceFile.forEachDescendant((node) => {
        if (!Node.isCallExpression(node)) return;

        const expr = node.getExpression().getText();
        if (!expr.endsWith('.t')) return;

        const firstArg = node.getArguments()[0];
        if (!firstArg || !Node.isObjectLiteralExpression(firstArg)) return;

        const props = firstArg.getProperties();

        const codeNode = getObjectProp(props, 'code');
        const msgNode = getObjectProp(props, 'msg');
        const msgsNode = getObjectProp(props, 'msgs');
        const descNode = getObjectProp(props, 'desc');

        if (!codeNode || !Node.isStringLiteral(codeNode)) return;

        const id = codeNode.getLiteralText();

        let translation: TranslationValue | undefined;

        // Normal message
        if (msgNode) {
            translation = extractMsg(msgNode);
        }

        // Plural message
        if (!translation && msgsNode) {
            translation = extractPlural(msgsNode);
        }

        if (!translation) return;

        const desc = Node.isStringLiteral(descNode) ? descNode.getLiteralText() : '';

        const filePath = path.relative(process.cwd(), sourceFile.getFilePath()).replace(/\\/g, '/');

        const location = `File: ${filePath}:${node.getStartLineNumber()}`;

        if (resultsMap.has(id)) {
            duplicateCount++;
            return;
        }

        resultsMap.set(id, {
            id,
            translation,
            description: `${desc}${desc ? ' ' : ''}${location}`,
        });
    });
}

// Output
const outDir = path.join(process.cwd(), 'locales');
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'en.json');

const results = Array.from(resultsMap.values()).sort((a, b) => a.id.localeCompare(b.id));

// fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

function escapeHtmlInJson(str: string) {
    return str.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

const jsonOutput = JSON.stringify(results, null, 2);
fs.writeFileSync(outFile, escapeHtmlInJson(jsonOutput));

console.log(`✅ Total unique keys written: ${results.length}`);
console.log(`⚠️  Duplicate keys found: ${duplicateCount}`);
console.log(`📁 Output file: ${outFile}`);
