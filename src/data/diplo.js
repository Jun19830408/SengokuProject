

/* ------------------------------------------- 特殊勢力の関係（GDD 11.3） */
// 短期利益・長期成長・維持費・反発を組み合わせ、どれか一つを最適解にしない。
export const SPECIAL_OPTIONS = {
  商業都市: [
    { key: "保護", cost: 220, desc: "自治を認める。金銭は少ないが商業が伸び続ける。", gold: 55, comm: 0.30, min: 0.1, anger: 0 },
    { key: "支援", cost: 600, desc: "投資して成長と供給を強化。維持費がかかる。", gold: 115, comm: 0.5, min: 0, anger: 0.1, upkeep: 60 },
    { key: "支配", cost: 0, once: 900, desc: "直轄化して徴税。成長は鈍り、反発が残る。", gold: 130, comm: -0.15, min: -0.25, anger: 0.5 },
  ],
  港: [
    { key: "同盟", cost: 200, desc: "輸送と海戦を支援させる。", gold: 25, food: 260, anger: 0 },
    { key: "従属", cost: 320, desc: "積極的に参加させるが維持費が要る。", gold: 0, food: 420, upkeep: 70, anger: 0.1 },
    { key: "制圧", cost: 0, once: 600, desc: "港を直轄。熟練の水主が離散する。", gold: 60, food: 150, anger: 0.6 },
  ],
  寺社: [
    { key: "保護", cost: 260, desc: "民忠と威信が上がり、一揆を抑える。", min: 0.55, prestige: 0.25, anger: -0.2 },
    { key: "従属", cost: 380, desc: "僧兵を得るが、負担への反発が出る。", troops: 260, min: -0.1, anger: 0.35, upkeep: 50 },
    { key: "攻撃", cost: 0, once: 1400, desc: "財宝を奪う。民忠・威信と他寺社の関係が悪化。", min: -0.7, prestige: -0.9, anger: 1.0 },
  ],
  忍びの里: [
    { key: "保護", cost: 180, desc: "敵情が自然に入る。偵察の鮮度が保たれる。", intel: 1, anger: 0 },
    { key: "雇用", cost: 300, desc: "調略と防諜に働く。維持費が要る。", intel: 1, plot: 0.22, upkeep: 90, anger: 0.1 },
    { key: "支配", cost: 0, once: 400, desc: "掌握するが逃散し、能力が落ちる。", intel: 1, plot: 0.05, anger: 0.7 },
  ],  水軍衆: [
    { key: "保護", cost: 260, desc: "湊の警固を任せる。海路の往来が安んじる。", gold: 70, comm: 0.22, min: 0.1, anger: 0 },
    { key: "支援", cost: 700, desc: "船を与えて水軍とする。維持費がかかるが海路を握る。", gold: 60, comm: 0.34, troops: 320, anger: 0.1, upkeep: 80 },
    { key: "放置", cost: 0, desc: "捨て置く。海賊働きが商いを妨げる。", gold: 0, comm: -0.12, anger: 0.2 },
    { key: "討伐", cost: 520, once: 700, desc: "海賊を討つ。海路は静まるが船手を失う。", gold: 30, comm: 0.1, anger: 0.7 },
  ],
  鉱山: [
    { key: "保護", cost: 200, desc: "山師に委ねる。産出は少ないが末長く続く。", gold: 130, comm: 0.1, min: 0.05, anger: 0 },
    { key: "支援", cost: 640, desc: "人と道具を入れて掘り進む。維持費がかかる。", gold: 280, comm: 0.16, anger: 0.15, upkeep: 90 },
    { key: "支配", cost: 0, once: 1200, desc: "直轄して掘り尽くす。産出は多いが山は痩せる。", gold: 340, comm: -0.1, min: -0.3, anger: 0.6 },
  ],
  町: [
    { key: "保護", cost: 160, desc: "自治を認める。市が育つ。", gold: 40, comm: 0.22, min: 0.1, anger: 0 },
    { key: "支援", cost: 420, desc: "普請を入れて市を広げる。", gold: 80, comm: 0.36, anger: 0.1, upkeep: 40 },
    { key: "支配", cost: 0, once: 520, desc: "直轄して徴税。反発が残る。", gold: 95, comm: -0.12, min: -0.2, anger: 0.45 },
  ],

};

/* 外交（GDD 12.1）
   従属・臣従は「下の者が上の者に膝を屈する」ことである。
   下から一方的に対等の同盟へ言い換えることはできない。
   これを解くには、独立を宣して敵対するか、相手の力が衰えるのを待つほかない。 */
export const SUBJECT = ["従属", "臣従"];             // こちらが下に立っている間柄

export const DIPLO = [
  { key: "親善", cost: 180, why: "いつでも可能。主家との誼を篤くもできる",
    need: () => true },
  { key: "不可侵", cost: 320, months: 12, why: "信用55以上。主家との間には要らぬ",
    need: (r, me, you) => r.trust >= 55 && !(SUBJECT.includes(r.state) && you.koku > me.koku) },
  { key: "同盟", cost: 520, months: 24, why: "信用72以上。従属・臣従の間は、相手を上回らねば結べぬ",
    need: (r, me, you) => r.trust >= 72
      && !(SUBJECT.includes(r.state) && you.koku > me.koku * 0.9) },
  { key: "従属", cost: 400, why: "信用60以上・相手が自勢力の6割未満。官位があれば緩む",
    need: (r, me, you) => r.trust >= 60 - (me.diplo || 0)
      && you.koku < me.koku * (0.6 + (me.diplo || 0) * 0.012) && !SUBJECT.includes(r.state) },
  { key: "臣従", cost: 0, why: "相手が自勢力の1.8倍超。旗の下に完全に入り、独立の望みを捨てる",
    need: (r, me, you) => you.koku > me.koku * 1.8 && !SUBJECT.includes(r.state) },
  { key: "独立", cost: 0, why: "従属・臣従を破って自立する。信用と威信を大きく損なう",
    need: (r, me, you) => SUBJECT.includes(r.state) && you.koku > me.koku },
];

export const PLOTS = [
  // need は「まず確かに成る」ために要る知略。
  // cap はどれほどの知略を以てしても超えられぬ天井。人の営みに絶対はない。
  // hard は事の難しさ。民忠の高い城ほど、また難しい企てほど成りにくい。
  { key: "偵察", cost: 140, months: 1, need: 70, cap: 0.95, hard: 0.52,
    desc: "兵数・兵糧・城防・武将を知る。人を遣るだけの易しい事。" },
  { key: "流言", cost: 220, months: 2, need: 78, cap: 0.90, hard: 0.60,
    desc: "民忠と武将忠誠を下げる。噂を流すだけなら難しくない。" },
  { key: "城工作", cost: 300, months: 2, need: 84, cap: 0.84, hard: 0.66,
    desc: "城防・兵糧・民忠を下げる。城内に手の者を入れねばならぬ。" },
  { key: "密約", cost: 380, months: 3, need: 88, cap: 0.78, hard: 0.70,
    desc: "寝返り・城門開放を仕込む。攻城時に効く。相手の腹を探る要がある。" },
  { key: "引き抜き", cost: 420, months: 3, need: 90, cap: 0.72, hard: 0.74,
    desc: "敵武将を味方へ迎える。人の心を動かさねばならぬ。" },
  { key: "内応", cost: 900, months: 5, need: 94, cap: 0.60, hard: 0.80,
    desc: "城主を口説き、城ごと味方に付ける。忠誠の低い城主にしか通じぬ。至難の業。" },
];

