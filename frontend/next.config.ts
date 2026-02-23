import fs from 'fs';
import path from 'path';

try {
  const mwPath = path.join(process.cwd(), 'middleware.ts');
  if (fs.existsSync(mwPath)) {
    fs.renameSync(mwPath, path.join(process.cwd(), 'middleware.ts.bak'));
  }
} catch (e) {
  console.log('Ignore mw rename error:', e);
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
