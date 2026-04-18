const fs = require('fs');
const path = require('path');

const targetStr = "// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute";

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.jsx')) {
            callback(dirPath);
        }
    });
}

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('// noinspection')) {
        return;
    }
    
    const lines = content.split('\n');
    let useClientRegex = /^(['"])use client\1;?/;
    if (lines[0] && useClientRegex.test(lines[0].trim())) {
        lines.splice(1, 0, targetStr);
    } else {
        lines.unshift(targetStr);
    }
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Fixed', filePath);
}

walkDir('./src', fixFile);
console.log('Done!');
