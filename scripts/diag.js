console.log("Node is working");
const fs = require('fs');
try {
    const files = fs.readdirSync('.');
    console.log("Root files:", files);
} catch (e) {
    console.error("Error reading dir:", e.message);
}
