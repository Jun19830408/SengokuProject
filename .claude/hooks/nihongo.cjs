// 説明の文が英語になっていないかを確かめるフック。
//   node nihongo.cjs stop … Stop：この応答の文に英語があれば、日本語で書き直させる
//   node nihongo.cjs post … PostToolUse：直前の文が英語なら、注意を差し込む
//   node nihongo.cjs test <記録.jsonl> … これまでの文を一つずつ判定して数える（確かめ用）
// コード・コマンド・ファイル名・URL・識別子は数えない。
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const 種 = process.argv[2] || 'stop';

function 入力() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) { return {}; }
}

// 記録（JSONL）の末尾だけを読む。量が無ければ全部
function 記録(p, 量) {
  let fd;
  try { fd = fs.openSync(p, 'r'); } catch (e) { return []; }
  try {
    const 大 = fs.fstatSync(fd).size, 始 = 量 ? Math.max(0, 大 - 量) : 0;
    const buf = Buffer.alloc(大 - 始);
    fs.readSync(fd, buf, 0, buf.length, 始);
    let s = buf.toString('utf8');
    if (始 > 0) s = s.slice(s.indexOf('\n') + 1);
    const 行 = [];
    for (const l of s.split('\n')) { if (!l) continue; try { 行.push(JSON.parse(l)); } catch (e) {} }
    return 行;
  } finally { fs.closeSync(fd); }
}

// 人が打った発言か（道具の結果・要約・差し込みは除く）
function 人の発言か(j) {
  if (!j || j.type !== 'user' || !j.message || j.isMeta || j.isCompactSummary || j.isSidechain) return false;
  const c = j.message.content;
  if (typeof c === 'string') return true;
  return Array.isArray(c) && !c.some(x => x && x.type === 'tool_result') && c.some(x => x && x.type === 'text');
}

// 書いた文（text のかたまり）を並べる
function 文(j) {
  if (!j || j.type !== 'assistant' || j.isSidechain || !j.message || !Array.isArray(j.message.content)) return [];
  return j.message.content.filter(b => b && b.type === 'text' && b.text).map(b => ({ id: j.uuid, 時: j.timestamp, text: b.text }));
}

// この応答で書いた文（最後の人の発言より後）
function この応答の文(行) {
  let i = 行.length - 1;
  while (i >= 0 && !人の発言か(行[i])) i--;
  return 行.slice(i + 1).flatMap(文);
}

const 和字 = /[　-〿぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/g;

// 英語の行を返す（無ければ空）
function 英語の行(text) {
  const 地 = text
    .replace(/```[\s\S]*?```/g, ' ')                // コードの塊
    .replace(/`[^`\n]*`/g, ' ')                     // 行内のコード
    .replace(/https?:\/\/\S+/g, ' ')                // URL
    .replace(/<[^<>\n]*@[^<>\n]*>/g, ' ')           // 宛先
    .replace(/[\w.~$-]*\/[\w./~$-]*/g, ' ')         // パス
    .replace(/\b[\w-]+\.[A-Za-z]\w{0,4}\b/g, ' ')   // ファイル名
    .replace(/\b\w*(?:[a-z][A-Z]|_)\w*\b/g, ' ')    // 識別子
    .replace(/(^|\s)--?[\w-]+/g, ' ');              // オプション
  const 見つけた = [];
  let 英 = 0, 和 = 0;
  for (const 行 of 地.split('\n')) {
    const 語 = (行.match(/[A-Za-z]{2,}/g) || []).length;
    const 和数 = (行.match(和字) || []).length;
    英 += (行.match(/[A-Za-z]/g) || []).length;
    和 += 和数;
    if (/^\s*\|/.test(行)) continue;              // 表の行は全体の割合だけで見る
    if ((語 >= 4 && 和数 === 0) || (語 >= 6 && 和数 < 語)) 見つけた.push(行.trim());
  }
  if (!見つけた.length && 英 >= 40 && 英 > 和 * 2) 見つけた.push(地.trim().split('\n')[0]);
  return 見つけた;
}

function 例(s) { s = s.replace(/\s+/g, ' ').trim(); return s.length > 60 ? s.slice(0, 60) + '…' : s; }

if (種 === 'test') {
  const 全 = 記録(process.argv[3]).flatMap(文);
  const 英 = 全.filter(x => 英語の行(x.text).length);
  console.log(`文 ${全.length} 件のうち 英語と判定 ${英.length} 件`);
  for (const x of 英.slice(-(+process.argv[4] || 10))) console.log(`  ${x.時}  ${例(英語の行(x.text)[0])}`);
  process.exit(0);
}

const 入 = 入力();
if (種 === 'stop') {
  if (入.stop_hook_active) process.exit(0);
  const 並び = この応答の文(記録(入.transcript_path || '', 8 * 1024 * 1024));
  if (typeof 入.last_assistant_message === 'string') 並び.push({ text: 入.last_assistant_message });
  const 英 = 並び.flatMap(x => 英語の行(x.text));
  if (英.length) {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `この応答の説明の文に英語がありました（${英.length}か所。例：「${例(英[0])}」）。説明の文はすべて日本語で書く決まりです（コード・コマンド・ファイル名は英字のままで構いません）。利用者に伝える内容を日本語で書き直してください。`,
    }));
  }
} else if (種 === 'post') {
  const 並び = この応答の文(記録(入.transcript_path || '', 512 * 1024));
  const 最後 = 並び[並び.length - 1];
  if (!最後) process.exit(0);
  // 同じ文に二度は注意しない
  const 覚え = path.join(os.tmpdir(), `nihongo-${String(入.session_id || 'x').replace(/\W/g, '')}.txt`);
  let 前 = ''; try { 前 = fs.readFileSync(覚え, 'utf8'); } catch (e) {}
  const 印 = `${最後.id}:${最後.text.length}`;
  if (前 === 印) process.exit(0);
  const 英 = 英語の行(最後.text);
  if (英.length) {
    try { fs.writeFileSync(覚え, 印); } catch (e) {}
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `直前に書いた文が英語でした（例：「${例(英[0])}」）。説明の文は、ツールの合間の一言も含め、すべて日本語で書いてください。`,
      },
    }));
  }
}
