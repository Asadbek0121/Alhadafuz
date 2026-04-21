import fs from 'fs';
import path from 'path';

function findDuplicateAttributes(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
                findDuplicateAttributes(fullPath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Simplified check: look for patterns like attr="val" anything attr="val" inside same < >
            // This is complex for regex, so let's do a basic per-element check
            const elements = content.match(/<[a-zA-Z0-9]+[^>]*>/g) || [];
            for (const el of elements) {
                const attrs = el.match(/([a-zA-Z0-9-]+)=/g) || [];
                const seen = new Set();
                for (const attr of attrs) {
                    if (seen.has(attr)) {
                        console.log(`Duplicate attribute ${attr} in ${fullPath}:`);
                        console.log(`  ${el}`);
                    }
                    seen.add(attr);
                }
            }
        }
    }
}

console.log("Checking for duplicate attributes...");
findDuplicateAttributes('./src');
