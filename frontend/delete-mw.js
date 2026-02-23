const fs = require('fs');
try {
    fs.unlinkSync('./middleware.ts');
    console.log('middleware.ts deleted successfully');
} catch (e) {
    console.error('Error deleting file:', e.message);
}
