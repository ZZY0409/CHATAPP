const fs = require('fs');
const path = require('path');

function findFiles(startPath, filter) {
    if (!fs.existsSync(startPath)) {
        console.log("Directory not found:", startPath);
        return;
    }

    const files = fs.readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
        const filename = path.join(startPath, files[i]);
        const stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            findFiles(filename, filter); // Recurse into subdirectories
        } else if (filename.indexOf(filter) >= 0) {
            console.log('-- found: ', filename);
            // 可以在这里添加文件内容检查逻辑
        }
    }
}

console.log("Searching for socket.io.js:");
findFiles('.', 'socket.io.js');

console.log("\nSearching for app.js:");
findFiles('.', 'app.js');

console.log("\nSearching for files containing 'socket.io':");
findFiles('.', 'socket.io');

console.log("\nSearching for files containing 'app':");
findFiles('.', 'app');