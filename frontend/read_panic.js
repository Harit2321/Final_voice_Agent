const os = require('os');
const fs = require('fs');
const path = require('path');
const tmpdir = os.tmpdir();
const files = fs.readdirSync(tmpdir).filter(f => f.startsWith('next-panic'));
if (files.length === 0) {
    fs.writeFileSync('panic_output.txt', 'No next-panic logs found in ' + tmpdir);
} else {
    // Read the latest one
    files.sort((a, b) => fs.statSync(path.join(tmpdir, b)).mtimeMs - fs.statSync(path.join(tmpdir, a)).mtimeMs);
    const content = 'Latest next-panic log: ' + files[0] + '\n' + fs.readFileSync(path.join(tmpdir, files[0]), 'utf8');
    fs.writeFileSync('panic_output.txt', content);
}
