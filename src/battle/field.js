import { MAP, castleTerrainAt, 城の域か } from "./castleMap.js";
import { clamp, makeRng } from "../core/util.js";

/* ==========================================================================
   戦闘エンジン
   ========================================================================== */
// 一方の陣に並べられる武将隊の数と、一隊が抱えられる兵の上限。
// 関ヶ原では東西あわせて六十余隊が参陣し、最大の隊（徳川家康の本隊）が約三万であった。
// 参加隊数は史料により差があるため、片軍32隊を上限とする。
export const MAX_CORPS = 32;

/* ただし筋書きのある一戦（関ヶ原など）はこの限りではない。
   布陣は史実で決まっており、東軍だけで三十四隊ある。kassen.js が直に組む。 */

export const MAX_CORPS_MEN = 30000;


// 戦場の広さは兵数で決まる。大軍ほど広い野が要る。
export const BASE = { w: 1080, h: 720 };

export const FIELD = { w: 1080, h: 720 };

// 戦場の広さは兵数と城の規模で変わる。指揮圏と伝令もそれに合わせて伸ばす。
// これを怠ると、広い戦場では隊が軒並み指揮圏外になり、命令が届かなくなる。
/* 足の尺（GDD 8.1・9.3）。

   野の倍は、足の速さ・見通し・指揮圏・伝令の速さをまとめて決める。もとは
   盤の幅そのもの（幅÷千八十）であった。これでは盤を広げても渡り切る刻は変わらず、
   隊が速く滑るように見えるだけで、広さが「遠さ」として効かない。城攻めでは
   なお悪く、城のまわりに広い野を足すと、城の中まで足が倍になって曲輪を一瞬で
   駆け抜ける。

   盤を広げるときは、尺を広げる前の盤の幅で据えておく（尺を据える）。城の中も
   野の隊の足も今までと同じで、広げたぶんだけ道のりが長くなる。 */
let 尺の上書き = null;
export function 尺を据える(v) { 尺の上書き = v > 0 ? Math.max(1, v) : null; }
export const fieldScale = () => 尺の上書き || Math.max(1, FIELD.w / BASE.w);
/* 広げの倍。盤の幅が、尺の基の幅の何倍あるか（広げていなければ一）。
   日没までの刻は、これだけ道のりが延びるぶん延ばす。 */
export const 広げの倍 = () => Math.max(1, FIELD.w / (fieldScale() * BASE.w));

// 戦場の地形は街道ごとに決まる。両端の城の名から種を作り、毎回同じ野を再現する。
export const RIVER = { top: 0, bot: 0, bridge: [0, 0], ford: [0, 0], wave: 0, ph: 0, k: 1 };

// 川は蛇行する。判定も描画もこの一つの式から出す（見た目と当たりを食い違わせない）。
export function riverShift(x) {
  if (!RIVER.wave) return 0;
  return Math.sin(x * RIVER.k + RIVER.ph) * RIVER.wave;
}

export const FORESTS = [], WOODS = [], HILLS = [], MARSH = [];

/* 山（GDD 8.1）。

   盤には丘しか無かった。丘は「少し高いところ」であって、山ではない。
   南宮山のような四百mの山も、笹尾山の六十mの比高も、同じ「丘」として
   置くほかなかった。山越えの街道で戦っても、野に丘が二つ三つ立つだけである。

   山は丘とは別の地物とする。足は丘よりさらに鈍り（丘〇.七に対し〇.四二）、
   隊列は崩れ、騎馬はほとんど使えない。そのかわり登り切れば遠くまで見通せ、
   上から当たる強みは丘より大きい。道さがしは山を強く避ける――避けきれぬときは
   越えるが、それは軍勢にとって難儀な選択である。 */
export const MOUNTAINS = [];
/* 高み（GDD 8.1）。山と丘を、拠る所として一つに並べたもの。山が先に来る。

   采配の丘取りは HILLS しか見ていなかった。ところが genTerrain は、立てた山を
   HILLS から抜いて MOUNTAINS へ移している。つまり采配にとって山は存在せず、
   山に拠らせた隊は、その山を「自分の立っている高み」とすら思っていなかった
   ――測ると、山に据えた委任の隊が高みに居たのは刻の一割八分、裾から平均
   四百六十一歩、最も遠いときで千七百五十六歩も離れていた。
   山は丘の一段上の地物である（戦う力 一.二八 対 一.一五、見晴らし 四百七十
   対 三百六十）。拠る所として数えないのは筋が通らない。 */
export const 高み = [];
export function 高みを数え直す() {
  高み.length = 0;
  for (const m of MOUNTAINS) 高み.push(m);
  for (const h of HILLS) 高み.push(h);
}
/* 高みの格。山は丘より一段上なので、少しくらい遠くても山を選ばせる。 */
export const 高みの格 = (h) => (MOUNTAINS.includes(h) ? 1.42 : 1);

/* この野を結ぶ街道の質（街道・山道・難所）。山が立つか否かはこれで決まる。 */
export let 道の質 = "街道";
export function setFieldKind(kind) { 道の質 = kind || "街道"; }

/* 街道（GDD 8.1）。

   この野は「二つの城を結ぶ街道の途中」である。種も両端の城名から作っている。
   ところが盤には道が無く、川と橋だけがあった。人の通う土地に見えないし、
   軍勢が道を辿って進むという、いちばん当たり前の姿も描けない。

   道は野を縦に貫き、川があれば橋で渡る。踏み固められた土であるから足が僅かに
   速く、道さがしもここを好んで通る（route.js の 通りにくさ）。 */
export const ROAD = { 節: [], 幅: 0 };

/* 街道は一本とは限らない（GDD 8.1）。

   街道ごとに作る野は一本で足りる。ところが筋書き（関ヶ原のような決まった戦場）
   には、中山道・北国街道・伊勢街道が交わっている。道を束で持てるようにする。
   街道ごとの野では、この束に ROAD ひとつが入る。 */
export const ROADS = [];

/* 折れ線の川（GDD 8.1）。

   街道ごとの野の川は、盤を横切る一本の帯（RIVER）である。筋書きの野では
   川が曲がり、幾筋にも分かれ、渡し場が決まった所にある。帯では表せない。 */
export const RIVERS = [];

// 点から道までの隔たり（線分の集まりとして測る）
export const 道までの隔たり = (x, y) => 節までの隔たり(ROAD.節, x, y);

export const 道の上か = (x, y) => {
  for (const r of ROADS) if (r.幅 > 0 && 節までの隔たり(r.節, x, y) < r.幅 / 2) return true;
  return false;
};

/* 折れ線までの隔たり（道までの隔たり の中身をそのまま切り出したもの） */
export function 節までの隔たり(節, x, y) {
  if (!節 || 節.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < 節.length - 1; i++) {
    const a = 節[i], b = 節[i + 1];
    const vx = b.x - a.x, vy = b.y - a.y;
    const L = vx * vx + vy * vy;
    let t2 = L ? ((x - a.x) * vx + (y - a.y) * vy) / L : 0;
    t2 = t2 < 0 ? 0 : t2 > 1 ? 1 : t2;
    const dx = x - (a.x + vx * t2), dy = y - (a.y + vy * t2);
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/* 集落。野には人が住んでいる。

   長らく見た目だけのものであったが、地形として効かせることにした。
   垣と屋根と畦が入り組んでいるので足は鈍り、隊列も少し乱れる。
   そのかわり身を隠せる（見通しが平地の半ばに落ちる）。
   委任した隊は、林や森と同じく、好んでは入らない。 */
export const VILLAGES = [];

export let FIELD_SEED = 0;

/* 野を組み直した回数。道さがしの網（route.js）は、これが変わったら張り直す。
   盤の広さだけを見ていると、同じ広さで地形だけ変わったときに古い網が残る。 */
let 代 = 0;
export const 地形の代 = () => 代;

// 城の名から種を作る（同じ街道なら何度戦っても同じ野になる）
export function seedOf(aId, bId) {
  const key = [String(aId || ""), String(bId || "")].sort().join("|");
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// 街道の性格から野を組み立てる（GDD 8.1）
export function genTerrain(seed, opt = {}) {
  代++;
  const rnd = makeRng(seed);
  const W = FIELD.w, H = FIELD.h;
  /* 城攻めの広い盤（GDD 9.3）。城 … 城山の円 { x, y, r, 大手: { x, y } }。
     城山の内には地物を置かない。川は城の手前（南）を流し、橋は城山の脇に架け、
     街道は城山を避けて通し、大手の麓から街道へ枝道を付ける。城を渡さなければ、
     これまでと寸分違わぬ野を組む（賽の流れも変えない）。 */
  const 城 = opt.城 || null;
  /* 野戦の盤を広げたとき（layoutField 野の倍）の、広げる前の幅（尺の幅）。

     地物の大きさ・川幅・橋と浅瀬の幅は、これで決める。隊の足も見通しも指揮圏も
     広げる前の尺のまま据えてあるので、地物まで広げた幅で決めると、隊に比べて丘や
     川ばかりが大きくなる。実際に一.五倍に広げたところ、受け手が丘を取りに行く
     間合いに丘が入らず、麓から頂まで登り切る前に寄せ手が来て（tests/chikei）、
     行軍の翼が広くなった川に濡れた（tests/keiretsu）。
     数は広げた面積なりに増やし、地物の濃さを広げる前と同じに保つ。
     ただ野が広く、遠くなるだけで、隊と地物の釣り合いは変えない。
     城攻めの広い盤の野は、これを渡さない（これまでどおり盤の幅で決める）。 */
  const 尺W = opt.尺の幅 > 0 ? Math.min(W, opt.尺の幅) : W;
  const 尺H = 尺W * (H / W);
  const 面倍 = (W * H) / (尺W * 尺H);
  RIVER.top = 0; RIVER.bot = 0; RIVER.bridge = [0, 0]; RIVER.ford = [0, 0]; RIVER.wave = 0;
  RIVER.落ちた橋 = null; RIVER.仮橋 = false;
  FORESTS.length = 0; WOODS.length = 0; HILLS.length = 0; MARSH.length = 0; VILLAGES.length = 0;
  MOUNTAINS.length = 0;
  const kind = rnd();
  // 川。六割の野に一本流れる。橋と浅瀬の位置も野ごとに違う。
  if (kind > 0.4) {
    /* 川と、その渡り場（GDD 8.1）。

       橋も浅瀬も、盤の幅の何割、として取っていた。標準の野が千八十歩だった
       ころは橋が八十九歩で、一隊の幅（二百十六歩）の半ばに満たない――
       つまり隘路であった。ところが野を広げたので、七千歩の野では橋が
       五百四十歩、一隊の二.五倍になった。隊がそのまま横に並んで渡れる橋は、
       もはや橋ではない。ただの平地である。

       橋は隘路でなければならない。盤がどれだけ広がろうと、板を渡した幅は
       変わらない。ほぼ絶対の寸法で取り、野の広さぶんは僅かに効かせるに留める。
       川幅も同じ考えで、際限なく広がらぬよう歯止めを入れる。 */
    const 幅倍 = clamp(Math.pow(尺W / 1080, 0.3), 1, 1.7);
    let cy = H * (0.36 + rnd() * 0.28);
    const wide = clamp(尺H * (0.045 + rnd() * 0.035), 52, 190);
    RIVER.top = Math.round(cy - wide / 2); RIVER.bot = Math.round(cy + wide / 2);
    const bw = (74 + rnd() * 26) * 幅倍;               // 橋。一隊の半ばに満たない
    let bx = W * (0.15 + rnd() * 0.7);
    /* 城の盤では、橋を城山の脇へ寄せる（城山を貫く街道を作らない） */
    if (城 && Math.abs(bx - 城.x) < 城.r + 420) {
      const 東 = 城.x + 城.r + 420 + (bx - W * 0.15) / (W * 0.7) * W * 0.12;
      const 西 = 城.x - 城.r - 420 - (bx - W * 0.15) / (W * 0.7) * W * 0.12;
      bx = 東 < W * 0.9 && (W - 城.x > 城.x || 西 < W * 0.1) ? 東 : Math.max(W * 0.1, 西);
    }
    RIVER.bridge = [Math.round(bx - bw / 2), Math.round(bx + bw / 2)];
    let fx = W * (0.1 + rnd() * 0.8);
    if (Math.abs(fx - bx) < W * 0.2) fx = bx > W / 2 ? bx - W * 0.28 : bx + W * 0.28;
    const fw = (150 + rnd() * 60) * 幅倍;              // 浅瀬。橋より広いが、なお狭い
    RIVER.ford = [Math.round(clamp(fx - fw / 2, 10, W - fw - 10)), 0];
    RIVER.ford[1] = Math.round(RIVER.ford[0] + fw);
    RIVER.wave = 尺H * (0.02 + rnd() * 0.05);        // 蛇行の振れ（隊の尺で。上の 尺の幅）
    RIVER.k = (1.4 + rnd() * 1.6) * Math.PI / 尺W;   // 蛇行の細かさ（広げた野では曲がりの数が増える）
    RIVER.ph = rnd() * Math.PI * 2;
    /* 城の盤では、川は城山の裾より南を流す。寄せ手は川を越えて城へ寄せる。
       南に寄せ手の構えるだけの野が残らなければ、川は流さない */
    if (城) {
      RIVER.wave = Math.min(RIVER.wave, H * 0.035);
      const 上 = 城.y + 城.r + wide / 2 + RIVER.wave + 260, 下 = H - wide / 2 - RIVER.wave - 1500;
      if (上 > 下) { RIVER.top = 0; RIVER.bot = 0; RIVER.wave = 0; }
      else {
        cy = 上 + (下 - 上) * clamp((cy / H - 0.36) / 0.28, 0, 1) * 0.6;
        RIVER.top = Math.round(cy - wide / 2); RIVER.bot = Math.round(cy + wide / 2);
      }
    }
  }
  // 丘・森・林・湿地。数も場所も野ごとに違う。
  /* 置き直しの数（試み）は、既にある野を変えぬよう二十四のままとする。
     ここを増やすと賽の流れがずれ、街道の通る筋まで変わってしまう
     （それに気づかず、味方をすり抜けぬ試験が 24→107 に崩れた）。
     山だけは裾が広くて置き場を探しにくいので、山のときだけ多く試す。 */
  const put = (list, n, rMin, rMax, 丸ごと外へ, 試み = 24) => {
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, ok = false;
      const r0 = rMin + rnd() * (rMax - rMin);
      const mx = r0 + 24, my = r0 + 24;               // 盤からはみ出さない
      if (mx * 2 > W - 40 || my * 2 > H - 40) continue;
      for (let k = 0; k < 試み && !ok; k++) {
        x = mx + rnd() * (W - mx * 2); y = my + rnd() * (H - my * 2);
        /* 川の上と、他の地形の上には置かない。

           川を避けるのに、中どころだけを見ていた。丘や森ならそれでよい――
           裾が岸に届くくらいは、むしろ野の姿である。ところが裾の広い山は、
           中どころが川から離れていても裾が川を跨ぐ。絵の上では川が山を貫いて
           流れ、地形としても山の中に淵があるという有様になった。
           山だけは、丸ごと川の外にあることを求める。
           丘と村は、置き終えてから裾が岸に届くところまで退ける（丘と村を川から
           退ける）。ここで求めると試みの数が変わり、賽の流れがずれるからである。 */
        const 際 = 丸ごと外へ ? r0 + 24 : 40;
        if (城 && Math.hypot(x - 城.x, y - 城.y) < 城.r + r0 + 90) continue;
        if (RIVER.bot > RIVER.top
          && y + 際 > RIVER.top - (丸ごと外へ ? RIVER.wave : 0)
          && y - 際 < RIVER.bot + (丸ごと外へ ? RIVER.wave : 0)) continue;
        ok = ![...FORESTS, ...WOODS, ...HILLS, ...MOUNTAINS, ...MARSH].some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r0 + 30);
      }
      if (ok) list.push({ x: Math.round(x), y: Math.round(y), r: Math.round(r0), seed: Math.floor(rnd() * 1e9) });
    }
  };
  /* 地物の大きさと数（GDD 8.1）。

     野の広さに合わせる。かつては一.六倍で頭打ちにしていた。標準の野が
     千八十歩だったころはそれでよかったが、隊数で野を広げたので、
     七千歩の野に百三十歩の丘が点在するという有様になった。
     遠目には見えず、隊の脇をすり抜けてしまう。

     頭打ちを外し、野の広さにそのまま比例させる。数も増やす。
     広い野に地物が二つ三つでは、ただ広いだけの原っぱである。
     回り込む目印になり、伏せる場所になり、拠って戦う高みになってこそ、
     広さが効いてくる。 */
  const sc = clamp(尺W / 1080, 1, 4.6);               // 広げた野戦では広げる前の幅で（上の 尺の幅）
  /* 広い野には、必ずいくらか地物を置く。
     倍を掛けるだけでは、賽が零を出した野は七千歩の原っぱになる。
     見渡す限り何も無い野では、回り込む目印も、伏せる場所もない。 */
  /* 下限も面積なりに増やす。賽の目が零の野は下限だけ置かれるので、ここを増やさないと
     広げた野では丘や森が薄くなり、受け手の手の届く所に丘が無くなる（tests/chikei） */
  const 底 = Math.round((sc >= 2.4 ? 2 : sc >= 1.6 ? 1 : 0) * 面倍);
  const 数 = (基, 要) => Math.max(要 ? 底 : 0, Math.round(基 * (0.6 + sc * 0.62) * 面倍));
  /* 山を立てる（GDD 8.1）。

     山越えの街道でのみ立つ。山道なら一つ、難所なら二つ。
     丘より一回り大きいので、ほかの地物より先に場所を取る――後から入れると
     置き場が残っていない。野の四分の一を塞ぐほどには大きくしない。
     塞いでしまえば戦場ではなく廊下になる。 */
  {
    /* 山の数（GDD 8.1）。

       もとは山越えの街道でしか立たなかった。街道の表は陸の四百四十九区間の
       うち山道が八十二、難所が三十九――つまり野の二割七分にしか山が無い。
       この国は山の国である。平らな街道の傍らに山が見えぬほうがめずらしい。

       街道にも賽で一つ立てる（四割二分）。山道は二つ、難所は三つに増やし、
       広い野ではさらに一つ足す。これで野のおよそ六割に山が立つ。 */
    /* 山を立てるか否かの賽は、種から直に引く（流れを消費しない）。

       はじめは rnd() を一つ引いていた。ところがこれは地物の賽の流れを一つ
       ずらすので、山の立たぬ野まで――川も丘も森も――ことごとく並びが変わった。
       既に組んである野が総入れ替えになり、決め打ちの場所に隊を立てる試験は
       淵の中から出陣する羽目になる（tests/butsukari）。山を立てぬと決めたなら、
       その野はこれまでと寸分違わぬ野でなければならない。 */
    const 山の賽 = ((seed >>> 9) & 1023) / 1024;
    const 数山 = (道の質 === "難所" ? 3 : 道の質 === "山道" ? 2 : (山の賽 < 0.42 ? 1 : 0))
      + (sc >= 2.6 && 道の質 !== "海路" && 山の賽 < 0.62 ? 1 : 0);
    const 前 = HILLS.length;
    /* 山の裾は野の高さに縛る。野の半ばを埋める山は、戦場ではなく壁である。 */
    const 裾小 = clamp(120 * sc, 130, H * 0.145), 裾大 = clamp(175 * sc, 190, H * 0.205);
    /* 置き場が見つからねば、少しずつ小さくして試し直す。山は裾が広いので、
       川と他の地物を避けきれずに一つも立たぬ野があった。 */
    if (数山) {
      for (let 試 = 0; 試 < 4 && HILLS.length - 前 < 数山; 試++) {
        const 縮 = Math.pow(0.78, 試);
        put(HILLS, 数山 - (HILLS.length - 前), Math.max(90, 裾小 * 縮),
          Math.max(裾小 * 縮 + 10, 裾大 * 縮), true, 70);
      }
    }
    for (const m of HILLS.splice(前)) {
      m.高 = Math.round(180 + (m.seed % 100) * 2.4);   // 比高の目安（m）。絵の起伏に使う
      m.rise = Math.round(m.r * 0.34);
      MOUNTAINS.push(m);
    }
  }
  put(HILLS, 数(Math.floor(rnd() * 3), true), 80 * sc, 130 * sc);
  put(FORESTS, 数(Math.floor(rnd() * 4), true), 70 * sc, 115 * sc);
  put(WOODS, 数(Math.floor(rnd() * 3) + 1), 50 * sc, 85 * sc);
  put(MARSH, 数(rnd() > 0.6 ? 1 : 0), 65 * sc, 100 * sc);
  put(VILLAGES, 数(Math.floor(rnd() * 3)), 34 * sc, 58 * sc);
  丘と村を川から退ける();

  /* 丘の高さ。裾の広い丘ほど高く盛り上がる。
     地形としてはどれも「丘」であって、効きは変わらない。見た目の起伏だけである。 */
  for (const h of HILLS) h.rise = Math.round(h.r * (0.20 + (h.seed % 100) / 100 * 0.14));
  高みを数え直す();

  /* 街道を通す（GDD 8.1）。

     野を南北に貫く。川があれば橋で渡る――橋は元よりその街道のためにある。
     道幅は隊の幅より狭い。軍勢は道に沿って伸び、はみ出して野を行く。

     曲がりは二つ三つで足りる。真っすぐな道は人の手のものに見えず、曲がりすぎる
     道は野を分断する。丘があれば裾を巻き、森があれば縁を掠める。 */
  ROAD.節.length = 0;
  ROADS.length = 0; ROADS.push(ROAD);
  RIVERS.length = 0;
  ROAD.幅 = Math.round(clamp(36 * Math.sqrt(sc), 34, 86));
  if (RIVER.bot > RIVER.top) {
    // 道は橋より狭くなければならない。道幅のまま橋へ入れば、両端は水である。
    ROAD.幅 = Math.min(ROAD.幅, Math.max(24, (RIVER.bridge[1] - RIVER.bridge[0]) - 10));
  }
  {
    let 渡り = RIVER.bot > RIVER.top
      ? (RIVER.bridge[0] + RIVER.bridge[1]) / 2
      : W * (0.3 + rnd() * 0.4);
    let 南 = clamp(渡り + (rnd() - 0.5) * W * 0.3, W * 0.12, W * 0.88);
    let 北 = clamp(渡り + (rnd() - 0.5) * W * 0.3, W * 0.12, W * 0.88);
    /* 城の盤では、街道は城山の脇を通す。渡り（川の無い野では道の芯）と北の端を
       城山と同じ側の外へ出す */
    if (城) {
      const 側 = 渡り >= 城.x ? 1 : -1;
      const 外 = (x) => (側 > 0 ? Math.max(x, 城.x + 城.r + 480) : Math.min(x, 城.x - 城.r - 480));
      if (!(RIVER.bot > RIVER.top)) 渡り = clamp(外(渡り), W * 0.08, W * 0.92);
      北 = clamp(外(北), W * 0.06, W * 0.94);
      南 = clamp(南, W * 0.1, W * 0.9);
    }
    const 川中 = RIVER.bot > RIVER.top ? (RIVER.top + RIVER.bot) / 2 : H * 0.5;
    /* 曲がりは、川へ近づくほど小さくする。橋の袂で道が揺れていては、道を辿った
       軍勢が橋から外れて淵へ踏み込む。渡り場へは真っすぐ入るのが道というものである。 */
    const 曲 = (y0, y1, x0, x1, n) => {
      const 出 = [];
      for (let i = 1; i < n; i++) {
        const u = i / n;
        const 川寄り = 1 - u;                      // 一に近いほど川から遠い
        const 揺 = (rnd() - 0.5) * W * 0.06 * 川寄り * 川寄り;
        出.push({ x: clamp(x0 + (x1 - x0) * u + 揺, 20, W - 20), y: y0 + (y1 - y0) * u });
      }
      return 出;
    };
    /* 渡り場の手前後は、道を真っすぐ立てる。橋に対して斜めに入る道は無い。 */
    const 川幅 = RIVER.bot > RIVER.top ? (RIVER.bot - RIVER.top) : 60;
    ROAD.節.push({ x: 南, y: H + 30 });
    ROAD.節.push(...曲(H + 30, 川中 + 川幅 * 1.6, 南, 渡り, 3));
    ROAD.節.push({ x: 渡り, y: 川中 + 川幅 * 1.6 });
    ROAD.節.push({ x: 渡り, y: 川中 - 川幅 * 1.6 });
    ROAD.節.push(...曲(川中 - 川幅 * 1.6, -30, 渡り, 北, 3));
    ROAD.節.push({ x: 北, y: -30 });
  }
  /* 大手道。大手の麓から南へ下り、街道へ合わさる。寄せ手が上ってくる道である */
  if (城 && 城.大手) {
    const 麓 = { x: 城.大手.x, y: 城.大手.y };
    const 合y = Math.min(H - 200, 城.y + 城.r + 180);
    const 合x = 道のx(ROAD.節, 合y);
    if (合x != null) {
      const 節 = [麓, { x: 麓.x + (合x - 麓.x) * 0.12, y: 麓.y + (合y - 麓.y) * 0.55 },
        { x: 麓.x + (合x - 麓.x) * 0.55, y: 合y - 40 }, { x: 合x, y: 合y }];
      ROADS.push({ 名: "大手道", 節, 幅: Math.round(ROAD.幅 * 0.85) });
    }
  }
}
/* 折れ線の道が、縦 y を横切る所の横（無ければ null） */
function 道のx(節, y) {
  for (let i = 0; i + 1 < 節.length; i++) {
    const a = 節[i], b = 節[i + 1];
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y);
  }
  return null;
}

/* 川べりの丘と村（GDD 8.1・8.11）。

   丘を置くとき、川を避けるのに中どころが川の帯から四十歩離れていることしか見て
   いなかった。丘の半径は八十歩から六百歩に及び、川は蛇行して帯の外へも振れるので、
   川が丘の中腹を、ときには頂のそばを横切った。測ると、川のある野の丘の三割五分が
   川に掛かり、一割三分は頂の近くまで水が来て、三分は頂そのものが水の中にあった。
   遊ぶ側の申し出は「山と川の分け目が変」であった。斜めから見ると、川が丘の稜線の
   上を流れ、水際が丘の陰影と食い違う。水は低い所を流れるもので、丘の上に川は無い。
   盤の理のうえでも、丘の頂を取りに行った隊が淵へ踏み込むことになる。
   村も同じで、一割余りが川に掛かり、三分は村の中ほどが水の中にあった。家と垣が
   川の上に並ぶか、水の上を除けば両岸に切れ端だけが残る。

   丘と村は川から離れる向き（川は東西に流れるので、ある側の南か北）へ、裾が岸に
   届くところまで退ける――裾が岸に届くくらいは野の姿である（上の put の断り）。
   はじめは丘の裾の三割まで水に浸かってよいとしたが、その裾を水位まで下ろすと丘の
   川側の斜面が切り立ち、高い丘ほど斜めの眺めで川べりに稜線の黒い筋が残った。
   退けた先が盤の外や他の地物に掛かるなら、少しずつ（半ばまで）小さくして試し、
   それでも収まらねば川の向こう岸で探す（もとから重なっていた地物は咎めない。村は
   置くとき互いを避けていない）。どうしても収まらぬもの（丘で二千に一つほど）は、
   試した中でいちばん川から離れる所に置く。賽は引かないので、川・森・林・沼・山・道は
   これまでと寸分違わない。
   丘を退けると、その近くで戦の筋が変わる。互角の戦を三十二の種で測る試験
   （tests/kahei「互角なら五分に近い」）は、受け手の勝ちが四割一分から二割五分へ
   振れて三割を割った。戦の賽の流れを替えて九十六の野で三度測り直すと、直す前と
   後とで三割八分と三割八分、四割一分と四割五分、三割九分と三割八分。勝ち負けの
   入れ替わりも両向きに同じほど（二十八と三十一）で、丘の置き所が受け手を弱めた
   のではない。三十二の種の勝ち負けが振り直されたのである（直す前の野でも、流れに
   よっては二割五分に落ちる）。 */
function 川から退ける(list) {
  const H = FIELD.h;
  const 芯 = (x) => (RIVER.top + RIVER.bot) / 2 + riverShift(x);
  for (const h of list) {
    const 際0 = 水際まで(h.x, h.y, h.r);
    if (際0 >= h.r) continue;
    const 向 = h.y >= 芯(h.x) ? 1 : -1;
    const 他 = [...FORESTS, ...WOODS, ...HILLS, ...MOUNTAINS, ...MARSH, ...VILLAGES]
      .filter((o) => o !== h && Math.hypot(o.x - h.x, o.y - h.y) >= o.r + h.r + 30);
    const 掛かる = (y, r) => 他.some((o) => Math.hypot(o.x - h.x, o.y - y) < o.r + r + 30);
    let 先 = null, 次善 = { 比: 際0 / h.r };
    for (const 向き of [向, -向]) {
      for (let 縮 = 1; 縮 > 0.49 && !先; 縮 -= 0.05) {
        const r = Math.round(h.r * 縮);
        for (let δ = 0; ; δ += 6) {
          const y = h.y + 向き * δ;
          if (y < r + 24 || y > H - r - 24) break;           // 盤からはみ出す
          const 際 = 水際まで(h.x, y, r);
          if (際 < r) {
            if (際 / r > 次善.比 && !掛かる(y, r)) 次善 = { y: Math.round(y), r, 比: 際 / r };
            continue;
          }
          if (!掛かる(y, r)) 先 = { y: Math.round(y), r };
          else if (向き !== 向) continue;                     // 向こう岸では、空いた所まで進む
          break;
        }
      }
      if (先) break;
    }
    if (!先 && 次善.y != null) 先 = 次善;
    if (先) { h.y = 先.y; h.r = 先.r; }
  }
}
function 丘と村を川から退ける() {
  if (!hasRiver()) return;
  川から退ける(HILLS);
  川から退ける(VILLAGES);
}

/* ========================================================================== 
   筋書きの野（GDD 8.1）

   関ヶ原のような「決まった戦場」は、街道ごとに賽で組む野とは作りが違う。
   山も川も道も、実際の土地から写し取った形で置く。

   ところが terrainAt は、呼ばれるたびに地物を一つずつ当たっている。円が
   四十、川の折れ線が六十節ともなれば、一度の問い合わせに百五十からの
   勘定が要る。組は三千を超え、刻ごとに七度ずつ問うのだから、これでは
   一こま七十ミリ秒――戦が動かない。

   そこで、筋書きの野だけは地形を升目に焼いておく。十歩四方の升に地物の名を
   一つ入れ、問い合わせは升を引くだけにする。焼くのは戦の初めに一度きりで、
   地物の側から升を塗るので、野の広さなりの手間で済む。
   ========================================================================== */
const 格種 = ["plain", "road", "forest", "wood", "marsh", "mountain", "hill", "village", "deep", "ford", "bridge"];
export let 地形格 = null;

function 野を焼く(ce = 10) {
  const gw = Math.ceil(FIELD.w / ce), gh = Math.ceil(FIELD.h / ce);
  const d = new Uint8Array(gw * gh);
  const 丸 = (o, v) => {
    const x0 = Math.max(0, Math.floor((o.x - o.r) / ce)), x1 = Math.min(gw - 1, Math.ceil((o.x + o.r) / ce));
    const y0 = Math.max(0, Math.floor((o.y - o.r) / ce)), y1 = Math.min(gh - 1, Math.ceil((o.y + o.r) / ce));
    const rr = o.r * o.r;
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const cx = i * ce + ce / 2, cy = j * ce + ce / 2;
      if ((cx - o.x) ** 2 + (cy - o.y) ** 2 <= rr) d[j * gw + i] = v;
    }
  };
  const 帯 = (節, 幅, v) => {
    const h2 = 幅 / 2;
    for (let k = 0; k + 1 < 節.length; k++) {
      const a = 節[k], b = 節[k + 1];
      const x0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - h2) / ce)), x1 = Math.min(gw - 1, Math.ceil((Math.max(a.x, b.x) + h2) / ce));
      const y0 = Math.max(0, Math.floor((Math.min(a.y, b.y) - h2) / ce)), y1 = Math.min(gh - 1, Math.ceil((Math.max(a.y, b.y) + h2) / ce));
      const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy;
      for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
        const cx = i * ce + ce / 2, cy = j * ce + ce / 2;
        let t2 = L ? ((cx - a.x) * vx + (cy - a.y) * vy) / L : 0;
        t2 = t2 < 0 ? 0 : t2 > 1 ? 1 : t2;
        if ((cx - (a.x + vx * t2)) ** 2 + (cy - (a.y + vy * t2)) ** 2 <= h2 * h2) d[j * gw + i] = v;
      }
    }
  };
  /* 塗る順は「弱い地物から」。後から塗ったものが上に来る。
     山は森より上に置く――木の生えた山は、やはり山である。
     川はすべての上を流れ、渡し場（橋・浅瀬）はその川の上に架かる。 */
  for (const o of VILLAGES) 丸(o, 7);
  for (const o of HILLS) 丸(o, 6);
  for (const o of MARSH) 丸(o, 4);
  for (const o of WOODS) 丸(o, 3);
  for (const o of FORESTS) 丸(o, 2);
  for (const o of MOUNTAINS) 丸(o, 5);
  for (const r of ROADS) 帯(r.節, r.幅, 1);
  for (const r of RIVERS) 帯(r.節, r.幅, 8);
  for (const r of RIVERS) for (const w of r.渡し || []) 丸(w, w.種 === "橋" ? 10 : 9);
  return { ce, w: gw, h: gh, d };
}

/* 筋書きから野を組む。地物はすべて写し取った形で渡される。 */
export function 筋書きの野を組む(地) {
  代++;
  FIELD.w = 地.w; FIELD.h = 地.h;
  尺を据える(0);                                    // 筋書きの野は、盤の幅をそのまま尺とする
  setFieldKind("街道");
  RIVER.top = 0; RIVER.bot = 0; RIVER.bridge = [0, 0]; RIVER.ford = [0, 0]; RIVER.wave = 0;
  RIVER.落ちた橋 = null; RIVER.仮橋 = false;
  FORESTS.length = 0; WOODS.length = 0; HILLS.length = 0; MARSH.length = 0;
  VILLAGES.length = 0; MOUNTAINS.length = 0; RIVERS.length = 0; ROADS.length = 0;
  const 種付 = (o, i) => ({ seed: ((o.x | 0) * 7919 + (o.y | 0) * 31 + i) >>> 0, ...o });
  (地.村 || []).forEach((o, i) => VILLAGES.push(種付(o, i)));
  (地.丘 || []).forEach((o, i) => HILLS.push({ ...種付(o, i), rise: o.rise || Math.round(o.r * 0.24) }));
  (地.沼 || []).forEach((o, i) => MARSH.push(種付(o, i)));
  /* 撮る道具が置く沼（湿地の見え方を撮るため。頁の外からしか立たない印） */
  if (typeof window !== "undefined" && Array.isArray(window.__撮影の沼)) window.__撮影の沼.forEach((o, i) => MARSH.push(種付(o, 90 + i)));
  (地.林 || []).forEach((o, i) => WOODS.push(種付(o, i)));
  (地.森 || []).forEach((o, i) => FORESTS.push(種付(o, i)));
  (地.山 || []).forEach((o, i) => MOUNTAINS.push({ ...種付(o, i), rise: o.rise || Math.round(o.r * 0.34) }));
  (地.道 || []).forEach((r) => ROADS.push({ 名: r.名, 節: r.節, 幅: r.幅 || 60 }));
  (地.川 || []).forEach((r) => RIVERS.push({ 名: r.名, 節: r.節, 幅: r.幅 || 40, 渡し: r.渡し || [] }));
  高みを数え直す();
  ROAD.節.length = 0; ROAD.幅 = 0;
  地形格 = 野を焼く(地.升 || 10);
}

/* 筋書きを畳む。街道ごとの野に戻す（升目を捨てる）。 */
export function 筋書きを解く() { 地形格 = null; RIVERS.length = 0; }

/* 地の高さ（GDD 8.1）。丘の頂を一、山の頂を二とし、裾から頂へ向けて上がる。

   高みの利は、これまで TERRAIN.fight（丘 一.一五、山 一.二八）だけで表していた。
   ところがこれは「その地べたに立っていれば付く」ものなので、山へ攻め登る隊にも
   同じだけ付いていた。頂の隊と、斜面を這い上がる隊が、同じ一.二八で殴り合う
   ――それでは高みに拠る意味がない。

   高みの利は「相手より高いか」で決まる。同じ丘の頂で睨み合う二隊のあいだに
   高低は無く、麓から見上げる隊には一段ぶんの不利がある。 */
export function 地の高さ(x, y) {
  let 高 = 0;
  for (const m of MOUNTAINS) {
    const d = Math.hypot(x - m.x, y - m.y);
    if (d < m.r) { const v = 2 * (1 - d / m.r); if (v > 高) 高 = v; }
  }
  for (const h of HILLS) {
    const d = Math.hypot(x - h.x, y - h.y);
    if (d < h.r) { const v = 1 - d / h.r; if (v > 高) 高 = v; }
  }
  return 高;
}

export const hasRiver = () => RIVER.bot > RIVER.top + 4;

/* 城攻めの盤の橋（GDD 9.3）。

   城方は、城の前の川に架かる橋を落としておける（囲みの札の「橋を落とす」）。落ちた橋の
   幅は淵になり、寄せ手は浅瀬へ回るか淵を押し渡るほかない。道さがし（route.js）は地形の
   代で網を張り直すので、橋が無くなれば自ずと浅瀬を選ぶ。
   寄せ手は夜のうちに仮橋を架け直す（engine.js 夜を明かす）。仮橋は元の橋の八割の幅 */
export function 橋を落とす() {
  if (!hasRiver() || RIVER.落ちた橋 || !(RIVER.bridge[1] > RIVER.bridge[0])) return false;
  RIVER.落ちた橋 = RIVER.bridge.slice();
  RIVER.bridge = [0, 0]; RIVER.仮橋 = false;
  代++;
  return true;
}
export function 仮橋を架ける() {
  if (!RIVER.落ちた橋) return false;
  const [a, z] = RIVER.落ちた橋, c = (a + z) / 2, w = (z - a) * 0.8;
  RIVER.bridge = [Math.round(c - w / 2), Math.round(c + w / 2)];
  RIVER.落ちた橋 = null; RIVER.仮橋 = true;
  代++;
  return true;
}

/* 筋書きの川の升。筋書きの川は何百節もある。木を一本ずつ量るたびに全ての節を当たると
   重いので、百六十歩の升に「水際から八十歩の内に届く区間」を控えておく（水際まで） */
let 川の升 = null;
function 川の升を据える() {
  if (川の升 && 川の升.代 === 代 && 川の升.数 === RIVERS.length) return 川の升;
  const G = 160, 余 = 80, 升 = new Map();
  for (const r of RIVERS) {
    const 半 = (r.幅 || 40) / 2;
    for (let i = 0; i + 1 < r.節.length; i++) {
      const a = r.節[i], b = r.節[i + 1], 区 = { a, b, 半 };
      const i0 = Math.floor((Math.min(a.x, b.x) - 半 - 余) / G), i1 = Math.floor((Math.max(a.x, b.x) + 半 + 余) / G);
      const j0 = Math.floor((Math.min(a.y, b.y) - 半 - 余) / G), j1 = Math.floor((Math.max(a.y, b.y) + 半 + 余) / G);
      for (let i2 = i0; i2 <= i1; i2++) for (let j2 = j0; j2 <= j1; j2++) {
        const 鍵 = i2 * 100003 + j2;
        if (!升.has(鍵)) 升.set(鍵, []);
        升.get(鍵).push(区);
      }
    }
  }
  川の升 = { 代, 数: RIVERS.length, G, 余, 升 };
  return 川の升;
}
/* 水際までの隔たり（歩）。盤の所（x, y）から、いちばん近い川の水際まで。水の中は負。
   生まれた野の川は蛇行する帯（riverShift）、筋書きの野の川は折れ線（RIVERS）である。
   丘と村を川から退けるとき（genTerrain）と、木・家・葦を水際から離して立てるとき
   （mori.js・sato.js・draw.js）に使う。上限 を渡せば、それより遠い所は細かく量らず、
   上限を超える値をそのまま返す（何千本もの木を一本ずつ量るので軽くする）。 */
export function 水際まで(x, y, 上限 = Infinity) {
  if (RIVERS.length) {
    let 最 = Infinity;
    const M = 川の升を据える();
    if (上限 <= M.余) {
      const 区ら = M.升.get(Math.floor(x / M.G) * 100003 + Math.floor(y / M.G));
      if (!区ら) return M.余 + 1;                    // 八十歩の内に水は無い
      for (const { a, b, 半 } of 区ら) {
        const e = 節までの隔たり([a, b], x, y) - 半;
        if (e < 最) 最 = e;
      }
      return Math.min(最, M.余 + 1);
    }
    for (const r of RIVERS) {
      const e = 節までの隔たり(r.節, x, y) - (r.幅 || 40) / 2;
      if (e < 最) 最 = e;
    }
    return 最;
  }
  if (!hasRiver()) return Infinity;
  const 半幅 = (RIVER.bot - RIVER.top) / 2, 芯 = (RIVER.top + RIVER.bot) / 2;
  const 縦 = Math.abs(y - 芯 - riverShift(x));
  /* 川筋の傾きは 振れ×細かさ を超えない。真上（南北）の隔たりを、その傾きの分だけ
     割り引いたものより近くに水は無い。近い所は、南北の隔たりの内で東西を刻んで探す */
  const 傾 = RIVER.wave * RIVER.k;
  const 下 = 縦 / Math.sqrt(1 + 傾 * 傾) - 半幅;
  if (下 > 上限) return 下;
  let 近 = 縦;
  const 刻 = Math.max(2, Math.min(8, 縦 / 24));
  for (let xx = x - 縦; xx <= x + 縦; xx += 刻) {
    const d = Math.hypot(xx - x, y - 芯 - riverShift(xx));
    if (d < 近) 近 = d;
  }
  return 近 - 半幅;
}

export const hasHill = () => HILLS.length > 0;

export const hasMountain = () => MOUNTAINS.length > 0;

/* 山が見通しを遮るか（GDD 8.6）。

   丘や林は「そこに立つと遠くが見える／見えない」という地形であった。
   山は、そこに立たなくとも、向こう側を隠す。山の陰に回った隊は、
   麓の敵から見えない――これが伏せるということである。

   ただし、どちらかが山の上にいるなら遮られない。上から見下ろしているのに
   「山があるから見えない」では話が逆である。 */
export function 山が遮るか(x1, y1, x2, y2) {
  if (!MOUNTAINS.length) return false;
  /* どちらかが山に立っているなら、何も遮らない。
     山は幾つかの円を重ねて一つの尾根を作ることがあるので、「この円の中か」では
     なく「山の地に立っているか」で見る（南宮山の一峰に立つと、同じ南宮山の
     別の峰が視界を塞ぐ、という妙なことになっていた）。 */
  if (terrainAt(x1, y1) === "mountain" || terrainAt(x2, y2) === "mountain") return false;
  for (const m of MOUNTAINS) {
    const r = m.r * 0.82;                       // 頂の近くだけが本当に遮る
    const vx = x2 - x1, vy = y2 - y1, L = vx * vx + vy * vy;
    if (L <= 0) continue;
    let t = ((m.x - x1) * vx + (m.y - y1) * vy) / L;
    if (t <= 0 || t >= 1) continue;             // 線分の外に山がある
    const dx = m.x - (x1 + vx * t), dy = m.y - (y1 + vy * t);
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

export const hasForest = () => FORESTS.length > 0;

export const nearestOf = (list, x, y) => (list.length
  ? list.reduce((a, o) => (Math.hypot(o.x - x, o.y - y) < Math.hypot(a.x - x, a.y - y) ? o : a), list[0])
  : null);

export function layoutField(totalMen, 隊数) {
  /* 野の広さ（GDD 8.1）。

     兵数だけで決めていたが、それでは狭すぎた。五隊も出せば戦場が一杯になり、
     横に並べて前へ出るのが精一杯で、回り込むことも取っておくこともできない。

     戦の面白さは、兵の数ではなく隊の数で決まる。隊が多いほど、翼を伸ばし、
     伏せ、迂回する余地が要る。隊数でも広げる。

     三千人・二隊を標準とし、
       兵数の平方根に比例して広げ（大軍ほど広い野が要る）、
       隊数の平方根にも比例して広げる（五隊なら一.六倍、八隊なら二倍）。 */
  /* 大軍の野は、もっと広く要る（GDD 8.1）。

     隊の数を二十四で頭打ちにし、幅も七千二百歩で止めていた。号令や援軍で
     三十隊を超える戦になると、盤が足りずに隊が端へ押しつけられ、はみ出して
     見えた。頭打ちを三十二隊・八千六百歩まで伸ばす（関ヶ原の八千百五十六歩と
     同じ桁である）。 */
  const 隊 = clamp(隊数 || 2, 2, 32);
  const 隊広 = Math.sqrt(隊 / 2);
  const w0 = clamp(Math.round(1180 * Math.sqrt(Math.max(600, totalMen) / 3000) * 隊広), 1100, 8600);
  /* 野戦の盤を広げる（GDD 8.1）。

     遊ぶ側の申し出は「野戦のマップももっと広げてもいいと思っています」であった。
     上の決め方の一.五倍に広げ、頭打ちを一万二千歩（城攻めの広い盤と同じ）にする。
     足の尺は広げる前の幅のまま据える（尺を据える）。隊の足も見通しも指揮圏も
     今までと変わらず、ただ野が広く、遠くなる。回り込み・伏せ・遅れて着く援軍に、
     そのぶんの間合いが生まれる。 */
  const w = Math.min(野の頭, Math.round(w0 * 野の倍));
  const h = Math.round(w * 0.667);
  FIELD.w = w; FIELD.h = h;
  尺を据える(w0 / BASE.w);
  genTerrain(FIELD_SEED, { 尺の幅: w0 });
}
/* 野戦の盤の広げ。倍と頭打ち（歩） */
export const 野の倍 = 1.5, 野の頭 = 12000;

export function setFieldSeed(aId, bId) { FIELD_SEED = seedOf(aId, bId); }
layoutField(3000);


export const BLOCKED = { wall: 1, gate: 1 };

export function passable(x, y) { return !BLOCKED[terrainAt(x, y)]; }

// 城方は自分の城の門を通れる。ただし内へ入るときだけ（外へ出るのは「打って出る」）。
export function passableFor(c, b, x, y) {
  /* 出城の背の木戸（castleMap.js 出城の地）。城方だけが通れる。出城のまわりでだけ地を引く */
  if (MAP && MAP.出城 && b && b.map) {
    const 出 = MAP.出城, lx = x - MAP.cx - 出.ox, ly = y - MAP.cy - 出.oy;
    if (Math.abs(lx) <= 出.hw + MAP.t + 2 && Math.abs(ly) <= 出.hh + MAP.t + 2 && terrainAt(x, y) === "kido") {
      return !c || c.side !== b.attacker;
    }
  }
  if (passable(x, y)) return true;
  if (!b || !b.map || !c || c.side === b.attacker) return false;
  if (c.sortie) return true;                      // 打って出ている間は外へも抜けられる
  if (terrainAt(x, y) !== "gate") return false;
  const m = b.map;
  return Math.hypot(x - m.cx, y - m.cy) < Math.hypot(c.x - m.cx, c.y - m.cy);
}


export function terrainAt(x, y) {
  /* 城の盤。広い盤では城山の外を野の地で判ずる（castleTerrainAt が null を返す） */
  if (MAP) { const t = castleTerrainAt(x, y); if (t) return t; }
  if (地形格) {                                   // 筋書きの野は升目を引くだけ
    const g = 地形格;
    const i = x < 0 ? 0 : x >= FIELD.w ? g.w - 1 : (x / g.ce) | 0;
    const j = y < 0 ? 0 : y >= FIELD.h ? g.h - 1 : (y / g.ce) | 0;
    return 格種[g.d[j * g.w + i]];
  }
  if (hasRiver()) {
    const sh = riverShift(x);
    if (y > RIVER.top + sh && y < RIVER.bot + sh) {
      if (x > RIVER.bridge[0] && x < RIVER.bridge[1]) return "bridge";
      if (x > RIVER.ford[0] && x < RIVER.ford[1]) return "ford";
      return "deep";
    }
  }
  if (道の上か(x, y)) return "road";                     // 街道は切り開かれている
  for (const f of FORESTS) if ((x - f.x) ** 2 + (y - f.y) ** 2 < f.r ** 2) return "forest";
  for (const f of WOODS) if ((x - f.x) ** 2 + (y - f.y) ** 2 < f.r ** 2) return "wood";
  for (const m of MARSH) if ((x - m.x) ** 2 + (y - m.y) ** 2 < m.r ** 2) return "marsh";
  for (const m of MOUNTAINS) if ((x - m.x) ** 2 + (y - m.y) ** 2 < m.r ** 2) return "mountain";
  for (const h of HILLS) if ((x - h.x) ** 2 + (y - h.y) ** 2 < h.r ** 2) return "hill";
  for (const v of VILLAGES) if ((x - v.x) ** 2 + (y - v.y) ** 2 < v.r ** 2) return "village";
  return "plain";
}

/* ------------------------------------------- 地物に踏み込んだか（GDD 8.6）

   これまでは一点で判じていた。組の代表点が川の帯に一歩でも掛かれば、その組は
   「川の中」となり、足が三割に落ち、陣形が十四削られる。組は五十人の塊であって
   点ではないのだから、爪先が水に触れただけで隊が渡渉しているとは言えない。

   林の縁をかすめただけで足が鈍り、隊が伸び、伸びたがゆえに隊全体が待たされる。
   盤の上では「避けて通ったはずなのに、なぜか遅い」としか見えなかった。

   そこで、組の踏み場（半径十三歩ほど）を見て、それが丸ごとその地に収まって
   初めて、その地にいると判ずる。爪先や踵が野に残っているうちは、まだ入って
   いない。地物の縁を十三歩ばかり内へ詰めた、と考えればよい。

   橋だけは別に扱う。橋は狭く、両脇はすぐ淵であるから、割で測れば決して
   「橋の上」にならない。芯が橋なら、渡っているのは橋である。

   城内（MAP）はこの限りではない。塀も門も堀も薄く、割で測れば消えてしまう。
   石垣の内と外は、一歩の違いが生死を分ける。点で判ずるままとする。 */
export const 踏み場 = 13;
export function 踏み込んだ地(x, y, r = 踏み場) {
  if (MAP && 城の域か(x, y)) return terrainAt(x, y);
  const 芯 = terrainAt(x, y);
  if (芯 === "bridge") return 芯;
  let 外 = 0;
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI * k) / 3;
    if (terrainAt(x + Math.cos(a) * r, y + Math.sin(a) * r) !== 芯) 外++;
  }
  return 外 <= 1 ? 芯 : "plain";               // 踏み場がおおむね収まっていること
}

/* 隊がその地にかかっているか。

   隊長が踏み込んでいるか、隊の四割が踏み込んでいれば、隊はその地にかかっている。
   翼の一組が水を跳ねているだけでは、隊が川を渡っているとは言わない。 */
export const 隊のかかり = 0.4;
export function 隊の地(c) {
  const 芯 = c.地芯 !== undefined ? c.地芯 : 踏み込んだ地(c.x, c.y);
  if (芯 !== "plain") return 芯;                    // 隊長が踏み込んでいる
  let 総 = 0;
  const 別 = {};
  for (const q of c.squads || []) {
    if (q.men <= 0) continue;
    総 += q.men;
    const t = q.地 !== undefined ? q.地 : 踏み込んだ地(q.x, q.y);
    if (t !== "plain") 別[t] = (別[t] || 0) + q.men;
  }
  if (!総) return "plain";
  let 名 = "plain", 多 = 0;
  for (const k in 別) if (別[k] > 多) { 多 = 別[k]; 名 = k; }
  return 多 / 総 >= 隊のかかり ? 名 : "plain";
}

// 速度・戦闘力・陣形維持・視界・騎馬適性を一つの表で管理する（GDD 8.6）
export const TERRAIN = {
  plain: { speed: 1.0, fight: 1.0, cohesion: 0, sight: 260, horse: 1.0, charge: true, label: "平地" },
  /* 街道。踏み固められた土で、隊列を崩さずに速く進める。戦う力は野と変わらない。 */
  road: { speed: 1.08, fight: 1.0, cohesion: 1, sight: 270, horse: 1.1, charge: true, label: "街道" },
  forest: { speed: 0.65, fight: 0.85, cohesion: -6, sight: 95, horse: 0.6, charge: false, label: "森" },
  wood: { speed: 0.82, fight: 0.92, cohesion: -3, sight: 165, horse: 0.85, charge: true, label: "林" },
  marsh: { speed: 0.5, fight: 0.8, cohesion: -9, sight: 240, horse: 0.45, charge: false, label: "湿地" },
  /* 丘と山の「戦う力」は一.〇〇である（GDD 8.1）。

     高みの利は、地べたに立っていれば付くものではない。相手より高いかどうかで
     決まる（地の高さ と、engine の 高みの利）。もとは丘に一.一五、山に一.二八を
     置いていたが、これだと山へ攻め登る隊にも頂の隊と同じ一.二八が付き、拠る
     意味が消える。そのうえ二重に掛かって、山に拠った受け手が一.四三倍の兵を
     九割三分で撃ち返すほどになった（取り分の比 二.三七）。

     高低そのものは 地の高さ に任せ、ここには残さない。丘の頂から麓へ当たれば
     一.一八、麓から見上げれば〇.八五――比にして一.三九で、もとの一.一五が
     両方に付いて比一.〇〇であったのより、よほど高みが効く。
     登る難しさは、足（速さ）と隊列（結束）のほうで既に表してある。 */
  hill: { speed: 0.7, fight: 1.0, cohesion: -2, sight: 360, horse: 0.8, charge: true, label: "丘" },
  /* 山。丘の一段上。登るのに難儀し、隊列は崩れ、騎馬は用をなさない。
     そのかわり見晴らしは野の倍近く、上から当たる強みも丘より大きい。 */
  mountain: { speed: 0.42, fight: 1.0, cohesion: -7, sight: 470, horse: 0.35, charge: false, label: "山" },
  village: { speed: 0.78, fight: 0.95, cohesion: -3, sight: 130, horse: 0.7, charge: false, label: "集落" },
  bridge: { speed: 0.95, fight: 0.85, cohesion: -5, sight: 260, horse: 0.9, charge: false, label: "橋" },
  ford: { speed: 0.3, fight: 0.7, cohesion: -14, sight: 260, horse: 0.5, charge: false, label: "浅瀬" },
  deep: { speed: 0.1, fight: 0.5, cohesion: -24, sight: 260, horse: 0.25, charge: false, label: "深い川" },
  wall: { speed: 0.01, fight: 1.0, cohesion: 0, sight: 300, horse: 0.1, charge: false, label: "城壁" },
  gate: { speed: 0.01, fight: 1.0, cohesion: 0, sight: 300, horse: 0.1, charge: false, label: "城門" },
  gateopen: { speed: 0.8, fight: 0.75, cohesion: -12, sight: 200, horse: 0.6, charge: false, label: "破れた門" },
  moat: { speed: 0.28, fight: 0.65, cohesion: -16, sight: 260, horse: 0.3, charge: false, label: "堀" },
  // 空堀。水は無いが、切岸を登り降りせねばならない。水堀ほどではないが足は鈍る。
  karabori: { speed: 0.42, fight: 0.78, cohesion: -10, sight: 260, horse: 0.45, charge: false, label: "空堀" },
  /* 峰の坂（GDD 9.3）。山城の外はこれである。
     駆け上がる側の足は半ばに落ち、隊列も崩れる。守る側は上から見下ろす。 */
  sakamichi: { speed: 0.52, fight: 0.86, cohesion: -8, sight: 300, horse: 0.5, charge: false, label: "坂" },
  surface: { speed: 0.82, fight: 0.95, cohesion: -3, sight: 280, horse: 0.85, charge: true, label: "緩斜面" },
  bridge2: { speed: 0.9, fight: 0.8, cohesion: -6, sight: 260, horse: 0.85, charge: false, label: "土橋" },
  tower: { speed: 0.55, fight: 1.3, cohesion: -2, sight: 430, horse: 0.3, charge: false, label: "櫓" },
  kuruwa: { speed: 0.92, fight: 1.0, cohesion: -3, sight: 210, horse: 0.75, charge: true, label: "曲輪" },
  honmaru: { speed: 0.88, fight: 1.12, cohesion: -3, sight: 230, horse: 0.7, charge: false, label: "本丸" },
  /* 出城の内（castleMap.js 出城を組む）。土塁に囲まれた狭い曲輪で、構えて戦える */
  demaru: { speed: 0.9, fight: 1.08, cohesion: -3, sight: 260, horse: 0.7, charge: false, label: "出城" },
  kido: { speed: 0.8, fight: 0.9, cohesion: -6, sight: 220, horse: 0.6, charge: false, label: "木戸" },
  /* 付城（castleMap.js 付城を据える）。柵は越えられるが足が鈍り、柵の際で戦う者は強い。
     陣の内は踏み固められ、井楼から見晴らしが利く */
  saku: { speed: 0.35, fight: 1.15, cohesion: -6, sight: 300, horse: 0.3, charge: false, label: "柵" },
  jinsho: { speed: 0.96, fight: 1.05, cohesion: 1, sight: 330, horse: 0.95, charge: true, label: "付城" },
};

// 天候（GDD 8.8：悪天候は疲労を増やす）
export const WEATHER = {
  晴: { sight: 1.0, speed: 1.0, fatigue: 1.0, teppo: 1.0, note: "視界も足場も良い。" },
  曇: { sight: 0.9, speed: 1.0, fatigue: 1.05, teppo: 1.0, note: "遠くが見えにくい。" },
  雨: { sight: 0.72, speed: 0.85, fatigue: 1.45, teppo: 0.12, note: "火縄が湿り、鉄砲がほぼ使えない。足場も悪い。" },
};

export const ARM_STATS = {
  yari: { melee: 1.2, range: 0, rof: 0, vol: 0, speed: 34, color: "#6E7A55", label: "槍" },
  yumi: { melee: 0.45, range: 190, rof: 1.5, vol: 1.0, speed: 34, color: "#7E9A52", label: "弓" },
  teppo: { melee: 0.4, range: 150, rof: 4.2, vol: 3.2, speed: 30, color: "#B07B3A", label: "鉄砲" },
  kiba: { melee: 1.9, range: 0, rof: 0, vol: 0, speed: 56, color: "#A2604A", label: "騎馬" },
};


