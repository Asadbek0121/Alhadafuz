const fs = require('fs');
try {
    const files = fs.readdirSync('./node_modules');
    console.log("node_modules count:", files.length);
} catch (e) {
    console.error("Error reading node_modules:", e.message);
}
