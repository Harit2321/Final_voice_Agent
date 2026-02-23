const fs = require('fs');
const path = require('path');

function rmDir(dir) {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((file) => {
            const curPath = path.join(dir, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                rmDir(curPath);
            } else {
                try {
                    fs.unlinkSync(curPath);
                } catch (err) { }
            }
        });
        try {
            fs.rmdirSync(dir);
        } catch (err) { }
    }
}

rmDir('./.next');
console.log('Cleaned .next');
