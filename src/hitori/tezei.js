/* ==========================================================================
   手勢（風雲モード・十人長から三百人長）

   遊ぶ人の申し出：「一人から部隊が増えていく」「一つずつ上の地位になったときの部隊の動きについて、全て見たい。
   移動するところと、敵を見つけてその敵の隊と当たるところを、それぞれの地位に応じて」。

   十人長から三百人長に上がると、合戦で手勢を率いる。手勢は、上司の隊の槍組から分けた兵で、
   十人長は十人、三十人長は三十人、五十人長は一組（五十人）、百人長は二組、三百人長は六組。
   盤の理の上では上司の隊とは別の隊として動かす（分遣隊と同じ形：battle/corps.js makeDetachment）が、上司の隊に
   属するものとして扱う（下の「手勢は上司の隊に属する」）。
     ・隊の id は「上司の id ＋ #手勢」。戦の跡では、組の名簿の id（src）で上司の兵に数える
       （同じ組から分けた兵は、生き残りを足し合わせる：core/roster.js 戦の跡）
     ・将は与平（上司の将を写し、名と武勇・統率を与平のものに替える。総大将の印は持たない。手勢が崩れても
       総大将が討たれたことにはならない）
     ・本陣（将・旗持・馬廻）は立てない。率いる与平は、背中越しに自分で描く（battle/shinga.js）

   率いる（遊ぶ人の申し出：「隊を率いるようになった場合、自分が先頭を歩くのもなんか違う。後ろから指示を出すかたちに
   したい。クリック等で指示するのも操作性が悪そう。位置は後ろ固定で自分がコントロールで動けば、率いる隊も動き、これまで
   の『突く』は全体としての『攻撃』になるなど、コマンドが率いる隊全体となるような仕様に。ただし、ピッタリみんなが同じ
   動きをすると不自然なので、少し挙動にバラツキがあるように」）：
     ・与平は手勢のいちばん後ろの兵のうしろ（徒は三.五歩、馬上は五.五歩）に付く（hitori/senaka.js 与平をうしろに付ける）
     ・方向キーは手勢を動かす（写しの向きで、上は前へ）。押した方へ手勢が歩み、向きもそちらへ回る。組が二つ以上なら
       陣の向きも回す。放せば止まる。写しの手前（真うしろから左右七十度のうち）へ押せば、前を向いたまま下がる
       （足は六割。手勢が写しのほうへ向き直ると、与平が手勢の向こうへ回り、手勢が写しと与平のあいだに入るため）
     ・背中越しに率いているあいだ、手勢の足の慣性・向き直り・兵の絵の均しは実の秒で効かせる（battle/field.js
       率いの刻比。遊ぶ人の申し出：「隊を持ったときでも一人のときと同様にスムースに移動できるよう」）
     ・釦は一人のときと同じ三つを、手勢の全体で行う（遊ぶ人の申し出：「掛かれはあくまでも一人のときに槍をついていた
       のを部隊全体で突くようにするだけに」「突く（全体）と受ける（全体）」）：突く（与平と手勢の兵がいっせいに突く）・
       受ける（押しているあいだ、与平と手勢の兵が構えて受ける）・駆ける（押しているあいだ、手勢と与平が駆け足。倍の足。
       与平の気力を使う）。手勢の兵と敵の兵との突き合いは hitori/senaka.js 手勢の突き合い。もとの掛かれ（敵の組へ
       接戦の下知）と構え（守備の下知）はやめた。掛かれで敵と噛み合うと、盤の斬り合いに足を止められて動けなかった
     ・手勢は上司の隊に属する（遊ぶ人の申し出：「あくまでも武将に所属する部隊なので、別個にする必要はないと思います。
       別個に動くのはあくまでも物頭になってから」）。上司の隊の中の座（上司の隊の向きで測った前後・左右のずれ）を保って、
       上司の隊と一緒に歩む（下の 手勢を親に付ける）。背中越しに率いているあいだは遊ぶ人の下知に従い（方向キーを
       放せばその場に留まる）、率いていないとき（盤の視点・一騎駆けのあいだ・委ねたとき）は元の座へ戻って上司の隊に
       付く。盤の視点では、手勢に別の隊の印（旗・名・士気の帯）を出さない（battle/draw.js）。
       はじめの座は、上司の隊のいちばん前の組の前（兵の列が上司の兵の列に重ならない所）
     ・兵の足の出し方は一人ずつ少し違う（battle/shinga.js 足の癖）
     ・一騎駆け（遊ぶ人の申し出：「隊を率いている場合も一騎駆けができるように。ただし一定の時間が経過すると隊に戻る」）：
       与平が手勢を離れて自分で戦うあいだ、手勢は上司の隊に付く（歩ませていたなら止め、元の座へ戻る。hitori/senaka.js
       一騎駆け）
     ・与平が討たれるか、委ねて結果を見るなら、手勢は上司の隊について動く（上司の隊が崩れたら諸将の采配に任せる）
   五十人長からは、与平は馬上（組頭と同じ。battle/shinga.js 組頭の番）。
   値はみな仮。
   ========================================================================== */
import { placeSquads } from "../battle/corps.js";
import { terrainAt, 率いの刻比 } from "../battle/field.js";
import { 野の道 } from "../battle/route.js";

export const 手勢の数 = { 十人長: 10, 三十人長: 30, 五十人長: 50, 百人長: 100, 三百人長: 300 };
const 下知の間 = 0.2;                           // 方向キーから手勢へ下知を出し直す間（実の秒）

/* 手勢を組む（合戦の始めに一度）。隊id … 上司の隊。一人 … 盤へ渡す主人公（手勢・名・武勇・統率）。
   組んだ手勢の隊を返す（組めなければ null）。盤に b.手勢 として控える */
export function 手勢を組む(b, 隊id, 一人) {
  const 数 = (一人 && 一人.手勢) || 0;
  if (!(数 > 0) || !b || !b.corps) return null;
  if (b.手勢) return b.手勢;
  const 親 = b.corps.find((c) => c.id === 隊id && !c.dead && !c.destroyed);
  if (!親) return null;
  const 敵 = b.corps.filter((c) => c.side !== 親.side && !c.dead && !c.destroyed);
  const 敵まで = (q) => { let m = 1e12; for (const e of 敵) { const d = (e.x - q.x) ** 2 + (e.y - q.y) ** 2; if (d < m) m = d; } return m; };
  /* 敵に近い槍組から取る（槍組が無ければ、ほかの組から） */
  const 生 = 親.squads.filter((q) => q.men > 0);
  const 元ら = (生.some((q) => q.type === "yari") ? 生.filter((q) => q.type === "yari") : 生).sort((a, z) => 敵まで(a) - 敵まで(z));
  const 取る = []; let 残り = 数;
  for (const q of 元ら) {
    if (残り <= 0) break;
    if (q.men <= 残り + 0.5) { 取る.push(q); 残り -= q.men; continue; }
    /* 組を分ける。分けた兵は同じ名簿の組（src）のまま（戦の跡で生き残りを足し合わせる） */
    const 分 = { ...q, id: `${q.id}#手勢`, men: 残り, max: 残り, engaged: false, foe: null, link: null, aim: null,
      cool: 0, seed: (q.seed || 0) + 517 };
    q.men -= 残り; q.max = Math.max(q.men, (q.max || 50) - 残り);
    取る.push(分); 残り = 0;
  }
  if (!取る.length) return null;
  親.squads = 親.squads.filter((q) => !取る.includes(q));
  const x = 取る.reduce((a, q) => a + q.x, 0) / 取る.length, y = 取る.reduce((a, q) => a + q.y, 0) / 取る.length;
  const 名 = (一人 && 一人.名) || "与平";
  const 将 = { ...親.gen, id: `${親.gen.id}#手勢`, name: 名, lord: false,
    lead: 一人 && 一人.統率 != null ? 一人.統率 : 30, valor: 一人 && 一人.武勇 != null ? 一人.武勇 : 45 };
  const c = {
    id: `${親.id}#手勢`, side: 親.side, gen: 将, color: 親.color, name: `${名}の手勢`,
    x, y, facing: 親.facing, order: "待機", tx: x, ty: y, morale: 親.morale, squads: 取る,
    formation: "横陣", routed: false, dead: false, destroyed: false, ambush: false, revealed: true,
    lastSeen: { x, y, t: b.t || 0 }, seen: false, loss: { 直属: 0, 地域: 0 }, feats: [],
    fatigue: 親.fatigue || 0, chargeT: 0, reformT: 0, faceTo: null, 陣向き: 親.陣向き != null ? 親.陣向き : 親.facing,
    pending: null, pinch: 0, northStart: 親.northStart, bank0: 親.bank0,
    auto: false, detach: false, parentId: 親.id, task: null, autonomous: false, boxed: false, 手勢: 数, 導き: null,
  };
  placeSquads(c, true);
  placeSquads(親, false);
  /* はじめの座：上司の隊のいちばん前の組の前へ出す。分けた兵は上司の組と同じ所に立つので、そのままでは兵の列が
     上司の兵の列と重なり、どれが手勢か見分けられない。手勢のいちばん後ろの兵の列が、上司のいちばん前の兵の列より
     三歩前に来る所（組の兵は十人ずつ列を作り、列は二.七歩ごと。battle/shinga.js） */
  {
    const 向 = 親.陣向き != null ? 親.陣向き : 親.facing, fx = Math.cos(向), fy = Math.sin(向);
    const 上司の前 = Math.max(...親.squads.filter((q) => q.men > 0).map((q) => q.x * fx + q.y * fy).concat([親.x * fx + 親.y * fy]));
    const 手勢の後 = Math.min(...c.squads.map((q) => q.x * fx + q.y * fy - (Math.ceil(Math.min(50, q.men) / 10) - 1) * 2.7));
    const 出 = 上司の前 + 3 - 手勢の後;
    if (出 > 0) { c.x += fx * 出; c.y += fy * 出; }
    c.facing = 向; c.陣向き = 向; c.tx = c.x; c.ty = c.y;
    placeSquads(c, true);
  }
  b.corps.push(c);
  b.手勢 = c;
  b.手勢を付ける = 手勢を親に付ける;                 // 盤の刻みごとに上司の隊に付ける（battle/engine.js stepBattle）
  if (b.log) b.log.push({ t: b.t || 0, text: `${名}が手勢${数}人を率いる（${親.name}の隊から）。` });
  return c;
}


const 角の差 = (a, z) => { let d = a - z; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const 下知の控え = (c) => c.下知 || (c.下知 = { t: -9, 様: "待つ", 陣t: -9 });
const 委ねるか = (b, c) => !c || !c.手勢 || c.dead || c.destroyed || b.委ねた;

/* 方向キーから手勢へ（背中越しの一コマごと）。入 … 背中越しの入り（jx・jy・keys・駆）。写し角 … 写しの向き（世界の角）。
   t … 実の秒。押していれば、押した向き（盤の座標）へ四十歩先を行き先にして歩ませる。放せば止める。
   写しの手前（真うしろから左右七十度のうち）へ押せば、向きを保ったまま下がる（c.向きを保つ。battle/engine.js）。
   手勢の兵が敵の兵と槍の間合いまで詰まっていれば、詰まった向きへは出さない（下）。駆ける可 … 駆け足を許すか
   （与平の気力が尽きれば許さない。hitori/senaka.js） */
export const 下がる押し = 0.342;               // 押した向きの写しの手前への分がこれを超えれば下がる（cos 七十度。値は仮）
/* 手勢の兵が敵の兵と詰まっているときの留まり（下の 手勢へ下知）。値は仮 */
export const 寄る押し = 0.3;                                   // 押した向きが、詰まった向きを均した向きへこれより寄っていれば敵へ寄る押し
export const 詰まりの正面 = Math.cos(50 * Math.PI / 180);     // 敵へ寄る押しなら、押した向きの左右五十度のうちで詰まっていれば留まる
export const 詰まりの真向き = Math.cos(25 * Math.PI / 180);   // 横やうしろへの押しなら、左右二十五度のうちで詰まっているときだけ留まる
export function 手勢へ下知(b, c, 入, 写し角, t, 駆ける可 = true) {
  if (委ねるか(b, c)) return;
  const 下 = 下知の控え(c);
  let jx = 入.jx || 0, jy = 入.jy || 0;
  const 鍵 = 入.keys || new Set(), kx = (鍵.has("r") ? 1 : 0) - (鍵.has("l") ? 1 : 0), ky = (鍵.has("d") ? 1 : 0) - (鍵.has("u") ? 1 : 0);
  if (kx || ky) { const L = Math.hypot(kx, ky); jx = kx / L; jy = ky / L; }
  const m = Math.hypot(jx, jy), 押す = m > 0.12;
  /* 下知は〇.二秒ごとに出し直す。ただし押し始め・放した刻、手勢の兵が敵の兵と詰まった・離れた刻、駆ける・駆けないが
     変わった刻は待たずに出す（押してから最大〇.二秒、上司の隊について向き直る動きが続いていた。詰まってからも
     〇.二秒、敵の列へ歩み続けた） */
  const 詰 = c.詰まり && c.詰まり.数 > 0 && t - c.詰まり.t < 0.5 ? c.詰まり : null, 駆け = !!入.駆 && !!駆ける可;
  if (t - 下.t < 下知の間 && 押す === !!下.押す && !!詰 === !!下.詰 && 駆け === !!下.駆け) return;
  下.t = t; 下.押す = 押す; 下.詰 = !!詰; 下.駆け = 駆け;
  c.auto = false; c.pending = null; c.wp = null;
  if (押す) {
    const cfx = Math.cos(写し角), cfz = Math.sin(写し角), ux = jx / m, uy = jy / m;
    const wx = cfz * ux - cfx * uy, wz = -cfx * ux - cfz * uy;
    let dx = wx, dy = -wz;                                                            // 世界の向き → 盤の向き
    /* 手勢の兵が敵の兵と槍の間合いまで詰まっていれば（hitori/senaka.js 手勢の突き合い の c.詰まり。〇.五秒より古ければ
       見ない）、詰まった向き（十六方のどれか）へは出さない。
         ・敵へ寄る向きに押せば（押した向きが、詰まった向きを均した向きへ 寄る押し より寄っている）、押した向きの
           左右五十度（詰まりの正面）のうちで詰まっていれば、その場に留まって槍を合わせる
         ・横やうしろへ押せば、押した向きの左右二十五度（詰まりの真向き）のうちで詰まっているときだけ留まる（敵の兵が
           脇や斜めうしろに回っていても、離れられる）
       留まらなければ、押した向きから詰まった向きへの分を順に抜いて（三巡）、残りの向きへ動く（敵の列に沿って横へ、
       また敵から離れる向きへ動ける）。もとは詰まった向きを均した一つの向きだけを見ていたので、敵の隊の角で触れると、
       均した向き（横）を抜いた残り（前）へ歩み続け、敵の兵の列の中へ入り込んだ */
    if (詰) {
      const L = Math.hypot(詰.x, 詰.y) || 1;
      const 方 = 詰.方 && 詰.方.length ? 詰.方.map((k) => [Math.cos(k * Math.PI / 8), Math.sin(k * Math.PI / 8)]) : [[詰.x / L, 詰.y / L]];
      const 寄る = (dx * 詰.x + dy * 詰.y) / L > 寄る押し, 留め = 寄る ? 詰まりの正面 : 詰まりの真向き;
      if (方.some(([nx, ny]) => dx * nx + dy * ny > 留め)) { dx = 0; dy = 0; }
      else for (let 巡 = 0; 巡 < 3; 巡++) for (const [nx, ny] of 方) { const 沿 = dx * nx + dy * ny; if (沿 > 1e-6) { dx -= 沿 * nx; dy -= 沿 * ny; } }
    }
    const 残 = Math.hypot(dx, dy);
    if (残 < 0.3) { dx = 0; dy = 0; } else { dx /= 残; dy /= 残; }
    c.order = "移動"; c.狙い = null; c.tx = c.x + dx * 40; c.ty = c.y + dy * 40; 下.様 = "動く"; c.従い = false; c.faceTo = null; c.wp = null;
    c.向きを保つ = uy > 下がる押し;                                   // 写しの手前へ押せば、前を向いたまま下がる
    /* 駆ける（全体）：押しているあいだ駆け足（倍の足。battle/engine.js）。与平の気力が尽きれば駆けない（駆ける可。
       hitori/senaka.js が与平の気力で決める）。下がりながらは駆けない。もとは突撃の刻（一.三五倍）を使っていたので、
       駆けているのが目に見えなかった（遊ぶ人の申し出：「ダッシュもできません」） */
    c.駆け足 = 駆け && !c.向きを保つ;
    /* 組が二つ以上なら、陣の向きも歩む向きへ回す（〇.六秒に一度まで。二十度より回れば陣を組み直す） */
    if (c.squads.filter((q) => q.men > 0).length > 1 && t - 下.陣t > 0.6 && Math.abs(角の差(c.facing, c.陣向き == null ? c.facing : c.陣向き)) > 0.35) {
      下.陣t = t; c.陣向き = c.facing; placeSquads(c, false);
    }
  } else if (下.様 === "動く") {
    c.order = "待機"; c.tx = c.x; c.ty = c.y; 下.様 = "待つ"; c.向きを保つ = false; c.駆け足 = false;
  }
}

/* 与平が手勢を離れる（一騎駆け。hitori/senaka.js）とき：方向キーで歩ませていたなら、その場に止める。そののちは
   率いていないので、上司の隊の元の座へ戻って付く（下の 手勢を親に付ける） */
export function 手勢を留める(b, c) {
  if (委ねるか(b, c)) return;
  const 下 = 下知の控え(c);
  if (下.様 === "動く") { c.order = "待機"; c.tx = c.x; c.ty = c.y; 下.様 = "待つ"; }
  c.向きを保つ = false; c.駆け足 = false; 下.t = -9;
}

/* 与平が討たれたら、手勢は上司の隊について動く（下の 手勢を親に付ける。上司の隊が崩れていれば諸将の采配に任せる） */
export function 手勢を委ねる(c) {
  if (!c || !c.手勢) return;
  const 下 = 下知の控え(c);
  if (下.様 === "動く") { c.order = "待機"; c.tx = c.x; c.ty = c.y; }
  下.様 = "待つ"; c.向きを保つ = false; c.駆け足 = false; c.委ねた = true;
}

/* 手勢を上司の隊に付ける（盤の刻みごと。battle/engine.js stepBattle が b.手勢を付ける として呼ぶ）。遊ぶ人の申し出：
   「盤にした場合、10人組でも所属する武将とは別個として認識されていますが、動かせず、その場にとどまります。あくまでも
   武将に所属する部隊なので、別個にする必要はないと思います」。手勢は、上司の隊の中の座（上司の隊の向きで測った前後・
   左右のずれ。c.親の座。はじめの座は上司の隊の前の列の前）を保って、上司の隊と一緒に歩む。座から 付き従いの隔 より
   離れれば歩み出し（上司の隊が動いているあいだは、行き先を刻みごとに改めて付いて歩む）、上司の隊が止まって座に
   着けば、上司の隊の向きへ向き直る。背中越しに率いているあいだは付き従わない（遊ぶ人の下知に従う。下）。
   盤の組どうしで噛み合っているあいだは、斬り合いを捨てて歩み去らない。上司の隊が崩れたか退いたなら付き従わず、
   遊ぶ人が率いていなければ諸将の采配に任せる */
export const 付き従いの隔 = 8;                    // 座からこれより離れれば歩み出す（盤の歩。値は仮）
const 淵を跨ぐ = (x0, y0, x1, y1) => { for (let k = 0; k <= 8; k++) if (terrainAt(x0 + (x1 - x0) * k / 8, y0 + (y1 - y0) * k / 8) === "deep") return true; return false; };
function 従う道(c, 親, tx, ty) {
  const T = 親.trail || [];
  let k0 = -1, bd = 1e9;
  for (let k = 0; k < T.length; k++) { const d = Math.hypot(T[k].x - c.x, T[k].y - c.y); if (d < bd) { bd = d; k0 = k; } }
  const 末 = { x: tx, y: ty, r: 8, 末: true };
  if (k0 >= 0 && bd < 120) return [...T.slice(k0).map((p) => ({ x: p.x, y: p.y, r: 12 })), 末];
  const 道 = 野の道(c.x, c.y, tx, ty);
  return 道 && 道.length ? [...道.map((p) => ({ x: p.x, y: p.y, r: Math.min(p.r || 40, 12) })), 末] : null;
}
export function 手勢を親に付ける(b, c) {
  if (!b || !c || !c.手勢 || c.dead || c.destroyed || c.routed || c.withdraw) return;
  const 親 = b.corps.find((x) => x.id === c.parentId);
  const 下 = 下知の控え(c);
  if (!親 || 親.dead || 親.destroyed || 親.routed || 親.withdraw) {
    c.従い = false;
    if (!(c.率い刻比 > 0 && b.t - (c.率い盤t == null ? -1e9 : c.率い盤t) < 0.25)) c.auto = true;
    return;
  }
  const 向 = 親.陣向き != null ? 親.陣向き : 親.facing, fx = Math.cos(向), fy = Math.sin(向);
  const 元x = 親.席x != null ? 親.席x : 親.x, 元y = 親.席y != null ? 親.席y : 親.y;
  const 座を据える = () => { const dx = c.x - 元x, dy = c.y - 元y; c.親の座 = { 前: dx * fx + dy * fy, 横: -dx * fy + dy * fx }; };
  if (!c.親の座) 座を据える();
  /* 背中越しに率いているあいだは、遊ぶ人の下知に従う。方向キーを放せばその場に留まり、上司の隊が動いても付いて
     歩まない（突く・受けるを押しているあいだに、手勢が上司の隊のほうへ歩き出していた）。座は改めない（率いるのを
     やめれば、上司の隊の中の元の座へ戻って付く）。付いて歩んでいた途中で率い始めたなら、その場に止める */
  if (率いの刻比(b, c)) {
    if (c.従い) { c.従い = false; c.order = "待機"; c.tx = c.x; c.ty = c.y; c.wp = null; }
    return;
  }
  c.auto = false;
  if (c.squads.some((q) => q.engaged && q.men > 0)) { c.従い = false; return; }
  const 座 = c.親の座, tx = 元x + fx * 座.前 - fy * 座.横, ty = 元y + fy * 座.前 + fx * 座.横;
  const d = Math.hypot(tx - c.x, ty - c.y);
  const 親の足 = 親.速 ? Math.hypot(親.速.x, 親.速.y) : 0;
  if (d > 付き従いの隔 || (c.従い && (d > 6 || 親の足 > 2))) {          // 盤の隊は行き先の六歩のうちで足を止める
    c.order = "移動"; c.狙い = null; c.向きを保つ = false; c.駆け足 = false; c.pending = null; c.faceTo = null; c.従い = true;
    /* 座へまっすぐ行くと淵（深い川）を跨ぐなら、上司の隊が来た道（c.trail。上司の隊は橋や浅瀬を渡って来ている）を
       手勢にいちばん近い所から辿り、それから座へ向かう。上司の道が近くに無ければ、浅瀬や橋を辿る道を引く
       （battle/route.js 野の道）。道は六秒ごとに引き直し、道の末は刻みごとに上司の座へ改める。曲がり角に着いたと
       するのは十二歩のうち（野の道の輪は五十歩ほどと広く、橋の袂の手前で着いたことになって淵へ向かった）。
       もとは淵の手前で立ち尽くし、上司の隊だけが川を越えて行った */
    if (淵を跨ぐ(c.x, c.y, tx, ty)) {
      if (!c.wp || !c.wp.length || b.t - (c.従い道刻 == null ? -99 : c.従い道刻) > 6) {
        c.wp = 従う道(c, 親, tx, ty); c.従い道刻 = b.t;
      } else if (c.wp[c.wp.length - 1].末) c.wp[c.wp.length - 1] = { x: tx, y: ty, r: 8, 末: true };
    } else c.wp = null;
    if (c.wp && c.wp.length) { c.tx = c.wp[0].x; c.ty = c.wp[0].y; } else { c.tx = tx; c.ty = ty; }
  } else if (c.従い) {
    c.従い = false; c.order = "待機"; c.tx = c.x; c.ty = c.y; c.wp = null;
    if (Math.abs(角の差(c.facing, 向)) > 0.3) c.faceTo = 向;          // 着いたら上司の隊の向きへ向き直る
  }
}

/* 手勢の下知の名（名札に出す） */
export const 下知の名 = (c) => (c && c.従い ? "上司の隊に付く"
  : c && c.下知 && c.下知.様 === "動く" ? (c.駆け足 ? "駆けよ" : c.向きを保つ ? "下がれ" : "進め") : "待て");
