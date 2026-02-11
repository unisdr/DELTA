import { Project, Node, PropertyAssignment } from 'ts-morph';
import fs from 'fs';
import path from 'path';

type TranslationEntry = {
    id: string;
    translation: string;
    description: string;
};

const project = new Project({
    tsConfigFilePath: 'tsconfig.json',
});

// Use Map for uniqueness
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
            if (!Node.isStringLiteral(el)) {
                return;
            }
            parts.push(el.getLiteralText());
        }

        return parts.join('\n');
    }

    return;
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
        const descNode = getObjectProp(props, 'desc');

        if (!codeNode || !msgNode) return;
        if (!Node.isStringLiteral(codeNode)) return;

        const id = codeNode.getLiteralText();
        const translation = extractMsg(msgNode);
        if (!translation) return;

        const desc = Node.isStringLiteral(descNode) ? descNode.getLiteralText() : '';

        const filePath = path.relative(process.cwd(), sourceFile.getFilePath());
        const location = `File: ${filePath}:${node.getStartLineNumber()}`;

        // Count duplicate instead of logging
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

const results = Array.from(resultsMap.values());

fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

console.log(`✅ Total unique keys written: ${results.length}`);
console.log(`⚠️  Duplicate keys found: ${duplicateCount}`);
console.log(`📁 Output file: ${outFile}`);
