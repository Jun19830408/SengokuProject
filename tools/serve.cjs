// 手元のパソコンから、同じ Wi-Fi にいる携帯へ配る小さな宿。
//
//   npm start
//
// なぜ宿を立てるか。
// 携帯の「ファイル」から html を直に開くと、iPhone では記録（localStorage）が
// 残らぬことがある。宿を立てて http:// で開けば、きちんと残る。
// 直したときも、書き出して携帯を引き下ろすだけで新しくなる。
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const 港 = Number(process.env.PORT || 8080);

// まず書き出す（古いものを配らぬように）
require('./build.cjs');

const 型 = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};

const 宿 = http.createServer((req, res) => {
  let 名 = decodeURIComponent((req.url || '/').split('?')[0]);
  if (名 === '/' || 名 === '') 名 = '/戦国.html';
  const 先 = path.join(DIST, path.normalize(名).replace(/^(\.\.[/\\])+/, ''));
  if (!先.startsWith(DIST) || !fs.existsSync(先) || fs.statSync(先).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ありませぬ');
    return;
  }
  res.writeHead(200, {
    'Content-Type': 型[path.extname(先)] || 'application/octet-stream',
    'Cache-Control': 'no-store',            // 直したものがすぐ映るように
  });
  fs.createReadStream(先).pipe(res);
});

宿.listen(港, '0.0.0.0', () => {
  const 宛先 = [];
  for (const [, 一覧] of Object.entries(os.networkInterfaces())) {
    for (const n of 一覧 || []) {
      if (n.family === 'IPv4' && !n.internal) 宛先.push(n.address);
    }
  }
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  戦国プロジェクト　宿を立てました');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('  このパソコンで見るなら');
  console.log(`    http://localhost:${港}`);
  console.log('');
  if (宛先.length) {
    console.log('  同じ Wi-Fi の携帯で見るなら、Safari に次を打ちます');
    for (const a of 宛先) console.log(`    http://${a}:${港}`);
  } else {
    console.log('  ★Wi-Fi に繋がっていないようです。繋いでから立て直してください。');
  }
  console.log('');
  console.log('  終えるときは Control + C');
  console.log('');
});
