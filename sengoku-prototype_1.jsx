import React, { useState, useRef, useEffect, useMemo } from "react";

/* ==========================================================================
   戦国プロジェクト ─ 尾張・美濃 縦切り試作 v0.2
   GDD v2.0 準拠。地図は段彩陰影の明色系、合戦は10人駒／50人組／武将隊の三層。
   ========================================================================== */

/* ------------------------------------------------------------------ 配色 */
const U = {
  paper: "#F4F1E8", card: "#FFFFFF", line: "#DED8CA", line2: "#EDE8DC",
  text: "#26262A", dim: "#7C7668", ink: "#1C1C1E",
  sea: "#A9C4D6", river: "#7FA8C4",
};
const FC = {
  oda: "#2F5D8C", saito: "#9B3A34", yamato: "#8A6A34",
  ise: "#4F7A52", mizuno: "#6B5B7A",
};

/* ------------------------------------------------- 投影（実座標→地図座標） */
// 中部一帯（尾張・美濃・三河・遠江・駿河・伊豆・伊勢・志摩・近江・若狭・越前・飛騨・信濃・甲斐）
// 日本全土（蝦夷から琉球まで）
const MAPW = 3700, MAPH = 3900;
const LON0 = 124.20, LON1 = 146.20, LAT0 = 24.00, LAT1 = 45.80;
const px = (lon) => ((lon - LON0) / (LON1 - LON0)) * MAPW;
const py = (lat) => ((LAT1 - lat) / (LAT1 - LAT0)) * MAPH;

/* -------------------------------------------------------------- 拠点定義 */
const FACTIONS = {
  oda: { id: "oda", name: "織田家", color: "#2F5D8C", mon: "木瓜", playable: true, desc: "尾張下四郡の一族。父信秀のもと那古野に拠るが、清洲・岩倉の同族と並び立ち、東に今川、北に斎藤を抱える。", gold: 2600, prestige: 50, mobilization: 1 },
  yamato: { id: "yamato", name: "織田大和守家", color: "#6E7FA0", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  ise: { id: "ise", name: "織田伊勢守家", color: "#8894A8", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  saito: { id: "saito", name: "斎藤家", color: "#9B3A34", mon: "二頭波", playable: true, desc: "美濃一国を握る道三の家。老獪な当主のもと富み栄えるが、嫡子義龍との間に暗い溝がある。", gold: 2600, prestige: 50, mobilization: 1 },
  imagawa: { id: "imagawa", name: "今川家", color: "#4C6E3F", mon: "赤鳥", playable: true, desc: "駿河・遠江・三河にまたがる東海一の大身。義元と雪斎のもと、上洛を望む。", gold: 2600, prestige: 50, mobilization: 1 },
  matsudaira: { id: "matsudaira", name: "松平家", color: "#8A6B3A", mon: "葵", playable: true, desc: "三河岡崎の小勢力。今川の傘下に置かれ、嫡子は人質に出されている。", gold: 2600, prestige: 50, mobilization: 1 },
  mizuno: { id: "mizuno", name: "水野家", color: "#7A5C86", mon: "丸に十", playable: true, desc: "三河刈谷の小勢力。織田と今川の間で去就を計る。", gold: 2600, prestige: 50, mobilization: 1 },
  takeda: { id: "takeda", name: "武田家", color: "#B03A2E", mon: "四つ菱", playable: true, desc: "甲斐の名門。晴信のもと信濃を切り取りつつあるが、北に村上義清が立ちはだかる。", gold: 2600, prestige: 50, mobilization: 1 },
  murakami: { id: "murakami", name: "村上家", color: "#5D7A8C", mon: "鶴", playable: true, desc: "北信濃の勇。武田晴信を二度退けた義清が健在である。", gold: 2600, prestige: 50, mobilization: 1 },
  hojo: { id: "hojo", name: "北条家", color: "#3B5A6B", mon: "三鱗", playable: true, desc: "この盤では伊豆二城のみ。背後に相模・武蔵の本国を控える。", gold: 2600, prestige: 50, mobilization: 1 },
  kitabatake: { id: "kitabatake", name: "北畠家", color: "#6B8E5A", mon: "月", playable: true, desc: "伊勢国司の家柄。南伊勢に根を張るが、北伊勢は諸家に分かれている。", gold: 2600, prestige: 50, mobilization: 1 },
  kanbe: { id: "kanbe", name: "神戸家", color: "#8C7A4A", mon: "丸に十", gold: 2600, prestige: 50, mobilization: 1 },
  ikko: { id: "ikko", name: "長島一向衆", color: "#8B5E3C", mon: "輪宝", gold: 2600, prestige: 50, mobilization: 1 },
  kuki: { id: "kuki", name: "九鬼家", color: "#4A7A8C", mon: "抱き沢瀉", gold: 2600, prestige: 50, mobilization: 1 },
  rokkaku: { id: "rokkaku", name: "六角家", color: "#A0522D", mon: "三つ盛", playable: true, desc: "近江観音寺に拠る名門。石高は豊かだが、北の浅井が離れつつある。", gold: 2600, prestige: 50, mobilization: 1 },
  azai: { id: "azai", name: "浅井家", color: "#5A4A8C", mon: "三つ盛", playable: true, desc: "北近江小谷の新興。六角に押さえられ、当主久政は屈従を選んでいる。", gold: 2600, prestige: 50, mobilization: 1 },
  wakasa: { id: "wakasa", name: "若狭武田家", color: "#7A8C5A", mon: "抱き沢瀉", gold: 2600, prestige: 50, mobilization: 1 },
  asakura: { id: "asakura", name: "朝倉家", color: "#8C4A6B", mon: "笹", playable: true, desc: "越前一乗谷に栄える文の家。老将宗滴の武名は高いが、当主は戦を好まぬ。", gold: 2600, prestige: 50, mobilization: 1 },
  anegakoji: { id: "anegakoji", name: "姉小路家", color: "#6B6B5A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  ashikaga: { id: "ashikaga", name: "足利将軍家", color: "#B8A44A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  shingai: { id: "shingai", name: "新開家", color: "#5A7A6B", mon: "木瓜", playable: true, desc: "阿波牛岐の国人。三好に従いつつ、那賀川の水運と海に面した地の利で細く保つ。", gold: 2600, prestige: 50, mobilization: 1 },
  miyoshi: { id: "miyoshi", name: "三好家", color: "#8C3A5A", playable: true, desc: "畿内を握る新興の家。将軍を擁し、諸国に号令するが、内には松永久秀を抱える。", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  honganji: { id: "honganji", name: "本願寺", color: "#8B5E3C", playable: true, desc: "石山に拠る門徒の総本山。武ではなく信で人を動かす。", mon: "輪宝", gold: 2600, prestige: 50, mobilization: 1 },
  tsutsui: { id: "tsutsui", name: "筒井家", color: "#6B7A4A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  iga: { id: "iga", name: "伊賀惣国", color: "#5A6B7A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  saika: { id: "saika", name: "雑賀衆", color: "#4A7A6B", mon: "丸に十", gold: 2600, prestige: 50, mobilization: 1 },
  hatano: { id: "hatano", name: "波多野家", color: "#7A5A8C", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  isshiki: { id: "isshiki", name: "一色家", color: "#8C7A5A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  yamana: { id: "yamana", name: "山名家", color: "#5A8C7A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  akamatsu: { id: "akamatsu", name: "赤松家", color: "#A0644A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  bessho: { id: "bessho", name: "別所家", color: "#6B5A8C", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  kaga_ikko: { id: "kaga_ikko", name: "加賀一向衆", color: "#9B6B3C", mon: "輪宝", gold: 2600, prestige: 50, mobilization: 1 },
  hatakeyama: { id: "hatakeyama", name: "能登畠山家", color: "#4A6B8C", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  jinbo: { id: "jinbo", name: "神保家", color: "#7A6B4A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  shiina: { id: "shiina", name: "椎名家", color: "#5A7A5A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  nagao: { id: "nagao", name: "長尾家", color: "#3A5A8C", playable: true, desc: "越後の龍。景虎のもと兵は精強だが、国内はまとまりを欠く。", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  agakita: { id: "agakita", name: "揚北衆", color: "#6B8C9B", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  ota: { id: "ota", name: "太田家", color: "#8C6B7A", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  narita: { id: "narita", name: "成田家", color: "#7A8C6B", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  uesugi_y: { id: "uesugi_y", name: "山内上杉家", color: "#5A5A8C", playable: true, desc: "関東管領の家柄。名は重いが、北条に押されて衰えつつある。", mon: "笹", gold: 2600, prestige: 50, mobilization: 1 },
  nagano_k: { id: "nagano_k", name: "長野家", color: "#8C5A4A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  yura: { id: "yura", name: "由良家", color: "#6B4A5A", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  utsunomiya: { id: "utsunomiya", name: "宇都宮家", color: "#4A8C6B", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  sano: { id: "sano", name: "佐野家", color: "#8C8C4A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  nasu: { id: "nasu", name: "那須家", color: "#5A4A6B", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  edo_h: { id: "edo_h", name: "江戸家", color: "#7A4A8C", mon: "三鱗", gold: 2600, prestige: 50, mobilization: 1 },
  satake: { id: "satake", name: "佐竹家", color: "#4A6B4A", mon: "扇", gold: 2600, prestige: 50, mobilization: 1 },
  oda_h: { id: "oda_h", name: "小田家", color: "#8C7A8C", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  satomi: { id: "satomi", name: "里見家", color: "#3C7A8C", playable: true, desc: "安房の海の家。北条と海を挟んで争う。", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  koga: { id: "koga", name: "古河公方家", color: "#A08C4A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  yuki: { id: "yuki", name: "結城家", color: "#6B8C8C", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  chiba: { id: "chiba", name: "千葉家", color: "#8C4A7A", desc: "下総の名門千葉。北条と里見の間で揺れる。", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  kagawa: { id: "kagawa", name: "香川家", color: "#7A6B8C", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  kono: { id: "kono", name: "河野家", color: "#4A8C8C", desc: "伊予湯築の河野。瀬戸内の水軍と結び、細く長く保つ。", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  kurushima: { id: "kurushima", name: "来島村上家", color: "#3C6B8C", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  saionji: { id: "saionji", name: "西園寺家", color: "#8C6B4A", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  ichijo: { id: "ichijo", name: "土佐一条家", color: "#B8A44A", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  chosokabe: { id: "chosokabe", name: "長宗我部家", color: "#6B8C3C", desc: "土佐岡豊の小勢力。国親と若き元親のもと、四国の統一を夢見る。", mon: "笹", gold: 2600, prestige: 50, mobilization: 1 },
  aki: { id: "aki", name: "安芸家", color: "#8C4A5A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  amago: { id: "amago", name: "尼子家", color: "#5A5A9B", desc: "出雲月山富田の雄。大内と山陰山陽を争うが、新宮党を抱えて家中は一枚岩でない。", mon: "四つ菱", gold: 2600, prestige: 50, mobilization: 1 },
  nanjo: { id: "nanjo", name: "南条家", color: "#7A8C5A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  yoshimi: { id: "yoshimi", name: "吉見家", color: "#8C7A6B", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  masuda: { id: "masuda", name: "益田家", color: "#6B7A8C", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  uragami: { id: "uragami", name: "浦上家", color: "#9B5A3C", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  mimura: { id: "mimura", name: "三村家", color: "#5A8C6B", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  shoo: { id: "shoo", name: "庄家", color: "#8C8C5A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  shimizu: { id: "shimizu", name: "石川家", color: "#6B5A7A", mon: "丸に十", gold: 2600, prestige: 50, mobilization: 1 },
  ouchi: { id: "ouchi", name: "大内家", color: "#B04A7A", desc: "周防山口に栄える西国一の大身。文物は都に劣らぬが、家中に不穏がある。", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  kobayakawa: { id: "kobayakawa", name: "小早川家", color: "#4A7A5A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  mori: { id: "mori", name: "毛利家", color: "#3C7A4A", desc: "安芸吉田の国人にすぎぬが、元就と三子を擁する。ここから西国が動く。", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  takeda_a: { id: "takeda_a", name: "安芸武田家", color: "#8C5A5A", mon: "四つ菱", gold: 2600, prestige: 50, mobilization: 1 },
  otomo: { id: "otomo", name: "大友家", color: "#B06B2E", desc: "豊後府内の大友。義鎮と立花道雪を擁し、北九州に力を伸ばす。", mon: "杏葉", gold: 2600, prestige: 50, mobilization: 1 },
  akizuki: { id: "akizuki", name: "秋月家", color: "#7A5A4A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  kamachi: { id: "kamachi", name: "蒲池家", color: "#6B8C7A", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  shiga: { id: "shiga", name: "志賀家", color: "#5A6B4A", mon: "杏葉", gold: 2600, prestige: 50, mobilization: 1 },
  ryuzoji: { id: "ryuzoji", name: "龍造寺家", color: "#4A5A8C", desc: "肥前佐賀の龍造寺。少弐を退けて自立し、北九州に牙を剥く。", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  hata: { id: "hata", name: "波多家", color: "#8C6B7A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  matsura: { id: "matsura", name: "松浦党", color: "#3C8C8C", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  arima: { id: "arima", name: "有馬家", color: "#8C4A8C", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  omura: { id: "omura", name: "大村家", color: "#5A8C8C", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  kikuchi: { id: "kikuchi", name: "菊池家", color: "#8C7A3C", mon: "並び鷹", gold: 2600, prestige: 50, mobilization: 1 },
  sagara: { id: "sagara", name: "相良家", color: "#6B4A7A", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  ito: { id: "ito", name: "伊東家", color: "#8C5A6B", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  tsuchimochi: { id: "tsuchimochi", name: "土持家", color: "#7A7A5A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  shimazu: { id: "shimazu", name: "島津家", color: "#8C2E2E", desc: "薩摩大隅の島津。貴久のもと四兄弟が育ち、九州統一の芽がある。", mon: "丸に十", gold: 2600, prestige: 50, mobilization: 1 },
  so: { id: "so", name: "宗家", color: "#4A6B7A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  date: { id: "date", name: "伊達家", color: "#8C4A3C", desc: "奥州伊達。晴宗が家中を鎮め、南奥に力を蓄える。", mon: "丸に十", gold: 2600, prestige: 50, mobilization: 1 },
  ashina: { id: "ashina", name: "蘆名家", color: "#4A7A8C", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  nihonmatsu: { id: "nihonmatsu", name: "二本松畠山家", color: "#6B7A5A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  shirakawa: { id: "shirakawa", name: "白河結城家", color: "#7A6B5A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  nikaido: { id: "nikaido", name: "二階堂家", color: "#8C7A6B", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  tamura: { id: "tamura", name: "田村家", color: "#5A6B8C", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  soma: { id: "soma", name: "相馬家", color: "#8C5A7A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  osaki: { id: "osaki", name: "大崎家", color: "#6B5A4A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  kokubun: { id: "kokubun", name: "国分家", color: "#7A8C7A", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  kasai: { id: "kasai", name: "葛西家", color: "#5A8C5A", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  abe: { id: "abe", name: "阿曽沼家", color: "#8C8C6B", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  nanbu: { id: "nanbu", name: "南部家", color: "#3C5A7A", desc: "陸奥三戸の南部。北奥に広大な地を持つが、九戸と大浦を抱える。", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  kunohe: { id: "kunohe", name: "九戸家", color: "#7A4A5A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  shiba: { id: "shiba", name: "斯波家", color: "#8C6B8C", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  namioka: { id: "namioka", name: "浪岡北畠家", color: "#6B8C8C", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  oura: { id: "oura", name: "大浦家", color: "#4A8C7A", mon: "木瓜", gold: 2600, prestige: 50, mobilization: 1 },
  mogami: { id: "mogami", name: "最上家", color: "#8C7A4A", desc: "出羽山形の最上。伊達と縁を結びつつ、独立を保つ。", mon: "丸に十", gold: 2600, prestige: 50, mobilization: 1 },
  tendo: { id: "tendo", name: "天童家", color: "#7A5A6B", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  daihoji: { id: "daihoji", name: "大宝寺家", color: "#5A7A6B", mon: "月", gold: 2600, prestige: 50, mobilization: 1 },
  onodera: { id: "onodera", name: "小野寺家", color: "#6B6B8C", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
  ando: { id: "ando", name: "安東家", color: "#3C7A8C", mon: "抱き沢瀉", gold: 2600, prestige: 50, mobilization: 1 },
  honma: { id: "honma", name: "本間家", color: "#8C6B5A", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  ainu_w: { id: "ainu_w", name: "西蝦夷アイヌ", color: "#5A7A8C", mon: "輪宝", gold: 1200, prestige: 40, mobilization: 1 },
  ainu_e: { id: "ainu_e", name: "東蝦夷アイヌ", color: "#6B8C7A", mon: "輪宝", gold: 1200, prestige: 40, mobilization: 1 },
  ainu_n: { id: "ainu_n", name: "北蝦夷アイヌ", color: "#7A8C9B", mon: "輪宝", gold: 1000, prestige: 38, mobilization: 1 },
  kakizaki: { id: "kakizaki", name: "蠣崎家", color: "#5A8C4A", desc: "蝦夷地の蠣崎。アイヌとの交易で立つ、日本の北の果て。", mon: "鶴", gold: 2600, prestige: 50, mobilization: 1 },
  ryukyu: { id: "ryukyu", name: "琉球王国", color: "#C8963C", desc: "琉球王国。武はないが、明・南蛮との交易で富む。", mon: "三つ盛", gold: 2600, prestige: 50, mobilization: 1 },
};


const CASTLES = [
  { id: "okazaki", name: "岡崎城", kuni: "三河", faction: "matsudaira", lon: 137.159, lat: 34.955, koku: 51166, kokuMax: 57561, kokuCap: 63957, pop: 41956, food: 10745, def: 48, comm: 34, min: 76, hp: 5880, local: 1197, localTrain: 60 },
  { id: "yoshida", name: "吉田城", kuni: "三河", faction: "imagawa", lon: 137.391, lat: 34.769, koku: 41863, kokuMax: 47096, kokuCap: 52329, pop: 34328, food: 8791, def: 52, comm: 32, min: 66, hp: 6120, local: 980, localTrain: 60 },
  { id: "nishio", name: "西尾城", kuni: "三河", faction: "imagawa", lon: 137.062, lat: 34.859, koku: 30234, kokuMax: 34014, kokuCap: 37793, pop: 24792, food: 6349, def: 42, comm: 28, min: 66, hp: 5520, local: 707, localTrain: 56 },
  { id: "tahara", name: "田原城", kuni: "三河", faction: "imagawa", lon: 137.238, lat: 34.669, koku: 27909, kokuMax: 31397, kokuCap: 34886, pop: 22885, food: 5861, def: 44, comm: 26, min: 64, hp: 5640, local: 653, localTrain: 56 },
  { id: "kariya", name: "刈谷城", kuni: "三河", faction: "mizuno", lon: 137.000, lat: 34.988, koku: 25583, kokuMax: 28781, kokuCap: 31979, pop: 20978, food: 5372, def: 42, comm: 30, min: 70, hp: 5520, local: 599, localTrain: 56 },
  { id: "nagashino", name: "長篠城", kuni: "三河", faction: "imagawa", lon: 137.559, lat: 34.926, koku: 20931, kokuMax: 23548, kokuCap: 26164, pop: 17163, food: 4396, def: 46, comm: 18, min: 64, hp: 5760, local: 490, localTrain: 56 },
  { id: "okochi", name: "大河内城", kuni: "伊勢", faction: "kitabatake", lon: 136.545, lat: 34.516, koku: 99810, kokuMax: 112287, kokuCap: 124763, pop: 81844, food: 20960, def: 56, comm: 34, min: 74, hp: 6360, local: 2336, localTrain: 60 },
  { id: "matsugashima", name: "松ヶ島城", kuni: "伊勢", faction: "kitabatake", lon: 136.570, lat: 34.596, koku: 72590, kokuMax: 81663, kokuCap: 90737, pop: 59524, food: 15244, def: 48, comm: 36, min: 72, hp: 5880, local: 1699, localTrain: 58 },
  { id: "kanbe", name: "神戸城", kuni: "伊勢", faction: "kanbe", lon: 136.560, lat: 34.868, koku: 68053, kokuMax: 76559, kokuCap: 85066, pop: 55803, food: 14291, def: 46, comm: 34, min: 70, hp: 5760, local: 1592, localTrain: 56 },
  { id: "kuwana", name: "桑名城", kuni: "伊勢", faction: "kanbe", lon: 136.686, lat: 35.064, koku: 63516, kokuMax: 71456, kokuCap: 79395, pop: 52083, food: 13338, def: 44, comm: 44, min: 68, hp: 5640, local: 1486, localTrain: 54 },
  { id: "nagashima", name: "長島城", kuni: "伊勢", faction: "ikko", lon: 136.690, lat: 35.100, koku: 58979, kokuMax: 66352, kokuCap: 73724, pop: 48363, food: 12386, def: 58, comm: 30, min: 88, hp: 6480, local: 1380, localTrain: 58 },
  { id: "nirayama", name: "韮山城", kuni: "伊豆", faction: "hojo", lon: 138.960, lat: 35.040, koku: 25698, kokuMax: 28911, kokuCap: 32123, pop: 21072, food: 5397, def: 58, comm: 30, min: 76, hp: 6480, local: 601, localTrain: 64 },
  { id: "shimoda", name: "下田城", kuni: "伊豆", faction: "hojo", lon: 138.945, lat: 34.673, koku: 12290, kokuMax: 13827, kokuCap: 15363, pop: 10078, food: 2581, def: 44, comm: 22, min: 72, hp: 5640, local: 288, localTrain: 58 },
  { id: "fukashi", name: "深志城", kuni: "信濃", faction: "takeda", lon: 137.969, lat: 36.238, koku: 58803, kokuMax: 66154, kokuCap: 73504, pop: 48218, food: 12349, def: 56, comm: 30, min: 64, hp: 6360, local: 1376, localTrain: 62 },
  { id: "katsurao", name: "葛尾城", kuni: "信濃", faction: "murakami", lon: 138.256, lat: 36.500, koku: 45736, kokuMax: 51453, kokuCap: 57170, pop: 37504, food: 9605, def: 58, comm: 20, min: 76, hp: 6480, local: 1070, localTrain: 62 },
  { id: "takato", name: "高遠城", kuni: "信濃", faction: "takeda", lon: 138.062, lat: 35.833, koku: 42470, kokuMax: 47778, kokuCap: 53087, pop: 34825, food: 8919, def: 54, comm: 20, min: 66, hp: 6240, local: 994, localTrain: 62 },
  { id: "iida", name: "飯田城", kuni: "信濃", faction: "takeda", lon: 137.822, lat: 35.514, koku: 39202, kokuMax: 44103, kokuCap: 49003, pop: 32146, food: 8232, def: 48, comm: 22, min: 66, hp: 5880, local: 917, localTrain: 60 },
  { id: "toishi", name: "砥石城", kuni: "信濃", faction: "murakami", lon: 138.264, lat: 36.412, koku: 39202, kokuMax: 44103, kokuCap: 49003, pop: 32146, food: 8232, def: 62, comm: 16, min: 74, hp: 6720, local: 917, localTrain: 62 },
  { id: "komoro", name: "小諸城", kuni: "信濃", faction: "takeda", lon: 138.421, lat: 36.322, koku: 35935, kokuMax: 40427, kokuCap: 44919, pop: 29467, food: 7546, def: 52, comm: 22, min: 66, hp: 6120, local: 841, localTrain: 60 },
  { id: "kaizu", name: "海津城", kuni: "信濃", faction: "murakami", lon: 138.208, lat: 36.573, koku: 32669, kokuMax: 36752, kokuCap: 40836, pop: 26789, food: 6860, def: 50, comm: 18, min: 72, hp: 6000, local: 764, localTrain: 58 },
  { id: "nagoya", name: "那古野城", kuni: "尾張", faction: "oda", lon: 136.900, lat: 35.185, koku: 91478, kokuMax: 102912, kokuCap: 114347, pop: 75012, food: 19210, def: 46, comm: 44, min: 74, hp: 5760, local: 2141, localTrain: 58 },
  { id: "kiyosu", name: "清洲城", kuni: "尾張", faction: "yamato", lon: 136.845, lat: 35.222, koku: 86904, kokuMax: 97767, kokuCap: 108630, pop: 71261, food: 18250, def: 54, comm: 50, min: 68, hp: 6240, local: 2034, localTrain: 56 },
  { id: "iwakura", name: "岩倉城", kuni: "尾張", faction: "ise", lon: 136.870, lat: 35.283, koku: 64034, kokuMax: 72039, kokuCap: 80043, pop: 52508, food: 13447, def: 48, comm: 32, min: 70, hp: 5880, local: 1498, localTrain: 54 },
  { id: "shobata", name: "勝幡城", kuni: "尾張", faction: "oda", lon: 136.735, lat: 35.219, koku: 54886, kokuMax: 61747, kokuCap: 68608, pop: 45007, food: 11526, def: 38, comm: 38, min: 78, hp: 5280, local: 1284, localTrain: 56 },
  { id: "inuyama", name: "犬山城", kuni: "尾張", faction: "ise", lon: 136.939, lat: 35.388, koku: 50313, kokuMax: 56602, kokuCap: 62891, pop: 41257, food: 10566, def: 50, comm: 30, min: 72, hp: 6000, local: 1177, localTrain: 56 },
  { id: "narumi", name: "鳴海城", kuni: "尾張", faction: "oda", lon: 136.949, lat: 35.098, koku: 41165, kokuMax: 46310, kokuCap: 51456, pop: 33755, food: 8645, def: 42, comm: 34, min: 66, hp: 5520, local: 963, localTrain: 54 },
  { id: "toba", name: "鳥羽城", kuni: "志摩", faction: "kuki", lon: 136.843, lat: 34.481, koku: 8570, kokuMax: 9641, kokuCap: 10712, pop: 7027, food: 1800, def: 48, comm: 30, min: 74, hp: 5880, local: 201, localTrain: 60 },
  { id: "tsutsujigasaki", name: "躑躅ヶ崎館", kuni: "甲斐", faction: "takeda", lon: 138.577, lat: 35.678, koku: 98330, kokuMax: 110622, kokuCap: 122913, pop: 80631, food: 20649, def: 56, comm: 48, min: 80, hp: 6360, local: 2301, localTrain: 68 },
  { id: "iwadono", name: "岩殿城", kuni: "甲斐", faction: "takeda", lon: 138.939, lat: 35.612, koku: 36418, kokuMax: 40971, kokuCap: 45523, pop: 29863, food: 7648, def: 62, comm: 20, min: 74, hp: 6720, local: 852, localTrain: 62 },
  { id: "katsuyama_k", name: "勝山城", kuni: "甲斐", faction: "takeda", lon: 138.640, lat: 35.596, koku: 25493, kokuMax: 28679, kokuCap: 31866, pop: 20904, food: 5354, def: 50, comm: 18, min: 72, hp: 6000, local: 597, localTrain: 60 },
  { id: "inabayama", name: "稲葉山城", kuni: "美濃", faction: "saito", lon: 136.782, lat: 35.434, koku: 112320, kokuMax: 126360, kokuCap: 140400, pop: 92102, food: 23587, def: 68, comm: 46, min: 72, hp: 7080, local: 2628, localTrain: 66 },
  { id: "ogaki", name: "大垣城", kuni: "美濃", faction: "saito", lon: 136.617, lat: 35.360, koku: 86400, kokuMax: 97200, kokuCap: 108000, pop: 70848, food: 18144, def: 52, comm: 42, min: 70, hp: 6120, local: 2022, localTrain: 62 },
  { id: "sunomata", name: "墨俣城", kuni: "美濃", faction: "saito", lon: 136.678, lat: 35.372, koku: 56160, kokuMax: 63180, kokuCap: 70200, pop: 46051, food: 11794, def: 40, comm: 30, min: 68, hp: 5400, local: 1314, localTrain: 58 },
  { id: "gujo", name: "郡上八幡城", kuni: "美濃", faction: "saito", lon: 136.960, lat: 35.751, koku: 38880, kokuMax: 43740, kokuCap: 48600, pop: 31882, food: 8165, def: 46, comm: 22, min: 66, hp: 5760, local: 910, localTrain: 56 },
  { id: "iwamura", name: "岩村城", kuni: "美濃", faction: "saito", lon: 137.444, lat: 35.362, koku: 34560, kokuMax: 38880, kokuCap: 43200, pop: 28339, food: 7258, def: 54, comm: 20, min: 64, hp: 6240, local: 809, localTrain: 58 },
  { id: "naegi", name: "苗木城", kuni: "美濃", faction: "saito", lon: 137.480, lat: 35.520, koku: 25920, kokuMax: 29160, kokuCap: 32400, pop: 21254, food: 5443, def: 44, comm: 18, min: 62, hp: 5640, local: 607, localTrain: 54 },
  { id: "nochiseyama", name: "後瀬山城", kuni: "若狭", faction: "wakasa", lon: 135.750, lat: 35.494, koku: 35401, kokuMax: 39826, kokuCap: 44251, pop: 29029, food: 7434, def: 50, comm: 34, min: 70, hp: 6000, local: 828, localTrain: 56 },
  { id: "kuniyoshi", name: "国吉城", kuni: "若狭", faction: "wakasa", lon: 135.966, lat: 35.607, koku: 16339, kokuMax: 18382, kokuCap: 20424, pop: 13398, food: 3431, def: 52, comm: 18, min: 72, hp: 6120, local: 382, localTrain: 58 },
  { id: "ichijodani", name: "一乗谷城", kuni: "越前", faction: "asakura", lon: 136.301, lat: 36.007, koku: 167802, kokuMax: 188778, kokuCap: 209753, pop: 137598, food: 35238, def: 60, comm: 56, min: 78, hp: 6600, local: 3927, localTrain: 64 },
  { id: "kitanosho", name: "北ノ庄", kuni: "越前", faction: "asakura", lon: 136.219, lat: 36.064, koku: 103878, kokuMax: 116862, kokuCap: 129847, pop: 85180, food: 21814, def: 48, comm: 44, min: 74, hp: 5880, local: 2431, localTrain: 60 },
  { id: "kanegasaki", name: "金ヶ崎城", kuni: "越前", faction: "asakura", lon: 136.078, lat: 35.658, koku: 63925, kokuMax: 71915, kokuCap: 79906, pop: 52418, food: 13424, def: 56, comm: 24, min: 72, hp: 6360, local: 1496, localTrain: 60 },
  { id: "kannonji", name: "観音寺城", kuni: "近江", faction: "rokkaku", lon: 136.150, lat: 35.148, koku: 161279, kokuMax: 181439, kokuCap: 201599, pop: 132249, food: 33869, def: 62, comm: 52, min: 72, hp: 6720, local: 3774, localTrain: 60 },
  { id: "odani", name: "小谷城", kuni: "近江", faction: "azai", lon: 136.276, lat: 35.484, koku: 111654, kokuMax: 125611, kokuCap: 139568, pop: 91556, food: 23447, def: 66, comm: 30, min: 78, hp: 6960, local: 2613, localTrain: 62 },
  { id: "sawayama", name: "佐和山城", kuni: "近江", faction: "rokkaku", lon: 136.264, lat: 35.276, koku: 93046, kokuMax: 104676, kokuCap: 116307, pop: 76298, food: 19540, def: 54, comm: 38, min: 70, hp: 6240, local: 2177, localTrain: 58 },
  { id: "sakamoto", name: "坂本城", kuni: "近江", faction: "rokkaku", lon: 135.878, lat: 35.070, koku: 86842, kokuMax: 97698, kokuCap: 108553, pop: 71210, food: 18237, def: 46, comm: 46, min: 68, hp: 5760, local: 2032, localTrain: 56 },
  { id: "yamamotoyama", name: "山本山城", kuni: "近江", faction: "azai", lon: 136.213, lat: 35.437, koku: 62030, kokuMax: 69784, kokuCap: 77538, pop: 50865, food: 13026, def: 48, comm: 22, min: 74, hp: 5880, local: 1452, localTrain: 58 },
  { id: "kakegawa", name: "掛川城", kuni: "遠江", faction: "imagawa", lon: 138.014, lat: 34.775, koku: 48990, kokuMax: 55114, kokuCap: 61238, pop: 40172, food: 10288, def: 54, comm: 34, min: 72, hp: 6240, local: 1146, localTrain: 62 },
  { id: "hikuma", name: "引間城", kuni: "遠江", faction: "imagawa", lon: 137.725, lat: 34.711, koku: 40826, kokuMax: 45929, kokuCap: 51032, pop: 33477, food: 8573, def: 46, comm: 32, min: 70, hp: 5760, local: 955, localTrain: 58 },
  { id: "takatenjin", name: "高天神城", kuni: "遠江", faction: "imagawa", lon: 138.062, lat: 34.700, koku: 32661, kokuMax: 36743, kokuCap: 40826, pop: 26782, food: 6859, def: 60, comm: 20, min: 68, hp: 6600, local: 764, localTrain: 60 },
  { id: "futamata", name: "二俣城", kuni: "遠江", faction: "imagawa", lon: 137.812, lat: 34.876, koku: 26537, kokuMax: 29854, kokuCap: 33171, pop: 21760, food: 5573, def: 48, comm: 20, min: 68, hp: 5880, local: 621, localTrain: 58 },
  { id: "inui", name: "犬居城", kuni: "遠江", faction: "imagawa", lon: 137.883, lat: 34.983, koku: 18371, kokuMax: 20668, kokuCap: 22964, pop: 15064, food: 3858, def: 44, comm: 14, min: 64, hp: 5640, local: 430, localTrain: 54 },
  { id: "matsukura_h", name: "高山松倉城", kuni: "飛騨", faction: "anegakoji", lon: 137.243, lat: 36.129, koku: 18848, kokuMax: 21204, kokuCap: 23560, pop: 15455, food: 3958, def: 48, comm: 16, min: 70, hp: 5880, local: 441, localTrain: 54 },
  { id: "sunpu", name: "駿府城", kuni: "駿河", faction: "imagawa", lon: 138.383, lat: 34.978, koku: 62400, kokuMax: 70200, kokuCap: 78000, pop: 51168, food: 13104, def: 58, comm: 62, min: 80, hp: 6480, local: 1460, localTrain: 64 },
  { id: "kounkoji", name: "興国寺城", kuni: "駿河", faction: "imagawa", lon: 138.833, lat: 35.135, koku: 24000, kokuMax: 27000, kokuCap: 30000, pop: 19680, food: 5040, def: 46, comm: 24, min: 70, hp: 5760, local: 562, localTrain: 58 },
  { id: "nijo", name: "二条御所", kuni: "山城", faction: "ashikaga", lon: 135.752, lat: 35.014, koku: 61271, kokuMax: 68930, kokuCap: 76589, pop: 50242, food: 12867, def: 44, comm: 62, min: 62, hp: 5640, local: 1434, localTrain: 50 },
  { id: "shoryuji", name: "勝竜寺城", kuni: "山城", faction: "miyoshi", lon: 135.700, lat: 34.919, koku: 39646, kokuMax: 44602, kokuCap: 49558, pop: 32510, food: 8326, def: 50, comm: 44, min: 66, hp: 6000, local: 928, localTrain: 60 },
  { id: "akutagawa", name: "芥川山城", kuni: "摂津", faction: "miyoshi", lon: 135.598, lat: 34.855, koku: 74062, kokuMax: 83320, kokuCap: 92578, pop: 60731, food: 15553, def: 58, comm: 42, min: 68, hp: 6480, local: 1733, localTrain: 62 },
  { id: "iimoriyama", name: "飯盛山城", kuni: "河内", faction: "miyoshi", lon: 135.646, lat: 34.727, koku: 65853, kokuMax: 74084, kokuCap: 82316, pop: 53999, food: 13829, def: 56, comm: 40, min: 68, hp: 6360, local: 1541, localTrain: 62 },
  { id: "takaya", name: "高屋城", kuni: "河内", faction: "miyoshi", lon: 135.605, lat: 34.552, koku: 46484, kokuMax: 52294, kokuCap: 58105, pop: 38117, food: 9762, def: 50, comm: 36, min: 66, hp: 6000, local: 1088, localTrain: 58 },
  { id: "itami", name: "有岡城", kuni: "摂津", faction: "miyoshi", lon: 135.415, lat: 34.784, koku: 56971, kokuMax: 64093, kokuCap: 71214, pop: 46716, food: 11964, def: 52, comm: 44, min: 66, hp: 6120, local: 1333, localTrain: 58 },
  { id: "hanakuma", name: "花隈城", kuni: "摂津", faction: "miyoshi", lon: 135.180, lat: 34.690, koku: 39880, kokuMax: 44865, kokuCap: 49850, pop: 32702, food: 8375, def: 44, comm: 46, min: 64, hp: 5640, local: 933, localTrain: 56 },
  { id: "kishiwada", name: "岸和田城", kuni: "和泉", faction: "miyoshi", lon: 135.371, lat: 34.460, koku: 33963, kokuMax: 38209, kokuCap: 42454, pop: 27850, food: 7132, def: 48, comm: 38, min: 66, hp: 5880, local: 795, localTrain: 58 },
  { id: "ishiyama", name: "石山本願寺", kuni: "摂津", faction: "honganji", lon: 135.526, lat: 34.687, koku: 79759, kokuMax: 89729, kokuCap: 99699, pop: 65402, food: 16749, def: 72, comm: 58, min: 92, hp: 7320, local: 1866, localTrain: 62 },
  { id: "koriyama", name: "郡山城", kuni: "大和", faction: "tsutsui", lon: 135.784, lat: 34.652, koku: 86198, kokuMax: 96972, kokuCap: 107747, pop: 70682, food: 18102, def: 52, comm: 40, min: 70, hp: 6120, local: 2017, localTrain: 58 },
  { id: "shigisan", name: "信貴山城", kuni: "大和", faction: "miyoshi", lon: 135.669, lat: 34.611, koku: 64648, kokuMax: 72729, kokuCap: 80810, pop: 53011, food: 13576, def: 60, comm: 26, min: 64, hp: 6600, local: 1513, localTrain: 60 },
  { id: "tamonyama", name: "多聞山城", kuni: "大和", faction: "tsutsui", lon: 135.836, lat: 34.696, koku: 57465, kokuMax: 64648, kokuCap: 71831, pop: 47121, food: 12068, def: 54, comm: 34, min: 68, hp: 6240, local: 1345, localTrain: 58 },
  { id: "takatori", name: "高取城", kuni: "大和", faction: "tsutsui", lon: 135.822, lat: 34.427, koku: 50282, kokuMax: 56567, kokuCap: 62852, pop: 41231, food: 10559, def: 58, comm: 22, min: 68, hp: 6480, local: 1177, localTrain: 58 },
  { id: "ueno_iga", name: "伊賀上野", kuni: "伊賀", faction: "iga", lon: 136.132, lat: 34.768, koku: 41600, kokuMax: 46800, kokuCap: 52000, pop: 34112, food: 8736, def: 46, comm: 30, min: 76, hp: 5760, local: 973, localTrain: 62 },
  { id: "saika", name: "雑賀城", kuni: "紀伊", faction: "saika", lon: 135.208, lat: 34.235, koku: 50658, kokuMax: 56991, kokuCap: 63323, pop: 41540, food: 10638, def: 50, comm: 44, min: 84, hp: 6000, local: 1185, localTrain: 66 },
  { id: "shingu", name: "新宮城", kuni: "紀伊", faction: "saika", lon: 135.985, lat: 33.715, koku: 31174, kokuMax: 35071, kokuCap: 38968, pop: 25563, food: 6547, def: 44, comm: 26, min: 74, hp: 5640, local: 729, localTrain: 58 },
  { id: "tetori", name: "手取城", kuni: "紀伊", faction: "saika", lon: 135.230, lat: 33.910, koku: 23381, kokuMax: 26303, kokuCap: 29226, pop: 19172, food: 4910, def: 42, comm: 20, min: 72, hp: 5520, local: 547, localTrain: 56 },
  { id: "yagami", name: "八上城", kuni: "丹波", faction: "hatano", lon: 135.223, lat: 35.062, koku: 63333, kokuMax: 71249, kokuCap: 79166, pop: 51933, food: 13300, def: 58, comm: 30, min: 72, hp: 6480, local: 1482, localTrain: 60 },
  { id: "kameyama_t", name: "丹波亀山城", kuni: "丹波", faction: "hatano", lon: 135.577, lat: 35.013, koku: 46444, kokuMax: 52250, kokuCap: 58055, pop: 38084, food: 9753, def: 50, comm: 34, min: 70, hp: 6000, local: 1087, localTrain: 58 },
  { id: "yokoyama", name: "横山城", kuni: "丹波", faction: "hatano", lon: 135.116, lat: 35.296, koku: 33778, kokuMax: 38000, kokuCap: 42222, pop: 27698, food: 7093, def: 46, comm: 24, min: 68, hp: 5760, local: 790, localTrain: 56 },
  { id: "miyazu", name: "宮津城", kuni: "丹後", faction: "isshiki", lon: 135.196, lat: 35.535, koku: 38996, kokuMax: 43870, kokuCap: 48745, pop: 31977, food: 8189, def: 48, comm: 38, min: 70, hp: 5880, local: 913, localTrain: 56 },
  { id: "konosumi", name: "此隅山城", kuni: "但馬", faction: "yamana", lon: 134.813, lat: 35.478, koku: 31072, kokuMax: 34956, kokuCap: 38840, pop: 25479, food: 6525, def: 52, comm: 26, min: 70, hp: 6120, local: 727, localTrain: 56 },
  { id: "takeda", name: "竹田城", kuni: "但馬", faction: "yamana", lon: 134.829, lat: 35.301, koku: 23761, kokuMax: 26731, kokuCap: 29701, pop: 19484, food: 4990, def: 62, comm: 22, min: 70, hp: 6720, local: 556, localTrain: 58 },
  { id: "ojio", name: "置塩城", kuni: "播磨", faction: "akamatsu", lon: 134.657, lat: 34.929, koku: 68838, kokuMax: 77443, kokuCap: 86048, pop: 56447, food: 14456, def: 54, comm: 34, min: 68, hp: 6240, local: 1611, localTrain: 56 },
  { id: "himeji", name: "姫路城", kuni: "播磨", faction: "akamatsu", lon: 134.694, lat: 34.839, koku: 63102, kokuMax: 70989, kokuCap: 78877, pop: 51744, food: 13251, def: 50, comm: 46, min: 70, hp: 6000, local: 1477, localTrain: 58 },
  { id: "goshaku", name: "御着城", kuni: "播磨", faction: "akamatsu", lon: 134.727, lat: 34.821, koku: 45892, kokuMax: 51628, kokuCap: 57365, pop: 37631, food: 9637, def: 46, comm: 34, min: 68, hp: 5760, local: 1074, localTrain: 56 },
  { id: "miki", name: "三木城", kuni: "播磨", faction: "bessho", lon: 134.988, lat: 34.798, koku: 63102, kokuMax: 70989, kokuCap: 78877, pop: 51744, food: 13251, def: 58, comm: 36, min: 72, hp: 6480, local: 1477, localTrain: 60 },
  { id: "kanazawa", name: "金沢御堂", kuni: "加賀", faction: "kaga_ikko", lon: 136.659, lat: 36.566, koku: 113782, kokuMax: 128005, kokuCap: 142228, pop: 93301, food: 23894, def: 62, comm: 42, min: 90, hp: 6720, local: 2662, localTrain: 60 },
  { id: "komatsu", name: "小松城", kuni: "加賀", faction: "kaga_ikko", lon: 136.451, lat: 36.409, koku: 68270, kokuMax: 76803, kokuCap: 85337, pop: 55981, food: 14337, def: 48, comm: 30, min: 84, hp: 5880, local: 1598, localTrain: 56 },
  { id: "torigoe", name: "鳥越城", kuni: "加賀", faction: "kaga_ikko", lon: 136.607, lat: 36.323, koku: 45513, kokuMax: 51202, kokuCap: 56891, pop: 37321, food: 9558, def: 54, comm: 18, min: 86, hp: 6240, local: 1065, localTrain: 58 },
  { id: "nanao", name: "七尾城", kuni: "能登", faction: "hatakeyama", lon: 136.951, lat: 37.019, koku: 80640, kokuMax: 90720, kokuCap: 100800, pop: 66125, food: 16934, def: 64, comm: 38, min: 70, hp: 6840, local: 1887, localTrain: 58 },
  { id: "suemori_n", name: "末森城", kuni: "能登", faction: "hatakeyama", lon: 136.797, lat: 36.842, koku: 36960, kokuMax: 41580, kokuCap: 46200, pop: 30307, food: 7762, def: 48, comm: 22, min: 68, hp: 5880, local: 865, localTrain: 56 },
  { id: "toyama", name: "富山城", kuni: "越中", faction: "jinbo", lon: 137.212, lat: 36.694, koku: 66933, kokuMax: 75299, kokuCap: 83666, pop: 54885, food: 14056, def: 50, comm: 36, min: 68, hp: 6000, local: 1566, localTrain: 58 },
  { id: "masuyama", name: "増山城", kuni: "越中", faction: "jinbo", lon: 136.995, lat: 36.643, koku: 54763, kokuMax: 61609, kokuCap: 68454, pop: 44906, food: 11500, def: 56, comm: 22, min: 68, hp: 6360, local: 1281, localTrain: 58 },
  { id: "matsukura", name: "松倉城", kuni: "越中", faction: "shiina", lon: 137.435, lat: 36.815, koku: 54763, kokuMax: 61609, kokuCap: 68454, pop: 44906, food: 11500, def: 60, comm: 20, min: 70, hp: 6600, local: 1281, localTrain: 60 },
  { id: "uozu", name: "魚津城", kuni: "越中", faction: "shiina", lon: 137.404, lat: 36.827, koku: 42594, kokuMax: 47918, kokuCap: 53242, pop: 34927, food: 8945, def: 48, comm: 26, min: 70, hp: 5880, local: 997, localTrain: 58 },
  { id: "miyazaki_e", name: "宮崎城", kuni: "越中", faction: "shiina", lon: 137.545, lat: 36.955, koku: 30424, kokuMax: 34227, kokuCap: 38030, pop: 24948, food: 6389, def: 46, comm: 16, min: 68, hp: 5760, local: 712, localTrain: 56 },
  { id: "kasugayama", name: "春日山城", kuni: "越後", faction: "nagao", lon: 138.220, lat: 37.146, koku: 87533, kokuMax: 98474, kokuCap: 109416, pop: 71777, food: 18382, def: 70, comm: 46, min: 82, hp: 7200, local: 2048, localTrain: 70 },
  { id: "tochio", name: "栃尾城", kuni: "越後", faction: "nagao", lon: 138.960, lat: 37.470, koku: 40640, kokuMax: 45720, kokuCap: 50800, pop: 33325, food: 8534, def: 56, comm: 22, min: 78, hp: 6360, local: 951, localTrain: 66 },
  { id: "sanjo", name: "三条城", kuni: "越後", faction: "nagao", lon: 138.960, lat: 37.635, koku: 37514, kokuMax: 42203, kokuCap: 46892, pop: 30761, food: 7878, def: 48, comm: 28, min: 74, hp: 5880, local: 878, localTrain: 62 },
  { id: "yoita", name: "与板城", kuni: "越後", faction: "nagao", lon: 138.842, lat: 37.510, koku: 31262, kokuMax: 35169, kokuCap: 39077, pop: 25635, food: 6565, def: 50, comm: 24, min: 74, hp: 6000, local: 732, localTrain: 62 },
  { id: "shibata", name: "新発田城", kuni: "越後", faction: "agakita", lon: 139.328, lat: 37.951, koku: 43766, kokuMax: 49237, kokuCap: 54708, pop: 35888, food: 9191, def: 52, comm: 26, min: 70, hp: 6120, local: 1024, localTrain: 60 },
  { id: "murakami", name: "村上城", kuni: "越後", faction: "agakita", lon: 139.475, lat: 38.226, koku: 37514, kokuMax: 42203, kokuCap: 46892, pop: 30761, food: 7878, def: 56, comm: 20, min: 70, hp: 6360, local: 878, localTrain: 60 },
  { id: "negoshi", name: "根知城", kuni: "越後", faction: "nagao", lon: 137.885, lat: 37.020, koku: 25010, kokuMax: 28136, kokuCap: 31262, pop: 20508, food: 5252, def: 50, comm: 14, min: 72, hp: 6000, local: 585, localTrain: 60 },
  { id: "odawara", name: "小田原城", kuni: "相模", faction: "hojo", lon: 139.153, lat: 35.251, koku: 80830, kokuMax: 90934, kokuCap: 101038, pop: 66281, food: 16974, def: 76, comm: 58, min: 84, hp: 7560, local: 1891, localTrain: 70 },
  { id: "tamanawa", name: "玉縄城", kuni: "相模", faction: "hojo", lon: 139.517, lat: 35.336, koku: 31089, kokuMax: 34975, kokuCap: 38861, pop: 25493, food: 6529, def: 56, comm: 30, min: 76, hp: 6360, local: 727, localTrain: 64 },
  { id: "misaki", name: "三崎城", kuni: "相模", faction: "hojo", lon: 139.618, lat: 35.145, koku: 24871, kokuMax: 27980, kokuCap: 31089, pop: 20394, food: 5223, def: 50, comm: 28, min: 74, hp: 6000, local: 582, localTrain: 62 },
  { id: "tsukui", name: "津久井城", kuni: "相模", faction: "hojo", lon: 139.219, lat: 35.601, koku: 18653, kokuMax: 20984, kokuCap: 23316, pop: 15295, food: 3917, def: 54, comm: 18, min: 74, hp: 6240, local: 436, localTrain: 62 },
  { id: "edo", name: "江戸城", kuni: "武蔵", faction: "hojo", lon: 139.754, lat: 35.685, koku: 74718, kokuMax: 84058, kokuCap: 93398, pop: 61269, food: 15691, def: 52, comm: 44, min: 72, hp: 6120, local: 1748, localTrain: 62 },
  { id: "kawagoe", name: "川越城", kuni: "武蔵", faction: "hojo", lon: 139.487, lat: 35.925, koku: 85392, kokuMax: 96066, kokuCap: 106740, pop: 70021, food: 17932, def: 60, comm: 38, min: 72, hp: 6600, local: 1998, localTrain: 64 },
  { id: "takiyama", name: "滝山城", kuni: "武蔵", faction: "hojo", lon: 139.335, lat: 35.700, koku: 58707, kokuMax: 66046, kokuCap: 73384, pop: 48140, food: 12328, def: 54, comm: 24, min: 72, hp: 6240, local: 1374, localTrain: 62 },
  { id: "matsuyama_m", name: "松山城", kuni: "武蔵", faction: "hojo", lon: 139.400, lat: 36.030, koku: 53370, kokuMax: 60042, kokuCap: 66713, pop: 43763, food: 11208, def: 56, comm: 22, min: 70, hp: 6360, local: 1249, localTrain: 62 },
  { id: "iwatsuki", name: "岩付城", kuni: "武蔵", faction: "ota", lon: 139.657, lat: 35.917, koku: 69381, kokuMax: 78053, kokuCap: 86726, pop: 56892, food: 14570, def: 54, comm: 32, min: 74, hp: 6240, local: 1624, localTrain: 60 },
  { id: "oshi", name: "忍城", kuni: "武蔵", faction: "narita", lon: 139.457, lat: 36.140, koku: 64044, kokuMax: 72050, kokuCap: 80055, pop: 52516, food: 13449, def: 58, comm: 26, min: 76, hp: 6480, local: 1499, localTrain: 60 },
  { id: "hachigata", name: "鉢形城", kuni: "武蔵", faction: "uesugi_y", lon: 139.209, lat: 36.111, koku: 69381, kokuMax: 78053, kokuCap: 86726, pop: 56892, food: 14570, def: 60, comm: 24, min: 70, hp: 6600, local: 1624, localTrain: 60 },
  { id: "fukaya", name: "深谷城", kuni: "武蔵", faction: "uesugi_y", lon: 139.281, lat: 36.198, koku: 58707, kokuMax: 66046, kokuCap: 73384, pop: 48140, food: 12328, def: 48, comm: 22, min: 70, hp: 5880, local: 1374, localTrain: 58 },
  { id: "hirai", name: "平井城", kuni: "上野", faction: "uesugi_y", lon: 139.096, lat: 36.243, koku: 89348, kokuMax: 100516, kokuCap: 111684, pop: 73265, food: 18763, def: 58, comm: 30, min: 72, hp: 6480, local: 2091, localTrain: 60 },
  { id: "maebashi", name: "厩橋城", kuni: "上野", faction: "uesugi_y", lon: 139.061, lat: 36.389, koku: 95304, kokuMax: 107217, kokuCap: 119130, pop: 78149, food: 20014, def: 54, comm: 34, min: 72, hp: 6240, local: 2230, localTrain: 60 },
  { id: "minowa", name: "箕輪城", kuni: "上野", faction: "nagano_k", lon: 138.937, lat: 36.415, koku: 103246, kokuMax: 116152, kokuCap: 129058, pop: 84662, food: 21682, def: 64, comm: 28, min: 78, hp: 6840, local: 2416, localTrain: 64 },
  { id: "numata", name: "沼田城", kuni: "上野", faction: "uesugi_y", lon: 139.046, lat: 36.646, koku: 79420, kokuMax: 89348, kokuCap: 99275, pop: 65124, food: 16678, def: 56, comm: 22, min: 70, hp: 6360, local: 1858, localTrain: 60 },
  { id: "kanayama", name: "金山城", kuni: "上野", faction: "yura", lon: 139.372, lat: 36.313, koku: 87362, kokuMax: 98283, kokuCap: 109203, pop: 71637, food: 18346, def: 62, comm: 30, min: 72, hp: 6720, local: 2044, localTrain: 62 },
  { id: "utsunomiya", name: "宇都宮城", kuni: "下野", faction: "utsunomiya", lon: 139.884, lat: 36.556, koku: 101750, kokuMax: 114469, kokuCap: 127188, pop: 83435, food: 21368, def: 54, comm: 36, min: 72, hp: 6240, local: 2381, localTrain: 58 },
  { id: "karasawa", name: "唐沢山城", kuni: "下野", faction: "sano", lon: 139.616, lat: 36.375, koku: 83794, kokuMax: 94269, kokuCap: 104743, pop: 68711, food: 17597, def: 62, comm: 26, min: 72, hp: 6720, local: 1961, localTrain: 60 },
  { id: "karasuyama", name: "烏山城", kuni: "下野", faction: "nasu", lon: 140.152, lat: 36.657, koku: 71824, kokuMax: 80802, kokuCap: 89780, pop: 58896, food: 15083, def: 52, comm: 22, min: 70, hp: 6120, local: 1681, localTrain: 58 },
  { id: "mito", name: "水戸城", kuni: "常陸", faction: "edo_h", lon: 140.479, lat: 36.374, koku: 101762, kokuMax: 114482, kokuCap: 127202, pop: 83445, food: 21370, def: 52, comm: 34, min: 70, hp: 6120, local: 2381, localTrain: 58 },
  { id: "ota_hitachi", name: "常陸太田城", kuni: "常陸", faction: "satake", lon: 140.535, lat: 36.539, koku: 110242, kokuMax: 124022, kokuCap: 137802, pop: 90398, food: 23151, def: 58, comm: 30, min: 76, hp: 6480, local: 2580, localTrain: 62 },
  { id: "oda", name: "小田城", kuni: "常陸", faction: "oda_h", lon: 140.093, lat: 36.128, koku: 84802, kokuMax: 95402, kokuCap: 106002, pop: 69538, food: 17808, def: 50, comm: 30, min: 70, hp: 6000, local: 1984, localTrain: 56 },
  { id: "makabe", name: "真壁城", kuni: "常陸", faction: "satake", lon: 140.096, lat: 36.291, koku: 59361, kokuMax: 66781, kokuCap: 74201, pop: 48676, food: 12466, def: 48, comm: 22, min: 72, hp: 5880, local: 1389, localTrain: 58 },
  { id: "fuchu_hitachi", name: "常陸府中城", kuni: "常陸", faction: "edo_h", lon: 140.454, lat: 36.190, koku: 50881, kokuMax: 57241, kokuCap: 63601, pop: 41722, food: 10685, def: 46, comm: 28, min: 68, hp: 5760, local: 1191, localTrain: 56 },
  { id: "tateyama", name: "館山城", kuni: "安房", faction: "satomi", lon: 139.855, lat: 34.985, koku: 22342, kokuMax: 25135, kokuCap: 27928, pop: 18320, food: 4692, def: 52, comm: 34, min: 76, hp: 6120, local: 523, localTrain: 62 },
  { id: "kururi", name: "久留里城", kuni: "上総", faction: "satomi", lon: 140.085, lat: 35.290, koku: 90934, kokuMax: 102301, kokuCap: 113668, pop: 74566, food: 19096, def: 58, comm: 26, min: 74, hp: 6480, local: 2128, localTrain: 62 },
  { id: "otaki", name: "小田喜城", kuni: "上総", faction: "satomi", lon: 140.248, lat: 35.284, koku: 60622, kokuMax: 68200, kokuCap: 75778, pop: 49710, food: 12731, def: 52, comm: 20, min: 72, hp: 6120, local: 1419, localTrain: 60 },
  { id: "sanuki", name: "佐貫城", kuni: "上総", faction: "satomi", lon: 139.878, lat: 35.265, koku: 48498, kokuMax: 54561, kokuCap: 60623, pop: 39768, food: 10185, def: 50, comm: 24, min: 72, hp: 6000, local: 1135, localTrain: 60 },
  { id: "koga", name: "古河城", kuni: "下総", faction: "koga", lon: 139.699, lat: 36.191, koku: 69213, kokuMax: 77864, kokuCap: 86516, pop: 56755, food: 14535, def: 54, comm: 34, min: 70, hp: 6240, local: 1620, localTrain: 56 },
  { id: "yuki", name: "結城城", kuni: "下総", faction: "yuki", lon: 139.876, lat: 36.305, koku: 62921, kokuMax: 70786, kokuCap: 78651, pop: 51595, food: 13213, def: 52, comm: 30, min: 72, hp: 6120, local: 1472, localTrain: 58 },
  { id: "motosakura", name: "本佐倉城", kuni: "下総", faction: "chiba", lon: 140.276, lat: 35.732, koku: 69213, kokuMax: 77864, kokuCap: 86516, pop: 56755, food: 14535, def: 54, comm: 30, min: 72, hp: 6240, local: 1620, localTrain: 58 },
  { id: "usui", name: "臼井城", kuni: "下総", faction: "chiba", lon: 140.170, lat: 35.723, koku: 44045, kokuMax: 49550, kokuCap: 55056, pop: 36117, food: 9249, def: 50, comm: 24, min: 70, hp: 6000, local: 1031, localTrain: 56 },
  { id: "sekiyado", name: "関宿城", kuni: "下総", faction: "koga", lon: 139.795, lat: 36.070, koku: 44045, kokuMax: 49550, kokuCap: 55056, pop: 36117, food: 9249, def: 56, comm: 28, min: 70, hp: 6360, local: 1031, localTrain: 58 },
  { id: "sumoto", name: "洲本城", kuni: "淡路", faction: "miyoshi", lon: 134.900, lat: 34.336, koku: 27822, kokuMax: 31300, kokuCap: 34778, pop: 22814, food: 5843, def: 52, comm: 34, min: 70, hp: 6120, local: 651, localTrain: 60 },
  { id: "yura", name: "由良城", kuni: "淡路", faction: "miyoshi", lon: 134.972, lat: 34.271, koku: 12918, kokuMax: 14532, kokuCap: 16147, pop: 10593, food: 2713, def: 44, comm: 28, min: 68, hp: 5640, local: 302, localTrain: 58 },
  { id: "shozui", name: "勝瑞城", kuni: "阿波", faction: "miyoshi", lon: 134.516, lat: 34.113, koku: 52848, kokuMax: 59454, kokuCap: 66060, pop: 43335, food: 11098, def: 56, comm: 44, min: 74, hp: 6360, local: 1237, localTrain: 64 },
  { id: "ichinomiya", name: "一宮城", kuni: "阿波", faction: "miyoshi", lon: 134.478, lat: 34.048, koku: 32296, kokuMax: 36333, kokuCap: 40370, pop: 26483, food: 6782, def: 58, comm: 26, min: 70, hp: 6480, local: 756, localTrain: 62 },
  { id: "hakuchi", name: "白地城", kuni: "阿波", faction: "miyoshi", lon: 133.803, lat: 34.026, koku: 20552, kokuMax: 23121, kokuCap: 25690, pop: 16853, food: 4316, def: 50, comm: 18, min: 68, hp: 6000, local: 481, localTrain: 58 },
  { id: "ushiki", name: "牛岐城", kuni: "阿波", faction: "shingai", lon: 134.658, lat: 33.925, koku: 23488, kokuMax: 26424, kokuCap: 29360, pop: 19260, food: 4932, def: 46, comm: 30, min: 72, hp: 5760, local: 550, localTrain: 58 },
  { id: "sogo", name: "十河城", kuni: "讃岐", faction: "miyoshi", lon: 134.096, lat: 34.288, koku: 34326, kokuMax: 38617, kokuCap: 42908, pop: 28147, food: 7208, def: 52, comm: 32, min: 72, hp: 6120, local: 803, localTrain: 62 },
  { id: "hiketa", name: "引田城", kuni: "讃岐", faction: "miyoshi", lon: 134.402, lat: 34.226, koku: 20192, kokuMax: 22716, kokuCap: 25240, pop: 16557, food: 4240, def: 46, comm: 30, min: 70, hp: 5760, local: 472, localTrain: 58 },
  { id: "amagiri", name: "天霧城", kuni: "讃岐", faction: "kagawa", lon: 133.744, lat: 34.263, koku: 24230, kokuMax: 27259, kokuCap: 30288, pop: 19869, food: 5088, def: 54, comm: 26, min: 70, hp: 6240, local: 567, localTrain: 58 },
  { id: "yuzuki", name: "湯築城", kuni: "伊予", faction: "kono", lon: 132.786, lat: 33.844, koku: 76170, kokuMax: 85691, kokuCap: 95212, pop: 62459, food: 15996, def: 54, comm: 38, min: 72, hp: 6240, local: 1782, localTrain: 58 },
  { id: "kokubunyama", name: "国分山城", kuni: "伊予", faction: "kurushima", lon: 132.985, lat: 34.048, koku: 41014, kokuMax: 46141, kokuCap: 51268, pop: 33631, food: 8613, def: 50, comm: 34, min: 74, hp: 6000, local: 960, localTrain: 64 },
  { id: "itajima", name: "板島城", kuni: "伊予", faction: "saionji", lon: 132.566, lat: 33.220, koku: 41014, kokuMax: 46141, kokuCap: 51268, pop: 33631, food: 8613, def: 48, comm: 28, min: 70, hp: 5880, local: 960, localTrain: 58 },
  { id: "jizogatake", name: "地蔵ヶ岳城", kuni: "伊予", faction: "saionji", lon: 132.545, lat: 33.503, koku: 35155, kokuMax: 39550, kokuCap: 43944, pop: 28827, food: 7383, def: 52, comm: 22, min: 70, hp: 6120, local: 823, localTrain: 58 },
  { id: "kagomori", name: "河後森城", kuni: "伊予", faction: "kono", lon: 132.611, lat: 33.243, koku: 35155, kokuMax: 39550, kokuCap: 43944, pop: 28827, food: 7383, def: 50, comm: 20, min: 70, hp: 6000, local: 823, localTrain: 58 },
  { id: "kawanoe", name: "川之江城", kuni: "伊予", faction: "kono", lon: 133.559, lat: 34.008, koku: 29296, kokuMax: 32958, kokuCap: 36620, pop: 24023, food: 6152, def: 46, comm: 24, min: 68, hp: 5760, local: 686, localTrain: 56 },
  { id: "nakamura", name: "中村城", kuni: "土佐", faction: "ichijo", lon: 132.936, lat: 32.988, koku: 31424, kokuMax: 35352, kokuCap: 39280, pop: 25768, food: 6599, def: 52, comm: 40, min: 76, hp: 6120, local: 735, localTrain: 56 },
  { id: "okou", name: "岡豊城", kuni: "土佐", faction: "chosokabe", lon: 133.617, lat: 33.578, koku: 21997, kokuMax: 24746, kokuCap: 27496, pop: 18038, food: 4619, def: 54, comm: 24, min: 80, hp: 6240, local: 515, localTrain: 64 },
  { id: "aki", name: "安芸城", kuni: "土佐", faction: "aki", lon: 133.905, lat: 33.503, koku: 15712, kokuMax: 17676, kokuCap: 19640, pop: 12884, food: 3300, def: 48, comm: 22, min: 74, hp: 5880, local: 368, localTrain: 60 },
  { id: "gassan", name: "月山富田城", kuni: "出雲", faction: "amago", lon: 133.194, lat: 35.359, koku: 92578, kokuMax: 104151, kokuCap: 115723, pop: 75914, food: 19441, def: 76, comm: 46, min: 80, hp: 7560, local: 2166, localTrain: 68 },
  { id: "shiraga", name: "白鹿城", kuni: "出雲", faction: "amago", lon: 133.078, lat: 35.500, koku: 32850, kokuMax: 36957, kokuCap: 41063, pop: 26937, food: 6898, def: 58, comm: 24, min: 74, hp: 6480, local: 769, localTrain: 62 },
  { id: "yonago", name: "米子城", kuni: "伯耆", faction: "amago", lon: 133.328, lat: 35.427, koku: 27458, kokuMax: 30890, kokuCap: 34322, pop: 22516, food: 5766, def: 52, comm: 32, min: 70, hp: 6120, local: 643, localTrain: 60 },
  { id: "uyui", name: "羽衣石城", kuni: "伯耆", faction: "nanjo", lon: 133.995, lat: 35.434, koku: 22612, kokuMax: 25438, kokuCap: 28265, pop: 18542, food: 4749, def: 50, comm: 24, min: 70, hp: 6000, local: 529, localTrain: 58 },
  { id: "tottori", name: "鳥取城", kuni: "因幡", faction: "yamana", lon: 134.253, lat: 35.507, koku: 26904, kokuMax: 30267, kokuCap: 33630, pop: 22061, food: 5650, def: 62, comm: 34, min: 70, hp: 6720, local: 630, localTrain: 58 },
  { id: "wakasa", name: "若桜鬼ヶ城", kuni: "因幡", faction: "yamana", lon: 134.400, lat: 35.339, koku: 15576, kokuMax: 17523, kokuCap: 19470, pop: 12772, food: 3271, def: 56, comm: 20, min: 70, hp: 6360, local: 364, localTrain: 58 },
  { id: "shikano", name: "鹿野城", kuni: "因幡", faction: "yamana", lon: 134.078, lat: 35.446, koku: 11328, kokuMax: 12744, kokuCap: 14160, pop: 9289, food: 2379, def: 48, comm: 22, min: 68, hp: 5880, local: 265, localTrain: 56 },
  { id: "oki", name: "隠岐守護所", kuni: "隠岐", faction: "amago", lon: 133.320, lat: 36.202, koku: 2789, kokuMax: 3137, kokuCap: 3486, pop: 2287, food: 586, def: 36, comm: 16, min: 72, hp: 5160, local: 65, localTrain: 54 },
  { id: "tsuwano", name: "三本松城", kuni: "石見", faction: "yoshimi", lon: 131.769, lat: 34.469, koku: 30402, kokuMax: 34202, kokuCap: 38002, pop: 24930, food: 6384, def: 60, comm: 22, min: 74, hp: 6600, local: 711, localTrain: 60 },
  { id: "yamabuki", name: "山吹城", kuni: "石見", faction: "amago", lon: 132.437, lat: 35.106, koku: 21460, kokuMax: 24142, kokuCap: 26825, pop: 17597, food: 4507, def: 54, comm: 44, min: 70, hp: 6240, local: 502, localTrain: 58 },
  { id: "miyake", name: "三宅御土居", kuni: "石見", faction: "masuda", lon: 131.845, lat: 34.678, koku: 19671, kokuMax: 22130, kokuCap: 24589, pop: 16130, food: 4131, def: 48, comm: 30, min: 70, hp: 5880, local: 460, localTrain: 58 },
  { id: "takata_m", name: "高田城", kuni: "美作", faction: "amago", lon: 133.560, lat: 35.073, koku: 44644, kokuMax: 50224, kokuCap: 55805, pop: 36608, food: 9375, def: 54, comm: 26, min: 68, hp: 6240, local: 1045, localTrain: 60 },
  { id: "iwaya_m", name: "岩屋城", kuni: "美作", faction: "amago", lon: 134.056, lat: 35.104, koku: 32739, kokuMax: 36832, kokuCap: 40924, pop: 26846, food: 6875, def: 58, comm: 20, min: 68, hp: 6480, local: 766, localTrain: 60 },
  { id: "tenjinyama", name: "天神山城", kuni: "備前", faction: "uragami", lon: 134.109, lat: 34.867, koku: 60863, kokuMax: 68471, kokuCap: 76079, pop: 49908, food: 12781, def: 60, comm: 34, min: 70, hp: 6600, local: 1424, localTrain: 60 },
  { id: "ishiyama_bz", name: "岡山城", kuni: "備前", faction: "uragami", lon: 133.936, lat: 34.665, koku: 42962, kokuMax: 48333, kokuCap: 53703, pop: 35229, food: 9022, def: 50, comm: 42, min: 70, hp: 6000, local: 1005, localTrain: 58 },
  { id: "matsuyama_bc", name: "備中松山城", kuni: "備中", faction: "mimura", lon: 133.622, lat: 34.799, koku: 42463, kokuMax: 47771, kokuCap: 53079, pop: 34820, food: 8917, def: 68, comm: 28, min: 72, hp: 7080, local: 994, localTrain: 60 },
  { id: "sarukake", name: "猿掛城", kuni: "備中", faction: "shoo", lon: 133.663, lat: 34.653, koku: 25478, kokuMax: 28662, kokuCap: 31847, pop: 20892, food: 5350, def: 52, comm: 22, min: 70, hp: 6120, local: 596, localTrain: 58 },
  { id: "takamatsu_bc", name: "備中高松城", kuni: "備中", faction: "shimizu", lon: 133.849, lat: 34.723, koku: 22647, kokuMax: 25478, kokuCap: 28309, pop: 18571, food: 4756, def: 54, comm: 26, min: 74, hp: 6240, local: 530, localTrain: 58 },
  { id: "kannabe", name: "神辺城", kuni: "備後", faction: "ouchi", lon: 133.393, lat: 34.510, koku: 38719, kokuMax: 43559, kokuCap: 48399, pop: 31750, food: 8131, def: 56, comm: 30, min: 68, hp: 6360, local: 906, localTrain: 58 },
  { id: "mihara", name: "三原城", kuni: "備後", faction: "kobayakawa", lon: 133.078, lat: 34.399, koku: 35741, kokuMax: 40208, kokuCap: 44676, pop: 29308, food: 7506, def: 54, comm: 34, min: 74, hp: 6240, local: 836, localTrain: 62 },
  { id: "koriyama_a", name: "吉田郡山城", kuni: "安芸", faction: "mori", lon: 132.706, lat: 34.669, koku: 62128, kokuMax: 69894, kokuCap: 77660, pop: 50945, food: 13047, def: 64, comm: 32, min: 84, hp: 6840, local: 1454, localTrain: 68 },
  { id: "kanayama_a", name: "銀山城", kuni: "安芸", faction: "takeda_a", lon: 132.481, lat: 34.437, koku: 34170, kokuMax: 38442, kokuCap: 42713, pop: 28019, food: 7176, def: 56, comm: 30, min: 68, hp: 6360, local: 800, localTrain: 58 },
  { id: "sakurao", name: "桜尾城", kuni: "安芸", faction: "mori", lon: 132.293, lat: 34.354, koku: 27958, kokuMax: 31452, kokuCap: 34947, pop: 22926, food: 5871, def: 50, comm: 32, min: 76, hp: 6000, local: 654, localTrain: 62 },
  { id: "ouchi", name: "大内氏館", kuni: "周防", faction: "ouchi", lon: 131.480, lat: 34.170, koku: 56387, kokuMax: 63436, kokuCap: 70484, pop: 46237, food: 11841, def: 58, comm: 62, min: 74, hp: 6480, local: 1319, localTrain: 62 },
  { id: "takamine", name: "高嶺城", kuni: "周防", faction: "ouchi", lon: 131.470, lat: 34.184, koku: 29536, kokuMax: 33228, kokuCap: 36920, pop: 24220, food: 6203, def: 62, comm: 30, min: 72, hp: 6720, local: 691, localTrain: 62 },
  { id: "wakayama_s", name: "若山城", kuni: "周防", faction: "ouchi", lon: 131.807, lat: 34.045, koku: 26851, kokuMax: 30208, kokuCap: 33564, pop: 22018, food: 5639, def: 58, comm: 26, min: 70, hp: 6480, local: 628, localTrain: 60 },
  { id: "kuragake", name: "鞍掛城", kuni: "周防", faction: "ouchi", lon: 132.176, lat: 34.226, koku: 16110, kokuMax: 18124, kokuCap: 20138, pop: 13210, food: 3383, def: 50, comm: 20, min: 68, hp: 6000, local: 377, localTrain: 58 },
  { id: "katsuyama_n", name: "勝山城", kuni: "長門", faction: "ouchi", lon: 130.977, lat: 34.005, koku: 48083, kokuMax: 54094, kokuCap: 60104, pop: 39428, food: 10097, def: 54, comm: 36, min: 72, hp: 6240, local: 1125, localTrain: 60 },
  { id: "shimofuri", name: "霜降城", kuni: "長門", faction: "ouchi", lon: 131.281, lat: 34.019, koku: 25086, kokuMax: 28222, kokuCap: 31358, pop: 20571, food: 5268, def: 50, comm: 22, min: 70, hp: 6000, local: 587, localTrain: 58 },
  { id: "tachibanayama", name: "立花山城", kuni: "筑前", faction: "ouchi", lon: 130.472, lat: 33.703, koku: 80640, kokuMax: 90720, kokuCap: 100800, pop: 66125, food: 16934, def: 62, comm: 46, min: 70, hp: 6720, local: 1887, localTrain: 62 },
  { id: "iwaya", name: "岩屋城", kuni: "筑前", faction: "ouchi", lon: 130.523, lat: 33.531, koku: 53760, kokuMax: 60480, kokuCap: 67200, pop: 44083, food: 11290, def: 58, comm: 26, min: 68, hp: 6480, local: 1258, localTrain: 60 },
  { id: "akizuki", name: "秋月城", kuni: "筑前", faction: "akizuki", lon: 130.665, lat: 33.520, koku: 48384, kokuMax: 54432, kokuCap: 60480, pop: 39675, food: 10161, def: 54, comm: 26, min: 72, hp: 6240, local: 1132, localTrain: 58 },
  { id: "kokura", name: "小倉城", kuni: "豊前", faction: "ouchi", lon: 130.874, lat: 33.884, koku: 38080, kokuMax: 42840, kokuCap: 47600, pop: 31226, food: 7997, def: 52, comm: 40, min: 70, hp: 6120, local: 891, localTrain: 58 },
  { id: "umagatake", name: "馬ヶ岳城", kuni: "豊前", faction: "ouchi", lon: 130.907, lat: 33.658, koku: 26880, kokuMax: 30240, kokuCap: 33600, pop: 22042, food: 5645, def: 54, comm: 22, min: 68, hp: 6240, local: 629, localTrain: 58 },
  { id: "kurume", name: "久留米城", kuni: "筑後", faction: "otomo", lon: 130.508, lat: 33.320, koku: 46816, kokuMax: 52668, kokuCap: 58520, pop: 38389, food: 9831, def: 52, comm: 34, min: 70, hp: 6120, local: 1095, localTrain: 58 },
  { id: "yanagawa", name: "柳川城", kuni: "筑後", faction: "kamachi", lon: 130.407, lat: 33.163, koku: 51072, kokuMax: 57456, kokuCap: 63840, pop: 41879, food: 10725, def: 58, comm: 32, min: 72, hp: 6480, local: 1195, localTrain: 58 },
  { id: "funai", name: "府内館", kuni: "豊後", faction: "otomo", lon: 131.612, lat: 33.238, koku: 120474, kokuMax: 135534, kokuCap: 150593, pop: 98789, food: 25300, def: 58, comm: 62, min: 78, hp: 6480, local: 2819, localTrain: 64 },
  { id: "usuki", name: "丹生島城", kuni: "豊後", faction: "otomo", lon: 131.807, lat: 33.124, koku: 73623, kokuMax: 82826, kokuCap: 92029, pop: 60371, food: 15461, def: 62, comm: 40, min: 74, hp: 6720, local: 1723, localTrain: 62 },
  { id: "oka", name: "岡城", kuni: "豊後", faction: "shiga", lon: 131.398, lat: 32.960, koku: 60237, kokuMax: 67766, kokuCap: 75296, pop: 49394, food: 12650, def: 70, comm: 22, min: 74, hp: 7200, local: 1410, localTrain: 62 },
  { id: "saga", name: "村中城", kuni: "肥前", faction: "ryuzoji", lon: 130.298, lat: 33.245, koku: 54549, kokuMax: 61367, kokuCap: 68186, pop: 44730, food: 11455, def: 54, comm: 32, min: 72, hp: 6240, local: 1276, localTrain: 58 },
  { id: "kishitake", name: "岸岳城", kuni: "肥前", faction: "hata", lon: 130.043, lat: 33.421, koku: 39672, kokuMax: 44631, kokuCap: 49590, pop: 32531, food: 8331, def: 56, comm: 26, min: 70, hp: 6360, local: 928, localTrain: 58 },
  { id: "hirado", name: "平戸城", kuni: "肥前", faction: "matsura", lon: 129.554, lat: 33.368, koku: 39672, kokuMax: 44631, kokuCap: 49590, pop: 32531, food: 8331, def: 50, comm: 46, min: 74, hp: 6000, local: 928, localTrain: 60 },
  { id: "hinoe", name: "日野江城", kuni: "肥前", faction: "arima", lon: 130.234, lat: 32.734, koku: 39672, kokuMax: 44631, kokuCap: 49590, pop: 32531, food: 8331, def: 52, comm: 34, min: 72, hp: 6120, local: 928, localTrain: 58 },
  { id: "omura", name: "大村城", kuni: "肥前", faction: "omura", lon: 129.958, lat: 32.900, koku: 29754, kokuMax: 33473, kokuCap: 37192, pop: 24398, food: 6248, def: 48, comm: 32, min: 72, hp: 5880, local: 696, localTrain: 56 },
  { id: "kumamoto", name: "隈本城", kuni: "肥後", faction: "kikuchi", lon: 130.706, lat: 32.806, koku: 65514, kokuMax: 73704, kokuCap: 81893, pop: 53721, food: 13758, def: 54, comm: 34, min: 70, hp: 6240, local: 1533, localTrain: 58 },
  { id: "yatsushiro", name: "古麓城", kuni: "肥後", faction: "sagara", lon: 130.615, lat: 32.500, koku: 54595, kokuMax: 61420, kokuCap: 68244, pop: 44768, food: 11465, def: 52, comm: 30, min: 72, hp: 6120, local: 1278, localTrain: 58 },
  { id: "hitoyoshi", name: "人吉城", kuni: "肥後", faction: "sagara", lon: 130.760, lat: 32.209, koku: 60054, kokuMax: 67561, kokuCap: 75068, pop: 49244, food: 12611, def: 58, comm: 26, min: 80, hp: 6480, local: 1405, localTrain: 62 },
  { id: "sadowara", name: "佐土原城", kuni: "日向", faction: "ito", lon: 131.451, lat: 32.032, koku: 26900, kokuMax: 30262, kokuCap: 33625, pop: 22058, food: 5649, def: 54, comm: 30, min: 74, hp: 6240, local: 629, localTrain: 60 },
  { id: "tonokori", name: "都於郡城", kuni: "日向", faction: "ito", lon: 131.398, lat: 32.008, koku: 23057, kokuMax: 25939, kokuCap: 28821, pop: 18907, food: 4842, def: 58, comm: 24, min: 74, hp: 6480, local: 540, localTrain: 60 },
  { id: "agata", name: "県城", kuni: "日向", faction: "tsuchimochi", lon: 131.665, lat: 32.582, koku: 15371, kokuMax: 17293, kokuCap: 19214, pop: 12604, food: 3228, def: 50, comm: 22, min: 70, hp: 6000, local: 360, localTrain: 58 },
  { id: "obi", name: "飫肥城", kuni: "日向", faction: "shimazu", lon: 131.352, lat: 31.622, koku: 17293, kokuMax: 19454, kokuCap: 21616, pop: 14180, food: 3632, def: 62, comm: 26, min: 72, hp: 6720, local: 405, localTrain: 62 },
  { id: "uchijo", name: "内城", kuni: "薩摩", faction: "shimazu", lon: 130.556, lat: 31.596, koku: 117929, kokuMax: 132670, kokuCap: 147411, pop: 96702, food: 24765, def: 60, comm: 40, min: 82, hp: 6600, local: 2760, localTrain: 68 },
  { id: "izumi", name: "出水城", kuni: "薩摩", faction: "shimazu", lon: 130.353, lat: 32.090, koku: 54429, kokuMax: 61232, kokuCap: 68036, pop: 44632, food: 11430, def: 56, comm: 26, min: 76, hp: 6360, local: 1274, localTrain: 64 },
  { id: "kajiki", name: "加治木城", kuni: "大隅", faction: "shimazu", lon: 130.658, lat: 31.735, koku: 42014, kokuMax: 47265, kokuCap: 52517, pop: 34451, food: 8823, def: 52, comm: 28, min: 74, hp: 6120, local: 983, localTrain: 62 },
  { id: "shibushi", name: "志布志城", kuni: "大隅", faction: "shimazu", lon: 131.099, lat: 31.485, koku: 33611, kokuMax: 37813, kokuCap: 42014, pop: 27561, food: 7058, def: 56, comm: 26, min: 74, hp: 6360, local: 786, localTrain: 62 },
  { id: "iki", name: "壱岐覩城", kuni: "壱岐", faction: "matsura", lon: 129.720, lat: 33.770, koku: 7200, kokuMax: 8100, kokuCap: 9000, pop: 5904, food: 1512, def: 44, comm: 34, min: 72, hp: 5640, local: 168, localTrain: 58 },
  { id: "kanaishi", name: "金石城", kuni: "対馬", faction: "so", lon: 129.288, lat: 34.203, koku: 5600, kokuMax: 6300, kokuCap: 7000, pop: 4592, food: 1176, def: 46, comm: 40, min: 76, hp: 5760, local: 131, localTrain: 58 },
  { id: "yonezawa", name: "米沢城", kuni: "出羽", faction: "date", lon: 140.104, lat: 37.907, koku: 76320, kokuMax: 85860, kokuCap: 95400, pop: 62582, food: 16027, def: 62, comm: 40, min: 78, hp: 6720, local: 1786, localTrain: 64 },
  { id: "shiroishi", name: "白石城", kuni: "陸奥", faction: "date", lon: 140.620, lat: 38.004, koku: 66912, kokuMax: 75276, kokuCap: 83640, pop: 54868, food: 14052, def: 52, comm: 24, min: 74, hp: 6120, local: 1566, localTrain: 60 },
  { id: "watari", name: "亘理城", kuni: "陸奥", faction: "date", lon: 140.855, lat: 38.035, koku: 53530, kokuMax: 60221, kokuCap: 66912, pop: 43895, food: 11241, def: 50, comm: 26, min: 74, hp: 6000, local: 1253, localTrain: 60 },
  { id: "kurokawa", name: "会津黒川城", kuni: "陸奥", faction: "ashina", lon: 139.930, lat: 37.488, koku: 120442, kokuMax: 135498, kokuCap: 150553, pop: 98762, food: 25293, def: 66, comm: 44, min: 78, hp: 6960, local: 2818, localTrain: 62 },
  { id: "inawashiro", name: "猪苗代城", kuni: "陸奥", faction: "ashina", lon: 140.113, lat: 37.560, koku: 53530, kokuMax: 60221, kokuCap: 66912, pop: 43895, food: 11241, def: 56, comm: 20, min: 74, hp: 6360, local: 1253, localTrain: 60 },
  { id: "nihonmatsu", name: "二本松城", kuni: "陸奥", faction: "nihonmatsu", lon: 140.432, lat: 37.598, koku: 66912, kokuMax: 75276, kokuCap: 83640, pop: 54868, food: 14052, def: 58, comm: 26, min: 74, hp: 6480, local: 1566, localTrain: 60 },
  { id: "shirakawa", name: "白河小峰城", kuni: "陸奥", faction: "shirakawa", lon: 140.213, lat: 37.132, koku: 66912, kokuMax: 75276, kokuCap: 83640, pop: 54868, food: 14052, def: 56, comm: 28, min: 72, hp: 6360, local: 1566, localTrain: 58 },
  { id: "sukagawa", name: "須賀川城", kuni: "陸奥", faction: "nikaido", lon: 140.373, lat: 37.288, koku: 53530, kokuMax: 60221, kokuCap: 66912, pop: 43895, food: 11241, def: 52, comm: 26, min: 72, hp: 6120, local: 1253, localTrain: 58 },
  { id: "miharu", name: "三春城", kuni: "陸奥", faction: "tamura", lon: 140.492, lat: 37.442, koku: 53530, kokuMax: 60221, kokuCap: 66912, pop: 43895, food: 11241, def: 54, comm: 24, min: 74, hp: 6240, local: 1253, localTrain: 60 },
  { id: "soma", name: "相馬中村城", kuni: "陸奥", faction: "soma", lon: 140.919, lat: 37.797, koku: 66912, kokuMax: 75276, kokuCap: 83640, pop: 54868, food: 14052, def: 56, comm: 28, min: 78, hp: 6360, local: 1566, localTrain: 64 },
  { id: "iwadeyama", name: "岩出山城", kuni: "陸奥", faction: "osaki", lon: 140.887, lat: 38.700, koku: 80294, kokuMax: 90331, kokuCap: 100368, pop: 65841, food: 16862, def: 54, comm: 26, min: 72, hp: 6240, local: 1879, localTrain: 58 },
  { id: "sendai", name: "千代城", kuni: "陸奥", faction: "kokubun", lon: 140.856, lat: 38.252, koku: 53530, kokuMax: 60221, kokuCap: 66912, pop: 43895, food: 11241, def: 50, comm: 30, min: 72, hp: 6000, local: 1253, localTrain: 58 },
  { id: "teraike", name: "寺池城", kuni: "陸奥", faction: "kasai", lon: 141.198, lat: 38.685, koku: 66912, kokuMax: 75276, kokuCap: 83640, pop: 54868, food: 14052, def: 54, comm: 24, min: 72, hp: 6240, local: 1566, localTrain: 58 },
  { id: "yokota", name: "遠野横田城", kuni: "陸奥", faction: "abe", lon: 141.532, lat: 39.328, koku: 40147, kokuMax: 45166, kokuCap: 50184, pop: 32921, food: 8431, def: 50, comm: 20, min: 72, hp: 6000, local: 939, localTrain: 58 },
  { id: "sannohe", name: "三戸城", kuni: "陸奥", faction: "nanbu", lon: 141.264, lat: 40.386, koku: 120442, kokuMax: 135498, kokuCap: 150553, pop: 98762, food: 25293, def: 60, comm: 30, min: 76, hp: 6600, local: 2818, localTrain: 62 },
  { id: "kunohe", name: "九戸城", kuni: "陸奥", faction: "kunohe", lon: 141.301, lat: 40.271, koku: 66912, kokuMax: 75276, kokuCap: 83640, pop: 54868, food: 14052, def: 62, comm: 22, min: 74, hp: 6720, local: 1566, localTrain: 62 },
  { id: "kozukata", name: "不来方城", kuni: "陸奥", faction: "nanbu", lon: 141.155, lat: 39.700, koku: 53530, kokuMax: 60221, kokuCap: 66912, pop: 43895, food: 11241, def: 52, comm: 26, min: 72, hp: 6120, local: 1253, localTrain: 60 },
  { id: "kosuiji", name: "高水寺城", kuni: "陸奥", faction: "shiba", lon: 141.135, lat: 39.554, koku: 53530, kokuMax: 60221, kokuCap: 66912, pop: 43895, food: 11241, def: 52, comm: 22, min: 72, hp: 6120, local: 1253, localTrain: 58 },
  { id: "namioka", name: "浪岡城", kuni: "陸奥", faction: "namioka", lon: 140.611, lat: 40.702, koku: 40147, kokuMax: 45166, kokuCap: 50184, pop: 32921, food: 8431, def: 48, comm: 26, min: 74, hp: 5880, local: 939, localTrain: 56 },
  { id: "oura", name: "大浦城", kuni: "陸奥", faction: "oura", lon: 140.406, lat: 40.638, koku: 40147, kokuMax: 45166, kokuCap: 50184, pop: 32921, food: 8431, def: 50, comm: 22, min: 76, hp: 6000, local: 939, localTrain: 60 },
  { id: "yamagata", name: "山形城", kuni: "出羽", faction: "mogami", lon: 140.330, lat: 38.255, koku: 61056, kokuMax: 68688, kokuCap: 76320, pop: 50066, food: 12822, def: 58, comm: 38, min: 74, hp: 6480, local: 1429, localTrain: 60 },
  { id: "tendo", name: "天童城", kuni: "出羽", faction: "tendo", lon: 140.377, lat: 38.362, koku: 30528, kokuMax: 34344, kokuCap: 38160, pop: 25033, food: 6411, def: 52, comm: 24, min: 72, hp: 6120, local: 714, localTrain: 58 },
  { id: "ourayama", name: "尾浦城", kuni: "出羽", faction: "daihoji", lon: 139.833, lat: 38.700, koku: 35616, kokuMax: 40068, kokuCap: 44520, pop: 29205, food: 7479, def: 54, comm: 30, min: 74, hp: 6240, local: 833, localTrain: 60 },
  { id: "yokote", name: "横手城", kuni: "出羽", faction: "onodera", lon: 140.567, lat: 39.310, koku: 35616, kokuMax: 40068, kokuCap: 44520, pop: 29205, food: 7479, def: 56, comm: 24, min: 74, hp: 6360, local: 833, localTrain: 60 },
  { id: "minato", name: "湊城", kuni: "出羽", faction: "ando", lon: 140.107, lat: 39.756, koku: 25440, kokuMax: 28620, kokuCap: 31800, pop: 20861, food: 5342, def: 50, comm: 40, min: 74, hp: 6000, local: 595, localTrain: 58 },
  { id: "hiyama", name: "檜山城", kuni: "出羽", faction: "ando", lon: 140.083, lat: 40.155, koku: 35616, kokuMax: 40068, kokuCap: 44520, pop: 29205, food: 7479, def: 58, comm: 26, min: 76, hp: 6480, local: 833, localTrain: 62 },
  { id: "kawarada", name: "河原田城", kuni: "佐渡", faction: "honma", lon: 138.350, lat: 38.020, koku: 9537, kokuMax: 10729, kokuCap: 11921, pop: 7820, food: 2003, def: 46, comm: 30, min: 74, hp: 5760, local: 223, localTrain: 56 },
  { id: "matsumae", name: "徳山館", kuni: "蝦夷", faction: "kakizaki", lon: 140.108, lat: 41.430, koku: 16640, kokuMax: 18720, kokuCap: 20800, pop: 13645, food: 3494, def: 52, comm: 40, min: 76, hp: 6120, local: 389, localTrain: 58 },
  { id: "hakodate", name: "宇須岸館", kuni: "蝦夷", faction: "kakizaki", lon: 140.720, lat: 41.780, koku: 8320, kokuMax: 9360, kokuCap: 10400, pop: 6822, food: 1747, def: 44, comm: 34, min: 72, hp: 5640, local: 195, localTrain: 56 },
  { id: "esashi", name: "檜山館", kuni: "蝦夷", faction: "kakizaki", lon: 140.128, lat: 41.870, koku: 5760, kokuMax: 6480, kokuCap: 7200, pop: 4723, food: 1210, def: 44, comm: 36, min: 74, hp: 5640, local: 135, localTrain: 56 },
  { id: "oshamanbe", name: "長万部の砦", kuni: "蝦夷", faction: "ainu_w", lon: 140.380, lat: 42.515, koku: 3840, kokuMax: 4320, kokuCap: 4800, pop: 3149, food: 806, def: 38, comm: 20, min: 82, hp: 5280, local: 90, localTrain: 58 },
  { id: "otaru", name: "小樽内の砦", kuni: "蝦夷", faction: "ainu_w", lon: 141.000, lat: 43.190, koku: 4480, kokuMax: 5040, kokuCap: 5600, pop: 3674, food: 941, def: 40, comm: 26, min: 84, hp: 5400, local: 105, localTrain: 58 },
  { id: "ishikari", name: "石狩の砦", kuni: "蝦夷", faction: "ainu_w", lon: 141.350, lat: 43.230, koku: 5120, kokuMax: 5760, kokuCap: 6400, pop: 4198, food: 1075, def: 42, comm: 24, min: 86, hp: 5520, local: 120, localTrain: 60 },
  { id: "sizunai", name: "静内の砦", kuni: "蝦夷", faction: "ainu_e", lon: 142.370, lat: 42.335, koku: 4480, kokuMax: 5040, kokuCap: 5600, pop: 3674, food: 941, def: 46, comm: 18, min: 88, hp: 5760, local: 105, localTrain: 62 },
  { id: "kushiro", name: "釧路の砦", kuni: "蝦夷", faction: "ainu_e", lon: 144.383, lat: 42.985, koku: 3200, kokuMax: 3600, kokuCap: 4000, pop: 2624, food: 672, def: 38, comm: 20, min: 86, hp: 5280, local: 75, localTrain: 58 },
  { id: "nemuro", name: "根室の砦", kuni: "蝦夷", faction: "ainu_e", lon: 145.583, lat: 43.330, koku: 2560, kokuMax: 2880, kokuCap: 3200, pop: 2099, food: 538, def: 34, comm: 22, min: 86, hp: 5040, local: 60, localTrain: 56 },
  { id: "abashiri", name: "網走の砦", kuni: "蝦夷", faction: "ainu_n", lon: 144.270, lat: 44.020, koku: 2880, kokuMax: 3240, kokuCap: 3600, pop: 2362, food: 605, def: 36, comm: 18, min: 84, hp: 5160, local: 68, localTrain: 56 },
  { id: "soya", name: "宗谷の砦", kuni: "蝦夷", faction: "ainu_n", lon: 141.680, lat: 45.410, koku: 2240, kokuMax: 2520, kokuCap: 2800, pop: 1837, food: 470, def: 34, comm: 26, min: 84, hp: 5040, local: 53, localTrain: 56 },
  { id: "rumoi", name: "留萌の砦", kuni: "蝦夷", faction: "ainu_n", lon: 141.640, lat: 43.940, koku: 2560, kokuMax: 2880, kokuCap: 3200, pop: 2099, food: 538, def: 34, comm: 20, min: 84, hp: 5040, local: 60, localTrain: 56 },
  { id: "shurijo", name: "首里城", kuni: "琉球", faction: "ryukyu", lon: 127.719, lat: 26.217, koku: 41336, kokuMax: 46503, kokuCap: 51670, pop: 33896, food: 8681, def: 62, comm: 62, min: 84, hp: 6720, local: 967, localTrain: 56 },
  { id: "nakagusuku", name: "中城城", kuni: "琉球", faction: "ryukyu", lon: 127.797, lat: 26.286, koku: 17105, kokuMax: 19243, kokuCap: 21381, pop: 14026, food: 3592, def: 58, comm: 30, min: 80, hp: 6480, local: 400, localTrain: 56 },
  { id: "miyako", name: "宮古の砦", kuni: "琉球", faction: "ryukyu", lon: 125.281, lat: 24.805, koku: 8552, kokuMax: 9621, kokuCap: 10690, pop: 7013, food: 1796, def: 44, comm: 26, min: 78, hp: 5640, local: 200, localTrain: 54 },
];


// 湊・門前町・座。石高では計れぬ富がここにある。
// 尾張が石高以上の力を持ったのは、津島と熱田を押さえていたためである。
const TOWNS = [
  // ── 尾張・伊勢湾
  { id: "tsushima", name: "津島", kind: "商業都市", lon: 136.740, lat: 35.176, owner: "oda" },
  { id: "atsuta", name: "熱田", kind: "港", lon: 136.907, lat: 35.128, owner: "oda" },
  { id: "komaki", name: "小牧", kind: "町", lon: 136.928, lat: 35.290, owner: "ise" },
  { id: "nagashima_t", name: "長島願証寺", kind: "寺社", lon: 136.690, lat: 35.100, owner: null },
  { id: "kawanami", name: "川並衆", kind: "忍びの里", lon: 136.700, lat: 35.330, owner: null },
  // ── 伊勢・志摩
  { id: "kuwana_t", name: "桑名", kind: "港", lon: 136.690, lat: 35.062, owner: "kanbe" },
  { id: "ominato", name: "大湊", kind: "港", lon: 136.716, lat: 34.510, owner: "kitabatake" },
  { id: "yamada", name: "山田三方", kind: "寺社", lon: 136.720, lat: 34.487, owner: null },
  { id: "shima_kaizoku", name: "志摩海賊衆", kind: "水軍衆", lon: 136.845, lat: 34.480, owner: "kuki" },
  // ── 三河・遠江・駿河
  { id: "okazaki_t", name: "岡崎の市", kind: "町", lon: 137.170, lat: 34.955, owner: "matsudaira" },
  { id: "imagire", name: "今切の渡し", kind: "港", lon: 137.610, lat: 34.700, owner: "imagawa" },
  { id: "shimizu", name: "清水湊", kind: "港", lon: 138.490, lat: 35.020, owner: "imagawa" },
  { id: "fujisan", name: "富士浅間社", kind: "寺社", lon: 138.610, lat: 35.360, owner: null },
  // ── 近江・若狭・越前
  { id: "sakamoto_t", name: "坂本の市", kind: "商業都市", lon: 135.870, lat: 35.070, owner: "rokkaku" },
  { id: "otsu", name: "大津", kind: "港", lon: 135.865, lat: 35.010, owner: "rokkaku" },
  { id: "kaizu_t", name: "海津", kind: "港", lon: 136.040, lat: 35.400, owner: "azai" },
  { id: "obama", name: "小浜", kind: "港", lon: 135.745, lat: 35.495, owner: "wakasa" },
  { id: "tsuruga", name: "敦賀", kind: "港", lon: 136.065, lat: 35.645, owner: "asakura" },
  { id: "mikuni", name: "三国湊", kind: "港", lon: 136.150, lat: 36.215, owner: "asakura" },
  { id: "koga_shu", name: "甲賀衆", kind: "忍びの里", lon: 136.180, lat: 34.950, owner: null },
  { id: "ishiyama_monto", name: "石山門徒", kind: "寺社", lon: 135.720, lat: 34.985, owner: null },
  // ── 美濃・飛騨・信濃・甲斐
  { id: "kanou", name: "加納の市", kind: "商業都市", lon: 136.760, lat: 35.400, owner: "saito" },
  { id: "takayama_t", name: "飛騨の匠", kind: "町", lon: 137.255, lat: 36.145, owner: "anegakoji" },
  { id: "zenkoji", name: "善光寺", kind: "寺社", lon: 138.187, lat: 36.661, owner: null },
  { id: "kurokawa_kin", name: "黒川金山", kind: "鉱山", lon: 138.760, lat: 35.780, owner: "takeda" },
  { id: "ikuno", name: "土肥金山", kind: "鉱山", lon: 138.790, lat: 34.910, owner: "hojo" },
];


const GENERALS = [
  { id: "nobunaga", name: "織田信長", faction: "oda", lead: 96, valor: 82, wit: 97, gov: 98, loyal: 100, age: 12, at: "nagoya", retinue: 520, retTrain: 62 },
  { id: "nobuhide", name: "織田信秀", faction: "oda", lead: 82, valor: 78, wit: 72, gov: 80, loyal: 100, age: 35, at: "nagoya", lord: true, retinue: 620, retTrain: 70 },
  { id: "hirate", name: "平手政秀", faction: "oda", lead: 52, valor: 40, wit: 76, gov: 92, loyal: 96, age: 54, at: "nagoya", retinue: 220, retTrain: 54 },
  { id: "katsuie", name: "柴田勝家", faction: "oda", lead: 84, valor: 94, wit: 52, gov: 50, loyal: 72, age: 24, at: "shobata", retinue: 420, retTrain: 74 },
  { id: "nobumori", name: "佐久間信盛", faction: "oda", lead: 74, valor: 64, wit: 66, gov: 70, loyal: 84, age: 18, at: "nagoya", retinue: 360, retTrain: 64 },
  { id: "yoshinari", name: "森可成", faction: "oda", lead: 78, valor: 86, wit: 58, gov: 54, loyal: 88, age: 23, at: "shobata", retinue: 340, retTrain: 72 },
  { id: "hidesada", name: "林秀貞", faction: "oda", lead: 62, valor: 54, wit: 60, gov: 72, loyal: 66, age: 33, at: "nagoya", retinue: 280, retTrain: 56 },
  { id: "noritsugu", name: "山口教継", faction: "oda", lead: 66, valor: 68, wit: 66, gov: 56, loyal: 48, age: 40, at: "narumi", retinue: 300, retTrain: 60 },
  { id: "nobutomo", name: "織田信友", faction: "yamato", lead: 52, valor: 50, wit: 44, gov: 48, loyal: 100, age: 26, at: "kiyosu", lord: true, retinue: 420, retTrain: 58 },
  { id: "daizen", name: "坂井大膳", faction: "yamato", lead: 64, valor: 62, wit: 68, gov: 54, loyal: 80, age: 38, at: "kiyosu", retinue: 360, retTrain: 62 },
  { id: "yoichi", name: "河尻与一", faction: "yamato", lead: 56, valor: 64, wit: 44, gov: 44, loyal: 76, age: 29, at: "kiyosu", retinue: 260, retTrain: 58 },
  { id: "nobuyasu", name: "織田信安", faction: "ise", lead: 50, valor: 48, wit: 46, gov: 52, loyal: 100, age: 29, at: "iwakura", lord: true, retinue: 360, retTrain: 54 },
  { id: "morotoyo", name: "山内盛豊", faction: "ise", lead: 64, valor: 62, wit: 60, gov: 62, loyal: 82, age: 35, at: "iwakura", retinue: 280, retTrain: 60 },
  { id: "nobukiyo", name: "織田信清", faction: "ise", lead: 60, valor: 64, wit: 54, gov: 52, loyal: 70, age: 21, at: "inuyama", retinue: 300, retTrain: 60 },
  { id: "dosan", name: "斎藤道三", faction: "saito", lead: 84, valor: 68, wit: 95, gov: 90, loyal: 100, age: 52, at: "inabayama", lord: true, retinue: 760, retTrain: 74 },
  { id: "yoshitatsu", name: "斎藤義龍", faction: "saito", lead: 78, valor: 80, wit: 70, gov: 62, loyal: 52, age: 19, at: "inabayama", retinue: 560, retTrain: 70 },
  { id: "yoshimichi", name: "稲葉良通", faction: "saito", lead: 82, valor: 84, wit: 76, gov: 70, loyal: 78, age: 31, at: "ogaki", retinue: 460, retTrain: 72 },
  { id: "naomoto", name: "氏家直元", faction: "saito", lead: 74, valor: 72, wit: 68, gov: 68, loyal: 74, age: 34, at: "ogaki", retinue: 400, retTrain: 68 },
  { id: "morinari", name: "安藤守就", faction: "saito", lead: 70, valor: 66, wit: 72, gov: 62, loyal: 64, age: 43, at: "ogaki", retinue: 380, retTrain: 66 },
  { id: "shigemoto", name: "竹中重元", faction: "saito", lead: 66, valor: 56, wit: 82, gov: 72, loyal: 72, age: 36, at: "sunomata", retinue: 300, retTrain: 62 },
  { id: "hineno", name: "日根野弘就", faction: "saito", lead: 66, valor: 80, wit: 62, gov: 50, loyal: 70, age: 28, at: "inabayama", retinue: 320, retTrain: 66 },
  { id: "nagachika", name: "遠藤慶隆", faction: "saito", lead: 62, valor: 66, wit: 58, gov: 56, loyal: 68, age: 26, at: "gujo", retinue: 260, retTrain: 60 },
  { id: "kagetoshi", name: "遠山景任", faction: "saito", lead: 66, valor: 68, wit: 60, gov: 58, loyal: 60, age: 30, at: "iwamura", retinue: 280, retTrain: 62 },
  { id: "yoshimoto", name: "今川義元", faction: "imagawa", lead: 88, valor: 62, wit: 90, gov: 94, loyal: 100, age: 28, at: "sunpu", lord: true, retinue: 900, retTrain: 72 },
  { id: "sessai", name: "太原雪斎", faction: "imagawa", lead: 90, valor: 48, wit: 96, gov: 92, loyal: 98, age: 50, at: "sunpu", retinue: 420, retTrain: 70 },
  { id: "ujizane", name: "今川氏真", faction: "imagawa", lead: 48, valor: 44, wit: 50, gov: 58, loyal: 90, age: 9, at: "sunpu", retinue: 260, retTrain: 52 },
  { id: "ujitane", name: "朝比奈泰能", faction: "imagawa", lead: 76, valor: 72, wit: 66, gov: 68, loyal: 86, age: 40, at: "kakegawa", retinue: 520, retTrain: 68 },
  { id: "motonobu", name: "岡部元信", faction: "imagawa", lead: 78, valor: 82, wit: 62, gov: 56, loyal: 88, age: 32, at: "takatenjin", retinue: 460, retTrain: 70 },
  { id: "ujizumi", name: "鵜殿長照", faction: "imagawa", lead: 68, valor: 70, wit: 58, gov: 58, loyal: 80, age: 24, at: "yoshida", retinue: 380, retTrain: 64 },
  { id: "ienaga", name: "葛山氏元", faction: "imagawa", lead: 64, valor: 62, wit: 60, gov: 62, loyal: 74, age: 31, at: "kounkoji", retinue: 320, retTrain: 62 },
  { id: "naomori", name: "井伊直盛", faction: "imagawa", lead: 70, valor: 74, wit: 58, gov: 60, loyal: 66, age: 36, at: "hikuma", retinue: 340, retTrain: 64 },
  { id: "sadayoshi", name: "小原鎮実", faction: "imagawa", lead: 66, valor: 66, wit: 62, gov: 56, loyal: 78, age: 34, at: "nishio", retinue: 300, retTrain: 62 },
  { id: "yasutomo", name: "菅沼定盈", faction: "imagawa", lead: 62, valor: 68, wit: 56, gov: 54, loyal: 62, age: 22, at: "nagashino", retinue: 260, retTrain: 60 },
  { id: "masatsura", name: "戸田宣成", faction: "imagawa", lead: 60, valor: 64, wit: 54, gov: 56, loyal: 64, age: 38, at: "tahara", retinue: 280, retTrain: 58 },
  { id: "ujitoyo", name: "三浦氏満", faction: "imagawa", lead: 64, valor: 62, wit: 58, gov: 58, loyal: 76, age: 33, at: "futamata", retinue: 300, retTrain: 60 },
  { id: "tadatsugu", name: "天野景泰", faction: "imagawa", lead: 62, valor: 66, wit: 54, gov: 52, loyal: 70, age: 29, at: "inui", retinue: 240, retTrain: 58 },
  { id: "hirotada", name: "松平広忠", faction: "matsudaira", lead: 62, valor: 58, wit: 60, gov: 64, loyal: 100, age: 20, at: "okazaki", lord: true, retinue: 380, retTrain: 62 },
  { id: "torii_t", name: "鳥居忠吉", faction: "matsudaira", lead: 58, valor: 52, wit: 70, gov: 82, loyal: 96, age: 51, at: "okazaki", retinue: 380, retTrain: 62 },
  { id: "tadayoshi", name: "酒井忠尚", faction: "matsudaira", lead: 66, valor: 70, wit: 56, gov: 54, loyal: 70, age: 32, at: "okazaki", retinue: 280, retTrain: 62 },
  { id: "sadayoshi2", name: "石川清兼", faction: "matsudaira", lead: 64, valor: 58, wit: 66, gov: 70, loyal: 84, age: 41, at: "okazaki", retinue: 240, retTrain: 58 },
  { id: "nobumoto", name: "水野信元", faction: "mizuno", lead: 68, valor: 66, wit: 70, gov: 62, loyal: 100, age: 31, at: "kariya", lord: true, retinue: 420, retTrain: 62 },
  { id: "shingen", name: "武田晴信", faction: "takeda", lead: 96, valor: 76, wit: 94, gov: 92, loyal: 100, age: 25, at: "tsutsujigasaki", lord: true, retinue: 980, retTrain: 78 },
  { id: "nobushige", name: "武田信繁", faction: "takeda", lead: 86, valor: 78, wit: 80, gov: 84, loyal: 98, age: 20, at: "tsutsujigasaki", retinue: 520, retTrain: 74 },
  { id: "kansuke", name: "山本勘助", faction: "takeda", lead: 72, valor: 62, wit: 92, gov: 66, loyal: 92, age: 45, at: "tsutsujigasaki", retinue: 220, retTrain: 66 },
  { id: "nobukata", name: "板垣信方", faction: "takeda", lead: 82, valor: 80, wit: 70, gov: 72, loyal: 90, age: 47, at: "fukashi", retinue: 480, retTrain: 72 },
  { id: "toramasa", name: "甘利虎泰", faction: "takeda", lead: 78, valor: 78, wit: 66, gov: 68, loyal: 88, age: 46, at: "fukashi", retinue: 440, retTrain: 70 },
  { id: "masakage", name: "馬場信春", faction: "takeda", lead: 86, valor: 84, wit: 74, gov: 66, loyal: 92, age: 31, at: "takato", retinue: 420, retTrain: 76 },
  { id: "nobufusa", name: "飯富虎昌", faction: "takeda", lead: 82, valor: 88, wit: 62, gov: 58, loyal: 86, age: 42, at: "iwadono", retinue: 400, retTrain: 74 },
  { id: "masatoyo", name: "内藤昌豊", faction: "takeda", lead: 84, valor: 76, wit: 78, gov: 76, loyal: 90, age: 24, at: "komoro", retinue: 360, retTrain: 72 },
  { id: "nobutada", name: "小山田信有", faction: "takeda", lead: 68, valor: 70, wit: 62, gov: 60, loyal: 70, age: 34, at: "katsuyama_k", retinue: 300, retTrain: 64 },
  { id: "masashige", name: "秋山虎繁", faction: "takeda", lead: 76, valor: 74, wit: 72, gov: 62, loyal: 84, age: 19, at: "iida", retinue: 320, retTrain: 68 },
  { id: "yoshikiyo", name: "村上義清", faction: "murakami", lead: 86, valor: 88, wit: 66, gov: 62, loyal: 100, age: 45, at: "katsurao", lord: true, retinue: 620, retTrain: 72 },
  { id: "kiyoyoshi", name: "屋代政国", faction: "murakami", lead: 68, valor: 70, wit: 60, gov: 58, loyal: 76, age: 36, at: "toishi", retinue: 320, retTrain: 64 },
  { id: "naoyori", name: "清野清秀", faction: "murakami", lead: 64, valor: 66, wit: 58, gov: 56, loyal: 74, age: 32, at: "kaizu", retinue: 280, retTrain: 62 },
  { id: "ujiyasu", name: "北条氏康", faction: "hojo", lead: 94, valor: 78, wit: 92, gov: 96, loyal: 100, age: 31, at: "odawara", lord: true, retinue: 720, retTrain: 76 },
  { id: "tsunashige", name: "北条綱成", faction: "hojo", lead: 88, valor: 92, wit: 68, gov: 66, loyal: 96, age: 31, at: "shimoda", retinue: 480, retTrain: 76 },
  { id: "harutomo", name: "北畠晴具", faction: "kitabatake", lead: 74, valor: 66, wit: 76, gov: 80, loyal: 100, age: 43, at: "okochi", lord: true, retinue: 520, retTrain: 64 },
  { id: "tomonori", name: "北畠具教", faction: "kitabatake", lead: 78, valor: 86, wit: 70, gov: 68, loyal: 94, age: 18, at: "matsugashima", retinue: 420, retTrain: 68 },
  { id: "tomomori", name: "神戸具盛", faction: "kanbe", lead: 62, valor: 60, wit: 58, gov: 60, loyal: 100, age: 36, at: "kanbe", lord: true, retinue: 360, retTrain: 58 },
  { id: "ujiyoshi", name: "長野藤定", faction: "kanbe", lead: 64, valor: 62, wit: 60, gov: 58, loyal: 78, age: 32, at: "kuwana", retinue: 300, retTrain: 58 },
  { id: "shonyo", name: "証如", faction: "ikko", lead: 70, valor: 50, wit: 82, gov: 84, loyal: 100, age: 30, at: "nagashima", lord: true, retinue: 480, retTrain: 60 },
  { id: "sumitaka", name: "九鬼澄隆", faction: "kuki", lead: 70, valor: 74, wit: 68, gov: 58, loyal: 100, age: 24, at: "toba", lord: true, retinue: 320, retTrain: 66 },
  { id: "yoshikata", name: "六角義賢", faction: "rokkaku", lead: 76, valor: 70, wit: 74, gov: 78, loyal: 100, age: 25, at: "kannonji", lord: true, retinue: 700, retTrain: 66 },
  { id: "sadayori", name: "蒲生定秀", faction: "rokkaku", lead: 72, valor: 68, wit: 74, gov: 78, loyal: 88, age: 38, at: "kannonji", retinue: 380, retTrain: 64 },
  { id: "kagechika", name: "後藤賢豊", faction: "rokkaku", lead: 70, valor: 66, wit: 72, gov: 70, loyal: 84, age: 41, at: "sawayama", retinue: 340, retTrain: 62 },
  { id: "naotsune", name: "永原重興", faction: "rokkaku", lead: 64, valor: 62, wit: 60, gov: 62, loyal: 76, age: 34, at: "sakamoto", retinue: 300, retTrain: 60 },
  { id: "hisamasa", name: "浅井久政", faction: "azai", lead: 58, valor: 54, wit: 58, gov: 64, loyal: 100, age: 20, at: "odani", lord: true, retinue: 480, retTrain: 62 },
  { id: "naohiro", name: "海北綱親", faction: "azai", lead: 74, valor: 72, wit: 76, gov: 64, loyal: 88, age: 41, at: "odani", retinue: 320, retTrain: 66 },
  { id: "katsumasa", name: "磯野員昌", faction: "azai", lead: 78, valor: 84, wit: 62, gov: 58, loyal: 86, age: 23, at: "yamamotoyama", retinue: 300, retTrain: 68 },
  { id: "nobutoyo", name: "武田信豊", faction: "wakasa", lead: 60, valor: 58, wit: 56, gov: 60, loyal: 100, age: 32, at: "nochiseyama", lord: true, retinue: 340, retTrain: 56 },
  { id: "naganori", name: "粟屋勝久", faction: "wakasa", lead: 66, valor: 70, wit: 58, gov: 56, loyal: 70, age: 26, at: "kuniyoshi", retinue: 260, retTrain: 60 },
  { id: "takakage", name: "朝倉孝景", faction: "asakura", lead: 78, valor: 70, wit: 78, gov: 84, loyal: 100, age: 53, at: "ichijodani", lord: true, retinue: 760, retTrain: 68 },
  { id: "norikage", name: "朝倉宗滴", faction: "asakura", lead: 92, valor: 84, wit: 88, gov: 78, loyal: 98, age: 69, at: "kanegasaki", retinue: 520, retTrain: 76 },
  { id: "kagetaka", name: "朝倉景隆", faction: "asakura", lead: 70, valor: 68, wit: 64, gov: 66, loyal: 86, age: 34, at: "kitanosho", retinue: 400, retTrain: 64 },
  { id: "yoshiyori", name: "姉小路良頼", faction: "anegakoji", lead: 64, valor: 62, wit: 66, gov: 62, loyal: 100, age: 36, at: "matsukura_h", lord: true, retinue: 300, retTrain: 58 },
  { id: "nobuyuki", name: "織田信行", faction: "oda", lead: 58, valor: 56, wit: 54, gov: 62, loyal: 74, age: 10, at: "nagoya", retinue: 300, retTrain: 58 },
  { id: "nobumitsu", name: "織田信光", faction: "oda", lead: 74, valor: 78, wit: 64, gov: 60, loyal: 88, age: 30, at: "nagoya", retinue: 340, retTrain: 66 },
  { id: "nobutsugu", name: "織田信次", faction: "oda", lead: 62, valor: 64, wit: 56, gov: 54, loyal: 78, age: 26, at: "shobata", retinue: 240, retTrain: 60 },
  { id: "moritsugu", name: "毛利長秀", faction: "oda", lead: 66, valor: 70, wit: 58, gov: 56, loyal: 76, age: 16, at: "nagoya", retinue: 200, retTrain: 62 },
  { id: "iwamuro", name: "岩室重休", faction: "oda", lead: 60, valor: 66, wit: 54, gov: 50, loyal: 80, age: 20, at: "narumi", retinue: 180, retTrain: 60 },
  { id: "sadakatsu", name: "村井貞勝", faction: "oda", lead: 56, valor: 44, wit: 74, gov: 88, loyal: 86, age: 26, at: "nagoya", retinue: 160, retTrain: 54 },
  { id: "hidetaka", name: "佐久間盛重", faction: "oda", lead: 68, valor: 72, wit: 58, gov: 54, loyal: 82, age: 28, at: "narumi", retinue: 260, retTrain: 64 },
  { id: "kuroda", name: "簗田政綱", faction: "oda", lead: 64, valor: 62, wit: 78, gov: 60, loyal: 78, age: 29, at: "shobata", retinue: 200, retTrain: 60 },
  { id: "hidetoshi", name: "織田信康", faction: "yamato", lead: 54, valor: 58, wit: 48, gov: 46, loyal: 82, age: 32, at: "kiyosu", retinue: 220, retTrain: 56 },
  { id: "nobumasa", name: "織田寛近", faction: "ise", lead: 56, valor: 54, wit: 50, gov: 54, loyal: 80, age: 37, at: "inuyama", retinue: 240, retTrain: 56 },
  { id: "toshimasa", name: "長井道利", faction: "saito", lead: 72, valor: 74, wit: 66, gov: 60, loyal: 70, age: 29, at: "sunomata", retinue: 320, retTrain: 66 },
  { id: "kanamori", name: "金森長近", faction: "saito", lead: 70, valor: 68, wit: 70, gov: 74, loyal: 66, age: 22, at: "gujo", retinue: 240, retTrain: 64 },
  { id: "ujiie2", name: "不破光治", faction: "saito", lead: 68, valor: 66, wit: 66, gov: 64, loyal: 72, age: 26, at: "ogaki", retinue: 280, retTrain: 64 },
  { id: "takenaka2", name: "竹中重矩", faction: "saito", lead: 64, valor: 70, wit: 62, gov: 56, loyal: 74, age: 20, at: "sunomata", retinue: 220, retTrain: 62 },
  { id: "endo2", name: "遠藤盛数", faction: "saito", lead: 66, valor: 70, wit: 60, gov: 58, loyal: 68, age: 32, at: "gujo", retinue: 260, retTrain: 62 },
  { id: "toyama2", name: "遠山直廉", faction: "saito", lead: 64, valor: 66, wit: 58, gov: 58, loyal: 66, age: 27, at: "naegi", retinue: 240, retTrain: 60 },
  { id: "naotora", name: "井伊直虎", faction: "imagawa", lead: 66, valor: 48, wit: 76, gov: 78, loyal: 62, age: 11, at: "hikuma", retinue: 160, retTrain: 56 },
  { id: "ujizane2", name: "朝比奈泰朝", faction: "imagawa", lead: 74, valor: 76, wit: 62, gov: 60, loyal: 88, age: 16, at: "kakegawa", retinue: 340, retTrain: 66 },
  { id: "nobutsuna", name: "庵原忠胤", faction: "imagawa", lead: 68, valor: 66, wit: 64, gov: 66, loyal: 84, age: 34, at: "sunpu", retinue: 300, retTrain: 64 },
  { id: "motoyasu2", name: "松井宗信", faction: "imagawa", lead: 70, valor: 74, wit: 58, gov: 56, loyal: 82, age: 36, at: "futamata", retinue: 280, retTrain: 64 },
  { id: "sessai2", name: "瀬名氏俊", faction: "imagawa", lead: 66, valor: 64, wit: 62, gov: 62, loyal: 80, age: 30, at: "yoshida", retinue: 260, retTrain: 62 },
  { id: "okabe2", name: "岡部正綱", faction: "imagawa", lead: 70, valor: 72, wit: 62, gov: 60, loyal: 84, age: 14, at: "kounkoji", retinue: 240, retTrain: 64 },
  { id: "takane", name: "高天神小笠原", faction: "imagawa", lead: 66, valor: 70, wit: 58, gov: 56, loyal: 74, age: 31, at: "takatenjin", retinue: 260, retTrain: 62 },
  { id: "kiyoyasu", name: "松平信孝", faction: "matsudaira", lead: 66, valor: 70, wit: 58, gov: 56, loyal: 72, age: 29, at: "okazaki", retinue: 240, retTrain: 62 },
  { id: "motoyasu3", name: "松平康忠", faction: "matsudaira", lead: 62, valor: 66, wit: 56, gov: 58, loyal: 84, age: 21, at: "okazaki", retinue: 200, retTrain: 60 },
  { id: "nobuchika", name: "水野忠政", faction: "mizuno", lead: 66, valor: 62, wit: 66, gov: 68, loyal: 90, age: 54, at: "kariya", retinue: 280, retTrain: 60 },
  { id: "nobukado", name: "武田信廉", faction: "takeda", lead: 68, valor: 62, wit: 72, gov: 74, loyal: 94, age: 14, at: "tsutsujigasaki", retinue: 300, retTrain: 66 },
  { id: "torasada", name: "原虎胤", faction: "takeda", lead: 76, valor: 86, wit: 58, gov: 52, loyal: 88, age: 49, at: "fukashi", retinue: 340, retTrain: 72 },
  { id: "masatane", name: "原昌胤", faction: "takeda", lead: 72, valor: 66, wit: 80, gov: 70, loyal: 90, age: 15, at: "komoro", retinue: 260, retTrain: 68 },
  { id: "nobutomo2", name: "小幡虎盛", faction: "takeda", lead: 72, valor: 80, wit: 60, gov: 54, loyal: 86, age: 55, at: "takato", retinue: 300, retTrain: 70 },
  { id: "yamagata", name: "山県昌景", faction: "takeda", lead: 86, valor: 88, wit: 76, gov: 66, loyal: 92, age: 17, at: "iwadono", retinue: 280, retTrain: 74 },
  { id: "obu2", name: "曽根昌世", faction: "takeda", lead: 68, valor: 62, wit: 78, gov: 70, loyal: 84, age: 18, at: "iida", retinue: 220, retTrain: 66 },
  { id: "kojima", name: "小島権兵衛", faction: "murakami", lead: 64, valor: 72, wit: 54, gov: 50, loyal: 78, age: 28, at: "toishi", retinue: 260, retTrain: 62 },
  { id: "ide", name: "井上清政", faction: "murakami", lead: 66, valor: 68, wit: 58, gov: 56, loyal: 76, age: 34, at: "kaizu", retinue: 240, retTrain: 62 },
  { id: "kazama", name: "風魔小太郎", faction: "hojo", lead: 62, valor: 74, wit: 88, gov: 44, loyal: 90, age: 26, at: "shimoda", retinue: 160, retTrain: 68 },
  { id: "kizawa", name: "木造具政", faction: "kitabatake", lead: 66, valor: 64, wit: 62, gov: 62, loyal: 74, age: 26, at: "matsugashima", retinue: 280, retTrain: 60 },
  { id: "sakauchi", name: "坂内具房", faction: "kitabatake", lead: 62, valor: 60, wit: 58, gov: 60, loyal: 78, age: 24, at: "okochi", retinue: 240, retTrain: 58 },
  { id: "takigawa2", name: "関盛信", faction: "kanbe", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 76, age: 30, at: "kuwana", retinue: 260, retTrain: 58 },
  { id: "ganshoji", name: "願証寺証恵", faction: "ikko", lead: 66, valor: 46, wit: 78, gov: 80, loyal: 96, age: 34, at: "nagashima", retinue: 380, retTrain: 58 },
  { id: "shimozuma", name: "下間頼旦", faction: "ikko", lead: 70, valor: 64, wit: 72, gov: 66, loyal: 92, age: 31, at: "nagashima", retinue: 320, retTrain: 60 },
  { id: "gamou", name: "蒲生賢秀", faction: "rokkaku", lead: 72, valor: 70, wit: 68, gov: 72, loyal: 86, age: 12, at: "kannonji", retinue: 300, retTrain: 64 },
  { id: "mikumo", name: "三雲成持", faction: "rokkaku", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 80, age: 26, at: "sawayama", retinue: 260, retTrain: 62 },
  { id: "nagata", name: "永田景弘", faction: "rokkaku", lead: 62, valor: 60, wit: 62, gov: 64, loyal: 78, age: 32, at: "sakamoto", retinue: 240, retTrain: 60 },
  { id: "endo3", name: "遠藤直経", faction: "azai", lead: 70, valor: 78, wit: 72, gov: 56, loyal: 90, age: 21, at: "odani", retinue: 260, retTrain: 66 },
  { id: "akao", name: "赤尾清綱", faction: "azai", lead: 70, valor: 74, wit: 64, gov: 60, loyal: 92, age: 32, at: "odani", retinue: 280, retTrain: 66 },
  { id: "amenomori", name: "雨森弥兵衛", faction: "azai", lead: 66, valor: 70, wit: 60, gov: 56, loyal: 84, age: 26, at: "yamamotoyama", retinue: 220, retTrain: 64 },
  { id: "uryu", name: "逸見昌経", faction: "wakasa", lead: 64, valor: 66, wit: 58, gov: 54, loyal: 62, age: 24, at: "nochiseyama", retinue: 240, retTrain: 58 },
  { id: "kagetake", name: "朝倉景健", faction: "asakura", lead: 68, valor: 66, wit: 62, gov: 62, loyal: 84, age: 17, at: "kitanosho", retinue: 320, retTrain: 62 },
  { id: "yamazaki", name: "山崎吉家", faction: "asakura", lead: 74, valor: 72, wit: 70, gov: 66, loyal: 88, age: 30, at: "ichijodani", retinue: 340, retTrain: 66 },
  { id: "magara", name: "真柄直隆", faction: "asakura", lead: 66, valor: 90, wit: 48, gov: 44, loyal: 86, age: 22, at: "kanegasaki", retinue: 260, retTrain: 68 },
  { id: "ema", name: "江馬時盛", faction: "anegakoji", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 68, age: 38, at: "matsukura_h", retinue: 240, retTrain: 58 },
  { id: "yoshiteru", name: "足利義輝", faction: "ashikaga", lead: 76, valor: 84, wit: 70, gov: 66, loyal: 100, age: 10, at: "nijo", lord: true, retinue: 320, retTrain: 62 },
  { id: "fujitaka", name: "細川藤孝", faction: "ashikaga", lead: 76, valor: 68, wit: 84, gov: 86, loyal: 88, age: 12, at: "nijo", retinue: 220, retTrain: 62 },
  { id: "nagayoshi", name: "三好長慶", faction: "miyoshi", lead: 90, valor: 74, wit: 90, gov: 92, loyal: 100, age: 24, at: "akutagawa", lord: true, retinue: 900, retTrain: 72 },
  { id: "hisahide", name: "松永久秀", faction: "miyoshi", lead: 80, valor: 64, wit: 94, gov: 86, loyal: 52, age: 38, at: "shigisan", retinue: 480, retTrain: 66 },
  { id: "jikkyu", name: "三好実休", faction: "miyoshi", lead: 82, valor: 80, wit: 74, gov: 70, loyal: 94, age: 19, at: "kishiwada", retinue: 520, retTrain: 70 },
  { id: "fuyuyasu", name: "安宅冬康", faction: "miyoshi", lead: 76, valor: 74, wit: 72, gov: 70, loyal: 92, age: 18, at: "hanakuma", retinue: 380, retTrain: 66 },
  { id: "sogo", name: "十河一存", faction: "miyoshi", lead: 78, valor: 88, wit: 60, gov: 56, loyal: 92, age: 14, at: "takaya", retinue: 420, retTrain: 70 },
  { id: "masanaga", name: "三好政康", faction: "miyoshi", lead: 70, valor: 74, wit: 64, gov: 58, loyal: 84, age: 28, at: "shoryuji", retinue: 340, retTrain: 64 },
  { id: "nagayasu", name: "三好長逸", faction: "miyoshi", lead: 72, valor: 70, wit: 68, gov: 62, loyal: 86, age: 34, at: "itami", retinue: 360, retTrain: 64 },
  { id: "kennyo", name: "証如（本願寺）", faction: "honganji", lead: 74, valor: 50, wit: 86, gov: 88, loyal: 100, age: 30, at: "ishiyama", lord: true, retinue: 900, retTrain: 62 },
  { id: "raijun", name: "下間頼総", faction: "honganji", lead: 72, valor: 66, wit: 74, gov: 68, loyal: 94, age: 32, at: "ishiyama", retinue: 420, retTrain: 62 },
  { id: "kaga1", name: "杉浦玄任", faction: "kaga_ikko", lead: 70, valor: 68, wit: 72, gov: 64, loyal: 96, age: 34, at: "kanazawa", lord: true, retinue: 620, retTrain: 60 },
  { id: "kaga2", name: "七里頼周", faction: "kaga_ikko", lead: 66, valor: 62, wit: 74, gov: 66, loyal: 94, age: 31, at: "komatsu", retinue: 380, retTrain: 58 },
  { id: "junsho", name: "筒井順昭", faction: "tsutsui", lead: 72, valor: 68, wit: 70, gov: 70, loyal: 100, age: 24, at: "koriyama", lord: true, retinue: 460, retTrain: 60 },
  { id: "hanzo_iga", name: "百地丹波", faction: "iga", lead: 66, valor: 72, wit: 90, gov: 52, loyal: 100, age: 40, at: "ueno_iga", lord: true, retinue: 340, retTrain: 66 },
  { id: "magoichi", name: "鈴木佐大夫", faction: "saika", lead: 76, valor: 80, wit: 74, gov: 60, loyal: 100, age: 38, at: "saika", lord: true, retinue: 520, retTrain: 70 },
  { id: "saika2", name: "土橋守重", faction: "saika", lead: 70, valor: 74, wit: 68, gov: 58, loyal: 88, age: 32, at: "shingu", retinue: 300, retTrain: 64 },
  { id: "hideharu", name: "波多野秀忠", faction: "hatano", lead: 72, valor: 70, wit: 66, gov: 66, loyal: 100, age: 42, at: "yagami", lord: true, retinue: 480, retTrain: 60 },
  { id: "yoshiyuki", name: "一色義幸", faction: "isshiki", lead: 64, valor: 62, wit: 60, gov: 62, loyal: 100, age: 36, at: "miyazu", lord: true, retinue: 360, retTrain: 56 },
  { id: "suketoyo", name: "山名祐豊", faction: "yamana", lead: 66, valor: 62, wit: 64, gov: 68, loyal: 100, age: 35, at: "konosumi", lord: true, retinue: 420, retTrain: 56 },
  { id: "harumasa", name: "赤松晴政", faction: "akamatsu", lead: 62, valor: 60, wit: 58, gov: 62, loyal: 100, age: 33, at: "ojio", lord: true, retinue: 440, retTrain: 56 },
  { id: "shigemune", name: "別所就治", faction: "bessho", lead: 70, valor: 68, wit: 66, gov: 64, loyal: 100, age: 44, at: "miki", lord: true, retinue: 400, retTrain: 60 },
  { id: "yoshitsugu", name: "畠山義続", faction: "hatakeyama", lead: 62, valor: 58, wit: 60, gov: 64, loyal: 100, age: 28, at: "nanao", lord: true, retinue: 520, retTrain: 58 },
  { id: "nagatsuna", name: "長続連", faction: "hatakeyama", lead: 70, valor: 68, wit: 66, gov: 66, loyal: 84, age: 31, at: "nanao", retinue: 320, retTrain: 60 },
  { id: "nagamoto", name: "神保長職", faction: "jinbo", lead: 70, valor: 68, wit: 70, gov: 64, loyal: 100, age: 32, at: "toyama", lord: true, retinue: 420, retTrain: 60 },
  { id: "yasutane", name: "椎名康胤", faction: "shiina", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 100, age: 26, at: "matsukura", lord: true, retinue: 380, retTrain: 60 },
  { id: "kagetora", name: "長尾景虎", faction: "nagao", lead: 97, valor: 88, wit: 86, gov: 80, loyal: 100, age: 16, at: "kasugayama", lord: true, retinue: 880, retTrain: 78 },
  { id: "masakage_n", name: "柿崎景家", faction: "nagao", lead: 84, valor: 90, wit: 62, gov: 58, loyal: 92, age: 33, at: "tochio", retinue: 480, retTrain: 74 },
  { id: "kanetsugu0", name: "直江実綱", faction: "nagao", lead: 76, valor: 66, wit: 80, gov: 86, loyal: 94, age: 40, at: "yoita", retinue: 360, retTrain: 66 },
  { id: "harunaga", name: "本庄繁長", faction: "agakita", lead: 80, valor: 86, wit: 68, gov: 60, loyal: 64, age: 6, at: "murakami", lord: true, retinue: 340, retTrain: 68 },
  { id: "shigeie", name: "新発田綱貞", faction: "agakita", lead: 70, valor: 70, wit: 64, gov: 62, loyal: 72, age: 36, at: "shibata", retinue: 300, retTrain: 62 },
  { id: "sukemasa", name: "太田資正", faction: "ota", lead: 78, valor: 74, wit: 80, gov: 72, loyal: 100, age: 24, at: "iwatsuki", lord: true, retinue: 420, retTrain: 64 },
  { id: "nagayasu_n", name: "成田長泰", faction: "narita", lead: 68, valor: 66, wit: 64, gov: 66, loyal: 100, age: 31, at: "oshi", lord: true, retinue: 380, retTrain: 60 },
  { id: "norimasa", name: "上杉憲政", faction: "uesugi_y", lead: 58, valor: 54, wit: 56, gov: 62, loyal: 100, age: 23, at: "hirai", lord: true, retinue: 560, retTrain: 58 },
  { id: "narimasa_n", name: "長野業正", faction: "nagano_k", lead: 86, valor: 80, wit: 80, gov: 72, loyal: 100, age: 55, at: "minowa", lord: true, retinue: 520, retTrain: 68 },
  { id: "naritashige", name: "由良成繁", faction: "yura", lead: 70, valor: 68, wit: 70, gov: 66, loyal: 100, age: 40, at: "kanayama", lord: true, retinue: 420, retTrain: 62 },
  { id: "hirotsuna", name: "宇都宮広綱", faction: "utsunomiya", lead: 64, valor: 60, wit: 62, gov: 64, loyal: 100, age: 2, at: "utsunomiya", lord: true, retinue: 420, retTrain: 58 },
  { id: "masatsuna", name: "佐野昌綱", faction: "sano", lead: 72, valor: 74, wit: 66, gov: 60, loyal: 100, age: 17, at: "karasawa", lord: true, retinue: 400, retTrain: 62 },
  { id: "masasuke", name: "那須高資", faction: "nasu", lead: 68, valor: 70, wit: 62, gov: 58, loyal: 100, age: 29, at: "karasuyama", lord: true, retinue: 360, retTrain: 60 },
  { id: "michifusa", name: "江戸忠通", faction: "edo_h", lead: 66, valor: 64, wit: 62, gov: 62, loyal: 100, age: 38, at: "mito", lord: true, retinue: 380, retTrain: 58 },
  { id: "yoshiaki", name: "佐竹義昭", faction: "satake", lead: 78, valor: 70, wit: 78, gov: 76, loyal: 100, age: 16, at: "ota_hitachi", lord: true, retinue: 520, retTrain: 62 },
  { id: "ujiharu", name: "小田氏治", faction: "oda_h", lead: 56, valor: 66, wit: 50, gov: 54, loyal: 100, age: 13, at: "oda", lord: true, retinue: 380, retTrain: 56 },
  { id: "yoshitaka_s", name: "里見義堯", faction: "satomi", lead: 82, valor: 76, wit: 82, gov: 74, loyal: 100, age: 39, at: "tateyama", lord: true, retinue: 560, retTrain: 64 },
  { id: "yoshihiro", name: "里見義弘", faction: "satomi", lead: 76, valor: 80, wit: 68, gov: 64, loyal: 96, age: 16, at: "kururi", retinue: 380, retTrain: 64 },
  { id: "haruuji", name: "足利晴氏", faction: "koga", lead: 58, valor: 56, wit: 58, gov: 62, loyal: 100, age: 38, at: "koga", lord: true, retinue: 420, retTrain: 56 },
  { id: "masakatsu", name: "結城政勝", faction: "yuki", lead: 66, valor: 62, wit: 68, gov: 70, loyal: 100, age: 43, at: "yuki", lord: true, retinue: 400, retTrain: 58 },
  { id: "tanenobu", name: "千葉利胤", faction: "chiba", lead: 62, valor: 60, wit: 58, gov: 60, loyal: 100, age: 32, at: "motosakura", lord: true, retinue: 400, retTrain: 56 },
  { id: "ujinori2", name: "松田憲秀", faction: "hojo", lead: 68, valor: 64, wit: 70, gov: 72, loyal: 80, age: 31, at: "odawara", retinue: 320, retTrain: 62 },
  { id: "kagetora2", name: "大道寺政繁", faction: "hojo", lead: 74, valor: 70, wit: 72, gov: 74, loyal: 90, age: 13, at: "kawagoe", retinue: 300, retTrain: 66 },
  { id: "nagayori", name: "三好長虎", faction: "miyoshi", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 84, age: 30, at: "iimoriyama", retinue: 280, retTrain: 62 },
  { id: "junkoku", name: "筒井順国", faction: "tsutsui", lead: 64, valor: 62, wit: 60, gov: 62, loyal: 86, age: 28, at: "tamonyama", retinue: 240, retTrain: 58 },
  { id: "tedori", name: "玉置直和", faction: "saika", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 80, age: 31, at: "tetori", retinue: 220, retTrain: 58 },
  { id: "kameyama", name: "波多野元秀", faction: "hatano", lead: 66, valor: 66, wit: 62, gov: 60, loyal: 88, age: 22, at: "kameyama_t", retinue: 260, retTrain: 60 },
  { id: "yokoyama", name: "荻野直正", faction: "hatano", lead: 72, valor: 78, wit: 66, gov: 56, loyal: 72, age: 11, at: "yokoyama", retinue: 240, retTrain: 62 },
  { id: "takeda_t", name: "太田垣朝延", faction: "yamana", lead: 66, valor: 70, wit: 60, gov: 56, loyal: 82, age: 34, at: "takeda", retinue: 240, retTrain: 60 },
  { id: "himeji_k", name: "黒田重隆", faction: "akamatsu", lead: 70, valor: 62, wit: 78, gov: 80, loyal: 84, age: 38, at: "himeji", retinue: 260, retTrain: 60 },
  { id: "gochaku", name: "小寺政職", faction: "akamatsu", lead: 58, valor: 56, wit: 58, gov: 62, loyal: 80, age: 29, at: "goshaku", retinue: 240, retTrain: 56 },
  { id: "torigoe", name: "鈴木出羽守", faction: "kaga_ikko", lead: 68, valor: 70, wit: 66, gov: 58, loyal: 92, age: 36, at: "torigoe", retinue: 280, retTrain: 60 },
  { id: "suemori_n", name: "土肥親真", faction: "hatakeyama", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 78, age: 26, at: "suemori_n", retinue: 240, retTrain: 58 },
  { id: "masuyama", name: "寺島職定", faction: "jinbo", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 80, age: 32, at: "masuyama", retinue: 240, retTrain: 58 },
  { id: "uozu", name: "椎名康資", faction: "shiina", lead: 64, valor: 68, wit: 58, gov: 54, loyal: 84, age: 20, at: "uozu", retinue: 220, retTrain: 58 },
  { id: "miyazaki", name: "宮崎長康", faction: "shiina", lead: 62, valor: 64, wit: 56, gov: 54, loyal: 80, age: 36, at: "miyazaki_e", retinue: 200, retTrain: 56 },
  { id: "sanjo", name: "山吉豊守", faction: "nagao", lead: 70, valor: 68, wit: 66, gov: 66, loyal: 90, age: 18, at: "sanjo", retinue: 280, retTrain: 64 },
  { id: "nechi", name: "上杉景信", faction: "nagao", lead: 72, valor: 74, wit: 64, gov: 60, loyal: 88, age: 22, at: "negoshi", retinue: 260, retTrain: 64 },
  { id: "tamanawa", name: "北条綱高", faction: "hojo", lead: 76, valor: 80, wit: 64, gov: 60, loyal: 92, age: 38, at: "tamanawa", retinue: 320, retTrain: 68 },
  { id: "misaki", name: "朝比奈泰知", faction: "hojo", lead: 68, valor: 70, wit: 62, gov: 58, loyal: 84, age: 31, at: "misaki", retinue: 260, retTrain: 62 },
  { id: "tsukui", name: "内藤綱秀", faction: "hojo", lead: 70, valor: 72, wit: 64, gov: 60, loyal: 88, age: 34, at: "tsukui", retinue: 280, retTrain: 64 },
  { id: "edo_c", name: "遠山綱景", faction: "hojo", lead: 72, valor: 70, wit: 68, gov: 66, loyal: 90, age: 40, at: "edo", retinue: 300, retTrain: 64 },
  { id: "matsuyama_c", name: "上田朝直", faction: "hojo", lead: 68, valor: 66, wit: 66, gov: 64, loyal: 74, age: 28, at: "matsuyama_m", retinue: 280, retTrain: 62 },
  { id: "hachigata", name: "藤田康邦", faction: "uesugi_y", lead: 68, valor: 68, wit: 62, gov: 60, loyal: 76, age: 36, at: "hachigata", retinue: 280, retTrain: 60 },
  { id: "fukaya", name: "上杉憲賢", faction: "uesugi_y", lead: 62, valor: 60, wit: 58, gov: 60, loyal: 84, age: 32, at: "fukaya", retinue: 240, retTrain: 58 },
  { id: "numata", name: "沼田顕泰", faction: "uesugi_y", lead: 66, valor: 64, wit: 64, gov: 62, loyal: 72, age: 41, at: "numata", retinue: 260, retTrain: 60 },
  { id: "makabe", name: "真壁久幹", faction: "satake", lead: 74, valor: 84, wit: 62, gov: 56, loyal: 86, age: 24, at: "makabe", retinue: 280, retTrain: 66 },
  { id: "fuchu", name: "大掾慶幹", faction: "edo_h", lead: 64, valor: 62, wit: 60, gov: 60, loyal: 80, age: 30, at: "fuchu_hitachi", retinue: 240, retTrain: 58 },
  { id: "otaki", name: "正木時茂", faction: "satomi", lead: 78, valor: 84, wit: 68, gov: 60, loyal: 88, age: 33, at: "otaki", retinue: 320, retTrain: 68 },
  { id: "sanuki", name: "加藤信景", faction: "satomi", lead: 66, valor: 68, wit: 60, gov: 56, loyal: 84, age: 29, at: "sanuki", retinue: 240, retTrain: 60 },
  { id: "usui", name: "原胤貞", faction: "chiba", lead: 66, valor: 64, wit: 62, gov: 60, loyal: 84, age: 32, at: "usui", retinue: 240, retTrain: 58 },
  { id: "sekiyado", name: "簗田晴助", faction: "koga", lead: 72, valor: 70, wit: 72, gov: 68, loyal: 86, age: 22, at: "sekiyado", retinue: 300, retTrain: 62 },
  { id: "iwanari", name: "岩成友通", faction: "miyoshi", lead: 70, valor: 72, wit: 68, gov: 62, loyal: 84, age: 26, at: "shoryuji", retinue: 300, retTrain: 64 },
  { id: "yasumasa2", name: "篠原長房", faction: "miyoshi", lead: 76, valor: 70, wit: 80, gov: 78, loyal: 90, age: 25, at: "kishiwada", retinue: 340, retTrain: 66 },
  { id: "shimozuma2", name: "下間頼廉", faction: "honganji", lead: 78, valor: 72, wit: 78, gov: 70, loyal: 96, age: 9, at: "ishiyama", retinue: 320, retTrain: 64 },
  { id: "kaga3", name: "本折慶誾", faction: "kaga_ikko", lead: 66, valor: 64, wit: 68, gov: 62, loyal: 90, age: 30, at: "kanazawa", retinue: 300, retTrain: 58 },
  { id: "iga2", name: "藤林長門", faction: "iga", lead: 64, valor: 70, wit: 88, gov: 50, loyal: 96, age: 36, at: "ueno_iga", retinue: 300, retTrain: 64 },
  { id: "iga3", name: "下柘植木猿", faction: "iga", lead: 60, valor: 74, wit: 80, gov: 46, loyal: 92, age: 26, at: "ueno_iga", retinue: 220, retTrain: 64 },
  { id: "akamatsu2", name: "宇野政頼", faction: "akamatsu", lead: 64, valor: 64, wit: 60, gov: 58, loyal: 78, age: 34, at: "ojio", retinue: 260, retTrain: 58 },
  { id: "bessho2", name: "別所安治", faction: "bessho", lead: 66, valor: 66, wit: 62, gov: 60, loyal: 90, age: 8, at: "miki", retinue: 240, retTrain: 58 },
  { id: "hatakeyama2", name: "遊佐続光", faction: "hatakeyama", lead: 66, valor: 64, wit: 70, gov: 66, loyal: 62, age: 32, at: "nanao", retinue: 280, retTrain: 58 },
  { id: "jinbo2", name: "小島職鎮", faction: "jinbo", lead: 68, valor: 72, wit: 62, gov: 56, loyal: 82, age: 28, at: "toyama", retinue: 260, retTrain: 60 },
  { id: "nagao2", name: "斎藤朝信", faction: "nagao", lead: 80, valor: 76, wit: 78, gov: 72, loyal: 92, age: 19, at: "kasugayama", retinue: 360, retTrain: 70 },
  { id: "nagao3", name: "宇佐美定満", faction: "nagao", lead: 78, valor: 68, wit: 86, gov: 70, loyal: 88, age: 57, at: "tochio", retinue: 300, retTrain: 68 },
  { id: "nagao4", name: "北条高広", faction: "nagao", lead: 74, valor: 76, wit: 66, gov: 60, loyal: 58, age: 29, at: "yoita", retinue: 320, retTrain: 66 },
  { id: "agakita2", name: "色部勝長", faction: "agakita", lead: 72, valor: 74, wit: 64, gov: 60, loyal: 74, age: 33, at: "shibata", retinue: 280, retTrain: 62 },
  { id: "hojo_a", name: "北条幻庵", faction: "hojo", lead: 70, valor: 60, wit: 84, gov: 82, loyal: 96, age: 53, at: "odawara", retinue: 280, retTrain: 64 },
  { id: "hojo_b", name: "笠原信為", faction: "hojo", lead: 68, valor: 64, wit: 70, gov: 72, loyal: 88, age: 41, at: "odawara", retinue: 260, retTrain: 62 },
  { id: "hojo_c", name: "富永直勝", faction: "hojo", lead: 72, valor: 76, wit: 64, gov: 58, loyal: 88, age: 32, at: "edo", retinue: 280, retTrain: 64 },
  { id: "uesugi2", name: "長尾憲景", faction: "uesugi_y", lead: 66, valor: 66, wit: 62, gov: 60, loyal: 80, age: 26, at: "hirai", retinue: 280, retTrain: 60 },
  { id: "satake2", name: "小野崎昭通", faction: "satake", lead: 68, valor: 68, wit: 64, gov: 64, loyal: 84, age: 31, at: "ota_hitachi", retinue: 280, retTrain: 60 },
  { id: "satake3", name: "和田昭為", faction: "satake", lead: 66, valor: 60, wit: 74, gov: 74, loyal: 88, age: 16, at: "ota_hitachi", retinue: 240, retTrain: 60 },
  { id: "satomi2", name: "正木時忠", faction: "satomi", lead: 72, valor: 76, wit: 66, gov: 58, loyal: 80, age: 30, at: "tateyama", retinue: 300, retTrain: 64 },
  { id: "utsunomiya2", name: "芳賀高定", faction: "utsunomiya", lead: 70, valor: 66, wit: 74, gov: 70, loyal: 88, age: 34, at: "utsunomiya", retinue: 280, retTrain: 60 },
  { id: "nasu2", name: "大関高増", faction: "nasu", lead: 66, valor: 68, wit: 66, gov: 60, loyal: 70, age: 19, at: "karasuyama", retinue: 260, retTrain: 60 },
  { id: "oda2", name: "菅谷政貞", faction: "oda_h", lead: 70, valor: 72, wit: 66, gov: 60, loyal: 92, age: 28, at: "oda", retinue: 280, retTrain: 60 },
  { id: "yuki2", name: "水谷正村", faction: "yuki", lead: 72, valor: 76, wit: 66, gov: 60, loyal: 84, age: 25, at: "yuki", retinue: 280, retTrain: 62 },
  { id: "chiba2", name: "原胤清", faction: "chiba", lead: 64, valor: 62, wit: 62, gov: 62, loyal: 82, age: 46, at: "motosakura", retinue: 260, retTrain: 58 },
  { id: "koga2", name: "簗田持助", faction: "koga", lead: 66, valor: 64, wit: 66, gov: 64, loyal: 84, age: 40, at: "koga", retinue: 260, retTrain: 58 },
  { id: "imagawa_x", name: "三浦義就", faction: "imagawa", lead: 66, valor: 66, wit: 62, gov: 60, loyal: 82, age: 32, at: "kakegawa", retinue: 260, retTrain: 62 },
  { id: "imagawa_y", name: "由比正信", faction: "imagawa", lead: 64, valor: 62, wit: 60, gov: 62, loyal: 84, age: 36, at: "sunpu", retinue: 240, retTrain: 60 },
  { id: "takeda_x", name: "跡部勝資", faction: "takeda", lead: 64, valor: 58, wit: 72, gov: 74, loyal: 86, age: 21, at: "tsutsujigasaki", retinue: 240, retTrain: 64 },
  { id: "takeda_y", name: "駒井高白斎", faction: "takeda", lead: 62, valor: 54, wit: 78, gov: 76, loyal: 90, age: 48, at: "tsutsujigasaki", retinue: 200, retTrain: 62 },
  { id: "saito_x", name: "日比野清実", faction: "saito", lead: 66, valor: 72, wit: 58, gov: 54, loyal: 74, age: 31, at: "inabayama", retinue: 260, retTrain: 62 },
  { id: "saito_y", name: "堀田道空", faction: "saito", lead: 58, valor: 50, wit: 72, gov: 76, loyal: 80, age: 44, at: "inabayama", retinue: 180, retTrain: 56 },
  { id: "oda_x", name: "佐々隼人正", faction: "oda", lead: 66, valor: 74, wit: 56, gov: 52, loyal: 84, age: 22, at: "nagoya", retinue: 220, retTrain: 64 },
  { id: "oda_y", name: "丹羽氏勝", faction: "oda", lead: 64, valor: 66, wit: 58, gov: 58, loyal: 78, age: 24, at: "shobata", retinue: 220, retTrain: 60 },
  { id: "rokkaku2", name: "進藤賢盛", faction: "rokkaku", lead: 68, valor: 64, wit: 70, gov: 70, loyal: 84, age: 36, at: "kannonji", retinue: 280, retTrain: 60 },
  { id: "azai2", name: "田那部与左衛門", faction: "azai", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 80, age: 30, at: "odani", retinue: 240, retTrain: 60 },
  { id: "asakura2", name: "魚住景固", faction: "asakura", lead: 68, valor: 66, wit: 64, gov: 62, loyal: 84, age: 28, at: "kitanosho", retinue: 280, retTrain: 60 },
  { id: "kitabatake2", name: "大河内御所", faction: "kitabatake", lead: 64, valor: 62, wit: 62, gov: 62, loyal: 80, age: 26, at: "okochi", retinue: 260, retTrain: 58 },
  { id: "wakasa2", name: "武藤友益", faction: "wakasa", lead: 62, valor: 64, wit: 58, gov: 54, loyal: 66, age: 24, at: "nochiseyama", retinue: 220, retTrain: 58 },
  { id: "murakami2", name: "須田信正", faction: "murakami", lead: 66, valor: 68, wit: 60, gov: 58, loyal: 78, age: 29, at: "katsurao", retinue: 260, retTrain: 62 },
  { id: "anegakoji2", name: "三木良頼", faction: "anegakoji", lead: 64, valor: 64, wit: 62, gov: 62, loyal: 72, age: 34, at: "matsukura_h", retinue: 240, retTrain: 58 },
  { id: "kanbe2", name: "神戸利盛", faction: "kanbe", lead: 62, valor: 60, wit: 58, gov: 58, loyal: 84, age: 26, at: "kanbe", retinue: 240, retTrain: 58 },
  { id: "kuki2", name: "小浜景隆", faction: "kuki", lead: 70, valor: 72, wit: 66, gov: 56, loyal: 80, age: 18, at: "toba", retinue: 220, retTrain: 66 },
  { id: "ikko2", name: "服部友貞", faction: "ikko", lead: 68, valor: 70, wit: 66, gov: 58, loyal: 86, age: 28, at: "nagashima", retinue: 280, retTrain: 60 },
  { id: "matsudaira2", name: "植村家存", faction: "matsudaira", lead: 64, valor: 72, wit: 56, gov: 54, loyal: 90, age: 25, at: "okazaki", retinue: 200, retTrain: 62 },
  { id: "mizuno2", name: "水野信近", faction: "mizuno", lead: 62, valor: 64, wit: 58, gov: 58, loyal: 88, age: 21, at: "kariya", retinue: 220, retTrain: 58 },
  { id: "isshiki2", name: "延永春信", faction: "isshiki", lead: 62, valor: 62, wit: 58, gov: 58, loyal: 80, age: 32, at: "miyazu", retinue: 240, retTrain: 56 },
  { id: "yamana2", name: "垣屋続成", faction: "yamana", lead: 66, valor: 66, wit: 62, gov: 60, loyal: 78, age: 36, at: "konosumi", retinue: 260, retTrain: 58 },
  { id: "ashikaga2", name: "三淵藤英", faction: "ashikaga", lead: 70, valor: 68, wit: 70, gov: 70, loyal: 92, age: 20, at: "nijo", retinue: 240, retTrain: 60 },
  { id: "narita2", name: "成田長忠", faction: "narita", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 86, age: 16, at: "oshi", retinue: 240, retTrain: 58 },
  { id: "ota_x", name: "太田資顕", faction: "ota", lead: 66, valor: 66, wit: 64, gov: 62, loyal: 80, age: 28, at: "iwatsuki", retinue: 260, retTrain: 60 },
  { id: "sano2", name: "佐野豊綱", faction: "sano", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 82, age: 36, at: "karasawa", retinue: 260, retTrain: 60 },
  { id: "motonari", name: "毛利元就", faction: "mori", lead: 96, valor: 72, wit: 98, gov: 92, loyal: 100, age: 49, at: "koriyama_a", lord: true, retinue: 620, retTrain: 72 },
  { id: "takamoto", name: "毛利隆元", faction: "mori", lead: 72, valor: 66, wit: 70, gov: 78, loyal: 98, age: 22, at: "koriyama_a", retinue: 380, retTrain: 66 },
  { id: "motoharu", name: "吉川元春", faction: "mori", lead: 88, valor: 90, wit: 76, gov: 66, loyal: 98, age: 16, at: "sakurao", retinue: 340, retTrain: 72 },
  { id: "takakage_k", name: "小早川隆景", faction: "kobayakawa", lead: 90, valor: 72, wit: 94, gov: 88, loyal: 96, age: 13, at: "mihara", lord: true, retinue: 420, retTrain: 70 },
  { id: "motokiyo", name: "福原貞俊", faction: "mori", lead: 74, valor: 70, wit: 72, gov: 70, loyal: 92, age: 28, at: "koriyama_a", retinue: 300, retTrain: 66 },
  { id: "harukata_m", name: "志道広良", faction: "mori", lead: 68, valor: 58, wit: 80, gov: 82, loyal: 94, age: 79, at: "koriyama_a", retinue: 220, retTrain: 60 },
  { id: "motonobu_k", name: "熊谷信直", faction: "mori", lead: 74, valor: 78, wit: 66, gov: 60, loyal: 86, age: 39, at: "sakurao", retinue: 280, retTrain: 66 },
  { id: "yoshitaka_o", name: "大内義隆", faction: "ouchi", lead: 70, valor: 58, wit: 74, gov: 84, loyal: 100, age: 39, at: "ouchi", lord: true, retinue: 900, retTrain: 62 },
  { id: "harukata", name: "陶晴賢", faction: "ouchi", lead: 84, valor: 86, wit: 74, gov: 64, loyal: 42, age: 25, at: "wakayama_s", retinue: 620, retTrain: 70 },
  { id: "takafusa", name: "内藤興盛", faction: "ouchi", lead: 74, valor: 70, wit: 70, gov: 70, loyal: 86, age: 51, at: "katsuyama_n", retinue: 420, retTrain: 64 },
  { id: "okifusa", name: "杉重矩", faction: "ouchi", lead: 70, valor: 70, wit: 66, gov: 64, loyal: 60, age: 41, at: "takamine", retinue: 380, retTrain: 62 },
  { id: "hironari", name: "相良武任", faction: "ouchi", lead: 56, valor: 44, wit: 76, gov: 84, loyal: 88, age: 48, at: "ouchi", retinue: 200, retTrain: 56 },
  { id: "nagafusa", name: "冷泉隆豊", faction: "ouchi", lead: 76, valor: 80, wit: 66, gov: 62, loyal: 96, age: 33, at: "takamine", retinue: 340, retTrain: 66 },
  { id: "haruhisa", name: "尼子晴久", faction: "amago", lead: 80, valor: 72, wit: 74, gov: 72, loyal: 100, age: 32, at: "gassan", lord: true, retinue: 860, retTrain: 68 },
  { id: "kunihisa", name: "尼子国久", faction: "amago", lead: 78, valor: 82, wit: 66, gov: 60, loyal: 58, age: 54, at: "shiraga", retinue: 440, retTrain: 68 },
  { id: "makoto", name: "本城常光", faction: "amago", lead: 72, valor: 76, wit: 64, gov: 58, loyal: 68, age: 30, at: "yamabuki", retinue: 300, retTrain: 64 },
  { id: "hisayuki", name: "宇山久兼", faction: "amago", lead: 70, valor: 68, wit: 66, gov: 66, loyal: 90, age: 41, at: "gassan", retinue: 320, retTrain: 62 },
  { id: "ujihisa", name: "尼子誠久", faction: "amago", lead: 72, valor: 78, wit: 60, gov: 56, loyal: 56, age: 28, at: "shiraga", retinue: 340, retTrain: 66 },
  { id: "takanobu_y", name: "米原綱寛", faction: "amago", lead: 70, valor: 72, wit: 64, gov: 58, loyal: 84, age: 22, at: "yonago", retinue: 300, retTrain: 62 },
  { id: "munekage", name: "浦上宗景", faction: "uragami", lead: 74, valor: 68, wit: 76, gov: 70, loyal: 100, age: 21, at: "tenjinyama", lord: true, retinue: 520, retTrain: 62 },
  { id: "masamune_u", name: "浦上政宗", faction: "uragami", lead: 68, valor: 62, wit: 66, gov: 64, loyal: 60, age: 34, at: "ishiyama_bz", retinue: 380, retTrain: 60 },
  { id: "iemichi", name: "三村家親", faction: "mimura", lead: 74, valor: 72, wit: 70, gov: 66, loyal: 100, age: 29, at: "matsuyama_bc", lord: true, retinue: 460, retTrain: 62 },
  { id: "takamoto_s", name: "庄高資", faction: "shoo", lead: 66, valor: 66, wit: 62, gov: 60, loyal: 100, age: 31, at: "sarukake", lord: true, retinue: 340, retTrain: 60 },
  { id: "hisatsuna", name: "石川久智", faction: "shimizu", lead: 64, valor: 62, wit: 60, gov: 60, loyal: 100, age: 26, at: "takamatsu_bc", lord: true, retinue: 300, retTrain: 58 },
  { id: "masayori", name: "南条宗勝", faction: "nanjo", lead: 68, valor: 66, wit: 66, gov: 64, loyal: 100, age: 28, at: "uyui", lord: true, retinue: 340, retTrain: 60 },
  { id: "masayori_y", name: "吉見正頼", faction: "yoshimi", lead: 72, valor: 70, wit: 68, gov: 66, loyal: 100, age: 33, at: "tsuwano", lord: true, retinue: 380, retTrain: 62 },
  { id: "fujikane", name: "益田藤兼", faction: "masuda", lead: 68, valor: 66, wit: 66, gov: 66, loyal: 100, age: 17, at: "miyake", lord: true, retinue: 340, retTrain: 60 },
  { id: "nobuzane", name: "武田信実", faction: "takeda_a", lead: 64, valor: 68, wit: 58, gov: 56, loyal: 100, age: 26, at: "kanayama_a", lord: true, retinue: 360, retTrain: 60 },
  { id: "kunichika", name: "長宗我部国親", faction: "chosokabe", lead: 82, valor: 78, wit: 84, gov: 74, loyal: 100, age: 42, at: "okou", lord: true, retinue: 480, retTrain: 66 },
  { id: "kanetsugu_i", name: "一条房基", faction: "ichijo", lead: 64, valor: 60, wit: 64, gov: 70, loyal: 100, age: 24, at: "nakamura", lord: true, retinue: 520, retTrain: 58 },
  { id: "michinao", name: "河野通宣", faction: "kono", lead: 64, valor: 60, wit: 62, gov: 64, loyal: 100, age: 22, at: "yuzuki", lord: true, retinue: 460, retTrain: 58 },
  { id: "michiyasu", name: "村上通康", faction: "kurushima", lead: 78, valor: 80, wit: 74, gov: 60, loyal: 90, age: 28, at: "kokubunyama", lord: true, retinue: 340, retTrain: 70 },
  { id: "kinhiro", name: "西園寺公広", faction: "saionji", lead: 62, valor: 58, wit: 64, gov: 68, loyal: 100, age: 9, at: "itajima", retinue: 320, retTrain: 56 },
  { id: "kunitora", name: "安芸国虎", faction: "aki", lead: 70, valor: 72, wit: 64, gov: 58, loyal: 100, age: 16, at: "aki", lord: true, retinue: 360, retTrain: 62 },
  { id: "yukikage", name: "香川之景", faction: "kagawa", lead: 68, valor: 68, wit: 64, gov: 62, loyal: 100, age: 24, at: "amagiri", lord: true, retinue: 340, retTrain: 60 },
  { id: "shozui", name: "篠原自遁", faction: "miyoshi", lead: 66, valor: 64, wit: 68, gov: 64, loyal: 86, age: 26, at: "shozui", retinue: 320, retTrain: 62 },
  { id: "yoshishige", name: "大友義鎮", faction: "otomo", lead: 78, valor: 66, wit: 82, gov: 84, loyal: 100, age: 16, at: "funai", lord: true, retinue: 820, retTrain: 64 },
  { id: "dosetsu", name: "立花道雪", faction: "otomo", lead: 92, valor: 86, wit: 86, gov: 72, loyal: 98, age: 33, at: "funai", retinue: 420, retTrain: 74 },
  { id: "shigetane", name: "吉弘鑑理", faction: "otomo", lead: 76, valor: 74, wit: 70, gov: 68, loyal: 94, age: 28, at: "usuki", retinue: 360, retTrain: 66 },
  { id: "akitsura", name: "志賀親守", faction: "shiga", lead: 70, valor: 68, wit: 68, gov: 68, loyal: 100, age: 36, at: "oka", lord: true, retinue: 340, retTrain: 62 },
  { id: "chikazane", name: "蒲池鑑盛", faction: "kamachi", lead: 74, valor: 74, wit: 68, gov: 66, loyal: 100, age: 26, at: "yanagawa", lord: true, retinue: 400, retTrain: 62 },
  { id: "tanezane", name: "秋月文種", faction: "akizuki", lead: 70, valor: 72, wit: 64, gov: 60, loyal: 100, age: 32, at: "akizuki", lord: true, retinue: 340, retTrain: 60 },
  { id: "takanobu_r", name: "龍造寺隆信", faction: "ryuzoji", lead: 84, valor: 84, wit: 78, gov: 68, loyal: 100, age: 17, at: "saga", lord: true, retinue: 420, retTrain: 64 },
  { id: "iesada", name: "波多親", faction: "hata", lead: 64, valor: 64, wit: 60, gov: 58, loyal: 100, age: 21, at: "kishitake", lord: true, retinue: 300, retTrain: 58 },
  { id: "takanobu_m", name: "松浦隆信", faction: "matsura", lead: 74, valor: 70, wit: 76, gov: 68, loyal: 100, age: 17, at: "hirado", lord: true, retinue: 380, retTrain: 62 },
  { id: "harusumi", name: "有馬晴純", faction: "arima", lead: 70, valor: 66, wit: 70, gov: 68, loyal: 100, age: 63, at: "hinoe", lord: true, retinue: 340, retTrain: 60 },
  { id: "sumitada", name: "大村純忠", faction: "omura", lead: 64, valor: 60, wit: 68, gov: 66, loyal: 100, age: 13, at: "omura", lord: true, retinue: 280, retTrain: 58 },
  { id: "yoshitake", name: "菊池義武", faction: "kikuchi", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 100, age: 41, at: "kumamoto", lord: true, retinue: 380, retTrain: 58 },
  { id: "yoriharu", name: "相良晴広", faction: "sagara", lead: 70, valor: 66, wit: 72, gov: 72, loyal: 100, age: 33, at: "hitoyoshi", lord: true, retinue: 420, retTrain: 62 },
  { id: "yoshisuke", name: "伊東義祐", faction: "ito", lead: 70, valor: 64, wit: 70, gov: 70, loyal: 100, age: 34, at: "sadowara", lord: true, retinue: 460, retTrain: 60 },
  { id: "chikanari", name: "土持親成", faction: "tsuchimochi", lead: 64, valor: 64, wit: 60, gov: 58, loyal: 100, age: 26, at: "agata", lord: true, retinue: 280, retTrain: 58 },
  { id: "takahisa", name: "島津貴久", faction: "shimazu", lead: 88, valor: 78, wit: 86, gov: 86, loyal: 100, age: 32, at: "uchijo", lord: true, retinue: 760, retTrain: 70 },
  { id: "yoshihisa", name: "島津義久", faction: "shimazu", lead: 86, valor: 74, wit: 88, gov: 88, loyal: 98, age: 13, at: "uchijo", retinue: 320, retTrain: 68 },
  { id: "yoshihiro_s", name: "島津義弘", faction: "shimazu", lead: 90, valor: 94, wit: 80, gov: 68, loyal: 98, age: 11, at: "izumi", retinue: 300, retTrain: 72 },
  { id: "toshihisa", name: "島津歳久", faction: "shimazu", lead: 78, valor: 76, wit: 82, gov: 72, loyal: 96, age: 9, at: "kajiki", retinue: 260, retTrain: 68 },
  { id: "tadamoto", name: "新納忠元", faction: "shimazu", lead: 78, valor: 84, wit: 68, gov: 62, loyal: 94, age: 20, at: "obi", retinue: 320, retTrain: 70 },
  { id: "shigehisa", name: "伊集院忠朗", faction: "shimazu", lead: 74, valor: 72, wit: 70, gov: 68, loyal: 92, age: 46, at: "uchijo", retinue: 300, retTrain: 64 },
  { id: "yoshishige_s", name: "宗晴康", faction: "so", lead: 64, valor: 62, wit: 68, gov: 66, loyal: 100, age: 54, at: "kanaishi", lord: true, retinue: 260, retTrain: 58 },
  { id: "w_atagi", name: "安宅冬康（洲本）", faction: "miyoshi", lead: 76, valor: 74, wit: 72, gov: 70, loyal: 92, age: 18, at: "sumoto", retinue: 340, retTrain: 64 },
  { id: "w_ichinomiya", name: "一宮成祐", faction: "miyoshi", lead: 68, valor: 70, wit: 62, gov: 58, loyal: 72, age: 28, at: "ichinomiya", retinue: 280, retTrain: 60 },
  { id: "w_hakuchi", name: "大西覚養", faction: "miyoshi", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 70, age: 26, at: "hakuchi", retinue: 240, retTrain: 58 },
  { id: "motozane", name: "新開元実", faction: "shingai", lead: 68, valor: 70, wit: 66, gov: 66, loyal: 100, age: 52, at: "ushiki", lord: true, retinue: 320, retTrain: 62 },
  { id: "saneteru", name: "新開実綱", faction: "shingai", lead: 72, valor: 76, wit: 68, gov: 60, loyal: 96, age: 30, at: "ushiki", retinue: 260, retTrain: 64 },
  { id: "shingai3", name: "新開忠之", faction: "shingai", lead: 62, valor: 66, wit: 58, gov: 56, loyal: 92, age: 8, at: "ushiki", retinue: 140, retTrain: 58 },
  { id: "w_hiketa", name: "矢野国村", faction: "miyoshi", lead: 64, valor: 64, wit: 60, gov: 58, loyal: 78, age: 32, at: "hiketa", retinue: 240, retTrain: 58 },
  { id: "w_jizogatake", name: "宇都宮豊綱", faction: "saionji", lead: 66, valor: 66, wit: 62, gov: 60, loyal: 74, age: 24, at: "jizogatake", retinue: 280, retTrain: 58 },
  { id: "w_kagomori", name: "渡辺教忠", faction: "kono", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 76, age: 29, at: "kagomori", retinue: 240, retTrain: 58 },
  { id: "w_kawanoe", name: "妻鳥采女", faction: "kono", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 74, age: 31, at: "kawanoe", retinue: 220, retTrain: 56 },
  { id: "w_tottori", name: "武田高信", faction: "yamana", lead: 70, valor: 72, wit: 66, gov: 58, loyal: 58, age: 21, at: "tottori", retinue: 360, retTrain: 60 },
  { id: "w_wakasa_o", name: "矢部暹涼", faction: "yamana", lead: 64, valor: 64, wit: 60, gov: 58, loyal: 78, age: 34, at: "wakasa", retinue: 260, retTrain: 58 },
  { id: "w_shikano", name: "鹿野安芸守", faction: "yamana", lead: 62, valor: 62, wit: 58, gov: 56, loyal: 76, age: 30, at: "shikano", retinue: 220, retTrain: 56 },
  { id: "w_oki", name: "隠岐為清", faction: "amago", lead: 60, valor: 62, wit: 58, gov: 56, loyal: 80, age: 36, at: "oki", retinue: 180, retTrain: 54 },
  { id: "w_takada", name: "三浦貞広", faction: "amago", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 70, age: 16, at: "takata_m", retinue: 300, retTrain: 60 },
  { id: "w_iwaya_m2", name: "中村則治", faction: "amago", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 74, age: 32, at: "iwaya_m", retinue: 260, retTrain: 58 },
  { id: "w_kannabe", name: "杉原理興", faction: "ouchi", lead: 68, valor: 68, wit: 64, gov: 62, loyal: 72, age: 36, at: "kannabe", retinue: 300, retTrain: 60 },
  { id: "w_kuragake", name: "杉隆泰", faction: "ouchi", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 70, age: 28, at: "kuragake", retinue: 260, retTrain: 58 },
  { id: "w_tachibana", name: "立花鑑載", faction: "ouchi", lead: 68, valor: 70, wit: 62, gov: 58, loyal: 60, age: 26, at: "tachibanayama", retinue: 320, retTrain: 60 },
  { id: "w_iwaya_c2", name: "高橋鑑種", faction: "ouchi", lead: 72, valor: 72, wit: 70, gov: 64, loyal: 58, age: 22, at: "iwaya", retinue: 300, retTrain: 62 },
  { id: "w_ogura", name: "杉興運", faction: "ouchi", lead: 66, valor: 66, wit: 62, gov: 60, loyal: 80, age: 34, at: "kokura", retinue: 280, retTrain: 58 },
  { id: "w_umagatake", name: "長野助盛", faction: "ouchi", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 78, age: 31, at: "umagatake", retinue: 260, retTrain: 58 },
  { id: "w_kurume", name: "問注所鑑豊", faction: "otomo", lead: 64, valor: 64, wit: 62, gov: 62, loyal: 84, age: 32, at: "kurume", retinue: 260, retTrain: 58 },
  { id: "w_iki", name: "松浦盛", faction: "matsura", lead: 62, valor: 64, wit: 60, gov: 58, loyal: 84, age: 28, at: "iki", retinue: 200, retTrain: 58 },
  { id: "w_furumoto", name: "名和行直", faction: "sagara", lead: 64, valor: 64, wit: 62, gov: 62, loyal: 80, age: 30, at: "yatsushiro", retinue: 260, retTrain: 58 },
  { id: "w_tonokori", name: "伊東祐吉", faction: "ito", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 88, age: 16, at: "tonokori", retinue: 280, retTrain: 60 },
  { id: "harumune", name: "伊達晴宗", faction: "date", lead: 78, valor: 72, wit: 76, gov: 74, loyal: 100, age: 27, at: "yonezawa", lord: true, retinue: 680, retTrain: 64 },
  { id: "moniwa", name: "茂庭良直", faction: "date", lead: 72, valor: 74, wit: 66, gov: 64, loyal: 92, age: 33, at: "shiroishi", retinue: 300, retTrain: 64 },
  { id: "watari", name: "亘理元宗", faction: "date", lead: 70, valor: 72, wit: 64, gov: 62, loyal: 90, age: 16, at: "watari", retinue: 280, retTrain: 62 },
  { id: "moriuji", name: "蘆名盛氏", faction: "ashina", lead: 82, valor: 74, wit: 82, gov: 78, loyal: 100, age: 25, at: "kurokawa", lord: true, retinue: 560, retTrain: 64 },
  { id: "inawashiro", name: "猪苗代盛国", faction: "ashina", lead: 68, valor: 70, wit: 62, gov: 58, loyal: 64, age: 30, at: "inawashiro", retinue: 300, retTrain: 60 },
  { id: "nihonmatsu_g", name: "畠山義国", faction: "nihonmatsu", lead: 64, valor: 64, wit: 60, gov: 60, loyal: 100, age: 32, at: "nihonmatsu", lord: true, retinue: 340, retTrain: 58 },
  { id: "shirakawa_g", name: "結城晴綱", faction: "shirakawa", lead: 64, valor: 62, wit: 62, gov: 62, loyal: 100, age: 26, at: "shirakawa", lord: true, retinue: 340, retTrain: 58 },
  { id: "nikaido_g", name: "二階堂照行", faction: "nikaido", lead: 64, valor: 62, wit: 64, gov: 62, loyal: 100, age: 34, at: "sukagawa", lord: true, retinue: 320, retTrain: 58 },
  { id: "tamura_g", name: "田村隆顕", faction: "tamura", lead: 70, valor: 68, wit: 66, gov: 64, loyal: 100, age: 36, at: "miharu", lord: true, retinue: 340, retTrain: 60 },
  { id: "moritane", name: "相馬盛胤", faction: "soma", lead: 76, valor: 78, wit: 68, gov: 62, loyal: 100, age: 18, at: "soma", lord: true, retinue: 400, retTrain: 64 },
  { id: "osaki_g", name: "大崎義直", faction: "osaki", lead: 64, valor: 62, wit: 60, gov: 62, loyal: 100, age: 38, at: "iwadeyama", lord: true, retinue: 360, retTrain: 58 },
  { id: "kokubun_g", name: "国分盛氏", faction: "kokubun", lead: 62, valor: 62, wit: 58, gov: 58, loyal: 100, age: 31, at: "sendai", lord: true, retinue: 280, retTrain: 58 },
  { id: "kasai_g", name: "葛西晴信", faction: "kasai", lead: 66, valor: 66, wit: 62, gov: 60, loyal: 100, age: 12, at: "teraike", lord: true, retinue: 320, retTrain: 58 },
  { id: "abe_g", name: "阿曽沼広郷", faction: "abe", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 100, age: 16, at: "yokota", lord: true, retinue: 260, retTrain: 58 },
  { id: "harumasa_n", name: "南部晴政", faction: "nanbu", lead: 80, valor: 76, wit: 72, gov: 68, loyal: 100, age: 29, at: "sannohe", lord: true, retinue: 520, retTrain: 64 },
  { id: "kunohe_g", name: "九戸政実", faction: "kunohe", lead: 82, valor: 86, wit: 72, gov: 62, loyal: 54, age: 10, at: "kunohe", lord: true, retinue: 380, retTrain: 66 },
  { id: "shiba_g", name: "斯波詮直", faction: "shiba", lead: 60, valor: 60, wit: 58, gov: 58, loyal: 100, age: 21, at: "kosuiji", lord: true, retinue: 280, retTrain: 56 },
  { id: "namioka_g", name: "浪岡具運", faction: "namioka", lead: 62, valor: 60, wit: 64, gov: 64, loyal: 100, age: 28, at: "namioka", lord: true, retinue: 260, retTrain: 56 },
  { id: "yoshimori", name: "最上義守", faction: "mogami", lead: 70, valor: 66, wit: 70, gov: 70, loyal: 100, age: 25, at: "yamagata", lord: true, retinue: 480, retTrain: 60 },
  { id: "tendo_g", name: "天童頼長", faction: "tendo", lead: 64, valor: 64, wit: 60, gov: 58, loyal: 100, age: 26, at: "tendo", lord: true, retinue: 320, retTrain: 58 },
  { id: "daihoji_g", name: "大宝寺義増", faction: "daihoji", lead: 66, valor: 64, wit: 62, gov: 62, loyal: 100, age: 22, at: "ourayama", lord: true, retinue: 340, retTrain: 60 },
  { id: "onodera_g", name: "小野寺景道", faction: "onodera", lead: 70, valor: 68, wit: 66, gov: 64, loyal: 100, age: 12, at: "yokote", lord: true, retinue: 360, retTrain: 60 },
  { id: "ando_g", name: "安東舜季", faction: "ando", lead: 70, valor: 66, wit: 70, gov: 70, loyal: 100, age: 32, at: "hiyama", lord: true, retinue: 420, retTrain: 62 },
  { id: "honma_g", name: "本間高信", faction: "honma", lead: 62, valor: 62, wit: 60, gov: 60, loyal: 100, age: 36, at: "kawarada", lord: true, retinue: 240, retTrain: 56 },
  { id: "yoshihiro_k", name: "蠣崎季広", faction: "kakizaki", lead: 72, valor: 66, wit: 78, gov: 74, loyal: 100, age: 39, at: "matsumae", lord: true, retinue: 320, retTrain: 58 },
  { id: "shosei", name: "尚清王", faction: "ryukyu", lead: 68, valor: 54, wit: 74, gov: 80, loyal: 100, age: 49, at: "shurijo", lord: true, retinue: 460, retTrain: 52 },
  { id: "shogen", name: "尚元王", faction: "ryukyu", lead: 64, valor: 56, wit: 68, gov: 72, loyal: 98, age: 18, at: "nakagusuku", retinue: 260, retTrain: 52 },
  { id: "miyako_g", name: "仲宗根豊見親", faction: "ryukyu", lead: 62, valor: 64, wit: 62, gov: 60, loyal: 84, age: 36, at: "miyako", retinue: 200, retTrain: 54 },
  { id: "ainu_w1", name: "ハシタイン", faction: "ainu_w", lead: 74, valor: 78, wit: 70, gov: 60, loyal: 100, age: 40, at: "ishikari", lord: true, retinue: 340, retTrain: 62 },
  { id: "ainu_w2", name: "セタナイ乙名", faction: "ainu_w", lead: 66, valor: 70, wit: 62, gov: 56, loyal: 92, age: 34, at: "otaru", retinue: 240, retTrain: 60 },
  { id: "ainu_w3", name: "クンヌイ乙名", faction: "ainu_w", lead: 64, valor: 72, wit: 58, gov: 54, loyal: 88, age: 31, at: "oshamanbe", retinue: 220, retTrain: 60 },
  { id: "ainu_e1", name: "タリコナ", faction: "ainu_e", lead: 76, valor: 82, wit: 66, gov: 58, loyal: 100, age: 37, at: "sizunai", lord: true, retinue: 320, retTrain: 64 },
  { id: "ainu_e2", name: "クスリ乙名", faction: "ainu_e", lead: 66, valor: 70, wit: 62, gov: 56, loyal: 90, age: 32, at: "kushiro", retinue: 220, retTrain: 60 },
  { id: "ainu_e3", name: "メナシ乙名", faction: "ainu_e", lead: 64, valor: 72, wit: 58, gov: 52, loyal: 88, age: 29, at: "nemuro", retinue: 200, retTrain: 60 },
  { id: "ainu_n1", name: "ソウヤ乙名", faction: "ainu_n", lead: 70, valor: 74, wit: 64, gov: 58, loyal: 100, age: 42, at: "soya", lord: true, retinue: 260, retTrain: 60 },
  { id: "ainu_n2", name: "アバシリ乙名", faction: "ainu_n", lead: 64, valor: 70, wit: 60, gov: 54, loyal: 90, age: 30, at: "abashiri", retinue: 200, retTrain: 58 },
  { id: "ainu_n3", name: "ルモイ乙名", faction: "ainu_n", lead: 62, valor: 68, wit: 58, gov: 54, loyal: 90, age: 35, at: "rumoi", retinue: 190, retTrain: 58 },
  { id: "kakizaki3", name: "蠣崎基広", faction: "kakizaki", lead: 64, valor: 68, wit: 60, gov: 58, loyal: 74, age: 32, at: "esashi", retinue: 220, retTrain: 58 },
  { id: "m_yasunaga", name: "三好康長", faction: "miyoshi", lead: 76, valor: 74, wit: 72, gov: 68, loyal: 88, age: 26, at: "akutagawa", retinue: 320, retTrain: 64 },
  { id: "m_masayasu", name: "三好政勝", faction: "miyoshi", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 72, age: 30, at: "akutagawa", retinue: 280, retTrain: 62 },
  { id: "m_yukiyasu", name: "三好之康", faction: "miyoshi", lead: 70, valor: 72, wit: 66, gov: 62, loyal: 86, age: 24, at: "iimoriyama", retinue: 300, retTrain: 62 },
  { id: "m_matsuyama", name: "松山重治", faction: "miyoshi", lead: 70, valor: 66, wit: 74, gov: 68, loyal: 84, age: 28, at: "iimoriyama", retinue: 260, retTrain: 62 },
  { id: "m_kono", name: "香西長信", faction: "miyoshi", lead: 66, valor: 70, wit: 62, gov: 58, loyal: 80, age: 32, at: "takaya", retinue: 260, retTrain: 60 },
  { id: "m_yui", name: "結城忠正", faction: "miyoshi", lead: 64, valor: 60, wit: 70, gov: 70, loyal: 80, age: 36, at: "takaya", retinue: 240, retTrain: 58 },
  { id: "m_ibaraki", name: "茨木長隆", faction: "miyoshi", lead: 66, valor: 62, wit: 72, gov: 74, loyal: 82, age: 41, at: "itami", retinue: 260, retTrain: 60 },
  { id: "m_iwanari2", name: "石成友通", faction: "miyoshi", lead: 68, valor: 70, wit: 66, gov: 60, loyal: 82, age: 25, at: "itami", retinue: 250, retTrain: 62 },
  { id: "m_hatano", name: "波多野秀親", faction: "miyoshi", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 74, age: 29, at: "hanakuma", retinue: 240, retTrain: 60 },
  { id: "m_araki", name: "荒木義村", faction: "miyoshi", lead: 66, valor: 68, wit: 64, gov: 60, loyal: 80, age: 31, at: "hanakuma", retinue: 250, retTrain: 60 },
  { id: "m_sogo3", name: "十河景滋", faction: "miyoshi", lead: 70, valor: 76, wit: 60, gov: 56, loyal: 88, age: 34, at: "sogo", retinue: 280, retTrain: 64 },
  { id: "m_yashima", name: "安富盛定", faction: "miyoshi", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 84, age: 36, at: "hiketa", retinue: 250, retTrain: 60 },
  { id: "m_awa1", name: "加地盛時", faction: "miyoshi", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 80, age: 30, at: "ichinomiya", retinue: 240, retTrain: 60 },
  { id: "m_awa2", name: "森飛騨守", faction: "miyoshi", lead: 66, valor: 70, wit: 58, gov: 54, loyal: 78, age: 33, at: "hakuchi", retinue: 230, retTrain: 60 },
  { id: "m_awa3", name: "矢野虎村", faction: "miyoshi", lead: 64, valor: 68, wit: 58, gov: 56, loyal: 80, age: 28, at: "shozui", retinue: 240, retTrain: 60 },
  { id: "m_awaji1", name: "安宅神五郎", faction: "miyoshi", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 84, age: 22, at: "sumoto", retinue: 250, retTrain: 60 },
  { id: "m_awaji2", name: "菅達長", faction: "miyoshi", lead: 68, valor: 72, wit: 64, gov: 56, loyal: 82, age: 16, at: "sumoto", retinue: 240, retTrain: 62 },
  { id: "m_yura2", name: "船越景直", faction: "miyoshi", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 80, age: 20, at: "yura", retinue: 230, retTrain: 60 },
  { id: "m_hiketa2", name: "寒川元隣", faction: "miyoshi", lead: 62, valor: 64, wit: 60, gov: 58, loyal: 76, age: 32, at: "hiketa", retinue: 220, retTrain: 58 },
  { id: "m_ushiki2", name: "篠原長重", faction: "miyoshi", lead: 66, valor: 68, wit: 64, gov: 60, loyal: 82, age: 26, at: "ichinomiya", retinue: 240, retTrain: 60 },
  { id: "o_sugi2", name: "杉重輔", faction: "ouchi", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 72, age: 22, at: "takamine", retinue: 280, retTrain: 62 },
  { id: "o_naito2", name: "内藤隆世", faction: "ouchi", lead: 66, valor: 68, wit: 62, gov: 60, loyal: 84, age: 14, at: "katsuyama_n", retinue: 260, retTrain: 60 },
  { id: "o_sue2", name: "陶隆康", faction: "ouchi", lead: 70, valor: 74, wit: 64, gov: 58, loyal: 80, age: 28, at: "wakayama_s", retinue: 280, retTrain: 64 },
  { id: "o_niho", name: "仁保隆慰", faction: "ouchi", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 82, age: 31, at: "wakayama_s", retinue: 250, retTrain: 60 },
  { id: "o_hironaka", name: "弘中隆兼", faction: "ouchi", lead: 76, valor: 78, wit: 70, gov: 62, loyal: 88, age: 34, at: "kuragake", retinue: 280, retTrain: 64 },
  { id: "o_sugihara", name: "杉原盛重", faction: "ouchi", lead: 72, valor: 74, wit: 68, gov: 62, loyal: 74, age: 16, at: "kannabe", retinue: 270, retTrain: 62 },
  { id: "o_hirai", name: "平賀隆保", faction: "ouchi", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 76, age: 20, at: "kannabe", retinue: 250, retTrain: 60 },
  { id: "o_shimofuri2", name: "市川経好", faction: "ouchi", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 84, age: 26, at: "shimofuri", retinue: 250, retTrain: 62 },
  { id: "o_katsuyama2", name: "問田隆盛", faction: "ouchi", lead: 64, valor: 66, wit: 62, gov: 60, loyal: 82, age: 34, at: "katsuyama_n", retinue: 240, retTrain: 60 },
  { id: "o_kokura2", name: "杉重信", faction: "ouchi", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 80, age: 30, at: "kokura", retinue: 250, retTrain: 60 },
  { id: "o_umagatake2", name: "長野助守", faction: "ouchi", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 78, age: 28, at: "umagatake", retinue: 240, retTrain: 58 },
  { id: "o_tachibana2", name: "立花鑑光", faction: "ouchi", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 74, age: 32, at: "tachibanayama", retinue: 270, retTrain: 62 },
  { id: "o_iwaya2", name: "高橋鑑広", faction: "ouchi", lead: 66, valor: 68, wit: 64, gov: 60, loyal: 72, age: 26, at: "iwaya", retinue: 250, retTrain: 60 },
  { id: "o_ouchi2", name: "陶隆満", faction: "ouchi", lead: 64, valor: 64, wit: 66, gov: 64, loyal: 80, age: 40, at: "ouchi", retinue: 240, retTrain: 58 },
  { id: "o_ouchi3", name: "杉興連", faction: "ouchi", lead: 66, valor: 66, wit: 64, gov: 62, loyal: 82, age: 36, at: "ouchi", retinue: 250, retTrain: 60 },
  { id: "o_takamine2", name: "冷泉隆意", faction: "ouchi", lead: 66, valor: 70, wit: 60, gov: 56, loyal: 86, age: 24, at: "takamine", retinue: 250, retTrain: 62 },
  { id: "i_ihara", name: "庵原忠康", faction: "imagawa", lead: 70, valor: 70, wit: 64, gov: 62, loyal: 86, age: 26, at: "sunpu", retinue: 280, retTrain: 62 },
  { id: "i_asahina3", name: "朝比奈元長", faction: "imagawa", lead: 68, valor: 70, wit: 62, gov: 58, loyal: 86, age: 22, at: "kakegawa", retinue: 270, retTrain: 62 },
  { id: "i_okabe3", name: "岡部真幸", faction: "imagawa", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 84, age: 28, at: "takatenjin", retinue: 260, retTrain: 62 },
  { id: "i_udono2", name: "鵜殿長持", faction: "imagawa", lead: 68, valor: 68, wit: 64, gov: 62, loyal: 84, age: 36, at: "yoshida", retinue: 270, retTrain: 62 },
  { id: "i_toda2", name: "戸田堯光", faction: "imagawa", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 70, age: 30, at: "tahara", retinue: 250, retTrain: 60 },
  { id: "i_ohara2", name: "小原資良", faction: "imagawa", lead: 66, valor: 66, wit: 62, gov: 58, loyal: 80, age: 32, at: "nishio", retinue: 250, retTrain: 60 },
  { id: "i_suganuma2", name: "菅沼定村", faction: "imagawa", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 74, age: 34, at: "nagashino", retinue: 240, retTrain: 60 },
  { id: "i_ii2", name: "井伊直満", faction: "imagawa", lead: 68, valor: 72, wit: 62, gov: 58, loyal: 80, age: 32, at: "hikuma", retinue: 260, retTrain: 62 },
  { id: "i_amano2", name: "天野藤秀", faction: "imagawa", lead: 64, valor: 66, wit: 60, gov: 54, loyal: 76, age: 24, at: "inui", retinue: 240, retTrain: 58 },
  { id: "i_miura2", name: "三浦正俊", faction: "imagawa", lead: 68, valor: 70, wit: 62, gov: 58, loyal: 84, age: 30, at: "futamata", retinue: 260, retTrain: 62 },
  { id: "i_kokokuji2", name: "葛山氏広", faction: "imagawa", lead: 64, valor: 66, wit: 62, gov: 60, loyal: 80, age: 36, at: "kounkoji", retinue: 250, retTrain: 60 },
  { id: "i_sunpu3", name: "関口親永", faction: "imagawa", lead: 68, valor: 66, wit: 68, gov: 66, loyal: 86, age: 34, at: "sunpu", retinue: 270, retTrain: 62 },
  { id: "i_nishio2", name: "牧野成定", faction: "imagawa", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 74, age: 26, at: "nishio", retinue: 240, retTrain: 60 },
  { id: "i_tahara2", name: "戸田重貞", faction: "imagawa", lead: 62, valor: 66, wit: 58, gov: 56, loyal: 72, age: 22, at: "tahara", retinue: 230, retTrain: 58 },
  { id: "i_nagashino2", name: "菅沼定継", faction: "imagawa", lead: 62, valor: 64, wit: 60, gov: 56, loyal: 74, age: 28, at: "nagashino", retinue: 230, retTrain: 58 },
  { id: "i_inui2", name: "天野景貫", faction: "imagawa", lead: 66, valor: 68, wit: 62, gov: 56, loyal: 74, age: 20, at: "inui", retinue: 240, retTrain: 60 },
  { id: "i_hikuma2", name: "飯尾連龍", faction: "imagawa", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 68, age: 18, at: "hikuma", retinue: 240, retTrain: 60 },
  { id: "i_kakegawa3", name: "朝比奈泰秀", faction: "imagawa", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 84, age: 26, at: "kakegawa", retinue: 240, retTrain: 60 },
  { id: "h_odawara2", name: "清水康英", faction: "hojo", lead: 70, valor: 72, wit: 66, gov: 62, loyal: 90, age: 21, at: "odawara", retinue: 270, retTrain: 64 },
  { id: "h_tamanawa2", name: "北条綱房", faction: "hojo", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 88, age: 26, at: "tamanawa", retinue: 260, retTrain: 62 },
  { id: "h_tamanawa3", name: "甘粕長俊", faction: "hojo", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 32, at: "tamanawa", retinue: 240, retTrain: 60 },
  { id: "h_misaki2", name: "山本正次", faction: "hojo", lead: 64, valor: 68, wit: 60, gov: 56, loyal: 82, age: 28, at: "misaki", retinue: 240, retTrain: 60 },
  { id: "h_misaki3", name: "梶原景繁", faction: "hojo", lead: 66, valor: 70, wit: 62, gov: 56, loyal: 84, age: 24, at: "misaki", retinue: 250, retTrain: 62 },
  { id: "h_tsukui2", name: "内藤景豊", faction: "hojo", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 22, at: "tsukui", retinue: 240, retTrain: 60 },
  { id: "h_tsukui3", name: "中山家範", faction: "hojo", lead: 68, valor: 74, wit: 62, gov: 56, loyal: 86, age: 16, at: "tsukui", retinue: 250, retTrain: 62 },
  { id: "h_edo2", name: "富永政家", faction: "hojo", lead: 66, valor: 68, wit: 64, gov: 60, loyal: 86, age: 24, at: "edo", retinue: 250, retTrain: 62 },
  { id: "h_edo3", name: "太田康資", faction: "hojo", lead: 70, valor: 74, wit: 66, gov: 60, loyal: 66, age: 15, at: "edo", retinue: 260, retTrain: 62 },
  { id: "h_kawagoe2", name: "大道寺盛昌", faction: "hojo", lead: 68, valor: 66, wit: 70, gov: 72, loyal: 88, age: 46, at: "kawagoe", retinue: 260, retTrain: 62 },
  { id: "h_kawagoe3", name: "笠原康勝", faction: "hojo", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 86, age: 26, at: "kawagoe", retinue: 250, retTrain: 60 },
  { id: "h_takiyama2", name: "狩野一庵", faction: "hojo", lead: 64, valor: 66, wit: 64, gov: 62, loyal: 86, age: 36, at: "takiyama", retinue: 240, retTrain: 60 },
  { id: "h_takiyama3", name: "近藤綱秀", faction: "hojo", lead: 66, valor: 70, wit: 62, gov: 56, loyal: 84, age: 30, at: "takiyama", retinue: 250, retTrain: 62 },
  { id: "h_matsuyama2", name: "狩野泰光", faction: "hojo", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 80, age: 32, at: "matsuyama_m", retinue: 240, retTrain: 60 },
  { id: "h_matsuyama3", name: "上田政広", faction: "hojo", lead: 64, valor: 68, wit: 60, gov: 56, loyal: 74, age: 24, at: "matsuyama_m", retinue: 240, retTrain: 60 },
  { id: "h_shimoda2", name: "朝比奈泰致", faction: "hojo", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 26, at: "shimoda", retinue: 240, retTrain: 60 },
  { id: "h_nirayama2", name: "笠原綱信", faction: "hojo", lead: 66, valor: 68, wit: 64, gov: 60, loyal: 88, age: 30, at: "nirayama", retinue: 250, retTrain: 62 },
  { id: "a_gassan3", name: "立原幸隆", faction: "amago", lead: 70, valor: 72, wit: 66, gov: 62, loyal: 88, age: 22, at: "gassan", retinue: 270, retTrain: 64 },
  { id: "a_gassan4", name: "亀井秀綱", faction: "amago", lead: 66, valor: 64, wit: 72, gov: 70, loyal: 84, age: 40, at: "gassan", retinue: 250, retTrain: 60 },
  { id: "a_shiraga2", name: "尼子倫久", faction: "amago", lead: 70, valor: 72, wit: 64, gov: 60, loyal: 80, age: 16, at: "shiraga", retinue: 260, retTrain: 62 },
  { id: "a_shiraga3", name: "松田誠保", faction: "amago", lead: 66, valor: 70, wit: 62, gov: 56, loyal: 80, age: 26, at: "shiraga", retinue: 250, retTrain: 62 },
  { id: "a_yonago2", name: "湯原春綱", faction: "amago", lead: 68, valor: 70, wit: 64, gov: 58, loyal: 84, age: 28, at: "yonago", retinue: 250, retTrain: 62 },
  { id: "a_yonago3", name: "福山茲正", faction: "amago", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 82, age: 32, at: "yonago", retinue: 240, retTrain: 60 },
  { id: "a_yamabuki2", name: "牛尾幸清", faction: "amago", lead: 66, valor: 70, wit: 62, gov: 56, loyal: 80, age: 30, at: "yamabuki", retinue: 250, retTrain: 62 },
  { id: "a_yamabuki3", name: "佐世清宗", faction: "amago", lead: 68, valor: 68, wit: 66, gov: 62, loyal: 84, age: 34, at: "yamabuki", retinue: 250, retTrain: 62 },
  { id: "a_takata2", name: "三浦貞盛", faction: "amago", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 74, age: 24, at: "takata_m", retinue: 250, retTrain: 60 },
  { id: "a_takata3", name: "牧尚春", faction: "amago", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 78, age: 28, at: "takata_m", retinue: 240, retTrain: 60 },
  { id: "a_iwaya2", name: "中村頼宗", faction: "amago", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 78, age: 30, at: "iwaya_m", retinue: 240, retTrain: 60 },
  { id: "a_iwaya3", name: "江見久盛", faction: "amago", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 76, age: 26, at: "iwaya_m", retinue: 230, retTrain: 58 },
  { id: "a_oki2", name: "隠岐清家", faction: "amago", lead: 60, valor: 62, wit: 58, gov: 56, loyal: 80, age: 32, at: "oki", retinue: 200, retTrain: 56 },
  { id: "a_oki3", name: "隠岐宗清", faction: "amago", lead: 70, valor: 76, wit: 68, gov: 58, loyal: 64, age: 13, at: "oki", retinue: 220, retTrain: 64 },
  { id: "t_katsuyama3", name: "加藤信邦", faction: "takeda", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 30, at: "katsuyama_k", retinue: 240, retTrain: 60 },
  { id: "t_takato3", name: "諏訪頼豊", faction: "takeda", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 76, age: 26, at: "takato", retinue: 250, retTrain: 62 },
  { id: "t_iida3", name: "下条信氏", faction: "takeda", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 78, age: 28, at: "iida", retinue: 240, retTrain: 60 },
  { id: "t_komoro3", name: "真田幸隆", faction: "takeda", lead: 82, valor: 72, wit: 92, gov: 80, loyal: 84, age: 33, at: "komoro", retinue: 280, retTrain: 66 },
  { id: "t_iwadono3", name: "栗原詮冬", faction: "takeda", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 80, age: 32, at: "iwadono", retinue: 240, retTrain: 60 },
  { id: "t_fukashi3", name: "馬場民部", faction: "takeda", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 84, age: 26, at: "fukashi", retinue: 250, retTrain: 62 },
  { id: "t_tsutsuji4", name: "穴山信友", faction: "takeda", lead: 70, valor: 68, wit: 70, gov: 70, loyal: 80, age: 40, at: "tsutsujigasaki", retinue: 270, retTrain: 62 },
  { id: "n_kasugayama3", name: "本庄実乃", faction: "nagao", lead: 70, valor: 68, wit: 74, gov: 74, loyal: 90, age: 34, at: "kasugayama", retinue: 270, retTrain: 64 },
  { id: "n_kasugayama4", name: "大熊朝秀", faction: "nagao", lead: 68, valor: 68, wit: 68, gov: 66, loyal: 62, age: 30, at: "kasugayama", retinue: 260, retTrain: 62 },
  { id: "n_tochio3", name: "山吉行盛", faction: "nagao", lead: 66, valor: 68, wit: 64, gov: 60, loyal: 86, age: 24, at: "tochio", retinue: 250, retTrain: 62 },
  { id: "n_yoita3", name: "直江景綱", faction: "nagao", lead: 74, valor: 68, wit: 80, gov: 84, loyal: 92, age: 37, at: "yoita", retinue: 270, retTrain: 64 },
  { id: "n_sanjo2", name: "甘粕景持", faction: "nagao", lead: 78, valor: 80, wit: 68, gov: 62, loyal: 88, age: 16, at: "sanjo", retinue: 260, retTrain: 64 },
  { id: "n_sanjo3", name: "中条藤資", faction: "nagao", lead: 70, valor: 72, wit: 66, gov: 60, loyal: 80, age: 48, at: "sanjo", retinue: 250, retTrain: 62 },
  { id: "n_negoshi2", name: "上杉景直", faction: "nagao", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 84, age: 21, at: "negoshi", retinue: 240, retTrain: 60 },
  { id: "n_negoshi3", name: "村山慶綱", faction: "nagao", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 82, age: 28, at: "negoshi", retinue: 240, retTrain: 60 },
  { id: "u_hachigata2", name: "長野業固", faction: "uesugi_y", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 78, age: 26, at: "hachigata", retinue: 250, retTrain: 60 },
  { id: "u_hachigata3", name: "用土業繁", faction: "uesugi_y", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 76, age: 22, at: "hachigata", retinue: 240, retTrain: 60 },
  { id: "u_fukaya2", name: "上杉憲俊", faction: "uesugi_y", lead: 62, valor: 62, wit: 60, gov: 60, loyal: 82, age: 18, at: "fukaya", retinue: 240, retTrain: 58 },
  { id: "u_fukaya3", name: "秋元景朝", faction: "uesugi_y", lead: 64, valor: 64, wit: 64, gov: 62, loyal: 80, age: 30, at: "fukaya", retinue: 240, retTrain: 58 },
  { id: "u_numata2", name: "沼田朝憲", faction: "uesugi_y", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 72, age: 24, at: "numata", retinue: 240, retTrain: 60 },
  { id: "u_numata3", name: "金子泰清", faction: "uesugi_y", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 74, age: 32, at: "numata", retinue: 230, retTrain: 58 },
  { id: "u_maebashi3", name: "那波宗俊", faction: "uesugi_y", lead: 66, valor: 66, wit: 64, gov: 62, loyal: 76, age: 36, at: "hirai", retinue: 250, retTrain: 60 },
  { id: "mk_katsurao3", name: "雨宮昌秀", faction: "murakami", lead: 66, valor: 70, wit: 60, gov: 56, loyal: 84, age: 28, at: "katsurao", retinue: 250, retTrain: 62 },
  { id: "mk_toishi3", name: "室賀満正", faction: "murakami", lead: 64, valor: 68, wit: 60, gov: 56, loyal: 80, age: 30, at: "toishi", retinue: 240, retTrain: 60 },
  { id: "mk_kaizu3", name: "井上昌満", faction: "murakami", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 80, age: 26, at: "kaizu", retinue: 240, retTrain: 60 },
  { id: "j_toyama3", name: "寺島牛介", faction: "jinbo", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 80, age: 28, at: "toyama", retinue: 240, retTrain: 60 },
  { id: "j_masuyama2", name: "水越勝重", faction: "jinbo", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 80, age: 32, at: "masuyama", retinue: 240, retTrain: 60 },
  { id: "j_masuyama3", name: "神保氏張", faction: "jinbo", lead: 66, valor: 68, wit: 64, gov: 60, loyal: 82, age: 18, at: "masuyama", retinue: 240, retTrain: 60 },
  { id: "s_matsukura2", name: "椎名景直", faction: "shiina", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 24, at: "matsukura", retinue: 240, retTrain: 60 },
  { id: "s_matsukura3", name: "土肥政繁", faction: "shiina", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 80, age: 30, at: "matsukura", retinue: 240, retTrain: 60 },
  { id: "s_uozu3", name: "寺崎盛永", faction: "shiina", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 80, age: 32, at: "uozu", retinue: 230, retTrain: 60 },
  { id: "s_miyazaki2", name: "宮崎長頼", faction: "shiina", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 26, at: "miyazaki_e", retinue: 220, retTrain: 58 },
  { id: "s_miyazaki3", name: "水巻頼景", faction: "shiina", lead: 62, valor: 64, wit: 58, gov: 54, loyal: 78, age: 30, at: "miyazaki_e", retinue: 220, retTrain: 58 },
  { id: "hy_nanao3", name: "温井総貞", faction: "hatakeyama", lead: 66, valor: 64, wit: 72, gov: 68, loyal: 58, age: 40, at: "nanao", retinue: 250, retTrain: 60 },
  { id: "hy_suemori2", name: "三宅総広", faction: "hatakeyama", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 76, age: 32, at: "suemori_n", retinue: 240, retTrain: 60 },
  { id: "hy_suemori3", name: "平総知", faction: "hatakeyama", lead: 62, valor: 64, wit: 60, gov: 56, loyal: 78, age: 28, at: "suemori_n", retinue: 230, retTrain: 58 },
  { id: "ag_murakami3", name: "本庄房長", faction: "agakita", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 74, age: 40, at: "murakami", retinue: 240, retTrain: 60 },
  { id: "ag_shibata3", name: "五十公野治長", faction: "agakita", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 76, age: 26, at: "shibata", retinue: 240, retTrain: 60 },
  { id: "hm_kawarada2", name: "本間高統", faction: "honma", lead: 62, valor: 62, wit: 60, gov: 58, loyal: 84, age: 28, at: "kawarada", retinue: 230, retTrain: 58 },
  { id: "hm_kawarada3", name: "藍原重輔", faction: "honma", lead: 60, valor: 62, wit: 58, gov: 56, loyal: 82, age: 32, at: "kawarada", retinue: 220, retTrain: 56 },
  { id: "sa_iwamura2", name: "遠山景前", faction: "saito", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 72, age: 38, at: "iwamura", retinue: 250, retTrain: 60 },
  { id: "sa_iwamura3", name: "延友信光", faction: "saito", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 74, age: 30, at: "iwamura", retinue: 240, retTrain: 60 },
  { id: "sa_naegi2", name: "遠山友勝", faction: "saito", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 74, age: 32, at: "naegi", retinue: 240, retTrain: 60 },
  { id: "sa_naegi3", name: "苗木勘太郎", faction: "saito", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 76, age: 26, at: "naegi", retinue: 230, retTrain: 58 },
  { id: "sa_gujo3", name: "遠藤胤縁", faction: "saito", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 72, age: 34, at: "gujo", retinue: 240, retTrain: 60 },
  { id: "od_narumi2", name: "梶川高秀", faction: "oda", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 80, age: 28, at: "narumi", retinue: 240, retTrain: 60 },
  { id: "od_shobata3", name: "織田信広", faction: "oda", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 70, age: 20, at: "shobata", retinue: 250, retTrain: 60 },
  { id: "az_yamamoto2", name: "阿閉貞征", faction: "azai", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 72, age: 22, at: "yamamotoyama", retinue: 240, retTrain: 60 },
  { id: "az_yamamoto3", name: "新庄直頼", faction: "azai", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 76, age: 18, at: "yamamotoyama", retinue: 230, retTrain: 60 },
  { id: "as_kanegasaki2", name: "朝倉景恒", faction: "asakura", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 84, age: 20, at: "kanegasaki", retinue: 260, retTrain: 62 },
  { id: "as_kanegasaki3", name: "疋壇久保", faction: "asakura", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 82, age: 30, at: "kanegasaki", retinue: 240, retTrain: 60 },
  { id: "as_kitanosho3", name: "前波吉継", faction: "asakura", lead: 64, valor: 64, wit: 66, gov: 64, loyal: 72, age: 24, at: "kitanosho", retinue: 240, retTrain: 60 },
  { id: "as_ichijodani3", name: "鳥居景近", faction: "asakura", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 90, age: 22, at: "ichijodani", retinue: 250, retTrain: 62 },
  { id: "rk_sawayama2", name: "百々盛実", faction: "rokkaku", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 82, age: 30, at: "sawayama", retinue: 250, retTrain: 60 },
  { id: "rk_sawayama3", name: "小川孫一郎", faction: "rokkaku", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 80, age: 26, at: "sawayama", retinue: 240, retTrain: 60 },
  { id: "rk_sakamoto2", name: "山岡景之", faction: "rokkaku", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 80, age: 34, at: "sakamoto", retinue: 240, retTrain: 60 },
  { id: "rk_sakamoto3", name: "馬淵建綱", faction: "rokkaku", lead: 64, valor: 64, wit: 62, gov: 60, loyal: 80, age: 32, at: "sakamoto", retinue: 240, retTrain: 60 },
  { id: "wk_nochiseyama3", name: "熊谷直之", faction: "wakasa", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 72, age: 24, at: "nochiseyama", retinue: 240, retTrain: 60 },
  { id: "wk_kuniyoshi2", name: "内藤重政", faction: "wakasa", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 74, age: 28, at: "kuniyoshi", retinue: 240, retTrain: 60 },
  { id: "wk_kuniyoshi3", name: "白井光胤", faction: "wakasa", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 74, age: 32, at: "kuniyoshi", retinue: 230, retTrain: 58 },
  { id: "ag_takayama2", name: "牛丸親綱", faction: "anegakoji", lead: 62, valor: 64, wit: 60, gov: 58, loyal: 72, age: 30, at: "matsukura_h", retinue: 230, retTrain: 58 },
  { id: "kb_kuwana2", name: "滝川益重", faction: "kanbe", lead: 66, valor: 68, wit: 64, gov: 58, loyal: 78, age: 22, at: "kuwana", retinue: 240, retTrain: 60 },
  { id: "kb_kanbe3", name: "神戸友盛", faction: "kanbe", lead: 62, valor: 64, wit: 60, gov: 58, loyal: 84, age: 20, at: "kanbe", retinue: 240, retTrain: 58 },
  { id: "kk_toba3", name: "小浜久太郎", faction: "kuki", lead: 64, valor: 66, wit: 60, gov: 54, loyal: 80, age: 22, at: "toba", retinue: 220, retTrain: 62 },
  { id: "ik_nagashima3", name: "願証寺証智", faction: "ikko", lead: 64, valor: 58, wit: 72, gov: 72, loyal: 92, age: 24, at: "nagashima", retinue: 260, retTrain: 58 },
  { id: "mz_kariya3", name: "水野藤九郎", faction: "mizuno", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 86, age: 18, at: "kariya", retinue: 220, retTrain: 58 },
  { id: "md_okazaki3", name: "天野康景", faction: "matsudaira", lead: 64, valor: 62, wit: 68, gov: 70, loyal: 88, age: 9, at: "okazaki", retinue: 200, retTrain: 60 },
  { id: "mo_koriyama4", name: "口羽通良", faction: "mori", lead: 70, valor: 68, wit: 74, gov: 70, loyal: 90, age: 33, at: "koriyama_a", retinue: 260, retTrain: 62 },
  { id: "mo_koriyama5", name: "児玉就忠", faction: "mori", lead: 66, valor: 64, wit: 70, gov: 72, loyal: 90, age: 26, at: "koriyama_a", retinue: 250, retTrain: 60 },
  { id: "mo_sakurao3", name: "香川光景", faction: "mori", lead: 66, valor: 68, wit: 64, gov: 60, loyal: 86, age: 24, at: "sakurao", retinue: 250, retTrain: 62 },
  { id: "kb_mihara2", name: "乃美宗勝", faction: "kobayakawa", lead: 74, valor: 72, wit: 72, gov: 62, loyal: 88, age: 19, at: "mihara", retinue: 250, retTrain: 64 },
  { id: "kb_mihara3", name: "浦宗勝", faction: "kobayakawa", lead: 72, valor: 74, wit: 68, gov: 60, loyal: 88, age: 22, at: "mihara", retinue: 250, retTrain: 64 },
  { id: "ur_tenjin2", name: "明石行雄", faction: "uragami", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 80, age: 28, at: "tenjinyama", retinue: 250, retTrain: 60 },
  { id: "ur_tenjin3", name: "延原景能", faction: "uragami", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 80, age: 30, at: "tenjinyama", retinue: 240, retTrain: 60 },
  { id: "ur_okayama2", name: "宇喜多直家", faction: "uragami", lead: 84, valor: 72, wit: 94, gov: 80, loyal: 54, age: 16, at: "ishiyama_bz", retinue: 260, retTrain: 62 },
  { id: "ur_okayama3", name: "中山信正", faction: "uragami", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 74, age: 36, at: "ishiyama_bz", retinue: 250, retTrain: 60 },
  { id: "mm_matsuyama3", name: "石川久式", faction: "mimura", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 80, age: 26, at: "matsuyama_bc", retinue: 240, retTrain: 60 },
  { id: "sh_sarukake2", name: "庄勝資", faction: "shoo", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 22, at: "sarukake", retinue: 240, retTrain: 60 },
  { id: "sh_sarukake3", name: "穝所元常", faction: "shoo", lead: 64, valor: 68, wit: 60, gov: 56, loyal: 78, age: 30, at: "sarukake", retinue: 240, retTrain: 60 },
  { id: "sm_takamatsu2", name: "清水宗則", faction: "shimizu", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 24, at: "takamatsu_bc", retinue: 240, retTrain: 60 },
  { id: "sm_takamatsu3", name: "難波宗忠", faction: "shimizu", lead: 62, valor: 64, wit: 60, gov: 58, loyal: 82, age: 28, at: "takamatsu_bc", retinue: 230, retTrain: 58 },
  { id: "nj_uyui3", name: "小鴨元清", faction: "nanjo", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 84, age: 10, at: "uyui", retinue: 240, retTrain: 60 },
  { id: "ys_tsuwano2", name: "吉見広頼", faction: "yoshimi", lead: 66, valor: 68, wit: 62, gov: 60, loyal: 90, age: 10, at: "tsuwano", retinue: 250, retTrain: 60 },
  { id: "ys_tsuwano3", name: "斎藤就正", faction: "yoshimi", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 84, age: 28, at: "tsuwano", retinue: 240, retTrain: 60 },
  { id: "ms_miyake3", name: "三隅隆繁", faction: "masuda", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 80, age: 30, at: "miyake", retinue: 240, retTrain: 60 },
  { id: "tka_kanayama2", name: "武田光和", faction: "takeda_a", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 80, age: 32, at: "kanayama_a", retinue: 240, retTrain: 60 },
  { id: "tka_kanayama3", name: "品川左京亮", faction: "takeda_a", lead: 64, valor: 68, wit: 58, gov: 54, loyal: 78, age: 28, at: "kanayama_a", retinue: 240, retTrain: 60 },
  { id: "ym_tottori2", name: "武田国信", faction: "yamana", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 72, age: 24, at: "tottori", retinue: 250, retTrain: 60 },
  { id: "ym_tottori3", name: "中村春続", faction: "yamana", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 78, age: 22, at: "tottori", retinue: 250, retTrain: 60 },
  { id: "ym_takeda2", name: "太田垣輝延", faction: "yamana", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 80, age: 20, at: "takeda", retinue: 240, retTrain: 60 },
  { id: "ym_takeda3", name: "八木豊信", faction: "yamana", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 78, age: 26, at: "takeda", retinue: 240, retTrain: 60 },
  { id: "ym_wakasa2", name: "矢部定利", faction: "yamana", lead: 62, valor: 64, wit: 60, gov: 56, loyal: 78, age: 30, at: "wakasa", retinue: 230, retTrain: 58 },
  { id: "ym_wakasa3", name: "毛利豊元", faction: "yamana", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 76, age: 28, at: "wakasa", retinue: 230, retTrain: 58 },
  { id: "ym_shikano2", name: "佐々木高清", faction: "yamana", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 78, age: 32, at: "shikano", retinue: 220, retTrain: 58 },
  { id: "ym_shikano3", name: "日下部兼定", faction: "yamana", lead: 62, valor: 64, wit: 58, gov: 54, loyal: 78, age: 28, at: "shikano", retinue: 220, retTrain: 58 },
  { id: "ym_konosumi3", name: "垣屋光成", faction: "yamana", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 78, age: 22, at: "konosumi", retinue: 240, retTrain: 60 },
  { id: "ak_himeji2", name: "黒田職隆", faction: "akamatsu", lead: 70, valor: 64, wit: 76, gov: 78, loyal: 86, age: 22, at: "himeji", retinue: 250, retTrain: 60 },
  { id: "ak_himeji3", name: "母里武兵衛", faction: "akamatsu", lead: 66, valor: 72, wit: 58, gov: 54, loyal: 84, age: 26, at: "himeji", retinue: 240, retTrain: 62 },
  { id: "ak_goshaku2", name: "小寺職隆", faction: "akamatsu", lead: 64, valor: 64, wit: 64, gov: 62, loyal: 80, age: 30, at: "goshaku", retinue: 240, retTrain: 58 },
  { id: "ak_goshaku3", name: "江田善兵衛", faction: "akamatsu", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 78, age: 28, at: "goshaku", retinue: 230, retTrain: 58 },
  { id: "ak_ojio3", name: "宇野村頼", faction: "akamatsu", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 80, age: 20, at: "ojio", retinue: 240, retTrain: 60 },
  { id: "bs_miki3", name: "別所重宗", faction: "bessho", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 88, age: 16, at: "miki", retinue: 240, retTrain: 60 },
  { id: "cs_okou3", name: "吉田重俊", faction: "chosokabe", lead: 70, valor: 72, wit: 66, gov: 60, loyal: 90, age: 28, at: "okou", retinue: 250, retTrain: 62 },
  { id: "cs_okou4", name: "福留親政", faction: "chosokabe", lead: 70, valor: 76, wit: 62, gov: 56, loyal: 90, age: 32, at: "okou", retinue: 250, retTrain: 64 },
  { id: "ic_nakamura2", name: "土居宗珊", faction: "ichijo", lead: 66, valor: 62, wit: 72, gov: 72, loyal: 88, age: 36, at: "nakamura", retinue: 250, retTrain: 60 },
  { id: "ic_nakamura3", name: "為松若狭守", faction: "ichijo", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 84, age: 30, at: "nakamura", retinue: 240, retTrain: 60 },
  { id: "ak_aki2", name: "安芸国康", faction: "aki", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 88, age: 20, at: "aki", retinue: 240, retTrain: 60 },
  { id: "ak_aki3", name: "黒岩越前守", faction: "aki", lead: 64, valor: 68, wit: 58, gov: 54, loyal: 82, age: 28, at: "aki", retinue: 240, retTrain: 60 },
  { id: "kn_yuzuki2", name: "平岡房実", faction: "kono", lead: 66, valor: 66, wit: 66, gov: 64, loyal: 84, age: 38, at: "yuzuki", retinue: 250, retTrain: 60 },
  { id: "kn_yuzuki3", name: "大野直之", faction: "kono", lead: 66, valor: 70, wit: 64, gov: 56, loyal: 66, age: 16, at: "yuzuki", retinue: 250, retTrain: 60 },
  { id: "kn_kagomori2", name: "土居清宗", faction: "kono", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 80, age: 32, at: "kagomori", retinue: 240, retTrain: 60 },
  { id: "kn_kagomori3", name: "渡辺房", faction: "kono", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 26, at: "kagomori", retinue: 230, retTrain: 58 },
  { id: "kn_kawanoe2", name: "石川通清", faction: "kono", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 78, age: 30, at: "kawanoe", retinue: 240, retTrain: 60 },
  { id: "kn_kawanoe3", name: "妻鳥友春", faction: "kono", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 78, age: 26, at: "kawanoe", retinue: 230, retTrain: 58 },
  { id: "kr_kokubun2", name: "村上武吉", faction: "kurushima", lead: 80, valor: 80, wit: 78, gov: 62, loyal: 80, age: 13, at: "kokubunyama", retinue: 250, retTrain: 68 },
  { id: "kr_kokubun3", name: "村上吉充", faction: "kurushima", lead: 74, valor: 76, wit: 68, gov: 58, loyal: 84, age: 16, at: "kokubunyama", retinue: 240, retTrain: 66 },
  { id: "si_itajima2", name: "西園寺実充", faction: "saionji", lead: 64, valor: 62, wit: 64, gov: 64, loyal: 100, age: 30, at: "itajima", lord: true, retinue: 240, retTrain: 58 },
  { id: "si_jizo2", name: "宇都宮房綱", faction: "saionji", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 78, age: 26, at: "jizogatake", retinue: 240, retTrain: 60 },
  { id: "si_jizo3", name: "法華津前延", faction: "saionji", lead: 62, valor: 64, wit: 60, gov: 56, loyal: 80, age: 30, at: "jizogatake", retinue: 230, retTrain: 58 },
  { id: "kg_amagiri2", name: "香川元景", faction: "kagawa", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 22, at: "amagiri", retinue: 240, retTrain: 60 },
  { id: "kg_amagiri3", name: "羽床資載", faction: "kagawa", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 78, age: 28, at: "amagiri", retinue: 240, retTrain: 60 },
  { id: "sg_shingai", name: "新開実正", faction: "shingai", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 88, age: 24, at: "ushiki", retinue: 220, retTrain: 60 },
  { id: "ot_funai3", name: "由布惟信", faction: "otomo", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 88, age: 28, at: "funai", retinue: 250, retTrain: 62 },
  { id: "ot_funai4", name: "臼杵鑑速", faction: "otomo", lead: 70, valor: 66, wit: 74, gov: 74, loyal: 90, age: 32, at: "funai", retinue: 260, retTrain: 62 },
  { id: "ot_usuki2", name: "吉岡長増", faction: "otomo", lead: 70, valor: 66, wit: 76, gov: 74, loyal: 90, age: 48, at: "usuki", retinue: 260, retTrain: 62 },
  { id: "ot_usuki3", name: "田原親宏", faction: "otomo", lead: 68, valor: 70, wit: 64, gov: 60, loyal: 74, age: 34, at: "usuki", retinue: 250, retTrain: 62 },
  { id: "ot_kurume2", name: "問注所統景", faction: "otomo", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 82, age: 22, at: "kurume", retinue: 240, retTrain: 60 },
  { id: "ot_kurume3", name: "星野親忠", faction: "otomo", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 78, age: 28, at: "kurume", retinue: 240, retTrain: 60 },
  { id: "sg_oka2", name: "志賀道輝", faction: "shiga", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 86, age: 26, at: "oka", retinue: 250, retTrain: 62 },
  { id: "sg_oka3", name: "入田親誠", faction: "shiga", lead: 64, valor: 64, wit: 64, gov: 62, loyal: 66, age: 36, at: "oka", retinue: 240, retTrain: 60 },
  { id: "km_yanagawa2", name: "蒲池鎮漣", faction: "kamachi", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 88, age: 8, at: "yanagawa", retinue: 240, retTrain: 60 },
  { id: "km_yanagawa3", name: "田尻鑑種", faction: "kamachi", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 74, age: 24, at: "yanagawa", retinue: 240, retTrain: 60 },
  { id: "az_akizuki3", name: "恵利暢堯", faction: "akizuki", lead: 64, valor: 64, wit: 66, gov: 62, loyal: 84, age: 28, at: "akizuki", retinue: 240, retTrain: 60 },
  { id: "rz_saga2", name: "鍋島直茂", faction: "ryuzoji", lead: 80, valor: 72, wit: 84, gov: 84, loyal: 90, age: 8, at: "saga", retinue: 250, retTrain: 64 },
  { id: "rz_saga3", name: "納富信景", faction: "ryuzoji", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 84, age: 26, at: "saga", retinue: 240, retTrain: 60 },
  { id: "ht_kishitake2", name: "波多鎮", faction: "hata", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 84, age: 18, at: "kishitake", retinue: 240, retTrain: 60 },
  { id: "ht_kishitake3", name: "日高喜", faction: "hata", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 28, at: "kishitake", retinue: 230, retTrain: 58 },
  { id: "mt_hirado2", name: "松浦信実", faction: "matsura", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 86, age: 22, at: "hirado", retinue: 240, retTrain: 60 },
  { id: "mt_hirado3", name: "籠手田安経", faction: "matsura", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 84, age: 26, at: "hirado", retinue: 240, retTrain: 60 },
  { id: "mt_iki2", name: "佐志隆", faction: "matsura", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 30, at: "iki", retinue: 220, retTrain: 58 },
  { id: "mt_iki3", name: "日高資", faction: "matsura", lead: 60, valor: 62, wit: 58, gov: 56, loyal: 80, age: 26, at: "iki", retinue: 210, retTrain: 58 },
  { id: "ar_hinoe2", name: "有馬義貞", faction: "arima", lead: 66, valor: 66, wit: 64, gov: 62, loyal: 90, age: 25, at: "hinoe", retinue: 250, retTrain: 60 },
  { id: "ar_hinoe3", name: "安富純泰", faction: "arima", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 82, age: 30, at: "hinoe", retinue: 240, retTrain: 60 },
  { id: "om_omura2", name: "朝長純安", faction: "omura", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 26, at: "omura", retinue: 230, retTrain: 58 },
  { id: "om_omura3", name: "針尾伊賀守", faction: "omura", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 30, at: "omura", retinue: 220, retTrain: 58 },
  { id: "kk_kumamoto2", name: "城親冬", faction: "kikuchi", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 80, age: 30, at: "kumamoto", retinue: 250, retTrain: 60 },
  { id: "kk_kumamoto3", name: "隈部親永", faction: "kikuchi", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 72, age: 22, at: "kumamoto", retinue: 250, retTrain: 60 },
  { id: "sr_hitoyoshi2", name: "相良頼房", faction: "sagara", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 88, age: 26, at: "hitoyoshi", retinue: 250, retTrain: 60 },
  { id: "sr_hitoyoshi3", name: "犬童頼安", faction: "sagara", lead: 66, valor: 68, wit: 64, gov: 60, loyal: 88, age: 20, at: "hitoyoshi", retinue: 240, retTrain: 60 },
  { id: "sr_yatsushiro3", name: "深水長智", faction: "sagara", lead: 64, valor: 62, wit: 70, gov: 72, loyal: 88, age: 14, at: "yatsushiro", retinue: 240, retTrain: 58 },
  { id: "it_sadowara2", name: "伊東祐兵", faction: "ito", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 88, age: 22, at: "sadowara", retinue: 250, retTrain: 60 },
  { id: "it_sadowara3", name: "米良重方", faction: "ito", lead: 64, valor: 68, wit: 60, gov: 54, loyal: 84, age: 28, at: "sadowara", retinue: 240, retTrain: 60 },
  { id: "it_tonokori2", name: "落合兼朝", faction: "ito", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 26, at: "tonokori", retinue: 240, retTrain: 60 },
  { id: "it_tonokori3", name: "長倉祐政", faction: "ito", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 30, at: "tonokori", retinue: 230, retTrain: 58 },
  { id: "tc_agata2", name: "土持親佐", faction: "tsuchimochi", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 28, at: "agata", retinue: 230, retTrain: 58 },
  { id: "tc_agata3", name: "米良矩重", faction: "tsuchimochi", lead: 62, valor: 64, wit: 58, gov: 54, loyal: 80, age: 26, at: "agata", retinue: 220, retTrain: 58 },
  { id: "sz_uchijo4", name: "川上忠克", faction: "shimazu", lead: 68, valor: 72, wit: 62, gov: 58, loyal: 90, age: 28, at: "uchijo", retinue: 250, retTrain: 64 },
  { id: "sz_izumi2", name: "島津忠将", faction: "shimazu", lead: 72, valor: 74, wit: 66, gov: 62, loyal: 92, age: 26, at: "izumi", retinue: 250, retTrain: 64 },
  { id: "sz_izumi3", name: "本田親安", faction: "shimazu", lead: 66, valor: 70, wit: 62, gov: 58, loyal: 88, age: 30, at: "izumi", retinue: 240, retTrain: 62 },
  { id: "sz_kajiki2", name: "肝付兼演", faction: "shimazu", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 70, age: 36, at: "kajiki", retinue: 250, retTrain: 62 },
  { id: "sz_kajiki3", name: "伊集院忠倉", faction: "shimazu", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 88, age: 26, at: "kajiki", retinue: 240, retTrain: 62 },
  { id: "sz_shibushi2", name: "禰寝重長", faction: "shimazu", lead: 66, valor: 70, wit: 62, gov: 58, loyal: 72, age: 10, at: "shibushi", retinue: 240, retTrain: 62 },
  { id: "sz_shibushi3", name: "上井覚兼", faction: "shimazu", lead: 64, valor: 66, wit: 62, gov: 60, loyal: 86, age: 24, at: "shibushi", retinue: 240, retTrain: 60 },
  { id: "sz_obi2", name: "新納忠堯", faction: "shimazu", lead: 66, valor: 70, wit: 62, gov: 56, loyal: 88, age: 26, at: "obi", retinue: 240, retTrain: 62 },
  { id: "so_kanaishi2", name: "宗調親", faction: "so", lead: 62, valor: 62, wit: 62, gov: 60, loyal: 88, age: 22, at: "kanaishi", retinue: 230, retTrain: 58 },
  { id: "so_kanaishi3", name: "柳川調信", faction: "so", lead: 62, valor: 60, wit: 66, gov: 64, loyal: 86, age: 18, at: "kanaishi", retinue: 220, retTrain: 56 },
  { id: "dt_shiroishi2", name: "白石宗綱", faction: "date", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 86, age: 28, at: "shiroishi", retinue: 240, retTrain: 60 },
  { id: "dt_shiroishi3", name: "小梁川宗秀", faction: "date", lead: 64, valor: 64, wit: 64, gov: 62, loyal: 88, age: 32, at: "shiroishi", retinue: 240, retTrain: 60 },
  { id: "dt_watari2", name: "亘理重宗", faction: "date", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 86, age: 22, at: "watari", retinue: 240, retTrain: 60 },
  { id: "dt_watari3", name: "中島宗求", faction: "date", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 84, age: 26, at: "watari", retinue: 230, retTrain: 58 },
  { id: "as_kurokawa3", name: "富田隆実", faction: "ashina", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 86, age: 24, at: "kurokawa", retinue: 250, retTrain: 62 },
  { id: "as_inawashiro2", name: "猪苗代盛胤", faction: "ashina", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 72, age: 16, at: "inawashiro", retinue: 240, retTrain: 60 },
  { id: "as_inawashiro3", name: "針生盛信", faction: "ashina", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 78, age: 28, at: "inawashiro", retinue: 230, retTrain: 58 },
  { id: "nb_sannohe2", name: "北信愛", faction: "nanbu", lead: 70, valor: 68, wit: 72, gov: 68, loyal: 88, age: 23, at: "sannohe", retinue: 250, retTrain: 62 },
  { id: "nb_sannohe3", name: "南長義", faction: "nanbu", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 84, age: 30, at: "sannohe", retinue: 250, retTrain: 62 },
  { id: "nb_kozukata2", name: "福士慶善", faction: "nanbu", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 28, at: "kozukata", retinue: 240, retTrain: 60 },
  { id: "nb_kozukata3", name: "毛馬内秀範", faction: "nanbu", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 24, at: "kozukata", retinue: 240, retTrain: 60 },
  { id: "kh_kunohe3", name: "久慈政則", faction: "kunohe", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 80, age: 26, at: "kunohe", retinue: 240, retTrain: 60 },
  { id: "mg_yamagata3", name: "氏家定直", faction: "mogami", lead: 66, valor: 66, wit: 66, gov: 64, loyal: 88, age: 40, at: "yamagata", retinue: 250, retTrain: 60 },
  { id: "td_tendo3", name: "延沢満延", faction: "tendo", lead: 68, valor: 78, wit: 58, gov: 54, loyal: 80, age: 22, at: "tendo", retinue: 240, retTrain: 62 },
  { id: "dh_ourayama2", name: "土佐林禅棟", faction: "daihoji", lead: 64, valor: 64, wit: 64, gov: 62, loyal: 74, age: 36, at: "ourayama", retinue: 240, retTrain: 60 },
  { id: "dh_ourayama3", name: "来次氏秀", faction: "daihoji", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 28, at: "ourayama", retinue: 230, retTrain: 58 },
  { id: "on_yokote2", name: "小野寺輝道", faction: "onodera", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 88, age: 12, at: "yokote", retinue: 240, retTrain: 60 },
  { id: "on_yokote3", name: "八柏道為", faction: "onodera", lead: 64, valor: 64, wit: 66, gov: 62, loyal: 86, age: 20, at: "yokote", retinue: 240, retTrain: 60 },
  { id: "an_hiyama2", name: "安東茂季", faction: "ando", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 86, age: 16, at: "hiyama", retinue: 240, retTrain: 60 },
  { id: "an_hiyama3", name: "南部季賢", faction: "ando", lead: 62, valor: 64, wit: 60, gov: 58, loyal: 82, age: 30, at: "hiyama", retinue: 230, retTrain: 58 },
  { id: "an_minato2", name: "豊島玄蕃", faction: "ando", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 70, age: 28, at: "minato", retinue: 240, retTrain: 60 },
  { id: "an_minato3", name: "湊道季", faction: "ando", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 74, age: 24, at: "minato", retinue: 230, retTrain: 58 },
  { id: "os_iwadeyama2", name: "氏家直継", faction: "osaki", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 80, age: 30, at: "iwadeyama", retinue: 240, retTrain: 60 },
  { id: "os_iwadeyama3", name: "古川持熙", faction: "osaki", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 78, age: 26, at: "iwadeyama", retinue: 230, retTrain: 58 },
  { id: "kb_sendai2", name: "国分盛重", faction: "kokubun", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 84, age: 26, at: "sendai", retinue: 230, retTrain: 58 },
  { id: "kb_sendai3", name: "堀江掃部", faction: "kokubun", lead: 62, valor: 64, wit: 58, gov: 54, loyal: 82, age: 30, at: "sendai", retinue: 220, retTrain: 58 },
  { id: "ks_teraike2", name: "葛西親信", faction: "kasai", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 86, age: 18, at: "teraike", retinue: 240, retTrain: 60 },
  { id: "ks_teraike3", name: "柏山明助", faction: "kasai", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 80, age: 26, at: "teraike", retinue: 240, retTrain: 60 },
  { id: "ab_yokota2", name: "阿曽沼広長", faction: "abe", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 86, age: 10, at: "yokota", retinue: 230, retTrain: 58 },
  { id: "ab_yokota3", name: "鱒沢広勝", faction: "abe", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 24, at: "yokota", retinue: 220, retTrain: 58 },
  { id: "sb_kosuiji2", name: "斯波経詮", faction: "shiba", lead: 60, valor: 62, wit: 58, gov: 56, loyal: 84, age: 26, at: "kosuiji", retinue: 230, retTrain: 58 },
  { id: "sb_kosuiji3", name: "岩清水義教", faction: "shiba", lead: 60, valor: 62, wit: 58, gov: 54, loyal: 82, age: 30, at: "kosuiji", retinue: 220, retTrain: 56 },
  { id: "nm_namioka2", name: "浪岡顕範", faction: "namioka", lead: 62, valor: 62, wit: 62, gov: 60, loyal: 86, age: 24, at: "namioka", retinue: 230, retTrain: 58 },
  { id: "nm_namioka3", name: "川原具信", faction: "namioka", lead: 60, valor: 62, wit: 58, gov: 56, loyal: 84, age: 28, at: "namioka", retinue: 220, retTrain: 56 },
  { id: "or_oura2", name: "森岡信元", faction: "oura", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 26, at: "oura", retinue: 230, retTrain: 60 },
  { id: "or_oura3", name: "小笠原信浄", faction: "oura", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 30, at: "oura", retinue: 220, retTrain: 58 },
  { id: "sm_soma2", name: "相馬義胤", faction: "soma", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 88, age: 20, at: "soma", retinue: 250, retTrain: 62 },
  { id: "sm_soma3", name: "門馬和泉", faction: "soma", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 28, at: "soma", retinue: 240, retTrain: 60 },
  { id: "nh_nihonmatsu2", name: "畠山義継", faction: "nihonmatsu", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 86, age: 14, at: "nihonmatsu", retinue: 240, retTrain: 60 },
  { id: "nh_nihonmatsu3", name: "遊佐丹波", faction: "nihonmatsu", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 30, at: "nihonmatsu", retinue: 230, retTrain: 58 },
  { id: "sw_shirakawa2", name: "結城義親", faction: "shirakawa", lead: 64, valor: 64, wit: 62, gov: 60, loyal: 86, age: 16, at: "shirakawa", retinue: 240, retTrain: 60 },
  { id: "sw_shirakawa3", name: "小峰義名", faction: "shirakawa", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 28, at: "shirakawa", retinue: 230, retTrain: 58 },
  { id: "nk_sukagawa2", name: "二階堂盛義", faction: "nikaido", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 88, age: 12, at: "sukagawa", retinue: 240, retTrain: 60 },
  { id: "nk_sukagawa3", name: "保土原行藤", faction: "nikaido", lead: 62, valor: 64, wit: 60, gov: 58, loyal: 84, age: 26, at: "sukagawa", retinue: 230, retTrain: 58 },
  { id: "tm_miharu3", name: "橋本顕徳", faction: "tamura", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 84, age: 28, at: "miharu", retinue: 230, retTrain: 58 },
  { id: "kz_matsumae2", name: "蠣崎舜広", faction: "kakizaki", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 10, at: "matsumae", retinue: 240, retTrain: 58 },
  { id: "kz_matsumae3", name: "下国師季", faction: "kakizaki", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 26, at: "matsumae", retinue: 230, retTrain: 58 },
  { id: "kz_hakodate2", name: "河野季通", faction: "kakizaki", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 28, at: "hakodate", retinue: 220, retTrain: 58 },
  { id: "kz_hakodate3", name: "相原季胤", faction: "kakizaki", lead: 62, valor: 64, wit: 58, gov: 54, loyal: 80, age: 24, at: "hakodate", retinue: 220, retTrain: 58 },
  { id: "kz_esashi2", name: "近藤季常", faction: "kakizaki", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 26, at: "esashi", retinue: 220, retTrain: 58 },
  { id: "kz_esashi3", name: "南条広継", faction: "kakizaki", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 74, age: 30, at: "esashi", retinue: 220, retTrain: 58 },
  { id: "aw2_osha2", name: "シリベシ乙名", faction: "ainu_w", lead: 62, valor: 68, wit: 56, gov: 52, loyal: 86, age: 22, at: "oshamanbe", retinue: 210, retTrain: 58 },
  { id: "aw2_osha3", name: "ユウフツ乙名", faction: "ainu_w", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 84, age: 30, at: "oshamanbe", retinue: 210, retTrain: 58 },
  { id: "aw2_otaru2", name: "ヨイチ乙名", faction: "ainu_w", lead: 64, valor: 68, wit: 58, gov: 54, loyal: 86, age: 26, at: "otaru", retinue: 220, retTrain: 58 },
  { id: "aw2_otaru3", name: "シャコタン乙名", faction: "ainu_w", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 84, age: 32, at: "otaru", retinue: 210, retTrain: 58 },
  { id: "aw2_ishikari2", name: "サッポロ乙名", faction: "ainu_w", lead: 66, valor: 70, wit: 60, gov: 56, loyal: 88, age: 28, at: "ishikari", retinue: 230, retTrain: 60 },
  { id: "aw2_ishikari3", name: "チトセ乙名", faction: "ainu_w", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 86, age: 24, at: "ishikari", retinue: 210, retTrain: 58 },
  { id: "ae2_sizunai2", name: "ウラカワ乙名", faction: "ainu_e", lead: 64, valor: 68, wit: 58, gov: 54, loyal: 86, age: 26, at: "sizunai", retinue: 220, retTrain: 60 },
  { id: "ae2_sizunai3", name: "ミツイシ乙名", faction: "ainu_e", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 84, age: 30, at: "sizunai", retinue: 210, retTrain: 58 },
  { id: "ae2_kushiro2", name: "アッケシ乙名", faction: "ainu_e", lead: 64, valor: 68, wit: 58, gov: 54, loyal: 86, age: 24, at: "kushiro", retinue: 220, retTrain: 58 },
  { id: "ae2_kushiro3", name: "シラヌカ乙名", faction: "ainu_e", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 84, age: 28, at: "kushiro", retinue: 210, retTrain: 58 },
  { id: "ae2_nemuro2", name: "ノッケ乙名", faction: "ainu_e", lead: 62, valor: 66, wit: 58, gov: 52, loyal: 84, age: 26, at: "nemuro", retinue: 200, retTrain: 58 },
  { id: "ae2_nemuro3", name: "クナシリ乙名", faction: "ainu_e", lead: 62, valor: 68, wit: 56, gov: 52, loyal: 82, age: 30, at: "nemuro", retinue: 200, retTrain: 58 },
  { id: "an2_abashiri2", name: "シャリ乙名", faction: "ainu_n", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 84, age: 26, at: "abashiri", retinue: 200, retTrain: 58 },
  { id: "an2_abashiri3", name: "モンベツ乙名", faction: "ainu_n", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 82, age: 30, at: "abashiri", retinue: 200, retTrain: 58 },
  { id: "an2_soya2", name: "リシリ乙名", faction: "ainu_n", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 84, age: 24, at: "soya", retinue: 200, retTrain: 58 },
  { id: "an2_soya3", name: "レブン乙名", faction: "ainu_n", lead: 60, valor: 64, wit: 58, gov: 54, loyal: 82, age: 28, at: "soya", retinue: 190, retTrain: 56 },
  { id: "an2_rumoi2", name: "テシオ乙名", faction: "ainu_n", lead: 62, valor: 66, wit: 58, gov: 54, loyal: 84, age: 26, at: "rumoi", retinue: 200, retTrain: 58 },
  { id: "an2_rumoi3", name: "マシケ乙名", faction: "ainu_n", lead: 60, valor: 64, wit: 58, gov: 54, loyal: 82, age: 30, at: "rumoi", retinue: 190, retTrain: 56 },
  { id: "ry_shuri2", name: "謝名利山", faction: "ryukyu", lead: 62, valor: 54, wit: 72, gov: 74, loyal: 90, age: 28, at: "shurijo", retinue: 240, retTrain: 54 },
  { id: "ry_shuri3", name: "浦添按司", faction: "ryukyu", lead: 64, valor: 60, wit: 66, gov: 66, loyal: 88, age: 32, at: "shurijo", retinue: 240, retTrain: 54 },
  { id: "ry_naka2", name: "勝連按司", faction: "ryukyu", lead: 64, valor: 62, wit: 64, gov: 62, loyal: 84, age: 30, at: "nakagusuku", retinue: 230, retTrain: 54 },
  { id: "ry_naka3", name: "知念按司", faction: "ryukyu", lead: 62, valor: 60, wit: 62, gov: 62, loyal: 86, age: 26, at: "nakagusuku", retinue: 220, retTrain: 54 },
  { id: "ry_miyako2", name: "八重山按司", faction: "ryukyu", lead: 62, valor: 62, wit: 60, gov: 58, loyal: 80, age: 30, at: "miyako", retinue: 200, retTrain: 54 },
  { id: "ry_miyako3", name: "石垣按司", faction: "ryukyu", lead: 60, valor: 62, wit: 58, gov: 56, loyal: 80, age: 26, at: "miyako", retinue: 190, retTrain: 54 },
  { id: "m5_shoryuji2", name: "三好為三", faction: "miyoshi", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 80, age: 22, at: "shoryuji", retinue: 240, retTrain: 60 },
  { id: "m5_kishiwada2", name: "寒川元家", faction: "miyoshi", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 82, age: 28, at: "kishiwada", retinue: 240, retTrain: 60 },
  { id: "m5_shigisan2", name: "竹内秀勝", faction: "miyoshi", lead: 64, valor: 64, wit: 66, gov: 64, loyal: 74, age: 30, at: "shigisan", retinue: 240, retTrain: 60 },
  { id: "m5_yura3", name: "池田教正", faction: "miyoshi", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 80, age: 24, at: "yura", retinue: 230, retTrain: 60 },
  { id: "m5_shozui2", name: "篠原長秀", faction: "miyoshi", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 28, at: "shozui", retinue: 240, retTrain: 60 },
  { id: "m5_hakuchi2", name: "大西頼包", faction: "miyoshi", lead: 62, valor: 64, wit: 60, gov: 56, loyal: 80, age: 22, at: "hakuchi", retinue: 230, retTrain: 58 },
  { id: "m5_sogo4", name: "三好政成", faction: "miyoshi", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 86, age: 20, at: "sogo", retinue: 240, retTrain: 60 },
  { id: "o5_kuragake2", name: "杉隆相", faction: "ouchi", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 78, age: 26, at: "kuragake", retinue: 240, retTrain: 60 },
  { id: "o5_shimofuri3", name: "内藤隆時", faction: "ouchi", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 30, at: "shimofuri", retinue: 230, retTrain: 58 },
  { id: "o5_tachibana3", name: "薦野増時", faction: "ouchi", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 78, age: 28, at: "tachibanayama", retinue: 240, retTrain: 60 },
  { id: "o5_iwaya3", name: "北原鎮久", faction: "ouchi", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 76, age: 26, at: "iwaya", retinue: 230, retTrain: 58 },
  { id: "o5_kokura3", name: "杉連並", faction: "ouchi", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 78, age: 30, at: "kokura", retinue: 230, retTrain: 58 },
  { id: "o5_umagatake3", name: "長野種信", faction: "ouchi", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 76, age: 24, at: "umagatake", retinue: 230, retTrain: 58 },
  { id: "sm5_tateyama3", name: "正木時通", faction: "satomi", lead: 66, valor: 70, wit: 62, gov: 56, loyal: 86, age: 20, at: "tateyama", retinue: 240, retTrain: 62 },
  { id: "sm5_kururi2", name: "土岐為頼", faction: "satomi", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 80, age: 26, at: "kururi", retinue: 240, retTrain: 60 },
  { id: "sm5_kururi3", name: "安西実元", faction: "satomi", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 84, age: 30, at: "kururi", retinue: 230, retTrain: 58 },
  { id: "sm5_otaki2", name: "正木憲時", faction: "satomi", lead: 64, valor: 68, wit: 58, gov: 54, loyal: 84, age: 22, at: "otaki", retinue: 240, retTrain: 60 },
  { id: "sm5_otaki3", name: "万木時綱", faction: "satomi", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 28, at: "otaki", retinue: 230, retTrain: 58 },
  { id: "sm5_sanuki2", name: "秋元義正", faction: "satomi", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 26, at: "sanuki", retinue: 230, retTrain: 58 },
  { id: "sm5_sanuki3", name: "佐貫時春", faction: "satomi", lead: 62, valor: 64, wit: 58, gov: 54, loyal: 80, age: 30, at: "sanuki", retinue: 220, retTrain: 58 },
  { id: "ts5_koriyama3", name: "松倉重信", faction: "tsutsui", lead: 68, valor: 68, wit: 70, gov: 64, loyal: 86, age: 13, at: "koriyama", retinue: 240, retTrain: 60 },
  { id: "ts5_tamon2", name: "布施行盛", faction: "tsutsui", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 82, age: 26, at: "tamonyama", retinue: 240, retTrain: 60 },
  { id: "ts5_tamon3", name: "森好之", faction: "tsutsui", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 30, at: "tamonyama", retinue: 230, retTrain: 58 },
  { id: "ts5_takatori2", name: "越智家秀", faction: "tsutsui", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 78, age: 28, at: "takatori", retinue: 240, retTrain: 60 },
  { id: "ts5_takatori3", name: "箸尾為綱", faction: "tsutsui", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 78, age: 24, at: "takatori", retinue: 230, retTrain: 58 },
  { id: "sk5_saika3", name: "岡吉正", faction: "saika", lead: 66, valor: 72, wit: 62, gov: 54, loyal: 86, age: 24, at: "saika", retinue: 230, retTrain: 64 },
  { id: "sk5_shingu2", name: "堀内氏善", faction: "saika", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 26, at: "shingu", retinue: 240, retTrain: 60 },
  { id: "sk5_shingu3", name: "小山隆綱", faction: "saika", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 30, at: "shingu", retinue: 230, retTrain: 58 },
  { id: "sk5_tetori2", name: "湯川直春", faction: "saika", lead: 66, valor: 70, wit: 62, gov: 56, loyal: 80, age: 18, at: "tetori", retinue: 240, retTrain: 62 },
  { id: "sk5_tetori3", name: "玉置永直", faction: "saika", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 28, at: "tetori", retinue: 230, retTrain: 58 },
  { id: "ht5_yakami2", name: "波多野宗高", faction: "hatano", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 86, age: 20, at: "yagami", retinue: 240, retTrain: 60 },
  { id: "ht5_yakami3", name: "赤井時家", faction: "hatano", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 74, age: 34, at: "yagami", retinue: 240, retTrain: 60 },
  { id: "ht5_kameyama2", name: "内藤国貞", faction: "hatano", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 74, age: 32, at: "kameyama_t", retinue: 240, retTrain: 60 },
  { id: "ht5_kameyama3", name: "川勝継氏", faction: "hatano", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 78, age: 26, at: "kameyama_t", retinue: 230, retTrain: 58 },
  { id: "ht5_yokoyama2", name: "赤井家清", faction: "hatano", lead: 64, valor: 68, wit: 58, gov: 54, loyal: 76, age: 28, at: "yokoyama", retinue: 240, retTrain: 60 },
  { id: "ht5_yokoyama3", name: "荻野秋清", faction: "hatano", lead: 62, valor: 64, wit: 58, gov: 54, loyal: 74, age: 32, at: "yokoyama", retinue: 230, retTrain: 58 },
  { id: "ki5_kanazawa3", name: "超勝寺実照", faction: "kaga_ikko", lead: 64, valor: 62, wit: 68, gov: 66, loyal: 90, age: 30, at: "kanazawa", retinue: 250, retTrain: 58 },
  { id: "ki5_komatsu2", name: "若林長門", faction: "kaga_ikko", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 88, age: 26, at: "komatsu", retinue: 240, retTrain: 58 },
  { id: "ki5_komatsu3", name: "岸田常光", faction: "kaga_ikko", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 86, age: 30, at: "komatsu", retinue: 230, retTrain: 58 },
  { id: "ki5_torigoe2", name: "鈴木重泰", faction: "kaga_ikko", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 88, age: 24, at: "torigoe", retinue: 240, retTrain: 58 },
  { id: "ki5_torigoe3", name: "二曲兵庫", faction: "kaga_ikko", lead: 62, valor: 64, wit: 58, gov: 54, loyal: 86, age: 28, at: "torigoe", retinue: 230, retTrain: 58 },
  { id: "is5_iwakura3", name: "織田信家", faction: "ise", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 24, at: "iwakura", retinue: 240, retTrain: 58 },
  { id: "is5_inuyama3", name: "中島豊後守", faction: "ise", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 78, age: 30, at: "inuyama", retinue: 240, retTrain: 58 },
  { id: "ed5_mito2", name: "江戸通泰", faction: "edo_h", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 86, age: 22, at: "mito", retinue: 240, retTrain: 58 },
  { id: "ed5_mito3", name: "春秋詮胤", faction: "edo_h", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 28, at: "mito", retinue: 230, retTrain: 58 },
  { id: "ed5_fuchu2", name: "大掾貞国", faction: "edo_h", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 84, age: 26, at: "fuchu_hitachi", retinue: 230, retTrain: 58 },
  { id: "ed5_fuchu3", name: "真崎親幹", faction: "edo_h", lead: 60, valor: 62, wit: 58, gov: 56, loyal: 82, age: 30, at: "fuchu_hitachi", retinue: 220, retTrain: 56 },
  { id: "kg5_koga3", name: "野田景範", faction: "koga", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 84, age: 26, at: "koga", retinue: 230, retTrain: 58 },
  { id: "kg5_sekiyado2", name: "簗田助縄", faction: "koga", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 86, age: 20, at: "sekiyado", retinue: 240, retTrain: 60 },
  { id: "kg5_sekiyado3", name: "水海元家", faction: "koga", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 28, at: "sekiyado", retinue: 230, retTrain: 58 },
  { id: "cb5_motosakura3", name: "円城寺尚永", faction: "chiba", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 24, at: "motosakura", retinue: 240, retTrain: 58 },
  { id: "cb5_usui2", name: "原胤栄", faction: "chiba", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 86, age: 16, at: "usui", retinue: 240, retTrain: 58 },
  { id: "cb5_usui3", name: "高城胤吉", faction: "chiba", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 82, age: 36, at: "usui", retinue: 230, retTrain: 58 },
  { id: "kt5_matsugashima3", name: "大宮含忍斎", faction: "kitabatake", lead: 64, valor: 64, wit: 64, gov: 62, loyal: 84, age: 32, at: "matsugashima", retinue: 240, retTrain: 58 },
  { id: "is5_miyazu3", name: "延永数馬", faction: "isshiki", lead: 62, valor: 64, wit: 58, gov: 56, loyal: 80, age: 28, at: "miyazu", retinue: 230, retTrain: 58 },
  { id: "ot5_iwatsuki3", name: "太田資武", faction: "ota", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 84, age: 18, at: "iwatsuki", retinue: 240, retTrain: 60 },
  { id: "nr5_oshi3", name: "成田泰季", faction: "narita", lead: 64, valor: 66, wit: 60, gov: 58, loyal: 84, age: 26, at: "oshi", retinue: 240, retTrain: 58 },
  { id: "sn5_karasawa3", name: "佐野宗綱", faction: "sano", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 22, at: "karasawa", retinue: 240, retTrain: 60 },
  { id: "ns5_karasuyama3", name: "大田原資清", faction: "nasu", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 78, age: 30, at: "karasuyama", retinue: 240, retTrain: 60 },
  { id: "ut5_utsunomiya3", name: "壬生綱雄", faction: "utsunomiya", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 70, age: 26, at: "utsunomiya", retinue: 240, retTrain: 60 },
  { id: "od5_oda3", name: "菅谷勝貞", faction: "oda_h", lead: 66, valor: 68, wit: 62, gov: 58, loyal: 90, age: 40, at: "oda", retinue: 240, retTrain: 60 },
  { id: "yk5_yuki3", name: "多賀谷政経", faction: "yuki", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 78, age: 28, at: "yuki", retinue: 240, retTrain: 60 },
  { id: "ng5_minowa3", name: "上泉信綱", faction: "nagano_k", lead: 76, valor: 92, wit: 72, gov: 58, loyal: 90, age: 38, at: "minowa", retinue: 240, retTrain: 68 },
  { id: "yr5_kanayama3", name: "横瀬成繁", faction: "yura", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 84, age: 26, at: "kanayama", retinue: 240, retTrain: 60 },
  { id: "sk5_shiba2", name: "高水寺詮貞", faction: "shiba", lead: 60, valor: 62, wit: 58, gov: 56, loyal: 82, age: 28, at: "kosuiji", retinue: 220, retTrain: 56 },
  { id: "mr5_mogami2", name: "氏家光棟", faction: "mogami", lead: 64, valor: 66, wit: 60, gov: 56, loyal: 84, age: 26, at: "yamagata", retinue: 240, retTrain: 60 },
  { id: "hj5_odawara3", name: "石巻家貞", faction: "hojo", lead: 64, valor: 64, wit: 66, gov: 66, loyal: 88, age: 36, at: "odawara", retinue: 240, retTrain: 60 },
  { id: "mr5_koriyama6", name: "粟屋元親", faction: "mori", lead: 64, valor: 66, wit: 62, gov: 58, loyal: 86, age: 26, at: "koriyama_a", retinue: 240, retTrain: 60 },
  { id: "mk_makabe5", name: "田中義房", faction: "satake", lead: 62, valor: 66, wit: 60, gov: 58, loyal: 84, age: 32, at: "makabe", retinue: 230, retTrain: 58 },
  { id: "mk_makabe4", name: "真壁道無", faction: "satake", lead: 66, valor: 74, wit: 60, gov: 56, loyal: 88, age: 48, at: "makabe", retinue: 240, retTrain: 62 },
  { id: "sz_obi4", name: "山田有信", faction: "shimazu", lead: 70, valor: 76, wit: 64, gov: 60, loyal: 90, age: 30, at: "obi", retinue: 240, retTrain: 64 },
  { id: "as_kurokawa5", name: "佐瀬種常", faction: "ashina", lead: 64, valor: 66, wit: 62, gov: 60, loyal: 86, age: 36, at: "kurokawa", retinue: 240, retTrain: 60 },
  { id: "ashikaga3", name: "細川晴元", faction: "ashikaga", lead: 66, valor: 60, wit: 70, gov: 68, loyal: 62, age: 32, at: "nijo", retinue: 300, retTrain: 60 },
  { id: "kb_takakage0", name: "小早川正平", faction: "kobayakawa", lead: 66, valor: 66, wit: 64, gov: 64, loyal: 90, age: 34, at: "mihara", retinue: 280, retTrain: 62 },
  { id: "on_michiyori", name: "小野寺稙道", faction: "onodera", lead: 68, valor: 66, wit: 66, gov: 66, loyal: 96, age: 42, at: "yokote", retinue: 300, retTrain: 60 },
];


const ROADS = [
  ["sannohe", "namioka", 65, "山道"], ["sannohe", "kunohe", 13, "街道"], ["namioka", "oura", 19, "街道"],
  ["oura", "hiyama", 60, "難所"], ["kunohe", "kozukata", 65, "街道"], ["kozukata", "kosuiji", 16, "街道"],
  ["kozukata", "minato", 90, "難所"], ["kosuiji", "yokota", 42, "山道"], ["kosuiji", "yokote", 56, "山道"],
  ["yokota", "teraike", 77, "難所"], ["teraike", "iwadeyama", 27, "街道"], ["teraike", "sendai", 57, "街道"],
  ["iwadeyama", "sendai", 50, "街道"], ["iwadeyama", "tendo", 58, "難所"], ["iwadeyama", "yokote", 73, "難所"],
  ["sendai", "watari", 24, "街道"], ["sendai", "tendo", 44, "山道"], ["watari", "shiroishi", 21, "街道"],
  ["watari", "soma", 27, "街道"], ["shiroishi", "nihonmatsu", 48, "山道"], ["shiroishi", "yonezawa", 47, "難所"],
  ["shiroishi", "yamagata", 38, "山道"], ["kurokawa", "inawashiro", 18, "街道"], ["kurokawa", "shirakawa", 47, "山道"],
  ["kurokawa", "tochio", 86, "難所"], ["kurokawa", "sanjo", 87, "難所"], ["kurokawa", "shibata", 74, "山道"],
  ["inawashiro", "nihonmatsu", 28, "山道"], ["inawashiro", "sukagawa", 38, "山道"], ["inawashiro", "yonezawa", 39, "街道"],
  ["nihonmatsu", "soma", 48, "山道"], ["nihonmatsu", "miharu", 18, "街道"], ["nihonmatsu", "yonezawa", 45, "山道"],
  ["shirakawa", "sukagawa", 22, "街道"], ["shirakawa", "karasuyama", 53, "山道"], ["sukagawa", "miharu", 20, "街道"],
  ["yonezawa", "yamagata", 43, "山道"], ["yonezawa", "shibata", 68, "難所"], ["yonezawa", "murakami", 66, "難所"],
  ["yamagata", "tendo", 13, "街道"], ["yamagata", "murakami", 75, "難所"], ["tendo", "ourayama", 60, "山道"],
  ["ourayama", "yokote", 93, "難所"], ["ourayama", "murakami", 61, "山道"], ["yokote", "minato", 63, "街道"],
  ["minato", "hiyama", 44, "山道"], ["mito", "ota_hitachi", 19, "街道"], ["mito", "makabe", 36, "街道"],
  ["mito", "fuchu_hitachi", 21, "街道"], ["ota_hitachi", "karasuyama", 37, "街道"], ["oda", "makabe", 18, "街道"],
  ["oda", "fuchu_hitachi", 33, "街道"], ["oda", "motosakura", 47, "街道"], ["oda", "usui", 46, "街道"],
  ["oda", "sekiyado", 28, "海路"], ["makabe", "fuchu_hitachi", 34, "街道"], ["makabe", "yuki", 20, "街道"],
  ["makabe", "karasuyama", 41, "街道"], ["fuchu_hitachi", "motosakura", 53, "街道"], ["yuki", "koga", 20, "街道"],
  ["yuki", "utsunomiya", 28, "街道"], ["yuki", "karasawa", 25, "街道"], ["koga", "karasawa", 22, "街道"],
  ["koga", "oshi", 22, "街道"], ["koga", "sekiyado", 16, "街道"], ["utsunomiya", "karasawa", 31, "街道"],
  ["utsunomiya", "karasuyama", 26, "街道"], ["karasawa", "kanayama", 23, "街道"], ["karasawa", "oshi", 30, "街道"],
  ["minowa", "maebashi", 11, "街道"], ["minowa", "numata", 27, "街道"], ["minowa", "komoro", 47, "難所"],
  ["hirai", "maebashi", 22, "街道"], ["hirai", "kanayama", 26, "街道"], ["hirai", "hachigata", 30, "街道"],
  ["maebashi", "numata", 29, "街道"], ["maebashi", "kanayama", 29, "街道"], ["maebashi", "fukaya", 29, "街道"],
  ["numata", "tochio", 92, "難所"], ["kanayama", "oshi", 21, "街道"],
  ["kanayama", "fukaya", 15, "街道"], ["kawagoe", "iwatsuki", 15, "街道"], ["kawagoe", "matsuyama_m", 14, "街道"],
  ["kawagoe", "takiyama", 29, "街道"], ["iwatsuki", "edo", 27, "街道"], ["iwatsuki", "sekiyado", 21, "街道"],
  ["oshi", "fukaya", 17, "街道"], ["oshi", "matsuyama_m", 13, "街道"], ["hachigata", "fukaya", 12, "街道"],
  ["hachigata", "matsuyama_m", 19, "街道"], ["fukaya", "matsuyama_m", 22, "街道"], ["edo", "takiyama", 38, "街道"],
  ["edo", "tamanawa", 44, "街道"], ["edo", "sanuki", 48, "海路"], ["edo", "usui", 38, "街道"],
  ["takiyama", "tsukui", 15, "街道"], ["odawara", "tamanawa", 34, "街道"], ["odawara", "tsukui", 39, "街道"],
  ["odawara", "iwadono", 45, "街道"], ["odawara", "kounkoji", 32, "街道"], ["odawara", "nirayama", 29, "街道"],
  ["tamanawa", "misaki", 23, "街道"], ["tamanawa", "tsukui", 40, "街道"], ["tamanawa", "sanuki", 34, "海路"],
  ["misaki", "sanuki", 27, "海路"], ["misaki", "tateyama", 28, "海路"], ["tsukui", "iwadono", 25, "街道"],
  ["kururi", "otaki", 15, "街道"], ["kururi", "sanuki", 19, "街道"], ["kururi", "usui", 49, "街道"],
  ["otaki", "motosakura", 50, "街道"], ["otaki", "usui", 49, "街道"], ["sanuki", "tateyama", 31, "街道"],
  ["motosakura", "usui", 10, "街道"], ["usui", "sekiyado", 51, "街道"], ["tsutsujigasaki", "katsuyama_k", 11, "街道"],
  ["tsutsujigasaki", "takato", 50, "難所"], ["tsutsujigasaki", "komoro", 73, "山道"], ["iwadono", "katsuyama_k", 27, "街道"],
  ["iwadono", "kounkoji", 54, "街道"], ["katsuyama_k", "kounkoji", 54, "街道"], ["takato", "fukashi", 46, "山道"],
  ["takato", "iida", 42, "山道"], ["fukashi", "toishi", 33, "街道"], ["kaizu", "katsurao", 9, "街道"],
  ["kaizu", "kasugayama", 64, "街道"], ["kaizu", "negoshi", 57, "街道"], ["toishi", "katsurao", 10, "街道"],
  ["toishi", "komoro", 17, "街道"], ["iida", "inui", 59, "難所"], ["iida", "naegi", 31, "街道"],
  ["kasugayama", "yoita", 68, "街道"], ["kasugayama", "negoshi", 33, "街道"], ["tochio", "sanjo", 18, "街道"],
  ["tochio", "yoita", 11, "街道"], ["sanjo", "yoita", 17, "街道"], ["sanjo", "shibata", 48, "街道"],
  ["sanjo", "kawarada", 69, "海路"], ["shibata", "murakami", 33, "街道"], ["toyama", "masuyama", 20, "街道"],
  ["toyama", "uozu", 23, "街道"], ["toyama", "nanao", 43, "街道"], ["toyama", "matsukura_h", 63, "街道"],
  ["masuyama", "suemori_n", 28, "街道"], ["masuyama", "kanazawa", 31, "街道"], ["masuyama", "matsukura_h", 61, "街道"],
  ["uozu", "matsukura", 3, "街道"], ["uozu", "nanao", 46, "海路"], ["uozu", "miyazaki_e", 19, "街道"],
  ["matsukura", "miyazaki_e", 18, "街道"], ["nanao", "suemori_n", 24, "街道"], ["suemori_n", "kanazawa", 33, "街道"],
  ["kanazawa", "komatsu", 26, "街道"], ["kanazawa", "torigoe", 27, "街道"], ["komatsu", "torigoe", 17, "街道"],
  ["komatsu", "kitanosho", 44, "街道"], ["torigoe", "ichijodani", 45, "街道"], ["torigoe", "kitanosho", 45, "街道"],
  ["torigoe", "gujo", 71, "難所"], ["torigoe", "matsukura_h", 61, "山道"], ["ichijodani", "kitanosho", 10, "街道"],
  ["ichijodani", "kanegasaki", 44, "街道"], ["ichijodani", "gujo", 66, "難所"], ["kanegasaki", "kuniyoshi", 12, "街道"],
  ["kanegasaki", "odani", 26, "街道"], ["kanegasaki", "yamamotoyama", 27, "街道"], ["kuniyoshi", "nochiseyama", 23, "街道"],
  ["kuniyoshi", "yamamotoyama", 29, "街道"], ["nochiseyama", "kannonji", 53, "街道"], ["nochiseyama", "sakamoto", 49, "街道"],
  ["nochiseyama", "kameyama_t", 56, "街道"], ["nochiseyama", "miyazu", 50, "山道"], ["sunpu", "kakegawa", 41, "街道"],
  ["sunpu", "kounkoji", 45, "山道"], ["sunpu", "inui", 46, "街道"], ["kakegawa", "takatenjin", 9, "街道"],
  ["kakegawa", "futamata", 22, "街道"], ["kakegawa", "hikuma", 27, "街道"], ["kounkoji", "nirayama", 16, "街道"],
  ["nirayama", "shimoda", 41, "街道"], ["futamata", "hikuma", 20, "街道"], ["futamata", "inui", 14, "街道"],
  ["futamata", "nagashino", 24, "街道"], ["hikuma", "yoshida", 31, "街道"], ["hikuma", "nagashino", 28, "街道"],
  ["inui", "iwamura", 58, "街道"], ["okazaki", "yoshida", 30, "街道"], ["okazaki", "nishio", 14, "街道"],
  ["okazaki", "nagashino", 37, "街道"], ["okazaki", "kariya", 15, "街道"], ["okazaki", "iwamura", 52, "街道"],
  ["yoshida", "tahara", 18, "街道"], ["yoshida", "nishio", 32, "街道"], ["yoshida", "nagashino", 23, "街道"],
  ["tahara", "nishio", 27, "海路"], ["tahara", "toba", 42, "海路"], ["nishio", "kariya", 15, "街道"],
  ["nishio", "matsugashima", 54, "海路"], ["nishio", "toba", 47, "海路"], ["nagashino", "iwamura", 50, "街道"],
  ["kariya", "narumi", 13, "街道"], ["kiyosu", "nagoya", 6, "街道"], ["kiyosu", "iwakura", 7, "街道"],
  ["kiyosu", "shobata", 10, "街道"], ["nagoya", "narumi", 11, "街道"], ["iwakura", "inuyama", 13, "街道"],
  ["iwakura", "inabayama", 19, "街道"], ["iwakura", "sunomata", 20, "街道"], ["inuyama", "inabayama", 15, "街道"],
  ["inuyama", "gujo", 40, "街道"], ["inuyama", "iwamura", 46, "街道"], ["shobata", "ogaki", 19, "街道"],
  ["shobata", "sunomata", 18, "街道"], ["shobata", "nagashima", 14, "街道"], ["narumi", "iwamura", 54, "街道"],
  ["narumi", "kuwana", 24, "街道"], ["narumi", "nagashima", 24, "街道"], ["inabayama", "sunomata", 12, "街道"],
  ["inabayama", "gujo", 39, "街道"], ["ogaki", "sunomata", 6, "街道"], ["ogaki", "odani", 34, "山道"],
  ["ogaki", "sawayama", 33, "山道"], ["gujo", "naegi", 54, "難所"], ["gujo", "matsukura_h", 49, "山道"],
  ["iwamura", "naegi", 18, "街道"], ["naegi", "matsukura_h", 71, "山道"], ["kuwana", "nagashima", 4, "街道"],
  ["kuwana", "kanbe", 25, "街道"], ["nagashima", "sawayama", 43, "山道"], ["kanbe", "matsugashima", 30, "海路"],
  ["kanbe", "ueno_iga", 41, "山道"], ["kanbe", "kannonji", 49, "山道"], ["okochi", "matsugashima", 9, "街道"],
  ["okochi", "toba", 28, "街道"], ["okochi", "takatori", 67, "街道"], ["matsugashima", "toba", 28, "街道"],
  ["matsugashima", "ueno_iga", 44, "山道"], ["ueno_iga", "kannonji", 42, "山道"], ["ueno_iga", "sakamoto", 41, "街道"],
  ["ueno_iga", "tamonyama", 28, "街道"], ["kannonji", "sawayama", 18, "街道"], ["kannonji", "sakamoto", 26, "街道"],
  ["odani", "yamamotoyama", 8, "街道"], ["sawayama", "yamamotoyama", 18, "街道"], ["sakamoto", "nijo", 13, "街道"],
  ["nijo", "shoryuji", 12, "街道"], ["nijo", "kameyama_t", 16, "街道"], ["shoryuji", "kameyama_t", 15, "街道"],
  ["shoryuji", "akutagawa", 12, "街道"], ["shoryuji", "tamonyama", 28, "街道"], ["kameyama_t", "yagami", 33, "街道"],
  ["kameyama_t", "akutagawa", 18, "街道"], ["yagami", "yokoyama", 28, "山道"], ["yagami", "miki", 36, "街道"],
  ["yagami", "itami", 36, "街道"], ["yagami", "hanakuma", 42, "街道"], ["yokoyama", "miyazu", 28, "街道"],
  ["yokoyama", "takeda", 26, "街道"], ["miyazu", "konosumi", 35, "街道"], ["ishiyama", "iimoriyama", 12, "街道"],
  ["ishiyama", "takaya", 17, "街道"], ["ishiyama", "kishiwada", 29, "街道"], ["ishiyama", "shigisan", 16, "街道"],
  ["ishiyama", "itami", 15, "街道"], ["iimoriyama", "akutagawa", 15, "街道"],
  ["iimoriyama", "koriyama", 15, "街道"], ["iimoriyama", "shigisan", 13, "街道"], ["takaya", "kishiwada", 24, "街道"],
  ["takaya", "shigisan", 9, "街道"], ["takaya", "takatori", 24, "街道"], ["kishiwada", "saika", 29, "街道"],
  ["kishiwada", "hanakuma", 31, "海路"], ["akutagawa", "itami", 18, "街道"], ["koriyama", "shigisan", 11, "街道"], ["koriyama", "tamonyama", 7, "街道"],
  ["koriyama", "takatori", 25, "街道"], ["shigisan", "takatori", 25, "街道"], ["takatori", "shingu", 81, "難所"],
  ["saika", "tetori", 36, "街道"], ["saika", "yura", 22, "海路"], ["shingu", "tetori", 73, "難所"],
  ["tetori", "ushiki", 53, "海路"], ["himeji", "ojio", 11, "街道"], ["himeji", "goshaku", 4, "街道"],
  ["miki", "goshaku", 24, "街道"], ["miki", "hanakuma", 21, "街道"], ["miki", "sumoto", 52, "海路"],
  ["ojio", "takeda", 44, "山道"], ["ojio", "wakasa", 51, "山道"], ["ojio", "tenjinyama", 51, "街道"],
  ["goshaku", "sumoto", 56, "海路"], ["itami", "hanakuma", 24, "街道"], ["hanakuma", "sumoto", 47, "海路"],
  ["takeda", "konosumi", 20, "街道"], ["takeda", "wakasa", 39, "山道"], ["konosumi", "wakasa", 41, "山道"],
  ["sumoto", "shozui", 43, "海路"], ["sumoto", "yura", 10, "海路"], ["tottori", "wakasa", 23, "街道"], ["tottori", "shikano", 17, "街道"],
  ["wakasa", "iwaya_m", 41, "山道"], ["shikano", "iwaya_m", 38, "山道"], ["shikano", "uyui", 8, "街道"],
  ["yonago", "gassan", 14, "街道"], ["yonago", "shiraga", 24, "街道"], ["yonago", "takata_m", 45, "山道"],
  ["yonago", "oki", 86, "海路"], ["yonago", "uyui", 61, "街道"], ["gassan", "shiraga", 19, "街道"],
  ["gassan", "koriyama_a", 89, "難所"], ["gassan", "yamabuki", 74, "難所"], ["shiraga", "yamabuki", 73, "街道"], ["tsuwano", "takamine", 42, "山道"],
  ["tsuwano", "wakayama_s", 47, "山道"], ["tsuwano", "miyake", 24, "山道"], ["tsuwano", "kuragake", 46, "山道"], ["ishiyama_bz", "tenjinyama", 27, "街道"], ["ishiyama_bz", "sogo", 44, "海路"],
  ["ishiyama_bz", "amagiri", 48, "海路"], ["ishiyama_bz", "takamatsu_bc", 10, "街道"], ["matsuyama_bc", "takata_m", 31, "街道"],
  ["matsuyama_bc", "sarukake", 17, "街道"], ["matsuyama_bc", "takamatsu_bc", 22, "街道"], ["tenjinyama", "iwaya_m", 27, "街道"],
  ["tenjinyama", "takamatsu_bc", 29, "街道"], ["koriyama_a", "kanayama_a", 33, "街道"], ["koriyama_a", "mihara", 45, "街道"],
  ["koriyama_a", "takata_m", 90, "難所"], ["koriyama_a", "yamabuki", 54, "山道"], ["kanayama_a", "mihara", 55, "街道"],
  ["kanayama_a", "sakurao", 20, "街道"], ["mihara", "kawanoe", 62, "海路"], ["mihara", "kannabe", 31, "街道"],
  ["mihara", "kokubunyama", 40, "海路"], ["ouchi", "takamine", 2, "街道"], ["ouchi", "wakayama_s", 33, "街道"],
  ["ouchi", "shimofuri", 25, "街道"], ["takamine", "shimofuri", 25, "街道"], ["wakayama_s", "funai", 91, "海路"],
  ["wakayama_s", "kuragake", 40, "街道"], ["shozui", "ichinomiya", 8, "街道"], ["shozui", "hiketa", 16, "街道"],
  ["hakuchi", "sogo", 40, "街道"], ["hakuchi", "kawanoe", 23, "街道"],
  ["hakuchi", "okou", 53, "山道"], ["hakuchi", "aki", 59, "難所"], ["hakuchi", "amagiri", 27, "街道"],
  ["ichinomiya", "aki", 80, "難所"], ["ichinomiya", "ushiki", 22, "街道"], ["sogo", "hiketa", 29, "街道"],
  ["sogo", "amagiri", 32, "街道"], ["yuzuki", "kokubunyama", 29, "街道"],
  ["yuzuki", "jizogatake", 44, "山道"], ["kagomori", "itajima", 5, "街道"], ["kagomori", "nakamura", 41, "街道"],
  ["kagomori", "jizogatake", 30, "街道"], ["itajima", "usuki", 72, "海路"], ["kawanoe", "okou", 48, "山道"],
  ["kawanoe", "amagiri", 33, "街道"], ["kawanoe", "kokubunyama", 53, "山道"], ["okou", "nakamura", 91, "難所"],
  ["okou", "aki", 28, "街道"], ["tachibanayama", "iwaya", 20, "街道"], ["tachibanayama", "kishitake", 51, "街道"],
  ["tachibanayama", "kokura", 42, "街道"], ["tachibanayama", "iki", 70, "海路"], ["iwaya", "akizuki", 13, "街道"],
  ["iwaya", "kurume", 23, "街道"], ["iwaya", "kishitake", 46, "街道"], ["akizuki", "kurume", 27, "山道"],
  ["akizuki", "umagatake", 27, "街道"], ["kurume", "yanagawa", 20, "街道"],
  ["kurume", "saga", 21, "街道"], ["yanagawa", "saga", 14, "街道"], ["yanagawa", "hinoe", 50, "海路"],
  ["yanagawa", "kumamoto", 49, "街道"], ["funai", "usuki", 22, "街道"],
  ["funai", "oka", 37, "街道"], ["funai", "umagatake", 80, "難所"], ["usuki", "oka", 42, "街道"],
  ["usuki", "agata", 62, "街道"], ["usuki", "jizogatake", 81, "海路"], ["oka", "kumamoto", 67, "山道"],
  ["oka", "agata", 49, "山道"], ["kishitake", "saga", 31, "街道"], ["kishitake", "hirado", 46, "街道"],
  ["kishitake", "omura", 58, "街道"], ["kishitake", "iki", 49, "海路"], ["saga", "omura", 50, "街道"],
  ["hirado", "iki", 47, "海路"], ["hinoe", "omura", 32, "海路"], ["hinoe", "kumamoto", 45, "海路"],
  ["hinoe", "yatsushiro", 44, "海路"], ["kanaishi", "iki", 62, "海路"], ["kumamoto", "yatsushiro", 35, "街道"],
  ["hitoyoshi", "yatsushiro", 35, "街道"], ["hitoyoshi", "tonokori", 64, "山道"], ["hitoyoshi", "kajiki", 54, "街道"],
  ["hitoyoshi", "izumi", 41, "街道"], ["yatsushiro", "izumi", 52, "街道"], ["sadowara", "tonokori", 6, "街道"],
  ["sadowara", "agata", 64, "街道"], ["tonokori", "obi", 43, "街道"], ["tonokori", "kajiki", 76, "難所"],
  ["obi", "shibushi", 28, "街道"], ["uchijo", "kajiki", 18, "街道"], ["kajiki", "izumi", 49, "街道"], ["kajiki", "shibushi", 50, "街道"], ["katsuyama_n", "shimofuri", 28, "街道"],
  ["katsuyama_n", "kokura", 16, "海路"], ["kokura", "umagatake", 25, "街道"],
  ["takata_m", "iwaya_m", 45, "山道"], ["takata_m", "uyui", 56, "難所"], ["iwaya_m", "uyui", 37, "山道"],
  ["yamabuki", "miyake", 72, "山道"], ["miyake", "sakurao", 55, "難所"], ["kannabe", "sarukake", 29, "街道"],
  ["kannabe", "amagiri", 42, "海路"], ["sarukake", "amagiri", 44, "海路"], ["sarukake", "takamatsu_bc", 19, "街道"],
  ["sakurao", "kuragake", 18, "街道"], ["yura", "ushiki", 48, "海路"], ["negoshi", "miyazaki_e", 31, "街道"],
["matsumae", "hakodate", 62, "海路"],
  ["matsumae", "esashi", 24, "街道"], ["esashi", "oshamanbe", 42, "山道"],
  ["hakodate", "oshamanbe", 40, "山道"], ["oshamanbe", "otaru", 52, "山道"],
  ["otaru", "ishikari", 14, "街道"], ["ishikari", "rumoi", 40, "街道"],
  ["rumoi", "soya", 74, "難所"], ["ishikari", "sizunai", 62, "山道"],
  ["oshamanbe", "sizunai", 66, "山道"], ["sizunai", "kushiro", 72, "山道"],
  ["kushiro", "nemuro", 40, "街道"], ["kushiro", "abashiri", 56, "難所"],
  ["abashiri", "nemuro", 62, "難所"], ["abashiri", "soya", 78, "難所"],
  ["ishikari", "abashiri", 96, "難所"],
  ["hakodate", "namioka", 96, "海路"],
  ["shurijo", "nakagusuku", 14, "街道"],
  ["shurijo", "miyako", 250, "海路"],
  ["shurijo", "uchijo", 530, "海路"],
  ["shurijo", "izumi", 560, "海路"],
];




// 山道は険しく、軍勢の通行はままならぬ。海路は船数に限りがあり、大軍は一度に渡れぬ。
// 山道は険しく、軍勢の通行はままならぬ。難所は峻険で、大軍を通すには日を要する。
const ROAD_SPEED = { 街道: 1.0, 山道: 0.42, 難所: 0.18, 渡河: 0.7, 海路: 0.62 };
// 軍勢が一月に進める行程。国を二つ三つ跨ぐには月を要する。
const MARCH_PER_MONTH = 46;

const MOB_POLICY = [
  { name: "平時", per: 300, upkeep: 0.9 }, { name: "通常", per: 380, upkeep: 1.0 },
  { name: "決戦", per: 450, upkeep: 1.15 }, { name: "総動員", per: 500, upkeep: 1.35 },
];
const ARMS = [
  { key: "yari", label: "槍", ratio: 0.56 }, { key: "yumi", label: "弓", ratio: 0.21 },
  { key: "teppo", label: "鉄砲", ratio: 0.03 }, { key: "kiba", label: "騎馬", ratio: 0.2 },
];

/* ------------------------------------------------------- 組の名簿（GDD 6.2）
   武将の直属も地域家臣団も、五十人組の名簿として持つ。
   合戦の損害はこの名簿に書き戻され、補充されない限り欠けたまま次の戦へ持ち越す。 */
let ROSTER_SEQ = 0;
function newRoster(total, tag) {
  const r = [];
  for (const a of ARMS) {
    let men = Math.round(total * a.ratio);
    while (men > 0) {
      const m = Math.min(50, men);
      r.push({ id: `${tag}-${++ROSTER_SEQ}`, t: a.key, m, max: 50 });
      men -= m;
    }
  }
  return r;
}
const rosterSum = (r) => (r || []).reduce((a, q) => a + q.m, 0);
// 兵を足す。まず欠けた組を埋め、それでも余れば新しい組を立てる。
function rosterAdd(r, n, tag) {
  if (!r || n <= 0) return r || [];
  let left = Math.round(n);
  for (const a of ARMS) {
    const want = Math.round(n * a.ratio);
    let give = want;
    for (const q of r) {
      if (give <= 0) break;
      if (q.t !== a.key || q.m >= q.max) continue;
      const add = Math.min(q.max - q.m, give);
      q.m += add; give -= add; left -= add;
    }
    while (give > 0) {
      const m = Math.min(50, give);
      r.push({ id: `${tag}-${++ROSTER_SEQ}`, t: a.key, m, max: 50 });
      give -= m; left -= m;
    }
  }
  if (left > 0) for (const q of r) { if (left <= 0) break; const add = Math.min(q.max - q.m, left); q.m += add; left -= add; }
  return r;
}
// 兵を減らす。人数の少ない組から消していく。
function rosterCut(r, n) {
  let left = Math.round(n);
  const order = [...r].sort((a, b) => a.m - b.m);
  for (const q of order) {
    if (left <= 0) break;
    const take = Math.min(q.m, left);
    q.m -= take; left -= take;
  }
  return r.filter((q) => q.m > 0);
}
// 名簿から n 人ぶんを切り分けて持ち出す（出陣・寄騎）
function rosterTake(src, n) {
  const out = [];
  let left = Math.round(n);
  // 充実した組から順に連れて行く
  const order = [...src].sort((a, b) => b.m - a.m);
  for (const q of order) {
    if (left <= 0) break;
    if (q.m <= left) { out.push({ id: q.id, t: q.t, m: q.m, max: q.max }); left -= q.m; q.m = 0; }
    else { out.push({ id: q.id + "b", t: q.t, m: left, max: q.max }); q.m -= left; left = 0; }
  }
  const rest = src.filter((q) => q.m > 0);
  return { taken: out, rest };
}
// 名簿を保つ。総数と食い違っていれば辻褄を合わせる。
function rosterSync(holder, key, total, tag) {
  if (!holder[key] || !holder[key].length) holder[key] = newRoster(Math.max(0, total), tag);
  const d = Math.round(total) - rosterSum(holder[key]);
  if (d > 0) rosterAdd(holder[key], d, tag);
  else if (d < 0) holder[key] = rosterCut(holder[key], -d);
  return holder[key];
}

/* -------------------------------------------------------------- 地形生成 */
// 標高を作るための山系。実測の稜線（MAP_RIDGES）から起こす。





















const LAND_POLYS = [
  [[1823,1836],[1804,1840],[1792,1827],[1794,1814],[1805,1816],[1831,1800],[1854,1793],[1868,1808],[1849,1836],[1859,1825],[1862,1832],[1857,1836],[1872,1840],[1870,1851],[1875,1844],[1883,1846],[1883,1840],[1874,1842],[1874,1833],[1894,1824],[1892,1831],[1898,1832],[1892,1838],[1896,1842],[1894,1848],[1905,1857],[1905,1864],[1946,1868],[1956,1883],[1961,1880],[1956,1893],[1960,1904],[1953,1924],[1955,1934],[1964,1942],[1962,1951],[1967,1955],[1975,1951],[1975,1959],[1985,1960],[1994,1979],[1989,1985],[1972,1975],[1966,1984],[1943,1981],[1942,1967],[1930,1950],[1917,1945],[1919,1937],[1913,1937],[1910,1943],[1914,1946],[1908,1947],[1897,1941],[1898,1934],[1881,1930],[1882,1909],[1864,1906],[1862,1900],[1848,1901],[1843,1886],[1828,1890],[1804,1876],[1805,1859],[1815,1863],[1824,1859],[1823,1836]],
  [[982,2206],[1022,2204],[1044,2219],[1066,2212],[1065,2229],[1056,2231],[1051,2242],[1048,2238],[1038,2246],[1032,2254],[1035,2265],[1024,2264],[1017,2254],[1001,2270],[996,2268],[994,2272],[1012,2297],[990,2294],[977,2287],[962,2274],[968,2269],[966,2261],[945,2257],[944,2247],[935,2238],[940,2229],[951,2238],[946,2230],[953,2217],[939,2209],[943,2203],[948,2210],[952,2209],[947,2205],[949,2191],[954,2198],[958,2192],[968,2195],[965,2204],[970,2209],[982,2206]],
  [[1162,2257],[1188,2294],[1187,2309],[1199,2320],[1188,2321],[1183,2336],[1163,2354],[1162,2365],[1152,2364],[1146,2371],[1147,2390],[1162,2410],[1151,2424],[1162,2440],[1146,2438],[1139,2447],[1103,2451],[1093,2450],[1077,2435],[1066,2444],[1043,2447],[1036,2437],[1043,2427],[1049,2426],[1047,2422],[1058,2416],[1053,2410],[1060,2405],[1058,2403],[1072,2391],[1067,2380],[1072,2378],[1066,2373],[1086,2356],[1053,2360],[1053,2356],[1078,2341],[1075,2332],[1079,2327],[1074,2318],[1050,2305],[1045,2289],[1060,2289],[1059,2281],[1073,2269],[1086,2270],[1090,2259],[1142,2286],[1148,2274],[1140,2265],[1142,2257],[1162,2257]],
  [[1035,2396],[1019,2395],[1015,2400],[1011,2392],[1010,2410],[1004,2413],[1002,2409],[999,2416],[1003,2416],[991,2423],[988,2431],[975,2435],[977,2426],[970,2425],[977,2415],[981,2420],[980,2415],[986,2419],[987,2415],[972,2410],[983,2381],[979,2373],[983,2377],[1007,2371],[1009,2389],[1029,2376],[1040,2375],[1041,2380],[1053,2374],[1043,2398],[1035,2401],[1035,2396]],
  [[1704,2010],[1710,2011],[1705,2033],[1695,2031],[1701,2029],[1698,2025],[1687,2037],[1687,2025],[1672,2027],[1678,2024],[1674,2021],[1677,2016],[1704,2010]],
  [[1671,2084],[1669,2090],[1657,2090],[1648,2098],[1638,2090],[1620,2094],[1594,2109],[1581,2103],[1587,2098],[1589,2076],[1574,2064],[1593,2067],[1593,2071],[1619,2053],[1618,2048],[1624,2047],[1620,2053],[1629,2050],[1631,2042],[1661,2049],[1663,2042],[1669,2046],[1671,2039],[1676,2053],[1684,2045],[1693,2051],[1692,2060],[1712,2064],[1722,2074],[1718,2083],[1707,2078],[1671,2084]],
  [[2146,1858],[2152,1856],[2149,1860],[2161,1867],[2167,1880],[2180,1881],[2184,1887],[2205,1880],[2225,1892],[2248,1880],[2245,1887],[2250,1897],[2267,1890],[2294,1894],[2288,1899],[2292,1905],[2286,1908],[2287,1913],[2273,1926],[2272,1937],[2260,1951],[2235,1966],[2234,1990],[2156,2008],[2165,1993],[2173,1997],[2201,1980],[2201,1990],[2204,1990],[2205,1981],[2212,1981],[2207,1980],[2208,1971],[2203,1966],[2189,1964],[2181,1974],[2181,1970],[2157,1972],[2144,1964],[2150,1939],[2138,1973],[2148,1986],[2126,1974],[2130,1961],[2123,1953],[2122,1938],[2135,1917],[2130,1915],[2127,1926],[2124,1917],[2125,1927],[2119,1923],[2118,1929],[2114,1928],[2110,1917],[2098,1908],[2099,1889],[2114,1866],[2125,1868],[2146,1858]],
  [[2651,1547],[2680,1555],[2692,1570],[2699,1570],[2700,1616],[2707,1626],[2694,1630],[2701,1661],[2688,1682],[2679,1679],[2653,1685],[2642,1699],[2632,1698],[2627,1710],[2611,1717],[2601,1716],[2594,1704],[2567,1705],[2550,1685],[2562,1670],[2560,1662],[2570,1649],[2544,1640],[2552,1620],[2548,1615],[2557,1605],[2548,1601],[2549,1596],[2566,1580],[2627,1559],[2626,1553],[2635,1548],[2651,1547]],
  [[2383,1758],[2395,1762],[2400,1772],[2420,1768],[2424,1776],[2435,1776],[2444,1769],[2471,1782],[2480,1779],[2493,1803],[2511,1812],[2511,1831],[2468,1864],[2435,1868],[2432,1861],[2424,1862],[2419,1852],[2415,1854],[2407,1876],[2411,1896],[2404,1902],[2393,1900],[2382,1876],[2369,1878],[2363,1873],[2360,1865],[2366,1840],[2351,1805],[2361,1797],[2352,1790],[2361,1774],[2369,1778],[2383,1758]],
  [[2010,1807],[2032,1814],[2033,1821],[2039,1822],[2038,1834],[2047,1832],[2052,1837],[2050,1845],[2059,1863],[2054,1866],[2048,1889],[2061,1905],[2054,1936],[2046,1949],[2027,1958],[2003,1950],[1999,1954],[2006,1957],[2000,1965],[1989,1970],[1985,1960],[1975,1959],[1975,1951],[1967,1955],[1962,1951],[1964,1942],[1953,1924],[1961,1881],[1956,1883],[1945,1870],[1953,1858],[1966,1860],[1974,1839],[1986,1844],[1989,1837],[2002,1837],[2004,1828],[2013,1831],[2010,1807]],
  [[2429,1680],[2403,1681],[2388,1675],[2393,1647],[2409,1637],[2407,1630],[2443,1617],[2454,1620],[2460,1615],[2459,1607],[2477,1604],[2476,1595],[2486,1594],[2483,1578],[2497,1577],[2505,1564],[2530,1587],[2555,1590],[2548,1601],[2557,1605],[2548,1615],[2552,1620],[2544,1640],[2570,1649],[2560,1662],[2562,1670],[2550,1685],[2567,1705],[2594,1704],[2602,1715],[2594,1720],[2588,1716],[2566,1719],[2549,1708],[2544,1712],[2511,1703],[2496,1730],[2482,1731],[2460,1747],[2448,1747],[2441,1756],[2427,1748],[2429,1732],[2418,1723],[2428,1722],[2422,1703],[2431,1699],[2429,1680]],
  [[2907,1220],[2911,1216],[2932,1222],[2939,1240],[2922,1233],[2927,1247],[2912,1257],[2920,1263],[2920,1272],[2914,1267],[2909,1275],[2900,1275],[2900,1280],[2914,1281],[2903,1292],[2909,1300],[2915,1297],[2917,1305],[2905,1302],[2909,1307],[2906,1312],[2912,1315],[2901,1316],[2905,1325],[2916,1324],[2907,1328],[2915,1334],[2914,1347],[2901,1339],[2903,1333],[2896,1333],[2903,1329],[2898,1324],[2888,1327],[2886,1321],[2870,1320],[2853,1330],[2855,1338],[2849,1338],[2848,1328],[2836,1329],[2830,1338],[2841,1342],[2825,1347],[2833,1348],[2823,1356],[2813,1380],[2814,1414],[2801,1415],[2801,1430],[2788,1430],[2791,1436],[2774,1431],[2773,1415],[2768,1413],[2753,1409],[2739,1413],[2737,1405],[2726,1400],[2716,1404],[2704,1399],[2704,1385],[2728,1380],[2738,1363],[2736,1347],[2762,1314],[2752,1304],[2755,1294],[2748,1282],[2758,1281],[2759,1266],[2766,1258],[2759,1255],[2749,1236],[2765,1237],[2783,1224],[2796,1223],[2823,1239],[2849,1238],[2843,1248],[2865,1262],[2878,1248],[2895,1258],[2899,1255],[2901,1239],[2908,1232],[2907,1220]],
  [[2358,1817],[2366,1840],[2360,1865],[2363,1873],[2369,1878],[2381,1875],[2388,1896],[2395,1900],[2404,1902],[2411,1896],[2407,1876],[2411,1859],[2419,1852],[2424,1862],[2432,1861],[2435,1868],[2489,1861],[2492,1873],[2485,1890],[2494,1905],[2508,1907],[2501,1922],[2506,1924],[2505,1936],[2514,1944],[2497,1974],[2489,1978],[2487,1993],[2480,1990],[2463,2003],[2445,1988],[2451,1976],[2447,1964],[2451,1958],[2448,1953],[2454,1949],[2449,1939],[2452,1929],[2471,1929],[2473,1924],[2460,1913],[2436,1906],[2414,1914],[2404,1926],[2406,1935],[2406,1929],[2411,1930],[2408,1935],[2381,1947],[2372,1973],[2359,1981],[2354,1991],[2359,2005],[2332,1993],[2287,1996],[2234,1990],[2235,1966],[2260,1951],[2272,1937],[2273,1926],[2287,1913],[2292,1894],[2345,1866],[2341,1852],[2348,1848],[2345,1833],[2353,1829],[2358,1817]],
  [[2753,1585],[2788,1598],[2793,1605],[2783,1613],[2778,1635],[2760,1666],[2763,1685],[2751,1707],[2760,1738],[2775,1764],[2769,1766],[2771,1772],[2773,1774],[2771,1769],[2776,1767],[2800,1800],[2743,1761],[2742,1770],[2734,1766],[2711,1778],[2682,1781],[2647,1764],[2621,1735],[2612,1737],[2605,1722],[2605,1716],[2627,1710],[2632,1698],[2642,1699],[2653,1685],[2690,1681],[2701,1661],[2694,1630],[2707,1626],[2700,1618],[2700,1587],[2707,1587],[2735,1612],[2757,1597],[2753,1585]],
  [[665,3414],[683,3386],[690,3391],[694,3407],[685,3422],[678,3429],[664,3430],[664,3435],[660,3434],[662,3443],[644,3443],[648,3449],[638,3451],[630,3464],[617,3460],[610,3465],[626,3489],[616,3481],[612,3483],[598,3506],[601,3511],[609,3508],[610,3512],[593,3526],[582,3528],[580,3516],[583,3515],[578,3507],[599,3487],[590,3463],[605,3464],[613,3452],[625,3450],[636,3440],[621,3434],[619,3415],[639,3419],[636,3426],[643,3430],[660,3425],[656,3421],[665,3414]],
  [[425,3480],[422,3476],[434,3472],[441,3480],[439,3490],[425,3480]],
  [[186,3773],[177,3765],[182,3766],[177,3758],[184,3749],[177,3737],[190,3757],[213,3771],[186,3773]],
  [[-5,3841],[-15,3835],[-10,3826],[-20,3826],[-21,3819],[-14,3820],[-15,3814],[-11,3821],[3,3819],[4,3811],[13,3810],[18,3791],[23,3792],[8,3817],[8,3836],[-5,3841]],
  [[-55,3855],[-91,3845],[-87,3841],[-83,3844],[-84,3838],[-76,3844],[-77,3830],[-70,3822],[-65,3830],[-55,3828],[-44,3835],[-55,3855]],
  [[2635,1195],[2656,1198],[2668,1193],[2668,1200],[2683,1208],[2718,1212],[2721,1217],[2732,1220],[2735,1231],[2748,1234],[2759,1255],[2766,1258],[2759,1266],[2758,1281],[2748,1282],[2755,1294],[2752,1304],[2762,1314],[2736,1347],[2738,1363],[2727,1381],[2704,1385],[2702,1425],[2708,1430],[2697,1441],[2677,1443],[2666,1435],[2656,1439],[2647,1426],[2625,1431],[2595,1414],[2599,1389],[2606,1385],[2602,1382],[2607,1359],[2621,1361],[2634,1354],[2640,1343],[2632,1334],[2608,1325],[2611,1306],[2580,1296],[2593,1275],[2617,1252],[2635,1195]],
  [[1905,2048],[1926,2042],[1930,2061],[1939,2069],[1935,2074],[1925,2072],[1908,2093],[1923,2113],[1917,2127],[1920,2134],[1932,2128],[1959,2130],[1960,2144],[1975,2158],[1986,2160],[1981,2174],[1974,2175],[1976,2179],[1972,2182],[1977,2186],[1951,2201],[1949,2212],[1943,2212],[1944,2203],[1916,2201],[1891,2192],[1882,2184],[1882,2176],[1872,2170],[1884,2161],[1856,2150],[1841,2132],[1826,2132],[1828,2123],[1836,2118],[1828,2115],[1845,2105],[1830,2098],[1836,2090],[1841,2091],[1837,2087],[1852,2084],[1827,2064],[1829,2057],[1842,2062],[1873,2051],[1905,2048]],
  [[1970,2116],[1986,2110],[1986,2117],[1981,2117],[1979,2124],[1968,2125],[1970,2116]],
  [[872,2035],[868,2033],[866,2042],[874,2037],[868,2049],[874,2051],[869,2050],[871,2055],[866,2058],[867,2044],[859,2051],[859,2041],[855,2042],[856,2050],[845,2046],[854,2044],[853,2032],[860,2028],[853,2027],[865,2016],[855,2011],[861,1995],[874,1997],[883,1985],[891,1992],[885,1994],[890,1996],[888,2000],[880,2000],[888,2005],[887,2012],[869,2030],[872,2035]],
  [[843,2096],[843,2091],[835,2093],[842,2052],[845,2058],[854,2056],[856,2061],[852,2052],[859,2056],[859,2061],[866,2058],[855,2088],[843,2096]],
  [[928,2164],[915,2153],[922,2154],[916,2146],[923,2146],[920,2140],[925,2136],[937,2139],[932,2145],[941,2149],[935,2151],[941,2154],[940,2157],[930,2158],[928,2164]],
  [[870,2260],[867,2253],[874,2258],[872,2249],[880,2248],[875,2242],[882,2238],[881,2228],[893,2222],[895,2226],[900,2222],[894,2219],[900,2217],[903,2226],[894,2231],[897,2234],[889,2239],[892,2243],[870,2260]],
  [[914,2225],[920,2218],[921,2227],[940,2224],[935,2238],[944,2247],[945,2257],[966,2261],[968,2269],[962,2274],[986,2292],[1009,2297],[1006,2305],[991,2315],[1007,2319],[1025,2312],[1032,2316],[1039,2330],[1034,2348],[1004,2363],[997,2346],[1004,2345],[1010,2334],[1006,2327],[989,2327],[967,2333],[957,2351],[932,2367],[945,2352],[941,2345],[948,2346],[954,2334],[945,2340],[937,2322],[925,2320],[914,2303],[921,2272],[935,2281],[931,2292],[936,2286],[945,2293],[943,2305],[939,2299],[943,2309],[940,2314],[950,2320],[955,2311],[977,2317],[964,2304],[967,2293],[962,2284],[954,2278],[945,2283],[948,2279],[936,2276],[936,2272],[936,2281],[930,2272],[939,2264],[930,2268],[925,2261],[927,2269],[919,2272],[918,2266],[924,2265],[914,2260],[918,2257],[914,2250],[913,2256],[911,2250],[900,2251],[905,2238],[912,2234],[902,2232],[903,2222],[914,2225]],
  [[817,2323],[814,2306],[819,2307],[812,2304],[813,2299],[806,2300],[818,2293],[815,2285],[822,2285],[826,2261],[821,2292],[835,2288],[838,2295],[831,2301],[824,2297],[824,2315],[818,2314],[817,2323]],
  [[812,2318],[802,2313],[801,2307],[808,2312],[804,2302],[813,2309],[812,2318]],
  [[797,2326],[786,2315],[788,2312],[796,2319],[794,2313],[797,2317],[800,2313],[797,2326]],
  [[785,2332],[779,2326],[780,2319],[786,2326],[784,2318],[792,2326],[785,2332]],
  [[769,2366],[763,2360],[740,2359],[742,2353],[748,2361],[751,2356],[746,2355],[753,2349],[748,2344],[751,2329],[755,2337],[766,2331],[769,2337],[775,2326],[778,2333],[774,2334],[783,2336],[780,2341],[789,2354],[768,2354],[772,2363],[769,2366]],
  [[2805,946],[2802,959],[2823,961],[2825,974],[2819,975],[2816,997],[2802,1006],[2805,1017],[2799,1024],[2800,1042],[2805,1060],[2789,1062],[2790,1069],[2800,1074],[2788,1085],[2796,1100],[2780,1115],[2779,1130],[2767,1147],[2776,1155],[2778,1168],[2790,1174],[2786,1181],[2793,1184],[2783,1191],[2784,1201],[2794,1206],[2786,1217],[2787,1224],[2767,1236],[2752,1239],[2735,1231],[2730,1218],[2713,1210],[2710,1214],[2691,1210],[2690,1206],[2683,1208],[2668,1200],[2668,1193],[2656,1198],[2635,1195],[2643,1167],[2654,1161],[2662,1141],[2668,1108],[2666,1078],[2657,1063],[2644,1055],[2616,1063],[2606,1038],[2626,1045],[2649,1022],[2660,998],[2662,977],[2647,961],[2661,962],[2669,954],[2675,960],[2714,959],[2723,950],[2748,966],[2757,959],[2766,965],[2781,963],[2805,946]],
  [[1651,1869],[1650,1877],[1672,1882],[1677,1902],[1715,1888],[1712,1895],[1717,1906],[1710,1906],[1701,1924],[1693,1928],[1696,1933],[1691,1942],[1698,1949],[1691,1959],[1701,1968],[1702,1982],[1679,1978],[1682,1984],[1689,1986],[1668,2006],[1639,2004],[1656,2008],[1649,2019],[1641,2017],[1637,2030],[1620,2026],[1616,2029],[1618,2034],[1612,2033],[1604,2017],[1601,2022],[1605,2027],[1598,2025],[1596,2014],[1595,2020],[1591,2018],[1571,2028],[1562,2019],[1569,2030],[1560,2032],[1555,2012],[1544,2000],[1548,1991],[1540,1980],[1544,1967],[1530,1952],[1534,1931],[1525,1923],[1528,1915],[1548,1912],[1549,1899],[1568,1899],[1565,1891],[1574,1888],[1580,1870],[1605,1875],[1620,1888],[1637,1872],[1651,1869]],
  [[1088,2126],[1105,2120],[1102,2125],[1111,2123],[1112,2128],[1100,2133],[1110,2134],[1114,2125],[1119,2124],[1118,2128],[1125,2131],[1137,2118],[1147,2118],[1142,2138],[1136,2141],[1143,2144],[1141,2150],[1159,2178],[1175,2180],[1173,2199],[1149,2197],[1126,2210],[1124,2222],[1116,2229],[1121,2242],[1114,2248],[1125,2256],[1119,2270],[1090,2259],[1086,2270],[1073,2269],[1059,2281],[1060,2289],[1042,2290],[1047,2280],[1032,2254],[1048,2238],[1051,2242],[1056,2231],[1065,2229],[1066,2212],[1044,2219],[1022,2204],[983,2206],[983,2201],[1001,2194],[1003,2190],[995,2192],[998,2188],[990,2185],[1000,2183],[1011,2171],[1021,2186],[1043,2182],[1048,2167],[1035,2175],[1024,2167],[1030,2172],[1042,2167],[1054,2155],[1050,2144],[1055,2144],[1056,2136],[1062,2136],[1064,2131],[1082,2132],[1088,2126]],
  [[2162,1687],[2180,1671],[2187,1677],[2205,1670],[2205,1677],[2218,1671],[2221,1677],[2239,1678],[2261,1692],[2262,1702],[2249,1714],[2253,1722],[2246,1728],[2245,1734],[2256,1740],[2253,1751],[2233,1772],[2217,1773],[2208,1786],[2230,1796],[2244,1816],[2239,1824],[2259,1841],[2259,1848],[2252,1852],[2259,1861],[2249,1861],[2254,1872],[2225,1892],[2205,1880],[2184,1887],[2180,1881],[2167,1880],[2161,1867],[2149,1860],[2151,1856],[2125,1868],[2114,1866],[2099,1889],[2097,1908],[2093,1902],[2088,1905],[2074,1886],[2054,1893],[2048,1889],[2054,1866],[2059,1863],[2050,1845],[2053,1840],[2047,1832],[2038,1834],[2039,1822],[2031,1815],[2039,1804],[2039,1795],[2048,1790],[2070,1798],[2073,1791],[2117,1789],[2124,1779],[2123,1772],[2107,1754],[2113,1724],[2128,1709],[2118,1700],[2124,1698],[2131,1687],[2132,1692],[2144,1691],[2149,1704],[2161,1694],[2162,1687]],
  [[2788,821],[2798,784],[2810,770],[2811,761],[2826,772],[2844,776],[2870,795],[2888,793],[2903,782],[2891,828],[2895,903],[2908,938],[2915,943],[2922,940],[2940,957],[2924,965],[2916,975],[2900,970],[2884,978],[2879,971],[2826,999],[2817,991],[2819,975],[2825,974],[2823,961],[2802,959],[2805,946],[2781,963],[2766,965],[2757,959],[2748,966],[2723,950],[2714,959],[2675,960],[2669,954],[2661,962],[2647,961],[2648,939],[2634,928],[2645,923],[2657,904],[2666,900],[2678,905],[2699,894],[2712,850],[2711,842],[2699,835],[2711,832],[2714,812],[2735,826],[2750,818],[2763,824],[2768,868],[2781,889],[2791,888],[2802,879],[2804,868],[2798,867],[2805,857],[2817,860],[2821,871],[2843,881],[2853,878],[2863,864],[2872,831],[2863,813],[2853,809],[2835,826],[2822,823],[2794,836],[2786,833],[2788,821]],
  [[1879,1924],[1881,1930],[1899,1934],[1897,1941],[1908,1947],[1914,1946],[1910,1943],[1913,1937],[1919,1937],[1917,1945],[1925,1945],[1942,1967],[1936,1971],[1926,2002],[1931,2006],[1926,2014],[1930,2017],[1931,2038],[1902,2051],[1898,2046],[1835,2062],[1832,2055],[1853,2049],[1880,2026],[1880,2016],[1882,2021],[1889,2016],[1891,2011],[1885,2011],[1884,2004],[1887,2009],[1895,2006],[1888,2005],[1892,1996],[1886,1994],[1888,1987],[1884,1987],[1894,1980],[1886,1964],[1891,1950],[1887,1948],[1895,1945],[1875,1938],[1876,1928],[1872,1926],[1879,1924]],
  [[2409,1569],[2419,1577],[2420,1590],[2437,1600],[2433,1614],[2438,1621],[2412,1627],[2407,1630],[2409,1637],[2398,1640],[2389,1660],[2388,1675],[2398,1681],[2430,1680],[2431,1699],[2422,1703],[2428,1722],[2418,1723],[2429,1732],[2427,1748],[2441,1756],[2444,1769],[2426,1776],[2420,1768],[2397,1771],[2396,1763],[2383,1758],[2369,1778],[2361,1774],[2352,1790],[2361,1797],[2351,1805],[2358,1817],[2353,1829],[2345,1833],[2348,1848],[2341,1852],[2345,1866],[2303,1886],[2299,1893],[2283,1896],[2267,1890],[2250,1897],[2245,1887],[2246,1877],[2254,1872],[2249,1861],[2260,1860],[2252,1852],[2259,1848],[2259,1841],[2239,1824],[2244,1816],[2230,1796],[2208,1786],[2217,1773],[2233,1772],[2253,1751],[2256,1740],[2245,1734],[2246,1728],[2253,1722],[2249,1714],[2263,1699],[2251,1683],[2265,1662],[2271,1661],[2269,1652],[2279,1648],[2279,1618],[2300,1598],[2299,1589],[2323,1591],[2326,1596],[2321,1605],[2330,1610],[2340,1601],[2357,1598],[2370,1602],[2371,1590],[2379,1588],[2387,1575],[2409,1569]],
  [[1235,2169],[1250,2168],[1260,2175],[1268,2190],[1268,2207],[1262,2217],[1249,2215],[1253,2221],[1243,2228],[1228,2225],[1230,2242],[1243,2246],[1260,2240],[1271,2247],[1295,2242],[1278,2267],[1295,2266],[1287,2274],[1297,2278],[1302,2273],[1307,2279],[1312,2273],[1314,2280],[1300,2281],[1293,2291],[1305,2300],[1312,2297],[1312,2302],[1317,2298],[1326,2302],[1308,2304],[1309,2310],[1314,2310],[1302,2319],[1313,2321],[1307,2327],[1293,2325],[1290,2336],[1286,2335],[1288,2322],[1273,2319],[1263,2331],[1239,2334],[1230,2331],[1223,2319],[1204,2325],[1188,2312],[1188,2294],[1160,2256],[1142,2257],[1140,2265],[1148,2274],[1142,2286],[1117,2272],[1125,2256],[1114,2248],[1121,2242],[1116,2229],[1124,2222],[1131,2204],[1149,2197],[1173,2199],[1175,2180],[1216,2187],[1227,2170],[1235,2169]],
  [[2073,1886],[2088,1905],[2093,1902],[2110,1917],[2115,1928],[2094,1933],[2091,1941],[2097,1943],[2074,1976],[2073,1990],[2078,1991],[2073,2002],[2093,2005],[2122,2024],[2124,2020],[2132,2026],[2132,2034],[2140,2031],[2138,2044],[2121,2045],[2130,2050],[2137,2046],[2132,2051],[2136,2062],[2127,2067],[2113,2064],[2129,2064],[2124,2062],[2130,2060],[2124,2057],[2127,2055],[2120,2052],[2118,2059],[2113,2054],[2113,2059],[2101,2060],[2107,2050],[2099,2053],[2101,2049],[2096,2049],[2098,2053],[2092,2056],[2098,2054],[2086,2065],[2081,2062],[2084,2058],[2077,2061],[2077,2066],[2069,2061],[2072,2068],[2066,2068],[2070,2070],[2066,2072],[2063,2065],[2059,2067],[2060,2072],[2039,2076],[2031,2082],[2032,2090],[2038,2090],[2035,2095],[2026,2094],[2030,2088],[2019,2097],[2032,2107],[2025,2108],[2030,2116],[2020,2111],[2017,2116],[2023,2120],[2015,2122],[2015,2127],[2009,2124],[1986,2160],[1979,2160],[1960,2144],[1960,2136],[1967,2134],[1967,2125],[1986,2117],[1988,2105],[2002,2106],[2000,2076],[2007,2066],[2001,2057],[2006,2054],[1996,2041],[2001,2033],[2019,2031],[2023,2023],[2021,2017],[2013,2018],[2011,2011],[2004,2013],[1993,2007],[1997,1997],[1991,1992],[1999,1990],[1988,1970],[2000,1965],[2006,1957],[1999,1954],[2003,1950],[2027,1958],[2046,1949],[2059,1920],[2061,1903],[2053,1899],[2054,1893],[2073,1886]],
  [[1456,1915],[1522,1918],[1534,1931],[1529,1949],[1544,1967],[1540,1980],[1548,1991],[1544,2000],[1556,2015],[1555,2031],[1549,2025],[1552,2035],[1548,2033],[1538,2046],[1521,2041],[1526,2037],[1523,2032],[1519,2037],[1494,2040],[1492,2050],[1465,2051],[1454,2059],[1446,2055],[1444,2061],[1439,2061],[1440,2068],[1420,2075],[1412,2070],[1402,2076],[1405,2068],[1398,2065],[1394,2051],[1399,2046],[1369,2048],[1351,2065],[1353,2073],[1336,2069],[1333,2051],[1323,2047],[1325,2032],[1318,2021],[1333,2007],[1339,1989],[1334,1984],[1349,1977],[1352,1967],[1378,1972],[1385,1964],[1402,1969],[1415,1960],[1429,1960],[1430,1953],[1418,1949],[1437,1939],[1456,1915]],
  [[1384,2088],[1389,2080],[1385,2076],[1384,2080],[1374,2065],[1383,2065],[1391,2074],[1391,2067],[1384,2066],[1385,2060],[1392,2058],[1394,2086],[1384,2088]],
  [[1404,2097],[1402,2093],[1387,2094],[1396,2087],[1400,2075],[1405,2079],[1399,2083],[1405,2084],[1402,2092],[1411,2090],[1404,2097]],
  [[4060,91],[4113,47],[4130,43],[4144,44],[4153,51],[4142,62],[4150,73],[4145,82],[4109,84],[4086,97],[4054,104],[4018,124],[3987,150],[3967,152],[3957,143],[3946,143],[3938,152],[3944,157],[3933,171],[3891,194],[3869,221],[3848,222],[3827,246],[3812,242],[3813,233],[3827,223],[3826,209],[3834,218],[3840,212],[3836,204],[3851,208],[3865,199],[3868,187],[3854,183],[3853,175],[3874,178],[3879,167],[3922,143],[3924,127],[3919,123],[3945,128],[3959,108],[3981,103],[3978,78],[3987,66],[3997,68],[4010,95],[4060,91]],
  [[2923,111],[2922,101],[2936,81],[2934,62],[2940,71],[2959,70],[2970,65],[2976,52],[2984,50],[3002,71],[3022,82],[3079,132],[3105,171],[3161,222],[3256,277],[3313,294],[3372,302],[3380,325],[3398,332],[3464,334],[3530,287],[3554,260],[3560,276],[3514,341],[3510,366],[3523,385],[3556,396],[3556,401],[3547,402],[3555,399],[3553,395],[3531,389],[3531,394],[3544,428],[3563,449],[3581,453],[3608,431],[3627,429],[3635,435],[3594,450],[3592,462],[3583,468],[3586,471],[3566,468],[3523,475],[3513,493],[3494,504],[3477,503],[3470,498],[3474,492],[3465,490],[3452,504],[3460,513],[3406,511],[3391,506],[3391,501],[3375,500],[3317,523],[3262,565],[3227,605],[3214,633],[3218,646],[3214,670],[3206,679],[3204,693],[3156,659],[3131,654],[3075,631],[3027,600],[2999,593],[2972,574],[2932,567],[2943,562],[2884,583],[2846,605],[2826,626],[2814,620],[2827,618],[2811,614],[2804,597],[2789,590],[2777,575],[2736,575],[2710,605],[2704,624],[2706,635],[2724,641],[2749,659],[2776,655],[2785,659],[2819,694],[2850,706],[2857,715],[2820,732],[2788,720],[2775,726],[2778,714],[2765,713],[2759,726],[2732,736],[2731,759],[2726,766],[2701,772],[2691,787],[2682,782],[2672,784],[2662,776],[2655,750],[2669,715],[2678,712],[2680,684],[2662,660],[2644,656],[2637,643],[2619,633],[2621,616],[2632,597],[2628,570],[2640,558],[2665,555],[2681,545],[2689,532],[2699,542],[2709,540],[2709,532],[2723,515],[2745,502],[2746,495],[2712,461],[2716,441],[2729,442],[2741,434],[2790,466],[2828,458],[2827,467],[2853,475],[2874,465],[2897,442],[2898,426],[2886,408],[2890,396],[2881,371],[2891,357],[2920,347],[2932,329],[2934,332],[2935,266],[2951,245],[2959,207],[2947,157],[2923,111]],
  [[2831,94],[2820,60],[2827,65],[2831,60],[2837,67],[2831,94]],
  [[2851,103],[2859,97],[2872,101],[2881,116],[2864,125],[2849,114],[2851,103]],
  [[3624,310],[3623,303],[3665,264],[3668,254],[3688,231],[3696,230],[3722,247],[3764,240],[3749,259],[3739,255],[3717,272],[3686,275],[3674,289],[3654,298],[3643,313],[3646,318],[3635,319],[3630,334],[3598,345],[3590,383],[3590,370],[3571,372],[3566,351],[3624,310]],
  [[3775,375],[3772,365],[3765,368],[3769,363],[3765,356],[3792,354],[3788,349],[3805,342],[3821,351],[3775,375]],
  [[3686,419],[3677,407],[3688,403],[3701,405],[3699,413],[3686,419]],
  [[2565,671],[2560,667],[2558,648],[2583,635],[2574,662],[2565,671]],
  [[1794,1814],[1792,1827],[1804,1840],[1822,1836],[1824,1841],[1824,1859],[1815,1863],[1805,1859],[1804,1876],[1828,1890],[1843,1886],[1848,1901],[1862,1900],[1864,1906],[1882,1909],[1883,1919],[1872,1926],[1876,1928],[1875,1938],[1895,1946],[1887,1948],[1891,1950],[1886,1964],[1894,1980],[1882,1989],[1884,1986],[1879,1989],[1871,1981],[1848,1988],[1847,1995],[1826,1999],[1758,1970],[1728,1976],[1727,1966],[1726,1974],[1717,1981],[1708,1977],[1702,1982],[1701,1968],[1692,1963],[1692,1953],[1698,1949],[1691,1943],[1696,1933],[1693,1928],[1701,1924],[1710,1906],[1717,1906],[1713,1892],[1735,1883],[1734,1869],[1728,1864],[1729,1856],[1722,1853],[1717,1840],[1719,1831],[1710,1822],[1738,1812],[1753,1818],[1777,1811],[1794,1814]],
  [[1781,2035],[1814,2003],[1820,2005],[1799,2036],[1799,2049],[1808,2063],[1771,2077],[1766,2071],[1769,2065],[1759,2068],[1758,2058],[1771,2052],[1781,2035]],
  [[2620,1737],[2647,1764],[2683,1781],[2711,1778],[2734,1766],[2742,1770],[2743,1761],[2804,1804],[2803,1808],[2797,1805],[2767,1809],[2746,1824],[2726,1849],[2722,1899],[2710,1908],[2678,1911],[2654,1930],[2650,1944],[2638,1950],[2616,1938],[2633,1932],[2625,1925],[2631,1917],[2626,1900],[2635,1890],[2631,1880],[2620,1876],[2630,1872],[2631,1865],[2640,1868],[2641,1855],[2661,1849],[2668,1835],[2679,1830],[2672,1830],[2677,1825],[2655,1815],[2655,1808],[2646,1811],[2647,1817],[2636,1820],[2644,1807],[2637,1795],[2640,1777],[2620,1737]],
  [[2260,1578],[2274,1588],[2281,1634],[2279,1648],[2269,1652],[2271,1661],[2265,1662],[2252,1683],[2221,1677],[2218,1671],[2205,1677],[2205,1670],[2187,1677],[2180,1671],[2149,1704],[2144,1691],[2132,1692],[2131,1687],[2124,1698],[2118,1700],[2120,1689],[2114,1676],[2118,1674],[2122,1654],[2116,1642],[2123,1633],[2117,1625],[2127,1618],[2135,1588],[2159,1580],[2150,1597],[2172,1613],[2168,1615],[2206,1617],[2219,1609],[2226,1587],[2260,1578]],
  [[2480,1779],[2493,1772],[2540,1783],[2555,1796],[2580,1788],[2576,1795],[2581,1797],[2597,1789],[2613,1792],[2616,1787],[2627,1786],[2639,1792],[2644,1807],[2636,1818],[2623,1821],[2622,1815],[2617,1815],[2614,1827],[2616,1832],[2621,1830],[2622,1838],[2607,1836],[2601,1827],[2584,1819],[2577,1817],[2573,1824],[2567,1820],[2565,1824],[2574,1829],[2569,1829],[2568,1842],[2556,1828],[2530,1824],[2525,1817],[2493,1803],[2480,1779]],
  [[2574,2103],[2569,2097],[2572,2090],[2583,2091],[2584,2099],[2574,2103]],
  [[3031,3357],[3025,3356],[3028,3348],[3025,3345],[3033,3350],[3031,3357]],
  [[2511,1703],[2544,1712],[2549,1708],[2566,1719],[2604,1717],[2612,1737],[2620,1737],[2638,1772],[2639,1792],[2618,1786],[2613,1792],[2600,1789],[2581,1797],[2576,1795],[2580,1788],[2555,1796],[2540,1783],[2493,1772],[2471,1782],[2445,1770],[2441,1756],[2448,1747],[2460,1747],[2482,1731],[2496,1730],[2511,1703]],
  [[1260,1989],[1266,2008],[1256,2021],[1261,2033],[1277,2033],[1272,2043],[1274,2051],[1283,2057],[1298,2051],[1305,2056],[1314,2044],[1311,2034],[1323,2027],[1323,2047],[1333,2051],[1336,2069],[1353,2073],[1353,2085],[1345,2090],[1348,2110],[1343,2118],[1331,2120],[1338,2139],[1331,2141],[1332,2133],[1319,2127],[1322,2125],[1307,2126],[1289,2110],[1277,2113],[1280,2117],[1272,2115],[1283,2106],[1275,2106],[1278,2100],[1268,2102],[1270,2098],[1246,2107],[1244,2103],[1234,2112],[1223,2104],[1217,2114],[1214,2108],[1210,2114],[1214,2107],[1208,2102],[1203,2117],[1188,2125],[1183,2124],[1184,2120],[1174,2123],[1172,2112],[1150,2101],[1127,2126],[1122,2120],[1130,2120],[1129,2100],[1120,2091],[1132,2073],[1121,2060],[1127,2046],[1131,2050],[1149,2045],[1146,2039],[1132,2041],[1139,2032],[1147,2037],[1166,2036],[1170,2044],[1177,2040],[1180,2045],[1181,2041],[1195,2042],[1200,2036],[1213,2035],[1210,2029],[1221,2024],[1220,2017],[1234,2010],[1237,2001],[1245,1999],[1245,1993],[1253,1996],[1260,1989]],
  [[1347,2137],[1341,2125],[1348,2117],[1360,2119],[1367,2129],[1391,2120],[1374,2127],[1374,2136],[1367,2136],[1368,2132],[1360,2129],[1359,2134],[1347,2137]],
  [[2704,1400],[2716,1404],[2726,1400],[2737,1405],[2739,1413],[2753,1409],[2773,1415],[2773,1429],[2780,1434],[2801,1432],[2801,1415],[2808,1413],[2823,1427],[2833,1488],[2830,1532],[2820,1580],[2795,1591],[2789,1600],[2761,1591],[2754,1585],[2757,1597],[2735,1612],[2698,1584],[2699,1570],[2692,1570],[2680,1555],[2641,1547],[2629,1551],[2627,1559],[2602,1564],[2566,1580],[2555,1590],[2528,1586],[2532,1545],[2517,1532],[2528,1513],[2522,1501],[2525,1495],[2556,1492],[2561,1482],[2587,1483],[2581,1458],[2595,1451],[2600,1439],[2614,1428],[2604,1423],[2608,1421],[2625,1431],[2647,1426],[2656,1439],[2666,1435],[2677,1443],[2697,1441],[2708,1430],[2702,1425],[2704,1400]],
  [[2167,1491],[2199,1479],[2211,1482],[2213,1493],[2196,1497],[2193,1507],[2198,1514],[2192,1521],[2178,1519],[2154,1542],[2144,1536],[2147,1532],[2140,1533],[2131,1548],[2136,1550],[2129,1561],[2142,1559],[2148,1566],[2162,1555],[2162,1580],[2135,1588],[2127,1618],[2117,1625],[2123,1633],[2116,1643],[2122,1654],[2114,1678],[2120,1689],[2118,1700],[2128,1709],[2113,1724],[2111,1738],[2098,1741],[2077,1725],[2059,1729],[2053,1722],[2042,1722],[2040,1712],[2026,1700],[2055,1678],[2081,1648],[2111,1601],[2114,1574],[2106,1564],[2107,1550],[2097,1548],[2108,1523],[2106,1516],[2126,1503],[2140,1504],[2167,1491]],
  [[2144,1558],[2136,1547],[2140,1551],[2147,1547],[2154,1550],[2159,1544],[2162,1547],[2159,1553],[2144,1558]],
  [[2026,1700],[2040,1712],[2045,1724],[2053,1722],[2061,1729],[2077,1725],[2096,1741],[2111,1738],[2107,1754],[2118,1763],[2124,1780],[2117,1789],[2073,1791],[2070,1798],[2048,1790],[2040,1793],[2032,1814],[2010,1807],[2013,1831],[2004,1828],[2002,1837],[1989,1837],[1986,1844],[1974,1839],[1966,1860],[1953,1858],[1946,1868],[1905,1864],[1905,1857],[1894,1848],[1895,1834],[1898,1832],[1897,1839],[1903,1834],[1902,1842],[1906,1845],[1928,1834],[1922,1845],[1914,1844],[1937,1846],[1945,1836],[1937,1839],[1932,1834],[1936,1830],[1951,1838],[1957,1836],[1951,1830],[1957,1831],[1960,1826],[1953,1817],[1962,1823],[1981,1819],[1977,1803],[1987,1795],[1992,1806],[1989,1810],[1997,1814],[2001,1793],[1984,1773],[1977,1756],[2003,1717],[2006,1719],[2005,1709],[2026,1700]],
  [[1473,2077],[1470,2074],[1479,2066],[1474,2064],[1484,2058],[1490,2072],[1473,2077]],
  [[1401,2176],[1423,2163],[1430,2154],[1430,2132],[1438,2127],[1440,2111],[1467,2099],[1468,2092],[1462,2090],[1470,2086],[1500,2124],[1534,2112],[1566,2116],[1581,2103],[1595,2110],[1596,2126],[1591,2132],[1573,2132],[1564,2142],[1527,2141],[1520,2150],[1512,2148],[1500,2172],[1493,2173],[1488,2187],[1491,2193],[1483,2204],[1447,2208],[1463,2232],[1445,2241],[1442,2253],[1429,2265],[1416,2258],[1428,2295],[1422,2303],[1412,2305],[1413,2299],[1398,2299],[1395,2305],[1400,2305],[1394,2308],[1389,2301],[1396,2298],[1391,2295],[1395,2292],[1395,2296],[1405,2297],[1398,2294],[1393,2281],[1381,2280],[1381,2285],[1375,2286],[1381,2277],[1393,2280],[1387,2268],[1396,2267],[1386,2265],[1384,2260],[1390,2259],[1380,2253],[1389,2252],[1393,2260],[1398,2259],[1394,2255],[1398,2252],[1406,2250],[1399,2246],[1403,2241],[1391,2244],[1400,2234],[1374,2233],[1382,2226],[1382,2221],[1376,2225],[1375,2221],[1382,2210],[1376,2211],[1382,2207],[1371,2203],[1365,2209],[1362,2205],[1337,2223],[1329,2225],[1332,2221],[1328,2221],[1314,2228],[1332,2215],[1339,2216],[1338,2211],[1355,2209],[1355,2205],[1382,2193],[1401,2176]],
  [[1936,1971],[1943,1981],[1959,1985],[1966,1984],[1972,1975],[1987,1984],[1994,1979],[1999,1990],[1991,1992],[1997,1997],[1993,2007],[2004,2013],[2011,2011],[2013,2018],[2021,2017],[2023,2023],[2019,2031],[2001,2033],[1996,2041],[2006,2054],[2001,2057],[2007,2066],[2000,2076],[2002,2106],[1988,2105],[1982,2112],[1972,2114],[1967,2120],[1969,2126],[1962,2125],[1963,2136],[1952,2128],[1920,2134],[1917,2127],[1923,2113],[1907,2098],[1925,2072],[1939,2070],[1930,2061],[1926,2042],[1932,2030],[1926,2014],[1931,2006],[1926,2002],[1936,1971]],
  [[1522,1724],[1521,1719],[1511,1715],[1510,1702],[1527,1691],[1545,1705],[1542,1716],[1537,1718],[1538,1713],[1531,1717],[1537,1723],[1527,1720],[1522,1724]],
  [[1480,1746],[1471,1742],[1476,1733],[1495,1728],[1487,1734],[1487,1742],[1481,1734],[1476,1737],[1480,1746]],
  [[1491,1747],[1491,1735],[1502,1733],[1500,1738],[1506,1740],[1496,1740],[1491,1747]],
  [[1521,1834],[1513,1838],[1534,1859],[1529,1875],[1532,1884],[1506,1893],[1513,1902],[1505,1907],[1504,1919],[1458,1914],[1437,1939],[1418,1949],[1430,1953],[1429,1960],[1415,1960],[1402,1969],[1385,1964],[1378,1972],[1352,1967],[1349,1977],[1334,1984],[1339,1989],[1333,2007],[1320,2018],[1323,2027],[1311,2034],[1314,2044],[1305,2056],[1298,2051],[1281,2057],[1272,2046],[1277,2033],[1261,2033],[1256,2021],[1266,2008],[1260,1989],[1286,1984],[1313,1956],[1321,1955],[1331,1941],[1364,1922],[1382,1898],[1417,1881],[1425,1865],[1418,1854],[1438,1852],[1434,1848],[1457,1840],[1474,1840],[1475,1835],[1496,1829],[1495,1824],[1505,1832],[1531,1829],[1521,1834]],
  [[2923,971],[2924,965],[2940,957],[2963,989],[2966,998],[2959,1003],[2973,1012],[2965,1022],[2986,1040],[2984,1052],[2994,1078],[2985,1111],[2998,1099],[2998,1113],[3006,1118],[2995,1131],[2986,1133],[2990,1138],[3004,1132],[3001,1140],[2990,1140],[2983,1147],[2987,1152],[2977,1156],[2993,1154],[2989,1160],[2975,1162],[2982,1169],[2975,1167],[2975,1172],[2989,1172],[2972,1179],[2981,1184],[2966,1190],[2981,1198],[2974,1201],[2962,1196],[2964,1203],[2973,1205],[2962,1206],[2969,1211],[2949,1213],[2948,1204],[2945,1212],[2951,1217],[2945,1217],[2943,1222],[2948,1225],[2944,1227],[2938,1215],[2931,1216],[2932,1222],[2908,1217],[2908,1232],[2901,1239],[2899,1255],[2895,1258],[2878,1248],[2862,1261],[2843,1248],[2849,1238],[2823,1239],[2796,1223],[2787,1224],[2786,1217],[2794,1206],[2784,1201],[2783,1191],[2793,1184],[2786,1181],[2790,1174],[2774,1163],[2777,1157],[2768,1142],[2779,1130],[2780,1115],[2796,1100],[2788,1085],[2800,1074],[2790,1069],[2789,1062],[2805,1060],[2799,1024],[2805,1018],[2802,1006],[2808,999],[2818,993],[2830,998],[2879,971],[2884,978],[2900,970],[2916,975],[2923,971]],
  [[1710,1822],[1719,1831],[1717,1840],[1722,1853],[1729,1856],[1728,1864],[1734,1869],[1735,1883],[1726,1890],[1714,1887],[1702,1896],[1692,1895],[1677,1902],[1672,1882],[1650,1877],[1651,1869],[1637,1872],[1620,1888],[1605,1875],[1580,1870],[1574,1888],[1565,1891],[1568,1899],[1547,1900],[1548,1912],[1530,1914],[1525,1922],[1503,1920],[1505,1907],[1513,1902],[1506,1893],[1532,1884],[1529,1875],[1534,1859],[1517,1846],[1513,1838],[1516,1834],[1525,1833],[1521,1836],[1524,1843],[1546,1851],[1575,1837],[1610,1842],[1649,1836],[1661,1839],[1690,1833],[1710,1822]],
  [[1722,2074],[1746,2068],[1746,2075],[1756,2079],[1747,2109],[1750,2114],[1755,2109],[1767,2124],[1754,2137],[1774,2141],[1715,2173],[1709,2185],[1704,2185],[1709,2186],[1700,2187],[1701,2192],[1681,2189],[1673,2177],[1679,2174],[1677,2168],[1658,2166],[1654,2142],[1641,2141],[1634,2148],[1621,2139],[1606,2140],[1592,2134],[1596,2126],[1594,2109],[1611,2097],[1638,2090],[1648,2098],[1657,2090],[1669,2090],[1677,2079],[1707,2078],[1717,2083],[1722,2074]],
  [[1002,2453],[991,2437],[996,2433],[993,2430],[1002,2434],[1000,2430],[1005,2428],[1011,2441],[1002,2453]],
  [[1075,2436],[1097,2451],[1094,2458],[1106,2466],[1110,2478],[1129,2489],[1123,2502],[1141,2508],[1153,2534],[1157,2530],[1165,2536],[1171,2533],[1178,2544],[1171,2565],[1162,2563],[1147,2578],[1146,2584],[1162,2588],[1157,2599],[1165,2599],[1146,2607],[1137,2623],[1101,2637],[1087,2649],[1089,2638],[1085,2635],[1101,2623],[1110,2587],[1093,2565],[1093,2548],[1082,2550],[1075,2543],[1089,2535],[1096,2540],[1094,2548],[1104,2547],[1114,2530],[1109,2522],[1091,2516],[1081,2520],[1062,2559],[1071,2592],[1088,2600],[1083,2614],[1074,2620],[1063,2618],[1053,2603],[1011,2603],[1014,2598],[1009,2595],[1013,2592],[1005,2590],[1011,2586],[993,2574],[1002,2569],[1013,2576],[1021,2571],[1031,2548],[1028,2530],[1018,2517],[1007,2514],[1003,2506],[1013,2485],[1009,2471],[1005,2470],[1010,2458],[1005,2450],[1013,2446],[1027,2449],[1036,2439],[1052,2449],[1073,2441],[1075,2436]],
  [[954,2504],[949,2496],[953,2494],[945,2497],[948,2490],[960,2497],[960,2492],[964,2493],[963,2501],[954,2504]],
  [[1135,2713],[1134,2707],[1153,2677],[1157,2686],[1153,2718],[1137,2741],[1138,2760],[1122,2765],[1118,2743],[1132,2729],[1135,2713]],
  [[1063,2786],[1049,2784],[1039,2760],[1059,2743],[1088,2760],[1085,2774],[1063,2786]],
  [[916,3107],[916,3101],[920,3106],[916,3095],[921,3090],[928,3099],[926,3109],[910,3113],[899,3129],[885,3131],[882,3140],[876,3140],[887,3147],[875,3150],[875,3157],[864,3154],[871,3165],[857,3158],[855,3149],[851,3152],[856,3145],[850,3143],[849,3148],[830,3139],[853,3138],[856,3134],[849,3135],[843,3130],[864,3119],[874,3121],[874,3116],[883,3116],[885,3111],[891,3116],[899,3102],[912,3099],[906,3110],[911,3104],[912,3110],[916,3107]],
  [[861,3173],[861,3167],[855,3173],[850,3165],[844,3171],[844,3160],[837,3151],[847,3150],[841,3152],[847,3157],[852,3155],[848,3163],[853,3159],[851,3164],[865,3164],[861,3173]],
  [[791,3229],[789,3206],[802,3204],[802,3217],[813,3225],[811,3235],[805,3243],[797,3245],[787,3234],[791,3229]],
  [[736,3292],[759,3286],[734,3305],[726,3297],[729,3291],[736,3292]],
  [[2581,1296],[2611,1306],[2608,1325],[2632,1334],[2640,1346],[2621,1361],[2609,1358],[2604,1365],[2606,1385],[2599,1389],[2594,1410],[2600,1420],[2614,1428],[2600,1439],[2595,1451],[2581,1458],[2587,1483],[2561,1482],[2556,1492],[2527,1494],[2522,1501],[2528,1513],[2517,1532],[2532,1545],[2530,1585],[2519,1581],[2505,1564],[2497,1577],[2483,1578],[2486,1594],[2476,1595],[2477,1604],[2459,1607],[2459,1617],[2443,1617],[2439,1621],[2433,1614],[2437,1600],[2420,1590],[2416,1571],[2407,1569],[2387,1575],[2379,1588],[2371,1590],[2370,1602],[2357,1598],[2340,1601],[2330,1610],[2321,1605],[2326,1596],[2323,1591],[2299,1589],[2300,1598],[2281,1616],[2272,1584],[2260,1578],[2306,1564],[2338,1543],[2357,1544],[2364,1537],[2363,1542],[2414,1507],[2425,1488],[2447,1466],[2462,1429],[2501,1404],[2528,1396],[2552,1376],[2565,1353],[2566,1325],[2581,1296]],
  [[2362,1431],[2356,1426],[2367,1422],[2369,1410],[2379,1402],[2372,1394],[2364,1402],[2359,1399],[2362,1380],[2376,1360],[2395,1348],[2398,1338],[2408,1336],[2394,1380],[2402,1384],[2415,1380],[2413,1394],[2400,1414],[2362,1431]],
  [[1578,2135],[1589,2132],[1606,2140],[1621,2139],[1634,2148],[1641,2141],[1654,2142],[1658,2166],[1677,2168],[1679,2174],[1673,2177],[1681,2189],[1700,2191],[1683,2219],[1678,2246],[1637,2203],[1603,2194],[1575,2200],[1574,2191],[1572,2197],[1577,2201],[1539,2215],[1557,2215],[1538,2219],[1533,2226],[1529,2217],[1519,2232],[1524,2234],[1520,2237],[1524,2244],[1515,2257],[1517,2263],[1509,2263],[1496,2286],[1482,2287],[1482,2311],[1471,2316],[1483,2339],[1474,2338],[1475,2330],[1469,2328],[1458,2332],[1457,2327],[1447,2335],[1431,2326],[1417,2332],[1422,2316],[1433,2311],[1431,2303],[1422,2303],[1428,2295],[1416,2258],[1429,2265],[1442,2253],[1445,2241],[1463,2232],[1447,2208],[1483,2204],[1491,2193],[1488,2187],[1493,2173],[1500,2172],[1512,2148],[1520,2150],[1527,2141],[1564,2142],[1571,2133],[1578,2135]],
  [[1229,2330],[1263,2331],[1273,2319],[1288,2322],[1286,2337],[1292,2335],[1287,2345],[1274,2348],[1270,2361],[1260,2367],[1259,2378],[1264,2376],[1266,2381],[1254,2382],[1251,2390],[1257,2388],[1254,2392],[1259,2393],[1252,2396],[1242,2417],[1222,2484],[1220,2501],[1226,2507],[1219,2526],[1223,2532],[1208,2548],[1209,2561],[1200,2583],[1196,2578],[1187,2580],[1184,2571],[1171,2565],[1177,2556],[1175,2536],[1157,2530],[1153,2534],[1141,2508],[1123,2502],[1129,2489],[1110,2478],[1106,2466],[1094,2455],[1099,2449],[1139,2447],[1146,2438],[1162,2440],[1151,2424],[1162,2410],[1147,2390],[1147,2371],[1152,2364],[1162,2365],[1163,2354],[1183,2336],[1188,2321],[1201,2320],[1205,2325],[1223,2319],[1231,2326],[1229,2330]],
  [[2511,1812],[2532,1824],[2556,1828],[2568,1842],[2569,1829],[2574,1829],[2565,1823],[2573,1824],[2577,1817],[2601,1827],[2607,1836],[2622,1838],[2595,1849],[2605,1854],[2594,1861],[2600,1865],[2600,1871],[2594,1873],[2600,1873],[2596,1879],[2615,1887],[2600,1899],[2603,1907],[2592,1907],[2590,1897],[2595,1894],[2585,1880],[2563,1875],[2531,1880],[2514,1889],[2516,1907],[2494,1905],[2485,1890],[2492,1873],[2489,1861],[2475,1859],[2478,1852],[2508,1836],[2511,1812]],
];
const COAST = [
  [[1823,1836],[1804,1840],[1792,1827],[1794,1814],[1805,1816],[1831,1800],[1854,1793],[1868,1808],[1849,1836],[1859,1825],[1862,1832],[1857,1836],[1872,1840],[1870,1851],[1875,1844],[1883,1846],[1883,1840],[1874,1842],[1874,1833],[1894,1824],[1892,1831],[1898,1832],[1892,1838],[1896,1842],[1894,1848],[1905,1857],[1905,1864],[1946,1868],[1956,1883],[1961,1880],[1956,1893],[1960,1904],[1953,1924],[1955,1934],[1964,1942],[1962,1951],[1967,1955],[1975,1951],[1975,1959],[1985,1960],[1994,1979],[1989,1985],[1972,1975],[1966,1984],[1943,1981],[1942,1967],[1930,1950],[1917,1945],[1919,1937],[1913,1937],[1910,1943],[1914,1946],[1908,1947],[1897,1941],[1898,1934],[1881,1930],[1882,1909],[1864,1906],[1862,1900],[1848,1901],[1843,1886],[1828,1890],[1804,1876],[1805,1859],[1815,1863],[1824,1859],[1823,1836]],
  [[982,2206],[1022,2204],[1044,2219],[1066,2212],[1065,2229],[1056,2231],[1051,2242],[1048,2238],[1038,2246],[1032,2254],[1035,2265],[1024,2264],[1017,2254],[1001,2270],[996,2268],[994,2272],[1012,2297],[990,2294],[977,2287],[962,2274],[968,2269],[966,2261],[945,2257],[944,2247],[935,2238],[940,2229],[951,2238],[946,2230],[953,2217],[939,2209],[943,2203],[948,2210],[952,2209],[947,2205],[949,2191],[954,2198],[958,2192],[968,2195],[965,2204],[970,2209],[982,2206]],
  [[1162,2257],[1188,2294],[1187,2309],[1199,2320],[1188,2321],[1183,2336],[1163,2354],[1162,2365],[1152,2364],[1146,2371],[1147,2390],[1162,2410],[1151,2424],[1162,2440],[1146,2438],[1139,2447],[1103,2451],[1093,2450],[1077,2435],[1066,2444],[1043,2447],[1036,2437],[1043,2427],[1049,2426],[1047,2422],[1058,2416],[1053,2410],[1060,2405],[1058,2403],[1072,2391],[1067,2380],[1072,2378],[1066,2373],[1086,2356],[1053,2360],[1053,2356],[1078,2341],[1075,2332],[1079,2327],[1074,2318],[1050,2305],[1045,2289],[1060,2289],[1059,2281],[1073,2269],[1086,2270],[1090,2259],[1142,2286],[1148,2274],[1140,2265],[1142,2257],[1162,2257]],
  [[1035,2396],[1019,2395],[1015,2400],[1011,2392],[1010,2410],[1004,2413],[1002,2409],[999,2416],[1003,2416],[991,2423],[988,2431],[975,2435],[977,2426],[970,2425],[977,2415],[981,2420],[980,2415],[986,2419],[987,2415],[972,2410],[983,2381],[979,2373],[983,2377],[1007,2371],[1009,2389],[1029,2376],[1040,2375],[1041,2380],[1053,2374],[1043,2398],[1035,2401],[1035,2396]],
  [[1704,2010],[1710,2011],[1705,2033],[1695,2031],[1701,2029],[1698,2025],[1687,2037],[1687,2025],[1672,2027],[1678,2024],[1674,2021],[1677,2016],[1704,2010]],
  [[1671,2084],[1669,2090],[1657,2090],[1648,2098],[1638,2090],[1620,2094],[1594,2109],[1581,2103],[1587,2098],[1589,2076],[1574,2064],[1593,2067],[1593,2071],[1619,2053],[1618,2048],[1624,2047],[1620,2053],[1629,2050],[1631,2042],[1661,2049],[1663,2042],[1669,2046],[1671,2039],[1676,2053],[1684,2045],[1693,2051],[1692,2060],[1712,2064],[1722,2074],[1718,2083],[1707,2078],[1671,2084]],
  [[2146,1858],[2152,1856],[2149,1860],[2161,1867],[2167,1880],[2180,1881],[2184,1887],[2205,1880],[2225,1892],[2248,1880],[2245,1887],[2250,1897],[2267,1890],[2294,1894],[2288,1899],[2292,1905],[2286,1908],[2287,1913],[2273,1926],[2272,1937],[2260,1951],[2235,1966],[2234,1990],[2156,2008],[2165,1993],[2173,1997],[2201,1980],[2201,1990],[2204,1990],[2205,1981],[2212,1981],[2207,1980],[2208,1971],[2203,1966],[2189,1964],[2181,1974],[2181,1970],[2157,1972],[2144,1964],[2150,1939],[2138,1973],[2148,1986],[2126,1974],[2130,1961],[2123,1953],[2122,1938],[2135,1917],[2130,1915],[2127,1926],[2124,1917],[2125,1927],[2119,1923],[2118,1929],[2114,1928],[2110,1917],[2098,1908],[2099,1889],[2114,1866],[2125,1868],[2146,1858]],
  [[2651,1547],[2680,1555],[2692,1570],[2699,1570],[2700,1616],[2707,1626],[2694,1630],[2701,1661],[2688,1682],[2679,1679],[2653,1685],[2642,1699],[2632,1698],[2627,1710],[2611,1717],[2601,1716],[2594,1704],[2567,1705],[2550,1685],[2562,1670],[2560,1662],[2570,1649],[2544,1640],[2552,1620],[2548,1615],[2557,1605],[2548,1601],[2549,1596],[2566,1580],[2627,1559],[2626,1553],[2635,1548],[2651,1547]],
  [[2383,1758],[2395,1762],[2400,1772],[2420,1768],[2424,1776],[2435,1776],[2444,1769],[2471,1782],[2480,1779],[2493,1803],[2511,1812],[2511,1831],[2468,1864],[2435,1868],[2432,1861],[2424,1862],[2419,1852],[2415,1854],[2407,1876],[2411,1896],[2404,1902],[2393,1900],[2382,1876],[2369,1878],[2363,1873],[2360,1865],[2366,1840],[2351,1805],[2361,1797],[2352,1790],[2361,1774],[2369,1778],[2383,1758]],
  [[2010,1807],[2032,1814],[2033,1821],[2039,1822],[2038,1834],[2047,1832],[2052,1837],[2050,1845],[2059,1863],[2054,1866],[2048,1889],[2061,1905],[2054,1936],[2046,1949],[2027,1958],[2003,1950],[1999,1954],[2006,1957],[2000,1965],[1989,1970],[1985,1960],[1975,1959],[1975,1951],[1967,1955],[1962,1951],[1964,1942],[1953,1924],[1961,1881],[1956,1883],[1945,1870],[1953,1858],[1966,1860],[1974,1839],[1986,1844],[1989,1837],[2002,1837],[2004,1828],[2013,1831],[2010,1807]],
  [[2429,1680],[2403,1681],[2388,1675],[2393,1647],[2409,1637],[2407,1630],[2443,1617],[2454,1620],[2460,1615],[2459,1607],[2477,1604],[2476,1595],[2486,1594],[2483,1578],[2497,1577],[2505,1564],[2530,1587],[2555,1590],[2548,1601],[2557,1605],[2548,1615],[2552,1620],[2544,1640],[2570,1649],[2560,1662],[2562,1670],[2550,1685],[2567,1705],[2594,1704],[2602,1715],[2594,1720],[2588,1716],[2566,1719],[2549,1708],[2544,1712],[2511,1703],[2496,1730],[2482,1731],[2460,1747],[2448,1747],[2441,1756],[2427,1748],[2429,1732],[2418,1723],[2428,1722],[2422,1703],[2431,1699],[2429,1680]],
  [[2907,1220],[2911,1216],[2932,1222],[2939,1240],[2922,1233],[2927,1247],[2912,1257],[2920,1263],[2920,1272],[2914,1267],[2909,1275],[2900,1275],[2900,1280],[2914,1281],[2903,1292],[2909,1300],[2915,1297],[2917,1305],[2905,1302],[2909,1307],[2906,1312],[2912,1315],[2901,1316],[2905,1325],[2916,1324],[2907,1328],[2915,1334],[2914,1347],[2901,1339],[2903,1333],[2896,1333],[2903,1329],[2898,1324],[2888,1327],[2886,1321],[2870,1320],[2853,1330],[2855,1338],[2849,1338],[2848,1328],[2836,1329],[2830,1338],[2841,1342],[2825,1347],[2833,1348],[2823,1356],[2813,1380],[2814,1414],[2801,1415],[2801,1430],[2788,1430],[2791,1436],[2774,1431],[2773,1415],[2768,1413],[2753,1409],[2739,1413],[2737,1405],[2726,1400],[2716,1404],[2704,1399],[2704,1385],[2728,1380],[2738,1363],[2736,1347],[2762,1314],[2752,1304],[2755,1294],[2748,1282],[2758,1281],[2759,1266],[2766,1258],[2759,1255],[2749,1236],[2765,1237],[2783,1224],[2796,1223],[2823,1239],[2849,1238],[2843,1248],[2865,1262],[2878,1248],[2895,1258],[2899,1255],[2901,1239],[2908,1232],[2907,1220]],
  [[2358,1817],[2366,1840],[2360,1865],[2363,1873],[2369,1878],[2381,1875],[2388,1896],[2395,1900],[2404,1902],[2411,1896],[2407,1876],[2411,1859],[2419,1852],[2424,1862],[2432,1861],[2435,1868],[2489,1861],[2492,1873],[2485,1890],[2494,1905],[2508,1907],[2501,1922],[2506,1924],[2505,1936],[2514,1944],[2497,1974],[2489,1978],[2487,1993],[2480,1990],[2463,2003],[2445,1988],[2451,1976],[2447,1964],[2451,1958],[2448,1953],[2454,1949],[2449,1939],[2452,1929],[2471,1929],[2473,1924],[2460,1913],[2436,1906],[2414,1914],[2404,1926],[2406,1935],[2406,1929],[2411,1930],[2408,1935],[2381,1947],[2372,1973],[2359,1981],[2354,1991],[2359,2005],[2332,1993],[2287,1996],[2234,1990],[2235,1966],[2260,1951],[2272,1937],[2273,1926],[2287,1913],[2292,1894],[2345,1866],[2341,1852],[2348,1848],[2345,1833],[2353,1829],[2358,1817]],
  [[2753,1585],[2788,1598],[2793,1605],[2783,1613],[2778,1635],[2760,1666],[2763,1685],[2751,1707],[2760,1738],[2775,1764],[2769,1766],[2771,1772],[2773,1774],[2771,1769],[2776,1767],[2800,1800],[2743,1761],[2742,1770],[2734,1766],[2711,1778],[2682,1781],[2647,1764],[2621,1735],[2612,1737],[2605,1722],[2605,1716],[2627,1710],[2632,1698],[2642,1699],[2653,1685],[2690,1681],[2701,1661],[2694,1630],[2707,1626],[2700,1618],[2700,1587],[2707,1587],[2735,1612],[2757,1597],[2753,1585]],
  [[665,3414],[683,3386],[690,3391],[694,3407],[685,3422],[678,3429],[664,3430],[664,3435],[660,3434],[662,3443],[644,3443],[648,3449],[638,3451],[630,3464],[617,3460],[610,3465],[626,3489],[616,3481],[612,3483],[598,3506],[601,3511],[609,3508],[610,3512],[593,3526],[582,3528],[580,3516],[583,3515],[578,3507],[599,3487],[590,3463],[605,3464],[613,3452],[625,3450],[636,3440],[621,3434],[619,3415],[639,3419],[636,3426],[643,3430],[660,3425],[656,3421],[665,3414]],
  [[425,3480],[422,3476],[434,3472],[441,3480],[439,3490],[425,3480]],
  [[186,3773],[177,3765],[182,3766],[177,3758],[184,3749],[177,3737],[190,3757],[213,3771],[186,3773]],
  [[-5,3841],[-15,3835],[-10,3826],[-20,3826],[-21,3819],[-14,3820],[-15,3814],[-11,3821],[3,3819],[4,3811],[13,3810],[18,3791],[23,3792],[8,3817],[8,3836],[-5,3841]],
  [[-55,3855],[-91,3845],[-87,3841],[-83,3844],[-84,3838],[-76,3844],[-77,3830],[-70,3822],[-65,3830],[-55,3828],[-44,3835],[-55,3855]],
  [[2635,1195],[2656,1198],[2668,1193],[2668,1200],[2683,1208],[2718,1212],[2721,1217],[2732,1220],[2735,1231],[2748,1234],[2759,1255],[2766,1258],[2759,1266],[2758,1281],[2748,1282],[2755,1294],[2752,1304],[2762,1314],[2736,1347],[2738,1363],[2727,1381],[2704,1385],[2702,1425],[2708,1430],[2697,1441],[2677,1443],[2666,1435],[2656,1439],[2647,1426],[2625,1431],[2595,1414],[2599,1389],[2606,1385],[2602,1382],[2607,1359],[2621,1361],[2634,1354],[2640,1343],[2632,1334],[2608,1325],[2611,1306],[2580,1296],[2593,1275],[2617,1252],[2635,1195]],
  [[1905,2048],[1926,2042],[1930,2061],[1939,2069],[1935,2074],[1925,2072],[1908,2093],[1923,2113],[1917,2127],[1920,2134],[1932,2128],[1959,2130],[1960,2144],[1975,2158],[1986,2160],[1981,2174],[1974,2175],[1976,2179],[1972,2182],[1977,2186],[1951,2201],[1949,2212],[1943,2212],[1944,2203],[1916,2201],[1891,2192],[1882,2184],[1882,2176],[1872,2170],[1884,2161],[1856,2150],[1841,2132],[1826,2132],[1828,2123],[1836,2118],[1828,2115],[1845,2105],[1830,2098],[1836,2090],[1841,2091],[1837,2087],[1852,2084],[1827,2064],[1829,2057],[1842,2062],[1873,2051],[1905,2048]],
  [[1970,2116],[1986,2110],[1986,2117],[1981,2117],[1979,2124],[1968,2125],[1970,2116]],
  [[872,2035],[868,2033],[866,2042],[874,2037],[868,2049],[874,2051],[869,2050],[871,2055],[866,2058],[867,2044],[859,2051],[859,2041],[855,2042],[856,2050],[845,2046],[854,2044],[853,2032],[860,2028],[853,2027],[865,2016],[855,2011],[861,1995],[874,1997],[883,1985],[891,1992],[885,1994],[890,1996],[888,2000],[880,2000],[888,2005],[887,2012],[869,2030],[872,2035]],
  [[843,2096],[843,2091],[835,2093],[842,2052],[845,2058],[854,2056],[856,2061],[852,2052],[859,2056],[859,2061],[866,2058],[855,2088],[843,2096]],
  [[928,2164],[915,2153],[922,2154],[916,2146],[923,2146],[920,2140],[925,2136],[937,2139],[932,2145],[941,2149],[935,2151],[941,2154],[940,2157],[930,2158],[928,2164]],
  [[870,2260],[867,2253],[874,2258],[872,2249],[880,2248],[875,2242],[882,2238],[881,2228],[893,2222],[895,2226],[900,2222],[894,2219],[900,2217],[903,2226],[894,2231],[897,2234],[889,2239],[892,2243],[870,2260]],
  [[914,2225],[920,2218],[921,2227],[940,2224],[935,2238],[944,2247],[945,2257],[966,2261],[968,2269],[962,2274],[986,2292],[1009,2297],[1006,2305],[991,2315],[1007,2319],[1025,2312],[1032,2316],[1039,2330],[1034,2348],[1004,2363],[997,2346],[1004,2345],[1010,2334],[1006,2327],[989,2327],[967,2333],[957,2351],[932,2367],[945,2352],[941,2345],[948,2346],[954,2334],[945,2340],[937,2322],[925,2320],[914,2303],[921,2272],[935,2281],[931,2292],[936,2286],[945,2293],[943,2305],[939,2299],[943,2309],[940,2314],[950,2320],[955,2311],[977,2317],[964,2304],[967,2293],[962,2284],[954,2278],[945,2283],[948,2279],[936,2276],[936,2272],[936,2281],[930,2272],[939,2264],[930,2268],[925,2261],[927,2269],[919,2272],[918,2266],[924,2265],[914,2260],[918,2257],[914,2250],[913,2256],[911,2250],[900,2251],[905,2238],[912,2234],[902,2232],[903,2222],[914,2225]],
  [[817,2323],[814,2306],[819,2307],[812,2304],[813,2299],[806,2300],[818,2293],[815,2285],[822,2285],[826,2261],[821,2292],[835,2288],[838,2295],[831,2301],[824,2297],[824,2315],[818,2314],[817,2323]],
  [[812,2318],[802,2313],[801,2307],[808,2312],[804,2302],[813,2309],[812,2318]],
  [[797,2326],[786,2315],[788,2312],[796,2319],[794,2313],[797,2317],[800,2313],[797,2326]],
  [[785,2332],[779,2326],[780,2319],[786,2326],[784,2318],[792,2326],[785,2332]],
  [[769,2366],[763,2360],[740,2359],[742,2353],[748,2361],[751,2356],[746,2355],[753,2349],[748,2344],[751,2329],[755,2337],[766,2331],[769,2337],[775,2326],[778,2333],[774,2334],[783,2336],[780,2341],[789,2354],[768,2354],[772,2363],[769,2366]],
  [[2805,946],[2802,959],[2823,961],[2825,974],[2819,975],[2816,997],[2802,1006],[2805,1017],[2799,1024],[2800,1042],[2805,1060],[2789,1062],[2790,1069],[2800,1074],[2788,1085],[2796,1100],[2780,1115],[2779,1130],[2767,1147],[2776,1155],[2778,1168],[2790,1174],[2786,1181],[2793,1184],[2783,1191],[2784,1201],[2794,1206],[2786,1217],[2787,1224],[2767,1236],[2752,1239],[2735,1231],[2730,1218],[2713,1210],[2710,1214],[2691,1210],[2690,1206],[2683,1208],[2668,1200],[2668,1193],[2656,1198],[2635,1195],[2643,1167],[2654,1161],[2662,1141],[2668,1108],[2666,1078],[2657,1063],[2644,1055],[2616,1063],[2606,1038],[2626,1045],[2649,1022],[2660,998],[2662,977],[2647,961],[2661,962],[2669,954],[2675,960],[2714,959],[2723,950],[2748,966],[2757,959],[2766,965],[2781,963],[2805,946]],
  [[1651,1869],[1650,1877],[1672,1882],[1677,1902],[1715,1888],[1712,1895],[1717,1906],[1710,1906],[1701,1924],[1693,1928],[1696,1933],[1691,1942],[1698,1949],[1691,1959],[1701,1968],[1702,1982],[1679,1978],[1682,1984],[1689,1986],[1668,2006],[1639,2004],[1656,2008],[1649,2019],[1641,2017],[1637,2030],[1620,2026],[1616,2029],[1618,2034],[1612,2033],[1604,2017],[1601,2022],[1605,2027],[1598,2025],[1596,2014],[1595,2020],[1591,2018],[1571,2028],[1562,2019],[1569,2030],[1560,2032],[1555,2012],[1544,2000],[1548,1991],[1540,1980],[1544,1967],[1530,1952],[1534,1931],[1525,1923],[1528,1915],[1548,1912],[1549,1899],[1568,1899],[1565,1891],[1574,1888],[1580,1870],[1605,1875],[1620,1888],[1637,1872],[1651,1869]],
  [[1088,2126],[1105,2120],[1102,2125],[1111,2123],[1112,2128],[1100,2133],[1110,2134],[1114,2125],[1119,2124],[1118,2128],[1125,2131],[1137,2118],[1147,2118],[1142,2138],[1136,2141],[1143,2144],[1141,2150],[1159,2178],[1175,2180],[1173,2199],[1149,2197],[1126,2210],[1124,2222],[1116,2229],[1121,2242],[1114,2248],[1125,2256],[1119,2270],[1090,2259],[1086,2270],[1073,2269],[1059,2281],[1060,2289],[1042,2290],[1047,2280],[1032,2254],[1048,2238],[1051,2242],[1056,2231],[1065,2229],[1066,2212],[1044,2219],[1022,2204],[983,2206],[983,2201],[1001,2194],[1003,2190],[995,2192],[998,2188],[990,2185],[1000,2183],[1011,2171],[1021,2186],[1043,2182],[1048,2167],[1035,2175],[1024,2167],[1030,2172],[1042,2167],[1054,2155],[1050,2144],[1055,2144],[1056,2136],[1062,2136],[1064,2131],[1082,2132],[1088,2126]],
  [[2162,1687],[2180,1671],[2187,1677],[2205,1670],[2205,1677],[2218,1671],[2221,1677],[2239,1678],[2261,1692],[2262,1702],[2249,1714],[2253,1722],[2246,1728],[2245,1734],[2256,1740],[2253,1751],[2233,1772],[2217,1773],[2208,1786],[2230,1796],[2244,1816],[2239,1824],[2259,1841],[2259,1848],[2252,1852],[2259,1861],[2249,1861],[2254,1872],[2225,1892],[2205,1880],[2184,1887],[2180,1881],[2167,1880],[2161,1867],[2149,1860],[2151,1856],[2125,1868],[2114,1866],[2099,1889],[2097,1908],[2093,1902],[2088,1905],[2074,1886],[2054,1893],[2048,1889],[2054,1866],[2059,1863],[2050,1845],[2053,1840],[2047,1832],[2038,1834],[2039,1822],[2031,1815],[2039,1804],[2039,1795],[2048,1790],[2070,1798],[2073,1791],[2117,1789],[2124,1779],[2123,1772],[2107,1754],[2113,1724],[2128,1709],[2118,1700],[2124,1698],[2131,1687],[2132,1692],[2144,1691],[2149,1704],[2161,1694],[2162,1687]],
  [[2788,821],[2798,784],[2810,770],[2811,761],[2826,772],[2844,776],[2870,795],[2888,793],[2903,782],[2891,828],[2895,903],[2908,938],[2915,943],[2922,940],[2940,957],[2924,965],[2916,975],[2900,970],[2884,978],[2879,971],[2826,999],[2817,991],[2819,975],[2825,974],[2823,961],[2802,959],[2805,946],[2781,963],[2766,965],[2757,959],[2748,966],[2723,950],[2714,959],[2675,960],[2669,954],[2661,962],[2647,961],[2648,939],[2634,928],[2645,923],[2657,904],[2666,900],[2678,905],[2699,894],[2712,850],[2711,842],[2699,835],[2711,832],[2714,812],[2735,826],[2750,818],[2763,824],[2768,868],[2781,889],[2791,888],[2802,879],[2804,868],[2798,867],[2805,857],[2817,860],[2821,871],[2843,881],[2853,878],[2863,864],[2872,831],[2863,813],[2853,809],[2835,826],[2822,823],[2794,836],[2786,833],[2788,821]],
  [[1879,1924],[1881,1930],[1899,1934],[1897,1941],[1908,1947],[1914,1946],[1910,1943],[1913,1937],[1919,1937],[1917,1945],[1925,1945],[1942,1967],[1936,1971],[1926,2002],[1931,2006],[1926,2014],[1930,2017],[1931,2038],[1902,2051],[1898,2046],[1835,2062],[1832,2055],[1853,2049],[1880,2026],[1880,2016],[1882,2021],[1889,2016],[1891,2011],[1885,2011],[1884,2004],[1887,2009],[1895,2006],[1888,2005],[1892,1996],[1886,1994],[1888,1987],[1884,1987],[1894,1980],[1886,1964],[1891,1950],[1887,1948],[1895,1945],[1875,1938],[1876,1928],[1872,1926],[1879,1924]],
  [[2409,1569],[2419,1577],[2420,1590],[2437,1600],[2433,1614],[2438,1621],[2412,1627],[2407,1630],[2409,1637],[2398,1640],[2389,1660],[2388,1675],[2398,1681],[2430,1680],[2431,1699],[2422,1703],[2428,1722],[2418,1723],[2429,1732],[2427,1748],[2441,1756],[2444,1769],[2426,1776],[2420,1768],[2397,1771],[2396,1763],[2383,1758],[2369,1778],[2361,1774],[2352,1790],[2361,1797],[2351,1805],[2358,1817],[2353,1829],[2345,1833],[2348,1848],[2341,1852],[2345,1866],[2303,1886],[2299,1893],[2283,1896],[2267,1890],[2250,1897],[2245,1887],[2246,1877],[2254,1872],[2249,1861],[2260,1860],[2252,1852],[2259,1848],[2259,1841],[2239,1824],[2244,1816],[2230,1796],[2208,1786],[2217,1773],[2233,1772],[2253,1751],[2256,1740],[2245,1734],[2246,1728],[2253,1722],[2249,1714],[2263,1699],[2251,1683],[2265,1662],[2271,1661],[2269,1652],[2279,1648],[2279,1618],[2300,1598],[2299,1589],[2323,1591],[2326,1596],[2321,1605],[2330,1610],[2340,1601],[2357,1598],[2370,1602],[2371,1590],[2379,1588],[2387,1575],[2409,1569]],
  [[1235,2169],[1250,2168],[1260,2175],[1268,2190],[1268,2207],[1262,2217],[1249,2215],[1253,2221],[1243,2228],[1228,2225],[1230,2242],[1243,2246],[1260,2240],[1271,2247],[1295,2242],[1278,2267],[1295,2266],[1287,2274],[1297,2278],[1302,2273],[1307,2279],[1312,2273],[1314,2280],[1300,2281],[1293,2291],[1305,2300],[1312,2297],[1312,2302],[1317,2298],[1326,2302],[1308,2304],[1309,2310],[1314,2310],[1302,2319],[1313,2321],[1307,2327],[1293,2325],[1290,2336],[1286,2335],[1288,2322],[1273,2319],[1263,2331],[1239,2334],[1230,2331],[1223,2319],[1204,2325],[1188,2312],[1188,2294],[1160,2256],[1142,2257],[1140,2265],[1148,2274],[1142,2286],[1117,2272],[1125,2256],[1114,2248],[1121,2242],[1116,2229],[1124,2222],[1131,2204],[1149,2197],[1173,2199],[1175,2180],[1216,2187],[1227,2170],[1235,2169]],
  [[2073,1886],[2088,1905],[2093,1902],[2110,1917],[2115,1928],[2094,1933],[2091,1941],[2097,1943],[2074,1976],[2073,1990],[2078,1991],[2073,2002],[2093,2005],[2122,2024],[2124,2020],[2132,2026],[2132,2034],[2140,2031],[2138,2044],[2121,2045],[2130,2050],[2137,2046],[2132,2051],[2136,2062],[2127,2067],[2113,2064],[2129,2064],[2124,2062],[2130,2060],[2124,2057],[2127,2055],[2120,2052],[2118,2059],[2113,2054],[2113,2059],[2101,2060],[2107,2050],[2099,2053],[2101,2049],[2096,2049],[2098,2053],[2092,2056],[2098,2054],[2086,2065],[2081,2062],[2084,2058],[2077,2061],[2077,2066],[2069,2061],[2072,2068],[2066,2068],[2070,2070],[2066,2072],[2063,2065],[2059,2067],[2060,2072],[2039,2076],[2031,2082],[2032,2090],[2038,2090],[2035,2095],[2026,2094],[2030,2088],[2019,2097],[2032,2107],[2025,2108],[2030,2116],[2020,2111],[2017,2116],[2023,2120],[2015,2122],[2015,2127],[2009,2124],[1986,2160],[1979,2160],[1960,2144],[1960,2136],[1967,2134],[1967,2125],[1986,2117],[1988,2105],[2002,2106],[2000,2076],[2007,2066],[2001,2057],[2006,2054],[1996,2041],[2001,2033],[2019,2031],[2023,2023],[2021,2017],[2013,2018],[2011,2011],[2004,2013],[1993,2007],[1997,1997],[1991,1992],[1999,1990],[1988,1970],[2000,1965],[2006,1957],[1999,1954],[2003,1950],[2027,1958],[2046,1949],[2059,1920],[2061,1903],[2053,1899],[2054,1893],[2073,1886]],
  [[1456,1915],[1522,1918],[1534,1931],[1529,1949],[1544,1967],[1540,1980],[1548,1991],[1544,2000],[1556,2015],[1555,2031],[1549,2025],[1552,2035],[1548,2033],[1538,2046],[1521,2041],[1526,2037],[1523,2032],[1519,2037],[1494,2040],[1492,2050],[1465,2051],[1454,2059],[1446,2055],[1444,2061],[1439,2061],[1440,2068],[1420,2075],[1412,2070],[1402,2076],[1405,2068],[1398,2065],[1394,2051],[1399,2046],[1369,2048],[1351,2065],[1353,2073],[1336,2069],[1333,2051],[1323,2047],[1325,2032],[1318,2021],[1333,2007],[1339,1989],[1334,1984],[1349,1977],[1352,1967],[1378,1972],[1385,1964],[1402,1969],[1415,1960],[1429,1960],[1430,1953],[1418,1949],[1437,1939],[1456,1915]],
  [[1384,2088],[1389,2080],[1385,2076],[1384,2080],[1374,2065],[1383,2065],[1391,2074],[1391,2067],[1384,2066],[1385,2060],[1392,2058],[1394,2086],[1384,2088]],
  [[1404,2097],[1402,2093],[1387,2094],[1396,2087],[1400,2075],[1405,2079],[1399,2083],[1405,2084],[1402,2092],[1411,2090],[1404,2097]],
  [[3946,143],[3938,152],[3944,157],[3933,171],[3891,194],[3869,221],[3848,222],[3827,246],[3812,242],[3813,233],[3827,223],[3826,209],[3834,218],[3840,212],[3836,204],[3851,208],[3865,199],[3868,187],[3854,183],[3853,175],[3874,178],[3879,167],[3922,143],[3924,127],[3919,123],[3945,128]],
  [[2923,111],[2922,101],[2936,81],[2934,62],[2940,71],[2959,70],[2970,65],[2976,52],[2984,50],[3002,71],[3022,82],[3079,132],[3105,171],[3161,222],[3256,277],[3313,294],[3372,302],[3380,325],[3398,332],[3464,334],[3530,287],[3554,260],[3560,276],[3514,341],[3510,366],[3523,385],[3556,396],[3556,401],[3547,402],[3555,399],[3553,395],[3531,389],[3531,394],[3544,428],[3563,449],[3581,453],[3608,431],[3627,429],[3635,435],[3594,450],[3592,462],[3583,468],[3586,471],[3566,468],[3523,475],[3513,493],[3494,504],[3477,503],[3470,498],[3474,492],[3465,490],[3452,504],[3460,513],[3406,511],[3391,506],[3391,501],[3375,500],[3317,523],[3262,565],[3227,605],[3214,633],[3218,646],[3214,670],[3206,679],[3204,693],[3156,659],[3131,654],[3075,631],[3027,600],[2999,593],[2972,574],[2932,567],[2943,562],[2884,583],[2846,605],[2826,626],[2814,620],[2827,618],[2811,614],[2804,597],[2789,590],[2777,575],[2736,575],[2710,605],[2704,624],[2706,635],[2724,641],[2749,659],[2776,655],[2785,659],[2819,694],[2850,706],[2857,715],[2820,732],[2788,720],[2775,726],[2778,714],[2765,713],[2759,726],[2732,736],[2731,759],[2726,766],[2701,772],[2691,787],[2682,782],[2672,784],[2662,776],[2655,750],[2669,715],[2678,712],[2680,684],[2662,660],[2644,656],[2637,643],[2619,633],[2621,616],[2632,597],[2628,570],[2640,558],[2665,555],[2681,545],[2689,532],[2699,542],[2709,540],[2709,532],[2723,515],[2745,502],[2746,495],[2712,461],[2716,441],[2729,442],[2741,434],[2790,466],[2828,458],[2827,467],[2853,475],[2874,465],[2897,442],[2898,426],[2886,408],[2890,396],[2881,371],[2891,357],[2920,347],[2932,329],[2934,332],[2935,266],[2951,245],[2959,207],[2947,157],[2923,111]],
  [[2831,94],[2820,60],[2827,65],[2831,60],[2837,67],[2831,94]],
  [[2851,103],[2859,97],[2872,101],[2881,116],[2864,125],[2849,114],[2851,103]],
  [[3624,310],[3623,303],[3665,264],[3668,254],[3688,231],[3696,230],[3722,247],[3764,240],[3749,259],[3739,255],[3717,272],[3686,275],[3674,289],[3654,298],[3643,313],[3646,318],[3635,319],[3630,334],[3598,345],[3590,383],[3590,370],[3571,372],[3566,351],[3624,310]],
  [[3775,375],[3772,365],[3765,368],[3769,363],[3765,356],[3792,354],[3788,349],[3805,342],[3821,351],[3775,375]],
  [[3686,419],[3677,407],[3688,403],[3701,405],[3699,413],[3686,419]],
  [[2565,671],[2560,667],[2558,648],[2583,635],[2574,662],[2565,671]],
  [[1794,1814],[1792,1827],[1804,1840],[1822,1836],[1824,1841],[1824,1859],[1815,1863],[1805,1859],[1804,1876],[1828,1890],[1843,1886],[1848,1901],[1862,1900],[1864,1906],[1882,1909],[1883,1919],[1872,1926],[1876,1928],[1875,1938],[1895,1946],[1887,1948],[1891,1950],[1886,1964],[1894,1980],[1882,1989],[1884,1986],[1879,1989],[1871,1981],[1848,1988],[1847,1995],[1826,1999],[1758,1970],[1728,1976],[1727,1966],[1726,1974],[1717,1981],[1708,1977],[1702,1982],[1701,1968],[1692,1963],[1692,1953],[1698,1949],[1691,1943],[1696,1933],[1693,1928],[1701,1924],[1710,1906],[1717,1906],[1713,1892],[1735,1883],[1734,1869],[1728,1864],[1729,1856],[1722,1853],[1717,1840],[1719,1831],[1710,1822],[1738,1812],[1753,1818],[1777,1811],[1794,1814]],
  [[1781,2035],[1814,2003],[1820,2005],[1799,2036],[1799,2049],[1808,2063],[1771,2077],[1766,2071],[1769,2065],[1759,2068],[1758,2058],[1771,2052],[1781,2035]],
  [[2620,1737],[2647,1764],[2683,1781],[2711,1778],[2734,1766],[2742,1770],[2743,1761],[2804,1804],[2803,1808],[2797,1805],[2767,1809],[2746,1824],[2726,1849],[2722,1899],[2710,1908],[2678,1911],[2654,1930],[2650,1944],[2638,1950],[2616,1938],[2633,1932],[2625,1925],[2631,1917],[2626,1900],[2635,1890],[2631,1880],[2620,1876],[2630,1872],[2631,1865],[2640,1868],[2641,1855],[2661,1849],[2668,1835],[2679,1830],[2672,1830],[2677,1825],[2655,1815],[2655,1808],[2646,1811],[2647,1817],[2636,1820],[2644,1807],[2637,1795],[2640,1777],[2620,1737]],
  [[2260,1578],[2274,1588],[2281,1634],[2279,1648],[2269,1652],[2271,1661],[2265,1662],[2252,1683],[2221,1677],[2218,1671],[2205,1677],[2205,1670],[2187,1677],[2180,1671],[2149,1704],[2144,1691],[2132,1692],[2131,1687],[2124,1698],[2118,1700],[2120,1689],[2114,1676],[2118,1674],[2122,1654],[2116,1642],[2123,1633],[2117,1625],[2127,1618],[2135,1588],[2159,1580],[2150,1597],[2172,1613],[2168,1615],[2206,1617],[2219,1609],[2226,1587],[2260,1578]],
  [[2480,1779],[2493,1772],[2540,1783],[2555,1796],[2580,1788],[2576,1795],[2581,1797],[2597,1789],[2613,1792],[2616,1787],[2627,1786],[2639,1792],[2644,1807],[2636,1818],[2623,1821],[2622,1815],[2617,1815],[2614,1827],[2616,1832],[2621,1830],[2622,1838],[2607,1836],[2601,1827],[2584,1819],[2577,1817],[2573,1824],[2567,1820],[2565,1824],[2574,1829],[2569,1829],[2568,1842],[2556,1828],[2530,1824],[2525,1817],[2493,1803],[2480,1779]],
  [[2574,2103],[2569,2097],[2572,2090],[2583,2091],[2584,2099],[2574,2103]],
  [[3031,3357],[3025,3356],[3028,3348],[3025,3345],[3033,3350],[3031,3357]],
  [[2511,1703],[2544,1712],[2549,1708],[2566,1719],[2604,1717],[2612,1737],[2620,1737],[2638,1772],[2639,1792],[2618,1786],[2613,1792],[2600,1789],[2581,1797],[2576,1795],[2580,1788],[2555,1796],[2540,1783],[2493,1772],[2471,1782],[2445,1770],[2441,1756],[2448,1747],[2460,1747],[2482,1731],[2496,1730],[2511,1703]],
  [[1260,1989],[1266,2008],[1256,2021],[1261,2033],[1277,2033],[1272,2043],[1274,2051],[1283,2057],[1298,2051],[1305,2056],[1314,2044],[1311,2034],[1323,2027],[1323,2047],[1333,2051],[1336,2069],[1353,2073],[1353,2085],[1345,2090],[1348,2110],[1343,2118],[1331,2120],[1338,2139],[1331,2141],[1332,2133],[1319,2127],[1322,2125],[1307,2126],[1289,2110],[1277,2113],[1280,2117],[1272,2115],[1283,2106],[1275,2106],[1278,2100],[1268,2102],[1270,2098],[1246,2107],[1244,2103],[1234,2112],[1223,2104],[1217,2114],[1214,2108],[1210,2114],[1214,2107],[1208,2102],[1203,2117],[1188,2125],[1183,2124],[1184,2120],[1174,2123],[1172,2112],[1150,2101],[1127,2126],[1122,2120],[1130,2120],[1129,2100],[1120,2091],[1132,2073],[1121,2060],[1127,2046],[1131,2050],[1149,2045],[1146,2039],[1132,2041],[1139,2032],[1147,2037],[1166,2036],[1170,2044],[1177,2040],[1180,2045],[1181,2041],[1195,2042],[1200,2036],[1213,2035],[1210,2029],[1221,2024],[1220,2017],[1234,2010],[1237,2001],[1245,1999],[1245,1993],[1253,1996],[1260,1989]],
  [[1347,2137],[1341,2125],[1348,2117],[1360,2119],[1367,2129],[1391,2120],[1374,2127],[1374,2136],[1367,2136],[1368,2132],[1360,2129],[1359,2134],[1347,2137]],
  [[2704,1400],[2716,1404],[2726,1400],[2737,1405],[2739,1413],[2753,1409],[2773,1415],[2773,1429],[2780,1434],[2801,1432],[2801,1415],[2808,1413],[2823,1427],[2833,1488],[2830,1532],[2820,1580],[2795,1591],[2789,1600],[2761,1591],[2754,1585],[2757,1597],[2735,1612],[2698,1584],[2699,1570],[2692,1570],[2680,1555],[2641,1547],[2629,1551],[2627,1559],[2602,1564],[2566,1580],[2555,1590],[2528,1586],[2532,1545],[2517,1532],[2528,1513],[2522,1501],[2525,1495],[2556,1492],[2561,1482],[2587,1483],[2581,1458],[2595,1451],[2600,1439],[2614,1428],[2604,1423],[2608,1421],[2625,1431],[2647,1426],[2656,1439],[2666,1435],[2677,1443],[2697,1441],[2708,1430],[2702,1425],[2704,1400]],
  [[2167,1491],[2199,1479],[2211,1482],[2213,1493],[2196,1497],[2193,1507],[2198,1514],[2192,1521],[2178,1519],[2154,1542],[2144,1536],[2147,1532],[2140,1533],[2131,1548],[2136,1550],[2129,1561],[2142,1559],[2148,1566],[2162,1555],[2162,1580],[2135,1588],[2127,1618],[2117,1625],[2123,1633],[2116,1643],[2122,1654],[2114,1678],[2120,1689],[2118,1700],[2128,1709],[2113,1724],[2111,1738],[2098,1741],[2077,1725],[2059,1729],[2053,1722],[2042,1722],[2040,1712],[2026,1700],[2055,1678],[2081,1648],[2111,1601],[2114,1574],[2106,1564],[2107,1550],[2097,1548],[2108,1523],[2106,1516],[2126,1503],[2140,1504],[2167,1491]],
  [[2144,1558],[2136,1547],[2140,1551],[2147,1547],[2154,1550],[2159,1544],[2162,1547],[2159,1553],[2144,1558]],
  [[2026,1700],[2040,1712],[2045,1724],[2053,1722],[2061,1729],[2077,1725],[2096,1741],[2111,1738],[2107,1754],[2118,1763],[2124,1780],[2117,1789],[2073,1791],[2070,1798],[2048,1790],[2040,1793],[2032,1814],[2010,1807],[2013,1831],[2004,1828],[2002,1837],[1989,1837],[1986,1844],[1974,1839],[1966,1860],[1953,1858],[1946,1868],[1905,1864],[1905,1857],[1894,1848],[1895,1834],[1898,1832],[1897,1839],[1903,1834],[1902,1842],[1906,1845],[1928,1834],[1922,1845],[1914,1844],[1937,1846],[1945,1836],[1937,1839],[1932,1834],[1936,1830],[1951,1838],[1957,1836],[1951,1830],[1957,1831],[1960,1826],[1953,1817],[1962,1823],[1981,1819],[1977,1803],[1987,1795],[1992,1806],[1989,1810],[1997,1814],[2001,1793],[1984,1773],[1977,1756],[2003,1717],[2006,1719],[2005,1709],[2026,1700]],
  [[1473,2077],[1470,2074],[1479,2066],[1474,2064],[1484,2058],[1490,2072],[1473,2077]],
  [[1401,2176],[1423,2163],[1430,2154],[1430,2132],[1438,2127],[1440,2111],[1467,2099],[1468,2092],[1462,2090],[1470,2086],[1500,2124],[1534,2112],[1566,2116],[1581,2103],[1595,2110],[1596,2126],[1591,2132],[1573,2132],[1564,2142],[1527,2141],[1520,2150],[1512,2148],[1500,2172],[1493,2173],[1488,2187],[1491,2193],[1483,2204],[1447,2208],[1463,2232],[1445,2241],[1442,2253],[1429,2265],[1416,2258],[1428,2295],[1422,2303],[1412,2305],[1413,2299],[1398,2299],[1395,2305],[1400,2305],[1394,2308],[1389,2301],[1396,2298],[1391,2295],[1395,2292],[1395,2296],[1405,2297],[1398,2294],[1393,2281],[1381,2280],[1381,2285],[1375,2286],[1381,2277],[1393,2280],[1387,2268],[1396,2267],[1386,2265],[1384,2260],[1390,2259],[1380,2253],[1389,2252],[1393,2260],[1398,2259],[1394,2255],[1398,2252],[1406,2250],[1399,2246],[1403,2241],[1391,2244],[1400,2234],[1374,2233],[1382,2226],[1382,2221],[1376,2225],[1375,2221],[1382,2210],[1376,2211],[1382,2207],[1371,2203],[1365,2209],[1362,2205],[1337,2223],[1329,2225],[1332,2221],[1328,2221],[1314,2228],[1332,2215],[1339,2216],[1338,2211],[1355,2209],[1355,2205],[1382,2193],[1401,2176]],
  [[1936,1971],[1943,1981],[1959,1985],[1966,1984],[1972,1975],[1987,1984],[1994,1979],[1999,1990],[1991,1992],[1997,1997],[1993,2007],[2004,2013],[2011,2011],[2013,2018],[2021,2017],[2023,2023],[2019,2031],[2001,2033],[1996,2041],[2006,2054],[2001,2057],[2007,2066],[2000,2076],[2002,2106],[1988,2105],[1982,2112],[1972,2114],[1967,2120],[1969,2126],[1962,2125],[1963,2136],[1952,2128],[1920,2134],[1917,2127],[1923,2113],[1907,2098],[1925,2072],[1939,2070],[1930,2061],[1926,2042],[1932,2030],[1926,2014],[1931,2006],[1926,2002],[1936,1971]],
  [[1522,1724],[1521,1719],[1511,1715],[1510,1702],[1527,1691],[1545,1705],[1542,1716],[1537,1718],[1538,1713],[1531,1717],[1537,1723],[1527,1720],[1522,1724]],
  [[1480,1746],[1471,1742],[1476,1733],[1495,1728],[1487,1734],[1487,1742],[1481,1734],[1476,1737],[1480,1746]],
  [[1491,1747],[1491,1735],[1502,1733],[1500,1738],[1506,1740],[1496,1740],[1491,1747]],
  [[1521,1834],[1513,1838],[1534,1859],[1529,1875],[1532,1884],[1506,1893],[1513,1902],[1505,1907],[1504,1919],[1458,1914],[1437,1939],[1418,1949],[1430,1953],[1429,1960],[1415,1960],[1402,1969],[1385,1964],[1378,1972],[1352,1967],[1349,1977],[1334,1984],[1339,1989],[1333,2007],[1320,2018],[1323,2027],[1311,2034],[1314,2044],[1305,2056],[1298,2051],[1281,2057],[1272,2046],[1277,2033],[1261,2033],[1256,2021],[1266,2008],[1260,1989],[1286,1984],[1313,1956],[1321,1955],[1331,1941],[1364,1922],[1382,1898],[1417,1881],[1425,1865],[1418,1854],[1438,1852],[1434,1848],[1457,1840],[1474,1840],[1475,1835],[1496,1829],[1495,1824],[1505,1832],[1531,1829],[1521,1834]],
  [[2923,971],[2924,965],[2940,957],[2963,989],[2966,998],[2959,1003],[2973,1012],[2965,1022],[2986,1040],[2984,1052],[2994,1078],[2985,1111],[2998,1099],[2998,1113],[3006,1118],[2995,1131],[2986,1133],[2990,1138],[3004,1132],[3001,1140],[2990,1140],[2983,1147],[2987,1152],[2977,1156],[2993,1154],[2989,1160],[2975,1162],[2982,1169],[2975,1167],[2975,1172],[2989,1172],[2972,1179],[2981,1184],[2966,1190],[2981,1198],[2974,1201],[2962,1196],[2964,1203],[2973,1205],[2962,1206],[2969,1211],[2949,1213],[2948,1204],[2945,1212],[2951,1217],[2945,1217],[2943,1222],[2948,1225],[2944,1227],[2938,1215],[2931,1216],[2932,1222],[2908,1217],[2908,1232],[2901,1239],[2899,1255],[2895,1258],[2878,1248],[2862,1261],[2843,1248],[2849,1238],[2823,1239],[2796,1223],[2787,1224],[2786,1217],[2794,1206],[2784,1201],[2783,1191],[2793,1184],[2786,1181],[2790,1174],[2774,1163],[2777,1157],[2768,1142],[2779,1130],[2780,1115],[2796,1100],[2788,1085],[2800,1074],[2790,1069],[2789,1062],[2805,1060],[2799,1024],[2805,1018],[2802,1006],[2808,999],[2818,993],[2830,998],[2879,971],[2884,978],[2900,970],[2916,975],[2923,971]],
  [[1710,1822],[1719,1831],[1717,1840],[1722,1853],[1729,1856],[1728,1864],[1734,1869],[1735,1883],[1726,1890],[1714,1887],[1702,1896],[1692,1895],[1677,1902],[1672,1882],[1650,1877],[1651,1869],[1637,1872],[1620,1888],[1605,1875],[1580,1870],[1574,1888],[1565,1891],[1568,1899],[1547,1900],[1548,1912],[1530,1914],[1525,1922],[1503,1920],[1505,1907],[1513,1902],[1506,1893],[1532,1884],[1529,1875],[1534,1859],[1517,1846],[1513,1838],[1516,1834],[1525,1833],[1521,1836],[1524,1843],[1546,1851],[1575,1837],[1610,1842],[1649,1836],[1661,1839],[1690,1833],[1710,1822]],
  [[1722,2074],[1746,2068],[1746,2075],[1756,2079],[1747,2109],[1750,2114],[1755,2109],[1767,2124],[1754,2137],[1774,2141],[1715,2173],[1709,2185],[1704,2185],[1709,2186],[1700,2187],[1701,2192],[1681,2189],[1673,2177],[1679,2174],[1677,2168],[1658,2166],[1654,2142],[1641,2141],[1634,2148],[1621,2139],[1606,2140],[1592,2134],[1596,2126],[1594,2109],[1611,2097],[1638,2090],[1648,2098],[1657,2090],[1669,2090],[1677,2079],[1707,2078],[1717,2083],[1722,2074]],
  [[1002,2453],[991,2437],[996,2433],[993,2430],[1002,2434],[1000,2430],[1005,2428],[1011,2441],[1002,2453]],
  [[1075,2436],[1097,2451],[1094,2458],[1106,2466],[1110,2478],[1129,2489],[1123,2502],[1141,2508],[1153,2534],[1157,2530],[1165,2536],[1171,2533],[1178,2544],[1171,2565],[1162,2563],[1147,2578],[1146,2584],[1162,2588],[1157,2599],[1165,2599],[1146,2607],[1137,2623],[1101,2637],[1087,2649],[1089,2638],[1085,2635],[1101,2623],[1110,2587],[1093,2565],[1093,2548],[1082,2550],[1075,2543],[1089,2535],[1096,2540],[1094,2548],[1104,2547],[1114,2530],[1109,2522],[1091,2516],[1081,2520],[1062,2559],[1071,2592],[1088,2600],[1083,2614],[1074,2620],[1063,2618],[1053,2603],[1011,2603],[1014,2598],[1009,2595],[1013,2592],[1005,2590],[1011,2586],[993,2574],[1002,2569],[1013,2576],[1021,2571],[1031,2548],[1028,2530],[1018,2517],[1007,2514],[1003,2506],[1013,2485],[1009,2471],[1005,2470],[1010,2458],[1005,2450],[1013,2446],[1027,2449],[1036,2439],[1052,2449],[1073,2441],[1075,2436]],
  [[954,2504],[949,2496],[953,2494],[945,2497],[948,2490],[960,2497],[960,2492],[964,2493],[963,2501],[954,2504]],
  [[1135,2713],[1134,2707],[1153,2677],[1157,2686],[1153,2718],[1137,2741],[1138,2760],[1122,2765],[1118,2743],[1132,2729],[1135,2713]],
  [[1063,2786],[1049,2784],[1039,2760],[1059,2743],[1088,2760],[1085,2774],[1063,2786]],
  [[916,3107],[916,3101],[920,3106],[916,3095],[921,3090],[928,3099],[926,3109],[910,3113],[899,3129],[885,3131],[882,3140],[876,3140],[887,3147],[875,3150],[875,3157],[864,3154],[871,3165],[857,3158],[855,3149],[851,3152],[856,3145],[850,3143],[849,3148],[830,3139],[853,3138],[856,3134],[849,3135],[843,3130],[864,3119],[874,3121],[874,3116],[883,3116],[885,3111],[891,3116],[899,3102],[912,3099],[906,3110],[911,3104],[912,3110],[916,3107]],
  [[861,3173],[861,3167],[855,3173],[850,3165],[844,3171],[844,3160],[837,3151],[847,3150],[841,3152],[847,3157],[852,3155],[848,3163],[853,3159],[851,3164],[865,3164],[861,3173]],
  [[791,3229],[789,3206],[802,3204],[802,3217],[813,3225],[811,3235],[805,3243],[797,3245],[787,3234],[791,3229]],
  [[736,3292],[759,3286],[734,3305],[726,3297],[729,3291],[736,3292]],
  [[2581,1296],[2611,1306],[2608,1325],[2632,1334],[2640,1346],[2621,1361],[2609,1358],[2604,1365],[2606,1385],[2599,1389],[2594,1410],[2600,1420],[2614,1428],[2600,1439],[2595,1451],[2581,1458],[2587,1483],[2561,1482],[2556,1492],[2527,1494],[2522,1501],[2528,1513],[2517,1532],[2532,1545],[2530,1585],[2519,1581],[2505,1564],[2497,1577],[2483,1578],[2486,1594],[2476,1595],[2477,1604],[2459,1607],[2459,1617],[2443,1617],[2439,1621],[2433,1614],[2437,1600],[2420,1590],[2416,1571],[2407,1569],[2387,1575],[2379,1588],[2371,1590],[2370,1602],[2357,1598],[2340,1601],[2330,1610],[2321,1605],[2326,1596],[2323,1591],[2299,1589],[2300,1598],[2281,1616],[2272,1584],[2260,1578],[2306,1564],[2338,1543],[2357,1544],[2364,1537],[2363,1542],[2414,1507],[2425,1488],[2447,1466],[2462,1429],[2501,1404],[2528,1396],[2552,1376],[2565,1353],[2566,1325],[2581,1296]],
  [[2362,1431],[2356,1426],[2367,1422],[2369,1410],[2379,1402],[2372,1394],[2364,1402],[2359,1399],[2362,1380],[2376,1360],[2395,1348],[2398,1338],[2408,1336],[2394,1380],[2402,1384],[2415,1380],[2413,1394],[2400,1414],[2362,1431]],
  [[1578,2135],[1589,2132],[1606,2140],[1621,2139],[1634,2148],[1641,2141],[1654,2142],[1658,2166],[1677,2168],[1679,2174],[1673,2177],[1681,2189],[1700,2191],[1683,2219],[1678,2246],[1637,2203],[1603,2194],[1575,2200],[1574,2191],[1572,2197],[1577,2201],[1539,2215],[1557,2215],[1538,2219],[1533,2226],[1529,2217],[1519,2232],[1524,2234],[1520,2237],[1524,2244],[1515,2257],[1517,2263],[1509,2263],[1496,2286],[1482,2287],[1482,2311],[1471,2316],[1483,2339],[1474,2338],[1475,2330],[1469,2328],[1458,2332],[1457,2327],[1447,2335],[1431,2326],[1417,2332],[1422,2316],[1433,2311],[1431,2303],[1422,2303],[1428,2295],[1416,2258],[1429,2265],[1442,2253],[1445,2241],[1463,2232],[1447,2208],[1483,2204],[1491,2193],[1488,2187],[1493,2173],[1500,2172],[1512,2148],[1520,2150],[1527,2141],[1564,2142],[1571,2133],[1578,2135]],
  [[1229,2330],[1263,2331],[1273,2319],[1288,2322],[1286,2337],[1292,2335],[1287,2345],[1274,2348],[1270,2361],[1260,2367],[1259,2378],[1264,2376],[1266,2381],[1254,2382],[1251,2390],[1257,2388],[1254,2392],[1259,2393],[1252,2396],[1242,2417],[1222,2484],[1220,2501],[1226,2507],[1219,2526],[1223,2532],[1208,2548],[1209,2561],[1200,2583],[1196,2578],[1187,2580],[1184,2571],[1171,2565],[1177,2556],[1175,2536],[1157,2530],[1153,2534],[1141,2508],[1123,2502],[1129,2489],[1110,2478],[1106,2466],[1094,2455],[1099,2449],[1139,2447],[1146,2438],[1162,2440],[1151,2424],[1162,2410],[1147,2390],[1147,2371],[1152,2364],[1162,2365],[1163,2354],[1183,2336],[1188,2321],[1201,2320],[1205,2325],[1223,2319],[1231,2326],[1229,2330]],
  [[2511,1812],[2532,1824],[2556,1828],[2568,1842],[2569,1829],[2574,1829],[2565,1823],[2573,1824],[2577,1817],[2601,1827],[2607,1836],[2622,1838],[2595,1849],[2605,1854],[2594,1861],[2600,1865],[2600,1871],[2594,1873],[2600,1873],[2596,1879],[2615,1887],[2600,1899],[2603,1907],[2592,1907],[2590,1897],[2595,1894],[2585,1880],[2563,1875],[2531,1880],[2514,1889],[2516,1907],[2494,1905],[2485,1890],[2492,1873],[2489,1861],[2475,1859],[2478,1852],[2508,1836],[2511,1812]],
];
const KUNI_LINES = [
  [[1170,2562],[1176,2555],[1176,2545]],
  [[1176,2545],[1174,2534],[1168,2534]],
  [[1148,2527],[1148,2521],[1142,2510]],
  [[1073,2525],[1055,2517],[1057,2510]],
  [[1142,2510],[1140,2506],[1121,2502],[1123,2495]],
  [[1123,2495],[1127,2487],[1119,2485],[1109,2476]],
  [[1061,2495],[1063,2482],[1073,2476]],
  [[1107,2476],[1107,2470],[1101,2461],[1081,2472]],
  [[1095,2457],[1093,2452],[1097,2448],[1093,2448],[1081,2437]],
  [[1097,2448],[1140,2446],[1144,2437],[1160,2439],[1160,2435]],
  [[1059,2444],[1071,2442],[1073,2435]],
  [[1158,2435],[1150,2424],[1160,2412],[1158,2403]],
  [[1156,2403],[1152,2394],[1146,2390],[1148,2366]],
  [[1148,2366],[1150,2362],[1162,2362],[1162,2351],[1168,2349],[1178,2336]],
  [[1178,2336],[1182,2336],[1188,2319],[1202,2319],[1204,2324],[1208,2324]],
  [[1287,2334],[1289,2321],[1275,2317],[1271,2317],[1263,2330],[1230,2330],[1232,2324],[1228,2324],[1224,2317],[1208,2324]],
  [[1196,2319],[1186,2311],[1186,2300]],
  [[1422,2300],[1426,2296],[1426,2287],[1418,2268]],
  [[1186,2300],[1184,2287],[1170,2272],[1170,2268]],
  [[1045,2289],[1061,2289],[1061,2278],[1073,2268]],
  [[1140,2285],[1144,2285],[1148,2276],[1146,2268]],
  [[1140,2285],[1115,2272],[1117,2268]],
  [[1130,2268],[1134,2268],[1140,2261],[1146,2268]],
  [[1087,2268],[1089,2259],[1103,2263]],
  [[1117,2268],[1123,2257],[1117,2248],[1113,2248],[1119,2242],[1117,2233]],
  [[1418,2268],[1416,2257],[1430,2263],[1442,2251],[1444,2240],[1456,2233]],
  [[1037,2263],[1033,2251],[1045,2238],[1053,2238],[1053,2233]],
  [[1142,2261],[1144,2257],[1148,2257]],
  [[1152,2255],[1154,2251],[1162,2248],[1180,2233]],
  [[1053,2233],[1055,2229],[1065,2227],[1065,2212],[1043,2218],[1023,2203],[982,2205]],
  [[1180,2233],[1190,2227],[1208,2227]],
  [[1456,2233],[1460,2233],[1460,2227],[1456,2225],[1446,2205],[1463,2205]],
  [[1117,2233],[1111,2225],[1085,2220],[1081,2216]],
  [[1208,2227],[1218,2225],[1238,2201]],
  [[1111,2201],[1113,2188],[1107,2184],[1107,2165]],
  [[1483,2201],[1489,2195],[1487,2184],[1491,2173],[1499,2171],[1501,2165]],
  [[1695,2190],[1680,2188],[1680,2184],[1674,2178],[1680,2173],[1678,2167],[1666,2165]],
  [[1501,2165],[1509,2150],[1521,2148],[1523,2141],[1563,2141],[1567,2135]],
  [[1658,2165],[1654,2141],[1640,2139],[1636,2145],[1630,2145],[1622,2137],[1604,2139],[1600,2135]],
  [[1107,2165],[1107,2152],[1083,2139],[1083,2135]],
  [[1596,2135],[1592,2130],[1586,2130]],
  [[1959,2135],[1955,2128],[1919,2132],[1917,2124],[1923,2111],[1909,2098]],
  [[1592,2130],[1596,2126],[1594,2107],[1586,2102]],
  [[1967,2124],[1973,2113],[1985,2109]],
  [[1987,2107],[2003,2105],[2003,2098]],
  [[1907,2098],[1907,2094],[1913,2090],[1913,2085],[1925,2070],[1939,2068]],
  [[2013,2098],[2007,2094],[2001,2094],[2003,2098]],
  [[1646,2096],[1654,2090],[1668,2090],[1674,2079],[1715,2079]],
  [[1646,2096],[1640,2090],[1622,2092]],
  [[2001,2094],[2001,2072],[2005,2068]],
  [[1206,2092],[1188,2077],[1192,2068]],
  [[1715,2081],[1719,2079],[1721,2072]],
  [[1337,2068],[1335,2051],[1331,2049]],
  [[1937,2068],[1935,2064],[1929,2062],[1925,2042]],
  [[1192,2068],[1196,2062],[1208,2059]],
  [[2005,2068],[2007,2064],[2001,2057],[2005,2055],[2005,2049],[1999,2044],[1997,2038],[2001,2032],[2013,2029]],
  [[1208,2059],[1251,2051],[1255,2044],[1259,2044],[1265,2036],[1271,2034],[1259,2029]],
  [[1442,2059],[1442,2042],[1446,2029]],
  [[1279,2055],[1287,2055],[1293,2051],[1301,2051],[1303,2055],[1307,2055],[1309,2049],[1315,2044],[1313,2032],[1317,2029]],
  [[1279,2055],[1271,2044],[1275,2038],[1275,2032],[1271,2032]],
  [[1327,2049],[1323,2040],[1323,2029]],
  [[2088,2047],[2088,2042],[2094,2036],[2098,2036],[2100,2029]],
  [[1317,2029],[1321,2027],[1323,2029]],
  [[1446,2029],[1456,2019],[1463,2017]],
  [[2013,2029],[2022,2029],[2024,2019],[2042,2012],[2050,2002]],
  [[1259,2029],[1255,2019],[1265,2008],[1263,2002]],
  [[1323,2027],[1325,2025],[1321,2021],[1321,2014],[1325,2014],[1331,2008]],
  [[1931,2029],[1925,2014],[1925,2010],[1929,2008],[1927,2002]],
  [[1557,2025],[1557,2012],[1549,2006],[1549,2002]],
  [[2024,2019],[2013,2017],[2011,2010],[2003,2012],[1995,2008],[1995,2002]],
  [[1547,2002],[1545,1997],[1549,1989],[1541,1980],[1545,1967],[1543,1963]],
  [[1616,2002],[1636,1982],[1636,1976],[1632,1974],[1628,1963]],
  [[1894,2002],[1907,2002],[1913,1995],[1913,1991],[1917,1989],[1913,1974],[1933,1974],[1929,1993],[1925,1997],[1927,2002]],
  [[1335,2002],[1339,1993],[1339,1986],[1335,1982],[1347,1978],[1354,1967],[1380,1971],[1386,1963]],
  [[1995,2002],[1997,1995],[1993,1991],[1999,1989],[1995,1978],[1985,1982],[1971,1974],[1967,1982]],
  [[2050,2002],[2052,1995],[2044,1963]],
  [[1820,1995],[1818,1991],[1806,1984],[1785,1980]],
  [[1701,1980],[1701,1967],[1695,1963]],
  [[1991,1978],[1987,1969],[1999,1963]],
  [[1396,1967],[1406,1967],[1408,1963]],
  [[1408,1963],[1416,1959],[1430,1959],[1428,1952],[1422,1950],[1422,1946],[1438,1939],[1442,1933]],
  [[1473,1963],[1473,1939],[1469,1933]],
  [[1541,1963],[1531,1950],[1533,1933]],
  [[1626,1963],[1618,1946],[1644,1946],[1668,1933]],
  [[1691,1963],[1691,1952],[1697,1948],[1691,1944],[1695,1933]],
  [[1842,1963],[1846,1961],[1848,1950],[1838,1946]],
  [[1939,1963],[1937,1956],[1929,1950],[1929,1946],[1919,1944],[1921,1939],[1919,1941]],
  [[1999,1963],[2003,1959],[2003,1954],[1999,1954],[2001,1948],[2024,1956],[2040,1950],[2044,1963]],
  [[2235,1963],[2258,1952],[2270,1939],[2272,1933]],
  [[1985,1963],[1985,1959],[1975,1959],[1973,1952],[1967,1954]],
  [[1430,1956],[1430,1952],[1426,1950]],
  [[1965,1954],[1961,1950],[1963,1939],[1959,1935]],
  [[1848,1950],[1880,1941],[1876,1933]],
  [[2040,1950],[2046,1948],[2052,1933]],
  [[1618,1946],[1614,1939],[1586,1937]],
  [[1836,1946],[1834,1941],[1828,1939],[1828,1933]],
  [[1907,1946],[1913,1946],[1911,1937],[1923,1939],[1929,1933]],
  [[1907,1946],[1898,1941],[1900,1933]],
  [[2122,1939],[2126,1937],[2126,1933]],
  [[2449,1937],[2459,1937],[2464,1933]],
  [[1442,1933],[1458,1914],[1463,1914]],
  [[1533,1933],[1535,1929],[1527,1920],[1475,1916]],
  [[1668,1933],[1689,1929],[1695,1929],[1695,1933]],
  [[1826,1933],[1826,1922],[1820,1916],[1814,1901],[1755,1905],[1745,1896]],
  [[1894,1933],[1880,1929],[1880,1922]],
  [[2126,1933],[2131,1929],[2175,1916],[2193,1896]],
  [[2340,1933],[2375,1931],[2383,1914],[2383,1896]],
  [[1876,1933],[1874,1924],[1878,1922]],
  [[1929,1933],[1929,1926],[1917,1914],[1917,1896]],
  [[2052,1933],[2058,1922],[2060,1909],[2060,1901],[2052,1896]],
  [[2272,1933],[2272,1924],[2286,1914],[2290,1896]],
  [[1693,1929],[1701,1924],[1707,1907],[1715,1905]],
  [[1955,1929],[1953,1914],[1957,1896]],
  [[2114,1926],[2112,1918],[2100,1905],[2088,1901]],
  [[1503,1918],[1503,1907],[1511,1903],[1509,1896]],
  [[2472,1914],[2470,1907],[2474,1907]],
  [[1535,1911],[1549,1911],[1547,1898],[1569,1896]],
  [[2474,1907],[2488,1903],[2508,1905]],
  [[2397,1901],[2405,1901],[2407,1896]],
  [[1507,1896],[1505,1894],[1507,1890],[1531,1883],[1529,1866]],
  [[1567,1896],[1565,1890],[1576,1888],[1580,1871],[1586,1871]],
  [[1814,1896],[1818,1894],[1822,1883],[1806,1877],[1806,1866]],
  [[2082,1896],[2076,1886],[2056,1890],[2052,1896]],
  [[2250,1896],[2264,1890],[2290,1896]],
  [[2250,1896],[2244,1888],[2244,1881]],
  [[2488,1896],[2484,1888],[2492,1873],[2490,1866]],
  [[1674,1896],[1670,1881],[1648,1877],[1650,1868],[1634,1873],[1624,1886],[1616,1886],[1604,1873],[1586,1871]],
  [[1691,1894],[1705,1894],[1711,1888],[1715,1888]],
  [[2098,1896],[2100,1886],[2114,1866]],
  [[2193,1896],[2199,1881],[2183,1886],[2177,1879],[2165,1879],[2161,1866]],
  [[2290,1894],[2300,1892],[2304,1886]],
  [[2383,1896],[2383,1879],[2387,1890]],
  [[2054,1892],[2048,1890],[2052,1866]],
  [[2219,1890],[2217,1886],[2205,1879],[2199,1881]],
  [[1717,1888],[1729,1888],[1735,1883],[1735,1866]],
  [[1959,1888],[1959,1881],[1953,1881],[1945,1871],[1947,1866]],
  [[2244,1879],[2248,1873],[2254,1871],[2252,1866]],
  [[2383,1879],[2383,1875],[2369,1877],[2363,1871],[2363,1866]],
  [[1658,1877],[1660,1875],[1658,1866]],
  [[1529,1866],[1533,1858],[1519,1849],[1513,1841],[1513,1834],[1525,1832]],
  [[1731,1866],[1729,1853],[1725,1853],[1719,1843],[1721,1830]],
  [[1806,1866],[1806,1860],[1818,1862],[1826,1858],[1826,1838],[1824,1834],[1804,1838],[1798,1830]],
  [[1925,1866],[1904,1864],[1902,1853],[1892,1853],[1872,1864],[1852,1858],[1838,1862]],
  [[1947,1866],[1953,1858],[1967,1858]],
  [[2052,1866],[2058,1862],[2052,1847],[2048,1845],[2052,1838],[2048,1832],[2038,1834],[2038,1830]],
  [[2126,1866],[2145,1858],[2161,1866]],
  [[2340,1866],[2344,1866],[2342,1849],[2348,1847],[2346,1830]],
  [[2361,1866],[2367,1845],[2365,1830]],
  [[2435,1866],[2433,1860],[2423,1860],[2421,1851],[2413,1853],[2407,1866]],
  [[2252,1866],[2250,1860],[2258,1860],[2252,1853],[2258,1847],[2258,1838],[2252,1836],[2248,1830]],
  [[2490,1866],[2488,1860],[2482,1860]],
  [[2589,1862],[2570,1851],[2566,1836],[2560,1830]],
  [[1967,1858],[1975,1838],[1987,1843],[1989,1836],[2003,1836],[2003,1830]],
  [[2476,1858],[2478,1849],[2506,1836],[2508,1830]],
  [[1898,1853],[1892,1847],[1892,1834],[1898,1832]],
  [[2007,1830],[2013,1830],[2011,1808],[2026,1810],[2034,1819]],
  [[2007,1830],[2007,1828],[2003,1830]],
  [[2246,1830],[2244,1825],[2237,1823],[2244,1817],[2244,1813],[2235,1806],[2233,1800]],
  [[2346,1830],[2355,1828],[2357,1819],[2361,1819],[2365,1830]],
  [[2558,1830],[2556,1825],[2540,1825],[2530,1823],[2526,1819]],
  [[2712,1830],[2702,1825],[2675,1825]],
  [[1997,1830],[1983,1810],[1983,1806],[1977,1802]],
  [[2508,1830],[2510,1810],[2516,1813]],
  [[2359,1819],[2359,1813],[2353,1806],[2355,1800]],
  [[2635,1817],[2643,1810],[2645,1806],[2643,1800]],
  [[2030,1813],[2034,1813],[2038,1800]],
  [[2510,1810],[2500,1804],[2494,1804],[2492,1800]],
  [[2197,1800],[2185,1787],[2185,1783],[2173,1772],[2126,1765],[2120,1765],[2124,1780],[2118,1789],[2088,1789]],
  [[2231,1800],[2229,1795],[2221,1798]],
  [[2355,1800],[2361,1798],[2361,1793],[2355,1791],[2355,1785],[2361,1778],[2361,1774],[2369,1778],[2381,1761]],
  [[2490,1800],[2480,1778],[2474,1780]],
  [[2038,1800],[2040,1793],[2046,1789],[2068,1798],[2074,1789],[2088,1789]],
  [[2643,1800],[2639,1785],[2639,1768],[2635,1765],[2635,1761]],
  [[2797,1798],[2778,1783],[2774,1783],[2772,1778],[2768,1778],[2766,1774],[2762,1774],[2760,1770],[2756,1770],[2754,1765],[2750,1765],[2748,1761]],
  [[2217,1791],[2213,1787],[2207,1787],[2207,1783],[2215,1772],[2221,1772]],
  [[2468,1780],[2447,1770],[2437,1772]],
  [[2425,1776],[2421,1768],[2409,1768]],
  [[2221,1772],[2231,1772],[2240,1761]],
  [[2738,1768],[2742,1768],[2742,1761]],
  [[2738,1768],[2728,1765],[2726,1761]],
  [[2116,1761],[2114,1757],[2108,1755],[2112,1737],[2096,1740],[2090,1733]],
  [[2240,1761],[2252,1750],[2256,1740],[2248,1733]],
  [[2724,1761],[2710,1744],[2655,1746],[2653,1733]],
  [[2441,1761],[2439,1755],[2445,1746],[2459,1746],[2474,1735]],
  [[2439,1755],[2427,1748],[2429,1733]],
  [[2244,1733],[2246,1727],[2252,1722],[2248,1712],[2262,1699],[2260,1695]],
  [[2476,1733],[2482,1729],[2496,1729],[2510,1701],[2536,1710],[2552,1707],[2558,1714],[2573,1718]],
  [[2611,1733],[2607,1716],[2593,1716]],
  [[2084,1731],[2080,1725],[2060,1727],[2058,1722],[2052,1722]],
  [[2112,1733],[2114,1722],[2129,1710],[2118,1699],[2120,1695]],
  [[2429,1733],[2429,1729],[2423,1727],[2421,1722],[2429,1720],[2423,1701],[2431,1699],[2431,1695]],
  [[2653,1733],[2651,1716],[2655,1714],[2655,1695]],
  [[2044,1720],[2042,1710],[2038,1710],[2034,1703],[2026,1699]],
  [[2601,1716],[2601,1710],[2593,1703]],
  [[2605,1716],[2627,1710],[2631,1697],[2641,1699],[2643,1695]],
  [[2147,1703],[2151,1703],[2157,1695]],
  [[2126,1695],[2129,1690],[2143,1690],[2145,1695]],
  [[2258,1695],[2258,1690],[2252,1684]],
  [[2643,1695],[2651,1684],[2657,1684],[2655,1695]],
  [[2120,1695],[2120,1684],[2114,1677],[2116,1673]],
  [[2431,1695],[2431,1680],[2397,1680],[2389,1675],[2389,1664]],
  [[2560,1695],[2552,1686],[2552,1680],[2562,1671],[2562,1664]],
  [[2161,1692],[2179,1671],[2185,1675],[2193,1675],[2197,1671],[2203,1671],[2203,1675],[2211,1675],[2217,1671],[2221,1675]],
  [[2252,1682],[2258,1677],[2264,1664]],
  [[2684,1680],[2690,1680],[2696,1664]],
  [[2118,1664],[2122,1658],[2122,1649],[2118,1645],[2122,1628]],
  [[2264,1664],[2266,1660],[2272,1660],[2270,1652],[2280,1647],[2282,1628]],
  [[2696,1664],[2700,1662],[2700,1654],[2694,1628]],
  [[2389,1664],[2389,1658],[2399,1641]],
  [[2562,1664],[2560,1660],[2568,1654],[2570,1647],[2548,1641],[2548,1628]],
  [[2405,1637],[2411,1637],[2409,1628]],
  [[2120,1628],[2120,1622],[2100,1615]],
  [[2409,1628],[2427,1622],[2437,1622],[2445,1615]],
  [[2548,1628],[2552,1622],[2550,1611],[2558,1604],[2548,1598]],
  [[2694,1628],[2706,1626],[2700,1617],[2700,1598]],
  [[2282,1628],[2280,1615],[2284,1615],[2298,1598]],
  [[2120,1622],[2129,1617],[2133,1598]],
  [[2437,1619],[2433,1615],[2435,1598]],
  [[2455,1615],[2459,1615],[2459,1607],[2474,1604]],
  [[2734,1611],[2738,1611],[2740,1607],[2754,1598]],
  [[2326,1609],[2332,1609],[2334,1604],[2340,1602]],
  [[2326,1609],[2320,1604],[2322,1598]],
  [[2474,1604],[2478,1604],[2478,1598]],
  [[2298,1598],[2300,1589],[2322,1589],[2324,1591],[2322,1598]],
  [[2433,1598],[2419,1589],[2417,1574],[2413,1570]],
  [[2548,1598],[2554,1594],[2554,1589],[2536,1587]],
  [[2716,1598],[2702,1585],[2700,1598]],
  [[2754,1598],[2758,1596],[2756,1587],[2766,1594],[2788,1598]],
  [[2133,1598],[2139,1585],[2159,1581]],
  [[2276,1598],[2272,1583],[2260,1576]],
  [[2371,1598],[2371,1591],[2375,1587],[2381,1587],[2387,1574],[2411,1568]],
  [[2478,1598],[2478,1594],[2486,1594],[2484,1576],[2498,1576],[2504,1566],[2508,1566],[2518,1581],[2534,1585]],
  [[2554,1589],[2560,1587],[2566,1579],[2585,1572]],
  [[2700,1585],[2698,1568],[2692,1570],[2686,1561]],
  [[2526,1583],[2530,1583],[2532,1561]],
  [[2684,1561],[2681,1555],[2677,1553],[2647,1546],[2629,1549],[2629,1557],[2619,1559]],
  [[2532,1561],[2532,1542],[2524,1538],[2520,1531]],
  [[2518,1531],[2524,1518],[2528,1516],[2528,1508],[2524,1503],[2526,1493]],
  [[2548,1491],[2558,1491],[2560,1482],[2589,1482],[2585,1465]],
  [[2585,1465],[2583,1456],[2593,1452]],
  [[2593,1452],[2597,1450],[2601,1437],[2615,1426]],
  [[2675,1441],[2698,1439],[2706,1430],[2706,1426]],
  [[2675,1441],[2669,1435],[2655,1437],[2649,1426]],
  [[2611,1426],[2605,1420],[2623,1426]],
  [[2635,1426],[2645,1424],[2649,1426]],
  [[2702,1426],[2700,1422],[2704,1396]],
  [[2599,1415],[2595,1409],[2599,1396]],
  [[2599,1396],[2601,1388],[2607,1385],[2605,1375],[2607,1360]],
  [[2704,1396],[2706,1383],[2726,1381]],
  [[2726,1381],[2738,1366],[2738,1360]],
  [[2615,1360],[2625,1360],[2629,1355]],
  [[2738,1360],[2738,1345],[2748,1334],[2748,1330]],
  [[2631,1353],[2637,1347],[2641,1347],[2641,1342],[2635,1338],[2633,1332],[2627,1330]],
  [[2621,1330],[2609,1325],[2611,1304],[2593,1300]],
  [[2748,1330],[2762,1315],[2754,1306],[2754,1289]],
  [[2752,1289],[2748,1280],[2760,1280],[2760,1265]],
  [[2760,1265],[2766,1257],[2758,1252],[2752,1237],[2770,1235],[2788,1222]],
  [[2786,1222],[2784,1214],[2792,1205],[2782,1201],[2782,1196]],
  [[2782,1196],[2782,1190],[2790,1186],[2790,1181],[2786,1181],[2788,1173],[2774,1164],[2776,1156]],
  [[2768,1145],[2768,1139],[2776,1130]],
  [[2776,1130],[2778,1115],[2795,1100],[2790,1089]],
  [[2788,1089],[2786,1083],[2799,1074],[2790,1070],[2788,1063]],
  [[2788,1063],[2792,1059],[2805,1059],[2799,1031],[2801,1020]],
  [[2801,1020],[2805,1018],[2801,1005],[2805,1003],[2807,997]],
  [[2807,997],[2817,993],[2817,975],[2823,973],[2823,960],[2801,958],[2803,954]],
  [[2746,965],[2754,960],[2760,960],[2764,965],[2782,962],[2792,954]],
  [[2746,965],[2734,958],[2732,954]],
  [[2673,958],[2716,958],[2718,954]],
  [[2718,954],[2722,950],[2726,952]],
  [[2792,954],[2799,952],[2801,947],[2803,954]],
];
const MAP_RIDGES = [
  [[3145,215],[3145,322],[3179,394]],
  [[3095,340],[3145,411],[3195,465]],
  [[3111,483],[3145,555],[3179,626]],
  [[2741,626],[2708,698],[2725,751]],
  [[2817,823],[2800,948],[2783,1073],[2767,1199],[2741,1324],[2716,1431],[2683,1556]],
  [[2708,966],[2666,1073],[2649,1199],[2640,1306]],
  [[2935,1038],[2918,1145],[2910,1234],[2893,1324]],
  [[2800,1449],[2783,1539],[2758,1628]],
  [[2649,1342],[2624,1395],[2603,1440]],
  [[2590,1467],[2540,1556],[2498,1619],[2464,1673]],
  [[2489,1592],[2439,1646],[2397,1691]],
  [[2430,1726],[2464,1762],[2506,1793]],
  [[2254,1601],[2257,1673],[2270,1735],[2257,1789]],
  [[2301,1768],[2307,1821],[2304,1875]],
  [[2368,1768],[2358,1825],[2375,1878]],
  [[2119,1717],[2094,1762],[2069,1803]],
  [[2060,1893],[2052,1932],[2040,1963]],
  [[2128,1780],[2178,1803],[2220,1834]],
  [[1892,1864],[1850,1893],[1808,1914]],
  [[1909,2075],[1951,2093],[1993,2107],[1976,2138]],
  [[1724,1875],[1623,1896],[1522,1929],[1421,1964],[1320,2000],[1228,2036],[1144,2061]],
  [[1690,2125],[1606,2143],[1522,2161],[1455,2183],[1413,2209]],
  [[1068,2209],[1118,2200],[1160,2209]],
  [[1202,2299],[1160,2335],[1127,2388],[1169,2415]],
];
const KUNI_LABELS = [
  { name: "大隅", x: 1117, y: 2576, on: true },
  { name: "薩摩", x: 1041, y: 2520, on: true },
  { name: "日向", x: 1193, y: 2434, on: true },
  { name: "肥後", x: 1101, y: 2358, on: true },
  { name: "肥前", x: 952, y: 2275, on: true },
  { name: "土佐", x: 1539, y: 2215, on: true },
  { name: "豊後", x: 1234, y: 2273, on: true },
  { name: "伊予", x: 1454, y: 2180, on: true },
  { name: "筑後", x: 1075, y: 2249, on: true },
  { name: "豊前", x: 1158, y: 2195, on: true },
  { name: "筑前", x: 1064, y: 2183, on: true },
  { name: "紀伊", x: 1911, y: 2128, on: true },
  { name: "阿波", x: 1688, y: 2124, on: true },
  { name: "壱岐", x: 926, y: 2150, on: true },
  { name: "周防", x: 1282, y: 2084, on: true },
  { name: "大和", x: 1961, y: 2054, on: true },
  { name: "長門", x: 1186, y: 2065, on: true },
  { name: "讃岐", x: 1648, y: 2066, on: true },
  { name: "伊勢", x: 2056, y: 2002, on: true },
  { name: "武蔵", x: 2554, y: 1778, on: true },
  { name: "対馬", x: 860, y: 2040, on: true },
  { name: "安芸", x: 1404, y: 2009, on: true },
  { name: "淡路", x: 1787, y: 2044, on: true },
  { name: "志摩", x: 2113, y: 2042, on: true },
  { name: "備後", x: 1501, y: 1989, on: true },
  { name: "和泉", x: 1884, y: 2035, on: true },
  { name: "石見", x: 1337, y: 1973, on: true },
  { name: "河内", x: 1918, y: 2006, on: true },
  { name: "備中", x: 1581, y: 1978, on: true },
  { name: "備前", x: 1655, y: 1976, on: true },
  { name: "伊賀", x: 2019, y: 1985, on: true },
  { name: "摂津", x: 1882, y: 1969, on: true },
  { name: "三河", x: 2205, y: 1939, on: true },
  { name: "遠江", x: 2319, y: 1935, on: true },
  { name: "伊豆", x: 2478, y: 1954, on: true },
  { name: "播磨", x: 1765, y: 1942, on: true },
  { name: "山城", x: 1945, y: 1930, on: true },
  { name: "近江", x: 2005, y: 1893, on: true },
  { name: "駿河", x: 2425, y: 1901, on: true },
  { name: "丹波", x: 1868, y: 1901, on: true },
  { name: "安房", x: 2642, y: 1927, on: true },
  { name: "出雲", x: 1465, y: 1881, on: true },
  { name: "美作", x: 1623, y: 1910, on: true },
  { name: "尾張", x: 2141, y: 1897, on: true },
  { name: "伯耆", x: 1575, y: 1870, on: true },
  { name: "上総", x: 2682, y: 1871, on: true },
  { name: "但馬", x: 1768, y: 1859, on: true },
  { name: "相模", x: 2534, y: 1862, on: true },
  { name: "因幡", x: 1693, y: 1863, on: true },
  { name: "美濃", x: 2143, y: 1835, on: true },
  { name: "甲斐", x: 2422, y: 1822, on: true },
  { name: "信濃", x: 2327, y: 1730, on: true },
  { name: "丹後", x: 1844, y: 1832, on: true },
  { name: "若狭", x: 1946, y: 1843, on: true },
  { name: "越前", x: 2040, y: 1763, on: true },
  { name: "下総", x: 2692, y: 1778, on: true },
  { name: "飛騨", x: 2187, y: 1731, on: true },
  { name: "常陸", x: 2724, y: 1686, on: true },
  { name: "上野", x: 2485, y: 1662, on: true },
  { name: "隠岐", x: 1516, y: 1715, on: true },
  { name: "加賀", x: 2086, y: 1686, on: true },
  { name: "下野", x: 2625, y: 1629, on: true },
  { name: "越中", x: 2197, y: 1640, on: true },
  { name: "能登", x: 2143, y: 1541, on: true },
  { name: "越後", x: 2481, y: 1487, on: true },
  { name: "陸奥", x: 2799, y: 1210, on: true },
  { name: "出羽", x: 2701, y: 1186, on: true },
  { name: "佐渡", x: 2385, y: 1388, on: true },
  { name: "蝦夷", x: 3096, y: 429, on: true },
  { name: "蝦夷", x: 3095, y: 429, on: true },
  { name: "琉球", x: 572, y: 3471, on: true },
];
const SEA_LABELS = [
  { name: "伊勢湾", x: 2116, y: 1982 },
  { name: "駿河湾", x: 2413, y: 1959 },
  { name: "若狭湾", x: 1959, y: 1803 },
  { name: "琵琶湖", x: 2001, y: 1882 },
  { name: "大坂湾", x: 1833, y: 2031 },
  { name: "播磨灘", x: 1732, y: 2039 },
  { name: "江戸湾", x: 2632, y: 1878 },
  { name: "鹿島灘", x: 2783, y: 1735 },
  { name: "日本海", x: 1648, y: 1360 },
  { name: "太平洋", x: 2926, y: 2397 },
  { name: "瀬戸内海", x: 1514, y: 2084 },
  { name: "豊後水道", x: 1329, y: 2272 },
  { name: "玄界灘", x: 1009, y: 2111 },
  { name: "有明海", x: 1026, y: 2308 },
  { name: "東シナ海", x: 605, y: 2916 },
  { name: "土佐湾", x: 1564, y: 2272 },
  { name: "陸奥湾", x: 2800, y: 850 },
  { name: "津軽海峡", x: 2758, y: 751 },
  { name: "仙台湾", x: 2926, y: 1360 },
  { name: "佐渡", x: 2371, y: 1386 },
  { name: "オホーツク海", x: 3431, y: 143 },
  { name: "石狩湾", x: 2809, y: 403 },
  { name: "内浦湾", x: 2792, y: 626 },
  { name: "根室海峡", x: 3565, y: 304 },
  { name: "南西の海", x: 219, y: 3578 },
];

const RIDGES = MAP_RIDGES.map((seg, i) => ({
  pts: seg, amp: 0.88 + (i % 3) * 0.06, w: 90 + (i % 4) * 34,
}));









// 中部の主要河川。経緯度から地図座標へ換算したもの。



// 湖。琵琶湖と浜名湖は盤の上で大きな意味を持つ。
const LAKES = [
  { name: "琵琶湖", pts: [[136.09,35.10],[136.03,35.20],[136.02,35.32],[136.06,35.42],[136.12,35.50],
      [136.22,35.53],[136.28,35.47],[136.26,35.36],[136.20,35.24],[136.16,35.12],[136.12,35.05]] },
  { name: "浜名湖", pts: [[137.56,34.68],[137.53,34.75],[137.56,34.81],[137.62,34.80],[137.63,34.72],[137.60,34.67]] },
];







const RIVER_GEO = [
  { name: "木曽川", w: 5.0, pts: [[137.62,35.92],[137.35,35.68],[137.10,35.52],[136.92,35.38],[136.78,35.28],[136.68,35.12],[136.72,35.02]] },
  { name: "長良川", w: 4.0, pts: [[136.90,35.86],[136.80,35.70],[136.72,35.52],[136.68,35.36],[136.72,35.16],[136.75,35.02]] },
  { name: "揖斐川", w: 3.6, pts: [[136.50,35.72],[136.52,35.56],[136.60,35.36],[136.68,35.16],[136.74,35.00]] },
  { name: "天竜川", w: 4.4, pts: [[138.00,36.05],[137.92,35.72],[137.86,35.44],[137.80,35.10],[137.76,34.80],[137.72,34.62]] },
  { name: "大井川", w: 3.4, pts: [[138.18,35.52],[138.22,35.26],[138.28,34.96],[138.30,34.72]] },
  { name: "富士川", w: 3.6, pts: [[138.42,35.86],[138.46,35.58],[138.52,35.28],[138.60,35.10]] },
  { name: "矢作川", w: 3.0, pts: [[137.42,35.30],[137.30,35.10],[137.16,34.94],[137.06,34.82]] },
  { name: "豊川", w: 2.6, pts: [[137.62,35.02],[137.48,34.86],[137.38,34.76]] },
  { name: "宮川", w: 2.6, pts: [[136.62,34.40],[136.58,34.52],[136.66,34.62],[136.72,34.72]] },
  { name: "野洲川", w: 2.4, pts: [[136.28,34.98],[136.14,35.04],[136.00,35.08],[135.92,35.12]] },
  { name: "姉川", w: 2.4, pts: [[136.34,35.48],[136.24,35.42],[136.16,35.38]] },
  { name: "九頭竜川", w: 3.4, pts: [[136.68,36.06],[136.52,36.08],[136.34,36.14],[136.20,36.20]] },
  { name: "犀川", w: 3.0, pts: [[137.86,36.28],[138.00,36.42],[138.16,36.56]] },
  { name: "千曲川", w: 3.6, pts: [[138.44,36.06],[138.32,36.24],[138.22,36.42],[138.20,36.60]] },
  { name: "釜無川", w: 2.8, pts: [[138.28,35.86],[138.36,35.68],[138.44,35.56]] },
  { name: "狩野川", w: 2.4, pts: [[138.94,34.92],[138.94,35.06],[138.90,35.16]] },
];
const RIVERS = RIVER_GEO.map((r) => ({
  w: r.w, name: r.name,
  pts: r.pts.map(([lo, la]) => [Math.round(px(lo)), Math.round(py(la))]),
}));


function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function segDist(qx, qy, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
  let t = L ? ((qx - x1) * dx + (qy - y1) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ax = x1 + t * dx - qx, ay = y1 + t * dy - qy;
  return Math.sqrt(ax * ax + ay * ay);
}

function buildTerrainCanvas() {
  const RW = 500, RH = 534;
  const sx = MAPW / RW, sy = MAPH / RH;
  const H = new Float32Array(RW * RH);
  for (let j = 0; j < RH; j++) {
    const wy = j * sy;
    for (let i = 0; i < RW; i++) {
      const wx = i * sx;
      let h = 0;
      for (const r of RIDGES) {
        let d = 1e9;
        for (let k = 0; k < r.pts.length - 1; k++) {
          const p = r.pts[k], q = r.pts[k + 1];
          const dd = segDist(wx, wy, p[0], p[1], q[0], q[1]);
          if (dd < d) d = dd;
        }
        const t = d / r.w;
        if (t < 3) h = Math.max(h, r.amp * Math.exp(-t * t));
      }
      const n = vnoise(wx / 26, wy / 26) * 0.55 + vnoise(wx / 11, wy / 11) * 0.3 + vnoise(wx / 5, wy / 5) * 0.15;
      H[j * RW + i] = Math.max(0, h * (0.72 + n * 0.56));
    }
  }
  const RAMP = [
    [0.00, [222, 228, 200]], [0.04, [212, 222, 188]], [0.12, [193, 210, 166]],
    [0.28, [168, 194, 139]], [0.48, [140, 175, 114]], [0.70, [116, 156, 95]],
    [1.00, [96, 138, 80]],
  ];
  const ramp = (h) => {
    for (let i = 1; i < RAMP.length; i++) {
      if (h <= RAMP[i][0]) {
        const a = RAMP[i - 1], b = RAMP[i];
        const t = (h - a[0]) / (b[0] - a[0] || 1);
        return [a[1][0] + (b[1][0] - a[1][0]) * t, a[1][1] + (b[1][1] - a[1][1]) * t, a[1][2] + (b[1][2] - a[1][2]) * t];
      }
    }
    return RAMP[RAMP.length - 1][1];
  };

  const small = document.createElement("canvas");
  small.width = RW; small.height = RH;
  const sctx = small.getContext("2d");
  const img = sctx.createImageData(RW, RH);
  for (let j = 0; j < RH; j++) {
    for (let i = 0; i < RW; i++) {
      const h = H[j * RW + i];
      const hx = H[j * RW + Math.min(RW - 1, i + 1)] - H[j * RW + Math.max(0, i - 1)];
      const hy = H[Math.min(RH - 1, j + 1) * RW + i] - H[Math.max(0, j - 1) * RW + i];
      let shade = 1 + (-hx - hy) * 3.6;
      shade = Math.max(0.62, Math.min(1.34, shade));
      const c = ramp(Math.min(1, h));
      const o = (j * RW + i) * 4;
      img.data[o] = Math.min(255, c[0] * shade);
      img.data[o + 1] = Math.min(255, c[1] * shade);
      img.data[o + 2] = Math.min(255, c[2] * shade);
      img.data[o + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);

  const cv = document.createElement("canvas");
  cv.width = MAPW; cv.height = MAPH;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, MAPW, MAPH);

  // 海を敷き、海岸線の内側にだけ陸を描く。
  // 線と塗りを別々に決めると、岸の形と陸の形が食い違う。
  ctx.fillStyle = U.sea;
  ctx.fillRect(0, 0, MAPW, MAPH);
  ctx.save();
  ctx.beginPath();
  for (const seg of LAND_POLYS) {
    seg.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  }
  ctx.clip();
  ctx.drawImage(small, 0, 0, MAPW, MAPH);
  ctx.restore();

  // 海岸線
  ctx.strokeStyle = "rgba(96,130,152,0.75)"; ctx.lineWidth = 1.8;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const seg of COAST) {
    ctx.beginPath();
    seg.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  // 湖
  for (const lk of LAKES) {
    ctx.fillStyle = U.sea;
    ctx.beginPath();
    lk.pts.forEach(([lo, la], i) => (i ? ctx.lineTo(px(lo), py(la)) : ctx.moveTo(px(lo), py(la))));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(96,130,152,0.6)"; ctx.lineWidth = 1.4; ctx.stroke();
  }
  // 旧国界
  ctx.strokeStyle = "rgba(120,104,80,0.42)"; ctx.lineWidth = 1.2;
  ctx.setLineDash([7, 5]);
  for (const seg of KUNI_LINES) {
    ctx.beginPath();
    seg.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const [a, b, , kind] of ROADS) {
    if (kind === "海路") continue;
    const A = nodeById(a), B = nodeById(b);
    if (!A || !B) continue;
    // 街道は太い実線、山道は破線、難所はさらに細かい破線で細く
    ctx.strokeStyle = kind === "街道" ? "rgba(176,138,96,0.85)"
      : kind === "難所" ? "rgba(140,112,80,0.42)" : "rgba(176,138,96,0.5)";
    ctx.lineWidth = kind === "街道" ? 2.6 : kind === "難所" ? 1.4 : 2;
    ctx.setLineDash(kind === "街道" ? [] : kind === "難所" ? [3, 5] : [8, 6]);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  // 海路は波線で
  ctx.strokeStyle = "rgba(96,130,152,0.6)"; ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 5]);
  for (const [a, b, , kind] of ROADS) {
    if (kind !== "海路") continue;
    const A = nodeById(a), B = nodeById(b);
    if (!A || !B) continue;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  return cv;
}

/* ------------------------------------------- 特殊勢力の関係（GDD 11.3） */
// 短期利益・長期成長・維持費・反発を組み合わせ、どれか一つを最適解にしない。
const SPECIAL_OPTIONS = {
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
const SUBJECT = ["従属", "臣従"];             // こちらが下に立っている間柄
const DIPLO = [
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
const PLOTS = [
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

/* -------------------------------------------------------------- 汎用処理 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => Math.round(n).toLocaleString("ja-JP");
const man = (n) => (n / 10000).toFixed(1);
const SEASON = (m) => (m <= 2 || m === 12 ? "冬" : m <= 5 ? "春" : m <= 8 ? "夏" : "秋");

const NODES = {};
// 町を先に入れ、城で上書きする。
// 同じ名を持つ町と城があっても、街道の端点は必ず城でなければならない。
for (const t of TOWNS) NODES[t.id] = { ...t, x: px(t.lon), y: py(t.lat), type: "town" };
for (const c of CASTLES) NODES[c.id] = { ...c, x: px(c.lon), y: py(c.lat), type: "castle" };
function nodeById(id) { return NODES[id]; }

// 街道の繋がりは変わらないので、隣り合う城の表を一度だけ作る。
// 城が二百を超えると、毎回すべての街道を走査していては月送りが重くなる。
const ROAD_ADJ = (() => {
  const m = {};
  for (const [a, b] of ROADS) {
    (m[a] = m[a] || []).push(b);
    (m[b] = m[b] || []).push(a);
  }
  return m;
})();
const PATH_CACHE = new Map();
const ROAD_MAP = (() => {
  const m = {};
  for (const r of ROADS) { m[`${r[0]}|${r[1]}`] = r; m[`${r[1]}|${r[0]}`] = r; }
  return m;
})();
function findPath(from, to) {
  const key = `${from}>${to}`;
  if (PATH_CACHE.has(key)) return PATH_CACHE.get(key);
  // 道は区間の数ではなく、かかる日数で選ぶ。
  // 険しい山道を一区間で越えるより、平らな街道を三区間辿るほうが早い。
  const cost = new Map([[from, 0]]), prev = new Map([[from, null]]);
  const seen = new Set();
  // 費用の小さい順に取り出す。城が二百を超えるので、毎回すべてを見比べては遅い。
  const heap = [[0, from]];
  const push = (c2, id) => {
    heap.push([c2, id]);
    let i = heap.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (heap[par][0] <= heap[i][0]) break;
      [heap[par], heap[i]] = [heap[i], heap[par]]; i = par;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r2 = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [best, cur] = pop();
    if (seen.has(cur)) continue;
    if (cur === to) break;
    seen.add(cur);
    for (const nxt of ROAD_ADJ[cur] || []) {
      const r = ROAD_MAP[`${cur}|${nxt}`];
      const d = best + (r ? r[2] / (ROAD_SPEED[r[3]] || 1) : 20);
      if (!cost.has(nxt) || d < cost.get(nxt)) { cost.set(nxt, d); prev.set(nxt, cur); push(d, nxt); }
    }
  }
  let out = null;
  if (cost.has(to)) {
    out = [];
    for (let x = to; x != null; x = prev.get(x)) out.unshift(x);
  }
  PATH_CACHE.set(key, out);
  return out;
}

const roadBetween = (a, b) => ROAD_MAP[`${a}|${b}`];
const minGarrison = (c) => Math.round(c.def * 10 + (100 - c.min) * 5);
const troopCap = (c, p, s) => Math.round((c.koku / 10000) * MOB_POLICY[p].per
  * (0.75 + (c.najimi == null ? 70 : c.najimi) / 400)
  * (s ? rankBonus(s, c.faction).troop : 1));
const foodDays = (food, troops) => (troops > 0 ? Math.round((food / (troops * 0.08)) * 30) : 999);

// ------------------------------------------------ 援軍（GDD 7.3 / 7.4）
// 各城・各勢力は「守備最低数・距離・従属度」から派遣・減員・遅参・拒否を判断する。
function reinforceOffers(g, from, target) {
  const out = [];
  for (const c of g.castles) {
    if (c.id === from) continue;
    const path = findPath(c.id, target);
    if (!path) continue;
    const legs = path.length - 1;
    const gens = g.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
    const avail = Math.max(0, c.local + gens.reduce((a, x) => a + x.retinue, 0) - minGarrison(c));
    let kind = null, ratio = 0, chance = 1;
    if (c.faction === g.player) { kind = "自領"; ratio = 0.4; }
    else {
      const rel = relOf(g, g.player, c.faction);
      if (rel.state === "臣従" || rel.state === "従属") { kind = rel.state; ratio = 0.35; chance = 0.9; }
      else if (rel.state === "同盟") { kind = "同盟"; ratio = 0.25; chance = clamp(rel.trust / 100, 0.2, 0.9); }
      else continue;
    }
    const distPenalty = clamp(1 - (legs - 1) * 0.12, 0.4, 1);   // 遠いほど減る
    const men = Math.floor(avail * ratio * distPenalty);
    out.push({
      castleId: c.id, name: c.name, faction: c.faction, kind, men, legs, chance,
      months: marchMonths(c.id, target) || Math.max(1, legs),
      reason: avail < 400 ? "守備が手薄で出せない" : men < 200 ? "出せる兵が少なすぎる" : null,
    });
  }
  return out.filter((o) => o.men > 0 || o.reason).sort((a, z) => a.legs - z.legs).slice(0, 6);
}

const relKey = (a, b) => [a, b].sort().join("|");

function initState(player) {
  const factions = JSON.parse(JSON.stringify(FACTIONS));
  for (const f of Object.values(factions)) f.prestige = 50;
  const relations = {};
  const ids = Object.keys(factions);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    relations[relKey(ids[i], ids[j])] = { trust: 45 + Math.round(Math.random() * 10), state: "中立", until: null };
  }
  // 史実に沿った初めの間柄。阿波の国人は三好に従い、その旗の下にある。
  // 天文十五年（1546）の間柄。史実に拠る。
  const START_TIES = [
    // ── 東国。河越夜戦の直後であり、北条は今川・武田と和を結んだばかり。
    ["hojo", "takeda", "同盟", 74],         // 甲相同盟（天文十三年ごろ成立）
    ["hojo", "imagawa", "不可侵", 58],      // 第二次河東一乱の和睦（天文十四年十月）
    ["takeda", "imagawa", "同盟", 76],      // 甲駿同盟。武田が今川・北条を調停した
    ["hojo", "uesugi_y", "敵対", 8],        // 河越夜戦で山内上杉を破ったばかり
    ["hojo", "koga", "敵対", 10],           // 古河公方も河越で北条に敗れた
    ["uesugi_y", "koga", "同盟", 72],       // 関東管領と古河公方は連合していた
    ["uesugi_y", "imagawa", "同盟", 66],    // 今川は上杉と通じて北条を挟撃した
    ["hojo", "satomi", "敵対", 12],         // 里見は房総で北条と争う
    ["takeda", "murakami", "敵対", 10],     // 武田は信濃で村上と争っていた
    ["takeda", "nagao", "敵対", 22],        // 信濃をめぐり長尾とも緊張
    // ── 東海。松平は今川に従い、織田と争う。
    ["matsudaira", "imagawa", "従属", 64],  // 広忠は今川に依存を深めていた
    ["matsudaira", "oda", "敵対", 8],       // 第二次安城合戦のさなか
    ["oda", "imagawa", "敵対", 12],         // 三河をめぐる争い
    ["oda", "yamato", "敵対", 18],          // 織田三家は同族ながら相争う
    ["oda", "ise", "敵対", 22],
    ["mizuno", "oda", "同盟", 68],          // 水野は織田方に転じていた
    ["oda", "saito", "敵対", 20],           // 美濃をめぐる争い
    // ── 畿内・西国
    ["ashikaga", "miyoshi", "従属", 44],    // 将軍家は細川・三好に擁されていた
    ["shingai", "miyoshi", "従属", 78],     // 新開は三好に従う阿波の国人
    ["kagawa", "miyoshi", "従属", 70],      // 讃岐香川も三好の下にある
    ["miyoshi", "honganji", "不可侵", 56],
    ["kobayakawa", "mori", "同盟", 82],     // 小早川は毛利の一族
    ["mori", "ouchi", "従属", 74],          // 毛利は大内に属する安芸の国人
    ["takeda_a", "amago", "従属", 62],      // 安芸武田は尼子を頼む
    ["ouchi", "amago", "敵対", 14],         // 大内と尼子は山陰山陽を争う
    ["ouchi", "otomo", "敵対", 26],         // 北九州をめぐる争い
    ["ryuzoji", "otomo", "従属", 52],       // 龍造寺は大友の傘下にあった
    // ── 九州・四国
    ["shimazu", "ito", "敵対", 16],         // 日向をめぐる争い
    ["chosokabe", "ichijo", "従属", 58],    // 長宗我部は一条を頼っていた
    ["kono", "ouchi", "不可侵", 54],
    // ── 奥羽
    ["date", "ashina", "同盟", 66],         // 天文の乱を経て和した
    ["nanbu", "kunohe", "従属", 48],        // 九戸は南部の一族ながら不穏
    ["nanbu", "oura", "従属", 46],          // 大浦も南部に属する
    ["mogami", "date", "従属", 56],         // 最上は伊達と縁を結ぶ
  ];
  for (const [a, b, st, tr] of START_TIES) {
    const k = relKey(a, b);
    if (relations[k]) { relations[k].state = st; relations[k].trust = tr; relations[k].until = null; }
  }
  const specials = {};
  for (const t of TOWNS) specials[t.id] = { state: "中立", faction: null, anger: 0, months: 0 };
  return {
    player, year: 1546, month: 4,
    factions,
    castles: assignKokuCap(CASTLES.map((c) => ({
      ...c, x: px(c.lon), y: py(c.lat),
      najimi: 70,            // 地域家臣団が現城主を受け入れる度合い（GDD 6.2）
      rost: newRoster(c.local, `loc-${c.id}`),   // 地域家臣団の組の名簿
      kokuBase: c.kokuMax,                        // 治水の伸びを測るための元の上限
      kokuCap: c.kokuMax,                          // 国の検地に基づく限り（下でまとめて割り当てる）
      well: 100,             // 井戸。城工作で傷むと籠城が続かない（GDD 9.2）
      lordId: null, intrigue: false,
    }))),
    // 知行を定めてから、城を預かる者に身分を保証する
    generals: assignRanks(CASTLES, fillKeepers(CASTLES, GENERALS).map((g) => ({
      ...g, unity: clamp(g.retTrain + 8, 30, 100), merit: 0,
      fief: Math.round(fiefWanted(g) * (0.72 + Math.random() * 0.34)),
      rost: newRoster(g.retinue, `ret-${g.id}`) }))),
    armies: [], orders: {}, ledger: [], sieges: [], promo: null, campaigns: [],
    relations, specials, plots: [], intel: {}, prev: {},
    chronicle: [{ y: 1546, m: 4, text: "尾張は織田三家に分かれ、美濃は斎藤道三が握る。天下はまだ遠い。" }],
  };
}
// 攻めるには、目標の城が自勢力のいずれかの城と街道でつながっていること（領地が隣接）
function canAttack(g, targetId) {
  const t = g.castles.find((c) => c.id === targetId);
  if (!t || t.faction === g.player) return false;
  return g.castles.some((c) => c.faction === g.player && roadBetween(c.id, targetId));
}
// 到着までの月数。街道の種別で足の速さが変わる。
function marchMonths(from, to) {
  const path = findPath(from, to);
  if (!path) return null;
  let d = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const r = roadBetween(path[i], path[i + 1]);
    d += r ? r[2] / ROAD_SPEED[r[3]] : 10;
  }
  return Math.max(1, Math.ceil(d / MARCH_PER_MONTH));
}

/* --------------------------------------------- 捕縛と捕虜（GDD 12.3）
   捕らわれること自体は稀である。統率・武勇・知略に優れた者ほど、
   囲みを破り、あるいは供回りに守られて落ち延びる。 */
const CAPTURE_BASE = 0.06;                 // 敗れた武将が捕らわれる基準の確率
function captureChance(gen) {
  const able = (gen.lead + gen.valor + gen.wit) / 3;      // 三つの平均
  // 能力70で基準の半分、能力40で基準の倍ほど
  const k = clamp(1.9 - able / 55, 0.25, 2.2);
  return clamp(CAPTURE_BASE * k, 0.01, 0.2);
}
/* 身代金（GDD 12.3）。器量の高い者ほど高くつく。
   甲は金銭と兵糧の三分の一、乙は五分の一、丙は七分の一、丁は九分の一。 */
function ransomRank(gen) {
  const t = gen.lead + gen.valor + gen.wit + gen.gov;
  return t >= 300 ? "甲" : t >= 250 ? "乙" : t >= 200 ? "丙" : "丁";
}
const RANSOM_DIV = { 甲: 3, 乙: 5, 丙: 7, 丁: 9 };
// 支払う側（旧主の家）の金銭と兵糧から割り出す
function ransomCost(s, gen) {
  const rank = ransomRank(gen);
  const div = RANSOM_DIV[rank];
  const payer = gen.captive ? gen.captive.from : gen.faction;
  const gold = s.factions[payer] ? s.factions[payer].gold : 0;
  const food = s.castles.filter((c) => c.faction === payer).reduce((a, c) => a + c.food, 0);
  return { rank, div, gold: Math.round(gold / div), food: Math.round(food / div), payer };
}
// 相手方が身代金に応じるか。器量が高く、払えるほど応じる。
function ransomAccept(s, gen) {
  const { gold, food, payer } = ransomCost(s, gen);
  const f = s.factions[payer];
  if (!f) return false;
  const canPay = f.gold >= gold && s.castles.filter((c) => c.faction === payer).reduce((a, c) => a + c.food, 0) >= food;
  if (!canPay) return false;
  const worth = (gen.lead + gen.valor + gen.wit + gen.gov) / 400;    // 器量
  const loy = (gen.loyal == null ? 60 : gen.loyal) / 100;
  return Math.random() < clamp(worth * 0.9 + loy * 0.5 - 0.25, 0.05, 0.95);
}
// 身代金を支払わせ、武将を返す
function payRansom(s, gen) {
  const { gold, food, payer } = ransomCost(s, gen);
  const f = s.factions[payer];
  if (!f) return false;
  f.gold -= gold;
  let left = food;
  for (const c of s.castles.filter((c2) => c2.faction === payer)) {
    const take = Math.min(c.food, left);
    c.food -= take; left -= take;
    if (left <= 0) break;
  }
  s.factions[s.player].gold += gold;
  const mine = s.castles.filter((c) => c.faction === s.player);
  if (mine.length) mine[0].food += food;
  const home = s.castles.find((c) => c.faction === payer) || s.castles[0];
  gen.captive = null; gen.at = home.id;
  gen.retinue = Math.round(180 + Math.random() * 120);
  return { gold, food, home };
}

// 捕らえた武将を捕虜として城へ入れる
function makePrisoner(s, gen, holderFaction, castleId) {
  gen.captive = { by: holderFaction, from: gen.faction, at: castleId, since: `${s.year}-${s.month}` };
  gen.at = castleId;
  gen.retinue = 0;
  return gen;
}
// 登用の可否（GDD 12.3）。忠誠40以下は降り、41〜70は運、71以上は決して降らない。
function persuadeResult(gen) {
  const loy = gen.loyal == null ? 60 : gen.loyal;
  if (loy <= 40) return true;
  if (loy >= 71) return false;
  return Math.random() < (71 - loy) / 40;
}

// 陥落の処理（GDD 9.5）。武将の身の振り方、地域家臣団の去就、戦災を扱う。
function sackCastle(s, castle, army, hard) {
  // その家の最後の城か。最後なら、城内の者は散らさず戦後の始末に回す（GDD 12.4）
  const lastOne = s.castles.filter((c2) => c2.faction === castle.faction).length === 1;
  const oldF = castle.faction;
  const defGens = s.generals.filter((x) => x.at === castle.id && x.faction === oldF);
  const winner = army.faction;
  const log = (t) => s.chronicle.push({ y: s.year, m: s.month, text: t });
  for (const gen of defGens) {
    // 家の最後の城なら、ここで散らさず戦後の始末に回す。
    // 勝者が身の振り方を決めるのが道理であって、勝手に降ったり逃れたりはしない。
    if (lastOne) continue;
    // 統率・武勇が高いほど討死や抵抗に傾き、忠誠が低いほど降る
    const r = Math.random() + (hard ? 0.12 : 0) + gen.valor / 400 - gen.loyal / 320;
    if (r > 0.86) {
      s.generals = s.generals.filter((x) => x.id !== gen.id);
      log(`${gen.name}は${castle.name}に踏みとどまり討死した。`);
    } else if (r > 0.70 && Math.random() < captureChance(gen) * 3.2) {
      makePrisoner(s, gen, winner, castle.id);
      log(`${gen.name}は捕らえられた。`);
      if (winner === s.player) s.captives = [...(s.captives || []), gen.id];
    } else if (r > 0.70) {
      const refuge = s.castles.find((c2) => c2.faction === oldF && c2.id !== castle.id);
      if (refuge) { gen.at = refuge.id; log(`${gen.name}は囲みを破って${refuge.name}へ逃れた。`); }
      else { makePrisoner(s, gen, winner, castle.id); log(`${gen.name}は逃れる先なく、捕らえられた。`); }
    } else if (r > 0.48) {
      gen.faction = winner; gen.loyal = clamp(35 + Math.random() * 20, 0, 100);
      gen.at = castle.id; gen.retinue = Math.round(gen.retinue * 0.5);
      log(`${gen.name}は降り、${s.factions[winner].name}に属した。`);
    } else {
      const refuge = s.castles.find((c) => c.faction === oldF && c.id !== castle.id);
      if (refuge) { gen.at = refuge.id; gen.retinue = Math.round(gen.retinue * 0.6); log(`${gen.name}は${refuge.name}へ落ち延びた。`); }
      else { makePrisoner(s, gen, winner, castle.id); log(`${gen.name}は落ち延びる先なく、捕らえられた。`); }
    }
  }
  // 地域家臣団の去就
  const before = castle.local;
  const min0 = castle.min;
  const stay = Math.round(before * clamp(min0 / 260 + (hard ? 0 : 0.12), 0.05, 0.45));
  const yield_ = Math.round(before * clamp(0.30 - min0 / 400, 0.05, 0.3));
  const resist = Math.round(before * (hard ? 0.18 : 0.08));
  const scatter = Math.max(0, before - stay - yield_ - resist);
  log(`${castle.name}の地域家臣団${fmt(before)}人のうち、${fmt(stay)}人が残り、${fmt(yield_)}人が降り、`
    + `${fmt(resist)}人が抗い、${fmt(scatter)}人が散った。`);
  // 戦災
  castle.faction = winner;
  // 名簿。残った者と降った者は元の組のまま残り、攻め手の組が加わる
  const keepN = stay + yield_;
  castle.rost = rosterCut(castle.rost || newRoster(before, `loc-${castle.id}`), Math.max(0, before - keepN));
  if (army.rost && army.rost.length) castle.rost = [...castle.rost, ...army.rost];
  castle.local = stay + yield_ + Math.max(0, army.local);
  rosterSync(castle, "rost", castle.local, `loc-${castle.id}`);
  castle.koku = Math.round(castle.koku * (hard ? 0.90 : 0.95));
  castle.comm = Math.round(castle.comm * (hard ? 0.80 : 0.90));
  castle.pop = Math.round(castle.pop * (hard ? 0.92 : 0.96));
  castle.food = Math.round(castle.food * (hard ? 0.35 : 0.6));
  castle.def = Math.round(castle.def * (hard ? 0.68 : 0.85));
  castle.hp = Math.round(castle.hp * (hard ? 0.55 : 0.8));
  castle.min = clamp(Math.round(min0 - (hard ? 28 : 16) - resist / Math.max(1, before) * 40), 8, 100);
  castle.najimi = 18;
  castle.lordId = null;
  castle.intrigue = false;
  castle.well = 100;
  // 城を取ったのは本軍である。ここに残るのは本軍の将だけ。
  for (const gid of army.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = castle.id; }
  s.armies = s.armies.filter((x) => x.id !== army.id);
  // 寄騎・後詰・同盟軍として来た軍は、それぞれの城へ帰る。
  // 助けに来た将まで奪った城に居着いては、元の城が空になってしまう。
  for (const a2 of s.armies.filter((x) => x.target === castle.id || x.at === castle.id)) {
    if (a2.faction === oldF) continue;                  // 旧主の軍はここでは扱わない
    const home = s.castles.find((c2) => c2.id === a2.from)
      || s.castles.find((c2) => c2.faction === a2.faction);
    if (!home) continue;
    home.local += Math.max(0, a2.local);
    if (a2.rost && a2.rost.length) home.rost = [...(home.rost || []), ...a2.rost];
    rosterSync(home, "rost", home.local, `loc-${home.id}`);
    for (const gid of a2.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; }
    if (a2.faction === s.player) {
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${castle.name}攻めに加わった寄騎は${home.name}へ帰陣した。` });
    }
  }
  s.armies = s.armies.filter((x) => !(x.target === castle.id || x.at === castle.id) || x.faction === oldF);
  s.sieges = s.sieges.filter((x) => x.castleId !== castle.id);
  s.campaigns = (s.campaigns || []).filter((x) => x.target !== castle.id);
  log(`${castle.name}が落ち、${s.factions[winner].name}の手に渡った（旧領主：${s.factions[oldF].name}）。`);
  // すべての城を失えば家は滅ぶ。残った者の始末は勝った側が決める（GDD 12.4）
  if (!s.castles.some((c2) => c2.faction === oldF)) {
    // 拠るべき城を失えば、野に出ている軍も散る。
    // これを残すと、滅んだはずの家が城を攻めてくる。
    for (const a2 of s.armies.filter((x) => x.faction === oldF)) {
      for (const gid of a2.gens) {
        const x = s.generals.find((q) => q.id === gid);
        if (x) x.at = castle.id;              // 将は落城の地へ引き据えられる
      }
    }
    s.armies = s.armies.filter((x) => x.faction !== oldF);
    s.sieges = s.sieges.filter((x) => {
      const bes = s.armies.find((a3) => a3.id === x.armyId);
      return !!bes;
    });
    s.campaigns = (s.campaigns || []).filter((x) => x.faction !== oldF);
    // 捕虜になった者も、この時点で改めて処遇を問う
    for (const q of s.generals.filter((x) => x.faction === oldF && x.captive && x.captive.by === winner)) {
      q.captive = null;
    }
    const { lord, retainers } = ruinedHouse(s, oldF);
    if (winner === s.player && (lord || retainers.length)) {
      // 遊ぶ側が勝ったなら、一人ずつ身の振り方を問う
      s.warSettle = { faction: oldF, winner, castleId: castle.id,
        lordId: lord ? lord.id : null,
        queue: [...(lord ? [lord.id] : []), ...retainers.map((x) => x.id)] };
    } else {
      // 他家同士なら自動で始末する。多くは召し抱えられ、一部は斬られる。
      for (const g2 of [lord, ...retainers].filter(Boolean)) {
        const rec = canRecruit(g2, lord);
        if (g2 === lord || !rec.ok || Math.random() < 0.25) {
          if (Math.random() < 0.4) { s.generals = s.generals.filter((x) => x.id !== g2.id); }
          else takeAsPrisoner(s, g2, winner, castle.id);
        } else {
          g2.faction = winner; g2.loyal = loyaltyAfterRecruit(g2); g2.lord = false;
          g2.at = castle.id;
        }
      }
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${s.factions[oldF].name}は最後の城を失い、滅亡した。` });
    }
    s.ruined = [...(s.ruined || []), oldF];
  }
}

// 旧いセーブには名簿がない。読み込み時に作る。
function migrateRosters(s) {
  for (const c of s.castles) if (!c.rost) c.rost = newRoster(Math.max(0, c.local), `loc-${c.id}`);
  for (const gq of s.generals) if (!gq.rost) gq.rost = newRoster(Math.max(0, gq.retinue), `ret-${gq.id}`);
  for (const a of s.armies || []) if (!a.rost) a.rost = newRoster(Math.max(0, a.local), `arm-${a.id}`);
  return s;
}
/* --------------------------------------------- 世に出る武将（GDD 6.1）
   家は代を重ねる。年を経れば、若い者が世に出て仕える。
   織田家に木下藤吉郎や明智光秀が現れるのは、この仕組みによる。 */
const NEWCOMERS = [
  { id: "nagahide", name: "丹羽長秀", faction: "oda", y: 1550, at: "nagoya",
    lead: 82, valor: 74, wit: 80, gov: 90, retinue: 180, retTrain: 64, born: 1535 },
  { id: "toshiie", name: "前田利家", faction: "oda", y: 1551, at: "nagoya",
    lead: 78, valor: 90, wit: 56, gov: 60, retinue: 140, retTrain: 68, born: 1538 },
  { id: "tsuneoki", name: "池田恒興", faction: "oda", y: 1552, at: "nagoya",
    lead: 74, valor: 80, wit: 62, gov: 64, retinue: 160, retTrain: 64, born: 1536 },
  { id: "nagamasa2", name: "佐々成政", faction: "oda", y: 1553, at: "shobata",
    lead: 76, valor: 86, wit: 62, gov: 58, retinue: 150, retTrain: 68, born: 1536 },
  { id: "hideyoshi", name: "木下藤吉郎", faction: "oda", y: 1554, at: "nagoya",
    lead: 88, valor: 66, wit: 96, gov: 97, retinue: 120, retTrain: 58, born: 1537 },
  { id: "kazumasu", name: "滝川一益", faction: "oda", y: 1555, at: "shobata",
    lead: 84, valor: 78, wit: 84, gov: 74, retinue: 200, retTrain: 66, born: 1525 },
  { id: "mitsuhide", name: "明智光秀", faction: "oda", y: 1566, at: "nagoya",
    lead: 90, valor: 72, wit: 94, gov: 90, retinue: 200, retTrain: 66, born: 1528 },
  { id: "hanbei", name: "竹中半兵衛", faction: "saito", y: 1558, at: "sunomata",
    lead: 82, valor: 46, wit: 97, gov: 82, retinue: 120, retTrain: 60, born: 1544 },
  { id: "toshiharu", name: "斎藤利治", faction: "saito", y: 1557, at: "inabayama",
    lead: 72, valor: 74, wit: 66, gov: 62, retinue: 180, retTrain: 66, born: 1541 },
  { id: "ieyasu", name: "松平元康", faction: "matsudaira", y: 1557, at: "okazaki",
    lead: 92, valor: 74, wit: 92, gov: 96, retinue: 260, retTrain: 70, born: 1543 },
  { id: "tadakatsu", name: "本多忠勝", faction: "matsudaira", y: 1560, at: "okazaki",
    lead: 82, valor: 96, wit: 62, gov: 60, retinue: 180, retTrain: 74, born: 1548 },
  { id: "yasumasa", name: "榊原康政", faction: "matsudaira", y: 1561, at: "okazaki",
    lead: 80, valor: 82, wit: 74, gov: 76, retinue: 170, retTrain: 70, born: 1548 },
  { id: "naomasa", name: "井伊直政", faction: "matsudaira", y: 1575, at: "okazaki",
    lead: 84, valor: 88, wit: 72, gov: 74, retinue: 190, retTrain: 74, born: 1561 },
  { id: "katsuyori", name: "武田勝頼", faction: "takeda", y: 1562, at: "takato",
    lead: 80, valor: 88, wit: 62, gov: 58, retinue: 300, retTrain: 72, born: 1546 },
  { id: "masayuki", name: "真田昌幸", faction: "takeda", y: 1560, at: "komoro",
    lead: 84, valor: 70, wit: 94, gov: 84, retinue: 200, retTrain: 68, born: 1547 },
  { id: "nagamasa", name: "浅井長政", faction: "azai", y: 1560, at: "odani",
    lead: 84, valor: 84, wit: 74, gov: 76, retinue: 300, retTrain: 70, born: 1545 },
  { id: "yoshikage", name: "朝倉義景", faction: "asakura", y: 1553, at: "ichijodani",
    lead: 58, valor: 52, wit: 60, gov: 66, retinue: 400, retTrain: 60, born: 1533 },
  { id: "nagamasa3", name: "蜂須賀正勝", faction: "oda", y: 1556, at: "shobata",
    lead: 76, valor: 74, wit: 82, gov: 70, retinue: 160, retTrain: 64, born: 1526 },
  { id: "hanzo", name: "服部半蔵", faction: "matsudaira", y: 1563, at: "okazaki",
    lead: 68, valor: 80, wit: 84, gov: 52, retinue: 140, retTrain: 70, born: 1542 },
  { id: "kazumasa2", name: "石川数正", faction: "matsudaira", y: 1558, at: "okazaki",
    lead: 76, valor: 68, wit: 80, gov: 82, retinue: 180, retTrain: 66, born: 1533 },
  { id: "tadatsugu2", name: "酒井忠次", faction: "matsudaira", y: 1557, at: "okazaki",
    lead: 84, valor: 78, wit: 80, gov: 76, retinue: 220, retTrain: 70, born: 1527 },
  { id: "nobumori2", name: "森長可", faction: "oda", y: 1572, at: "shobata",
    lead: 76, valor: 92, wit: 56, gov: 52, retinue: 200, retTrain: 74, born: 1558 },
  { id: "ranmaru", name: "森蘭丸", faction: "oda", y: 1578, at: "nagoya",
    lead: 62, valor: 60, wit: 76, gov: 78, retinue: 120, retTrain: 62, born: 1565 },
  { id: "hidenaga", name: "羽柴秀長", faction: "oda", y: 1564, at: "nagoya",
    lead: 82, valor: 68, wit: 84, gov: 90, retinue: 180, retTrain: 66, born: 1540 },
  { id: "kanbei", name: "黒田官兵衛", faction: "oda", y: 1575, at: "nagoya",
    lead: 82, valor: 62, wit: 96, gov: 88, retinue: 160, retTrain: 64, born: 1546 },
  { id: "masamune", name: "真田信綱", faction: "takeda", y: 1558, at: "komoro",
    lead: 76, valor: 84, wit: 66, gov: 60, retinue: 220, retTrain: 70, born: 1537 },
  { id: "katsuyori2", name: "武田信豊", faction: "takeda", y: 1566, at: "fukashi",
    lead: 72, valor: 74, wit: 64, gov: 62, retinue: 240, retTrain: 68, born: 1549 },
  { id: "ujimasa", name: "北条氏政", faction: "hojo", y: 1559, at: "nirayama",
    lead: 70, valor: 66, wit: 70, gov: 76, retinue: 260, retTrain: 66, born: 1538 },
  { id: "nagamasa4", name: "浅井政澄", faction: "azai", y: 1562, at: "odani",
    lead: 66, valor: 70, wit: 60, gov: 58, retinue: 200, retTrain: 64, born: 1540 },
  { id: "kagetoshi2", name: "朝倉景鏡", faction: "asakura", y: 1556, at: "ichijodani",
    lead: 68, valor: 66, wit: 66, gov: 64, retinue: 260, retTrain: 62, born: 1525 },
  { id: "kenshin", name: "上杉政虎", faction: "nagao", y: 1561, at: "kasugayama",
    lead: 97, valor: 90, wit: 86, gov: 80, retinue: 320, retTrain: 78, born: 1530 },
  { id: "kagekatsu", name: "上杉景勝", faction: "nagao", y: 1575, at: "kasugayama",
    lead: 78, valor: 70, wit: 74, gov: 76, retinue: 260, retTrain: 70, born: 1556 },
  { id: "kanetsugu", name: "直江兼続", faction: "nagao", y: 1580, at: "yoita",
    lead: 82, valor: 72, wit: 88, gov: 90, retinue: 200, retTrain: 70, born: 1560 },
  { id: "ujimasa2", name: "北条氏直", faction: "hojo", y: 1575, at: "odawara",
    lead: 70, valor: 66, wit: 70, gov: 74, retinue: 240, retTrain: 68, born: 1562 },
  { id: "mitsuhide2", name: "荒木村重", faction: "miyoshi", y: 1565, at: "itami",
    lead: 76, valor: 74, wit: 74, gov: 66, retinue: 220, retTrain: 66, born: 1535 },
  { id: "hideyoshi2", name: "黒田職隆", faction: "akamatsu", y: 1552, at: "himeji",
    lead: 70, valor: 64, wit: 76, gov: 78, retinue: 180, retTrain: 60, born: 1524 },
  { id: "nagachika2", name: "明智秀満", faction: "ashikaga", y: 1570, at: "nijo",
    lead: 74, valor: 80, wit: 70, gov: 64, retinue: 160, retTrain: 66, born: 1536 },
  { id: "terumoto", name: "毛利輝元", faction: "mori", y: 1563, at: "koriyama_a",
    lead: 70, valor: 64, wit: 72, gov: 76, retinue: 300, retTrain: 66, born: 1553 },
  { id: "motoyasu_k", name: "小早川秀包", faction: "kobayakawa", y: 1567, at: "mihara",
    lead: 72, valor: 74, wit: 68, gov: 64, retinue: 200, retTrain: 66, born: 1567 },
  { id: "muneshige", name: "立花宗茂", faction: "otomo", y: 1580, at: "funai",
    lead: 88, valor: 90, wit: 82, gov: 74, retinue: 220, retTrain: 74, born: 1567 },
  { id: "jyoun", name: "高橋紹運", faction: "otomo", y: 1560, at: "iwaya",
    lead: 84, valor: 84, wit: 76, gov: 68, retinue: 280, retTrain: 70, born: 1548 },
  { id: "kanbei_k", name: "黒田孝高", faction: "akamatsu", y: 1562, at: "himeji",
    lead: 82, valor: 62, wit: 96, gov: 88, retinue: 160, retTrain: 64, born: 1546 },
  { id: "nobuchika_c", name: "長宗我部信親", faction: "chosokabe", y: 1580, at: "okou",
    lead: 78, valor: 84, wit: 70, gov: 66, retinue: 200, retTrain: 70, born: 1565 },
  { id: "hidekane", name: "立花直次", faction: "otomo", y: 1575, at: "usuki",
    lead: 74, valor: 76, wit: 70, gov: 66, retinue: 180, retTrain: 66, born: 1560 },
  { id: "masamune_d", name: "伊達政宗", faction: "date", y: 1581, at: "yonezawa",
    lead: 92, valor: 84, wit: 92, gov: 86, retinue: 240, retTrain: 72, born: 1567 },
  { id: "shigezane", name: "伊達成実", faction: "date", y: 1580, at: "shiroishi",
    lead: 82, valor: 88, wit: 72, gov: 66, retinue: 220, retTrain: 72, born: 1568 },
  { id: "naoe_k", name: "本庄顕長", faction: "date", y: 1570, at: "watari",
    lead: 70, valor: 72, wit: 64, gov: 60, retinue: 200, retTrain: 64, born: 1550 },
  { id: "mogami_x", name: "氏家守棟", faction: "mogami", y: 1560, at: "yamagata",
    lead: 70, valor: 64, wit: 80, gov: 76, retinue: 200, retTrain: 60, born: 1534 },
  { id: "n_mitsuharu", name: "明智秀満", faction: "oda", y: 1570, at: "nagoya",
    lead: 76, valor: 80, wit: 72, gov: 66, retinue: 180, retTrain: 66, born: 1536 },
  { id: "n_nagamasa_k", name: "加藤清正", faction: "oda", y: 1578, at: "nagoya",
    lead: 80, valor: 90, wit: 66, gov: 72, retinue: 180, retTrain: 70, born: 1562 },
  { id: "n_masanori", name: "福島正則", faction: "oda", y: 1578, at: "nagoya",
    lead: 76, valor: 90, wit: 58, gov: 58, retinue: 180, retTrain: 70, born: 1561 },
  { id: "n_mitsunari", name: "石田三成", faction: "oda", y: 1580, at: "nagoya",
    lead: 70, valor: 54, wit: 88, gov: 96, retinue: 160, retTrain: 62, born: 1560 },
  { id: "n_yoshitsugu", name: "大谷吉継", faction: "oda", y: 1580, at: "nagoya",
    lead: 78, valor: 66, wit: 88, gov: 88, retinue: 160, retTrain: 64, born: 1559 },
  { id: "n_nagamori", name: "増田長盛", faction: "oda", y: 1578, at: "nagoya",
    lead: 62, valor: 54, wit: 76, gov: 86, retinue: 140, retTrain: 58, born: 1545 },
  { id: "n_ieyasu2", name: "堀秀政", faction: "oda", y: 1572, at: "shobata",
    lead: 78, valor: 72, wit: 80, gov: 84, retinue: 170, retTrain: 66, born: 1553 },
  { id: "n_kazutoyo", name: "山内一豊", faction: "oda", y: 1573, at: "nagoya",
    lead: 70, valor: 72, wit: 68, gov: 76, retinue: 150, retTrain: 64, born: 1545 },
  { id: "n_toshimasa", name: "前田利長", faction: "oda", y: 1578, at: "nagoya",
    lead: 70, valor: 72, wit: 66, gov: 70, retinue: 170, retTrain: 66, born: 1562 },
  { id: "n_hidemasa", name: "蒲生氏郷", faction: "oda", y: 1573, at: "nagoya",
    lead: 84, valor: 84, wit: 80, gov: 84, retinue: 190, retTrain: 70, born: 1556 },
  { id: "n_takatora", name: "藤堂高虎", faction: "oda", y: 1580, at: "nagoya",
    lead: 78, valor: 78, wit: 80, gov: 84, retinue: 170, retTrain: 66, born: 1556 },
  { id: "n_nobutada", name: "織田信忠", faction: "oda", y: 1572, at: "nagoya",
    lead: 76, valor: 74, wit: 70, gov: 72, retinue: 240, retTrain: 68, born: 1557 },
  { id: "n_nobukatsu", name: "織田信雄", faction: "oda", y: 1574, at: "nagoya",
    lead: 56, valor: 58, wit: 54, gov: 58, retinue: 200, retTrain: 62, born: 1558 },
  { id: "n_nobutaka", name: "織田信孝", faction: "oda", y: 1574, at: "shobata",
    lead: 66, valor: 70, wit: 60, gov: 60, retinue: 180, retTrain: 64, born: 1558 },
  { id: "m_tadayo", name: "大久保忠世", faction: "matsudaira", y: 1558, at: "okazaki",
    lead: 74, valor: 78, wit: 70, gov: 66, retinue: 180, retTrain: 68, born: 1532 },
  { id: "m_masanobu", name: "本多正信", faction: "matsudaira", y: 1565, at: "okazaki",
    lead: 62, valor: 50, wit: 92, gov: 88, retinue: 140, retTrain: 58, born: 1538 },
  { id: "m_naomasa2", name: "鳥居元忠", faction: "matsudaira", y: 1558, at: "okazaki",
    lead: 74, valor: 82, wit: 64, gov: 62, retinue: 170, retTrain: 68, born: 1539 },
  { id: "m_yasushige", name: "高力清長", faction: "matsudaira", y: 1557, at: "okazaki",
    lead: 64, valor: 62, wit: 70, gov: 80, retinue: 150, retTrain: 60, born: 1530 },
  { id: "m_hidetada", name: "徳川秀忠", faction: "matsudaira", y: 1595, at: "okazaki",
    lead: 66, valor: 60, wit: 70, gov: 84, retinue: 200, retTrain: 64, born: 1579 },
  { id: "m_tadateru", name: "松平信康", faction: "matsudaira", y: 1573, at: "okazaki",
    lead: 74, valor: 80, wit: 66, gov: 62, retinue: 200, retTrain: 68, born: 1559 },
  { id: "t_masatoyo2", name: "武田信豊", faction: "takeda", y: 1566, at: "tsutsujigasaki",
    lead: 66, valor: 66, wit: 64, gov: 62, retinue: 180, retTrain: 62, born: 1550 },
  { id: "t_nobushige2", name: "一条信龍", faction: "takeda", y: 1556, at: "tsutsujigasaki",
    lead: 70, valor: 74, wit: 64, gov: 60, retinue: 190, retTrain: 64, born: 1539 },
  { id: "t_masakage2", name: "土屋昌続", faction: "takeda", y: 1561, at: "fukashi",
    lead: 72, valor: 76, wit: 68, gov: 62, retinue: 180, retTrain: 66, born: 1545 },
  { id: "n2_kagetora", name: "上杉景虎", faction: "nagao", y: 1570, at: "kasugayama",
    lead: 70, valor: 72, wit: 66, gov: 64, retinue: 200, retTrain: 66, born: 1554 },
  { id: "n2_shigeie", name: "新発田重家", faction: "agakita", y: 1563, at: "shibata",
    lead: 74, valor: 80, wit: 66, gov: 58, retinue: 200, retTrain: 66, born: 1547 },
  { id: "h2_ujikuni2", name: "北条氏忠", faction: "hojo", y: 1571, at: "odawara",
    lead: 66, valor: 68, wit: 64, gov: 62, retinue: 180, retTrain: 64, born: 1555 },
  { id: "h2_ujifusa", name: "北条氏房", faction: "hojo", y: 1581, at: "iwatsuki",
    lead: 66, valor: 68, wit: 64, gov: 62, retinue: 170, retTrain: 64, born: 1565 },
  { id: "mo_motoharu2", name: "吉川元長", faction: "mori", y: 1564, at: "sakurao",
    lead: 74, valor: 74, wit: 70, gov: 66, retinue: 200, retTrain: 66, born: 1548 },
  { id: "mo_takakage2", name: "小早川繁平", faction: "kobayakawa", y: 1576, at: "mihara",
    lead: 64, valor: 64, wit: 62, gov: 64, retinue: 180, retTrain: 62, born: 1560 },
  { id: "mo_hiroie", name: "吉川広家", faction: "mori", y: 1577, at: "sakurao",
    lead: 72, valor: 70, wit: 76, gov: 74, retinue: 190, retTrain: 66, born: 1561 },
  { id: "uk_naoie2", name: "宇喜多秀家", faction: "uragami", y: 1588, at: "ishiyama_bz",
    lead: 72, valor: 72, wit: 70, gov: 72, retinue: 200, retTrain: 66, born: 1572 },
  { id: "am_katsuhisa", name: "尼子勝久", faction: "amago", y: 1569, at: "gassan",
    lead: 66, valor: 68, wit: 64, gov: 60, retinue: 180, retTrain: 62, born: 1553 },
  { id: "am_shikanosuke", name: "山中鹿介", faction: "amago", y: 1561, at: "gassan",
    lead: 80, valor: 88, wit: 76, gov: 60, retinue: 180, retTrain: 70, born: 1545 },
  { id: "ck_chikamasa", name: "長宗我部親泰", faction: "chosokabe", y: 1559, at: "okou",
    lead: 74, valor: 74, wit: 72, gov: 68, retinue: 180, retTrain: 66, born: 1543 },
  { id: "ck_morichika", name: "長宗我部盛親", faction: "chosokabe", y: 1591, at: "okou",
    lead: 68, valor: 72, wit: 62, gov: 60, retinue: 190, retTrain: 64, born: 1575 },
  { id: "ot_yoshimune", name: "大友義統", faction: "otomo", y: 1574, at: "funai",
    lead: 58, valor: 58, wit: 58, gov: 62, retinue: 220, retTrain: 62, born: 1558 },
  { id: "ot_shigetane2", name: "吉弘鎮信", faction: "otomo", y: 1563, at: "funai",
    lead: 70, valor: 72, wit: 66, gov: 62, retinue: 180, retTrain: 64, born: 1547 },
  { id: "rz_masaie", name: "龍造寺政家", faction: "ryuzoji", y: 1572, at: "saga",
    lead: 60, valor: 60, wit: 60, gov: 62, retinue: 190, retTrain: 62, born: 1556 },
  { id: "sz_toyohisa", name: "島津豊久", faction: "shimazu", y: 1586, at: "shibushi",
    lead: 76, valor: 88, wit: 64, gov: 58, retinue: 180, retTrain: 70, born: 1570 },
  { id: "sz_tadatsune", name: "島津忠恒", faction: "shimazu", y: 1592, at: "uchijo",
    lead: 70, valor: 74, wit: 66, gov: 66, retinue: 190, retTrain: 66, born: 1576 },
  { id: "sr_yorifusa", name: "相良頼房", faction: "sagara", y: 1590, at: "hitoyoshi",
    lead: 66, valor: 68, wit: 64, gov: 62, retinue: 180, retTrain: 62, born: 1574 },
  { id: "it_sukekatsu", name: "伊東祐兵", faction: "ito", y: 1575, at: "sadowara",
    lead: 66, valor: 70, wit: 64, gov: 62, retinue: 170, retTrain: 62, born: 1559 },
  { id: "dt_kagetsuna2", name: "伊達実元", faction: "date", y: 1553, at: "yonezawa",
    lead: 68, valor: 70, wit: 66, gov: 64, retinue: 190, retTrain: 64, born: 1527 },
  { id: "mg_yoshiaki2", name: "最上義康", faction: "mogami", y: 1591, at: "yamagata",
    lead: 66, valor: 68, wit: 64, gov: 62, retinue: 180, retTrain: 64, born: 1575 },
  { id: "nb_toshinao", name: "南部利直", faction: "nanbu", y: 1592, at: "sannohe",
    lead: 68, valor: 68, wit: 68, gov: 70, retinue: 190, retTrain: 64, born: 1576 },
  { id: "or_nobuhira", name: "津軽信枚", faction: "oura", y: 1602, at: "oura",
    lead: 66, valor: 66, wit: 68, gov: 70, retinue: 180, retTrain: 62, born: 1586 },
  { id: "as_moritaka", name: "蘆名盛隆", faction: "ashina", y: 1577, at: "kurokawa",
    lead: 64, valor: 64, wit: 66, gov: 66, retinue: 180, retTrain: 62, born: 1561 },
  { id: "hm_kanetsugu2", name: "本庄繁長", faction: "agakita", y: 1556, at: "murakami",
    lead: 78, valor: 84, wit: 68, gov: 60, retinue: 200, retTrain: 68, born: 1540 },
  { id: "e_tadaoki", name: "細川忠興", faction: "ashikaga", y: 1578, at: "nijo",
    lead: 78, valor: 80, wit: 76, gov: 74, retinue: 190, retTrain: 68, born: 1563 },
  { id: "e_yukinaga", name: "小西行長", faction: "oda", y: 1580, at: "nagoya",
    lead: 72, valor: 66, wit: 80, gov: 80, retinue: 170, retTrain: 64, born: 1558 },
  { id: "e_masamune2", name: "伊達宗実", faction: "date", y: 1595, at: "yonezawa",
    lead: 70, valor: 74, wit: 64, gov: 60, retinue: 180, retTrain: 64, born: 1580 },
  { id: "e_kagekatsu2", name: "上杉定勝", faction: "nagao", y: 1620, at: "kasugayama",
    lead: 64, valor: 62, wit: 66, gov: 70, retinue: 190, retTrain: 62, born: 1604 },
  { id: "e_yoshinao", name: "徳川義直", faction: "matsudaira", y: 1615, at: "okazaki",
    lead: 66, valor: 64, wit: 70, gov: 74, retinue: 200, retTrain: 64, born: 1601 },
  { id: "e_yorinobu", name: "徳川頼宣", faction: "matsudaira", y: 1616, at: "okazaki",
    lead: 70, valor: 70, wit: 68, gov: 72, retinue: 200, retTrain: 64, born: 1602 },
  { id: "e_yorifusa", name: "徳川頼房", faction: "matsudaira", y: 1618, at: "okazaki",
    lead: 68, valor: 68, wit: 70, gov: 74, retinue: 200, retTrain: 64, born: 1603 },
  { id: "e_masayuki", name: "保科正之", faction: "matsudaira", y: 1626, at: "okazaki",
    lead: 72, valor: 60, wit: 82, gov: 92, retinue: 200, retTrain: 62, born: 1611 },
  { id: "e_iemitsu", name: "徳川家光", faction: "matsudaira", y: 1618, at: "okazaki",
    lead: 68, valor: 64, wit: 70, gov: 80, retinue: 220, retTrain: 64, born: 1604 },
  { id: "e_tadanaga", name: "徳川忠長", faction: "matsudaira", y: 1620, at: "okazaki",
    lead: 60, valor: 66, wit: 56, gov: 58, retinue: 190, retTrain: 62, born: 1606 },
  { id: "e_naotaka", name: "井伊直孝", faction: "matsudaira", y: 1605, at: "okazaki",
    lead: 78, valor: 80, wit: 72, gov: 72, retinue: 190, retTrain: 68, born: 1590 },
  { id: "e_masazumi", name: "本多正純", faction: "matsudaira", y: 1580, at: "okazaki",
    lead: 64, valor: 54, wit: 84, gov: 82, retinue: 150, retTrain: 58, born: 1565 },
  { id: "e_tadakatsu2", name: "本多忠政", faction: "matsudaira", y: 1590, at: "okazaki",
    lead: 70, valor: 74, wit: 64, gov: 64, retinue: 180, retTrain: 66, born: 1575 },
  { id: "e_yasukatsu", name: "榊原康勝", faction: "matsudaira", y: 1605, at: "okazaki",
    lead: 68, valor: 72, wit: 64, gov: 62, retinue: 180, retTrain: 64, born: 1590 },
  { id: "e_masanori2", name: "水野勝成", faction: "mizuno", y: 1580, at: "kariya",
    lead: 76, valor: 84, wit: 68, gov: 68, retinue: 170, retTrain: 68, born: 1564 },
  { id: "e_muneshige2", name: "高橋直次", faction: "otomo", y: 1585, at: "funai",
    lead: 74, valor: 78, wit: 68, gov: 64, retinue: 180, retTrain: 66, born: 1570 },
  { id: "e_kiyomasa2", name: "加藤忠広", faction: "oda", y: 1616, at: "nagoya",
    lead: 60, valor: 62, wit: 58, gov: 60, retinue: 180, retTrain: 62, born: 1601 },
  { id: "e_tadatoshi", name: "細川忠利", faction: "ashikaga", y: 1601, at: "nijo",
    lead: 70, valor: 68, wit: 72, gov: 76, retinue: 180, retTrain: 64, born: 1586 },
  { id: "e_yoshihiro2", name: "島津久信", faction: "shimazu", y: 1615, at: "uchijo",
    lead: 64, valor: 66, wit: 64, gov: 66, retinue: 190, retTrain: 64, born: 1600 },
  { id: "e_mitsuhisa", name: "島津光久", faction: "shimazu", y: 1631, at: "uchijo",
    lead: 66, valor: 66, wit: 68, gov: 72, retinue: 190, retTrain: 64, born: 1616 },
  { id: "e_terumoto2", name: "毛利秀就", faction: "mori", y: 1610, at: "koriyama_a",
    lead: 62, valor: 62, wit: 64, gov: 68, retinue: 190, retTrain: 62, born: 1595 },
  { id: "e_hidemoto", name: "毛利秀元", faction: "mori", y: 1594, at: "koriyama_a",
    lead: 74, valor: 74, wit: 74, gov: 72, retinue: 190, retTrain: 66, born: 1579 },
  { id: "e_nagamasa2", name: "黒田長政", faction: "akamatsu", y: 1583, at: "himeji",
    lead: 78, valor: 80, wit: 74, gov: 74, retinue: 180, retTrain: 68, born: 1568 },
  { id: "e_tadayuki", name: "黒田忠之", faction: "akamatsu", y: 1617, at: "himeji",
    lead: 60, valor: 62, wit: 58, gov: 60, retinue: 180, retTrain: 60, born: 1602 },
  { id: "e_katsushige", name: "鍋島勝茂", faction: "ryuzoji", y: 1595, at: "saga",
    lead: 68, valor: 68, wit: 70, gov: 74, retinue: 180, retTrain: 64, born: 1580 },
  { id: "e_toshitsune", name: "前田利常", faction: "oda", y: 1608, at: "nagoya",
    lead: 70, valor: 66, wit: 78, gov: 84, retinue: 190, retTrain: 64, born: 1594 },
  { id: "e_masamune3", name: "伊達忠宗", faction: "date", y: 1615, at: "yonezawa",
    lead: 66, valor: 64, wit: 68, gov: 74, retinue: 190, retTrain: 62, born: 1600 },
  { id: "e_kanetsugu3", name: "直江勝吉", faction: "nagao", y: 1585, at: "yoita",
    lead: 68, valor: 66, wit: 72, gov: 74, retinue: 170, retTrain: 64, born: 1570 },
  { id: "e_shigenaga", name: "本庄充長", faction: "agakita", y: 1585, at: "murakami",
    lead: 70, valor: 74, wit: 64, gov: 60, retinue: 180, retTrain: 64, born: 1570 },
  { id: "e_yoshiaki3", name: "最上家親", faction: "mogami", y: 1597, at: "yamagata",
    lead: 64, valor: 64, wit: 64, gov: 66, retinue: 180, retTrain: 62, born: 1582 },
  { id: "e_masamune4", name: "南部重直", faction: "nanbu", y: 1620, at: "sannohe",
    lead: 64, valor: 64, wit: 66, gov: 68, retinue: 180, retTrain: 62, born: 1606 },
  { id: "e_nobuyoshi", name: "津軽信義", faction: "oura", y: 1634, at: "oura",
    lead: 62, valor: 62, wit: 64, gov: 66, retinue: 180, retTrain: 60, born: 1619 },
  { id: "e_shiro", name: "天草四郎", faction: "ikko", y: 1637, at: "nagashima",
    lead: 70, valor: 66, wit: 80, gov: 66, retinue: 160, retTrain: 64, born: 1621 },
  { id: "e_munefusa", name: "松倉勝家", faction: "arima", y: 1630, at: "hinoe",
    lead: 52, valor: 58, wit: 50, gov: 48, retinue: 170, retTrain: 58, born: 1597 },
  { id: "e_nobutsuna", name: "松平信綱", faction: "matsudaira", y: 1630, at: "okazaki",
    lead: 68, valor: 56, wit: 88, gov: 92, retinue: 180, retTrain: 60, born: 1596 },
  { id: "e_masatoshi", name: "堀田正俊", faction: "matsudaira", y: 1650, at: "okazaki",
    lead: 64, valor: 58, wit: 76, gov: 82, retinue: 170, retTrain: 58, born: 1634 },
  { id: "e_mitsukuni", name: "徳川光圀", faction: "matsudaira", y: 1643, at: "okazaki",
    lead: 66, valor: 60, wit: 80, gov: 84, retinue: 180, retTrain: 60, born: 1628 },
  { id: "e_tsunayoshi", name: "徳川綱吉", faction: "matsudaira", y: 1661, at: "okazaki",
    lead: 58, valor: 54, wit: 70, gov: 72, retinue: 190, retTrain: 58, born: 1646 },
  { id: "e_yoshiyasu", name: "柳沢吉保", faction: "matsudaira", y: 1673, at: "okazaki",
    lead: 58, valor: 52, wit: 80, gov: 82, retinue: 160, retTrain: 56, born: 1658 },
  { id: "e_hakuseki", name: "新井白石", faction: "matsudaira", y: 1672, at: "okazaki",
    lead: 56, valor: 46, wit: 88, gov: 86, retinue: 120, retTrain: 52, born: 1657 },
  { id: "e_yoshimune", name: "徳川吉宗", faction: "matsudaira", y: 1699, at: "okazaki",
    lead: 76, valor: 70, wit: 82, gov: 90, retinue: 200, retTrain: 62, born: 1684 },
  { id: "e_kuranosuke", name: "大石内蔵助", faction: "akamatsu", y: 1674, at: "ojio",
    lead: 72, valor: 66, wit: 84, gov: 76, retinue: 150, retTrain: 62, born: 1659 },
  { id: "e_naganori", name: "浅野長矩", faction: "akamatsu", y: 1682, at: "ojio",
    lead: 58, valor: 62, wit: 54, gov: 58, retinue: 170, retTrain: 58, born: 1667 },
  { id: "e_kozukenosuke", name: "吉良義央", faction: "matsudaira", y: 1656, at: "okazaki",
    lead: 56, valor: 50, wit: 72, gov: 70, retinue: 140, retTrain: 54, born: 1641 },
  { id: "e_soan", name: "角倉素庵", faction: "ashikaga", y: 1590, at: "nijo",
    lead: 56, valor: 44, wit: 84, gov: 88, retinue: 120, retTrain: 50, born: 1571 },
  { id: "e_ryoi", name: "角倉了以", faction: "ashikaga", y: 1570, at: "nijo",
    lead: 58, valor: 46, wit: 86, gov: 86, retinue: 120, retTrain: 50, born: 1554 },
  { id: "e_sokun", name: "島井宗室", faction: "ouchi", y: 1560, at: "tachibanayama",
    lead: 54, valor: 44, wit: 82, gov: 84, retinue: 110, retTrain: 48, born: 1539 },
  { id: "e_soshitsu", name: "神屋宗湛", faction: "ouchi", y: 1568, at: "tachibanayama",
    lead: 54, valor: 42, wit: 84, gov: 86, retinue: 110, retTrain: 48, born: 1553 },
  { id: "e_rikyu", name: "千利休", faction: "miyoshi", y: 1537, at: "ishiyama",
    lead: 52, valor: 40, wit: 86, gov: 80, retinue: 100, retTrain: 46, born: 1522 },
  { id: "e_sokei", name: "津田宗及", faction: "miyoshi", y: 1560, at: "ishiyama",
    lead: 52, valor: 40, wit: 82, gov: 80, retinue: 100, retTrain: 46, born: 1545 },
  { id: "e_musashi", name: "宮本武蔵", faction: "akamatsu", y: 1599, at: "himeji",
    lead: 68, valor: 96, wit: 72, gov: 52, retinue: 140, retTrain: 72, born: 1584 },
  { id: "e_munenori", name: "柳生宗矩", faction: "tsutsui", y: 1586, at: "koriyama",
    lead: 70, valor: 88, wit: 78, gov: 70, retinue: 150, retTrain: 70, born: 1571 },
  { id: "e_sekishusai", name: "柳生宗厳", faction: "tsutsui", y: 1543, at: "koriyama",
    lead: 70, valor: 92, wit: 72, gov: 62, retinue: 160, retTrain: 72, born: 1529 },
  { id: "e_bokuden", name: "塚原卜伝", faction: "satake", y: 1504, at: "ota_hitachi",
    lead: 70, valor: 94, wit: 76, gov: 58, retinue: 150, retTrain: 72, born: 1489 },
  { id: "e_ittosai", name: "伊藤一刀斎", faction: "hojo", y: 1565, at: "odawara",
    lead: 66, valor: 92, wit: 70, gov: 54, retinue: 130, retTrain: 70, born: 1550 },
  { id: "junkei", name: "筒井順慶", faction: "tsutsui", y: 1564, at: "takatori",
    lead: 76, valor: 66, wit: 78, gov: 76, retinue: 180, retTrain: 58, born: 1549 },
  { id: "saika3", name: "鈴木重朝", faction: "saika", y: 1561, at: "saika",
    lead: 72, valor: 78, wit: 70, gov: 58, retinue: 200, retTrain: 66, born: 1546 },
  { id: "nagano2", name: "長野業盛", faction: "nagano_k", y: 1561, at: "minowa",
    lead: 72, valor: 74, wit: 66, gov: 62, retinue: 200, retTrain: 64, born: 1546 },
  { id: "yura2", name: "由良国繁", faction: "yura", y: 1564, at: "kanayama",
    lead: 66, valor: 68, wit: 62, gov: 60, retinue: 200, retTrain: 60, born: 1549 },
  { id: "sogo2", name: "十河存保", faction: "miyoshi", y: 1564, at: "sogo",
    lead: 74, valor: 78, wit: 64, gov: 58, retinue: 200, retTrain: 62, born: 1549 },
  { id: "iehisa", name: "島津家久", faction: "shimazu", y: 1562, at: "shibushi",
    lead: 84, valor: 86, wit: 88, gov: 64, retinue: 200, retTrain: 68, born: 1547 },
  { id: "w_yura_a", name: "安宅信康", faction: "miyoshi", y: 1561, at: "yura",
    lead: 66, valor: 66, wit: 62, gov: 58, retinue: 240, retTrain: 60, born: 1546 },
  { id: "w_shimofuri", name: "内藤隆春", faction: "ouchi", y: 1562, at: "shimofuri",
    lead: 68, valor: 66, wit: 66, gov: 64, retinue: 240, retTrain: 60, born: 1547 },
  { id: "kagetsuna", name: "片倉景綱", faction: "date", y: 1564, at: "yonezawa",
    lead: 74, valor: 66, wit: 84, gov: 80, retinue: 180, retTrain: 62, born: 1549 },
  { id: "nobunao", name: "南部信直", faction: "nanbu", y: 1561, at: "kozukata",
    lead: 76, valor: 70, wit: 76, gov: 74, retinue: 220, retTrain: 62, born: 1546 },
  { id: "tamenobu", name: "大浦為信", faction: "oura", y: 1564, at: "oura",
    lead: 84, valor: 78, wit: 88, gov: 76, retinue: 240, retTrain: 64, born: 1549 },
  { id: "yoshiaki_m", name: "最上義光", faction: "mogami", y: 1561, at: "yamagata",
    lead: 88, valor: 80, wit: 90, gov: 82, retinue: 200, retTrain: 64, born: 1546 },
  { id: "kakizaki2", name: "蠣崎慶広", faction: "kakizaki", y: 1563, at: "hakodate",
    lead: 70, valor: 66, wit: 76, gov: 72, retinue: 200, retTrain: 58, born: 1548 },
  { id: "ag_murakami2", name: "色部長実", faction: "agakita", y: 1562, at: "murakami",
    lead: 68, valor: 70, wit: 64, gov: 60, retinue: 240, retTrain: 60, born: 1547 },
  { id: "ms_miyake2", name: "益田元祥", faction: "masuda", y: 1562, at: "miyake",
    lead: 68, valor: 66, wit: 70, gov: 70, retinue: 240, retTrain: 60, born: 1547 },
  { id: "az_akizuki2", name: "秋月種実", faction: "akizuki", y: 1562, at: "akizuki",
    lead: 70, valor: 70, wit: 68, gov: 62, retinue: 240, retTrain: 60, born: 1547 },
  { id: "tadashige", name: "水野忠重", faction: "mizuno", y: 1556, at: "kariya",
    lead: 64, valor: 72, wit: 54, gov: 52, retinue: 200, retTrain: 58, born: 1541 },
  { id: "tsunanari2", name: "北条氏規", faction: "hojo", y: 1560, at: "nirayama",
    lead: 74, valor: 68, wit: 78, gov: 80, retinue: 200, retTrain: 66, born: 1545 },
  { id: "yoshitaka", name: "九鬼嘉隆", faction: "kuki", y: 1557, at: "toba",
    lead: 80, valor: 78, wit: 76, gov: 62, retinue: 200, retTrain: 68, born: 1542 },
  { id: "ujiteru", name: "北条氏照", faction: "hojo", y: 1555, at: "takiyama",
    lead: 80, valor: 76, wit: 76, gov: 72, retinue: 300, retTrain: 68, born: 1540 },
  { id: "ujikuni", name: "北条氏邦", faction: "hojo", y: 1556, at: "hachigata",
    lead: 78, valor: 78, wit: 72, gov: 70, retinue: 280, retTrain: 68, born: 1541 },
  { id: "hisamichi", name: "松永久通", faction: "miyoshi", y: 1558, at: "shigisan",
    lead: 62, valor: 64, wit: 66, gov: 58, retinue: 180, retTrain: 58, born: 1543 },
  { id: "tsutsui2", name: "島清興", faction: "tsutsui", y: 1555, at: "koriyama",
    lead: 84, valor: 88, wit: 80, gov: 64, retinue: 200, retTrain: 68, born: 1540 },
  { id: "motochika", name: "長宗我部元親", faction: "chosokabe", y: 1554, at: "okou",
    lead: 90, valor: 84, wit: 88, gov: 80, retinue: 220, retTrain: 68, born: 1539 },
  { id: "terumune", name: "伊達輝宗", faction: "date", y: 1559, at: "yonezawa",
    lead: 76, valor: 68, wit: 78, gov: 80, retinue: 220, retTrain: 62, born: 1544 },
  { id: "chikasue", name: "安東愛季", faction: "ando", y: 1554, at: "minato",
    lead: 84, valor: 74, wit: 86, gov: 82, retinue: 240, retTrain: 62, born: 1539 },
  { id: "t_katsuyama2", name: "小山田信茂", faction: "takeda", y: 1554, at: "katsuyama_k",
    lead: 74, valor: 76, wit: 70, gov: 64, retinue: 240, retTrain: 64, born: 1539 },
  { id: "s_uozu2", name: "河田長親", faction: "shiina", y: 1558, at: "uozu",
    lead: 70, valor: 68, wit: 72, gov: 68, retinue: 230, retTrain: 62, born: 1543 },
  { id: "mm_matsuyama2", name: "三村元親", faction: "mimura", y: 1557, at: "matsuyama_bc",
    lead: 70, valor: 72, wit: 64, gov: 60, retinue: 250, retTrain: 62, born: 1542 },
  { id: "nj_uyui2", name: "南条元続", faction: "nanjo", y: 1555, at: "uyui",
    lead: 66, valor: 68, wit: 62, gov: 58, retinue: 240, retTrain: 60, born: 1540 },
  { id: "si_itajima3", name: "土居清良", faction: "saionji", y: 1560, at: "itajima",
    lead: 70, valor: 74, wit: 66, gov: 58, retinue: 240, retTrain: 62, born: 1545 },
  { id: "sr_yatsushiro2", name: "丸目長恵", faction: "sagara", y: 1555, at: "yatsushiro",
    lead: 68, valor: 78, wit: 62, gov: 54, retinue: 240, retTrain: 64, born: 1540 },
  { id: "kh_kunohe2", name: "九戸実親", faction: "kunohe", y: 1555, at: "kunohe",
    lead: 66, valor: 70, wit: 62, gov: 56, retinue: 240, retTrain: 62, born: 1540 },
  { id: "td_tendo2", name: "天童頼澄", faction: "tendo", y: 1555, at: "tendo",
    lead: 64, valor: 66, wit: 60, gov: 58, retinue: 240, retTrain: 60, born: 1540 },
  { id: "tm_miharu2", name: "田村清顕", faction: "tamura", y: 1555, at: "miharu",
    lead: 66, valor: 68, wit: 62, gov: 58, retinue: 240, retTrain: 60, born: 1540 },
];
// その年に世に出る者を招く。仕えるべき家が滅んでいれば、代わりにその城の主へ仕える。
function emergeGenerals(s) {
  const out = [];
  for (const n of NEWCOMERS) {
    if (s.year < n.y) continue;
    if (s.generals.some((x) => x.id === n.id)) continue;
    if ((s.emerged || []).includes(n.id)) continue;
    const home = s.castles.find((c) => c.id === n.at);
    if (!home) continue;
    // 元の家が城を失っていれば、いまその城を持つ家に仕える
    const fid = home.faction;
    const gen = {
      id: n.id, name: n.name, faction: fid, lead: n.lead, valor: n.valor, wit: n.wit, gov: n.gov,
      loyal: fid === n.faction ? 78 : 58, age: s.year - n.born, at: home.id,
      retinue: n.retinue, retTrain: n.retTrain,
      unity: clamp(n.retTrain + 8, 30, 100), merit: 0,
      fief: Math.round(fiefWanted(n) * 0.7),
      rost: newRoster(n.retinue, `ret-${n.id}`),
    };
    s.generals.push(gen);
    s.emerged = [...(s.emerged || []), n.id];
    out.push(`${gen.name}が${s.factions[fid].name}に仕えた（${home.name}）。`);
  }
  return out;
}

/* ------------------------------------------------- 国ごとの石高の限り
   開墾できる土地には限りがある。上限は慶長三年（1598）の検地に拠る。
   尾張 571,737石／美濃 540,000石／三河 290,715石。
   （数値は慶長三年大名帳による。手元に原典がないため、細部に誤りがありうる。） */
// 城ごとの限りは拠点定義に kokuCap として持たせてある（慶長三年の検地に拠る）。
const PROVINCE_KOKU = {"尾張": 571737, "美濃": 540000, "三河": 290715, "遠江": 255160, "駿河": 150000, "伊豆": 69832, "伊勢": 567105, "志摩": 17854, "近江": 775379, "若狭": 85099, "越前": 499411, "飛騨": 38000, "信濃": 408358, "甲斐": 227616, "山城": 225262, "大和": 448945, "河内": 242105, "和泉": 141512, "摂津": 356069, "伊賀": 100000, "紀伊": 243550, "丹波": 263887, "丹後": 110784, "但馬": 114235, "播磨": 358534, "加賀": 355570, "能登": 210000, "越中": 380298, "越後": 390770, "上野": 496377, "武蔵": 667126, "相模": 194304, "下野": 374083, "常陸": 530008, "安房": 45045, "上総": 378892, "下総": 393255, "淡路": 62104, "阿波": 183500, "讃岐": 126200, "伊予": 366200, "土佐": 98200, "備前": 223762, "美作": 186018, "備中": 176929, "備後": 186150, "安芸": 194150, "周防": 167820, "長門": 130660, "石見": 111770, "出雲": 186650, "伯耆": 100947, "因幡": 88500, "隠岐": 4980, "筑前": 336000, "筑後": 265998, "豊前": 140000, "豊後": 418313, "肥前": 309935, "肥後": 341220, "日向": 120088, "薩摩": 283482, "大隅": 175057, "壱岐": 15000, "対馬": 10000, "陸奥": 1672806, "出羽": 318000, "佐渡": 17030, "蝦夷": 78000, "琉球": 89086};

// 名のある将を置いていない城には城代を据える。無人の城があると出陣も守備も成り立たない。
const KEEPER_NAMES = ["城代", "留守居", "番頭", "代官"];
function fillKeepers(castles, generals) {
  const out = [...generals];
  for (const c of castles) {
    if (out.some((g) => g.at === c.id && g.faction === c.faction)) continue;
    const k = Math.abs(c.id.split("").reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
    const nm = `${c.name.replace(/城$|御堂$|館$|本願寺$/, "")}${KEEPER_NAMES[k % KEEPER_NAMES.length]}`;
    out.push({
      id: `keeper-${c.id}`, name: nm, faction: c.faction,
      lead: 52 + (k % 13), valor: 50 + (k % 15), wit: 46 + (k % 12), gov: 50 + (k % 14),
      loyal: 74 + (k % 16), age: 30 + (k % 22), at: c.id,
      retinue: Math.round(140 + (c.koku / 10000) * 22), retTrain: 52 + (k % 10),
    });
  }
  return out;
}
// 城を預かる者には城主相応の知行を与える。
// 城を任されながら物頭のまま、というのは筋が通らない。
function assignRanks(castles, generals) {
  // 家中の格を定める。城の数だけ家老を立て、当主のいる城は当主が預かる。
  for (const fid of [...new Set(castles.map((c) => c.faction))]) {
    const cs = castles.filter((c) => c.faction === fid);
    const gs = generals.filter((g) => g.faction === fid);
    if (!cs.length || !gs.length) continue;
    const lord = gs.find((g) => g.lord);
    // 当主が座す城を除いた数だけ、家老が要る
    const seatId = lord ? lord.at : null;
    const need = cs.filter((c) => c.id !== seatId).length;
    // 城ごとに、その城の筆頭を家老に立てる
    for (const c of cs) {
      if (c.id === seatId) continue;
      const here = gs.filter((g) => g.at === c.id && !g.lord);
      if (!here.length) continue;
      const head = [...here].sort((a, b) =>
        (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))[0];
      // 家老の禄高に届くだけの知行を与える。城が小さければ届かぬこともある。
      // 余禄の分け前を見込んで逆算する。
      const extra = extraIncome(c);
      const others = here.filter((x) => x !== head).reduce((t, x) => t + (x.fief || 0), 0);
      let want = Math.max(head.fief || 0, 1000);
      for (let i = 0; i < 40; i++) {
        const total = others + want;
        const got = want + (total > 0 ? extra * (want / total) : 0);
        if (got >= 8400) break;
        want = Math.round(want * 1.15) + 300;
        if (want > c.koku * 0.75) break;
      }
      head.fief = want;
    }
    // 当主の知行は家の身代。石高に見合う高を持たせる。
    if (lord) {
      const koku = cs.reduce((t, c) => t + c.koku, 0);
      lord.fief = Math.max(lord.fief || 0, Math.round(koku * 0.22));
    }
    // 宿老は、城を預かる家老の中から選ぶ。城を持たぬ者が宿老になるのは筋が違う。
    // 一城のみの家に宿老は要らない。
    const heads = cs.filter((c) => c.id !== seatId).map((c) => {
      const here = gs.filter((g) => g.at === c.id && !g.lord);
      return here.length
        ? [...here].sort((a, b) => (b.fief || 0) - (a.fief || 0))[0] : null;
    }).filter(Boolean);
    const nSenior = cs.length >= 4 ? Math.max(1, Math.floor(cs.length / 4)) : 0;
    [...heads].sort((a, b) => (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))
      .slice(0, nSenior)
      .forEach((g) => {
        const c = castles.find((x) => x.id === g.at);
        if (!c) return;
        const extra = extraIncome(c);
        const here = gs.filter((x) => x.at === c.id && !x.lord && x !== g);
        const others = here.reduce((t, x) => t + (x.fief || 0), 0);
        let want = g.fief || 0;
        for (let i = 0; i < 40; i++) {
          const total = others + want;
          const got = want + (total > 0 ? extra * (want / total) : 0);
          if (got >= 20600) break;
          want = Math.round(want * 1.12) + 500;
          if (want > c.koku * 0.8) break;
        }
        g.fief = want;
      });
  }
  // 幼き当主には後見を立てる（GDD 6.6）
  for (const fid of [...new Set(castles.map((c) => c.faction))]) {
    const lord = generals.find((g) => g.lord && g.faction === fid);
    if (!lord || (lord.age || 30) >= 15) continue;
    let kin = generals.filter((g) => g.faction === fid && g.id !== lord.id && (g.age || 0) >= 25);
    if (!kin.length) kin = generals.filter((g) => g.faction === fid && g.id !== lord.id && (g.age || 0) >= 18);
    if (!kin.length) continue;
    const sur = lord.name.slice(0, 2);
    const pick = [...kin].sort((a, b) =>
      (b.name.startsWith(sur) ? 1 : 0) - (a.name.startsWith(sur) ? 1 : 0)
      || (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))[0];
    lord.guardian = pick.id;
    pick.at = lord.at;                       // 後見は当主のもとに詰める
  }
  // 当主の子には家格に応じた知行を宛がう
  for (const c of castles) {
    const lord = generals.find((g) => g.lord && g.faction === c.faction);
    if (!lord) continue;
    const kids = generals.filter((g) => PARENT[g.id] === lord.id && g.at === c.id && !g.lord);
    if (!kids.length) continue;
    const sorted = [...kids].sort((a, b) => (b.age || 0) - (a.age || 0));
    sorted.forEach((k, i) => {
      const floor = i === 0 ? Math.round(c.koku * 0.10) : Math.round(c.koku * 0.055);
      k.fief = Math.max(k.fief || 0, floor);
    });
  }
  // 城ごとに、配った知行が石高の八割を超えぬよう収める（当主の分は御料なので除く）
  for (const c of castles) {
    const gs2 = generals.filter((g) => g.at === c.id && g.faction === c.faction && !g.lord);
    const room = Math.round(c.koku * 0.8);
    let sum = gs2.reduce((a, g) => a + (g.fief || 0), 0);
    if (sum > room && sum > 0) {
      const k = room / sum;
      for (const g of gs2) g.fief = Math.round((g.fief || 0) * k);
    }
  }
  return generals;
}
function assignKokuCap(castles) {
  for (const c of castles) {
    if (c.kokuCap == null) c.kokuCap = Math.round(c.kokuMax * 1.2);
    c.province = c.kuni || null;
  }
  return castles;
}

// 城下に着いたときの献策。寡兵であり、策を献じうる者がいるときに限る。
function ambushPlan(g, army, dest) {
  const atkIsPlayer = army.faction === g.player;
  const mine = atkIsPlayer
    ? army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean)
    : g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive);
  const theirs = atkIsPlayer
    ? g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive)
    : army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
  if (!mine.length || !theirs.length) return null;
  const myMen = atkIsPlayer ? army.men : dest.local + mine.reduce((a, x) => a + x.retinue, 0);
  const foeMen = atkIsPlayer ? dest.local + theirs.reduce((a, x) => a + x.retinue, 0) : army.men;
  const ratio = myMen / Math.max(1, foeMen);
  if (ratio > 0.62) return null;                       // 互角に近ければ正面から当たる
  const head = [...mine].sort((a, b) => (b.wit + b.lead) - (a.wit + a.lead))[0];
  if (!head || head.wit < 62) return null;             // 策を献じうる者がおらぬ
  const wx = g.weather || "晴";
  const terr = (dest.kuni === "信濃" || dest.kuni === "甲斐" || dest.kuni === "飛騨") ? "hill" : "forest";
  const p = ambushChance(head, wx, terr, ratio);
  if (p < 0.06) return null;
  const lord = [...theirs].sort((a, b) => (b.lord ? 1 : 0) - (a.lord ? 1 : 0) || b.lead - a.lead)[0];
  return { head, target: lord, p, myMen: Math.round(myMen), foeMen: Math.round(foeMen), weather: wx, terr, ratio };
}

/* -------------------------------------------------- 名の伝わらぬ者
   在地の長や、記録に名の残らぬ者は、地名に「乙名」「按司」などを添えて示す。
   これらは実在の人名ではなく、その地の長を指す呼び名である。
   武将の欄では小さく「伝」と添えて、史実の人物と区別できるようにする。 */
const NAMELESS = /乙名$|按司$|城代$|留守居$|番頭$|代官$/;
const isNameless = (g) => !!g && NAMELESS.test(g.name || "");

/* ------------------------------------------- 家の滅亡と戦後の始末（GDD 12.4）
   すべての城を失えば、家は滅びる。
   残った当主と家臣の身の振り方は、勝った側が決める。 */
// 滅んだ家の者を集める。当主と家臣を分けて返す。
function ruinedHouse(s, fid) {
  const all = s.generals.filter((x) => x.faction === fid && !x.captive);
  const lord = all.find((x) => x.lord) || null;
  return { lord, retainers: all.filter((x) => x !== lord) };
}
// 血縁か。姓の二字が同じなら血縁とみなす。
const isKin = (a, b) => !!a && !!b && a.name.slice(0, 2) === b.name.slice(0, 2);
// 登用できるか。旧主と血を分けた者、旧主への忠誠が篤い者は靡かない。
function canRecruit(gen, lord) {
  if (!gen) return { ok: false, why: "" };
  if (lord && isKin(gen, lord)) return { ok: false, why: `${lord.name}と血を分けた一門。旧主を捨てて仕えることはない` };
  const loy = gen.loyal == null ? 60 : gen.loyal;
  if (loy >= 95) return { ok: false, why: `旧主への忠誠${Math.round(loy)}。二君に仕える気はないという` };
  return { ok: true, why: "" };
}
// 登用したときの、新しい主への忠誠。旧主に篤かった者ほど、新主には冷たい。
function loyaltyAfterRecruit(gen) {
  const loy = gen.loyal == null ? 60 : gen.loyal;
  return clamp(Math.round(88 - loy * 0.62), 24, 78);
}
// 捕虜とする。戦後の始末を経た者は、月ごとに心を開いていく。
function takeAsPrisoner(s, gen, winner, castleId) {
  const g2 = s.generals.find((x) => x.id === gen.id);
  if (!g2) return;
  g2.captive = { by: winner, from: g2.faction, at: castleId, since: { y: s.year, m: s.month }, ruin: true };
  g2.warLoyal = 0;                  // 勝った家への忠誠。ここから積み上げる。
  g2.retinue = Math.round(g2.retinue * 0.25);
  g2.at = castleId;
}

/* ------------------------------------------------ 検地（GDD 4.6）
   検地は一国を丸ごと押さえてはじめて行える。
   国境をまたいで竿を入れることはできず、他家の城が一つでも残っていれば、
   その国の帳簿は改まらない。
   竿を入れれば実りが正しく改まり、石高の限りが伸びる。
   ただし民には厳しい沙汰であり、民忠は下がる。 */
// その国を丸ごと押さえているか
function holdsProvince(s, fid, kuni) {
  const cs = s.castles.filter((c) => c.kuni === kuni);
  return cs.length > 0 && cs.every((c) => c.faction === fid);
}
// その家が丸ごと押さえている国の一覧
function provincesHeld(s, fid) {
  const out = [];
  for (const kuni of [...new Set(s.castles.map((c) => c.kuni))]) {
    if (kuni && holdsProvince(s, fid, kuni)) out.push(kuni);
  }
  return out;
}
// まだ検地を入れていない国
const kenchiDone = (s, kuni) => (s.kenchi || []).includes(kuni);
function kenchiCost(s, kuni) {
  const cs = s.castles.filter((c) => c.kuni === kuni);
  const koku = cs.reduce((a, c) => a + c.koku, 0);
  return { gold: Math.round(400 + koku / 260), months: Math.max(2, Math.min(6, cs.length)) };
}
// 検地を行う。国中の城の実りが改まり、石高の限りが伸びる。
function runKenchi(s, fid, kuni, gov) {
  const cs = s.castles.filter((c) => c.kuni === kuni && c.faction === fid);
  const skill = 0.75 + (gov || 60) / 240;              // 奉行の政務が効く
  let before = 0, after = 0;
  for (const c of cs) {
    before += c.koku;
    const cap = c.kokuCap || c.kokuMax;
    // 竿を入れれば、隠れていた実りが表に出る
    c.koku = Math.round(Math.min(cap, c.koku + (cap - c.koku) * clamp(skill, 0.5, 1)));
    // 検地は限りそのものも改める。新田の見込みが立つ。
    c.kokuCap = Math.round(cap * (1 + 0.14 * clamp(skill, 0.5, 1.2)));
    c.kokuMax = Math.max(c.kokuMax, c.koku);
    c.pop = Math.round(c.pop * 1.04);
    c.min = clamp(c.min - 9, 0, 100);                  // 民は苦しむ
    after += c.koku;
  }
  s.kenchi = [...(s.kenchi || []), kuni];
  return { cs, before, after, gain: after - before };
}

/* ------------------------------------------------ 武将の家（GDD 6.7）
   城を預かる者は家を興す。家は代を重ね、禄と身分が継がれる。
   家を持たぬ者は一代限りで、没すれば跡は残らない。
   これにより、城主となることが「家を興す」ことの意味を持つ。 */
const HOUSE_RANK = 8000;                 // 家を興せる禄高（家老の格）
// 大名家の一門は、独立した家を持たない。家督は大名家のものとして継がれる。
function isMainClan(s, gen) {
  if (!gen || gen.lord) return false;
  const lord = s.generals.find((x) => x.faction === gen.faction && x.lord && !x.captive);
  if (!lord) return false;
  return isClan(s, gen, lord);
}
const hasHouse = (s, gen) => !!gen && !gen.lord && !isMainClan(s, gen)
  && (!!gen.house || stipendOf(s, gen) >= HOUSE_RANK);
// 家名。姓の二字をもって家とする。
const houseName = (gen) => (gen ? gen.name.slice(0, 2) : "");
// 家を継ぐ者。実の子が先、なければ同姓の年少者。
function heirOfHouse(s, gen) {
  const kids = s.generals.filter((x) => PARENT[x.id] === gen.id && !x.captive
    && x.faction === gen.faction);
  if (kids.length) return [...kids].sort((a, b) => (b.age || 0) - (a.age || 0))[0];
  const sur = houseName(gen);
  const kin = s.generals.filter((x) => x.id !== gen.id && !x.captive
    && x.faction === gen.faction && houseName(x) === sur && (x.age || 0) >= 12);
  if (kin.length) return [...kin].sort((a, b) => (b.age || 0) - (a.age || 0))[0];
  return null;
}
// 家を持つ者に子が生まれる。名は通字を継ぐ。
const KANJI_TSUJI = ["政", "秀", "忠", "康", "隆", "長", "元", "信", "義", "重", "family",
  "종"].filter((x) => /^[一-龯]$/.test(x));
function bearChild(s, gen) {
  const sur = houseName(gen);
  const k = Math.abs((gen.id + s.year).split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const t1 = KANJI_TSUJI[k % KANJI_TSUJI.length];
  const t2 = gen.name.slice(-1);                    // 父の名の一字を継ぐ
  const id = `${gen.id}_c${s.year}`;
  if (s.generals.some((x) => x.id === id)) return null;
  const mix = (a, b) => clamp(Math.round(a * 0.55 + b * 0.45 + (Math.random() * 22 - 11)), 30, 96);
  const kid = {
    id, name: `${sur}${t1}${t2}`, faction: gen.faction,
    lead: mix(gen.lead, 62), valor: mix(gen.valor, 62),
    wit: mix(gen.wit, 60), gov: mix(gen.gov, 60),
    loyal: clamp((gen.loyal == null ? 70 : gen.loyal) - 4, 0, 100),
    age: 1, at: gen.at, retinue: 60, retTrain: 55,
    unity: 60, merit: 0, fief: 200, rost: newRoster(60, `ret-${id}`),
  };
  s.generals.push(kid);
  PARENT[id] = gen.id;
  return kid;
}
// 家督を継がせる。禄と身分が受け継がれる。
function inheritHouse(s, dead) {
  if (!hasHouse(s, dead)) return null;
  const heir = heirOfHouse(s, dead);
  if (!heir) return null;
  heir.fief = Math.max(heir.fief || 0, Math.round(fiefOf(dead) * 0.85));   // 分割で目減りする
  heir.retinue += Math.round(dead.retinue * 0.6);
  heir.house = true;
  heir.at = dead.at;
  if (heir.loyal != null) heir.loyal = clamp(heir.loyal + 6, 0, 100);      // 恩を受けて忠は増す
  return heir;
}

/* ------------------------------------------------ 官位と幕府（GDD 12.5）
   国を跨いで飛び地を抱えれば、民は落ち着かず、一揆も起きやすい。
   一国を丸ごと押さえてこそ、国は治まる。

   五畿（山城・大和・河内・和泉・摂津）をことごとく制した者は、
   武家であっても高い官位に叙せられる。
   これは一国二国を得たのとは訳が違う、天下に並ぶ者なしという証である。
   さらに関東までを押さえれば、征夷大将軍に任ぜられ幕府を開く。
   いずれも天下統一そのものではないが、諸家を従えやすくなり、兵も増える。 */
const GOKINAI = ["山城", "大和", "河内", "和泉", "摂津"];
const KANTO_KEY = ["相模", "武蔵"];
// その国のうち、その家が握っている割合
function provinceGrip(s, fid, kuni) {
  const cs = s.castles.filter((c) => c.kuni === kuni);
  if (!cs.length) return 1;
  return cs.filter((c) => c.faction === fid).length / cs.length;
}
// 位階。五畿を制すれば高官、さらに関東まで及べば将軍。
function courtRank(s, fid) {
  const gokinai = GOKINAI.every((k) => holdsProvince(s, fid, k));
  if (!gokinai) return null;
  const kanto = KANTO_KEY.every((k) => holdsProvince(s, fid, k));
  const n = s.castles.filter((c) => c.faction === fid).length;
  if (kanto) return { key: "征夷大将軍", desc: "幕府を開き、天下に号令する",
    troop: 1.45, diplo: 22, prestige: 30 };
  if (n >= 40) return { key: "内大臣", desc: "五畿を制し、朝廷より内大臣に叙せられた",
    troop: 1.3, diplo: 16, prestige: 22 };
  return { key: "右大臣", desc: "五畿を制し、朝廷より右大臣に叙せられた",
    troop: 1.22, diplo: 12, prestige: 16 };
}
const rankBonus = (s, fid) => courtRank(s, fid) || { troop: 1, diplo: 0, prestige: 0 };

/* ------------------------------------------------ 後見（GDD 6.6）
   幼き者が家督を継げば、家中の年長者が後見に立つ。
   後見は当主に代わって軍を率い、政を執り、他家とも交渉する。
   当主が元服の齢（十五）に達すれば、後見は解けて一家臣に戻る。 */
const COMING_OF_AGE = 15;
const needsGuardian = (gen) => !!gen && gen.lord && (gen.age || 30) < COMING_OF_AGE;
// 後見に立つべき者を選ぶ。血縁の年長者を先とし、なければ器量と禄高による。
function pickGuardian(s, lord) {
  let kin = s.generals.filter((x) => x.faction === lord.faction && x.id !== lord.id
    && !x.captive && (x.age || 0) >= 25);
  if (!kin.length) kin = s.generals.filter((x) => x.faction === lord.faction && x.id !== lord.id
    && !x.captive && (x.age || 0) >= 18);
  if (!kin.length) return null;
  const scored = kin.map((x) => ({
    gen: x,
    clan: isClan(s, x, lord),
    able: x.lead + x.gov + x.wit + fiefOf(x) / 400,
  }));
  scored.sort((a, b) => (b.clan ? 1 : 0) - (a.clan ? 1 : 0) || b.able - a.able);
  return scored[0].gen;
}
// いま家を差配している者。当主が幼ければ後見。
function actingHead(s, fid) {
  const lord = s.generals.find((x) => x.faction === fid && x.lord && !x.captive);
  if (!lord) return null;
  if (!needsGuardian(lord)) return lord;
  const g = s.generals.find((x) => x.id === lord.guardian && x.faction === fid && !x.captive);
  return g || lord;
}
const isGuardian = (s, gen) => {
  if (!gen) return false;
  const lord = s.generals.find((x) => x.faction === gen.faction && x.lord && !x.captive);
  return !!lord && needsGuardian(lord) && lord.guardian === gen.id;
};

/* ------------------------------------------------ 家（GDD 6.5）
   大名の家には血の繋がりがある。誰が誰の子かを定めておけば、
   家督は血筋に従って継がれ、一門は結束する。 */
// 子 → 親。史実の親子関係。
const PARENT = {
  nobunaga: "nobuhide", nobuyuki: "nobuhide",
  n_nobutada: "nobunaga", n_nobukatsu: "nobunaga", n_nobutaka: "nobunaga",
  yoshitatsu: "dosan",
  jikkyu: "nagayoshi", fuyuyasu: "nagayoshi", sogo: "nagayoshi",   // 三好の兄弟
  ujizane: "yoshimoto",
  nobushige: "shingen", nobukado: "shingen", katsuyori: "shingen",
  katsuyori2: "nobushige",
  ujiteru: "ujiyasu", ujikuni: "ujiyasu", ujimasa: "ujiyasu", tsunanari2: "ujiyasu",
  h2_ujikuni2: "ujiyasu", h2_ujifusa: "ujimasa", terumune: "harumune", masamune_d: "terumune", e_masamune3: "masamune_d",
  yoshihisa: "takahisa", yoshihiro_s: "takahisa", toshihisa: "takahisa", iehisa: "takahisa",
  sz_tadatsune: "yoshihiro_s", sz_toyohisa: "iehisa",
  takamoto: "motonari", motoharu: "motonari", takakage_k: "motonari",
  terumoto: "takamoto", mo_motoharu2: "motoharu", mo_hiroie: "motoharu",
  motochika: "kunichika", ck_chikamasa: "kunichika", ck_morichika: "motochika",
  nobuchika_c: "motochika",
  yoshiaki_m: "yoshimori", mg_yoshiaki2: "yoshiaki_m",
  ot_yoshimune: "yoshishige",
  nagamasa: "hisamasa",
  yoshikage: "takakage",
  junkei: "junsho",
  ujizane2: "ujitane",
  hisamichi: "hisahide",
  kunihisa: "haruhisa", ujihisa: "kunihisa",
  ieyasu: "hirotada", m_tadateru: "ieyasu", m_hidetada: "ieyasu",
  e_yoshinao: "ieyasu", e_yorinobu: "ieyasu", e_yorifusa: "ieyasu",
  yoshihiro: "yoshitaka_s",
  tomonori: "harutomo",
  saneteru: "motozane", shingai3: "saneteru",
  // ── 家臣の家。父子が揃って登場する者を結ぶ。
  e_nagamasa2: "kuroda",          // 黒田孝高 → 長政
  kuroda: "ak_himeji2",           // 黒田職隆 → 孝高
  e_tadayuki: "e_nagamasa2",      // 長政 → 忠之
  muneshige: "shigetane",         // 高橋紹運 → 立花宗茂
  e_muneshige2: "shigetane",      // 紹運 → 高橋直次
  e_tadakatsu2: "tadakatsu",      // 本多忠勝 → 忠政
  e_yasukatsu: "yasumasa",        // 榊原康政 → 康勝
  e_naotaka: "naomasa",           // 井伊直政 → 直孝
  e_masazumi: "m_masanobu",       // 本多正信 → 正純
  e_tadatoshi: "e_tadaoki",       // 細川忠興 → 忠利
  e_katsushige: "rz_saga2",       // 鍋島直茂 → 勝茂
  e_hidemoto: "mo_motoharu2",     // 吉川元長 → （毛利秀元は別家だが縁者）
  toshiie2: "toshiie",            // 前田利家 → 利長
  n_toshimasa: "toshiie",
  mitsuharu: "mitsuhide",         // 明智光秀 → 秀満（女婿）
  e_kagekatsu2: "kagekatsu",      // 上杉景勝 → 定勝
  hidetada2: "hideyoshi",
};
// 一門か。親子・兄弟・祖孫のいずれかであれば一門とする。
function isClan(s, a, b) {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  const up = (g, n) => { let x = g; for (let i = 0; i < n && x; i++) x = s.generals.find((y) => y.id === PARENT[x.id]); return x; };
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
    const p = up(a, i), q = up(b, j);
    if (p && q && p.id === q.id) return true;
  }
  return a.name.slice(0, 2) === b.name.slice(0, 2);
}
// 子を返す（存命の者のみ）
const childrenOf = (s, gen) => s.generals.filter((x) => PARENT[x.id] === gen.id && !x.captive);

/* ------------------------------------------------ 身分（GDD 6.4）
   知行の高が、そのまま身分である。
   一隊を預かるだけの者と、城を任される者、家中を差配する宿老は違う。
   新たな数値を設けず、既にある知行で身分を定める。 */
const RANKS = [
  { key: "宿老", min: 20000, desc: "大名に代わって総大将を務められる", cap: 4000 },
  { key: "家老", min: 8000, desc: "城を任され、その城の政を執れる", cap: 2500 },
  { key: "侍大将", min: 2500, desc: "千人を超える隊を率いられる", cap: 1600 },
  { key: "物頭", min: 0, desc: "五百人までの隊を預かる", cap: 500 },
];
// 身分は禄高で定まる。知行だけでなく、余禄も身代のうちである。
function rankOf(gen, s) {
  if (!gen) return RANKS[RANKS.length - 1];
  if (gen.lord) return { key: "当主", min: 0, desc: "一家の主" };
  if (s && isGuardian(s, gen)) return { key: "後見", min: 0, desc: "幼き当主に代わって家を差配する" };
  const f = s ? stipendOf(s, gen) : fiefOf(gen);
  return RANKS.find((r) => f >= r.min) || RANKS[RANKS.length - 1];
}
const rankName = (gen, s) => rankOf(gen, s).key;
// その城の城主。当主がいれば当主、なければ禄高の最も高い家老。
function castellanOf(s, c) {
  const gs = s.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
  if (!gs.length) return null;
  const lord = gs.find((x) => x.lord);
  if (lord) return lord;                       // 当主のいる城は当主が城主である
  const named = c.lordId && gs.find((x) => x.id === c.lordId);
  if (named && stipendOf(s, named) >= castleRankNeed(c)) return named;
  return [...gs].sort((a, b) => stipendOf(s, b) - stipendOf(s, a))[0];
}
// 城を預かれるのは家老以上。ただし小城は、その城の身代に見合う禄高で足る。
// 一万石に満たぬ砦の主に八千石を求めるのは筋が通らない。
function castleRankNeed(c) {
  if (!c) return 8000;
  const own = c.koku + extraIncome(c);
  return Math.min(8000, Math.max(1200, Math.round(own * 0.16)));
}
const canHoldCastle = (gen, s, c) => {
  if (!gen) return false;
  if (gen.lord) return true;
  if (s && isGuardian(s, gen)) return true;
  const need = c ? castleRankNeed(c) : 8000;
  return (s ? stipendOf(s, gen) : fiefOf(gen)) >= need;
};
// 総大将を務められるのは当主か宿老。
const canBeSupreme = (gen, s) => !!gen && (gen.lord || (s ? stipendOf(s, gen) : fiefOf(gen)) >= 20000);
// 出陣そのものは物頭でもできる。ただし率いられる兵に限りがある。
const canLeadArmy = () => true;
// 身分ごとの兵の限り
function troopLimit(gen, s) {
  if (!gen) return 500;
  if (gen.lord) return needsGuardian(gen) ? 800 : 99999;   // 幼き当主は自ら率いられぬ
  if (s && isGuardian(s, gen)) return 99999;               // 後見は当主に代わる
  return (rankOf(gen, s) || {}).cap || 500;
}

/* ------------------------------------------------ 寿命（GDD 6.1）
   人の齢は八十を常の限りとする。
   史実でそれを超えて生きた者だけは、その齢まで生きる。 */
const LIFE_CAP = 80;
// 史実で八十を超えた者。没年齢を記す。
const FATED = { hirotada: 1549 };   // 史実で没する年が定まっている者
const LONG_LIVED = {
  harukata_m: 87,    // 志道広良（毛利の宿老）
  hironaka: 82,      // 相良武任
  norikage: 79,      // 朝倉宗滴
  harusumi: 82,      // 有馬晴純
  e_bokuden: 82,     // 塚原卜伝
  e_sekishusai: 78,  // 柳生宗厳
  torii_t: 82,       // 鳥居忠吉
  hojo_a: 97,        // 北条幻庵
  masatane: 76,      // 原昌胤
  nobutomo2: 77,     // 小幡虎盛
  hisayuki: 79,      // 宇山久兼
  o_ouchi2: 78,      // 陶隆満
  yoshishige_s: 76,  // 宗晴康
};
const lifeSpan = (g) => (g && LONG_LIVED[g.id]) || LIFE_CAP;

/* ------------------------------------------------ 家督（GDD 6.3）
   人は老い、家は代を重ねる。当主が没すれば、誰かが跡を継がねばならぬ。
   血筋を継ぐ者があれば、それが継ぐ。なければ、器量の勝る者が立つ。 */
// 跡目の候補。血筋の者と、器量の勝る者を並べる。
function heirCandidates(s, dead) {
  const kin = s.generals.filter((x) => x.faction === dead.faction && x.id !== dead.id && !x.captive);
  if (!kin.length) return [];
  const sur = dead.name.slice(0, 2);
  const kids = childrenOf(s, dead).map((x) => x.id);
  const scored = kin.map((x) => ({
    gen: x,
    child: kids.includes(x.id),                     // 実の子
    blood: kids.includes(x.id) || isClan(s, x, dead),
    able: x.lead + x.gov + x.wit,
  }));
  // 血筋の成人、血筋の幼年、そのほかの器量者、の順に並べる
  scored.sort((a, b) => {
    // 実の子が最も強い。次に一門、そして成人であること。
    const ra = (a.child ? 4 : 0) + (a.blood ? 2 : 0) + (a.gen.age >= 15 ? 1 : 0);
    const rb = (b.child ? 4 : 0) + (b.blood ? 2 : 0) + (b.gen.age >= 15 ? 1 : 0);
    if (ra !== rb) return rb - ra;
    // 実の子どうしなら年長から。家督は長子が継ぐのが常道である。
    if (a.child && b.child) return b.gen.age - a.gen.age;
    if (a.blood && b.blood) return b.gen.age - a.gen.age;
    return b.able - a.able;
  });
  return scored.slice(0, 6);
}
// 跡を継ぐ者を選ぶ。同じ姓の若い者を先とし、なければ器量による。
function pickHeir(s, dead) {
  const kin = s.generals.filter((x) => x.faction === dead.faction && x.id !== dead.id && !x.captive);
  if (!kin.length) return null;
  const sur = dead.name.slice(0, 2);
  // 同じ姓の者。年長から選ぶが、幼すぎる者は避ける。
  const blood = kin.filter((x) => x.name.startsWith(sur) && x.age >= 8)
    .sort((a, b) => (b.age >= 15 ? 1 : 0) - (a.age >= 15 ? 1 : 0) || a.age - b.age);
  if (blood.length) return blood[0];
  return [...kin].sort((a, b) => (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))[0];
}
// 家督を継がせる。家中の忠誠は揺れる。
// heirId を渡せばその者が継ぐ。retire なら先代は家臣として残る。
function succeed(s, dead, cause, heirId, retire) {
  const heir = heirId
    ? s.generals.find((x) => x.id === heirId && x.faction === dead.faction && !x.captive) || pickHeir(s, dead)
    : pickHeir(s, dead);
  const fname = s.factions[dead.faction] ? s.factions[dead.faction].name : "家";
  if (!heir) {
    s.chronicle.push({ y: s.year, m: s.month, text: `${dead.name}が${cause}。${fname}は跡を継ぐ者なく絶えた。` });
    return null;
  }
  heir.lord = true;
  heir.retinue += Math.round(dead.retinue * (retire ? 0.45 : 0.6));
  const blood = heir.name.startsWith(dead.name.slice(0, 2));
  // 血筋でない者が立てば家中は揺れる。若すぎても侮られる。
  // 先代が存命で後見に立てば、家中は落ち着く。
  for (const x of s.generals.filter((q) => q.faction === dead.faction && q.id !== heir.id && !q.captive)) {
    let d = blood ? -2 : -9;
    if (heir.age < 16) d -= 5;
    if (retire) d = Math.round(d * 0.25) + 1;      // 隠居であれば揺れは小さい
    if (x.loyal != null) x.loyal = clamp(x.loyal + d, 0, 100);
  }
  s.chronicle.push({ y: s.year, m: s.month,
    text: retire
      ? `${dead.name}は家督を${heir.name}に譲って隠居した。${dead.name}は後見として家に残る。`
      : `${dead.name}が${cause}。${heir.name}が${fname}の家督を継いだ${heir.age < 16 ? "（幼年のため家中に不穏がある）" : ""}。` });
  return heir;
}

/* --------------------------------------------------- 難易度（GDD 13.3）
   易しくするために数字を甘くするのではなく、
   他家の動きの速さと厳しさを変える。こちらの兵や石高には手を加えない。 */
const LEVELS = {
  易: {
    name: "易", desc: "他家は伸びが遅く、攻めも慎重。まず仕組みを覚えたいときに。",
    aiGrow: 0.6,        // 他家の内政の効き
    aiEager: 0.7,       // 他家が攻めに出る頻度
    aiNeed: 1.35,       // 攻めに要する兵力の比
    aiPlot: 0.5,        // 他家の調略の頻度
    reliefP: 1.25,      // こちらへの後詰の来やすさ
    tribute: 1.2,       // こちらの収入
  },
  普通: {
    name: "普通", desc: "この時代のありようをそのまま。",
    aiGrow: 1, aiEager: 1, aiNeed: 1.05, aiPlot: 1, reliefP: 1, tribute: 1,
  },
  難: {
    name: "難", desc: "他家は速やかに国を富ませ、隙あらば攻め寄せる。謀も絶えぬ。",
    aiGrow: 1.5, aiEager: 1.4, aiNeed: 0.85, aiPlot: 1.8, reliefP: 0.8, tribute: 0.88,
  },
};
const lv = (s) => LEVELS[s.level || "普通"];

/* ------------------------------------------------------ 海戦（GDD 10章）
   海を渡る軍は、渡りきるまで岸に足をつけられぬ。
   水軍を持つ側が海路を扼せば、船ごと沈められる。
   船戦は陸戦と別物で、兵の数より船と水主の技量がものを言う。 */
const SEA_UNIT = { name: "船手", per: 60 };        // 一艘あたりの乗り手
// 海に面した城かどうかは、実際の海岸線からの近さで判ずる。
// 海路が引かれていなくとも、岸に近ければ船は出せる。
const COASTAL = new Map();
function isCoastal(c) {
  if (COASTAL.has(c.id)) return COASTAL.get(c.id);
  // 海岸線の点は粗いので、線分への距離で測る
  let near = 1e9;
  for (const seg of COAST) {
    for (let i = 1; i < seg.length; i++) {
      const [x1, y1] = seg[i - 1], [x2, y2] = seg[i];
      const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
      const t = L2 ? clamp(((c.x - x1) * dx + (c.y - y1) * dy) / L2, 0, 1) : 0;
      const d = Math.hypot(x1 + dx * t - c.x, y1 + dy * t - c.y);
      if (d < near) near = d;
    }
    if (near < 9) break;
  }
  const ok = near < 13;
  COASTAL.set(c.id, ok);
  return ok;
}

// その勢力が持つ水軍の力。水軍衆を従えていれば大きい。
function navalPower(s, fid) {
  let ships = 0, skill = 55;
  // 海に面した城でなければ船は出せぬ。山国に水軍はない。
  for (const c of s.castles.filter((x) => x.faction === fid)) {
    if (!isCoastal(c)) continue;
    const port = (TOWNS || []).some((t) => {
      const st = s.specials[t.id];
      return (t.kind === "港" || t.kind === "水軍衆") && st && st.owner === fid
        && Math.hypot(px(t.lon) - c.x, py(t.lat) - c.y) < 90;
    });
    ships += Math.round((c.comm / 100) * (port ? 22 : 6));
  }
  // 水軍衆を抱えていれば技量が上がる
  for (const t of TOWNS || []) {
    if (t.kind !== "水軍衆") continue;
    const st = s.specials[t.id];
    if (st && st.owner === fid && (st.state === "保護" || st.state === "支援")) {
      ships += st.state === "支援" ? 22 : 12;
      skill += st.state === "支援" ? 22 : 12;
    }
  }
  return { ships: Math.max(2, ships), skill: clamp(skill, 30, 100) };
}
// 海路を渡る軍が迎え撃たれるか。相手が海に面していて水軍を持つなら起こる。
function seaInterception(s, army, roadKind) {
  if (roadKind !== "海路") return null;
  const foes = [...new Set(s.castles.map((c) => c.faction))]
    .filter((f) => f !== army.faction && !atPeace(s, army.faction, f));
  if (!foes.length) return null;
  const mine = navalPower(s, army.faction);
  // その海域に船を出せる家のうち、もっとも水軍の強い家が迎え撃つ。
  // 航路の両端を結ぶ線の近くに湊を持たぬ家は、そこまで船を出せない。
  const A = nodeById(army.path[0]), B = nodeById(army.path[1]);
  if (!A || !B) return null;
  const nearRoute = (c) => {
    const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
    const t = L2 ? clamp(((c.x - A.x) * dx + (c.y - A.y) * dy) / L2, 0, 1) : 0;
    return Math.hypot(A.x + dx * t - c.x, A.y + dy * t - c.y);
  };
  let best = null;
  for (const f of foes) {
    const np = navalPower(s, f);
    if (np.ships < 3) continue;
    // 航路のそばに海の城を持つ家だけが出てこられる
    const near = s.castles.some((c) => c.faction === f && isCoastal(c) && nearRoute(c) < 120);
    if (!near) continue;
    const score = np.ships * (0.6 + np.skill / 160);
    if (!best || score > best.score) best = { fid: f, np, score };
  }
  if (!best) return null;
  // 相手が明らかに弱ければ出てこない
  if (best.score < mine.ships * (0.6 + mine.skill / 160) * 0.45) return null;
  if (Math.random() > 0.20) return null;               // 海で待ち伏せるのは容易でない
  return { by: best.fid, foe: best.np, mine };
}
// 海戦の帰趨。船と水主の技量で決まり、負ければ兵が海に沈む。
function resolveSeaBattle(s, army, inter) {
  const a = inter.mine, d = inter.foe;
  // 船数は平方根で効かせる。数を揃えれば勝てる、という戦ではない。
  const av = Math.sqrt(a.ships) * (0.5 + a.skill / 110) * (0.72 + Math.random() * 0.56);
  const dv = Math.sqrt(d.ships) * (0.5 + d.skill / 110) * (0.72 + Math.random() * 0.56);
  const win = av > dv;
  const r = Math.min(av, dv) / Math.max(av, dv);
  // 負ければ大きく沈む。海の上に退き場はない。
  const lost = Math.round(army.men * (win ? 0.04 + r * 0.05 : 0.16 + r * 0.16));
  army.men = Math.max(0, army.men - lost);
  army.local = Math.max(0, army.local - lost);
  if (army.rost) rosterCut(army.rost, lost);
  return { win, lost, foeName: s.factions[inter.by].name };
}

/* --------------------------------------------- 奇襲と大将首（GDD 8.7）
   兵数だけで決まるなら、寡兵が大軍を破る道はない。
   総大将を突けば軍は瓦解する──桶狭間はその一戦であった。
   勝算は薄いが、当たれば兵力比を覆す。 */
function ambushChance(gen, weather, terrain, ratio) {
  if (!gen) return 0;
  // 知略が要。統率がこれを支える。
  let p = (gen.wit - 55) / 340 + (gen.lead - 55) / 620;
  // 雨や霧は寄せ手を隠す
  p *= weather === "雨" ? 1.55 : weather === "雪" ? 1.35 : weather === "曇" ? 1.12 : 1;
  // 森・山・谷は伏せる場所がある
  p *= terrain === "forest" || terrain === "hill" ? 1.3 : 1;
  // 相手が大軍で油断しているほど付け入る隙がある
  p *= clamp(0.6 + (1 - ratio) * 1.4, 0.5, 2.0);
  return clamp(p, 0, 0.52);
}
// 奇襲の首尾。当たれば敵の総大将を討ち、軍を瓦解させる。
function tryAmbush(s, army, castle, aGens, dGens, weather) {
  const head = [...aGens].sort((a, b) => (b.wit + b.lead) - (a.wit + a.lead))[0];
  const dMen = castle.local + dGens.reduce((a, x) => a + x.retinue, 0);
  const ratio = army.men / Math.max(1, dMen);
  if (ratio > 0.62) return null;                    // 互角に近ければ正面から戦う
  const terr = (castle.kuni === "信濃" || castle.kuni === "甲斐" || castle.kuni === "飛騨") ? "hill" : "forest";
  const p = ambushChance(head, weather, terr, ratio);
  if (Math.random() > p) return { ok: false, by: head, p };
  // 総大将を討った。守り手の大将と、その直属が崩れる。
  const cand = dGens.filter((x) => x.faction === castle.faction && !x.captive);
  const lord = [...cand].sort((a, b) => (b.lord ? 1 : 0) - (a.lord ? 1 : 0) || b.lead - a.lead)[0];
  return { ok: true, by: head, target: lord || null, p };
}

/* ------------------------------------------------------------ 家紋
   図案は輪郭で描く。城の丸の中に収まる大きさで、勢力の色で塗る。 */
function drawMon(ctx, kind, x, y, r, col, sub) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(0.8, r * 0.13);
  const circle = (cx, cy, rr, fill) => {
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7);
    if (fill) ctx.fill(); else ctx.stroke();
  };
  const petal = (ang, rr, w) => {
    ctx.save(); ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, -rr);
    ctx.quadraticCurveTo(w, -rr * 0.42, 0, 0);
    ctx.quadraticCurveTo(-w, -rr * 0.42, 0, -rr);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  if (kind === "木瓜") {                       // 織田・織田庶家
    for (let i = 0; i < 5; i++) petal((i * Math.PI * 2) / 5, r * 0.92, r * 0.42);
    ctx.fillStyle = sub || "#fff"; circle(0, 0, r * 0.26, true);
  } else if (kind === "二頭波") {              // 斎藤（撫子を模す）
    for (let i = 0; i < 4; i++) petal((i * Math.PI * 2) / 4 + Math.PI / 4, r * 0.95, r * 0.5);
    ctx.fillStyle = sub || "#fff"; circle(0, 0, r * 0.24, true);
  } else if (kind === "赤鳥") {                // 今川
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.5); ctx.lineTo(0, -r * 0.85); ctx.lineTo(r * 0.7, r * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = sub || "#fff";
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.28); ctx.lineTo(0, -r * 0.3); ctx.lineTo(r * 0.3, r * 0.28);
    ctx.closePath(); ctx.fill();
  } else if (kind === "四つ菱") {              // 武田
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      ctx.beginPath();
      ctx.moveTo(dx * r * 0.5, dy * r * 0.5 - r * 0.4 * Math.abs(dy) - r * 0.28 * Math.abs(dx) * 0);
      const cx = dx * r * 0.48, cy = dy * r * 0.48;
      ctx.moveTo(cx, cy - r * 0.4); ctx.lineTo(cx + r * 0.26, cy);
      ctx.lineTo(cx, cy + r * 0.4); ctx.lineTo(cx - r * 0.26, cy);
      ctx.closePath(); ctx.fill();
    }
  } else if (kind === "三鱗") {                // 北条
    for (const [dx, dy] of [[0, -0.42], [-0.42, 0.36], [0.42, 0.36]]) {
      ctx.beginPath();
      ctx.moveTo(dx * r, dy * r - r * 0.34);
      ctx.lineTo(dx * r + r * 0.36, dy * r + r * 0.3);
      ctx.lineTo(dx * r - r * 0.36, dy * r + r * 0.3);
      ctx.closePath(); ctx.fill();
    }
  } else if (kind === "葵") {                  // 松平
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate((i * Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.22);
      ctx.bezierCurveTo(r * 0.55, -r * 0.9, r * 0.62, -r * 0.2, 0, -r * 0.22);
      ctx.bezierCurveTo(-r * 0.62, -r * 0.2, -r * 0.55, -r * 0.9, 0, -r * 0.22);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if (kind === "三つ盛") {              // 浅井・六角など
    for (const [dx, dy] of [[0, -0.44], [-0.42, 0.34], [0.42, 0.34]]) circle(dx * r, dy * r, r * 0.34, true);
  } else if (kind === "笹") {                  // 朝倉（三つ盛木瓜を簡略）
    for (const [dx, dy] of [[0, -0.42], [-0.4, 0.32], [0.4, 0.32]]) {
      ctx.save(); ctx.translate(dx * r, dy * r);
      for (let i = 0; i < 4; i++) petal((i * Math.PI * 2) / 4, r * 0.34, r * 0.17);
      ctx.restore();
    }
  } else if (kind === "月") {                  // 北畠（九曜を模す）
    circle(0, 0, r * 0.32, true);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      circle(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, r * 0.17, true);
    }
  } else if (kind === "丸に十") {              // 水野・神戸など
    circle(0, 0, r * 0.82, false);
    ctx.lineWidth = Math.max(1, r * 0.2);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5);
    ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0); ctx.stroke();
  } else if (kind === "鶴") {                  // 村上・姉小路など
    circle(0, 0, r * 0.82, false);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.46); ctx.lineTo(r * 0.4, r * 0.34); ctx.lineTo(-r * 0.4, r * 0.34);
    ctx.closePath(); ctx.fill();
  } else if (kind === "抱き沢瀉") {            // 九鬼・若狭武田など
    petal(0, r * 0.9, r * 0.34);
    petal(Math.PI * 0.72, r * 0.66, r * 0.26);
    petal(-Math.PI * 0.72, r * 0.66, r * 0.26);
  } else if (kind === "輪宝") {                // 一向衆・寺社
    circle(0, 0, r * 0.78, false);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
      ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
      ctx.stroke();
    }
    circle(0, 0, r * 0.24, true);
  } else {                                     // 定めのない家は丸
    circle(0, 0, r * 0.7, true);
  }
  ctx.restore();
}

/* ------------------------------------------------------- 天下の趨勢
   統一とは、すべての城を自ら握ることだけではない。
   従属させ、臣従を受けた家もまた、その旗の下にある。 */
function underBanner(s, fid) {
  // 従属の従属もまた旗の下にある。孫までを辿る。
  const koku = {};
  for (const c of s.castles) koku[c.faction] = (koku[c.faction] || 0) + c.koku;
  const under = {};                                  // 主 → 従の一覧
  for (const k of Object.keys(s.relations)) {
    const r = s.relations[k];
    if (r.state !== "従属" && r.state !== "臣従") continue;
    const [a, b] = k.split("|");
    const master = (koku[a] || 0) >= (koku[b] || 0) ? a : b;
    const vassal = master === a ? b : a;
    (under[master] = under[master] || []).push(vassal);
  }
  const set = new Set([fid]);
  const stack = [fid];
  while (stack.length) {
    const x = stack.pop();
    for (const v of under[x] || []) if (!set.has(v)) { set.add(v); stack.push(v); }
  }
  return set;
}
// 天下が定まったか。旗の下にすべての城が入れば統一である。
function checkUnified(s) {
  const alive = [...new Set(s.castles.map((c) => c.faction))];
  for (const fid of alive) {
    const banner = underBanner(s, fid);
    if (s.castles.every((c) => banner.has(c.faction))) {
      const vassals = [...banner].filter((x) => x !== fid);
      // 統一の質。直に治めた城が多いほど、真の天下人である。
      const mine = s.castles.filter((c) => c.faction === fid).length;
      const grade = alive.length === 1 ? "一統"
        : mine / s.castles.length >= 0.7 ? "大成"
        : mine / s.castles.length >= 0.45 ? "覇" : "旗下";
      return { fid, direct: alive.length === 1, vassals, grade,
        mine, total: s.castles.length };
    }
  }
  return null;
}

/* ------------------------------------------------- 家の方針（GDD 13.2）
   隣を手当たり次第に攻めるだけでは、天下の形が動かない。
   家ごとに気性と狙いを持たせ、伸びる方角と敵と見る家を定める。 */
const AI_TEMPER = ["進取", "堅実", "old", "陰謀"];   // old は互換のため残す
function factionTemper(fid) {
  // 家の名から気性を決める（同じ家は常に同じ気性）
  let h = 0;
  for (let i = 0; i < fid.length; i++) h = (h * 31 + fid.charCodeAt(i)) >>> 0;
  return ["進取", "堅実", "陰謀"][h % 3];
}
// 家の狙い。もっとも与しやすく、実りの多い相手を選ぶ。
function factionAim(s, fid) {
  const mine = s.castles.filter((c) => c.faction === fid);
  if (!mine.length) return null;
  const myMen = mine.reduce((a, c) => a + c.local, 0)
    + s.generals.filter((x) => x.faction === fid && !x.captive).reduce((a, x) => a + x.retinue, 0);
  const best = { score: -1e9, target: null, from: null };
  for (const c of mine) {
    for (const t of s.castles) {
      if (t.faction === fid) continue;
      const path = findPath(c.id, t.id);
      if (!path) continue;
      if (atPeace(s, fid, t.faction)) continue;
      const dg = s.generals.filter((x) => x.at === t.id && x.faction === t.faction && !x.captive);
      const foe = t.local + dg.reduce((a, x) => a + x.retinue, 0);
      const rel = s.relations[relKey(fid, t.faction)];
      const grudge = rel ? (60 - rel.trust) / 60 : 0.4;          // 信用が薄いほど狙う
      const worth = t.koku / 20000 + t.comm / 40;                 // 実り
      const ease = clamp(myMen / Math.max(1, foe * 1.3), 0, 2.4);  // 与しやすさ
      const far = path.length;                                    // 遠さ
      // 弱った家には諸家が寄ってたかる。これがないと敗者も生き延び、天下が凍る。
      const theirs = s.castles.filter((c2) => c2.faction === t.faction);
      const theirMen = theirs.reduce((a2, c2) => a2 + c2.local, 0)
        + s.generals.filter((x) => x.faction === t.faction && !x.captive).reduce((a2, x) => a2 + x.retinue, 0);
      const weak = clamp(1.6 - theirMen / Math.max(1, myMen), 0, 1.6);
      // 遠国を望むより、まず隣を切り取るのが常道である
      const score = worth * 1.1 + ease * 1.8 + grudge * 1.2 + weak * 2.2 - (far - 1) * 1.6;
      if (score > best.score) { best.score = score; best.target = t.id; best.from = c.id; }
    }
  }
  return best.target ? best : null;
}
// 方針を月ごとに見直す
function reviewAim(s, fid) {
  const f = s.factions[fid];
  f.temper = f.temper || factionTemper(fid);
  const aim = factionAim(s, fid);
  if (!aim) { f.aim = null; return; }
  // 進取は狙いをよく変え、堅実は据える。陰謀は調略を先に行う。
  const stick = f.temper === "堅実" ? 0.85 : f.temper === "進取" ? 0.45 : 0.65;
  if (f.aim && f.aim.target && Math.random() < stick) {
    const t = s.castles.find((c) => c.id === f.aim.target);
    if (t && t.faction !== fid && !atPeace(s, fid, t.faction)) return;   // 狙いを保つ
  }
  f.aim = { target: aim.target, from: aim.from, score: aim.score };
}

/* ------------------------------------------------- 知行と忠誠（GDD 6.1）
   家臣は禄を食んで仕える。知行が器量に見合わなければ、忠誠は下がっていく。
   下がりきれば出奔し、あるいは敵の調略に応じる。 */
function fiefWanted(gen) {
  // 器量に見合う知行（石）。器量の差が知行の桁に出るようにする。
  // 凡将は千石、一国を代表する将は二万石、傑物は五万石を望む。
  const able = (gen.lead + gen.valor + gen.wit + gen.gov) / 4;   // 平均の器量
  const base = Math.pow(Math.max(1, able - 42) / 12, 2.6) * 900;
  return Math.round(400 + base + (gen.merit || 0) * 900);
}
function fiefOf(gen) { return gen.fief == null ? 0 : gen.fief; }
/* 禄高（GDD 6.4）
   知行は、城の石高から分け与えられる田の高である。城の石高がその限り。
   これに湊の運上・市の役銭・山の産などの余禄を加えたものが禄高であり、
   身分はこの禄高によって定まる。
   田の乏しい志摩や対馬でも、海と交易の余禄によって高い禄高が成り立つ。
   大名の身代は家臣に配る知行ではないので、直轄領と余禄を合わせて御料と呼ぶ。 */
// その城の余禄。田以外の実入り。
function extraIncome(c) {
  if (!c) return 0;
  // 湊の運上・市の役銭・山の産。田の乏しい地ほど比重が大きいが、
  // 田の実りを凌ぐことはない。
  const trade = c.comm * 95;
  const sea = isCoastal(c) ? c.comm * 60 : 0;
  const mountain = Math.max(0, 40 - c.comm) * 70;
  return Math.min(Math.round(trade + sea + mountain), Math.round(c.koku * 0.55 + 4200));
}
// 城が家臣に配れる知行の限り。城の石高がそのまま限りとなる。
function fiefCapacity(c) { return c ? c.koku : 0; }
// 城が配っている知行の総和。当主の身代は御料であって知行ではない。
function fiefBurden(s, castleId) {
  return s.generals
    .filter((g) => g.at === castleId && !g.captive && !g.lord)
    .reduce((a, g) => a + fiefOf(g), 0);
}
// 武将の禄高＝知行＋その城の余禄の分け前
function stipendOf(s, gen) {
  if (!gen) return 0;
  // 若年の者に大禄は与えられぬ。齢を重ねてこそ身代も増す。
  const age = gen.age == null ? 30 : gen.age;
  const c = s.castles.find((x) => x.id === gen.at);
  if (!c) return fiefOf(gen);
  const burden = fiefBurden(s, c.id);
  const share = burden > 0 ? fiefOf(gen) / burden : 0;
  const raw = Math.round(fiefOf(gen) + extraIncome(c) * share);
  if (gen.lord || age >= 20) return raw;
  // 十五で家老の格、十八で宿老の格に届きうる、という程度に抑える
  const capByAge = age < 13 ? 2400 : age < 15 ? 4000 : age < 18 ? 9000 : 16000;
  return Math.min(raw, capByAge);
}
// 大名の御料＝直轄領（配り残した石高の総和）＋全城の余禄
function goryoOf(s, fid) {
  const cs = s.castles.filter((c) => c.faction === fid);
  let direct = 0, extra = 0;
  for (const c of cs) {
    direct += Math.max(0, c.koku - fiefBurden(s, c.id));
    extra += extraIncome(c);
  }
  return { direct, extra, total: direct + extra };
}
// 知行の過不足が忠誠をどう動かすか（毎月）
function loyaltyDrift(gen) {
  const want = fiefWanted(gen), have = fiefOf(gen);
  if (want <= 0) return 0;
  const r = have / want;
  if (r >= 1.25) return 0.7;
  if (r >= 1.0) return 0.35;
  if (r >= 0.75) return 0;
  if (r >= 0.5) return -0.5;
  return -1.2;
}
// 勢力が配れる知行の総量（石高の四割まで）
function fiefRoom(s, fid) {
  const koku = s.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);
  const used = s.generals.filter((x) => x.faction === fid && !x.captive).reduce((a, x) => a + fiefOf(x), 0);
  return { cap: Math.round(koku * 0.4), used, left: Math.round(koku * 0.4) - used };
}

/* --------------------------------------------- 来月の見通し（GDD 4.1）
   月次報告に数字が並ぶだけでは判断ができない。
   何が入り、何が出て、兵糧はいつ尽きるのかを先に示す。 */
function forecast(s, fid) {
  const f = s.factions[fid];
  const mine = s.castles.filter((c) => c.faction === fid);
  const up = MOB_POLICY[f.mobilization].upkeep;
  const nextMonth = s.month === 12 ? 1 : s.month + 1;
  const harvest = [9, 10, 11].includes(nextMonth) ? 3 : 1;
  let inGold = 0, outGold = 0, inFood = 0, outFood = 0, troops = 0, food = 0;
  for (const c of mine) {
    const ret = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive)
      .reduce((a, x) => a + x.retinue, 0);
    const t = c.local + ret;
    troops += t; food += c.food;
    inGold += c.comm * 4 + c.koku * 0.003;
    outGold += t * 0.075 * up;
    inFood += Math.round((c.koku / 12) * 0.5 * harvest * (c.min / 80));
    outFood += Math.round(t * 0.08 * up);
  }
  for (const a of s.armies.filter((x) => x.faction === fid)) {
    troops += a.men;
    outFood += Math.round(a.men * 0.09);
  }
  const g = specialBonus(s, fid, "gold") - specialBonus(s, fid, "upkeep");
  inGold += Math.max(0, g); outGold += Math.max(0, -g);
  const netFood = inFood - outFood;
  // 兵糧が尽きるまでの月数。収穫の多い月とそうでない月を織り込んで概算する。
  let left = null;
  if (netFood < 0) {
    let sim = food, m = 0, mo = s.month;
    while (sim > 0 && m < 120) {
      mo = mo === 12 ? 1 : mo + 1;
      const h = [9, 10, 11].includes(mo) ? 3 : 1;
      let gain = 0, loss = 0;
      for (const c of mine) {
        const ret = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive)
          .reduce((a, x) => a + x.retinue, 0);
        gain += Math.round((c.koku / 12) * 0.5 * h * (c.min / 80));
        loss += Math.round((c.local + ret) * 0.08 * up);
      }
      for (const a of s.armies.filter((x) => x.faction === fid)) loss += Math.round(a.men * 0.09);
      sim += gain - loss; m++;
    }
    left = m >= 120 ? null : m;
  }
  return {
    inGold: Math.round(inGold), outGold: Math.round(outGold), netGold: Math.round(inGold - outGold),
    inFood, outFood, netFood, gold: f.gold, food, troops, months: left, harvest: harvest > 1,
  };
}

const monthsBetween = (y1, m1, y2, m2) => (y2 - y1) * 12 + (m2 - m1);
const relOf = (g, a, b) => g.relations[relKey(a, b)] || { trust: 45, state: "中立", until: null };
const atPeace = (g, a, b) => { const r = relOf(g, a, b); return r.state === "不可侵" || r.state === "同盟" || r.state === "臣従" || r.state === "従属"; };
const intelFresh = (g, castleId) => {
  const i = g.intel[castleId];
  return !!i && monthsBetween(i.y, i.m, g.year, g.month) <= 12;
};
const specialBonus = (g, fid, key) => {
  let v = 0;
  for (const t of TOWNS) {
    const st = g.specials[t.id];
    if (!st || st.faction !== fid) continue;
    const o = (SPECIAL_OPTIONS[t.kind] || []).find((x) => x.key === st.state);
    if (o && o[key]) v += o[key];
  }
  return v;
};
// 敵城の内情は、偵察するか忍びを味方につけない限り分からない（GDD 11.2 / 13.2）
const canSee = (g, c) => c.faction === g.player || intelFresh(g, c.id) || specialBonus(g, g.player, "intel") > 0;
const hid = (g, c, v, digits) => (canSee(g, c) ? (digits === 0 ? Math.round(v) : fmt(v)) : "？");

/* ==========================================================================
   戦闘エンジン
   ========================================================================== */
// 一方の陣に並べられる武将隊の数と、一隊が抱えられる兵の上限。
// 関ヶ原では東西あわせて六十余隊が参陣し、最大の隊（徳川家康の本隊）が約三万であった。
// 参加隊数は史料により差があるため、片軍32隊を上限とする。
const MAX_CORPS = 32;
const MAX_CORPS_MEN = 30000;

// 戦場の広さは兵数で決まる。大軍ほど広い野が要る。
const BASE = { w: 1080, h: 720 };
const FIELD = { w: 1080, h: 720 };
// 戦場の地形は街道ごとに決まる。両端の城の名から種を作り、毎回同じ野を再現する。
const RIVER = { top: 0, bot: 0, bridge: [0, 0], ford: [0, 0], wave: 0, ph: 0, k: 1 };
// 川は蛇行する。判定も描画もこの一つの式から出す（見た目と当たりを食い違わせない）。
function riverShift(x) {
  if (!RIVER.wave) return 0;
  return Math.sin(x * RIVER.k + RIVER.ph) * RIVER.wave;
}
const FORESTS = [], WOODS = [], HILLS = [], MARSH = [];
let FIELD_SEED = 0;
// 城の名から種を作る（同じ街道なら何度戦っても同じ野になる）
function seedOf(aId, bId) {
  const key = [String(aId || ""), String(bId || "")].sort().join("|");
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function makeRng(seed) {
  let x = seed || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
// 街道の性格から野を組み立てる（GDD 8.1）
function genTerrain(seed) {
  const rnd = makeRng(seed);
  const W = FIELD.w, H = FIELD.h;
  RIVER.top = 0; RIVER.bot = 0; RIVER.bridge = [0, 0]; RIVER.ford = [0, 0]; RIVER.wave = 0;
  FORESTS.length = 0; WOODS.length = 0; HILLS.length = 0; MARSH.length = 0;
  const kind = rnd();
  // 川。六割の野に一本流れる。橋と浅瀬の位置も野ごとに違う。
  if (kind > 0.4) {
    const cy = H * (0.36 + rnd() * 0.28);
    const wide = H * (0.045 + rnd() * 0.035);
    RIVER.top = Math.round(cy - wide / 2); RIVER.bot = Math.round(cy + wide / 2);
    const bx = W * (0.15 + rnd() * 0.7), bw = W * 0.075;
    RIVER.bridge = [Math.round(bx - bw / 2), Math.round(bx + bw / 2)];
    let fx = W * (0.1 + rnd() * 0.8);
    if (Math.abs(fx - bx) < W * 0.2) fx = bx > W / 2 ? bx - W * 0.28 : bx + W * 0.28;
    const fw = W * 0.1;
    RIVER.ford = [Math.round(clamp(fx - fw / 2, 10, W - fw - 10)), 0];
    RIVER.ford[1] = Math.round(RIVER.ford[0] + fw);
    RIVER.wave = H * (0.02 + rnd() * 0.05);          // 蛇行の振れ
    RIVER.k = (1.4 + rnd() * 1.6) * Math.PI / W;     // 蛇行の細かさ
    RIVER.ph = rnd() * Math.PI * 2;
  }
  // 丘・森・林・湿地。数も場所も野ごとに違う。
  const put = (list, n, rMin, rMax) => {
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, ok = false;
      const r0 = rMin + rnd() * (rMax - rMin);
      const mx = r0 + 24, my = r0 + 24;               // 盤からはみ出さない
      if (mx * 2 > W - 40 || my * 2 > H - 40) continue;
      for (let k = 0; k < 24 && !ok; k++) {
        x = mx + rnd() * (W - mx * 2); y = my + rnd() * (H - my * 2);
        // 川の上と、他の地形の上には置かない
        if (RIVER.bot > RIVER.top && y > RIVER.top - 40 && y < RIVER.bot + 40) continue;
        ok = ![...FORESTS, ...WOODS, ...HILLS, ...MARSH].some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r0 + 30);
      }
      if (ok) list.push({ x: Math.round(x), y: Math.round(y), r: Math.round(r0) });
    }
  };
  const sc = Math.min(1.6, FIELD.w / 1080);
  put(HILLS, Math.floor(rnd() * 3), 80 * sc, 130 * sc);        // 0〜2
  put(FORESTS, Math.floor(rnd() * 4), 70 * sc, 115 * sc);      // 0〜3
  put(WOODS, Math.floor(rnd() * 3), 50 * sc, 85 * sc);         // 0〜2
  put(MARSH, rnd() > 0.6 ? 1 : 0, 65 * sc, 100 * sc);          // 0〜1
}
const hasRiver = () => RIVER.bot > RIVER.top + 4;
const hasHill = () => HILLS.length > 0;
const hasForest = () => FORESTS.length > 0;
const nearestOf = (list, x, y) => (list.length
  ? list.reduce((a, o) => (Math.hypot(o.x - x, o.y - y) < Math.hypot(a.x - x, a.y - y) ? o : a), list[0])
  : null);
function layoutField(totalMen) {
  // 3千人を標準とし、兵数の平方根に比例して広げる。
  // 関ヶ原（両軍あわせて約16万）で東西約4km・南北約3kmの盆地に相当する広さになる。
  const w = clamp(Math.round(1045 * Math.sqrt(Math.max(600, totalMen) / 3000)), 900, 5600);
  const h = Math.round(w * 0.667);
  FIELD.w = w; FIELD.h = h;
  genTerrain(FIELD_SEED);
}
function setFieldSeed(aId, bId) { FIELD_SEED = seedOf(aId, bId); }
layoutField(3000);

/* ==========================================================================
   城郭図（GDD 9.3）。惣構・二の丸・本丸の三層と、門・櫓・堀・狭い曲輪で構成する。
   写実的な城の絵は使わず、構造と通路が読める図式として描く。
   ========================================================================== */
let MAP = null;                       // 城攻めのときだけ城郭図が入る
function setBattleMap(m) { MAP = m; }

// 城攻めに立てられる一隊の兵。門は狭く、二万を城壁に押し付けても意味がない。
// あふれた兵は後詰として戦場の外に控える。
const SIEGE_CORPS_CAP = 3000;
// 城の寸法は「一隊の見た目の大きさ」を単位にする。こうしないと、
// 兵が増えるほど隊が城を追い越し、本丸より一隊が大きいという事態になる。
function siegeUnit() {
  const sq = Math.ceil(SIEGE_CORPS_CAP / 50);            // 60組
  const side = Math.ceil(Math.sqrt(sq));                 // 方陣なら8×8
  return { w: side * SP, d: side * ROW };                // 216 × 88
}
function buildCastleMap(castle) {
  const U = siegeUnit();
  const k = 0.88 + castle.def / 420;                     // 城防で一割ほど前後する
  const t = 10;
  const n = castle.def >= 64 ? 4 : castle.def >= 40 ? 3 : 2;
  const names = n === 4 ? ["惣構", "三の丸", "二の丸", "本丸"]
    : n === 3 ? ["惣構", "二の丸", "本丸"] : ["二の丸", "本丸"];
  const base = 380 + castle.def * 8;
  const gn0 = castle.def >= 64 ? 4 : castle.def >= 40 ? 3 : 2;
  const FACE = ["S", "N", "E", "W"];
  const GNAME = { S: "大手門", N: "搦手門", E: "東脇門", W: "西脇門" };
  const INAME = { S: "表門", N: "裏門", E: "東門", W: "西門" };
  // 本丸は一隊が数隊入れる広さ。曲輪の帯幅は一隊の奥行きより広く取る。
  const honW = U.w * 1.2 * k, honH = U.d * 2.0 * k;
  const band = (U.d * 1.5 + 74) * k;
  const masu = 34 * k;
  const layers = names.map((name, i) => {
    const back = (n - 1 - i);                            // 外側ほど大きい
    const hw = honW + band * back, hh = honH + band * back;
    const cnt = Math.max(1, gn0 - i);
    const gates = FACE.slice(0, cnt).map((face, j) => {
      const along = (face === "S" || face === "N") ? "x" : "y";
      const span = along === "x" ? hw : hh;
      const w = (96 - i * 8) * k * (face === "S" ? 1 : 0.8);
      const hp = Math.round(base * (1 - i * 0.06) * (face === "S" ? 1 : 0.76));
      const nm = i === 0 ? GNAME[face] : INAME[face];
      return {
        face, layer: i, i: j, name: nm, key: `${name}${nm}`,
        off: span * (0.34 - 0.1 * (j % 3)) * ((i + j) % 2 ? 1 : -1),
        w, hp, max: hp, broken: false, masu, open: (i + j) % 2 ? 1 : -1,
        slot: null, hold: null, def: 0,
      };
    });
    return { name, i, hw, hh, masu, gates };
  });
  // 城内の施設。矢倉は曲輪の角、陣鐘櫓は曲輪の奥に一つ。
  const fac = [];
  layers.forEach((l, i) => {
    if (i >= layers.length - 1) return;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      fac.push({ kind: "矢倉", name: `${l.name}矢倉${sy > 0 ? "南" : "北"}${sx > 0 ? "東" : "西"}`,
        x: sx * l.hw, y: sy * l.hh, r: 15, hp: 260 + castle.def * 3, max: 260 + castle.def * 3, layer: i, cool: 0 });
    }
    const nx = layers[i + 1];
    fac.push({ kind: "陣鐘櫓", name: `${l.name}陣鐘`,
      x: (i % 2 ? -1 : 1) * l.hw * 0.5, y: -(l.hh + (nx ? nx.hh + t : 0)) / 2,
      r: 14, hp: 200 + castle.def * 2, max: 200 + castle.def * 2, layer: i, cool: 0 });
  });
  // 中心は戦場を決めたあとに据える（施設は相対座標で持っておく）
  return { cx: 0, cy: 0, t, layers, moat: { band: 38 * k }, n,
    gates: layers.flatMap((l) => l.gates), fac, unit: U };
}
// 城の外に、寄せ手が二列並べるだけの余地を取って戦場を決める
function layoutCastleField(m) {
  const o = m.layers[0];
  const ext = { w: o.hw + m.t + o.masu + m.t + 8 + m.moat.band, h: o.hh + m.t + o.masu + m.t + 8 + m.moat.band };
  // 城の外に、寄せ手が展開して回り込めるだけの野を残す
  FIELD.w = Math.round((ext.w + Math.max(m.unit.d * 2.4 + 160, ext.w * 0.6)) * 2);
  FIELD.h = Math.round((ext.h + Math.max(m.unit.d * 2.4 + 160, ext.h * 0.6)) * 2);
  m.cx = FIELD.w / 2; m.cy = FIELD.h / 2;
  for (const f of m.fac) { f.x += m.cx; f.y += m.cy; }   // 相対から絶対へ
  return m;
}
const inRect = (dx, dy, hw, hh) => Math.abs(dx) <= hw && Math.abs(dy) <= hh;

/* 門は四方にあるので、壁沿いの座標 u と壁からの距離 v で扱う */
function axisOf(l, g) {
  const along = (g.face === "S" || g.face === "N") ? "x" : "y";
  return { along, half: along === "x" ? l.hh : l.hw, sgn: (g.face === "S" || g.face === "E") ? 1 : -1 };
}
const toUV = (a, dx, dy) => a.along === "x" ? { u: dx, v: dy * a.sgn } : { u: dy, v: dx * a.sgn };
const fromUV = (m, a, u, v) =>
  a.along === "x" ? { x: m.cx + u, y: m.cy + a.sgn * v } : { x: m.cx + a.sgn * v, y: m.cy + u };
const gatePos = (m, l, g) => { const a = axisOf(l, g); return fromUV(m, a, g.off, a.half + m.t / 2); };
function gateOpenU(g) {
  const gL = g.off - g.w / 2, gR = g.off + g.w / 2;
  const from = g.open > 0 ? gR - g.w * 0.1 : gL - g.w * 0.9;
  return from + g.w / 2;
}
function masuWall(m, l, g, dx, dy) {
  if (g.broken) return false;                        // 門が破れれば虎口も崩れる
  const a = axisOf(l, g), { u, v } = toUV(a, dx, dy), t = m.t;
  const v0 = a.half + t, v1 = v0 + g.masu;
  if (v < v0 - 1 || v > v1 + t) return false;
  const gL = g.off - g.w / 2, gR = g.off + g.w / 2;
  if (v <= v1) return Math.abs(u - gL) <= t / 2 || Math.abs(u - gR) <= t / 2;
  const from = g.open > 0 ? gR - g.w * 0.1 : gL - g.w * 0.9;
  return u > gL - g.w && u < gR + g.w && !(u > from && u < from + g.w);
}

function castleTerrainAt(x, y) {
  const m = MAP, t = m.t;
  const dx = x - m.cx, dy = y - m.cy;
  for (const l of m.layers) for (const g of l.gates) if (masuWall(m, l, g, dx, dy)) return "wall";
  // 施設は壁より先に判定する。崩れた施設はもう塞がない。
  for (const f of m.fac) {
    if (f.hp > 0 && Math.hypot(x - f.x, y - f.y) < f.r * 1.5) return "tower";
  }
  for (const l of m.layers) {
    if (inRect(dx, dy, l.hw + t, l.hh + t) && !inRect(dx, dy, l.hw, l.hh)) {
      for (const g of l.gates) {
        const a = axisOf(l, g), { u, v } = toUV(a, dx, dy);
        if (v > a.half - 1 && Math.abs(u - g.off) <= g.w / 2 + (g.broken ? 10 : 0)) {
          return g.broken ? "gateopen" : "gate";
        }
      }
      return "wall";
    }
  }
  const o = m.layers[0], band = m.moat.band, out = o.masu + t + 8;
  if (!inRect(dx, dy, o.hw + t + out, o.hh + t + out)
      && inRect(dx, dy, o.hw + t + out + band, o.hh + t + out + band)) {
    for (const g of o.gates) {
      const a = axisOf(o, g), { u, v } = toUV(a, dx, dy);
      if (v > 0 && Math.abs(u - gateOpenU(g)) <= g.w * 0.8) return "bridge";
    }
    return "moat";
  }
  const inner = m.layers[m.layers.length - 1];
  if (inRect(dx, dy, inner.hw, inner.hh)) return "honmaru";
  for (const l of m.layers) if (inRect(dx, dy, l.hw, l.hh)) return "kuruwa";
  return "plain";
}
// 攻城の道具。槍組の一部を割いて担がせる。効くのは門を破る速さと、矢倉からの被害だけ。
const SIEGE_KIT = {
  なし:   { gate: 1.0, guard: 1.0, note: "手勢のみ。" },
  破城槌: { gate: 3.0, guard: 1.0, note: "門の破壊が三倍。槍組の一部を割く。" },
  竹束:   { gate: 1.0, guard: 0.4, note: "城内からの射撃を四割に抑える。" },
  井楼:   { gate: 1.1, guard: 0.8, shoot: 1.7, note: "塀ごしに射かけられ、櫓を崩しやすい。" },
};
/* ------------------------------------------- 城内の最短経路（A*）
   壁と堀を避けて実際に通れる道を探す。回り込みの当て推量では、
   曲輪の中で壁をつたうだけになってしまう。 */
function buildNav(m) {
  const CS = 22;
  const w = Math.ceil(FIELD.w / CS), h = Math.ceil(FIELD.h / CS);
  const ok = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      ok[j * w + i] = passable(i * CS + CS / 2, j * CS + CS / 2) ? 1 : 0;
    }
  }
  m.nav = { CS, w, h, ok };
  return m.nav;
}
function navPath(m, x0, y0, x1, y1) {
  const nv = m.nav || buildNav(m);
  const { CS, w, h, ok } = nv;
  const ix = (x) => clamp(Math.floor(x / CS), 0, w - 1);
  const iy = (y) => clamp(Math.floor(y / CS), 0, h - 1);
  const near = (i0, j0) => {                       // 壁の中なら最寄りの通れる格子へ
    if (ok[j0 * w + i0]) return j0 * w + i0;
    for (let r = 1; r <= 6; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= w || j >= h) continue;
        if (ok[j * w + i]) return j * w + i;
      }
    }
    return -1;
  };
  const S = near(ix(x0), iy(y0)), T = near(ix(x1), iy(y1));
  if (S < 0 || T < 0) return null;
  if (S === T) return [{ x: x1, y: y1, r: 24 }];
  const N = w * h;
  const g = new Float32Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const seen = new Uint8Array(N);
  const tx = T % w, ty = (T / w) | 0;
  const hOf = (k) => { const i = k % w, j = (k / w) | 0; const dx = Math.abs(i - tx), dy = Math.abs(j - ty);
    return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  const open = [{ k: S, f: hOf(S) }];
  g[S] = 0;
  let found = false, guard = 0;
  while (open.length && guard++ < 60000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0].k;
    if (cur === T) { found = true; break; }
    if (seen[cur]) continue;
    seen[cur] = 1;
    const ci = cur % w, cj = (cur / w) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const nk = nj * w + ni;
      if (!ok[nk] || seen[nk]) continue;
      if (di && dj && (!ok[cj * w + ni] || !ok[nj * w + ci])) continue;   // 角抜けは禁じる
      const cost = g[cur] + (di && dj ? Math.SQRT2 : 1);
      if (cost < g[nk]) { g[nk] = cost; prev[nk] = cur; open.push({ k: nk, f: cost + hOf(nk) }); }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = T; k !== -1; k = prev[k]) { cells.push(k); if (k === S) break; }
  cells.reverse();
  // 曲がり角だけを残す
  const pts = [];
  let lastDir = null;
  for (let n = 1; n < cells.length; n++) {
    const a = cells[n - 1], b2 = cells[n];
    const d = `${(b2 % w) - (a % w)},${((b2 / w) | 0) - ((a / w) | 0)}`;
    if (d !== lastDir) {
      lastDir = d;
      pts.push({ x: (a % w) * CS + CS / 2, y: ((a / w) | 0) * CS + CS / 2, r: 30 });
    }
  }
  pts.push({ x: x1, y: y1, r: 26 });
  return pts;
}

// 城の外周を回り込む道順。壁沿いに滑るだけでは門へ辿り着けない。
function ringPath(m, hw, hh, fx, fy, target) {
  const pts = [
    { x: m.cx, y: m.cy + hh }, { x: m.cx + hw, y: m.cy + hh },
    { x: m.cx + hw, y: m.cy }, { x: m.cx + hw, y: m.cy - hh },
    { x: m.cx, y: m.cy - hh }, { x: m.cx - hw, y: m.cy - hh },
    { x: m.cx - hw, y: m.cy }, { x: m.cx - hw, y: m.cy + hh },
  ];
  const near = (x, y) => pts.reduce((bi, p, i) =>
    Math.hypot(p.x - x, p.y - y) < Math.hypot(pts[bi].x - x, pts[bi].y - y) ? i : bi, 0);
  const a = near(fx, fy), z = near(target.x, target.y);
  if (a === z) return [];
  const n = pts.length, fwd = (z - a + n) % n, back = (a - z + n) % n, out = [];
  if (fwd <= back) for (let k = 1; k <= fwd; k++) out.push(pts[(a + k) % n]);
  else for (let k = 1; k <= back; k++) out.push(pts[(a - k + n) % n]);
  return out;
}
function routeToGate(m, l, g, fx, fy) {
  const t = m.t, a = axisOf(l, g), o = m.layers[0];
  let ring;
  if (l.i === 0) {
    const out = o.masu + t + 8 + m.moat.band + 40;
    ring = { hw: o.hw + t + out, hh: o.hh + t + out };
  } else {
    const par = m.layers[l.i - 1];
    ring = { hw: Math.min(l.hw + t + g.masu + t + 36, par.hw - 28),
             hh: Math.min(l.hh + t + g.masu + t + 36, par.hh - 28) };
  }
  const entry = a.along === "x"
    ? { x: m.cx + gateOpenU(g), y: m.cy + a.sgn * ring.hh }
    : { x: m.cx + a.sgn * ring.hw, y: m.cy + gateOpenU(g) };
  // すでに門の近くにいるなら、外周へ回らずそのまま取り付く（破れた門を抜けるとき）
  const gp0 = gatePos(m, l, g);
  if (Math.hypot(fx - gp0.x, fy - gp0.y) < 190) {
    return [
      { ...fromUV(m, a, gateOpenU(g), a.half + t + g.masu + t + 10), r: 40 },
      { ...fromUV(m, a, g.off, a.half + t + g.masu / 2), r: 26 },
      { ...fromUV(m, a, g.off, a.half + t + 14), r: 22 },
    ];
  }
  // 城壁に貼りついているなら、まず外周まで退がる。でなければ壁に沿って擦るだけになる。
  const wp = [];
  let sx0 = fx, sy0 = fy;
  const dx0 = fx - m.cx, dy0 = fy - m.cy;
  if (Math.abs(dx0) < ring.hw - 6 && Math.abs(dy0) < ring.hh - 6) {
    const kk = 1 / Math.max(Math.abs(dx0) / ring.hw, Math.abs(dy0) / ring.hh, 1e-6);
    const back = { x: m.cx + dx0 * kk, y: m.cy + dy0 * kk, r: 80 };
    if (passable(back.x, back.y)) { wp.push(back); sx0 = back.x; sy0 = back.y; }
  }
  // 到達とみなす半径。城を回り込む地点は大まかに、虎口の中は細かく。
  wp.push(...ringPath(m, ring.hw, ring.hh, sx0, sy0, entry).map((q) => ({ ...q, r: 150 })));
  wp.push({ ...entry, r: 110 });
  wp.push({ ...fromUV(m, a, gateOpenU(g), a.half + t + g.masu + t + 10), r: 40 });
  wp.push({ ...fromUV(m, a, g.off, a.half + t + g.masu / 2), r: 26 });
  wp.push({ ...fromUV(m, a, g.off, a.half + t + 14), r: 22 });
  return wp;
}
// 目標の門まで、破れた門を順に抜けて至る道順。通り過ぎた地点は落とす。
function routeToCastleGate(m, g, cx, cy) {
  const a = axisOf(m.layers[g.layer], g), t = m.t;
  // 虎口の開き口までを最短経路で。そこから先は門までの短い道筋。
  const open = fromUV(m, a, gateOpenU(g), a.half + t + g.masu + t + 12);
  const tail = [
    { ...fromUV(m, a, g.off, a.half + t + g.masu / 2), r: 24 },
    { ...fromUV(m, a, g.off, a.half + t + 14), r: 20 },
  ];
  if (Math.hypot(cx - open.x, cy - open.y) < 46) return tail;
  const path = navPath(m, cx, cy, open.x, open.y);
  if (!path) return tail;
  return [...path, ...tail];
}
const gateReachable = (m, g) => g.layer === 0 || m.layers[g.layer - 1].gates.some((x) => x.broken);
// 抜けられる門のうち、いちばん内側の層を選ぶ。同じ層なら近いほう。
// 外周の門をいくつ破っても城は落ちない。破ったら中へ進むのが筋である。
function nearestOpenGate(m, x, y) {
  const c = m.gates.filter((g) => !g.broken && gateReachable(m, g));
  if (!c.length) return null;
  const deepest = c.reduce((a, g) => Math.max(a, g.layer), 0);
  const inner = c.filter((g) => g.layer === deepest);
  return inner.sort((a, b) => {
    const pa = gatePos(m, m.layers[a.layer], a), pb = gatePos(m, m.layers[b.layer], b);
    return Math.hypot(pa.x - x, pa.y - y) - Math.hypot(pb.x - x, pb.y - y);
  })[0];
}
const BLOCKED = { wall: 1, gate: 1 };
function passable(x, y) { return !BLOCKED[terrainAt(x, y)]; }
// 城方は自分の城の門を通れる。ただし内へ入るときだけ（外へ出るのは「打って出る」）。
function passableFor(c, b, x, y) {
  if (passable(x, y)) return true;
  if (!b || !b.map || !c || c.side === b.attacker) return false;
  if (c.sortie) return true;                      // 打って出ている間は外へも抜けられる
  if (terrainAt(x, y) !== "gate") return false;
  const m = b.map;
  return Math.hypot(x - m.cx, y - m.cy) < Math.hypot(c.x - m.cx, c.y - m.cy);
}

function terrainAt(x, y) {
  if (MAP) return castleTerrainAt(x, y);
  if (hasRiver()) {
    const sh = riverShift(x);
    if (y > RIVER.top + sh && y < RIVER.bot + sh) {
      if (x > RIVER.bridge[0] && x < RIVER.bridge[1]) return "bridge";
      if (x > RIVER.ford[0] && x < RIVER.ford[1]) return "ford";
      return "deep";
    }
  }
  for (const f of FORESTS) if ((x - f.x) ** 2 + (y - f.y) ** 2 < f.r ** 2) return "forest";
  for (const f of WOODS) if ((x - f.x) ** 2 + (y - f.y) ** 2 < f.r ** 2) return "wood";
  for (const m of MARSH) if ((x - m.x) ** 2 + (y - m.y) ** 2 < m.r ** 2) return "marsh";
  for (const h of HILLS) if ((x - h.x) ** 2 + (y - h.y) ** 2 < h.r ** 2) return "hill";
  return "plain";
}
// 速度・戦闘力・陣形維持・視界・騎馬適性を一つの表で管理する（GDD 8.6）
const TERRAIN = {
  plain: { speed: 1.0, fight: 1.0, cohesion: 0, sight: 260, horse: 1.0, charge: true, label: "平地" },
  forest: { speed: 0.65, fight: 0.85, cohesion: -6, sight: 95, horse: 0.6, charge: false, label: "森" },
  wood: { speed: 0.82, fight: 0.92, cohesion: -3, sight: 165, horse: 0.85, charge: true, label: "林" },
  marsh: { speed: 0.5, fight: 0.8, cohesion: -9, sight: 240, horse: 0.45, charge: false, label: "湿地" },
  hill: { speed: 0.7, fight: 1.15, cohesion: -2, sight: 360, horse: 0.8, charge: true, label: "丘" },
  bridge: { speed: 0.95, fight: 0.85, cohesion: -5, sight: 260, horse: 0.9, charge: false, label: "橋" },
  ford: { speed: 0.3, fight: 0.7, cohesion: -14, sight: 260, horse: 0.5, charge: false, label: "浅瀬" },
  deep: { speed: 0.1, fight: 0.5, cohesion: -24, sight: 260, horse: 0.25, charge: false, label: "深い川" },
  wall: { speed: 0.01, fight: 1.0, cohesion: 0, sight: 300, horse: 0.1, charge: false, label: "城壁" },
  gate: { speed: 0.01, fight: 1.0, cohesion: 0, sight: 300, horse: 0.1, charge: false, label: "城門" },
  gateopen: { speed: 0.8, fight: 0.75, cohesion: -12, sight: 200, horse: 0.6, charge: false, label: "破れた門" },
  moat: { speed: 0.28, fight: 0.65, cohesion: -16, sight: 260, horse: 0.3, charge: false, label: "堀" },
  bridge2: { speed: 0.9, fight: 0.8, cohesion: -6, sight: 260, horse: 0.85, charge: false, label: "土橋" },
  tower: { speed: 0.55, fight: 1.3, cohesion: -2, sight: 430, horse: 0.3, charge: false, label: "櫓" },
  kuruwa: { speed: 0.92, fight: 1.0, cohesion: -3, sight: 210, horse: 0.75, charge: true, label: "曲輪" },
  honmaru: { speed: 0.88, fight: 1.12, cohesion: -3, sight: 230, horse: 0.7, charge: false, label: "本丸" },
};
// 天候（GDD 8.8：悪天候は疲労を増やす）
const WEATHER = {
  晴: { sight: 1.0, speed: 1.0, fatigue: 1.0, teppo: 1.0, note: "視界も足場も良い。" },
  曇: { sight: 0.9, speed: 1.0, fatigue: 1.05, teppo: 1.0, note: "遠くが見えにくい。" },
  雨: { sight: 0.72, speed: 0.85, fatigue: 1.45, teppo: 0.12, note: "火縄が湿り、鉄砲がほぼ使えない。足場も悪い。" },
};
const ARM_STATS = {
  yari: { melee: 1.2, range: 0, rof: 0, vol: 0, speed: 34, color: "#6E7A55", label: "槍" },
  yumi: { melee: 0.45, range: 190, rof: 1.5, vol: 1.0, speed: 34, color: "#7E9A52", label: "弓" },
  teppo: { melee: 0.4, range: 150, rof: 4.2, vol: 3.2, speed: 30, color: "#B07B3A", label: "鉄砲" },
  kiba: { melee: 1.9, range: 0, rof: 0, vol: 0, speed: 56, color: "#A2604A", label: "騎馬" },
};
// 勢力色を暗く／明るくする。敵味方は色、直属・地域は明暗と縁で区別する（GDD 6.3）
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
// 10人駒。兵科は色ではなく形で示し、先端で向きが分かるようにする（GDD 8.1）
/* 兵科ごとの駒の形（GDD 8.10）
   槍は矢羽根、弓は細身の三日月、鉄砲は前が広い台形、
   騎馬は後ろが二股に割れた菱形、船は舟形。
   いずれも前が尖り、向きが判るようにしてある。
   濃さの序列は 騎馬＞鉄砲＞槍＞弓。遠目に騎馬の重みが出る。 */
const KOMA_SHAPE = {
  yari:  [[9, 0], [-2, 2.6], [-5, 0], [-2, -2.6]],
  yumi:  [[6.4, 0], [-1.6, 2.3], [-4.2, 1.6], [-1, 0], [-4.2, -1.6], [-1.6, -2.3]],
  teppo: [[6, 3.0], [6, -3.0], [-4, -2.0], [-4, 2.0]],
  kiba:  [[12, 0], [1, 4.2], [-4, 2.0], [-8, 3.4], [-5, 0], [-8, -3.4], [-4, -2.0], [1, -4.2]],
  fune:  [[11, 0], [5, 4.4], [-7, 4.0], [-8.5, 0], [-7, -4.0], [5, -4.4]],
};
function drawKoma(ctx, x, y, f, type, fill, stroke, k) {
  const m = (k || 1) * 0.46;                 // 従来の大きさに合わせる
  const pts = KOMA_SHAPE[type] || KOMA_SHAPE.yari;
  const cs = Math.cos(f), sn = Math.sin(f);
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const px = x + (pts[i][0] * cs - pts[i][1] * sn) * m;
    const py = y + (pts[i][0] * sn + pts[i][1] * cs) * m;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 0.7; ctx.stroke();
}

const FORMATIONS = ["横陣", "鶴翼", "魚鱗", "鋒矢", "雁行", "方陣", "長蛇"];
// 陣形は数値補正ではなく50人組の実配置。兵科ごとに置きたい位置を持たせる（GDD 8.4）
// wx＝中央0〜翼1、wy＝前0〜後1。原点からの距離は直属を内側へ寄せるのに使う。
const FORM_ROLE = {
  横陣: { yari: [0.35, 0.10], kiba: [0.90, 0.30], yumi: [0.30, 0.80], teppo: [0.20, 0.72] },
  鶴翼: { yari: [0.45, 0.15], kiba: [1.00, 0.45], yumi: [0.25, 0.70], teppo: [0.15, 0.62] },
  魚鱗: { yari: [0.30, 0.08], kiba: [0.25, 0.05], yumi: [0.35, 0.85], teppo: [0.25, 0.75] },
  鋒矢: { yari: [0.20, 0.10], kiba: [0.10, 0.02], yumi: [0.45, 0.92], teppo: [0.35, 0.85] },
  雁行: { yari: [0.35, 0.20], kiba: [0.95, 0.35], yumi: [0.30, 0.80], teppo: [0.20, 0.70] },
  方陣: { yari: [0.90, 0.30], kiba: [0.55, 0.75], yumi: [0.20, 0.50], teppo: [0.15, 0.45] },
  長蛇: { yari: [0.40, 0.15], kiba: [0.40, 0.55], yumi: [0.35, 0.85], teppo: [0.30, 0.78] },
};
// 陣形の組み直しにかかる時間。統率が高いほど速い（最大6秒）
const reformTime = (gen) => clamp(7.6 - (gen ? gen.lead : 55) / 16, 2.0, 6.0);
const FORM_NOTE = {
  横陣: "正面が広く、多くの組が同時に槍を合わせられる。側面は薄い。",
  鶴翼: "両翼を前へ張り出して敵を包み込む。中央は薄く、押し込まれると崩れやすい。",
  魚鱗: "先端に槍と騎馬を集めて一点を破る。正面は狭く、側面を突かれやすい。",
  鋒矢: "矢尻に騎馬を置いて一点へ突き入る突撃専用の陣。突撃が長く続き隊列も崩れにくいが、守りは最も薄い。",
  雁行: "斜めに構え、片翼を前に出す。移動しながら当たるのに向く。",
  方陣: "四方に槍を向けて密集する。包囲や乱戦に強いが、攻めは鈍い。",
  長蛇: "縦一列。狭い道や渡河には向くが、横から突かれると総崩れになる。",
};

function rot(sx, sy, th) {
  const c = Math.cos(th), s = Math.sin(th);
  return [-sx * s - sy * c, sx * c - sy * s];
}
// 50人組の占める幅（10人駒5個ぶん）に合わせ、組と組が隙間なく並ぶ間隔にする。
const KOMA = 5.0;                 // 10人駒の間隔
const SP = 5 * KOMA + 2;          // 50人組の横間隔 ≒ 組の幅
const ROW = KOMA + 6;             // 列（段）の間隔
function layoutSlots(form, n) {
  const s = [];
  if (form === "横陣") {
    const want = clamp(Math.round(Math.sqrt(n * 2.2)), 3, 22);   // 組数が増えるほど正面を広げる
    const per = Math.max(3, Math.ceil(n / Math.max(1, Math.ceil(n / want))));
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / per), col = i % per, cols = Math.min(per, n - row * per);
      s.push({ x: (col - (cols - 1) / 2) * SP, y: row * ROW, row });
    }
  } else if (form === "鶴翼") {
    // 中央を引き、両翼を前へ張り出して敵を包む（敵に対してV字に開く）
    const per = clamp(Math.round(Math.sqrt(n * 3)), 4, 26);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / per), idx = i % per, cols = Math.min(per, n - row * per);
      const k = idx - (cols - 1) / 2;
      s.push({ x: k * SP, y: -Math.abs(k) * ROW * 0.62 + row * ROW * 1.2, row });
    }
  } else if (form === "鋒矢") {
    // 先端に一組、その後ろへ左右へ開きながら二列。矢尻から矢柄へと続く形。
    s.push({ x: 0, y: 0, row: 0 });
    let i = 1, row = 1;
    while (i < n) {
      const spread = Math.min(row, 4) * SP * 0.5;   // 矢尻は四段までで開き切り、以降は矢柄が伸びる
      for (const side of [-1, 1]) {
        if (i >= n) break;
        s.push({ x: side * spread, y: row * ROW * 0.95, row });
        i++;
      }
      if (i < n) { s.push({ x: 0, y: row * ROW * 0.95, row }); i++; }
      row++;
    }
  } else if (form === "魚鱗") {
    let i = 0, row = 0;
    while (i < n) { const cnt = row + 1; for (let j = 0; j < cnt && i < n; j++, i++) s.push({ x: (j - (cnt - 1) / 2) * SP, y: row * ROW, row }); row++; }
  } else if (form === "雁行") {
    const per = Math.min(10, n);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / per), idx = i % per, cols = Math.min(per, n - row * per);
      s.push({ x: (idx - (cols - 1) / 2) * SP * 0.9, y: idx * ROW * 0.45 + row * ROW * 1.3, row });
    }
  } else if (form === "方陣") {
    const side = Math.ceil(Math.sqrt(n));
    for (let i = 0; i < n; i++) { const r = Math.floor(i / side), c = i % side; s.push({ x: (c - (side - 1) / 2) * SP, y: (r - (side - 1) / 2) * ROW, row: r }); }
  } else { for (let i = 0; i < n; i++) s.push({ x: 0, y: i * ROW, row: i }); }
  return s;
}
function makeCorps(side, gen, retinue, local, retTrain, localTrain, x, y, facing, color) {
  // 一隊が抱えられる兵には限りがある。あふれた分は隊として立てられない。
  const over = Math.max(0, retinue + local - MAX_CORPS_MEN);
  if (over > 0) {
    const cutLocal = Math.min(local, over);
    local -= cutLocal;
    retinue -= (over - cutLocal);
  }
  const squads = []; let sid = 0;
  // 名簿があればそれを使う。なければ総数から組み立てる（旧いセーブや守備隊など）。
  const build = (total, origin, train, rost) => {
    const list = rost && rost.length
      ? rost.map((q) => ({ men: q.m, type: q.t, src: q.id }))
      : (() => {
          const out = [];
          for (const a of ARMS) {
            let men = Math.round(total * a.ratio);
            while (men > 0) { const m = Math.min(50, men); out.push({ men: m, type: a.key, src: null }); men -= m; }
          }
          return out;
        })();
    for (const u of list) {
        const m = u.men;
        if (m <= 0) continue;
        const ang = Math.random() * Math.PI * 2;
        squads.push({
          id: `${gen.id}-${sid++}`, type: u.type, men: m, max: m, origin, src: u.src,
          cohesion: clamp(train + (Math.random() * 12 - 6), 20, 100),
          x, y, facing, cool: 0, engaged: false, foe: null, link: null, aim: null,
          // 乱れは毎フレーム無作為化せず、この固定した「乱れ目標」へ補間する（GDD 8.3）
          jx: Math.cos(ang), jy: Math.sin(ang), ja: Math.random() * 2 - 1, seed: Math.random() * 1000,
        });
    }
  };
  build(retinue, "直属", retTrain, gen.rost);
  build(local, "地域", localTrain, gen.locRost);
  return {
    id: gen.id, side, gen, name: gen.name, color, x, y, facing, order: "待機",
    auto: true,                          // 委任。大名は諸隊に差配を委ねて戦を始める
    tx: x, ty: y, formation: "横陣", morale: 78 + gen.lead * 0.15,
    squads, routed: false, dead: false, destroyed: false, ambush: false, revealed: true,
    lastSeen: null, seen: false, loss: { 直属: 0, 地域: 0 }, feats: [],
    fatigue: 0, chargeT: 0, reformT: 0, faceTo: null, pending: null, pinch: 0, northStart: hasRiver() && y < RIVER.top,
    bank0: hasRiver() ? (y < (RIVER.top + RIVER.bot) / 2 + riverShift(x) ? -1 : 1) : 0, detach: false, parentId: null, task: null, autonomous: false, boxed: false,
  };
}
const corpsMen = (c) => c.squads.reduce((s, q) => s + q.men, 0);
const corpsMax = (c) => c.squads.reduce((s, q) => s + q.max, 0);

function placeSquads(c, snap) {
  // 各組の定位置は陣形が決まった時点のもの。毎瞬間は割り当て直さない。
  const live = c.squads.filter((q) => q.men > 0).length;
  const key = `${c.formation}|${live}|${c.order === "突撃" ? "c" : "n"}`;
  if (!snap && c.slotKey === key) return;
  c.slotKey = key;
  const slots = layoutSlots(c.formation, c.squads.length);
  // 各位置を「翼か中央か」「前か後か」「武将からの近さ」で表し、
  // 兵科ごとの置きたい位置と、直属を武将周りに寄せる要請から割り当てる。
  const maxX = Math.max(1, ...slots.map((x) => Math.abs(x.x)));
  const minY = Math.min(...slots.map((x) => x.y)), maxY = Math.max(...slots.map((x) => x.y));
  const spanY = Math.max(1, maxY - minY);
  const cy0 = slots.reduce((a, x) => a + x.y, 0) / Math.max(1, slots.length);
  const feat = slots.map((sl) => ({
    fx: Math.abs(sl.x) / maxX, fy: (sl.y - minY) / spanY,
    fd: Math.hypot(sl.x, sl.y - cy0) / Math.max(1, Math.hypot(maxX, spanY / 2)),
  }));
  // 突撃のときは騎馬を前に立てる。組が飛び出すのではなく、陣形の中の持ち場が入れ替わる。
  const CHARGE_ROLE = { yari: [0.40, 0.42], kiba: [0.44, 0.08], yumi: [0.34, 0.88], teppo: [0.30, 0.82] };
  const role = c.order === "突撃" ? CHARGE_ROLE : (FORM_ROLE[c.formation] || FORM_ROLE["横陣"]);
  const cost = (q, i) => {
    const w = role[q.type] || [0.4, 0.4];
    const f = feat[i];
    return (f.fx - w[0]) ** 2 + (f.fy - w[1]) ** 2 + (q.origin === "直属" ? f.fd * 0.55 : -f.fd * 0.35);
  };
  const free = slots.map((_, i) => i);
  const queue = [...c.squads].sort((a, z) => {
    const pri = (q) => (q.origin === "直属" ? 0 : 1) * 10 + (q.type === "yari" ? 0 : q.type === "kiba" ? 1 : 2);
    return pri(a) - pri(z);
  });
  const order = [], slotOf = [];
  for (const q of queue) {
    let best = 0, bv = Infinity;
    for (let k = 0; k < free.length; k++) { const v = cost(q, free[k]); if (v < bv) { bv = v; best = k; } }
    const i = free.splice(best, 1)[0];
    order.push(q); slotOf.push(slots[i]);
  }
  const maxRow = slots.reduce((a, x) => Math.max(a, x.row || 0), 0);
  order.forEach((q, i) => {
    const s = slotOf[i] || { x: 0, y: 0, row: 0 };
    // 最後尾の段は予備隊とし、前線が薄くなるまで前へ出さない（GDD 8.4）
    q.reserve = maxRow >= 2 && (s.row || 0) === maxRow && !c.forceAll;
    const [rx, ry] = rot(s.x, s.y, c.facing);
    // 陣形維持が高いうちは等間隔・同方向。落ちて初めて乱れが出る（GDD 8.3）
    const dis = clamp((78 - q.cohesion) / 78, 0, 1);
    q.dis = dis;
    const jit = Math.pow(dis, 1.7) * 4.5;   // 見づらくならないよう、間隔の開きは小さく抑える
    q.slotX = rx + q.jx * jit;
    q.slotY = ry + q.jy * jit;
    if (snap) { q.x = c.x + q.slotX; q.y = c.y + q.slotY; q.facing = c.facing; }
  });
}
// ------------------------------------------------ 分遣命令（GDD 8.5）
// 指揮能力＝統率・知略から算出。目安は A級3隊 / B級2隊 / C級1隊。
function commandCapacity(gen) {
  const v = gen.lead * 0.6 + gen.wit * 0.4;
  return v >= 74 ? 3 : v >= 60 ? 2 : 1;
}
const DETACH_DEFS = [
  {
    key: "騎馬側面攻撃", pick: (c) => c.squads.filter((q) => q.type === "kiba"),
    need: (c, men) => men >= 100 && c.morale >= 50,
    why: "騎馬100以上・士気50以上",
  },
  {
    key: "弓鉄砲高地占拠", pick: (c) => c.squads.filter((q) => ARM_STATS[q.type].range > 0),
    need: (c, men) => men >= 100 && HILLS.length > 0, why: "遠隔兵100以上・到達可能な高地",
  },
  {
    key: "橋渡河点防衛", pick: (c) => c.squads.filter((q) => q.type === "yari").slice(0, 8),
    need: (c, men) => corpsMen(c) >= 500 && men >= 100 && RIVER.bot > RIVER.top + 4,
    why: "兵500以上・橋又は渡河点",
  },
  {
    key: "森林偵察", pick: (c) => c.squads.filter((q) => q.type === "yumi").slice(0, 1),
    need: (c, men) => (c.gen.wit >= 60 && men >= 50) && FORESTS.length > 0, why: "知略60以上・偵察兵50以上・森が必要",
  },
];
function detachOptions(b, parent) {
  if (b.map) return [];        // 城攻めに渡河防衛や高地占拠はない
  const used = b.corps.filter((x) => x.parentId === parent.id && !x.dead).length;
  const cap = commandCapacity(parent.gen);
  return DETACH_DEFS.map((d) => {
    const sq = d.pick(parent);
    const men = sq.reduce((a, q) => a + q.men, 0);
    return { ...d, men, ok: used < cap && sq.length > 0 && d.need(parent, men), cap, used };
  });
}
function makeDetachment(b, parent, key) {
  const def = DETACH_DEFS.find((d) => d.key === key);
  const squads = def.pick(parent);
  if (!squads.length) return null;
  parent.squads = parent.squads.filter((q) => !squads.includes(q));
  const c = {
    id: `${parent.id}#${key}`, side: parent.side, gen: parent.gen, color: parent.color,
    name: `${parent.gen.name}隊 ${key}`, x: parent.x, y: parent.y, facing: parent.facing,
    order: "移動", tx: parent.x, ty: parent.y, morale: parent.morale, squads,
    formation: key === "橋渡河点防衛" ? "横陣" : key === "騎馬側面攻撃" ? "雁行" : "方陣",
    routed: false, dead: false, destroyed: false, ambush: false, revealed: true,
    lastSeen: { x: parent.x, y: parent.y, t: b.t }, seen: false,
    loss: { 直属: 0, 地域: 0 }, feats: [], fatigue: parent.fatigue,
    detach: true, parentId: parent.id, task: key, autonomous: false, boxed: false,
  };
  placeSquads(c, true);
  b.corps.push(c);
  b.log.push({ t: b.t, text: `${parent.name}隊より${key}の分遣隊が出た。` });
  return c;
}
/* 城方の命令（GDD 9.4）。打って出る、城へ戻る、他の門へ移る。 */
function sallyOut(b, c, MAP) {
  if (!c || c.side === b.attacker) return false;
  const g2 = c.holdGate;
  const foes = b.corps.filter((x) => x.side === b.attacker && !x.dead && !x.destroyed && !x.routed);
  if (!foes.length) return false;
  const t2 = [...foes].sort((x, y2) =>
    Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0];
  c.sallied = true; c.sallyAt = b.t; c.manualSally = true;
  issueOrder(b, c, { order: "接戦", tx: t2.x, ty: t2.y, target: t2.id });
  b.log.push({ t: b.t, text: `${c.gen.name}隊が${g2 ? g2.key : "城"}を開いて討って出た。` });
  return true;
}
function returnToGate(b, c, MAP) {
  if (!c || !MAP) return false;
  c.sallied = false; c.chasing = false; c.manualSally = false; c.sallyLogged = false;
  const g2 = c.holdGate;
  if (g2) {
    const l2 = MAP.layers[g2.layer], a2 = axisOf(l2, g2);
    const p2 = fromUV(MAP, a2, g2.off, a2.half - 14);
    issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
  } else {
    issueOrder(b, c, { order: "移動", tx: MAP.cx, ty: MAP.cy });
  }
  b.log.push({ t: b.t, text: `${c.gen.name}隊に城へ戻るよう命じた。` });
  return true;
}
function moveToGate(b, c, MAP, gate) {
  if (!c || !MAP) return false;
  c.sallied = false; c.chasing = false; c.manualSally = false;
  if (gate === "本丸") {
    c.holdGate = null;
    issueOrder(b, c, { order: "移動", tx: MAP.cx, ty: MAP.cy });
    b.log.push({ t: b.t, text: `${c.gen.name}隊は本丸へ移った。` });
    return true;
  }
  c.holdGate = gate;
  const l2 = MAP.layers[gate.layer], a2 = axisOf(l2, gate);
  const p2 = fromUV(MAP, a2, gate.off, a2.half - 14);
  issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
  b.log.push({ t: b.t, text: `${c.gen.name}隊は${gate.key}へ移った。` });
  return true;
}

// 分遣隊を呼び戻す（GDD 8.7）。頃合いを待たず、こちらの意思で返す。
function recallDetachment(b, c) {
  if (!c || !c.detach || c.dead) return false;
  const parent = b.corps.find((x) => x.id === c.parentId);
  if (!parent || parent.dead || parent.destroyed) return false;
  c.task = "帰陣";
  c.detachT = 999;
  c.autonomous = false;
  c.order = "移動";
  c.tx = parent.x; c.ty = parent.y;
  c.wp = null;
  b.log.push({ t: b.t, text: `${c.name}に帰陣を命じた。` });
  return true;
}
// 分遣隊の自律行動。指揮圏（本隊から400）を離れると自律AIへ移る。
function detachAI(b, c, alive) {
  if (!c.task) return false;
  const parent = b.corps.find((x) => x.id === c.parentId);
  // 分遣は永く離れているものではない。頃合いを見て本隊へ戻る。
  c.detachT = (c.detachT || 0) + 0.05;
  const spent = c.detachT > 70 || corpsMen(c) < corpsMax(c) * 0.55 || c.morale < 40;
  if (spent && parent && !parent.dead && !parent.destroyed) {
    c.task = "帰陣";
    const d0 = Math.hypot(parent.x - c.x, parent.y - c.y);
    if (d0 < 70) {
      // 本隊に追いついたので組を返す
      for (const q of c.squads) { if (q.men > 0) parent.squads.push(q); }
      c.squads = [];
      c.dead = true;
      placeSquads(parent, false);
      b.log.push({ t: b.t, text: `${c.name}が本隊へ帰った。` });
      return true;
    }
    c.tx = parent.x; c.ty = parent.y; c.order = "移動";
    return true;
  }
  c.autonomous = !parent || parent.dead || Math.hypot(parent.x - c.x, parent.y - c.y) > 400;
  const foes = alive.filter((o) => o.side !== c.side && (o.seen || !o.ambush));
  const nearest = foes.length
    ? foes.reduce((a, o) => (Math.hypot(o.x - c.x, o.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? o : a), foes[0])
    : null;
  if (c.task === "騎馬側面攻撃") {
    if (!nearest) return true;
    const d = Math.hypot(nearest.x - c.x, nearest.y - c.y);
    if (d > 240) {  // まず側面へ回り込む
      const side = c.x < nearest.x ? -1 : 1;
      c.tx = nearest.x + side * 260; c.ty = nearest.y; c.order = "移動";
    } else { c.tx = nearest.x; c.ty = nearest.y; c.order = "接戦"; }
    return true;
  }
  if (c.task === "弓鉄砲高地占拠") {
    const h = nearestOf(HILLS, c.x, c.y);
    if (!h) { c.task = "帰陣"; return true; }                // 高地のない野もある
    if (Math.hypot(h.x - c.x, h.y - c.y) > 40) { c.tx = h.x; c.ty = h.y; c.order = "移動"; }
    else { c.order = "射撃"; c.tx = c.x; c.ty = c.y; }
    return true;
  }
  if (c.task === "橋渡河点防衛") {
    if (!hasRiver()) { c.task = "帰陣"; return true; }      // 川のない野に渡河点はない
    const gx = (RIVER.bridge[0] + RIVER.bridge[1]) / 2;
    // 自分がいる岸を守る。側で決め打ちにすると、北に布陣した側だけが有利になる。
    const sh = riverShift(gx);
    const gy = c.y > (RIVER.top + RIVER.bot) / 2 + sh ? RIVER.bot + sh + 40 : RIVER.top + sh - 40;
    if (Math.hypot(gx - c.x, gy - c.y) > 30) { c.tx = gx; c.ty = gy; c.order = "移動"; }
    else {
      c.order = "待機"; c.tx = c.x; c.ty = c.y;
      if (!c.feats.includes("橋防衛")) c.feats.push("橋防衛");
    }
    return true;
  }
  if (c.task === "森林偵察") {
    const f = nearestOf(FORESTS, c.x, c.y);
    if (!f) { c.task = "帰陣"; return true; }
    if (Math.hypot(f.x - c.x, f.y - c.y) > 40) { c.tx = f.x; c.ty = f.y; c.order = "移動"; }
    else { c.order = "待機"; c.tx = c.x; c.ty = c.y; }
    return true;
  }
  return false;
}

// ------------------------------- 命令伝達（GDD 8.5：距離による遅延と指揮圏）
// 本陣（総大将、いなければ最も統率の高い隊）から騎馬伝令を出す。
// 伝令の脚は約260／秒。統率が高いほど命令が早く伝わり、指揮圏は 300＋統率×3。
const COURIER_SPEED = 260;
function commandPost(b, side) {
  const list = b.corps.filter((c) => c.side === side && !c.dead && !c.destroyed && !c.detach && !c.routed);
  return list.find((c) => c.gen.lord) || list.sort((a, z) => z.gen.lead - a.gen.lead)[0] || null;
}
// 戦場の広さは兵数と城の規模で変わる。指揮圏と伝令もそれに合わせて伸ばす。
// これを怠ると、広い戦場では隊が軒並み指揮圏外になり、命令が届かなくなる。
const fieldScale = () => Math.max(1, FIELD.w / BASE.w);
function commandRange(post) { return (post ? 300 + post.gen.lead * 3 : 600) * fieldScale(); }
function commandDelay(b, c) {
  const post = commandPost(b, c.side);
  if (!post || post === c) return 0;
  const d = Math.hypot(post.x - c.x, post.y - c.y);
  const skill = 0.7 + post.gen.lead / 150;
  return clamp((d / (COURIER_SPEED * fieldScale())) / skill + 0.3, 0, 9);
}
function outOfCommand(b, c) {
  // 城攻めは攻め口ごとに寄手大将を置いて始める。城の反対側にいても命令は通る。
  // （伝令の時間はかかる。届かないのではなく、遅れる。）
  if (b.map) return false;
  const post = commandPost(b, c.side);
  if (!post || post === c) return false;
  return Math.hypot(post.x - c.x, post.y - c.y) > commandRange(post);
}
// 同じ命令のまま狙いを直すだけなら伝令はいらない。命令そのものを変えるときに時間がかかる。
// 戦場に大きな出来事を知らせる（GDD 15.2）
function notify(b, text, kind) {
  if (!b) return;
  b.notices = b.notices || [];
  b.notices.push({ text, kind: kind || "info", t: b.t });
  if (b.notices.length > 6) b.notices.shift();
  b.log.push({ t: b.t, text });
}
function issueOrder(b, c, patch) {
  if (!c || c.dead || c.destroyed) return;
  c.pinned = false;                      // 命令を受けたら門の前の据え置きを解く
  if (!AI_ISSUING && c.side === "P") c.auto = false;   // 手ずから命じた隊は委任を離れる
  if (!patch.keepPath) c.wp = null;      // 新たな命令は道順を打ち消す
  const apply = () => Object.assign(c, patch);
  if (b.phase === "deploy" || patch.order === c.order) { apply(); c.pending = null; return; }
  // 味方への指示はすぐに効かせる（伝令の間があると操作が鈍く感じられるため）
  if (c.side === "P") { apply(); c.pending = null; return; }
  if (outOfCommand(b, c)) { c.pending = null; c.autonomous = true; return; }   // 命令が届かない
  // 同じ命令を出し直しても伝令は振り出しに戻らない。狙いだけ差し替える。
  if (c.pending && c.pending.patch.order === patch.order) { c.pending.patch = patch; return; }
  c.pending = { patch, t: commandDelay(b, c) };
}

function createBattle(playerCorps, enemyCorps, attackerSide) {
  const r = Math.random();
  const weather = r < 0.18 ? "雨" : r < 0.45 ? "曇" : "晴";
  const b = {
    t: 0, phase: "deploy", corps: [...playerCorps, ...enemyCorps],
    initial: { P: playerCorps.reduce((s, c) => s + corpsMen(c), 0), E: enemyCorps.reduce((s, c) => s + corpsMen(c), 0) },
    log: [], result: null, attacker: attackerSide, aiClock: 0,
    weather, dusk: 480, retreat: null, orderly: false, fx: [],
  };
  for (const c of b.corps) { placeSquads(c, true); c.lastSeen = { x: c.x, y: c.y, t: 0 }; }
  return b;
}
function applyDamage(b, fCorps, e, dmg, flank, valor) {
  // 挟撃を受けている隊は受ける損害がやや増える（二方向1.12倍、三方向以上1.22倍）
  const pinch = fCorps.pinch >= 3 ? 1.22 : fCorps.pinch === 2 ? 1.12 : 1;
  const before = e.men;
  e.men = Math.max(0, e.men - dmg * pinch);
  const lost = before - e.men;
  fCorps.loss[e.origin] += lost;
  // 武勇は「相手の陣形を崩す圧力」として効く。士気そのものは下げない（GDD 8.3）
  e.cohesion -= lost * 0.7 * flank * (0.55 + (valor || 60) / 100);
  const share = lost / Math.max(1, corpsMax(fCorps));
  fCorps.morale -= share * 100 * 2.2 * (1 + (flank - 1) * 0.8);
}
function stepBattle(b, dt) {
  if (b.phase !== "fight") return;
  b.t += dt; b.aiClock -= dt;
  for (const c of b.corps) {
    if (!c.pending) continue;
    c.pending.t -= dt;
    if (c.pending.t <= 0) { Object.assign(c, c.pending.patch); c.pending = null; }
  }
  if (b.fx.length) {
    for (const f of b.fx) f.t += dt;
    b.fx = b.fx.filter((f) => f.t < f.life);
  }
  if (b.aiClock <= 0) { battleAI(b); b.aiClock = 0.6; }
  const alive = b.corps.filter((c) => !c.dead && !c.destroyed);

  for (const c of alive) {
    const foes = alive.filter((o) => o.side !== c.side);
    let seen = false;
    for (const f of foes) {
      for (const q of f.squads) {
        const t = TERRAIN[terrainAt(c.x, c.y)];
        const sight = (c.ambush && !c.revealed ? 95 : t.sight) * WEATHER[b.weather].sight * fieldScale();
        if (Math.hypot(q.x - c.x, q.y - c.y) < sight) { seen = true; break; }
      }
      if (seen) break;
    }
    c.seen = seen;
    if (seen) c.lastSeen = { x: c.x, y: c.y, t: b.t };
    // 挟撃：いくつの方角から敵に取り付かれているか。四方位で数える。
    const dirs = new Set();
    for (const o of foes) {
      if (o.destroyed || Math.hypot(o.x - c.x, o.y - c.y) > 190) continue;
      dirs.add(Math.round((Math.atan2(o.y - c.y, o.x - c.x) + Math.PI) / (Math.PI / 2)) % 4);
    }
    c.pinch = dirs.size;
    if (c.ambush && !c.revealed) {
      for (const f of foes) {
        if (Math.hypot(f.x - c.x, f.y - c.y) < 150) {
          c.revealed = true; f.morale -= 16;
          for (const q of f.squads) q.cohesion -= 12;
          b.log.push({ t: b.t, text: `${c.name}隊の伏兵が${f.name}隊に現れた。` });
          c.feats.push("伏兵成功");
        }
      }
    }
  }

  // 代表点（武将の位置）を兵の側に留める。敗走中や分遣も含め、すべての隊に及ぼす。
  for (const c of alive) {
    // 代表点（武将の位置）が兵から離れすぎないようにする。
    // 兵が川や壁で足止めされている間に武将だけが先へ出てしまうのを防ぐ。
    {
      let mx2 = 0, my2 = 0, mn = 0;
      for (const q of c.squads) { if (q.men <= 0) continue; mx2 += q.x * q.men; my2 += q.y * q.men; mn += q.men; }
      if (mn > 0) {
        const cx2 = mx2 / mn, cy2 = my2 / mn;
        // 武将の居所は隊の後ろ寄り。旗本は兵の後ろに構えるもので、単騎で前へ出ることはない。
        let depth = 0;
        for (const q of c.squads) {
          if (q.men <= 0) continue;
          const rel = (q.x - cx2) * Math.cos(c.facing) + (q.y - cy2) * Math.sin(c.facing);
          if (-rel > depth) depth = -rel;
        }
        // 最後尾ではなく、後ろから二列目。背後には一列の組を残す（後方の守り）。
        const back = Math.max(0, Math.min(depth, 90) - ROW * 1.6);
        let gx2 = cx2 - Math.cos(c.facing) * back, gy2 = cy2 - Math.sin(c.facing) * back;
        if (!passable(gx2, gy2)) { gx2 = cx2; gy2 = cy2; }
        c.gx = gx2; c.gy = gy2;
      }
    }
  }

  // 味方の武将隊どうしの重なりだけを押し戻す。
  // 「離れすぎたら本隊へ戻す」ような、命じていない移動はさせない。
  for (const c of alive) {
    if (c.detach || c.routed || c.withdraw || (c.ambush && !c.revealed)) continue;
    const mates = alive.filter((o) => o !== c && o.side === c.side && !o.detach && !o.routed && !o.withdraw);
    if (!mates.length) continue;
    let sx = 0, sy = 0;
    for (const o of mates) {
      const d = Math.hypot(o.x - c.x, o.y - c.y);
      if (d > 0.1 && d < 150) { sx += ((c.x - o.x) / d) * (150 - d); sy += ((c.y - o.y) / d) * (150 - d); }
    }
    // 隊どうしが押し合う力。これも城壁を越えてはならない。
    if (c.pinned) continue;              // 門に取り付いた隊は動かない
    // 押し合いの力が行軍の足より強いと、隣の隊に阻まれて一歩も進めなくなる。
    const cap = MAP ? 12 : 40;
    const px = clamp(sx * (MAP ? 0.3 : 0.55), -cap, cap) * dt;
    const py = clamp(sy * (MAP ? 0.3 : 0.55), -cap, cap) * dt;
    if (passable(c.x + px, c.y + py)) { c.x += px; c.y += py; }
    else if (passable(c.x + px, c.y)) c.x += px;
    else if (passable(c.x, c.y + py)) c.y += py;
  }

  // 隊の来た道を覚える。はぐれた組は武将と同じ道筋を辿って戻る。
  for (const c of alive) {
    c.trailT = (c.trailT || 0) - dt;
    if (c.trailT <= 0) {
      c.trailT = 0.6;
      c.trail = c.trail || [];
      const last = c.trail[c.trail.length - 1];
      if (!last || Math.hypot(last.x - c.x, last.y - c.y) > 18) c.trail.push({ x: c.x, y: c.y });
      if (c.trail.length > 26) c.trail.shift();
    }
  }

  for (const c of alive) {
    // 壁の帯に入り込んだ隊は身動きが取れない。城の中心から遠ざかる向きへ押し出す。
    if (MAP && !passable(c.x, c.y)) {
      const ox = c.x - MAP.cx, oy = c.y - MAP.cy, od = Math.hypot(ox, oy) || 1;
      for (let k = 1; k <= 12; k++) {
        const nx = c.x + (ox / od) * k * 14, ny = c.y + (oy / od) * k * 14;
        if (passable(nx, ny)) { c.x = nx; c.y = ny; break; }
      }
    }
    const HOLD = c.order === "待機" || c.order === "守備" || c.order === "転回";
    // 城内では道順を順に辿る。行き詰まったら次の地点へ進む。
    if (c.wp && c.wp.length && !HOLD) {
      const w0 = c.wp[0];
      const d0 = Math.hypot(w0.x - c.x, w0.y - c.y);
      if (d0 < (w0.r || 40)) { c.wp.shift(); c.stuck = 0; c.lastD = null; }
      else {
        // まったく進めていないときだけ「詰まった」とみなす。
        // 他の隊に阻まれて遅いだけの場合に地点を捨てると、城壁へ突っ込んで動けなくなる。
        if (c.lastD != null && d0 > c.lastD - 0.04) c.stuck = (c.stuck || 0) + dt;
        else c.stuck = 0;
        c.lastD = d0;
        if (c.stuck > 8) {
          c.stuck = 0; c.lastD = null;
          // 地点を捨てるのではなく、いまの場所から道順を引き直す
          const gt2 = c.gate;
          const re = (MAP && gt2 && !gt2.broken && gateReachable(MAP, gt2))
            ? routeToCastleGate(MAP, gt2, c.x, c.y) : null;
          if (re && re.length) c.wp = re; else c.wp.shift();
        }
      }
      if (c.wp.length) { c.tx = c.wp[0].x; c.ty = c.wp[0].y; }
    }
    const dx = c.tx - c.x, dy = c.ty - c.y, dist = Math.hypot(dx, dy);
    if (dist > 6 && !HOLD && !(c.ambush && !c.revealed)) {
      const terr = TERRAIN[terrainAt(c.x, c.y)];
      const avgSpeed = c.squads.length ? c.squads.reduce((s, q) => s + ARM_STATS[q.type].speed * q.men, 0) / Math.max(1, corpsMen(c)) : 30;
      const engaged = c.squads.some((q) => q.engaged);
      const W = WEATHER[b.weather];
      const chg = (c.chargeT > 0 ? 1.35 : 1) * (c.reformT > 0 ? 0.55 : 1);   // 突撃中は速く、陣形替え中は鈍い
      // 隊が伸びきっていたら足を緩めて組の追いつきを待つ。
      // これをしないと、遅れた組を置き去りにして武将だけが先へ出てしまう。
      let far = 0, nq = 0;
      for (const q of c.squads) {
        if (q.men <= 0) continue;
        nq++;
        const dq = Math.hypot(q.x - c.x, q.y - c.y);
        if (dq > far) far = dq;
      }
      const room = 60 + Math.sqrt(Math.max(1, nq)) * SP * 0.7;
      // 交戦中は隊が広がるのが当たり前なので、伸びを理由に足を止めない
      const lag = engaged ? 1 : far <= room ? 1 : far > room * 1.8 ? 0.12 : 0.55;
      const v = avgSpeed * fieldScale() * terr.speed * W.speed * chg * (engaged ? 0.35 : 1)
        * (0.6 + c.morale / 250) * (1 - c.fatigue / 240) * lag;
      const mvx = (dx / dist) * v * dt, mvy = (dy / dist) * v * dt;
      // 城壁と閉じた門は通れない。ぶつかったら壁沿いに滑る。
      if (passableFor(c, b, c.x + mvx, c.y + mvy)) { c.x += mvx; c.y += mvy; }
      else if (passableFor(c, b, c.x + mvx, c.y)) c.x += mvx;
      else if (passableFor(c, b, c.x, c.y + mvy)) c.y += mvy;
      // 遠くへ向かう途中は壁際に貼りつかない。押し合いで壁へ押し付けられるのを防ぐ。
      if (MAP && dist > 200) {
        // 塀は薄いので、点ではなく線で調べないと見落とす
        const R = 30;
        const blocked = (ux, uy) => {
          for (let k = 1; k <= 4; k++) if (!passable(c.x + ux * k / 4, c.y + uy * k / 4)) return true;
          return false;
        };
        let rx = 0, ry = 0;
        if (blocked(R, 0)) rx -= 1;
        if (blocked(-R, 0)) rx += 1;
        if (blocked(0, R)) ry -= 1;
        if (blocked(0, -R)) ry += 1;
        if (rx || ry) {
          const rl = Math.hypot(rx, ry) || 1;
          const ax2 = (rx / rl) * 26 * dt, ay2 = (ry / rl) * 26 * dt;
          if (passable(c.x + ax2, c.y + ay2)) { c.x += ax2; c.y += ay2; }
        }
      }
      if (MAP && !passable(c.x + mvx, c.y + mvy) && !passable(c.x + mvx, c.y) && !passable(c.x, c.y + mvy)) {
        // 壁に貼りついて三方とも塞がったとき。少し壁から離れてから、壁沿いに進む。
        const ox = c.x - MAP.cx, oy = c.y - MAP.cy, od = Math.hypot(ox, oy) || 1;
        const px = c.x + (ox / od) * 12, py = c.y + (oy / od) * 12;
        if (passable(px + mvx, py + mvy)) { c.x = px + mvx; c.y = py + mvy; }
        else if (passable(px + mvx, py)) { c.x = px + mvx; c.y = py; }
        else if (passable(px, py + mvy)) { c.x = px; c.y = py + mvy; }
        else if (passable(px, py)) { c.x = px; c.y = py; }
      }
      if (c.chargeT > 0 && b.fx.length < 160 && Math.random() < dt * 6 && (c.side === "P" || c.seen)) {
        b.fx.push({ k: "dust", x: c.x - Math.cos(c.facing) * 14, y: c.y - Math.sin(c.facing) * 14, t: 0, life: 0.7 });
      }
      // 疲労：移動・登坂・渡渉・悪天候で増える（GDD 8.8）
      c.fatigue = Math.min(100, c.fatigue + (0.55 + (1 / Math.max(0.1, terr.speed) - 1) * 0.5) * W.fatigue * (c.chargeT > 0 ? 1.8 : 1) * dt);
      const want = Math.atan2(dy, dx);
      const diff = ((want - c.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      c.facing += clamp(diff, -1.4 * dt, 1.4 * dt);
      c.faceTo = null;
    } else if (c.faceTo != null) {
      // その場で向きだけ変える。統率が高いほど早く据わる。
      const diff = ((c.faceTo - c.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const rate = 0.45 + c.gen.lead / 130;
      if (Math.abs(diff) < 0.05) {
        c.facing = c.faceTo; c.faceTo = null;
        if (c.order === "転回") { c.order = "待機"; c.tx = c.x; c.ty = c.y; }
      } else {
        c.facing += clamp(diff, -rate * dt, rate * dt);
        for (const q of c.squads) q.cohesion = Math.max(0, q.cohesion - 1.3 * dt);
      }
    }
    placeSquads(c, false);
    // 「移動」は行き先へ進む命令。近くの敵に食いつくのは接戦・突撃・前進・射撃のとき。
    // 移動でも敵を追わせると、指示した場所へ着かずに流れていってしまう。
    // 「移動」は行き先へ進む命令。近くの敵に食いつくのは接戦・突撃・前進・射撃のとき。
    const aggressive = c.order === "接戦" || c.order === "突撃" || c.order === "前進" || c.order === "射撃";
    for (const q of c.squads) {
      let targetX = c.x + q.slotX, targetY = c.y + q.slotY;
      const st0 = ARM_STATS[q.type];
      if (aggressive && !c.routed && q.foe && !q.reserve) {
        const want = st0.range > 0 ? st0.range * 0.75 : 15;
        // 射撃優先では遠隔は射程を保ち、白兵は隊列を守って前へ出ない
        if (c.order === "射撃" && st0.range === 0) { /* 陣形位置を維持 */ }
        else if (q.foe.d > want) {
          const ux = (q.x - q.foe.x) / Math.max(1, q.foe.d), uy = (q.y - q.foe.y) / Math.max(1, q.foe.d);
          targetX = q.foe.x + ux * want; targetY = q.foe.y + uy * want;
        }
        // 隊列から離れられるのは持ち場の周りだけ。隊を飛び出して単独で敵へ向かわない。
        const homeX = c.x + q.slotX, homeY = c.y + q.slotY;
        const off = Math.hypot(targetX - homeX, targetY - homeY);
        // 組の第一の務めは陣形を保つこと。持ち場の周りをわずかに動くだけ。
        const leash = c.chargeT > 0 ? 24 : 14;
        if (off > leash) {
          targetX = homeX + ((targetX - homeX) / off) * leash;
          targetY = homeY + ((targetY - homeY) / off) * leash;
        }
      }
      // 隊からはぐれた組は、まず隊の来た道を辿って追いつく。追いついたら定位置へ戻る。
      const homeD = Math.hypot(q.x - targetX, q.y - targetY);
      if (homeD > 110) q.lost = true; else if (homeD < 40) q.lost = false;
      // それでも大きく離れたままなら、武将のそばへ引き戻す。
      // 壁や堀を挟んで取り残された一組が、隊全体の足を止めてしまうのを防ぐ。
      if (homeD > 190) {
        let put = null;
        for (let k = 0; k < 18 && !put; k++) {
          const ang = k * 2.399, rr = k === 0 ? 0 : 12 + k * 8;
          const nx2 = targetX + Math.cos(ang) * rr, ny2 = targetY + Math.sin(ang) * rr;
          if (passable(nx2, ny2)) put = { x: nx2, y: ny2 };
        }
        if (put) { q.x = put.x; q.y = put.y; q.lost = false; q.cohesion = Math.max(0, q.cohesion - 8); }
      }
      if (q.lost && c.trail && c.trail.length) {
        // 自分にいちばん近い道筋の点より、ひとつ隊寄りの点を目指す
        let bi = 0, bd = 1e9;
        for (let k = 0; k < c.trail.length; k++) {
          const d2 = Math.hypot(c.trail[k].x - q.x, c.trail[k].y - q.y);
          if (d2 < bd) { bd = d2; bi = k; }
        }
        const nx3 = c.trail[Math.min(c.trail.length - 1, bi + 1)];
        if (bd > 26) { targetX = c.trail[bi].x; targetY = c.trail[bi].y; }
        else { targetX = nx3.x; targetY = nx3.y; }
      }
      const qd = Math.hypot(targetX - q.x, targetY - q.y);
      const terr = TERRAIN[terrainAt(q.x, q.y)];
      if (qd > 2 && !q.engaged) {
        const v = st0.speed * fieldScale() * terr.speed * (q.type === "kiba" ? terr.horse : 1) * WEATHER[b.weather].speed * (0.7 + q.cohesion / 300);
        const sx = ((targetX - q.x) / qd) * Math.min(v * dt, qd);
        const sy = ((targetY - q.y) / qd) * Math.min(v * dt, qd);
        if (passableFor(c, b, q.x + sx, q.y + sy)) { q.x += sx; q.y += sy; }
        else if (passableFor(c, b, q.x + sx, q.y)) q.x += sx;
        else if (passableFor(c, b, q.x, q.y + sy)) q.y += sy;
        const base = q.foe && q.foe.d < 140 ? Math.atan2(q.foe.y - q.y, q.foe.x - q.x) : c.facing;
        q.facing = base + q.ja * Math.pow(q.dis || 0, 2.4) * 0.85;   // 乱れて初めて向きがずれる
        q.cohesion += (terr.cohesion * 0.6 - 0.5) * dt;
      } else {
        // 統率が陣形維持の回復に効く。疲労が回復を鈍らせる（GDD 6.1 / 8.8）
        const rec = (1.2 + c.gen.lead / 40) * (q.engaged ? 0.15 : 1) * (1 - c.fatigue / 200);
        q.cohesion += (rec + terr.cohesion * 0.25) * dt;
      }
      q.cohesion = clamp(q.cohesion, 0, 100);
      q.cool -= dt; q.engaged = false;
    }
  }

  // 城門を破る（GDD 9.3）。門の間口は狭く、取り付けるのは一隊だけ。
  // 残りは控えに回り、取り付いた隊が疲れれば入れ替わる。
  if (MAP) {
    // 隊の代表点は壁を越えて動くので、実際の兵の重心で判る
    for (const c of alive) {
      let sx = 0, sy = 0, n2 = 0;
      for (const q of c.squads) { if (q.men <= 0) continue; sx += q.x * q.men; sy += q.y * q.men; n2 += q.men; }
      c.mx = n2 ? sx / n2 : c.x; c.my = n2 ? sy / n2 : c.y;
    }
    const atkC = alive.filter((c) => c.side === b.attacker && !c.routed && !c.withdraw);
    const defC = alive.filter((c) => c.side !== b.attacker && !c.routed);
    const attached = new Set();
    for (const l of MAP.layers) for (const g of l.gates) {
      if (g.broken) { g.slot = null; g.hold = null; g.def = 0; continue; }
      const gp = gatePos(MAP, l, g);
      const R = 104 * (FIELD.w / BASE.w);
      const near = atkC.filter((c) => (c.gate === g || !c.gate)
        && Math.hypot((c.mx == null ? c.x : c.mx) - gp.x, (c.my == null ? c.y : c.my) - gp.y) < R);
      // 内側で門を支える城方の兵。多いほど門は破れない。
      const a2 = axisOf(l, g);
      const ins = fromUV(MAP, a2, g.off, a2.half - 52 * (FIELD.w / BASE.w));
      g.def = defC.filter((c) => Math.hypot((c.mx == null ? c.x : c.mx) - ins.x, (c.my == null ? c.y : c.my) - ins.y) < 120 * (FIELD.w / BASE.w))
        .reduce((t2, c) => t2 + corpsMen(c), 0);
      if (!near.length) { g.slot = null; g.hold = null; continue; }
      if (!g.slot || !near.some((c) => c.id === g.slot)) {
        // 破城槌を担ぐ隊が先手。次に疲れの少ない大きな隊。
        const pick = [...near].sort((x, y2) =>
          ((SIEGE_KIT[y2.kit] ? SIEGE_KIT[y2.kit].gate : 1) - (SIEGE_KIT[x.kit] ? SIEGE_KIT[x.kit].gate : 1))
          || ((x.gateFat || 0) - (y2.gateFat || 0)) || (corpsMen(y2) - corpsMen(x)))[0];
        if (g.slot) b.log.push({ t: b.t, text: `${pick.gen.name}隊が${g.key}に取り付いた。` });
        g.slot = pick.id;
      }
      const holder = near.find((c) => c.id === g.slot);
      if (!holder) continue;
      attached.add(holder.id); g.hold = holder.gen.name;
      // 取り付いた隊は門の前に据わる。押し合いで少しずつ流されて、
      // いつのまにか門から離れてしまわないようにする。
      const a3 = axisOf(l, g);
      const stand = fromUV(MAP, a3, g.off, a3.half + MAP.t + 22);
      // 別の命令を受けた隊は据え置かない（門の前で操作できなくなるのを防ぐ）
      if (holder.gate === g && !holder.wp) {
        holder.tx = stand.x; holder.ty = stand.y;
        holder.pinned = true;
      }
      holder.gateFat = Math.min(100, (holder.gateFat || 0) + 5.0 * dt);
      holder.morale = Math.min(100, holder.morale + 0.40 * dt);   // 破れる手応えが士気を支える
      const men = corpsMen(holder);
      const eff = 1 - (holder.gateFat / 100) * 0.66;
      // 内から支える兵が門を保たせる。ただし支える側も無傷では済まない。
      const push = men / (men + g.def * 1.1);
      const kit = SIEGE_KIT[holder.kit] || SIEGE_KIT["なし"];
      g.hp -= men * 0.016 * kit.gate * eff * push * (b.gateParty ? 1.25 : 1) * dt;
      // 門を隔てた押し合いは、支える城方にも損害を与える。
      // これがないと、城方は門に張りつくだけで日暮れまで凌げてしまう。
      if (g.def > 0) {
        const a4 = axisOf(l, g);
        const ins2 = fromUV(MAP, a4, g.off, a4.half - 52 * (FIELD.w / BASE.w));
        const guards = defC.filter((c2) => Math.hypot((c2.mx == null ? c2.x : c2.mx) - ins2.x,
          (c2.my == null ? c2.y : c2.my) - ins2.y) < 120 * (FIELD.w / BASE.w));
        let hurt = men * 0.0016 * eff * dt;
        for (const c2 of guards) {
          const share = hurt / guards.length;
          let left2 = share;
          for (const q2 of c2.squads) {
            if (left2 <= 0) break;
            if (q2.men <= 0) continue;
            const take = Math.min(q2.men, left2);
            q2.men -= take; left2 -= take;
          }
          c2.morale -= share / Math.max(1, corpsMax(c2)) * 90;
        }
      }
      if (b.fx.length < 160 && Math.random() < dt * 3) b.fx.push({ k: "clash", x: gp.x, y: gp.y, t: 0, life: 0.3, big: true });
      if (holder.gateFat > 70) {
        const next = near.filter((c) => c.id !== holder.id && (c.gateFat || 0) < 32)
          .sort((x, y2) => ((SIEGE_KIT[y2.kit] ? SIEGE_KIT[y2.kit].gate : 1) - (SIEGE_KIT[x.kit] ? SIEGE_KIT[x.kit].gate : 1))
            || ((x.gateFat || 0) - (y2.gateFat || 0)))[0];
        if (next) {
          g.slot = next.id;
          b.log.push({ t: b.t, text: `${holder.gen.name}隊が疲れ、${next.gen.name}隊と入れ替わった。` });
        }
      }
      if (g.hp <= 0) {
        g.hp = 0; g.broken = true; g.slot = null; g.hold = null;
        b.mapDirty = true; MAP.nav = null;        // 通れる場所が変わった
        notify(b, `${g.key}が破られた。`, b.attacker === "P" ? "good" : "bad");
        for (const o of alive) {
          if (o.side !== b.attacker) o.morale -= 8;
          else o.morale = Math.min(100, o.morale + 5);
        }
      }
    }
    for (const c of atkC) {
      if (!attached.has(c.id)) { c.gateFat = Math.max(0, (c.gateFat || 0) - 3.4 * dt); c.pinned = false; }
    }
    // 委任された隊は、門を破ったらより内側の近い門へ自ら向かう
    for (const c of atkC) {
      if (c.side === "P" && !c.auto) continue;
      const cur = c.gate;
      if (cur && !cur.broken && gateReachable(MAP, cur)) continue;
      const nx = nearestOpenGate(MAP, c.mx == null ? c.x : c.mx, c.my == null ? c.y : c.my);
      if (!nx || nx === cur) continue;
      c.gate = nx; c.pinned = false;
      const wp = routeToCastleGate(MAP, nx, c.x, c.y);
      if (wp.length) { c.wp = wp; c.tx = wp[0].x; c.ty = wp[0].y; c.order = "前進"; c.stuck = 0; c.lastD = null; }
      b.log.push({ t: b.t, text: `${c.gen.name}隊は${nx.key}へ向かう。` });
    }
    // 道順が尽きたのに門から遠いままの隊は、道順を組み直す
    for (const c of atkC) {
      if (c.wp && c.wp.length) continue;
      const gt = c.gate;
      if (!gt || gt.broken || !gateReachable(MAP, gt)) continue;
      const gp = gatePos(MAP, MAP.layers[gt.layer], gt);
      if (Math.hypot(c.x - gp.x, c.y - gp.y) < 130) continue;
      c.reroute = (c.reroute || 0) - dt;
      if (c.reroute > 0) continue;
      c.reroute = 5;
      const wp = routeToCastleGate(MAP, gt, c.x, c.y);
      if (wp.length) { c.wp = wp; c.tx = wp[0].x; c.ty = wp[0].y; c.stuck = 0; c.lastD = null; }
    }

    // ── 城内の施設 ──
    const fsN = FIELD.w / BASE.w;
    for (const f of MAP.fac) {
      if (f.hp <= 0) continue;
      if (f.kind === "矢倉") {
        // 近づいた寄せ手を射て兵を削る。竹束を担いだ隊は被害が軽い。
        f.cool -= dt;
        if (f.cool <= 0) {
          const tgt = atkC.filter((c) => Math.hypot(c.x - f.x, c.y - f.y) < 165 * fsN)
            .sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
          if (tgt) {
            f.cool = 3.4;
            const kit = SIEGE_KIT[tgt.kit] || SIEGE_KIT["なし"];
            let hit = 9 * kit.guard;
            const qs = tgt.squads.filter((q) => q.men > 0)
              .sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y));
            for (const q of qs) {
              if (hit <= 0) break;
              const take = Math.min(q.men, hit);
              q.men -= take; hit -= take;
              q.cohesion = Math.max(0, q.cohesion - 3);
            }
            tgt.morale -= 0.45;
            if (b.fx.length < 160) b.fx.push({ k: "shot", x: f.x, y: f.y, x2: qs[0] ? qs[0].x : tgt.x, y2: qs[0] ? qs[0].y : tgt.y, t: 0, life: 0.28 });
          }
        }
      } else if (!MAP.layers[f.layer].gates.some((g) => g.broken)) {
        // 陣鐘は城方を励まし、寄せ手をじわじわ削る。曲輪を抜かれれば鳴りやむ。
        for (const c of defC) c.morale = Math.min(100, c.morale + 0.22 * dt);
        for (const c of atkC) c.morale -= 0.045 * dt;
      }
      // 寄せ手は施設を崩せる。取り付けば早く、射かければ遅い。
      let dmg = 0;
      for (const c of atkC) {
        if (Math.hypot((c.mx == null ? c.x : c.mx) - f.x, (c.my == null ? c.y : c.my) - f.y) > 260 * fsN) continue;
        const kit = SIEGE_KIT[c.kit] || SIEGE_KIT["なし"];
        for (const q of c.squads) {
          if (q.men <= 0) continue;
          const dq = Math.hypot(q.x - f.x, q.y - f.y);
          const st = ARM_STATS[q.type];
          if (dq < f.r + 30 * fsN) dmg += q.men * 0.011 * dt;
          else if (st.range > 0 && dq < st.range * 1.05) dmg += q.men * 0.0042 * (kit.shoot || 1) * dt;
        }
      }
      if (dmg > 0) {
        f.hp -= dmg;
        if (f.hp <= 0) {
          f.hp = 0; b.mapDirty = true; MAP.nav = null;
          b.log.push({ t: b.t, text: `${f.name}を崩した。` });
          if (f.kind === "矢倉") { for (const c of atkC) c.morale = Math.min(100, c.morale + 3); }
          else { for (const c of defC) c.morale -= 8; for (const c of atkC) c.morale = Math.min(100, c.morale + 5); }
        }
      }
    }
    // 城の傾き。門と曲輪を失うほど城方は士気を保てない（GDD 9.3）
    // どの曲輪まで抜かれたかで測る。同じ曲輪の門をいくつ破っても、深さは変わらない。
    let deepest = -1;
    for (const l of MAP.layers) if (l.gates.some((g) => g.broken)) deepest = Math.max(deepest, l.i);
    const bw = deepest + 1, tw = MAP.layers.length;
    const hon = MAP.layers[MAP.layers.length - 1];
    const inL = (i) => atkC.some((c) => inRect((c.mx == null ? c.x : c.mx) - MAP.cx, (c.my == null ? c.y : c.my) - MAP.cy, MAP.layers[i].hw, MAP.layers[i].hh));
    const deep = inL(MAP.layers.length - 1) ? 0.44 : MAP.layers.length > 2 && inL(MAP.layers.length - 2) ? 0.22 : 0.06;
    const fLost = MAP.fac.length ? MAP.fac.filter((f) => f.hp <= 0).length / MAP.fac.length : 0;
    b.press = clamp((bw / tw) * 0.52 + fLost * 0.14 + deep, 0, 1);
    const cap = 100 - 82 * b.press;
    for (const c of defC) {
      c.morale = Math.min(c.morale, cap);
      if (inL(MAP.layers.length - 1)) c.morale = Math.max(0, c.morale - 2.6 * dt);
    }
  }

  // side ごとに格子へ振り分け、近傍だけを調べる
  const CS = 90;
  const grids = { P: new Map(), E: new Map() };
  for (const c of alive) {
    if (c.ambush && !c.revealed) continue;
    const gmap = grids[c.side];
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const k = ((q.x / CS) | 0) + "," + ((q.y / CS) | 0);
      let arr = gmap.get(k);
      if (!arr) { arr = []; gmap.set(k, arr); }
      arr.push([c, q]);
    }
  }
  // 城攻めでは、壁や閉じた門を隔てた相手とは戦えない
  const wallBetween = (x1, y1, x2, y2) => {
    if (!MAP) return false;
    if (Math.abs(x2 - x1) + Math.abs(y2 - y1) < 22) return false;   // 目と鼻の先は調べるまでもない
    for (let k = 1; k <= 2; k++) {
      const t2 = k / 3;
      const tt = terrainAt(x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2);
      if (tt === "wall" || tt === "gate" || tt === "tower") return true;
    }
    return false;
  };
  const nearestFoeSquad = (c, q) => {
    const gmap = grids[c.side === "P" ? "E" : "P"];
    const cx = (q.x / CS) | 0, cy = (q.y / CS) | 0;
    let best = null, bd = 1e9;
    for (let ring = 0; ring <= 3; ring++) {
      for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const arr = gmap.get((cx + dx) + "," + (cy + dy));
        if (!arr) continue;
        for (const [f, e] of arr) {
          const d = Math.hypot(e.x - q.x, e.y - q.y);
          if (d < bd) { bd = d; best = { f, e, d }; }
        }
      }
      if (best && bd <= ring * CS) break;      // この輪より外に、より近い敵はいない
    }
    // 壁や閉じた門を隔てていれば、その相手とは戦えない
    if (best && MAP && wallBetween(q.x, q.y, best.e.x, best.e.y)) return [null, 1e9];
    return best ? [best, bd] : [null, 1e9];
  };
  for (const c of alive) {
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const st = ARM_STATS[q.type];
      const [melee, mdist] = nearestFoeSquad(c, q);
      q.foe = melee ? { x: melee.e.x, y: melee.e.y, d: mdist } : null;
      q.link = null;
      if (!melee) continue;
      const terr = TERRAIN[terrainAt(q.x, q.y)];
      if (mdist < 22) {
        q.engaged = true; melee.e.engaged = true;
        q.link = { x: melee.e.x, y: melee.e.y };        // 組み合っている相手
        // 接戦中の組は互いへ少し詰め寄る。隊列は保ったまま噛み合いが見えるようにする。
        const pull = 2.2 * dt;
        const ax = ((melee.e.x - q.x) / Math.max(1, mdist)) * pull;
        const ay = ((melee.e.y - q.y) / Math.max(1, mdist)) * pull;
        if (passable(q.x + ax, q.y + ay)) { q.x += ax; q.y += ay; }
        else if (passable(q.x + ax, q.y)) q.x += ax;
        else if (passable(q.x, q.y + ay)) q.y += ay;
        // 接戦の火花。見づらくならないよう間引いて出す。
        if (b.fx.length < 160 && Math.random() < dt * 2.4 && (c.side === "P" || c.seen)) {
          b.fx.push({ k: "clash", x: (q.x + melee.e.x) / 2, y: (q.y + melee.e.y) / 2, t: 0,
            life: 0.34, big: c.chargeT > 0 });
        }
        const ang = Math.atan2(q.y - melee.e.y, q.x - melee.e.x);
        const rel = Math.abs(((ang - melee.e.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const flank = rel > 2.2 ? 2.0 : rel > 1.1 ? 1.45 : 1.0;
        const charge = q.type === "kiba" && terr.charge ? 1 + c.gen.valor / 260 : 1;
        const push = c.chargeT > 0 && terr.charge ? 1.3 : 1;              // 突撃中の圧力
        const guard = melee.f.order === "守備" ? 0.85 : 1;                 // 密集して守る側は硬い
        applyDamage(b, melee.f, melee.e,
          st.melee * (q.men / 50) * (0.45 + q.cohesion / 160) * (0.6 + c.morale / 200)
          * terr.fight * flank * charge * push * guard * (1 - c.fatigue / 260) * dt,
          flank, c.gen.valor * (c.chargeT > 0 ? 1.2 : 1));
      } else if (st.range > 0 && mdist < st.range && q.cool <= 0) {
        if (melee.f.seen || mdist < TERRAIN[terrainAt(melee.e.x, melee.e.y)].sight * fieldScale()) {
          q.cool = st.rof;
          q.aim = { x: melee.e.x, y: melee.e.y, t: b.t };   // 狙っている相手
          if (b.fx.length < 160 && (c.side === "P" || c.seen)) {
            b.fx.push({ k: q.type === "teppo" ? "shot" : "arrow", x: q.x, y: q.y,
              x2: melee.e.x, y2: melee.e.y, t: 0, life: q.type === "teppo" ? 0.3 : 0.45 });
          }
          const wet = q.type === "teppo" ? WEATHER[b.weather].teppo : 1;
          applyDamage(b, melee.f, melee.e, st.vol * wet * (q.men / 50) * (0.5 + q.cohesion / 150) * terr.fight, 1, c.gen.valor);
        }
      }
    }
  }

  for (const c of alive) {
    const ratio = corpsMen(c) / Math.max(1, corpsMax(c));
    const fighting = c.squads.some((q) => q.engaged);
    // 陣形を変えている間は隊列が乱れ、動きも鈍る
    if (c.reformT > 0) {
      c.reformT -= dt;
      for (const q of c.squads) q.cohesion = Math.max(0, q.cohesion - 1.6 * dt);
    }
    // 突撃は長く続かない。時間が切れれば通常の接戦へ戻る。
    if (c.chargeT > 0) {
      c.chargeT -= dt;
      const wear = c.formation === "鋒矢" ? 1.0 : 2.2;
      for (const q of c.squads) q.cohesion = Math.max(0, q.cohesion - wear * dt);
      if (c.chargeT <= 0) { c.chargeT = 0; if (c.order === "突撃") c.order = "接戦"; }
    }
    if (c.order === "守備") for (const q of c.squads) q.cohesion = Math.min(100, q.cohesion + 1.1 * dt);
    // 前線が薄くなれば予備隊を繰り上げる
    const front = c.squads.filter((q) => !q.reserve && q.men > 0).length;
    const res = c.squads.filter((q) => q.reserve && q.men > 0);
    if (res.length && front < c.squads.filter((q) => !q.reserve).length * 0.55) {
      res[0].reserve = false;
      if (!c.feats.includes("予備投入")) c.feats.push("予備投入");
    }
    // 総大将が前線に出ているか（敵との距離・接戦・射撃圏内）
    if (c.gen.lord && !c.detach) {
      const near = alive.some((o) => o.side !== c.side && Math.hypot(o.x - c.x, o.y - c.y) < 190);
      if (near || fighting) c.frontTime = (c.frontTime || 0) + dt;
    }
    c.fatigue = clamp(c.fatigue + (fighting ? 1.1 : c.order === "待機" ? -1.4 : 0) * dt, 0, 100);
    if (c.pinch >= 2) c.morale -= (c.pinch - 1) * 0.22 * dt;   // 挟まれると士気がじわりと落ちる
    // 総大将が前線に出れば全軍の士気が上がる（GDD 8.7）
    const near = alive.some((o) => o.side === c.side && o.gen.lord && Math.hypot(o.x - c.x, o.y - c.y) < 260);
    c.morale = clamp(c.morale + ((ratio - 0.6) * 1.2 + (near ? 0.35 : 0) + c.gen.lead / 300 - 0.25) * dt, 0, 100);
    if (!c.routed && !c.boxed && fighting) {
      if ((c.pinch || 0) >= 3) {
        c.boxed = true; c.formation = "方陣"; placeSquads(c, false);
        b.log.push({ t: b.t, text: `${c.name}隊が包囲されかけ、方陣で密集防御に移った。` });
        c.feats.push("密集防御");
      }
    }
    if (!c.routed && (c.morale < 15 || ratio < 0.25)) {
      c.routed = true; c.order = "敗走";
      notify(b, `${c.gen.name}隊が崩れ、敗走した。`, c.side === "P" ? "bad" : "good"); c.tx = c.x; c.ty = c.side === "P" ? FIELD.h + 120 : -120;
      b.log.push({ t: b.t, text: `${c.name}隊が崩れ、敗走に移った。` });
      for (const o of alive) if (o.side === c.side && Math.hypot(o.x - c.x, o.y - c.y) < 200) o.morale -= 9;
    }
    if (c.routed || c.withdraw) {
      c.ty = c.side === "P" ? FIELD.h + 120 : -120;
      // 戦場の外へ落ち延びた隊は退場させる。横に抜けた場合も見落とさない。
      if (c.y > FIELD.h + 60 || c.y < -60 || c.x > FIELD.w + 60 || c.x < -60) c.dead = true;
    }
    if (corpsMen(c) <= 0 && !c.destroyed) {
      c.destroyed = true; c.order = "待機";
      notify(b, `${c.gen.name}隊は壊滅した。`, c.side === "P" ? "bad" : "good");
      b.log.push({ t: b.t, text: `${c.name}隊は壊滅した。` });
    }
  }

  const pm = b.corps.filter((c) => c.side === "P" && !c.dead && !c.routed && !c.withdraw).reduce((s, c) => s + corpsMen(c), 0);
  const em = b.corps.filter((c) => c.side === "E" && !c.dead && !c.routed && !c.withdraw).reduce((s, c) => s + corpsMen(c), 0);
  // 本丸を押さえれば城は落ちる（GDD 9.3）
  if (MAP) {
    const h = MAP.layers[MAP.layers.length - 1];
    // 本丸に「兵が」入っているかで見る。隊の代表点だけでは壁の内と外を取り違える。
    const inHon = (c) => c.squads.some((q) => q.men > 0 && inRect(q.x - MAP.cx, q.y - MAP.cy, h.hw, h.hh));
    const atk = b.corps.some((c) => !c.dead && !c.destroyed && !c.routed && c.side === b.attacker && inHon(c));
    const def = b.corps.some((c) => !c.dead && !c.destroyed && !c.routed && c.side !== b.attacker && inHon(c));
    if (atk && !def) {
      b.hold = (b.hold || 0) + dt;
      if (b.hold > 12) {
        b.phase = "over"; b.result = b.attacker; b.captured = true;
        notify(b, "本丸を押さえた。城は落ちた。", b.attacker === "P" ? "good" : "bad");
        b.log.push({ t: b.t, text: "本丸を押さえた。城は落ちた。" });
        return;
      }
    } else b.hold = 0;
  }
  // 日没。攻撃側だけを一律敗北にはせず、両軍が兵を退く（GDD 8.8）
  if (b.t >= b.dusk) {
    b.phase = "over"; b.orderly = true;
    if (MAP) {
      // 城攻めは日暮れで打ち切り。城は落ちず、寄せ手は囲みへ戻る。
      b.result = b.attacker === "P" ? "E" : "P";
      b.log.push({ t: b.t, text: "日が暮れた。城は落ちず、寄せ手は囲みへ戻った。" });
    } else {
      b.result = "日没";
      b.log.push({ t: b.t, text: "日が落ちた。両軍とも兵を退いた。" });
    }
    return;
  }
  if (b.retreat === "P" && pm === 0) { b.phase = "over"; b.result = "E"; b.orderly = true; return; }
  // 城攻めの決着は野戦とは違う。城が落ちるか、寄せ手が攻めきれずに退くか。
  if (MAP) {
    const atkSide = b.attacker, defSide = atkSide === "P" ? "E" : "P";
    const atkEff = atkSide === "P" ? pm : em, defEff = atkSide === "P" ? em : pm;
    const atk0 = atkSide === "P" ? b.initial.P : b.initial.E;
    const def0 = atkSide === "P" ? b.initial.E : b.initial.P;
    if (atkEff <= atk0 * 0.3 || atkEff === 0) {
      b.phase = "over"; b.result = defSide; b.orderly = true;
      notify(b, "寄せ手は攻めきれず、囲みへ退いた。", defSide === "P" ? "good" : "bad");
      return;
    }
    if (defEff <= def0 * 0.22 || defEff === 0) {
      b.phase = "over"; b.result = atkSide; b.opened = true;
      notify(b, "城方は支えきれず、城を開いた。", atkSide === "P" ? "good" : "bad");
      return;
    }
    return;
  }
  if (pm <= b.initial.P * 0.3 || em <= b.initial.E * 0.3 || pm === 0 || em === 0) {
    b.phase = "over"; b.result = pm > em ? "P" : "E";
  }
}
let AI_ISSUING = false;                 // AIが出している命令か（委任を解かないため）
// 委任された隊はAIが差配する。委任は隊ごとに入り切りでき、
// プレイヤーが命令を出した瞬間に解ける。
const delegated = (b, c) => c.side !== "P" || c.auto;
function battleAI(b) {
  AI_ISSUING = true;
  const alive = b.corps.filter((c) => !c.dead && !c.destroyed);
  // 分遣隊は所属を問わず割り当てられた任務を自律遂行する（GDD 8.5）
  for (const c of alive) if (c.detach && !c.routed) detachAI(b, c, alive);
  // 敵側の分遣は接敵前に一度だけ決める。乱戦の最中に隊を割いて自壊しないようにする。
  for (const c of alive) {
    if (!delegated(b, c) || c.detach || c.routed || c.detachTried) continue;
    if (b.t > 25 || c.squads.some((q) => q.engaged) || c.morale < 60) { c.detachTried = true; continue; }
    if (b.t < 3) continue;                       // 布陣直後は様子を見る
    c.detachTried = true;
    if (Math.random() > 0.5) continue;
    const opt = detachOptions(b, c).filter((o) => o.ok);
    if (opt.length) makeDetachment(b, c, opt[Math.floor(Math.random() * opt.length)].key);
  }
  for (const c of alive) {
    if (!delegated(b, c) || c.routed || c.detach) continue;
    const mySide = c.side, foeSide = mySide === "P" ? "E" : "P";
    const foes = alive.filter((o) => o.side === foeSide && !o.routed && (o.seen || !o.ambush));
    if (!foes.length) continue;
    // 崩壊寸前で支えもないときだけ退く。プレイヤー側の崩壊点（士気15）に近い基準にする。
    if (c.morale < 18 && corpsMen(c) < corpsMax(c) * 0.55) {
      const help = alive.some((o) => o.side === mySide && o !== c && !o.routed && Math.hypot(o.x - c.x, o.y - c.y) < 220);
      if (!help) { c.order = "撤退"; c.withdraw = true; c.tx = c.x; c.ty = -80; continue; }
    }
    // 兵力差と地形から陣形を選び直す。プレイヤーと同じ陣形・同じ手間で行う。
    if (!c.formPicked) {
      c.formPicked = true;
      const mine = alive.filter((o) => o.side === mySide).reduce((a, o) => a + corpsMen(o), 0);
      const foeMen = alive.filter((o) => o.side === foeSide).reduce((a, o) => a + corpsMen(o), 0);
      const want = terrainAt(c.x, c.y) === "bridge" || terrainAt(c.x, c.y) === "ford" ? "長蛇"
        : mine > foeMen * 1.25 ? "鶴翼" : mine < foeMen * 0.8 ? "魚鱗" : "横陣";
      if (c.formation !== want) {
        c.formation = want;
        // 開戦直後の選択は布陣の一部。プレイヤーの布陣と同じく組み直しの損は生じない。
        if (b.t > 2) c.reformT = reformTime(c.gen);
        placeSquads(c, b.t <= 2);
      }
    }
    const coh = c.squads.length ? c.squads.reduce((a, q) => a + q.cohesion, 0) / c.squads.length : 100;
    if (c.reforming) {
      if (coh > 72) c.reforming = false;
      else { c.order = "待機"; c.tx = c.x; c.ty = c.y; continue; }
    }
    // 実際に川を渡った隊だけが渡河後の再編を行う（南から始まった隊は対象外）
    // 川を渡り終えたら隊列を整え直す。どちらの岸から出た隊にも等しく及ぼす
    // （北から出た隊にだけ効かせていたため、北に布陣した側が一方的に有利だった）。
    if (hasRiver() && c.bank0 && !c.crossed) {
      const mid = (RIVER.top + RIVER.bot) / 2 + riverShift(c.x);
      const nowBank = c.y < mid ? -1 : 1;
      if (nowBank !== c.bank0 && Math.abs(c.y - mid) > (RIVER.bot - RIVER.top) / 2 + 30) {
        c.crossed = true;
        if (coh < 62) { c.reforming = true; c.order = "待機"; c.tx = c.x; c.ty = c.y; continue; }
      }
    }
    const tgt = foes.reduce((a, o) => (Math.hypot(o.x - c.x, o.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? o : a), foes[0]);
    // 槍を合わせている隊は目標を変えない。向き直って側面を晒すのを避ける。
    if (c.order === "接戦" && c.squads.some((q) => q.engaged)) continue;
    if (MAP) {
      const near = Math.hypot(tgt.x - c.x, tgt.y - c.y);
      if (c.side !== b.attacker) {
        /* 寄せ手が崩れたら追い討ちをかける（GDD 9.4）
           六割が敗走すれば大将を除く諸隊が、八割で大将も出る。
           いずれも一分を経るか士気が五十を切れば城へ戻る。 */
        const atkAll = b.corps.filter((x) => x.side === b.attacker && !x.dead && !x.destroyed);
        const broken = atkAll.filter((x) => x.routed || x.withdraw).length;
        const rate = atkAll.length ? broken / atkAll.length : 0;
        const isLord = !!(c.gen && c.gen.lord);
        const chaseNow = rate >= (isLord ? 0.8 : 0.6);
        if (c.chasing) {
          if (b.t - (c.chaseAt || 0) > 60 || c.morale < 50 || rate < 0.4) {
            c.chasing = false;
            b.log.push({ t: b.t, text: `${c.gen.name}隊は追い討ちをやめ、城へ引いた。` });
          } else {
            const prey = atkAll.filter((x) => !x.routed)
              .sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0]
              || atkAll.sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0];
            if (prey) { issueOrder(b, c, { order: "接戦", tx: prey.x, ty: prey.y, target: prey.id }); continue; }
          }
        } else if (chaseNow && c.morale > 55) {
          c.chasing = true; c.chaseAt = b.t;
          b.log.push({ t: b.t,
            text: `${c.gen.name}隊が城を出て追い討ちをかけた（寄せ手の${Math.round(rate * 100)}分が崩れた）。` });
          continue;
        }
        // 城方は門を守る。持ち場の門が保たなくなったら、内側の門へ下がる。
        let g2 = c.holdGate;
        const need = !g2 || g2.broken || g2.hp / g2.max < 0.10;
        if (need) {
          const inner = MAP.gates.filter((x) => !x.broken && (!g2 || x.layer > g2.layer || (x.layer === g2.layer && x !== g2)))
            .sort((x, y2) => (y2.layer - x.layer)
              || (Math.hypot(gatePos(MAP, MAP.layers[x.layer], x).x - c.x, gatePos(MAP, MAP.layers[x.layer], x).y - c.y)
                - Math.hypot(gatePos(MAP, MAP.layers[y2.layer], y2).x - c.x, gatePos(MAP, MAP.layers[y2.layer], y2).y - c.y)))[0];
          if (inner && inner !== g2) {
            c.holdGate = inner; g2 = inner;
            b.log.push({ t: b.t, text: `${c.gen.name}隊は${inner.key}の内へ下がった。` });
          }
        }
        /* 城方の戦い方（GDD 9.3）
           門のすぐ内に張り付いて門を支え、外の寄せ手へ射かける。
           寄せ手が弱れば門を開いて打って出る。
           持ち場の門が保たなくなれば内側の門へ、最後は本丸へ籠る。 */
        if (g2 && !g2.broken) {
          const l2 = MAP.layers[g2.layer], a2 = axisOf(l2, g2);
          // 門のすぐ内側に立つ。奥へ引っ込んでは門を支えられない。
          const p2 = fromUV(MAP, a2, g2.off, a2.half - 14);
          const d2 = Math.hypot(c.x - p2.x, c.y - p2.y);
          if (d2 > 34) { issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y }); continue; }
          // 門の外に取り付いている寄せ手を見る
          const gp = gatePos(MAP, l2, g2);
          const foes = b.corps.filter((x) => x.side === b.attacker && !x.dead && !x.destroyed
            && !x.routed && Math.hypot(x.x - gp.x, x.y - gp.y) < 170);
          const foeMen = foes.reduce((t, x) => t + corpsMen(x), 0);
          const myMen = corpsMen(c);
          const foeMor = foes.length
            ? foes.reduce((t, x) => t + x.morale, 0) / foes.length : 100;
          /* 打って出る頃合い（GDD 9.4）
             一、寄せ手の士気が四割を切ったとき
             二、寄せ手の兵が自隊の三分の一を割ったとき
             三、将の器量で相手を一割四分上回るとき
             いずれも自隊が弱っていては出ない。出れば四十秒で戻る。 */
            const myWorth = (c.gen.valor || 60) + (c.gen.lead || 60);
            const foeWorth = foes.length
              ? Math.max(...foes.map((x) => (x.gen.valor || 60) + (x.gen.lead || 60))) : 999;
            const fit = c.morale > 58 && myMen > corpsMax(c) * 0.45;   // 自隊が保っている
            const chance = foes.length && fit && (
              foeMor < 40                        // 寄せ手の士気が尽きかけている
              || foeMen < myMen / 3              // 寄せ手が三分の一を割った
              || myWorth > foeWorth * 1.4        // 将の器量で大きく上回る
            );
            if (c.sallied) {
              // 打って出た後は四十秒で城へ戻る
              if (b.t - (c.sallyAt || 0) > 40 || c.morale < 46) {
                c.sallied = false; c.sallyLogged = false;
                b.log.push({ t: b.t, text: `${c.gen.name}隊が${g2.key}の内へ戻った。` });
                issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
                continue;
              }
              const t2 = [...foes].sort((x, y2) => corpsMen(x) - corpsMen(y2))[0];
              if (t2) { issueOrder(b, c, { order: "接戦", tx: t2.x, ty: t2.y, target: t2.id }); continue; }
              c.sallied = false;
            } else if (chance) {
              const t2 = [...foes].sort((x, y2) => corpsMen(x) - corpsMen(y2))[0];
              if (t2) {
                c.sallied = true; c.sallyAt = b.t;
                issueOrder(b, c, { order: "接戦", tx: t2.x, ty: t2.y, target: t2.id });
                if (!c.sallyLogged) {
                  c.sallyLogged = true;
                  b.log.push({ t: b.t, text: `${c.gen.name}隊が${g2.key}を開いて討って出た。` });
                }
                continue;
              }
            }
          // 射手は門ごしに射かける。槍組は門を支えて守る。
          const shooter = c.squads.some((q) => (q.men > 0)
            && (q.type === "yumi" || q.type === "teppo"));
          if (shooter && foes.length) {
            const t3 = [...foes].sort((x, y2) =>
              Math.hypot(x.x - gp.x, x.y - gp.y) - Math.hypot(y2.x - gp.x, y2.y - gp.y))[0];
            issueOrder(b, c, { order: "射撃", tx: t3.x, ty: t3.y, target: t3.id });
            continue;
          }
          issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
          continue;
        }
        // 守るべき門がすべて破れたなら、本丸へ籠る
        if (!g2 || g2.broken) {
          const keep = MAP.layers[MAP.layers.length - 1];
          if (keep) {
            const kx = MAP.cx, ky = MAP.cy;      // 本丸の中心
            if (Math.hypot(c.x - kx, c.y - ky) > 60) {
              issueOrder(b, c, { order: "移動", tx: kx, ty: ky });
            } else {
              issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
            }
            continue;
          }
        }
      }
      if (c.side === b.attacker) {
        // 寄せ手：抜けられる門のうち、いちばん外の近い門へ取り付く
        const g = nearestOpenGate(MAP, c.x, c.y);
        if (g && near > 130) {
          if (!c.wp || !c.wp.length) {
            const wp = routeToCastleGate(MAP, g, c.x, c.y);
            if (wp.length) { issueOrder(b, c, { order: "移動", tx: wp[0].x, ty: wp[0].y, keepPath: true }); c.wp = wp; }
            else {
              const a2 = axisOf(MAP.layers[g.layer], g);
              const app = fromUV(MAP, a2, g.off, a2.half + MAP.t + 26);
              issueOrder(b, c, { order: "移動", tx: app.x, ty: app.y });
            }
          }
          continue;
        }
        if (!g) {
          const h = MAP.layers[MAP.layers.length - 1];
          if (!inRect(c.x - MAP.cx, c.y - MAP.cy, h.hw, h.hh) && near > 130) {
            issueOrder(b, c, { order: "移動", tx: MAP.cx, ty: MAP.cy });
            continue;
          }
        }
      }
    }
    const ranged = c.squads.filter((q) => ARM_STATS[q.type].range > 0).reduce((s, q) => s + q.men, 0);
    if (ranged / Math.max(1, corpsMen(c)) > 0.55) {
      const hill = nearestOf(HILLS, c.x, c.y);
      if (!hill) { /* 高地のない野では丘取りをしない */ } else
      if (Math.hypot(hill.x - c.x, hill.y - c.y) > 90 && terrainAt(c.x, c.y) !== "hill") { issueOrder(b, c, { order: "移動", tx: hill.x, ty: hill.y }); continue; }
    }
    if (hasRiver() && (c.y < RIVER.top) !== (tgt.y < RIVER.top) && Math.abs(c.y - RIVER.top) < 260) {
      const gates = [
        { x: (RIVER.bridge[0] + RIVER.bridge[1]) / 2, y: (RIVER.top + RIVER.bot) / 2 },
        { x: (RIVER.ford[0] + RIVER.ford[1]) / 2, y: (RIVER.top + RIVER.bot) / 2 },
      ];
      const gt = gates.reduce((a, p) => (Math.hypot(p.x - c.x, p.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? p : a), gates[0]);
      if (Math.abs(c.y - gt.y) > 40) { issueOrder(b, c, { order: "移動", tx: gt.x, ty: gt.y }); continue; }
    }
    // 接敵はプレイヤーと同じ間合いで止まり、命令伝達も同じ遅延を受ける（GDD 13.2）。
    // すでに間合いに入っていれば、狙いを直しても後ろへは下がらない。
    const dd = Math.hypot(c.x - tgt.x, c.y - tgt.y) || 1;
    if (dd <= 42) issueOrder(b, c, { order: "接戦", tx: c.x, ty: c.y });
    else issueOrder(b, c, { order: "接戦", tx: tgt.x + ((c.x - tgt.x) / dd) * 38, ty: tgt.y + ((c.y - tgt.y) / dd) * 38 });
  }
  AI_ISSUING = false;
}

// 地形の輪郭を少しだけ崩す。判定の円より内側にしか出ないので、見た目と当たりはずれない。
function blobPath(ctx, o, tight) {
  const n = 14;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 0.86 + 0.14 * Math.sin(a * 3 + o.x * 0.03) * Math.cos(a * 2 + o.y * 0.02);
    const r = o.r * (tight ? w * 0.97 : w);
    const x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
function drawFieldTerrain(ctx) {
  ctx.fillStyle = "#CBD8AC"; ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  ctx.strokeStyle = "rgba(120,130,90,0.09)"; ctx.lineWidth = 1;
  for (let x = 0; x < FIELD.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.h); ctx.stroke(); }
  for (let y = 0; y < FIELD.h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.w, y); ctx.stroke(); }

  for (const h of HILLS) {
    ctx.fillStyle = "#BCCB93"; blobPath(ctx, h); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.2;
    for (const k of [0.68, 0.36]) { blobPath(ctx, { x: h.x, y: h.y, r: h.r * k }); ctx.stroke(); }
    ctx.fillStyle = "rgba(85,105,65,0.8)"; ctx.font = "15px 'Hiragino Mincho ProN',serif";
    ctx.fillText("丘", h.x - 7, h.y + 5);
  }
  for (const m of MARSH) {
    ctx.fillStyle = "#A8C0A4"; blobPath(ctx, m); ctx.fill();
    ctx.strokeStyle = "rgba(90,130,140,0.55)"; ctx.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399, r = m.r * Math.sqrt((i + 0.5) / 26) * 0.9;
      const tx = m.x + Math.cos(a) * r, ty = m.y + Math.sin(a) * r;
      ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx, ty - 5); ctx.stroke();
    }
    ctx.fillStyle = "rgba(60,90,90,0.85)"; ctx.font = "14px 'Hiragino Mincho ProN',serif";
    ctx.fillText("湿地", m.x - 14, m.y + 5);
  }
  const trees = (f, fill, tone, n, label) => {
    ctx.fillStyle = fill; blobPath(ctx, f); ctx.fill();
    ctx.fillStyle = tone;
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, r = f.r * Math.sqrt((i + 0.5) / n) * 0.92;
      const tx = f.x + Math.cos(a) * r, ty = f.y + Math.sin(a) * r;
      ctx.beginPath(); ctx.moveTo(tx, ty - 8); ctx.lineTo(tx + 5.5, ty + 4); ctx.lineTo(tx - 5.5, ty + 4); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgba(45,70,40,0.75)"; ctx.font = "14px 'Hiragino Mincho ProN',serif";
    ctx.fillText(label, f.x - (label.length * 7), f.y + 5);
  };
  for (const f of FORESTS) trees(f, "#8EAD6F", "#5F8449", 34, "森");
  for (const f of WOODS) trees(f, "#A9C288", "#7A9A5E", 14, "林");

  if (hasRiver()) {
    const band = (x) => [RIVER.top + riverShift(x), RIVER.bot + riverShift(x)];
    const strip = (x0, x1, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 6) { const [t] = band(x); if (x === x0) ctx.moveTo(x, t); else ctx.lineTo(x, t); }
      for (let x = x1; x >= x0; x -= 6) { const [, bt] = band(x); ctx.lineTo(x, bt); }
      ctx.closePath(); ctx.fill();
    };
    strip(0, FIELD.w, "#8FB4C7");                                   // 深い川
    strip(RIVER.ford[0], RIVER.ford[1], "#AECBD8");                 // 浅瀬
    // 橋は板を渡す
    const [bt0, bb0] = band((RIVER.bridge[0] + RIVER.bridge[1]) / 2);
    ctx.fillStyle = "#C6A377";
    ctx.fillRect(RIVER.bridge[0], bt0 - 6, RIVER.bridge[1] - RIVER.bridge[0], bb0 - bt0 + 12);
    ctx.fillStyle = "rgba(120,90,60,0.5)";
    for (let x = RIVER.bridge[0]; x < RIVER.bridge[1]; x += 13) ctx.fillRect(x, bt0 - 6, 2, bb0 - bt0 + 12);
    ctx.fillStyle = "rgba(60,80,95,0.85)"; ctx.font = "13px 'Hiragino Mincho ProN',serif";
    ctx.fillText("橋", (RIVER.bridge[0] + RIVER.bridge[1]) / 2 - 8, bt0 - 12);
    const [ft0] = band((RIVER.ford[0] + RIVER.ford[1]) / 2);
    ctx.fillText("浅瀬", (RIVER.ford[0] + RIVER.ford[1]) / 2 - 16, ft0 - 12);
    const [dt0] = band(60);
    ctx.fillText("深い川", 60, dt0 - 12);
  }
}

function drawCastleTerrain(ctx, m) {
  const t = m.t, cx = m.cx, cy = m.cy;
  ctx.fillStyle = "#CBD8AC"; ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  ctx.strokeStyle = "rgba(120,130,90,0.09)"; ctx.lineWidth = 1;
  for (let x = 0; x < FIELD.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.h); ctx.stroke(); }
  for (let y = 0; y < FIELD.h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.w, y); ctx.stroke(); }

  const o = m.layers[0], band = m.moat.band;
  const tone4 = ["#C6D2A8", "#C0CDA0", "#BACA98", "#B4C592"];
  // 堀。虎口の外側を回す。
  const ob = o.masu + t + 8;
  ctx.fillStyle = "#8FB4C7";
  ctx.fillRect(cx - o.hw - t - ob - band, cy - o.hh - t - ob - band,
    (o.hw + t + ob + band) * 2, (o.hh + t + ob + band) * 2);
  ctx.fillStyle = "#CBD8AC";
  ctx.fillRect(cx - o.hw - t - ob, cy - o.hh - t - ob, (o.hw + t + ob) * 2, (o.hh + t + ob) * 2);
  // 各門の土橋
  ctx.fillStyle = "#C6A377";
  for (const g of o.gates) {
    const a = axisOf(o, g);
    const u0 = gateOpenU(g) - g.w * 0.8, v0 = (a.along === "x" ? o.hh : o.hw) + t + ob;
    if (a.along === "x") ctx.fillRect(cx + u0, a.sgn > 0 ? cy + v0 : cy - v0 - band, g.w * 1.6, band);
    else ctx.fillRect(a.sgn > 0 ? cx + v0 : cx - v0 - band, cy + u0, band, g.w * 1.6);
  }

  m.layers.forEach((l, i) => {
    ctx.fillStyle = tone4[Math.min(3, Math.round((i / Math.max(1, m.layers.length - 1)) * 3))];
    ctx.fillRect(cx - l.hw, cy - l.hh, l.hw * 2, l.hh * 2);
    // 城壁（門の分を抜く）
    const x0 = cx - l.hw - t, x1 = cx + l.hw + t, y0 = cy - l.hh - t, y1 = cy + l.hh + t;
    ctx.fillStyle = "#AFA895";
    for (const face of ["S", "N", "E", "W"]) {
      const gs = l.gates.filter((g) => g.face === face).sort((p1, p2) => p1.off - p2.off);
      const horiz = face === "S" || face === "N";
      const fixed = face === "S" ? y1 - t : face === "N" ? y0 : face === "E" ? x1 - t : x0;
      let cur = horiz ? x0 : y0;
      const end = horiz ? x1 : y1;
      for (const g of gs) {
        const wid = g.w + (g.broken ? 20 : 0);
        const c0 = (horiz ? cx : cy) + g.off - wid / 2;
        if (horiz) ctx.fillRect(cur, fixed, Math.max(0, c0 - cur), t);
        else ctx.fillRect(fixed, cur, t, Math.max(0, c0 - cur));
        cur = c0 + wid;
      }
      if (horiz) ctx.fillRect(cur, fixed, Math.max(0, end - cur), t);
      else ctx.fillRect(fixed, cur, t, Math.max(0, end - cur));
    }
    ctx.strokeStyle = "rgba(90,86,74,0.55)"; ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // 門と虎口
    for (const g of l.gates) {
      const a = axisOf(l, g);
      const gp = gatePos(m, l, g);
      const along = a.along === "x";
      if (g.broken) {
        // 破れた門は虎口ごと崩れ、瓦礫だけが残る
        ctx.fillStyle = "rgba(150,140,120,0.45)";
        for (let k = 0; k < 9; k++) {
          const q = fromUV(m, a, g.off + ((k * 17) % 23) - 11, a.half + t + 6 + Math.floor(k / 3) * (g.masu / 2.6));
          ctx.fillRect(q.x - 3, q.y - 3, 6, 5);
        }
        continue;
      }
      ctx.fillStyle = "#8C6A45";
      if (along) ctx.fillRect(gp.x - g.w / 2, gp.y - (t + 4) / 2, g.w, t + 4);
      else ctx.fillRect(gp.x - (t + 4) / 2, gp.y - g.w / 2, t + 4, g.w);
      const bp = fromUV(m, a, g.off, a.half + t + 9);
      const r = g.hp / g.max;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      if (along) ctx.fillRect(bp.x - g.w / 2, bp.y - 2, g.w, 4); else ctx.fillRect(bp.x - 2, bp.y - g.w / 2, 4, g.w);
      ctx.fillStyle = r > 0.5 ? "#5C8C4A" : r > 0.22 ? "#C89A3A" : "#B0483C";
      if (along) ctx.fillRect(bp.x - g.w / 2, bp.y - 2, g.w * r, 4); else ctx.fillRect(bp.x - 2, bp.y - g.w / 2, 4, g.w * r);
      // 虎口の袖壁と正面壁
      const put = (u, v, wu, wv) => {
        const q = fromUV(m, a, u, v);
        if (along) ctx.fillRect(q.x - wu / 2, a.sgn > 0 ? q.y : q.y - wv, wu, wv);
        else ctx.fillRect(a.sgn > 0 ? q.x : q.x - wv, q.y - wu / 2, wv, wu);
      };
      ctx.fillStyle = "#AFA895";
      put(g.off - g.w / 2, a.half + t, t, g.masu);
      put(g.off + g.w / 2, a.half + t, t, g.masu);
      const gL = g.off - g.w / 2, gR = g.off + g.w / 2;
      const from = g.open > 0 ? gR - g.w * 0.1 : gL - g.w * 0.9;
      const seg = (u0, u1) => { if (u1 > u0) put((u0 + u1) / 2, a.half + t + g.masu, u1 - u0, t); };
      seg(g.off - g.w * 1.05, from); seg(from + g.w, g.off + g.w * 1.05);
      const lp = fromUV(m, a, g.off, a.half + t + g.masu + 17);
      ctx.fillStyle = "rgba(70,66,58,0.8)"; ctx.font = `${Math.round(11 * (FIELD.w / BASE.w))}px sans-serif`;
      ctx.fillText(g.name, lp.x - g.name.length * 5.5, lp.y + 4);
    }
    ctx.fillStyle = "rgba(70,72,58,0.75)"; ctx.font = "15px 'Hiragino Mincho ProN',serif";
    ctx.fillText(l.name, cx - l.hw + 10, cy - l.hh + 22);
  });
  // 施設。崩れたものは瓦礫にする。
  for (const f of m.fac) {
    if (f.hp <= 0) {
      ctx.fillStyle = "rgba(150,140,120,0.4)";
      for (let k = 0; k < 7; k++) {
        const ang = k * 2.4, r = f.r * 0.8 * (((k % 3) + 1) / 3);
        ctx.fillRect(f.x + Math.cos(ang) * r - 3, f.y + Math.sin(ang) * r - 3, 7, 5);
      }
      continue;
    }
    ctx.fillStyle = f.kind === "矢倉" ? "#9C9483" : "#B08A5A";
    ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    ctx.strokeStyle = "rgba(70,66,58,0.65)"; ctx.lineWidth = 1;
    ctx.strokeRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(f.x - f.r, f.y + f.r + 2, f.r * 2, 3);
    ctx.fillStyle = f.hp / f.max > 0.5 ? "#5C8C4A" : f.hp / f.max > 0.25 ? "#C89A3A" : "#B0483C";
    ctx.fillRect(f.x - f.r, f.y + f.r + 2, f.r * 2 * (f.hp / f.max), 3);
    if (f.r > 10) {
      ctx.fillStyle = "rgba(60,58,50,0.85)"; ctx.font = `${Math.round(9 * (FIELD.w / BASE.w))}px sans-serif`;
      ctx.fillText(f.kind === "矢倉" ? "矢" : "鐘", f.x - f.r * 0.35, f.y + f.r * 0.35);
    }
  }
  ctx.fillStyle = "rgba(60,80,95,0.8)"; ctx.font = "14px 'Hiragino Mincho ProN',serif";
  ctx.fillText("堀", cx - o.hw - t - o.masu - band / 2 - 7, cy);
}

// 布陣できる範囲。攻め口の方角と、寄せ手か守り手かで決まる。
function ownZone(b) {
  const face = b.face || "S", far = !!b.myFar;
  // 寄せ手は遠い側、守り手は近い側から入る。攻め口の方角で自陣が変わる。
  const vertical = face === "N" || face === "S";
  if (vertical) {
    const bottom = face === "S" ? far : !far;
    return bottom
      ? { x: 0, y: FIELD.h * 0.6, w: FIELD.w, h: FIELD.h * 0.4, vertical: true, bottom: true }
      : { x: 0, y: 0, w: FIELD.w, h: FIELD.h * 0.4, vertical: true, bottom: false };
  }
  const right = face === "E" ? far : !far;
  return right
    ? { x: FIELD.w * 0.6, y: 0, w: FIELD.w * 0.4, h: FIELD.h, vertical: false, bottom: true }
    : { x: 0, y: 0, w: FIELD.w * 0.4, h: FIELD.h, vertical: false, bottom: false };
}

const inOwnZone = (b, x, y) => {
  const z = ownZone(b);
  return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
};


function drawBattle(ctx, b, sel, terrainCanvas, cam, W, H, dpr, selAll) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const S = (wx, wy) => [(wx - cam.x) * cam.s + W / 2, (wy - cam.y) * cam.s + H / 2];

  ctx.save();
  ctx.translate(W / 2 - cam.x * cam.s, H / 2 - cam.y * cam.s);
  ctx.scale(cam.s, cam.s);
  ctx.drawImage(terrainCanvas, 0, 0);

  // 布陣段階は自陣の範囲を示す
  if (b.phase === "deploy") {
    const z = ownZone(b);
    ctx.fillStyle = "rgba(47,93,140,0.07)";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = "rgba(47,93,140,0.35)"; ctx.setLineDash([8, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (z.vertical) {
      const ly = z.bottom ? z.y : z.y + z.h;
      ctx.moveTo(0, ly); ctx.lineTo(FIELD.w, ly);
    } else {
      const lx = z.bottom ? z.x : z.x + z.w;
      ctx.moveTo(lx, 0); ctx.lineTo(lx, FIELD.h);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // LOD：近距離＝10人駒、中距離＝50人組、遠距離＝武将隊（GDD 8.10）
  const lod = cam.s >= 0.55 ? "koma" : cam.s >= 0.3 ? "squad" : "corps";
  const shown = b.corps.filter((c) => !c.dead);
  for (const c of shown) {
    const isP = c.side === "P";
    if (c.destroyed) continue;
    if (!isP && !c.seen && b.phase === "fight") continue;
    if (c.ambush && !c.revealed && !isP) continue;
    const live = c.squads.filter((q) => q.men > 0);
    if (!live.length) continue;

    // 隊の輪郭。まとまりが一目で分かるようにする。
    const xs = live.map((q) => q.x), ys = live.map((q) => q.y);
    const x0 = Math.min(...xs) - 12, x1 = Math.max(...xs) + 12;
    const y0 = Math.min(...ys) - 12, y1 = Math.max(...ys) + 12;
    const on = sel === c.id || selAll;
    const rr = 10;
    ctx.beginPath();
    ctx.moveTo(x0 + rr, y0);
    ctx.arcTo(x1, y0, x1, y1, rr); ctx.arcTo(x1, y1, x0, y1, rr);
    ctx.arcTo(x0, y1, x0, y0, rr); ctx.arcTo(x0, y0, x1, y0, rr);
    ctx.closePath();
    ctx.fillStyle = c.color + (on ? "4A" : isP ? "22" : "14");
    ctx.fill();
    if (!isP) {                       // 敵の隊は斜線で塗り分ける（色に頼らない識別）
      ctx.save(); ctx.clip();
      ctx.strokeStyle = c.color + "3A"; ctx.lineWidth = 1.4 / cam.s;
      for (let hx = x0 - (y1 - y0); hx < x1; hx += 9) {
        ctx.beginPath(); ctx.moveTo(hx, y1); ctx.lineTo(hx + (y1 - y0), y0); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.strokeStyle = on ? c.color : c.color + (isP ? "66" : "99");
    ctx.lineWidth = (on ? 3.4 : isP ? 1.6 : 2.2) / cam.s;
    if (!isP && !on) ctx.setLineDash([7 / cam.s, 5 / cam.s]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (lod === "corps") continue;

    // 敵味方は色で判ずる（GDD 8.10）。
    // 家の色をそのまま使うと、戦場でどちらが自軍か咄嗟に判らない。
    // 味方は藍に、敵は朱に寄せたうえで、家の色をわずかに混ぜて家の別も残す。
    const toward = (hex, tgt, w) => {
      const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const b = [1, 3, 5].map((i) => parseInt(tgt.slice(i, i + 2), 16));
      return "#" + a.map((v, i) => Math.round(v * (1 - w) + b[i] * w)
        .toString(16).padStart(2, "0")).join("");
    };
    const side = toward(c.color, isP ? "#2F5D8C" : "#B0483C", 0.72);
    const bright = shade(side, isP ? 0.18 : 0.16), dark = shade(side, isP ? -0.30 : -0.22);
    const edge = isP ? "rgba(255,255,255,0.95)" : "rgba(28,26,22,0.85)";
    const edge2 = isP ? "rgba(20,20,18,0.55)" : "rgba(28,26,22,0.9)";
    if (lod === "squad") {
      for (const q of live) {
        const fill = q.origin === "直属" ? bright : dark;
        const size = 3.2 + (q.men / 50) * 4.2;
        drawKoma(ctx, q.x, q.y, q.facing, q.type, fill,
          q.origin === "直属" ? edge : edge2, size / 4.8);
        if (ARM_STATS[q.type].range > 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(q.x, q.y, size * 0.75, 0, 7); ctx.stroke();
        }
      }
      continue;
    }
    for (const q of live) {
      const rows = Math.ceil(Math.ceil(q.men / 10) / 5);
      const hw = 2 * KOMA + 4, d0 = -4, d1 = (rows - 1) * KOMA + 4;
      const pts = [[-hw, d0], [hw, d0], [hw, d1], [-hw, d1]].map(([a, bb]) => {
        const [ox, oy] = rot(a, bb, q.facing); return [q.x + ox, q.y + oy];
      });
      ctx.fillStyle = q.reserve ? c.color + "12" : c.color + "26";
      ctx.beginPath();
      pts.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])));
      ctx.closePath(); ctx.fill();
    }
    // 噛み合っている組どうしを短い線でつなぐ。どの50人が誰と戦っているかが分かる。
    if (lod === "koma" || lod === "squad") {
      ctx.lineCap = "round";
      for (const q of live) {
        if (q.link) {
          ctx.strokeStyle = "rgba(40,36,28,0.42)"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.link.x, q.link.y); ctx.stroke();
          const mx = (q.x + q.link.x) / 2, my = (q.y + q.link.y) / 2;
          const ang = Math.atan2(q.link.y - q.y, q.link.x - q.x) + Math.PI / 2;
          ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(mx + Math.cos(ang) * 3.4, my + Math.sin(ang) * 3.4);
          ctx.lineTo(mx - Math.cos(ang) * 3.4, my - Math.sin(ang) * 3.4);
          ctx.stroke();
        } else if (q.aim && b.t - q.aim.t < 1.6 && (sel === c.id || selAll)) {
          ctx.strokeStyle = c.color + "44"; ctx.lineWidth = 0.8;
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.aim.x, q.aim.y); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    for (const q of live) {
      const n = Math.ceil(q.men / 10);
      const dis = q.dis || 0;
      const fill = shade(q.origin === "直属" ? bright : dark, on ? 0.16 : 0);
      const stroke = q.origin === "直属" ? edge : edge2;
      const jit = Math.pow(dis, 1.8) * 2.2;                  // 位置の乱れ（控えめ）
      const spread = dis > 0.62 ? (dis - 0.62) * 2.6 : 0;    // 相当低いときだけ向きが乱れる
      for (let i = 0; i < n; i++) {
        const h1 = Math.sin(q.seed + i * 12.9898), h2 = Math.cos(q.seed + i * 78.233);
        const [ox, oy] = rot(((i % 5) - 2) * KOMA + h1 * jit, Math.floor(i / 5) * KOMA + h2 * jit, q.facing);
        drawKoma(ctx, q.x + ox, q.y + oy, q.facing + h1 * spread * 2.0, q.type, fill, stroke, 1);
      }
      if (q.origin === "直属") {           // 直属家臣団は小旗を立てる（GDD 6.3）
        const [fx, fy] = rot(-2 * KOMA - 3, -3, q.facing);
        const bx = q.x + fx, by = q.y + fy;
        ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 8); ctx.stroke();
        ctx.fillStyle = bright;
        ctx.beginPath(); ctx.moveTo(bx, by - 8); ctx.lineTo(bx + 5, by - 6.2); ctx.lineTo(bx, by - 4.4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.stroke();
      }
    }
  }
  // 戦いの気配。短く消える細い線と火花だけで、駒を隠さない。
  if (b.fx && b.fx.length) {
    for (const f of b.fx) {
      const a = 1 - f.t / f.life;
      if (f.k === "arrow") {
        ctx.globalAlpha = a * 0.5;
        ctx.strokeStyle = "#5A5238"; ctx.lineWidth = 0.7;
        const u = Math.min(1, f.t / f.life * 1.6);
        const hx = f.x + (f.x2 - f.x) * u, hy = f.y + (f.y2 - f.y) * u;
        const tx = f.x + (f.x2 - f.x) * Math.max(0, u - 0.22), ty = f.y + (f.y2 - f.y) * Math.max(0, u - 0.22);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      } else if (f.k === "shot") {
        ctx.globalAlpha = a * 0.75;
        ctx.strokeStyle = "#FFF4D8"; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
        ctx.globalAlpha = a * 0.4;
        ctx.fillStyle = "#EFE9DC";
        ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - a) * 5, 0, 7); ctx.fill();
      } else if (f.k === "clash") {
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = f.big ? "#E8B24A" : "#FFFFFF";
        ctx.lineWidth = f.big ? 1.4 : 1;
        const r = (f.big ? 5 : 3.5) + (1 - a) * 4;
        for (let k = 0; k < 3; k++) {
          const ang = f.x * 0.7 + f.y * 1.3 + k * 2.1;
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(ang) * r * 0.4, f.y + Math.sin(ang) * r * 0.4);
          ctx.lineTo(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r);
          ctx.stroke();
        }
      } else if (f.k === "dust") {
        ctx.globalAlpha = a * 0.28;
        ctx.fillStyle = "#B9A98A";
        ctx.beginPath(); ctx.arc(f.x, f.y, 4 + (1 - a) * 9, 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 標識・文字は画面座標で描く
  for (const c of shown) {
    const isP = c.side === "P";
    // 武将は隊の後ろ寄りに描く（c.gx/c.gy が算出済みならそこへ）
    const [x, y] = S(c.gx == null ? c.x : c.gx, c.gy == null ? c.y : c.gy);
    if (c.destroyed) {
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(x - 26, y - 10, 52, 19);
      ctx.strokeStyle = c.color; ctx.lineWidth = 1; ctx.strokeRect(x - 26, y - 10, 52, 19);
      ctx.fillStyle = "#8A8478"; ctx.font = "12px sans-serif"; ctx.fillText("壊滅", x - 12, y + 4);
      continue;
    }
    if (!isP && !c.seen && b.phase === "fight") {
      if (c.lastSeen && b.t - c.lastSeen.t < 45) {
        const [lx, ly] = S(c.lastSeen.x, c.lastSeen.y);
        ctx.strokeStyle = c.color + "88"; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(lx, ly, 28, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.color; ctx.font = "12px sans-serif"; ctx.fillText("敵影", lx - 13, ly + 4);
      }
      continue;
    }
    if (c.ambush && !c.revealed && !isP) continue;

    ctx.globalAlpha = c.routed || c.withdraw ? 0.55 : 1;
    // 武将の居場所は馬印で示す。総大将は旗を二本立て、金の輪をつける。
    const lord = c.gen.lord && !c.detach;
    const H = lord ? 30 : 22;
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y - H); ctx.stroke();
    ctx.strokeStyle = "#3A382F"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y - H); ctx.stroke();
    const banner = (top, w2, h2) => {
      ctx.fillStyle = c.color;
      ctx.fillRect(x + 1, y - top, w2, h2);
      ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y - top, w2, h2);
    };
    banner(H, 11, 8);
    if (lord) banner(H - 10, 11, 8);
    // 足元の駒
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, sel === c.id ? 8 : 6.4, 0, 7); ctx.fill();
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(x, y, sel === c.id ? 5.6 : 4.2, 0, 7); ctx.fill();
    if (lord) {
      ctx.strokeStyle = "#D8B24A"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.stroke();
    }
    if (sel === c.id || selAll) {
      ctx.fillStyle = c.color + "33";
      ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
      ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.stroke();
      ctx.strokeStyle = c.color; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.stroke();
      // 向きを示す矢
      const fx2 = x + Math.cos(c.facing) * 24, fy2 = y + Math.sin(c.facing) * 24;
      ctx.strokeStyle = c.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(c.facing) * 15, y + Math.sin(c.facing) * 15); ctx.lineTo(fx2, fy2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx2, fy2);
      ctx.lineTo(fx2 + Math.cos(c.facing + 2.5) * 6, fy2 + Math.sin(c.facing + 2.5) * 6);
      ctx.lineTo(fx2 + Math.cos(c.facing - 2.5) * 6, fy2 + Math.sin(c.facing - 2.5) * 6);
      ctx.closePath(); ctx.fillStyle = c.color; ctx.fill();
    }
    ctx.globalAlpha = 1;

    const label = c.detach ? `${c.task}${c.autonomous ? "・自律" : ""}` : c.ally ? `${c.name}（${c.ally}）` : c.name;
    ctx.font = c.detach ? "11px 'Hiragino Sans',sans-serif" : "600 13px 'Hiragino Sans',sans-serif";
    const w = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const ly = (c.gen.lord && !c.detach ? 34 : 26) + 14;
    ctx.fillRect(x - w / 2 - 4, y - ly, w + 8, 16);
    ctx.fillStyle = c.detach ? "#5B5850" : "#33332F";
    ctx.fillText(label, x - w / 2, y - ly + 12);

    // 士気（上段）と陣形維持（下段）を分けて示す
    const coh = c.squads.length ? c.squads.reduce((a, q) => a + q.cohesion, 0) / c.squads.length : 0;
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(x - 22, y + 12, 44, 8);
    ctx.fillStyle = c.morale > 55 ? "#5C8C4A" : c.morale > 30 ? "#C89A3A" : "#B0483C";
    ctx.fillRect(x - 22, y + 12, (44 * c.morale) / 100, 4);
    ctx.fillStyle = "#4A6E8A";
    ctx.fillRect(x - 22, y + 16, (44 * coh) / 100, 4);
    if (c.fatigue > 45) {
      ctx.fillStyle = "rgba(154,123,79,0.9)"; ctx.fillRect(x - 22, y + 21, (44 * c.fatigue) / 100, 2);
    }
    const tag = c.routed ? ["敗走", "#B0483C"] : c.withdraw ? ["撤退中", "#7C7668"]
      : c.boxed ? ["密集防御", "#8A6A34"] : c.pinch >= 2 ? ["挟撃", "#B0483C"]
      : c.order === "射撃" ? ["射撃優先", "#4A6E8A"] : null;
    if (tag) { ctx.fillStyle = tag[1]; ctx.font = "11px sans-serif"; ctx.fillText(tag[0], x - tag[0].length * 5.5, y + 34); }
    if (c.ambush && !c.revealed && isP) {
      ctx.strokeStyle = c.color; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.color; ctx.font = "11px sans-serif"; ctx.fillText("伏兵", x - 11, y + 34);
    }
  }
}

/* ========================================================== スタイル */
const css = `
*{box-sizing:border-box}
.sp{background:${U.paper};color:${U.text};height:100%;display:flex;flex-direction:column;overflow:hidden;
 overscroll-behavior:none;touch-action:manipulation;user-select:none;-webkit-user-select:none;
 font-family:'Hiragino Sans','Yu Gothic UI','Meiryo',system-ui,sans-serif;-webkit-tap-highlight-color:transparent}
.sp .mn{font-family:'Hiragino Mincho ProN','Yu Mincho','MS Mincho',serif}
.sp .num{font-variant-numeric:tabular-nums}
.bar{display:flex;align-items:center;gap:14px;padding:9px 14px;background:${U.card};
 border-bottom:1px solid ${U.line};flex:0 0 auto;flex-wrap:wrap;font-size:13px}
.bar .kv{display:flex;align-items:center;gap:5px;color:${U.dim}}
.bar .kv b{color:${U.text};font-weight:600}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.btn{background:${U.card};color:${U.text};border:1px solid ${U.line};border-radius:6px;
 padding:8px 13px;font-size:13px;cursor:pointer;font-family:inherit}
.btn:hover{background:#FAF8F2}
.btn:disabled{opacity:.4;cursor:default}
.btn.dark{background:${U.ink};color:#fff;border-color:${U.ink}}
.btn.on{background:#EEF2F7;border-color:${U.text}}
.btn.sm{padding:5px 9px;font-size:12px;border-radius:5px}
.pill{border-radius:4px;font-size:11px;padding:2px 7px;color:#fff}
.mapwrap{flex:1;position:relative;min-height:0;overflow:hidden;background:#DDE4C8;touch-action:none;overscroll-behavior:none}
.fieldwrap{touch-action:none;overscroll-behavior:none}
.bpanel .g2,.bpanel .g4{gap:6px}
.bpanel .btn.sm{padding:6px 6px;font-size:12px}
.mapctl{position:absolute;display:flex;flex-direction:column;gap:6px;z-index:5}
.mapctl.l{left:12px;top:12px}
.mapctl.r{right:12px;top:12px}
.mbtn{width:60px;background:rgba(255,255,255,.94);border:1px solid ${U.line};border-radius:7px;
 padding:7px 4px;font-size:10px;text-align:center;cursor:pointer;line-height:1.5;color:${U.text}}
.mbtn b{display:block;font-size:16px;font-weight:500}
.mbtn:hover{background:#fff}
.mini{position:absolute;right:12px;bottom:12px;width:130px;height:139px;border:1px solid ${U.line};
 border-radius:6px;overflow:hidden;background:#fff;z-index:5;cursor:pointer}
.hint{position:absolute;left:50%;transform:translateX(-50%);bottom:16px;background:rgba(255,255,255,.94);
 border:1px solid ${U.line};border-radius:20px;padding:7px 18px;font-size:12px;color:${U.dim};z-index:4}
.sheet{position:absolute;left:0;right:0;bottom:0;background:${U.card};border-top:1px solid ${U.line};
 border-radius:14px 14px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.10);z-index:10;max-height:78%;overflow-y:auto;padding:14px 16px 18px}
.sheet-h{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.tbl{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;font-size:13px}
.tbl .k{color:${U.dim}}
.tbl .v{text-align:right;font-variant-numeric:tabular-nums}
.sec{font-size:11px;letter-spacing:.16em;color:${U.dim};margin:16px 0 7px;
 border-bottom:1px solid ${U.line2};padding-bottom:5px}
.sec:first-child{margin-top:0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.g4{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:7px}
.row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
.row .v{font-variant-numeric:tabular-nums}
.meter{height:6px;background:#EEEBE2;border-radius:3px;overflow:hidden;margin-top:4px}
.meter>i{display:block;height:100%}
.led{font-size:12px;border-left:3px solid #9BAF7A;background:#F7F9F1;padding:8px 10px;margin:7px 0;border-radius:0 5px 5px 0}
.led .up{color:#4E7A3E}.led .dn{color:#B0483C}
.battlefull{position:fixed;inset:0;z-index:100}
.modal{position:absolute;inset:0;background:rgba(40,40,36,.55);display:flex;align-items:center;
 justify-content:center;padding:16px;z-index:60}
.card{background:${U.card};border-radius:12px;max-width:620px;width:100%;max-height:88%;overflow-y:auto;padding:20px}
.sel{border:1px solid ${U.line};border-radius:6px;padding:7px;font-family:inherit;font-size:13px;background:#fff;color:${U.text}}
.split{display:flex;gap:20px}
.split>div{flex:1;min-width:0}
@media(max-width:760px){.split{flex-direction:column;gap:10px}.mini{width:96px;height:103px}}
`;

/* ========================================================== アプリ */
/* ------------------------------------------------------------- セーブ */
const SAVE_KEY = "sengoku:save1";
async function saveGame(state) {
  const data = JSON.stringify({ v: 1, at: Date.now(), state });
  try {
    if (typeof window !== "undefined" && window.storage) {
      await window.storage.set(SAVE_KEY, data);
      return true;
    }
  } catch (e) { /* 保存先が使えないときは黙って諦める */ }
  return false;
}
async function loadGame() {
  try {
    if (typeof window !== "undefined" && window.storage) {
      const r = await window.storage.get(SAVE_KEY);
      if (r && r.value) {
        const d = JSON.parse(r.value);
        if (d && d.state) { migrateRosters(d.state); return d; }
        return null;
      }
    }
  } catch (e) { /* 記録なし */ }
  return null;
}
async function clearGame() {
  try { if (typeof window !== "undefined" && window.storage) await window.storage.delete(SAVE_KEY); } catch (e) { /* noop */ }
}

// 横画面を基本とする（GDD 15.2）。政務も合戦も横で扱う。
function useLandscape() {
  const [land, setLand] = useState(true);
  useEffect(() => {
    const on = () => setLand(window.innerWidth >= window.innerHeight * 1.05);
    on();
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return land;
}
export default function App() {
  const [screen, setScreen] = useState("title");
  const [g, setG] = useState(null);
  const [saved, setSaved] = useState(null);
  const land = useLandscape();
  const terrain = useMemo(() => (typeof document === "undefined" ? null : buildTerrainCanvas()), []);

  useEffect(() => { loadGame().then((d) => setSaved(d)); }, []);
  const doSave = async (st) => {
    const ok = await saveGame(st);
    const d = ok ? { v: 1, at: Date.now(), state: st } : null;
    if (d) setSaved(d);
    return ok;
  };

  if (screen === "title") return (<><style>{css}</style>
    <Title saved={saved} onStart={() => setScreen("select")}
      onContinue={() => { setG(saved.state); setScreen("map"); }}
      onErase={async () => { await clearGame(); setSaved(null); }} /></>);
  if (screen === "select") return (<><style>{css}</style>
    <DaimyoSelect terrain={terrain} land={land} onBack={() => setScreen("title")}
      onPick={(f, watch, lvl) => {
        const st = initState(f);
        st.level = lvl || "普通";
        if (watch) st.autoPlay = true;
        setG(st); setScreen("map");
      }} /></>);
  return (<><style>{css}</style>
    <MapScreen g={g} setG={setG} terrain={terrain} land={land} onSave={doSave}
      savedAt={saved ? saved.at : null} onTitle={() => setScreen("title")} /></>);
}

function Title({ saved, onStart, onContinue, onErase }) {
  return (
    <div className="sp" style={{ height: "100vh", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#CFE0EA 0%, #DDE6CC 42%, #C6D5A8 100%)" }} />
      <div style={{ position: "relative", textAlign: "center" }}>
        <div className="mn" style={{ fontSize: 46, letterSpacing: ".06em" }}>戦国プロジェクト</div>
        <div style={{ fontSize: 11, letterSpacing: ".42em", color: U.dim, marginTop: 8 }}>SENGOKU PROJECT</div>
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 11, width: 280 }}>
          {saved && (
            <button className="btn dark" style={{ padding: "13px" }} onClick={onContinue}>
              続きから（{saved.state.year}年{saved.state.month}月・{(FACTIONS[saved.state.player] || {}).name}）
            </button>
          )}
          <button className={`btn ${saved ? "" : "dark"}`} style={{ padding: "13px" }} onClick={onStart}>
            {saved ? "新しくはじめる" : "ゲームをはじめる"}
          </button>
          {saved && (
            <button className="btn" style={{ padding: "9px", fontSize: 12 }}
              onClick={() => { if (window.confirm("記録を消します。よろしいですか。")) onErase(); }}>記録を消す</button>
          )}
        </div>
      </div>
      <div style={{ position: "absolute", left: 20, bottom: 16, fontSize: 11, color: U.dim }}>ver.0.2.0</div>
    </div>
  );
}

// 地方の区分。家は本拠の国で振り分ける。
const REGIONS = [
  { name: "奥羽", kuni: ["陸奥", "出羽", "蝦夷"] },
  { name: "関東", kuni: ["上野", "武蔵", "相模", "下野", "常陸", "安房", "上総", "下総", "伊豆"] },
  { name: "中部", kuni: ["甲斐", "信濃", "駿河", "遠江", "三河", "尾張", "美濃", "飛騨", "佐渡", "越後", "越中", "能登", "加賀", "越前", "若狭"] },
  { name: "畿内", kuni: ["近江", "山城", "大和", "河内", "和泉", "摂津", "伊賀", "伊勢", "志摩", "紀伊", "丹波", "丹後"] },
  { name: "中国", kuni: ["但馬", "播磨", "因幡", "伯耆", "出雲", "石見", "隠岐", "備前", "美作", "備中", "備後", "安芸", "周防", "長門"] },
  { name: "四国", kuni: ["淡路", "阿波", "讃岐", "伊予", "土佐"] },
  { name: "九州", kuni: ["筑前", "筑後", "豊前", "豊後", "肥前", "肥後", "日向", "薩摩", "大隅", "壱岐", "対馬", "琉球"] },
];
// 本拠は当主が座す城。石高の大きい城とは限らない。
function seatOf(castles, generals, fid) {
  const cs = castles.filter((c) => c.faction === fid);
  if (!cs.length) return null;
  const lord = generals.find((g) => g.faction === fid && g.lord && !g.captive);
  if (lord) {
    const home = cs.find((c) => c.id === lord.at);
    if (home) return home;
  }
  return [...cs].sort((a, b) => b.koku - a.koku)[0];
}
function regionOf(fid) {
  const cs = CASTLES.filter((c) => c.faction === fid);
  if (!cs.length) return "―";
  const seat = seatOf(CASTLES, GENERALS, fid);
  const r = REGIONS.find((x) => x.kuni.includes(seat.kuni));
  return r ? r.name : "―";
}
function DaimyoSelect({
 terrain, land, onBack, onPick }) {
  const [level, setLevel] = useState("普通");
  const [region, setRegion] = useState("すべて");
  const [size, setSize] = useState("すべて");
  const [open, setOpen] = useState(null);
  // 地図の見え方。s は倍率、x/y は見ている中心（地図座標）。
  const [mv, setMv] = useState({ x: MAPW / 2, y: MAPH / 2, s: 1 });
  const drag = useRef(null);
  const cvRef = useRef(null);
  // 地図の上で家々を色分けして示し、押した場所の家を選ぶ。
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv || !terrain) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    // 見ている中心と倍率に合わせて描く
    const base = W / MAPW;                     // 全体が収まる倍率
    const k = base * mv.s;                     // いまの倍率
    const S = (wx, wy) => [(wx - mv.x) * k + W / 2, (wy - mv.y) * k + H / 2];
    ctx.drawImage(terrain, 0, 0, MAPW, MAPH,
      -mv.x * k + W / 2, -mv.y * k + H / 2, MAPW * k, MAPH * k);
    // 版図を家の色で塗る（近い城の家に属するものとみなす）
    const cs = CASTLES.map((c) => {
      const [x, y] = S(px(c.lon), py(c.lat));
      return { x, y, col: (FACTIONS[c.faction] || {}).color || "#888",
        w: 1 + Math.sqrt(c.koku / 10000) * 0.34, fid: c.faction };
    });
    const cell = 6;
    const reach = 26 * (k / base);
    ctx.globalAlpha = 0.34;
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        let best = null, bd = 1e9;
        for (const c of cs) {
          const d = Math.hypot(c.x - x, c.y - y) / c.w;
          if (d < bd) { bd = d; best = c; }
        }
        if (!best || bd > reach) continue;
        ctx.fillStyle = best.col;
        ctx.fillRect(x, y, cell + 1, cell + 1);
      }
    }
    ctx.globalAlpha = 1;
    // 城。拡大すれば名も出す。
    const big = mv.s > 1.8;
    for (const c of CASTLES) {
      const [x, y] = S(px(c.lon), py(c.lat));
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
      const on = open === c.faction;
      const col = (FACTIONS[c.faction] || {}).color || "#888";
      const r = (on ? 4.6 : 2.6) * (big ? 1.5 : 1);
      ctx.fillStyle = on ? "#fff" : "rgba(255,255,255,.75)";
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r * 0.68, 0, 7); ctx.fill();
      if (big) {
        ctx.font = "600 11px 'Hiragino Sans',sans-serif";
        const nm = c.name;
        const w = ctx.measureText(nm).width;
        ctx.fillStyle = "rgba(255,255,255,.82)";
        ctx.fillRect(x - w / 2 - 3, y - r - 15, w + 6, 13);
        ctx.fillStyle = "#2A2A28"; ctx.fillText(nm, x - w / 2, y - r - 5);
      }
    }
    if (open) {
      const seat = seatOf(CASTLES, GENERALS, open);
      if (seat) {
        const [x, y] = S(px(seat.lon), py(seat.lat));
        ctx.strokeStyle = (FACTIONS[open] || {}).color || "#888";
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.stroke();
        const nm = (FACTIONS[open] || {}).name || "";
        ctx.font = "600 13px 'Hiragino Sans',sans-serif";
        const w = ctx.measureText(nm).width;
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.fillRect(x - w / 2 - 5, y - 30, w + 10, 18);
        ctx.fillStyle = "#2A2A28"; ctx.fillText(nm, x - w / 2, y - 17);
      }
    }
    ctx.fillStyle = "rgba(40,60,80,.5)";
    ctx.font = `${Math.round(clamp(12 * mv.s, 11, 20))}px serif`;
    for (const q of SEA_LABELS) {
      const [x, y] = S(q.x, q.y);
      if (x < -40 || x > W + 40 || y < -20 || y > H + 20) continue;
      ctx.fillText(q.name, x - 20, y);
    }
  }, [terrain, open, mv]);

  // 地図の操作。一本指でなぞれば動かし、二本指で拡げ縮めする。
  // 動かさずに離したときだけ、そこの大名を選ぶ。
  const mapXY = (cv, p) => {
    const r = cv.getBoundingClientRect();
    const W = cv.width, H = cv.height;
    const sx = ((p.clientX - r.left) / r.width) * W;
    const sy = ((p.clientY - r.top) / r.height) * H;
    const k = (W / MAPW) * mv.s;
    return [(sx - W / 2) / k + mv.x, (sy - H / 2) / k + mv.y];
  };
  const onMapDown = (e) => {
    const cv = cvRef.current;
    if (!cv) return;
    if (e.cancelable) e.preventDefault();     // 画面ごと動いてしまうのを防ぐ
    if (e.touches && e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const r = cv.getBoundingClientRect();
      const mx = ((t1.clientX + t2.clientX) / 2 - r.left) / r.width * cv.width;
      const my = ((t1.clientY + t2.clientY) / 2 - r.top) / r.height * cv.height;
      const k = (cv.width / MAPW) * mv.s;
      drag.current = {
        pinch: true, moved: 99,
        d0: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
        s0: mv.s,
        wx: (mx - cv.width / 2) / k + mv.x,
        wy: (my - cv.height / 2) / k + mv.y,
      };
      return;
    }
    const p = e.touches ? e.touches[0] : e;
    drag.current = { x: p.clientX, y: p.clientY, vx: mv.x, vy: mv.y, moved: 0 };
  };
  const onMapMove = (e) => {
    const d = drag.current, cv = cvRef.current;
    if (!d || !cv) return;
    if (e.cancelable) e.preventDefault();     // 地図だけを動かす
    if (d.pinch) {
      if (!e.touches || e.touches.length < 2) return;
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dd = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (!d.d0 || !dd) return;
      const r = cv.getBoundingClientRect();
      const mx = ((t1.clientX + t2.clientX) / 2 - r.left) / r.width * cv.width;
      const my = ((t1.clientY + t2.clientY) / 2 - r.top) / r.height * cv.height;
      const ns = clamp(d.s0 * (dd / d.d0), 1, 8);
      const k = (cv.width / MAPW) * ns;
      // 指の間の土地が動かぬようにする
      setMv({ s: ns, x: d.wx - (mx - cv.width / 2) / k, y: d.wy - (my - cv.height / 2) / k });
      return;
    }
    const p = e.touches ? e.touches[0] : e;
    const r = cv.getBoundingClientRect();
    const k = (cv.width / MAPW) * mv.s * (r.width / cv.width);
    const dx = (p.clientX - d.x) / k, dy = (p.clientY - d.y) / k;
    d.moved = Math.max(d.moved, Math.hypot(p.clientX - d.x, p.clientY - d.y));
    setMv((v) => ({ ...v, x: clamp(d.vx - dx, 0, MAPW), y: clamp(d.vy - dy, 0, MAPH) }));
  };
  const onMapUp = (e) => {
    const d = drag.current, cv = cvRef.current;
    if (e.cancelable) e.preventDefault();
    drag.current = null;
    if (!d || !cv || d.moved > 8) return;      // なぞった後は選ばない
    const p = (e.changedTouches && e.changedTouches[0]) || e;
    const [mx, my] = mapXY(cv, p);
    let best = null, bd = 1e9;
    for (const c of CASTLES) {
      const dd = Math.hypot(px(c.lon) - mx, py(c.lat) - my);
      if (dd < bd) { bd = dd; best = c; }
    }
    if (!best || bd > 170 / mv.s) return;
    setOpen(best.faction);
    setRegion("すべて"); setSize("すべて");
  };
  const mapZoom = (kk) => setMv((v) => ({ ...v, s: clamp(v.s * kk, 1, 8) }));
  const mapWhole = () => setMv({ x: MAPW / 2, y: MAPH / 2, s: 1 });

  const stat = (fid) => {
    const cs = CASTLES.filter((c) => c.faction === fid);
    const gs = GENERALS.filter((x) => x.faction === fid);
    const seat = seatOf(CASTLES, GENERALS, fid);
    const lord = gs.find((x) => x.lord) || [...gs].sort((a, b) => (b.lead + b.gov) - (a.lead + a.gov))[0];
    return {
      koku: cs.reduce((a, c) => a + c.koku, 0),
      men: cs.reduce((a, c) => a + c.local, 0) + gs.reduce((a, x) => a + x.retinue, 0),
      gen: gs.length, castles: cs.length,
      towns: TOWNS.filter((t) => t.owner === fid).length,
      seat: seat ? `${seat.name}（${seat.kuni}）` : "―",
      lord: lord ? lord.name : "―",
    };
  };
  // 石高で大身・中堅・小勢力に分ける
  const list = Object.values(FACTIONS)
    .map((f) => ({ f, st: stat(f.id) }))
    .filter(({ f, st }) => st.castles > 0)
    .filter(({ f }) => region === "すべて" || regionOf(f.id) === region)
    .filter(({ st }) => size === "すべて"
      || (size === "大身" && st.koku >= 250000)
      || (size === "中堅" && st.koku >= 100000 && st.koku < 250000)
      || (size === "小勢力" && st.koku < 100000))
    .sort((a, b) => (b.f.id === open ? 1 : 0) - (a.f.id === open ? 1 : 0) || b.st.koku - a.st.koku);
  return (
    <div className="sp" style={{ height: "100vh", overscrollBehavior: "none" }}>
      <div style={{ flex: 1, display: "flex", minHeight: 0, flexDirection: land ? "row" : "column" }}>
        <div style={{ flex: 1, position: "relative", background: "#DDE4C8", overflow: "hidden",
          touchAction: "none", overscrollBehavior: "none" }}>
          <canvas ref={cvRef} width={720} height={760}
            style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "grab", touchAction: "none" }}
            onMouseDown={onMapDown} onMouseMove={onMapMove} onMouseUp={onMapUp} onMouseLeave={() => { drag.current = null; }}
            onTouchStart={onMapDown} onTouchMove={onMapMove} onTouchEnd={onMapUp} />
          <button className="btn" style={{ position: "absolute", left: 14, top: 14 }} onClick={onBack}>← 戻る</button>
          <div style={{ position: "absolute", right: 12, top: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="btn sm" style={{ padding: "7px 11px" }} onClick={() => mapZoom(1.5)}>＋</button>
            <button className="btn sm" style={{ padding: "7px 11px" }} onClick={() => mapZoom(1 / 1.5)}>－</button>
            <button className="btn sm" style={{ padding: "7px 9px", fontSize: 11 }} onClick={mapWhole}>全図</button>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, textAlign: "center", pointerEvents: "none" }}>
            <span style={{ background: "rgba(252,250,245,.92)", padding: "6px 14px", borderRadius: 14,
              fontSize: 12.5, color: U.dim, boxShadow: "0 1px 4px rgba(0,0,0,.12)" }}>
              {open ? `${(FACTIONS[open] || {}).name} を選んでいます`
                : "地図を押すと、その地の大名が選ばれます（二本指で拡げ縮め・なぞって移動）"}
            </span>
          </div>
        </div>
        <div style={{
          width: land ? 300 : "auto", flex: land ? "0 0 300px" : "0 0 52%",
          borderLeft: land ? `1px solid ${U.line}` : "none", borderTop: land ? "none" : `1px solid ${U.line}`,
          background: U.card, overflowY: "auto", padding: 16,
        }}>
          <div className="sec">難易度</div>
          <div className="g3" style={{ marginBottom: 6 }}>
            {Object.values(LEVELS).map((L) => (
              <button key={L.name} className={`btn sm ${level === L.name ? "on" : ""}`}
                onClick={() => setLevel(L.name)}>{L.name}</button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 14, lineHeight: 1.7 }}>
            {(LEVELS[level] || LEVELS["普通"]).desc}
          </div>

          <div className="sec">大名を選ぶ（{Object.keys(FACTIONS).length}家）</div>
          <div className="g2" style={{ marginBottom: 8 }}>
            {["すべて", "大身", "中堅", "小勢力"].map((k) => (
              <button key={k} className={`btn sm ${size === k ? "on" : ""}`} onClick={() => setSize(k)}>{k}</button>
            ))}
          </div>
          <div className="g3" style={{ marginBottom: 12 }}>
            {["すべて", ...REGIONS.map((r) => r.name)].map((k) => (
              <button key={k} className={`btn sm ${region === k ? "on" : ""}`} onClick={() => setRegion(k)}>{k}</button>
            ))}
          </div>

          {list.length === 0 && (
            <div style={{ fontSize: 12, color: U.dim, padding: "16px 0" }}>該当する家がありません。</div>
          )}
          {list.map(({ f, st }) => (
            <div key={f.id} style={{ borderBottom: `1px solid ${U.line2}`, padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                onClick={() => setOpen(open === f.id ? null : f.id)}>
                <span className="dot" style={{ background: f.color }} />
                <span className="mn" style={{ fontSize: 17, flex: 1 }}>{f.name}</span>
                <span className="num" style={{ fontSize: 11.5, color: U.dim }}>
                  {man(st.koku)}万石／{st.castles}城／{st.gen}名
                </span>
              </div>
              {open === f.id && (
                <div style={{ marginTop: 8 }}>
                  {f.desc && (
                    <div style={{ fontSize: 12, color: U.dim, marginBottom: 8, lineHeight: 1.7 }}>{f.desc}</div>
                  )}
                  <div className="tbl">
                    <span className="k">石高</span><span className="v">{man(st.koku)} 万石</span>
                    <span className="k">兵数</span><span className="v">{fmt(st.men)}</span>
                    <span className="k">武将</span><span className="v">{st.gen} 名</span>
                    <span className="k">拠点</span><span className="v">{st.castles}城{st.towns ? `・${st.towns}都市` : ""}</span>
                    <span className="k">本拠</span><span className="v">{st.seat}</span>
                    <span className="k">当主</span><span className="v">{st.lord}</span>
                  </div>
                  <button className="btn" style={{ width: "100%", marginTop: 10, background: f.color, color: "#fff", borderColor: f.color }}
                    onClick={() => onPick(f.id, false, level)}>この勢力で開始</button>
                  <button className="btn sm" style={{ width: "100%", marginTop: 4 }}
                    onClick={() => onPick(f.id, true, level)}>この勢力を任せて見物する</button>
                </div>
              )}
            </div>
          ))}
          <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.7, borderTop: `1px solid ${U.line2}`, paddingTop: 12, marginTop: 8 }}>
            家名を押すと詳しい様子が出ます。選ばなかった家はすべてAIが担当します。
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ 政略マップ */
function MapScreen({ g, setG, terrain, land, onSave, savedAt, onTitle }) {
  const cvRef = useRef(null), miniRef = useRef(null), wrapRef = useRef(null);
  const [view, setView] = useState(() => {
    const seat = seatOf(g.castles, g.generals, g.player);
    return seat ? { x: seat.x, y: seat.y, s: 2.4 } : { x: MAPW / 2, y: MAPH / 2, s: 0.9 };
  });
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("内政");
  const [modal, setModal] = useState(null);
  const [battle, setBattle] = useState(null);
  const [raid, setRaid] = useState(null);        // 合戦前の奇襲の献策
  const [rotate, setRotate] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");
  const [wide, setWide] = useState(false);
  const drag = useRef(null);
  // 月が変わるたびに自動で記録する
  const lastSave = useRef("");
  useEffect(() => {
    const key = `${g.year}-${g.month}`;
    if (lastSave.current === key || battle) return;
    lastSave.current = key;
    onSave(g);
  }, [g.year, g.month, battle]); // eslint-disable-line

  const pf = g.factions[g.player];
  const mine = g.castles.filter((c) => c.faction === g.player);
  const myGens = g.generals.filter((x) => x.faction === g.player);

  const draw = () => {
    const cv = cvRef.current, wrap = wrapRef.current;
    if (!cv || !wrap || !terrain) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { x: vx, y: vy, s } = view;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(terrain, -vx * s + W / 2, -vy * s + H / 2, MAPW * s, MAPH * s);
    const S = (wx, wy) => [(wx - vx) * s + W / 2, (wy - vy) * s + H / 2];

    // 版図。土地はいちばん近い城の家に属するものとして塗り分ける。
    // 境目がはっきり出るので、誰がどこを持つかが一目で分かる。
    {
      const cell = 20;
      ctx.save();
      ctx.globalAlpha = 0.19;
      const cs = g.castles.map((c) => ({ x: c.x, y: c.y, col: g.factions[c.faction].color,
        w: 1 + Math.sqrt(c.koku / 10000) * 0.34 }));
      for (let sy = 0; sy < H; sy += cell) {
        for (let sx = 0; sx < W; sx += cell) {
          const wx = (sx + cell / 2 - W / 2) / s + vx, wy = (sy + cell / 2 - H / 2) / s + vy;
          let best = null, bd = 1e9;
          for (const c of cs) {
            const d2 = Math.hypot(c.x - wx, c.y - wy) / c.w;
            if (d2 < bd) { bd = d2; best = c; }
          }
          if (!best || bd > 230) continue;         // 遠すぎる土地は誰のものでもない
          ctx.fillStyle = best.col;
          ctx.fillRect(sx, sy, cell + 1, cell + 1);
        }
      }
      ctx.restore();
    }
    // 旧国の名。盤の外の国は薄く添えるにとどめる。
    ctx.textAlign = "center";
    for (const q of KUNI_LABELS) {
      const [a, b2] = S(q.x, q.y);
      if (a < -60 || a > W + 60 || b2 < -40 || b2 > H + 40) continue;
      const sz = Math.round(clamp(15 + s * 9, 14, 30));
      ctx.font = `${sz}px 'Hiragino Mincho ProN',serif`;
      ctx.fillStyle = q.on ? `rgba(96,86,66,${clamp(0.20 + s * 0.16, 0.2, 0.42)})`
        : `rgba(140,134,120,${clamp(0.12 + s * 0.08, 0.12, 0.24)})`;
      ctx.fillText(q.name, a, b2);
    }
    // 海と湖の名
    ctx.fillStyle = `rgba(70,104,128,${clamp(0.3 + s * 0.2, 0.3, 0.6)})`;
    for (const q of SEA_LABELS) {
      const [a, b2] = S(q.x, q.y);
      if (a < -60 || a > W + 60 || b2 < -40 || b2 > H + 40) continue;
      ctx.font = `${Math.round(clamp(13 + s * 6, 12, 22))}px 'Hiragino Mincho ProN',serif`;
      ctx.fillText(q.name, a, b2);
    }
    ctx.textAlign = "left";
    if (s > 0.72) {
      ctx.font = "13px 'Hiragino Mincho ProN',serif"; ctx.fillStyle = "rgba(56,96,124,.9)";
      for (const r of RIVERS) {
        const p = r.pts[Math.floor(r.pts.length / 2)];
        const [a, b2] = S(p[0] + 8, p[1]);
        ctx.fillText(r.name, a, b2);
      }
    }
    for (const a of g.armies) {
      const n0 = nodeById(a.path[0]), n1 = a.path.length > 1 ? nodeById(a.path[1]) : n0;
      const [ax, ay] = S(n0.x + (n1.x - n0.x) * a.prog, n0.y + (n1.y - n0.y) * a.prog);
      const dst = nodeById(a.target); const [dx2, dy2] = S(dst.x, dst.y);
      const col = g.factions[a.faction].color;
      ctx.strokeStyle = col + "77"; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(dx2, dy2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ax, ay, 11, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ax, ay, 8.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "600 10px sans-serif"; ctx.fillText("軍", ax - 5, ay + 3.5);
      ctx.fillStyle = "#33332F"; ctx.font = "11px sans-serif"; ctx.fillText(`${fmt(a.men)}`, ax + 14, ay + 4);
    }
    for (const t of TOWNS) {
      const [x, y] = S(t.x, t.y);
      ctx.fillStyle = "#55524A"; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill();
      if (s > 0.6) {
        ctx.font = "12px 'Hiragino Sans',sans-serif";
        const w = ctx.measureText(t.name).width;
        ctx.fillStyle = "rgba(255,255,255,.78)"; ctx.fillRect(x - w / 2 - 3, y + 6, w + 6, 15);
        ctx.fillStyle = "#3B3A35"; ctx.fillText(t.name, x - w / 2, y + 18);
        if (s > 1.1) { ctx.fillStyle = U.dim; ctx.font = "10px sans-serif"; ctx.fillText(`（${t.kind}）`, x - 22, y + 31); }
      }
    }
    // 城。石高の大きさを丸の大きさで表し、囲まれていれば赤い環を添える。
    for (const c of g.castles) {
      const [x, y] = S(c.x, c.y);
      const col = g.factions[c.faction].color;
      const big = clamp(4.4 + Math.sqrt(c.koku / 10000) * 1.5, 4.4, 11);
      const besieged = g.sieges.some((sg) => sg.castleId === c.id);
      if (sel === c.id) {
        ctx.strokeStyle = col; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(x, y, big + 11, 0, 7); ctx.stroke();
      }
      if (besieged) {
        ctx.strokeStyle = "rgba(176,72,60,0.85)"; ctx.lineWidth = 2.4; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(x, y, big + 7, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.arc(x + 1, y + 1.5, big + 3.2, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, big + 3.0, 0, 7); ctx.fill();
      // 家紋。小さすぎると潰れるので、遠目には色の丸で示す。
      const mon = (g.factions[c.faction] || {}).mon;
      if (mon && big >= 6.5) drawMon(ctx, mon, x, y, big, col, "#fff");
      else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, big * 0.82, 0, 7); ctx.fill(); }
      // 本城には金の輪をつける
      const isSeat = g.generals.some((q) => q.at === c.id && q.faction === c.faction && q.lord && !q.captive);
      if (isSeat) {
        ctx.strokeStyle = "#C8A44A"; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(x, y, big + 4.2, 0, 7); ctx.stroke();
      }
      if (s > 0.5) {
        ctx.font = `600 ${Math.round(clamp(11 + s * 3, 11, 15))}px 'Hiragino Sans',sans-serif`;
        const w = ctx.measureText(c.name).width;
        ctx.fillStyle = "rgba(255,255,255,.88)";
        ctx.fillRect(x - w / 2 - 4, y - big - 22, w + 8, 17);
        ctx.fillStyle = "#2A2A28"; ctx.fillText(c.name, x - w / 2, y - big - 9);
      }
      if (s > 1.05) {
        const men = c.local + g.generals.filter((q) => q.at === c.id && q.faction === c.faction && !q.captive).reduce((a, q) => a + q.retinue, 0);
        ctx.font = "11px sans-serif"; ctx.fillStyle = col;
        ctx.fillText(`${fmt(men)}`, x + big + 5, y + 12);
      }
    }
    const mv = miniRef.current;
    if (mv) {
      const mc = mv.getContext("2d");
      if (mv.width !== 130) { mv.width = 130; mv.height = 139; }
      mc.clearRect(0, 0, 130, 139);
      mc.drawImage(terrain, 0, 0, MAPW, MAPH, 0, 0, 130, 139);
      const k = 130 / MAPW;
      mc.strokeStyle = "#fff"; mc.lineWidth = 2;
      mc.strokeRect((vx - W / 2 / s) * k, (vy - H / 2 / s) * k, (W / s) * k, (H / s) * k);
    }
  };
  useEffect(draw);
  useEffect(() => {
    const on = () => draw();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  });
  // 地図のドラッグが端末のスクロールや引っ張り更新に伝わらないようにする
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const block = (e) => { if (e.target === cvRef.current) e.preventDefault(); };
    el.addEventListener("touchmove", block, { passive: false });
    el.addEventListener("touchstart", block, { passive: false });
    return () => { el.removeEventListener("touchmove", block); el.removeEventListener("touchstart", block); };
  }, []);

  // 地図の操作は、地図そのもの（canvas）を触ったときだけ受け付ける。
  // シートやボタンの押下が地図に伝わって選択が解除されるのを防ぐ。
  const onDown = (e) => {
    if (e.target !== cvRef.current) { drag.current = null; return; }
    // 二本指なら拡げ縮め。地図に指を二本置いたときの当然の振る舞いである。
    if (e.touches && e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const r = wrapRef.current.getBoundingClientRect();
      const mx = (t1.clientX + t2.clientX) / 2 - r.left - r.width / 2;
      const my = (t1.clientY + t2.clientY) / 2 - r.top - r.height / 2;
      drag.current = {
        pinch: true, moved: 99,
        d0: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
        s0: view.s, vx: view.x, vy: view.y,
        wx: mx / view.s + view.x, wy: my / view.s + view.y,   // 指の間にある土地
      };
      return;
    }
    const p = e.touches ? e.touches[0] : e;
    drag.current = { x: p.clientX, y: p.clientY, vx: view.x, vy: view.y, moved: 0 };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (d.pinch) {
      if (!e.touches || e.touches.length < 2) return;
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dd = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (!d.d0 || !dd) return;
      const r = wrapRef.current.getBoundingClientRect();
      const mx = (t1.clientX + t2.clientX) / 2 - r.left - r.width / 2;
      const my = (t1.clientY + t2.clientY) / 2 - r.top - r.height / 2;
      const ns = clamp(d.s0 * (dd / d.d0), 0.28, 3.2);
      // 指の間にある土地が動かないように、見ている中心をずらす
      setView(() => ({ x: d.wx - mx / ns, y: d.wy - my / ns, s: ns }));
      return;
    }
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - d.x, dy = p.clientY - d.y;
    d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    // 値は先に控える。setView の中で drag.current を見ると、
    // 指を離した後に評価されて null になることがある。
    const vx = d.vx, vy = d.vy;
    setView((v) => ({ ...v, x: vx - dx / v.s, y: vy - dy / v.s }));
  };
  const onUp = (e) => {
    const d = drag.current; drag.current = null;
    if (!d || d.moved > 6 || e.target !== cvRef.current) return;
    const wrap = wrapRef.current, r = wrap.getBoundingClientRect();
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const wx = (p.clientX - r.left - r.width / 2) / view.s + view.x;
    const wy = (p.clientY - r.top - r.height / 2) / view.s + view.y;
    let hit = null, best = 26 / view.s;
    for (const c of g.castles) { const dd = Math.hypot(c.x - wx, c.y - wy); if (dd < best) { best = dd; hit = c.id; } }
    if (hit) { setSel(hit); setTab("内政"); } else setSel(null);
  };
  const zoom = (k) => setView((v) => ({ ...v, s: clamp(v.s * k, 0.28, 3.2) }));
  const focus = (id) => { const n = nodeById(id); if (n) setView((v) => ({ ...v, x: n.x, y: n.y, s: Math.max(1.2, v.s) })); };
  const whole = () => setView({ x: MAPW / 2, y: MAPH / 2, s: 0.30 });

  /* ---------------------------------------------------------- 政務 */
  const runCommand = (castleId, cmd, genId) => {
    setG((prev) => {
      const s = structuredClone(prev);
      const c = s.castles.find((x) => x.id === castleId);
      if (c && s.sieges.some((sg) => sg.castleId === c.id)) {
        s.msg = `${c.name}は囲まれている。城を出て事を行うことはできない。`;
        return s;
      }
      const gen = s.generals.find((x) => x.id === genId);
      const f = s.factions[c.faction];
      const lines = [];
      const rec = (label, before, after, unit = "") => lines.push({ label, before, after, unit });
      // 金がなければ何も命じられぬ。無い袖は振れぬ。
      const COST_OF = { 開墾: 140, 治水: 180, 商業: 160, 築城: 200, 訓練: 120, 徴募: 100 };
      if (f.gold < (COST_OF[cmd] || 140)) {
        s.msg = `金が足りぬ。${cmd}には${COST_OF[cmd] || 140}貫が要る（手元${fmt(Math.max(0, f.gold))}貫）。`;
        return s;
      }
      let cost = 0;
      if (cmd === "開墾") {
        cost = 140;
        const room = c.kokuMax - c.koku;
        const labor = Math.min(1, c.pop / (c.kokuMax * 0.9));
        const gain = Math.min(room, Math.round(room * 0.16 * (0.5 + gen.gov / 100) * labor));
        rec("現在石高", c.koku, c.koku + gain, "石"); c.koku += gain;
      } else if (cmd === "治水") {
        cost = 180;
        // 上限の伸びは城の大きさに応じる。重ねれば伸び続けるが、伸びは次第に鈍る。
        // 国の検地に定まった限りを超えて田は増えない
        const cap = c.kokuCap || c.kokuMax;
        const room = Math.max(0, cap - c.kokuMax);
        const d = Math.min(room, Math.round(c.kokuMax * 0.035 * (0.5 + gen.gov / 100)));
        rec("最大石高", c.kokuMax, c.kokuMax + d, "石"); c.kokuMax += d;
        if (room <= 0) rec("この地の限り", cap, cap, "石（これ以上は開けぬ）");
        rec("民忠", Math.round(c.min), Math.min(100, Math.round(c.min) + 2)); c.min = Math.min(100, c.min + 2);
      } else if (cmd === "商業") {
        cost = 160;
        const d = Math.round(3 * (0.5 + gen.gov / 100));
        rec("商業", Math.round(c.comm), Math.min(100, Math.round(c.comm) + d)); c.comm = Math.min(100, c.comm + d);
      } else if (cmd === "築城") {
        cost = 240;
        const d = Math.round(3 * (0.5 + gen.gov / 100));
        rec("城防", Math.round(c.def), Math.min(100, Math.round(c.def) + d)); c.def = Math.min(100, c.def + d);
        rec("耐久", c.hp, c.hp + 200); c.hp += 200;
      } else if (cmd === "訓練") {
        cost = 110;
        const d = Math.round(4 * (0.4 + gen.lead / 100));
        rec("地域家臣団 練度", Math.round(c.localTrain), Math.min(100, Math.round(c.localTrain) + d));
        c.localTrain = Math.min(100, c.localTrain + d);
        for (const x of s.generals.filter((q) => q.at === c.id && q.faction === c.faction)) x.retTrain = Math.min(100, x.retTrain + Math.round(d * 0.7));
        rec("直属家臣団 練度（在城）", gen.retTrain - Math.round(d * 0.7), gen.retTrain);
      } else if (cmd === "徴募") {
        const cap = troopCap(c, f.mobilization, g || s);
        const cur = c.local + s.generals.filter((x) => x.at === c.id && x.faction === c.faction).reduce((a, x) => a + x.retinue, 0);
        const n = Math.max(0, Math.min(cap - cur, Math.floor((f.gold - 60) / 0.45), Math.floor(c.pop * 0.012)));
        cost = Math.round(n * 0.45);
        rec("地域家臣団", c.local, c.local + n, "人");
        rec("軍役余力", Math.max(0, cap - cur), Math.max(0, cap - cur - n), "人");
        const old = c.local; c.local += n;
        rosterSync(c, "rost", c.local, `loc-${c.id}`);   // 新兵を組に入れる
        c.localTrain = Math.round((c.localTrain * old + 30 * n) / Math.max(1, c.local));
        c.pop -= Math.round(n * 0.2);
      } else if (cmd === "調略") {
        cost = 220;
        const target = s.castles.filter((x) => x.faction !== c.faction)
          .sort((a, z) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(z.x - c.x, z.y - c.y))[0];
        if (target) {
          const eff = Math.round(4 * (0.4 + gen.wit / 100));
          rec(`${target.name} 民忠`, Math.round(target.min), Math.max(0, Math.round(target.min) - eff));
          target.min = Math.max(0, target.min - eff);
          rec(`${target.name} 城防`, Math.round(target.def), Math.max(0, Math.round(target.def) - Math.round(eff / 2)));
          target.def = Math.max(0, target.def - Math.round(eff / 2));
        }
      }
      if (f.gold < cost) {
        s.msg = `金が足りぬ。${cmd}には${fmt(cost)}貫が要る（手元${fmt(Math.max(0, f.gold))}貫）。`;
        return prev;                             // 何も起こさずに戻す
      }
      f.gold -= cost;
      s.ledger = [{ cmd, cost, lines, castle: c.name, general: gen.name }, ...s.ledger].slice(0, 6);
      s.orders[genId] = { cmd, castleId };      // 働いたのは武将である

      return s;
    });
  };

  const appoint = (castleId, genId) => setG((prev) => {
    const s = structuredClone(prev);
    const c = s.castles.find((x) => x.id === castleId);
    if (c.lordId && c.lordId !== genId) c.najimi = 25;   // 城主が代われば馴染は低い状態から始まる
    c.lordId = genId;
    s.chronicle.push({ y: s.year, m: s.month, text: `${s.generals.find((x) => x.id === genId).name}を${c.name}の城主に任じた。` });
    return s;
  });

  // 外交（GDD 11.1）。約束の残り期間はゲーム上の情報として保持する。
  // 検地（GDD 4.6）。一国を丸ごと押さえてはじめて竿を入れられる。
  const doKenchi = (kuni, genId) => setG((prev) => {
    const s = structuredClone(prev);
    const f = s.factions[s.player];
    if (!holdsProvince(s, s.player, kuni)) { s.msg = `${kuni}にはまだ他家の城が残っている。`; return s; }
    if (kenchiDone(s, kuni)) { s.msg = `${kuni}にはすでに竿が入っている。`; return s; }
    const cost = kenchiCost(s, kuni);
    if (f.gold < cost.gold) { s.msg = `検地には金${fmt(cost.gold)}貫が要る。`; return s; }
    const gen = s.generals.find((x) => x.id === genId);
    if (!gen) return s;
    f.gold -= cost.gold;
    s.orders[genId] = { cmd: `${kuni}検地`, castleId: gen.at };
    const r = runKenchi(s, s.player, kuni, gen.gov);
    s.chronicle.push({ y: s.year, m: s.month,
      text: `${f.name}が${kuni}に竿を入れた。石高が${fmt(r.before)}石より${fmt(r.after)}石に改まった。` });
    s.msg = `${kuni}の検地が成った。石高${fmt(r.gain)}石の増、限りも伸びた。民忠は下がっている。`;
    s.ledger = [{ cmd: `${kuni}検地`, cost: cost.gold, castle: kuni, general: gen.name,
      lines: r.cs.map((c) => ({ label: `${c.name} 石高`, before: 0, after: c.koku, unit: "石" })) }, ...s.ledger].slice(0, 6);
    return s;
  });

  // 戦後の始末（GDD 12.4）。捕らえた将をどう遇するか。
  const settleCaptive = (genId, kind) => setG((prev) => {
    const s = structuredClone(prev);
    const g2 = s.generals.find((x) => x.id === genId);
    if (!g2 || !g2.captive) return s;
    const f = s.factions[s.player];
    if (kind === "切腹") {
      s.generals = s.generals.filter((x) => x.id !== g2.id);
      s.chronicle.push({ y: s.year, m: s.month, text: `${g2.name}は切腹して果てた。` });
      s.msg = `${g2.name}に腹を切らせた。`;
    } else if (kind === "扶持") {
      if (g2.fed) { s.msg = "この者への扶持は、本月すでに済んでいる。"; return s; }
      // 器量に応じた扶持。惜しめば心は開かぬ。
      const cost = Math.round(120 + (g2.lead + g2.gov + g2.wit) * 1.4);
      const food = Math.round(60 + g2.retinue * 0.4);
      const home = s.castles.find((c2) => c2.id === g2.at);
      if (f.gold < cost || !home || home.food < food) {
        s.msg = `扶持には金${fmt(cost)}貫と兵糧${fmt(food)}が要る。足りぬ。`;
        return s;
      }
      f.gold -= cost; home.food -= food;
      g2.fed = true;
      g2.warLoyal = clamp((g2.warLoyal || 0) + 4, 0, 100);
      s.msg = `${g2.name}に扶持を与えた（忠誠${g2.warLoyal}）。`;
    } else if (kind === "登用") {
      if ((g2.warLoyal || 0) < 50) { s.msg = "まだ心を開いておらぬ。"; return s; }
      const from = g2.captive.from;
      g2.faction = s.player;
      g2.loyal = clamp(g2.warLoyal, 0, 100);
      g2.captive = null; g2.warLoyal = undefined; g2.lord = false;
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${g2.name}が${f.name}に仕えた（旧${(s.factions[from] || {}).name || ""}・忠誠${Math.round(g2.loyal)}）。` });
      s.msg = `${g2.name}を召し抱えた。忠誠${Math.round(g2.loyal)}。`;
    }
    return s;
  });

  // 隠居（GDD 6.3）。生きているうちに家督を譲れば、家中は揺れない。
  const doRetire = (heirId) => setG((prev) => {
    const s = structuredClone(prev);
    const lord = s.generals.find((x) => x.faction === s.player && x.lord && !x.captive);
    if (!lord) return s;
    const heir = s.generals.find((x) => x.id === heirId);
    if (!heir || heir.id === lord.id) return s;
    lord.lord = false;
    lord.retired = true;
    lord.loyal = 100;                      // 先代が家を裏切ることはない
    succeed(s, lord, "隠居した", heir.id, true);
    lord.retinue = Math.max(60, Math.round(lord.retinue * 0.55));
    s.msg = `${lord.name}は隠居し、${heir.name}が家督を継いだ。家中の動揺はほとんどない。`;
    return s;
  });
  // 捕虜の処遇（GDD 12.3）。外交の「捕虜」から選ぶ。
  const doCaptive = (genId, how) => setG((prev) => {
    const s = structuredClone(prev);
    const q = s.generals.find((x) => x.id === genId);
    if (!q || !q.captive) return s;
    const log = (t) => s.chronicle.push({ y: s.year, m: s.month, text: t });
    const loy = q.loyal == null ? 60 : q.loyal;
    if (how === "登用") {
      if (loy > 40) return s;                       // 忠誠が下がるまで降らぬ
      q.faction = s.player; q.captive = null;
      q.loyal = clamp(45 + Math.random() * 15, 0, 100);
      q.retinue = Math.round(140 + Math.random() * 120);
      log(`${q.name}が降り、${s.factions[s.player].name}に属した。`);
    } else if (how === "逃す") {
      const home = s.castles.find((c) => c.faction === q.captive.from) || s.castles[0];
      const rel = s.relations[relKey(s.player, q.captive.from)];
      if (rel) rel.trust = clamp(rel.trust + 6, 0, 100);   // 情けは信用を生む
      q.captive = null; q.at = home.id; q.retinue = Math.round(180 + Math.random() * 120);
      q.loyal = clamp(loy + 6, 0, 100);
      log(`${q.name}を放った。${home.name}へ帰った。`);
    } else if (how === "斬首") {
      const rel = s.relations[relKey(s.player, q.captive.from)];
      if (rel) rel.trust = clamp(rel.trust - 14, 0, 100);  // 恨みを買う
      s.generals = s.generals.filter((x) => x.id !== q.id);
      log(`${q.name}を斬った。`);
    } else if (how === "身代金") {
      const cost = ransomCost(s, q);
      const from = s.factions[q.captive.from];
      if (ransomAccept(s, q)) {
        const paid = payRansom(s, q);
        const rel = s.relations[relKey(s.player, cost.payer)];
        if (rel) rel.trust = clamp(rel.trust + 4, 0, 100);
        log(`${from.name}が身代金を納め、${q.name}を引き取った（金${fmt(paid.gold)}貫・兵糧${fmt(paid.food)}石）。`);
        s.msg = `${from.name}は身代金に応じた。金${fmt(paid.gold)}貫と兵糧${fmt(paid.food)}石を得た。`;
      } else {
        const rel = s.relations[relKey(s.player, cost.payer)];
        if (rel) rel.trust = clamp(rel.trust - 3, 0, 100);
        log(`${from.name}は${q.name}の身代金を断った。`);
        s.msg = `${from.name}は身代金に応じなかった（求めた額：金${fmt(cost.gold)}貫・兵糧${fmt(cost.food)}石）。`;
      }
    }
    return s;
  });
  const doDiplo = (fid, key) => setG((prev) => {
    const s = structuredClone(prev);
    const me = s.factions[s.player], you = s.factions[fid];
    const r = s.relations[relKey(s.player, fid)];
    const def = DIPLO.find((d) => d.key === key);
    const stat = (id) => ({
      koku: s.castles.filter((c) => c.faction === id).reduce((a, c) => a + c.koku, 0),
      diplo: rankBonus(s, id).diplo,          // 官位があれば交渉が通りやすい
    });
    if (!def || !def.need(r, stat(s.player), stat(fid)) || me.gold < def.cost) return s;
    me.gold -= def.cost;
    if (key === "親善") { r.trust = clamp(r.trust + 9, 0, 100); }
    else if (key === "独立") {
      // 膝を屈していた家が旗を翻す。信義を捨てるのだから、代償は大きい。
      r.state = "敵対";
      r.until = null;
      r.trust = clamp(r.trust - 45, 0, 100);
      me.prestige = clamp((me.prestige || 50) - 12, 0, 100);
      for (const x of s.generals.filter((q) => q.faction === s.player && !q.captive)) {
        if (x.loyal != null) x.loyal = clamp(x.loyal - 6, 0, 100);
      }
      // 他家からも信を失う
      for (const k of Object.keys(s.relations)) {
        if (!k.includes(s.player)) continue;
        const r2 = s.relations[k];
        if (r2 !== r) r2.trust = clamp(r2.trust - 8, 0, 100);
      }
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${me.name}が${you.name}への従属を破り、独立を宣した。諸家の信を損ねた。` });
      s.msg = `${you.name}への従属を破った。以後は敵対である。家中の忠誠も揺れている。`;
    }
    else {
      r.state = key;
      r.until = def.months ? { y: s.year + Math.floor((s.month + def.months - 1) / 12), m: ((s.month + def.months - 1) % 12) + 1 } : null;
      r.trust = clamp(r.trust + 5, 0, 100);
      s.chronicle.push({ y: s.year, m: s.month, text: `${you.name}と${key}が成った。` });
    }
    s.ledger = [{ cmd: `外交・${key}`, cost: def.cost, castle: you.name, general: "使者",
      lines: [{ label: `${you.name} 信用`, before: Math.round(r.trust - (key === "親善" ? 9 : 5)), after: Math.round(r.trust), unit: "" }] }, ...s.ledger].slice(0, 6);
    return s;
  });

  // 調略（GDD 11.2）。接触から成立・拒否・露見まで数か月かかる。
  const doPlot = (castleId, type, genId) => setG((prev) => {
    const s = structuredClone(prev);
    const def = PLOTS.find((x) => x.key === type);
    const f = s.factions[s.player];
    if (!def || f.gold < def.cost) { s.msg = "金が足りぬ。"; return s; }
    const target = s.castles.find((x) => x.id === castleId);
    if (!target) return s;
    f.gold -= def.cost;
    s.plots.push({ type, castleId, genId, faction: s.player, monthsLeft: def.months });
    s.orders[genId] = { cmd: `調略・${type}`, castleId };   // 調略も月の務めである
    s.ledger = [{ cmd: `調略・${type}`, cost: def.cost, castle: target ? target.name : "", general: s.generals.find((x) => x.id === genId).name,
      lines: [{ label: "成否判明まで", before: 0, after: def.months, unit: "か月" }] }, ...s.ledger].slice(0, 6);
    return s;
  });

  // 特殊勢力（GDD 11.3）
  const doSpecial = (townId, key) => setG((prev) => {
    const s = structuredClone(prev);
    const t = TOWNS.find((x) => x.id === townId);
    const st = s.specials[townId];
    const o = (SPECIAL_OPTIONS[t.kind] || []).find((x) => x.key === key);
    const f = s.factions[s.player];
    if (!o || f.gold < (o.cost || 0)) return s;
    f.gold -= o.cost || 0;
    if (o.once) f.gold += o.once;
    st.state = key; st.faction = s.player; st.months = 0;
    st.anger = clamp((st.anger || 0) + (o.anger || 0) * 10, 0, 100);
    const lines = [{ text: `${t.name}との関係：中立 → ${key}　${o.desc}` }];
    if (o.once) lines.push({ label: "金銭", before: f.gold - o.once, after: f.gold, unit: "貫" });
    if (o.troops) {
      const near = s.castles.filter((c) => c.faction === s.player)
        .sort((a, b) => Math.hypot(a.x - px(t.lon), a.y - py(t.lat)) - Math.hypot(b.x - px(t.lon), b.y - py(t.lat)))[0];
      if (near) { lines.push({ label: `${near.name} 地域家臣団`, before: near.local, after: near.local + o.troops, unit: "人" }); near.local += o.troops; }
    }
    if (o.prestige) lines.push({ label: "威信", before: Math.round(f.prestige), after: Math.round(clamp(f.prestige + o.prestige * 10, 0, 100)), unit: "" });
    if (o.prestige) f.prestige = clamp(f.prestige + o.prestige * 10, 0, 100);
    if (key === "攻撃") for (const c of s.castles.filter((x) => x.faction === s.player)) c.min = Math.max(0, c.min - 8);
    s.ledger = [{ cmd: `特殊勢力・${key}`, cost: o.cost || 0, castle: t.name, general: "―", lines }, ...s.ledger].slice(0, 6);
    s.chronicle.push({ y: s.year, m: s.month, text: `${t.name}との関係を「${key}」とした。` });
    return s;
  });

  // 人事・褒賞（GDD 4.2 / 12.1）
  // 知行を与える／減らす（GDD 6.1）
  const grantFief = (genId, delta) => setG((prev) => {
    const s = structuredClone(prev);
    const gen = s.generals.find((x) => x.id === genId);
    if (!gen || gen.captive) return s;
    const room = fiefRoom(s, s.player);
    const d = delta > 0 ? Math.min(delta, room.left) : Math.max(delta, -fiefOf(gen));
    if (!d) return s;
    const before = fiefOf(gen);
    gen.fief = before + d;
    if (d < 0) gen.loyal = clamp((gen.loyal == null ? 60 : gen.loyal) - 4, 0, 100);
    s.ledger = [{ cmd: "知行", cost: 0, castle: "―", general: gen.name, lines: [
      { label: `${gen.name} 知行`, before, after: gen.fief, unit: "石" },
      { label: "配れる余地", before: room.left, after: room.left - d, unit: "石" }] }, ...s.ledger].slice(0, 6);
    return s;
  });
  const reward = (genId) => setG((prev) => {
    const s = structuredClone(prev);
    const f = s.factions[s.player];
    if (f.gold < 300) return s;
    const gen = s.generals.find((x) => x.id === genId);
    f.gold -= 300;
    const before = gen.loyal, beforeU = gen.unity;
    gen.loyal = Math.min(100, gen.loyal + 8);
    gen.unity = Math.min(100, gen.unity + 4);
    s.ledger = [{ cmd: "人事・褒賞", cost: 300, castle: "―", general: gen.name, lines: [
      { label: `${gen.name} 忠誠`, before, after: gen.loyal, unit: "" },
      { label: `${gen.name} 直属の結束`, before: beforeU, after: gen.unity, unit: "" }] }, ...s.ledger].slice(0, 6);
    return s;
  });

  const nextMonth = () => {
    setG((prev) => {
      const s = structuredClone(prev);
      const events = [];
      // その月の空模様。梅雨と冬は降りやすい。合戦の奇襲はこれに左右される。
      {
        const mo = s.month;
        const wet = [6, 7].includes(mo) ? 0.42 : [12, 1, 2].includes(mo) ? 0.34 : [9, 10].includes(mo) ? 0.30 : 0.20;
        const r2 = Math.random();
        s.weather = r2 < wet ? ([12, 1, 2].includes(mo) ? "雪" : "雨")
          : r2 < wet + 0.28 ? "曇" : "晴";
      }
      // 試走（見物）のときは自家もAIに任せる
      const auto = (fid) => fid !== s.player || !!s.autoPlay;
      // 前月比を出すための記録（GDD 4.4）
      s.prev = {};
      for (const c of s.castles) {
        s.prev[c.id] = { koku: c.koku, pop: c.pop, food: c.food, min: c.min, localTrain: c.localTrain,
          men: c.local + s.generals.filter((x) => x.at === c.id && x.faction === c.faction).reduce((a, x) => a + x.retinue, 0) };
      }
      s.prevGold = s.factions[s.player].gold;
      for (const fid of Object.keys(s.factions)) {
        const f = s.factions[fid];
        let gold = 0;
        for (const c of s.castles.filter((x) => x.faction === fid)) {
          // 囲まれた城は封鎖される。年貢も商いも入らず、蓄えを食い潰すだけになる。
          const besieged = s.sieges.some((sg) => sg.castleId === c.id);
          if (besieged) {
            const ret2 = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive).reduce((a, x) => a + x.retinue, 0);
            const up2 = MOB_POLICY[f.mobilization].upkeep;
            c.food -= Math.round((c.local + ret2) * 0.08 * up2);
            if (c.food < 0) {
              c.food = 0; c.min = Math.max(0, c.min - 6); c.localTrain = Math.max(20, c.localTrain - 3);
              const lost2 = Math.round(c.local * 0.05); c.local -= lost2;
              if (fid === s.player) events.push(`${c.name}は囲まれ、兵糧が尽きて${fmt(lost2)}人が脱走した。`);
            }
            c.min = Math.max(0, c.min - 1.2);
            continue;                                   // 収入も人口の増えも開墾もない
          }
          const harvest = [9, 10, 11].includes(s.month) ? 3 : 1;
          const ret = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive).reduce((a, x) => a + x.retinue, 0);
          const troops = c.local + ret;
          const up = MOB_POLICY[f.mobilization].upkeep;
          c.food += Math.round((c.koku / 12) * 0.5 * harvest * (c.min / 80)) - Math.round(troops * 0.08 * up);
          // 兵は養うものである。扶持が軽すぎると、金が余り、兵を抱える判断が生まれない。
          gold += (c.comm * 4 + c.koku * 0.003) * (fid === s.player ? lv(s).tribute : 1) - troops * 0.075 * up;
          if (c.food < 0) {
            c.food = 0; c.min = Math.max(0, c.min - 4); c.localTrain = Math.max(20, c.localTrain - 3);
            const lost = Math.round(c.local * 0.04); c.local -= lost;
            if (fid === s.player) events.push(`${c.name}で兵糧が尽き、${fmt(lost)}人が脱走した。`);
          }
          c.pop = Math.round(c.pop * (1 + 0.0012 * (c.min / 80)));
          if (c.koku < c.kokuMax) c.koku = Math.min(c.kokuMax, c.koku + Math.round(c.kokuMax * 0.0015));
          // 国を丸ごと押さえてこそ民は落ち着く。飛び地は治まらぬ（GDD 12.5）
          // 国を丸ごと押さえてこそ民は落ち着く。飛び地は治まりの水準が低い（GDD 12.5）
          const grip = provinceGrip(s, fid, c.kuni);
          const rest = 42 + grip * 46;                 // 落ち着く先。丸ごとなら88、半ばなら65
          const gap = rest - c.min;
          const settle = clamp(gap * 0.05, -0.9, 0.7);
          c.min = clamp(c.min + settle + specialBonus(s, fid, "min"), 0, 100);
          c.comm = clamp(c.comm + specialBonus(s, fid, "comm"), 0, 100);
          // 城主が代わると地域家臣団の馴染は低い状態から始まり、徐々に育つ（GDD 6.2 / 9.5）
          c.najimi = clamp((c.najimi == null ? 70 : c.najimi) + 1.4, 0, 100);
        }
        gold += specialBonus(s, fid, "gold") - specialBonus(s, fid, "upkeep");
        f.prestige = clamp((f.prestige || 50) + specialBonus(s, fid, "prestige"), 0, 100);
        f.gold = Math.round(f.gold + gold);
      }
      // 外交の残り期間（GDD 11.1）
      for (const k of Object.keys(s.relations)) {
        const r = s.relations[k];
        if (r.until && monthsBetween(s.year, s.month, r.until.y, r.until.m) <= 0) {
          r.until = null; r.state = "中立";
          if (k.includes(s.player)) events.push(`${k.split("|").filter((x) => x !== s.player).map((x) => s.factions[x].name)}との約束の期限が切れた。`);
        }
        r.trust = clamp(r.trust + 0.4, 0, 100);
      }
      // 調略の進行と成否（GDD 11.2：即時成功にしない）
      const plotBonus = specialBonus(s, s.player, "plot");
      s.plots = s.plots.filter((pl) => {
        pl.monthsLeft--;
        if (pl.monthsLeft > 0) return true;
        const target = s.castles.find((x) => x.id === pl.castleId);
        const gen = s.generals.find((x) => x.id === pl.genId);
        if (!target || !gen) return false;
        // 知略が事の難しさを上回るほど確かに成る（GDD 11.2）。
        // 定めの知略に達していれば、民忠の並みの城には必ず通じる。
        const def2 = PLOTS.find((x) => x.key === pl.type) || { need: 85, hard: 1 };
        const skill = gen.wit + (pl.faction === s.player ? plotBonus * 100 : 0);
        // 民忠が並み（70）なら定めの知略でちょうど確実に成る。堅い城ほど余分に要る。
        const need2 = def2.need + (target.min - 70) * def2.hard * 0.42
          + (target.faction === s.player ? 8 : 0);
        // 定めに届けばその事の天井まで届く。ただし天井は一を超えぬ。
        // どれほどの知略でも、しくじる目は残る。
        const cap2 = def2.cap == null ? 0.85 : def2.cap;
        const gap = skill - need2;
        const base = gap >= 0
          ? Math.min(cap2 + Math.max(0, gap) * 0.002, cap2 + 0.04)   // 余れば僅かに上がる
          : clamp(cap2 + gap * def2.hard * 0.055, 0.03, cap2);
        const roll = Math.random();
        // 自勢力の報せは月次報告に載せ、末尾で戦国記へ一度だけ記録する
        const say = (t) => { if (pl.faction === s.player) events.push(t); else s.chronicle.push({ y: s.year, m: s.month, text: t }); };
        if (roll > base + (1 - base) * 0.55) {      // 露見（しくじりのうち半ばは露見する）
          const rel = s.relations[relKey(pl.faction, target.faction)];
          if (rel) rel.trust = clamp(rel.trust - 12, 0, 100);
          say(`${target.name}への${pl.type}が露見した。`);
          return false;
        }
        if (roll > base) { say(`${target.name}への${pl.type}は不調に終わった。`); return false; }
        if (pl.type === "内応") {
          // 城主の心が離れていなければ通じない。城ごと寝返らせる。
          const lordOf = s.generals.filter((x) => x.at === target.id && x.faction === target.faction && !x.captive)
            .sort((a, b) => (a.loyal || 60) - (b.loyal || 60))[0];
          const loy = lordOf ? (lordOf.loyal == null ? 60 : lordOf.loyal) : 100;
          const wit2 = gen.wit;
          const chance = clamp((72 - loy) / 90 + (wit2 - 60) / 260, 0, 0.85);
          if (!lordOf || loy > 72 || Math.random() > chance) {
            say(`${target.name}の${lordOf ? lordOf.name : "城方"}は内応に応じなかった。`);
            const rel2 = s.relations[relKey(pl.faction, target.faction)];
            if (rel2) rel2.trust = clamp(rel2.trust - 8, 0, 100);
            return false;
          }
          // 城ごと寝返る。兵も地域家臣団もそのまま移る。
          const oldF = target.faction;
          target.faction = pl.faction;
          target.najimi = 42;                       // 新しい主に馴染むには時が要る
          target.min = Math.max(0, target.min - 8);
          for (const x of s.generals.filter((q) => q.at === target.id && q.faction === oldF && !q.captive)) {
            if (x === lordOf || Math.random() < 0.55) { x.faction = pl.faction; x.loyal = clamp(48 + Math.random() * 18, 0, 100); }
            else {
              const ref = s.castles.find((c2) => c2.faction === oldF && c2.id !== target.id);
              if (ref) x.at = ref.id; else s.generals = s.generals.filter((q) => q.id !== x.id);
            }
          }
          const rel3 = s.relations[relKey(pl.faction, oldF)];
          if (rel3) rel3.trust = clamp(rel3.trust - 20, 0, 100);
          say(`${lordOf.name}が内応し、${target.name}は戦わずして${s.factions[pl.faction].name}のものとなった。`);
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${target.name}城主${lordOf.name}が内応。城は${s.factions[pl.faction].name}に渡った（旧主：${s.factions[oldF].name}）。` });
          // 内応で最後の城が移れば、その家は滅ぶ（GDD 12.4）
          if (!s.castles.some((c2) => c2.faction === oldF)) {
            for (const a2 of s.armies.filter((x) => x.faction === oldF)) {
              for (const gid of a2.gens) {
                const x = s.generals.find((q) => q.id === gid);
                if (x) x.at = target.id;
              }
            }
            s.armies = s.armies.filter((x) => x.faction !== oldF);
            s.sieges = s.sieges.filter((x) => s.armies.some((a3) => a3.id === x.armyId));
            s.campaigns = (s.campaigns || []).filter((x) => x.faction !== oldF);
            for (const q of s.generals.filter((x) => x.faction === oldF && x.captive && x.captive.by === pl.faction)) q.captive = null;
            const { lord: rl, retainers: rr } = ruinedHouse(s, oldF);
            if (pl.faction === s.player && (rl || rr.length)) {
              s.warSettle = { faction: oldF, winner: pl.faction, castleId: target.id,
                lordId: rl ? rl.id : null,
                queue: [...(rl ? [rl.id] : []), ...rr.map((x) => x.id)] };
            } else {
              for (const g2 of [rl, ...rr].filter(Boolean)) {
                if (Math.random() < 0.4) s.generals = s.generals.filter((x) => x.id !== g2.id);
                else takeAsPrisoner(s, g2, pl.faction, target.id);
              }
              s.chronicle.push({ y: s.year, m: s.month,
                text: `${s.factions[oldF].name}は最後の城を失い、滅亡した。` });
            }
            s.ruined = [...(s.ruined || []), oldF];
          }
          return false;
        }
        if (pl.type === "偵察") { s.intel[target.id] = { y: s.year, m: s.month }; say(`${target.name}の内情を掴んだ。`); }
        else if (pl.type === "流言") {
          target.min = Math.max(0, target.min - 9);
          for (const x of s.generals.filter((q) => q.at === target.id)) x.loyal = Math.max(0, x.loyal - 6);
          say(`${target.name}に流言が広がり、民忠と忠誠が下がった。`);
        } else if (pl.type === "城工作") {
          const ways = ["櫓への放火", "兵糧庫の破壊", "城門の閂を折る", "井戸への投げ込み", "堀の水を落とす"];
          const w = ways[Math.floor(Math.random() * ways.length)];
          target.def = Math.max(0, target.def - 6);
          target.food = Math.round(target.food * (w === "兵糧庫の破壊" ? 0.7 : 0.88));
          target.min = Math.max(0, target.min - 4);
          if (w === "井戸への投げ込み") target.well = Math.max(0, (target.well == null ? 100 : target.well) - 34);
          if (w === "堀の水を落とす") target.def = Math.max(0, target.def - 4);
          say(`${target.name}で城工作が成った（${w}）。城の備えが落ちた。`);
        } else if (pl.type === "密約") {
          target.intrigue = true;
          say(`${target.name}の内応者と密約が成った。攻め寄せた時に効く。`);
        } else if (pl.type === "引き抜き") {
          const cand = s.generals.filter((x) => x.at === target.id && x.faction === target.faction && !x.lord)
            .sort((a, b) => a.loyal - b.loyal)[0];
          if (cand && cand.loyal < 70) {
            cand.faction = pl.faction; cand.loyal = 60;
            const home = s.castles.find((x) => x.faction === pl.faction);
            cand.at = home ? home.id : cand.at;
            say(`${cand.name}が${s.factions[pl.faction].name}へ寝返った。`);
          } else say(`${target.name}の武将は誘いに応じなかった。`);
        }
        return false;
      });
      for (const fid of Object.keys(s.factions)) {
        if (fid === s.player) continue;
        const f = s.factions[fid];
        for (const c of s.castles.filter((x) => x.faction === fid)) {
          const gen = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive).sort((a, b) => b.gov - a.gov)[0];
          if (!gen || f.gold < 260) continue;
          const cap = troopCap(c, f.mobilization, g || s);
          const cur = c.local + s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive).reduce((a, x) => a + x.retinue, 0);
          if (cur < cap * 0.8 && f.gold > 900) {
            const n = Math.min(Math.round((cap - cur) * 0.35), Math.floor((f.gold - 400) / 0.45), Math.floor(c.pop * 0.012));
            if (n > 0) { c.local += n; f.gold -= Math.round(n * 0.45); c.pop -= Math.round(n * 0.2);
              rosterSync(c, "rost", c.local, `loc-${c.id}`); }
          } else if (c.koku < c.kokuMax * 0.92) {
            c.koku = Math.min(c.kokuMax, c.koku + Math.round((c.kokuMax - c.koku) * 0.06 * (0.5 + gen.gov / 100)));
            f.gold -= 140;
          } else { c.def = Math.min(100, c.def + 2); f.gold -= 220; }
        }
      }
      const arrivals = [];
      for (const a of s.armies) {
        let budget = MARCH_PER_MONTH * (a.food > 0 ? 1 : 0.5);
        while (budget > 0 && a.path.length > 1) {
          const r = roadBetween(a.path[0], a.path[1]);
          const need = (r ? r[2] : 10) / ROAD_SPEED[r ? r[3] : "街道"];
          const rem = need * (1 - a.prog);
          // 海に乗り出す。渡りきるまで岸に足はつけられぬ（GDD 10章）
          if (r && r[3] === "海路" && a.prog === 0 && !a.seaDone) {
            a.seaDone = true;
            const inter = seaInterception(s, a, "海路");
            if (inter) {
              const res = resolveSeaBattle(s, a, inter);
              const from = nodeById(a.path[0]), to = nodeById(a.path[1]);
              const txt = res.win
                ? `${from.name}と${to.name}の間の海で${s.factions[a.faction].name}が${res.foeName}の水軍を破った（${fmt(res.lost)}人を失う）。`
                : `${from.name}と${to.name}の間の海で${s.factions[a.faction].name}が${res.foeName}の水軍に敗れた（${fmt(res.lost)}人が海に沈んだ）。`;
              s.chronicle.push({ y: s.year, m: s.month, text: txt });
              if (a.faction === s.player || inter.by === s.player) events.push(txt);
              if (!res.win && a.men < 200) {            // 船を失い、渡海は成らなかった
                const home = s.castles.find((c2) => c2.id === a.from);
                if (home) for (const gid of a.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; }
                a.dead = true;
                break;
              }
              if (!res.win && Math.random() < 0.45) {    // 引き返す
                const home = s.castles.find((c2) => c2.id === a.from);
                if (home) {
                  home.local += Math.max(0, a.local);
                  for (const gid of a.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; }
                }
                a.dead = true;
                s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[a.faction].name}の軍は渡海を諦め、引き返した。` });
                break;
              }
            }
          }
          if (budget >= rem) {
            budget -= rem; a.prog = 0; a.path.shift(); a.at = a.path[0];
            a.seaDone = false;                          // 次の区間でまた海に出うる
          } else { a.prog += budget / need; budget = 0; }
        }
        if (a.dead) continue;
        a.food -= Math.round(a.men * 0.09);
        if (a.faction === s.player) {
          const days = Math.round((a.food / Math.max(1, a.men * 0.09)) * 30);
          if (a.food <= 0) events.push(`進軍中の軍の兵糧が尽きた。士気と兵が落ちている。`);
          else if (days < 45) events.push(`進軍中の軍の兵糧が残り約${days}日分。補給が切れかけている。`);
        }
        if (a.food <= 0) { a.food = 0; a.men = Math.round(a.men * 0.96); }
        if (a.path.length === 1 && !a.sieging) arrivals.push(a);
      }
      s.armies = s.armies.filter((a) => !a.dead);
      // 同じ拠点へ着いた本隊と援軍は合流する（GDD 7.3 集結）
      for (const a of [...s.armies]) {
        if (a.aid == null || a.path.length > 1) continue;
        const host = s.armies.find((h) => h !== a && h.at === a.at && h.target === a.target && h.aid == null && h.faction === a.faction);
        if (!host) continue;
        host.local += a.local; host.men += a.men; host.food += a.food;
        host.gens = [...host.gens, ...a.gens];
        if (a.rost) host.rost = [...(host.rost || []), ...a.rost];
        s.armies = s.armies.filter((x) => x.id !== a.id);
        const idx = arrivals.indexOf(a);
        if (idx >= 0) arrivals.splice(idx, 1);
        if (host.faction === s.player || a.aid === s.player) {
          events.push(`${s.factions[a.faction].name}の援軍${fmt(a.men)}人が本隊へ合流した。`);
        }
      }
      // 相手方から身代金の申し出。こちらが捕らえている武将について月ごとに起こりうる。
      for (const q of s.generals) {
        if (!q.captive || q.captive.by !== s.player || s.ransomOffer) continue;
        const worth = (q.lead + q.valor + q.wit + q.gov) / 400;
        if (Math.random() > 0.10 + worth * 0.18) continue;
        const cost = ransomCost(s, q);
        const f = s.factions[cost.payer];
        const foodHave = s.castles.filter((c2) => c2.faction === cost.payer).reduce((a, c2) => a + c2.food, 0);
        if (!f || f.gold < cost.gold || foodHave < cost.food) continue;
        s.ransomOffer = { genId: q.id, gold: cost.gold, food: cost.food, rank: cost.rank, from: cost.payer };
        break;
      }
      // 滅んだ家の捕虜は、囚われの月を重ねるごとに心をほぐしていく（GDD 12.4）
      for (const q of s.generals) {
        if (!q.captive || !q.captive.ruin) continue;
        q.warLoyal = clamp((q.warLoyal || 0) + 2, 0, 100);
        q.fed = false;                        // 扶持は月に一度
      }
      // 人は年を取る。春（四月）を年の改まりとし、皆ひとつ齢を加える。
      if (s.month === 4) {
        for (const q of s.generals) q.age = (q.age || 30) + 1;
        for (const q of [...s.generals]) {
          const a = q.age;
          const cap = lifeSpan(q);
          // 史実で没する年が定まっている者は、その年に没する。
          const fated = FATED[q.id] && s.year >= FATED[q.id];
          // 定めの齢に達すれば必ず没する。それ以前も、老いれば病を得る。
          const reached = fated || a >= cap;
          if (!reached && a < 48) continue;
          const p = reached ? 1
            : a >= cap - 4 ? 0.34 : a >= 70 ? 0.16 : a >= 60 ? 0.075 : a >= 54 ? 0.035 : 0.015;
          if (Math.random() > p) continue;
          const wasLord = q.lord;
          s.generals = s.generals.filter((x) => x.id !== q.id);
          if (wasLord) {
            if (q.faction === s.player && !s.autoPlay) {
              // 跡目は当主が選ぶ。誰を立てるかで家中の様相が変わる。
              s.succession = { dead: q, cause: "病没した" };
            } else succeed(s, q, "病没した");
          } else {
            // 家を持つ者は、子が跡を継ぐ（GDD 6.7）
            const h = inheritHouse(s, q);
            if (h) {
              const txt = `${q.name}が病没した（${a}歳）。${h.name}が${houseName(q)}の家を継いだ（禄高${fmt(stipendOf(s, h))}石）。`;
              s.chronicle.push({ y: s.year, m: s.month, text: txt });
              if (q.faction === s.player) events.push(txt);
            } else {
              s.chronicle.push({ y: s.year, m: s.month,
                text: `${q.name}が病没した（${a}歳）。${hasHouse(s, q) ? `${houseName(q)}の家は跡を継ぐ者なく絶えた。` : ""}` });
            }
          }
          if (q.faction === s.player) events.push(`${q.name}が病没した（${a}歳）。`);
        }
      }
      // 城を失った家の軍が残っていれば散らす。
      // 滅んだはずの家が城を攻めてくることのないように。
      for (const fid of [...new Set(s.armies.map((a) => a.faction))]) {
        if (s.castles.some((c) => c.faction === fid)) continue;
        for (const a2 of s.armies.filter((x) => x.faction === fid)) {
          for (const gid of a2.gens) {
            const x = s.generals.find((q) => q.id === gid);
            if (x && !s.castles.some((c) => c.id === x.at)) {
              const near = s.castles[0];
              if (near) x.at = near.id;
            }
          }
        }
        s.armies = s.armies.filter((x) => x.faction !== fid);
        s.sieges = s.sieges.filter((x) => s.armies.some((a3) => a3.id === x.armyId));
        s.campaigns = (s.campaigns || []).filter((x) => x.faction !== fid);
      }
      // 官位。五畿を制した者は朝廷より高官に叙せられる（GDD 12.5）
      for (const fid of Object.keys(s.factions)) {
        if (!s.castles.some((c) => c.faction === fid)) continue;
        const cr = courtRank(s, fid);
        const had = (s.courtRanks || {})[fid];
        if (!cr) { if (had) { s.courtRanks = { ...(s.courtRanks || {}), [fid]: null }; } continue; }
        if (had === cr.key) continue;
        s.courtRanks = { ...(s.courtRanks || {}), [fid]: cr.key };
        const f4 = s.factions[fid];
        f4.prestige = clamp((f4.prestige || 50) + cr.prestige, 0, 100);
        const txt = cr.key === "征夷大将軍"
          ? `${f4.name}が畿内より関東までを制し、征夷大将軍に任ぜられた。幕府を開き、天下に号令する。`
          : `${f4.name}が五畿をことごとく制し、朝廷より${cr.key}に叙せられた。`;
        s.chronicle.push({ y: s.year, m: s.month, text: txt });
        events.push(txt);
      }
      // 一揆（GDD 12.5）。国がまとまらず民忠も低い城では、百姓が蜂起する。
      for (const c of s.castles) {
        const grip = provinceGrip(s, c.faction, c.kuni);
        if (grip >= 0.999 || c.min >= 58) continue;
        const p2 = clamp((58 - c.min) / 2400 * (1.4 - grip), 0, 0.012);
        if (Math.random() > p2) continue;
        const lost = Math.round(c.local * (0.06 + Math.random() * 0.08));
        c.local = Math.max(0, c.local - lost);
        c.koku = Math.round(c.koku * 0.97);
        c.min = clamp(c.min - 4, 0, 100);
        const txt = `${c.name}で一揆が起きた。${fmt(lost)}人を失い、田も荒れた。`;
        s.chronicle.push({ y: s.year, m: s.month, text: txt });
        if (c.faction === s.player) events.push(txt);
      }
      // 幼き当主のもとでは家中がまとまらぬ。後見がいれば、その器量が家を支える。
      for (const fid of Object.keys(s.factions)) {
        const lord = s.generals.find((x) => x.faction === fid && x.lord && !x.captive);
        if (!lord || !needsGuardian(lord)) continue;
        const gd = s.generals.find((x) => x.id === lord.guardian && !x.captive);
        // 後見の器量が高ければ揺れは小さい。後見がいなければ大きく揺れる。
        const drift = gd ? clamp(1.4 - (gd.lead + gd.gov) / 150, 0.1, 1.4) : 2.2;
        for (const x of s.generals.filter((q) => q.faction === fid && !q.lord && !q.captive)) {
          if (x.id === lord.guardian) continue;
          if (x.loyal != null) x.loyal = clamp(x.loyal - drift, 0, 100);
        }
        // 他家からも侮られる
        const f3 = s.factions[fid];
        if (f3) f3.prestige = clamp((f3.prestige || 50) - 0.3, 0, 100);
      }
      // 知行と忠誠（GDD 6.1）。禄が器量に見合わなければ、心は離れていく。
      for (const q of s.generals) {
        if (q.captive) continue;
        const d = loyaltyDrift(q);
        q.loyal = clamp((q.loyal == null ? 60 : q.loyal) + d, 0, 100);
        if (q.loyal <= 12 && !q.lord) {
          // 出奔。あるいは近隣の家へ走る。
          const near = s.castles.filter((c2) => c2.faction !== q.faction);
          const to = near.length ? near[Math.floor(Math.random() * near.length)] : null;
          if (Math.random() < 0.18) {
            if (to) {
              const oldF = q.faction;
              q.faction = to.faction; q.at = to.id; q.loyal = 45; q.fief = Math.round(fiefWanted(q) * 0.8);
              const msg = `${q.name}が${s.factions[oldF].name}を去り、${s.factions[to.faction].name}に走った。`;
              s.chronicle.push({ y: s.year, m: s.month, text: msg });
              if (oldF === s.player || to.faction === s.player) events.push(msg);
            } else {
              s.generals = s.generals.filter((x) => x.id !== q.id);
              s.chronicle.push({ y: s.year, m: s.month, text: `${q.name}が出奔した。` });
              if (q.faction === s.player) events.push(`${q.name}が出奔した。`);
            }
          } else if (q.faction === s.player) {
            events.push(`${q.name}の心が離れつつある（忠誠${Math.round(q.loyal)}）。知行を見直すべきである。`);
          }
        }
      }
      // 捕虜は日を重ねるごとに旧主への思いが薄れる（GDD 12.3）
      for (const q of s.generals) {
        if (!q.captive) continue;
        const home = s.factions[q.captive.from];
        if (!home || !s.castles.some((c2) => c2.faction === q.captive.from)) {
          // 旧主が滅んだ。捕らえた家の者となる。
          const by = q.captive.by;
          q.faction = by; q.loyal = 40; q.captive = null;
          q.retinue = Math.round(120 + Math.random() * 100);
          s.chronicle.push({ y: s.year, m: s.month, text: `旧主を失った${q.name}が${s.factions[by].name}に仕えた。` });
          continue;
        }
        // 旧主との縁。厚ければ忠誠は下がりにくく、薄ければ早く離れる。
        if (q.captive.bond == null) {
          q.captive.bond = q.loyal >= 78 ? 1 : q.loyal <= 45 ? -1 : 0;
        }
        const step = q.captive.bond > 0 ? 0.5 : q.captive.bond < 0 ? 1.8 : 1;
        q.loyal = clamp((q.loyal == null ? 60 : q.loyal) - step, 0, 100);
        if (q.loyal <= 40 && !q.captive.ready) {
          q.captive.ready = true;
          events.push(`捕虜の${q.name}が心を移した。登用できる。`);
        }
      }
      // 他家も寄騎を出す。一城の兵だけでは堅い城は落ちない。
      for (const a of s.armies) {
        if (!auto(a.faction) || a.aid) continue;
        if (a.reinforced || a.path.length > 1) continue;
        a.reinforced = true;
        const tgt = s.castles.find((c2) => c2.id === a.target);
        if (!tgt) continue;
        const dg3 = s.generals.filter((x) => x.at === tgt.id && x.faction === tgt.faction && !x.captive);
        const need = (tgt.local + dg3.reduce((t2, x) => t2 + x.retinue, 0)) * 1.5 - a.men;
        if (need <= 0) continue;
        let sent = 0;
        for (const c2 of s.castles.filter((x) => x.faction === a.faction && x.id !== a.from)) {
          if (sent >= need) break;
          const gs = s.generals.filter((x) => x.at === c2.id && x.faction === a.faction && !x.captive);
          const spare = c2.local + gs.reduce((t2, x) => t2 + x.retinue, 0) - minGarrison(c2);
          if (spare < 400 || !gs.length) continue;
          const take = [...gs].sort((x, y2) => y2.lead - x.lead).slice(0, 1);
          const send = Math.min(Math.round(spare * 0.6), c2.local);
          if (send < 200) continue;
          c2.local -= send;
          for (const t2 of take) t2.at = null;
          const tk = rosterTake(c2.rost || newRoster(c2.local + send, `loc-${c2.id}`), send);
          c2.rost = tk.rest;
          s.armies.push({
            id: `r${Date.now()}${Math.round(Math.random() * 1e6)}`, faction: a.faction, from: c2.id,
            gens: take.map((x) => x.id), local: send, localTrain: c2.localTrain, rost: tk.taken,
            men: send + take.reduce((t2, x) => t2 + x.retinue, 0), at: c2.id,
            path: findPath(c2.id, a.target), prog: 0, food: Math.round(send * 0.6),
            target: a.target, aid: a.faction,
          });
          sent += send;
        }
        if (sent > 0) s.chronicle.push({ y: s.year, m: s.month,
          text: `${s.factions[a.faction].name}が${tgt.name}攻めへ寄騎${fmt(sent)}人を向かわせた。` });
      }
      // 他家の包囲を進める。放っておくと囲んだまま何年も動かない。
      for (const sg2 of [...s.sieges]) {
        const bes = s.armies.find((x) => x.id === sg2.armyId);
        const cs = s.castles.find((x) => x.id === sg2.castleId);
        if (!bes || !cs) continue;
        if (!s.autoPlay && (bes.faction === s.player || cs.faction === s.player)) continue;
        // 試走では自家の包囲も自動で進める
        sg2.months = (sg2.months || 0) + 1;
        // 囲みが長引けば城は痩せる。守り手が回復し続けて落ちない、という膠着を防ぐ。
        if (sg2.months >= 3) {
          cs.def = Math.max(10, cs.def - 1.5);
          cs.localTrain = Math.max(25, cs.localTrain - 1.5);
          cs.local = Math.max(0, cs.local - Math.round(cs.local * 0.03));
          if (sg2.months >= 6 && Math.random() < 0.12) {
            const turn = s.generals.filter((x) => x.at === cs.id && x.faction === cs.faction && !x.captive && !x.lord)
              .sort((a2, b2) => (a2.loyal || 60) - (b2.loyal || 60))[0];
            if (turn && (turn.loyal || 60) < 55) {
              s.chronicle.push({ y: s.year, m: s.month, text: `${cs.name}の${turn.name}が城を開いて寝返った。` });
              sackCastle(s, cs, bes, false);
              continue;
            }
          }
        }
        const dg2 = s.generals.filter((x) => x.at === cs.id && x.faction === cs.faction && !x.captive);
        const dMen2 = cs.local + dg2.reduce((a, x) => a + x.retinue, 0);
        // 兵糧を削り、頃合いを見て攻めかかる
        cs.food = Math.max(0, cs.food - Math.round(cs.local * 0.35 + 600));
        cs.min = Math.max(0, cs.min - 5);
        bes.food -= Math.round(bes.men * 0.09);
        if (cs.food <= 0 || cs.min < 25) { sackCastle(s, cs, bes, false); continue; }
        if (bes.food <= 0) {                                  // 兵糧が尽きれば囲みを解く
          const home = s.castles.find((x) => x.id === bes.from);
          if (home) { home.local += bes.local; for (const gid of bes.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; } }
          s.armies = s.armies.filter((x) => x.id !== bes.id);
          s.sieges = s.sieges.filter((x) => x !== sg2);
          s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[bes.faction].name}は${cs.name}の囲みを解いた。` });
          continue;
        }
        // 数で押せるなら強攻する
        if (bes.men > dMen2 * 1.6 && Math.random() < 0.45) {
          const aL = Math.round(bes.men * 0.14), dL = Math.round(dMen2 * 0.4);
          bes.men = Math.max(0, bes.men - aL); bes.local = Math.max(0, bes.local - aL);
          cs.local = Math.max(0, cs.local - dL);
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${s.factions[bes.faction].name}が${cs.name}へ攻めかかった（攻${fmt(aL)}人・守${fmt(dL)}人を失う）。` });
          if (cs.local < 150) sackCastle(s, cs, bes, true);
        }
      }
      // 後詰。囲みが緩ければ、城方の勢力が救援を差し向ける（GDD 9.2）
      for (const sg2 of s.sieges) {
        const cs = s.castles.find((x) => x.id === sg2.castleId);
        const bes = s.armies.find((x) => x.id === sg2.armyId);
        if (!cs || !bes || sg2.relief) continue;
        const enc = (sg2.enc == null ? 60 : sg2.enc) / 100;
        if (enc > 0.75) continue;                       // 固く囲まれていれば入れない
        if (Math.random() > 0.55 * (1 - enc)) continue;
        const from = s.castles.filter((c2) => c2.faction === cs.faction && c2.id !== cs.id)
          .map((c2) => ({ c2, p: findPath(c2.id, cs.id) })).filter((x) => x.p)
          .sort((a, b) => a.p.length - b.p.length)[0];
        if (!from) continue;
        const fg = s.generals.filter((x) => x.at === from.c2.id && x.faction === from.c2.faction && !x.captive);
        const avail = from.c2.local + fg.reduce((a, x) => a + x.retinue, 0) - minGarrison(from.c2);
        if (avail < 500 || !fg.length) continue;
        const take = [...fg].sort((a, b) => b.lead - a.lead).slice(0, 2);
        const send = Math.min(Math.round(avail * 0.6), from.c2.local);
        if (send < 200) continue;
        from.c2.local -= send;
        for (const t of take) t.at = null;
        const rid = `f${Date.now()}${Math.round(Math.random() * 1e6)}`;
        s.armies.push({
          id: rid, faction: cs.faction, from: from.c2.id, gens: take.map((x) => x.id),
          local: send, localTrain: from.c2.localTrain,
          rost: (() => { const tk = rosterTake(from.c2.rost || newRoster(from.c2.local + send, `loc-${from.c2.id}`), send); from.c2.rost = tk.rest; return tk.taken; })(),
          men: send + take.reduce((a, x) => a + x.retinue, 0), at: from.c2.id,
          path: findPath(from.c2.id, cs.id), prog: 0, food: Math.round(send * 0.6), target: cs.id, relief: cs.id,
        });
        sg2.relief = rid;
        events.push(`${s.factions[cs.faction].name}が${cs.name}へ後詰を差し向けた（${from.c2.name}より${fmt(send)}人）。`);
      }
      // 他家も国を治める。捨て置くと兵も石高も増えず、天下の形がいつまでも動かない。
      for (const fid of Object.keys(s.factions)) {
        if (!auto(fid)) continue;
        const f2 = s.factions[fid];
        for (const c of s.castles.filter((x) => x.faction === fid)) {
          if (s.sieges.some((sg) => sg.castleId === c.id)) continue;   // 囲まれた城では何もできない
          const gens2 = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive);
          const gov2 = gens2.length ? Math.max(...gens2.map((x) => x.gov)) : 50;
          // 開墾と治水
          if (f2.gold > 400 && Math.random() < 0.5 * lv(s).aiGrow) {
            const room = c.kokuMax - c.koku;
            if (room > c.kokuMax * 0.04) {
              c.koku += Math.round(room * 0.12 * (0.5 + gov2 / 100) * lv(s).aiGrow); f2.gold -= 140;
            } else {
              const cap2 = c.kokuCap || c.kokuMax;
              const add = Math.min(Math.max(0, cap2 - c.kokuMax), Math.round(c.kokuMax * 0.03 * (0.5 + gov2 / 100)));
              if (add > 0) { c.kokuMax += add; f2.gold -= 180; }
            }
          }
          // 徴募
          const cap = troopCap(c, f2.mobilization, s);
          const cur = c.local + gens2.reduce((a, x) => a + x.retinue, 0);
          // 一国を丸ごと押さえたら竿を入れる。国を治める者の当然の務めである。
          if (!f2.kenchiTried || s.month === 4) {
            for (const kuni of provincesHeld(s, fid)) {
              if (kenchiDone(s, kuni)) continue;
              const cost2 = kenchiCost(s, kuni);
              if (f2.gold < cost2.gold * 1.6) continue;
              const gov3 = Math.max(60, ...s.generals.filter((x) => x.faction === fid && !x.captive).map((x) => x.gov));
              f2.gold -= cost2.gold;
              const r2 = runKenchi(s, fid, kuni, gov3);
              s.chronicle.push({ y: s.year, m: s.month,
                text: `${f2.name}が${kuni}に竿を入れた。石高が${fmt(r2.before)}石より${fmt(r2.after)}石に改まった。` });
              break;
            }
            f2.kenchiTried = true;
          }
          // 兵は養うもの。限度いっぱいまで抱えると国が痩せ、城が難攻不落になって天下が凍る。
          const want = Math.round(cap * 0.7);
          if (f2.gold > 700 && cur < want) {
            const n = Math.max(0, Math.min(want - cur, Math.floor((f2.gold - 500) / 0.45), Math.floor(c.pop * 0.010)));
            if (n > 60) {
              c.local += n; f2.gold -= Math.round(n * 0.45);
              rosterSync(c, "rost", c.local, `loc-${c.id}`);
              c.pop -= Math.round(n * 0.2);
            }
          }
          if (Math.random() < 0.25) c.localTrain = Math.min(100, c.localTrain + 2);
        }
      }
      // 家ごとに方針を見直す（GDD 13.2）
      for (const fid of Object.keys(s.factions)) {
        if (!auto(fid)) continue;
        reviewAim(s, fid);
        const fa = s.factions[fid];
        // 気性ごとの振る舞い
        if (fa.temper === "陰謀" && fa.aim && fa.gold > 500 && Math.random() < 0.3 * lv(s).aiPlot) {
          const t = s.castles.find((c2) => c2.id === fa.aim.target);
          if (t) {
            fa.gold -= 220;
            t.min = Math.max(0, t.min - 3);
            for (const x of s.generals.filter((q) => q.at === t.id && q.faction === t.faction && !q.captive)) {
              x.loyal = Math.max(0, (x.loyal == null ? 60 : x.loyal) - 2);
            }
            if (t.faction === s.player) events.push(`${s.factions[fid].name}の手の者が${t.name}で流言を広めている。`);
          }
        }
        if (fa.temper === "堅実" && fa.gold > 600 && Math.random() < 0.35) {
          // 狙われている城の備えを固める
          const risk = s.castles.filter((c2) => c2.faction === fid)
            .sort((a, b) => a.def - b.def)[0];
          if (risk) { risk.def = Math.min(100, risk.def + 2); risk.hp += 150; fa.gold -= 240; }
        }
      }
      for (const fid of Object.keys(s.factions)) {
        if (!auto(fid) || s.armies.some((a) => a.faction === fid)) continue;
        const fa = s.factions[fid];
        // 気性で腰の重さが変わる。進取は攻めがち、堅実は備えを固めてから。
        const eager = (fa.temper === "進取" ? 0.60 : fa.temper === "堅実" ? 0.32 : 0.45) * lv(s).aiEager;
        if (Math.random() > eager) continue;
        const aim = fa.aim;
        const order = aim ? [s.castles.find((x) => x.id === aim.from), ...s.castles.filter((x) => x.faction === fid && x.id !== aim.from)]
          : s.castles.filter((x) => x.faction === fid);
        for (const c of order.filter(Boolean)) {
          if (c.faction !== fid) continue;
          const gens = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive);
          const avail = c.local + gens.reduce((a, x) => a + x.retinue, 0) - minGarrison(c);
          if (avail < 700) continue;
          const passable2 = (t2) => {
            const path = findPath(c.id, t2.id);
            if (!path) return false;
            if ((marchMonths(c.id, t2.id) || 99) > 6) return false;
            for (let i = 1; i < path.length - 1; i++) {
              const mid = s.castles.find((y) => y.id === path[i]);
              if (!mid) return false;
              if (mid.faction === fid) continue;
              const st = relOf(s, fid, mid.faction).state;
              if (st !== "同盟" && st !== "従属" && st !== "臣従") return false;
            }
            return true;
          };
          const reach = s.castles.filter((x) => x.faction !== fid && !atPeace(s, fid, x.faction) && passable2(x));
          // 国をまとめる利を知る（GDD 12.5）。
          // あと一城二城で一国を丸ごと押さえられるなら、そこを先に取る。
          // 五畿の残り城はさらに重い。官位という報いがあるからである。
          const worth = (t2) => {
            const cs2 = s.castles.filter((x) => x.kuni === t2.kuni);
            if (!cs2.length) return 0;
            const rest = cs2.filter((x) => x.faction !== fid && x.id !== t2.id).length;
            let w = rest === 0 ? 60 : rest === 1 ? 24 : rest === 2 ? 8 : 0;
            if (GOKINAI.includes(t2.kuni)) {
              // 五畿は特別である。四国まで押さえていれば、残る一国は何を措いても取る。
              const got = GOKINAI.filter((k) => holdsProvince(s, fid, k)).length;
              w += rest === 0 ? 40 + got * 22 : 10 + got * 6;
            }
            return w;
          };
          const scored2 = reach.map((x) => ({
            x, s2: worth(x) - findPath(c.id, x.id).length * 1.2
              + (aim && aim.target === x.id ? 14 : 0),
          })).sort((a, b) => b.s2 - a.s2);
          const cand = scored2.length ? scored2[0].x : null;
          if (!cand) continue;
          const dg = s.generals.filter((x) => x.at === cand.id && x.faction === cand.faction);
          const foeMen2 = cand.local + dg.reduce((a, x) => a + x.retinue, 0);
          // 常に優勢でなければ動かぬ、という将ばかりでは天下は動かぬ。
          // 知略に優れた者は、雨の月に、劣勢を承知で勝負に出る。桶狭間はそういう戦であった。
          let need = lv(s).aiNeed;
          const head2 = [...gens].sort((x, y2) => (y2.wit + y2.lead) - (x.wit + x.lead))[0];
          if (head2 && head2.wit >= 78) {
            const wet = s.weather === "雨" || s.weather === "雪" || s.weather === "曇";
            const p2 = ambushChance(head2, s.weather || "晴", "forest", avail / Math.max(1, foeMen2));
            // 奇襲の目が十分にあるなら、寡兵でも仕掛ける
            if (p2 > 0.22 && (wet || head2.wit >= 88)) need = 0.34;
            else if (p2 > 0.15) need = 0.68;
          }
          if (avail < foeMen2 * need) continue;
          const take = gens.sort((a, b) => b.lead - a.lead).slice(0, 3);
          const send = Math.round(avail * 0.85);
          const localSend = Math.max(0, Math.min(c.local, send - take.reduce((a, x) => a + x.retinue, 0)));
          c.local -= localSend;
          s.armies.push({
            id: `a${Date.now()}${Math.random()}`, faction: fid, from: c.id, gens: take.map((x) => x.id),
            local: localSend, localTrain: c.localTrain, men: localSend + take.reduce((a, x) => a + x.retinue, 0),
            at: c.id, path: findPath(c.id, cand.id), prog: 0, food: Math.round(send * 0.6), target: cand.id,
          });
          for (const t of take) t.at = null;
          c.food -= Math.round(send * 0.6);
          events.push(`${s.factions[fid].name}が${c.name}より出陣。${cand.name}を目指す。`);
          break;
        }
      }
      // 天下が定まったか（報せに載せるため、月を進める前に判ずる）
      if (!s.unified) {
        const u = checkUnified(s);
        if (u) {
          s.unified = { fid: u.fid, y: s.year, m: s.month, vassals: u.vassals, direct: u.direct };
          const nm = s.factions[u.fid].name;
          const how = u.direct ? "すべての城を握り" : `${u.vassals.map((v) => s.factions[v].name).join("・")}を従え`;
          const gd = u.grade === "一統" ? "天下ことごとくを直に治め、諸家は一つも残らなかった"
            : u.grade === "大成" ? `${u.mine}城を直に治め、残るは旗下の家々である`
            : u.grade === "覇" ? `${u.mine}城を直に治め、なお多くの家を従えている`
            : `${u.mine}城を直に治めるのみで、大半は従属する家々である`;
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${nm}が${how}、この地に天下を定めた。${gd}。` });
          events.push(u.fid === s.player ? "天下が定まった。この地に並ぶ者はない。" : `${nm}がこの地を統べた。`);
        }
      }
      s.month++;
      if (s.month > 12) {
        s.month = 1; s.year++;
        // 元服。幼き当主が十五に達すれば、後見が解ける（GDD 6.6）
        for (const q of s.generals) {
          if (!q.lord || !q.guardian) continue;
          if ((q.age || 30) < COMING_OF_AGE) continue;
          const gd = s.generals.find((x) => x.id === q.guardian);
          q.guardian = null;
          const txt = `${q.name}が元服し、みずから家督を執った。${gd ? `${gd.name}の後見は解けた。` : ""}`;
          s.chronicle.push({ y: s.year, m: s.month, text: txt });
          if (q.faction === s.player) events.push(txt);
        }
        // 家を持つ者に子が生まれる（GDD 6.7）。
        // すでに子がある者、史実の子が後年に現れる者には、重ねて生まれない。
        for (const q of [...s.generals]) {
          if (q.captive || q.lord) continue;
          const a2 = q.age || 30;
          if (a2 < 18 || a2 > 52) continue;
          if (!hasHouse(s, q)) continue;
          const hasKid = s.generals.some((x) => PARENT[x.id] === q.id && !x.captive)
            || NEWCOMERS.some((n) => PARENT[n.id] === q.id);
          if (hasKid) continue;
          if (Math.random() > 0.07) continue;
          const kid = bearChild(s, q);
          if (kid && q.faction === s.player) events.push(`${q.name}に子が生まれた（${kid.name}）。`);
        }
        // 年が改まれば、若い者が世に出る（GDD 6.1）
        for (const t of emergeGenerals(s)) {
          s.chronicle.push({ y: s.year, m: s.month, text: t });
          events.push(t);
        }
      }
      s.orders = {};
      s.pendingArrivals = arrivals.map((a) => a.id);
      s.monthEvents = events;
      if (events.length) s.chronicle.push(...events.map((t) => ({ y: s.year, m: s.month, text: t })));
      if (s.chronicle.length > 400) s.chronicle = s.chronicle.slice(-400);   // 古い記録は流す
      return s;
    });
    setModal("report");
  };

  useEffect(() => {
    if (!g.pendingArrivals || !g.pendingArrivals.length || battle) return;
    const a = g.armies.find((x) => x.id === g.pendingArrivals[0]);
    const dest = a && g.castles.find((c) => c.id === a.at);
    if (!a || !dest) { setG((p) => ({ ...p, pendingArrivals: p.pendingArrivals.slice(1) })); return; }
    // 自勢力が関わらない合戦は画面に出さず、同じ規則で自動解決する（GDD 13.2）
    // 試走のときは自勢力の合戦も自動で解く
    if (g.autoPlay || (a.faction !== g.player && dest.faction !== g.player)) { autoResolve(a.id, dest.id); return; }
    // 後詰が包囲中の城へ着いたら、囲みを解くための野戦になる
    if (a.relief) {
      const sg2 = g.sieges.find((x) => x.castleId === a.relief);
      const bes = sg2 && g.armies.find((x) => x.id === sg2.armyId);
      if (bes) {
        if (bes.faction === g.player || a.faction === g.player) {
          startBattle(a, { ...dest, faction: bes.faction, local: bes.local, localTrain: bes.localTrain,
            najimi: 70, def: 0, name: `${dest.name}の囲み` }, null);
        } else autoResolve(a.id, dest.id);
        return;
      }
    }
    // 自勢力の戦役なら、着いた軍を集結として記録し、開戦の判断は総大将に委ねる
    const camp = (g.campaigns || []).find((c) => c.armies.includes(a.id) && c.target === a.at);
    if (camp && !camp.arrived.includes(a.id)) {
      setG((p2) => {
        const s = structuredClone(p2);
        const cc = s.campaigns.find((x) => x.id === camp.id);
        if (cc && !cc.arrived.includes(a.id)) {
          cc.arrived.push(a.id);
          const ar = s.armies.find((x) => x.id === a.id);
          if (ar) ar.sieging = true;              // 到着後は毎月の再判定に回さない
          const late = cc.armies.filter((id) => !cc.arrived.includes(id) && s.armies.some((x) => x.id === id));
          s.monthEvents = [...(s.monthEvents || []),
            `${nodeById(cc.target).name}の手前に着陣した。${late.length ? `遅参${late.length}隊を待つか、先に攻めかかるかを決める。` : "全軍がそろった。"}`];
        }
        s.pendingArrivals = s.pendingArrivals.slice(1);
        return s;
      });
      return;
    }
    if (dest.faction === a.faction) {
      setG((p) => {
        const s = structuredClone(p);
        const ar = s.armies.find((x) => x.id === a.id);
        const c = s.castles.find((x) => x.id === ar.at);
        c.local += ar.local; c.food += ar.food;
        if (ar.rost && ar.rost.length) { c.rost = [...(c.rost || []), ...ar.rost]; }
        rosterSync(c, "rost", c.local, `loc-${c.id}`);
        for (const gid of ar.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = c.id; }
        s.armies = s.armies.filter((x) => x.id !== ar.id);
        s.pendingArrivals = s.pendingArrivals.slice(1);
        if (ar.faction === s.player) {
          const msg = `${c.name}に到着し、軍は城へ合流した（味方の城のため合戦は起きない）。`;
          s.monthEvents = [...(s.monthEvents || []), msg];
          s.chronicle.push({ y: s.year, m: s.month, text: msg });
        }
        return s;
      });
      return;
    }
    startBattle(a, dest);
  }, [g.pendingArrivals, battle]); // eslint-disable-line

  // 画面外の合戦。兵数・練度・統率・城防から勝敗と損害を出し、結果だけを記録する。
  const autoResolve = (armyId, castleId) => setG((prev) => {
    const s = structuredClone(prev);
    const army = s.armies.find((x) => x.id === armyId);
    const castle = s.castles.find((x) => x.id === castleId);
    s.pendingArrivals = (s.pendingArrivals || []).slice(1);
    if (!army || !castle) return s;
    const aGens = army.gens.map((id) => s.generals.find((x) => x.id === id)).filter(Boolean);
    const dGens = s.generals.filter((x) => x.at === castle.id && x.faction === castle.faction && !x.captive);
    const lead = (gs) => (gs.length ? gs.reduce((a, x) => a + x.lead, 0) / gs.length : 55);
    const dMen = castle.local + dGens.reduce((a, x) => a + x.retinue, 0);
    // 寡兵ならば奇襲を試みる。総大将を討てば、兵力比は意味を失う。
    const wx = s.weather || "晴";
    const amb = tryAmbush(s, army, castle, aGens, dGens, wx);
    let atk = army.men * (0.8 + army.localTrain / 250) * (1 + lead(aGens) / 300) * (0.85 + Math.random() * 0.3);
    let def = dMen * (0.85 + castle.localTrain / 250) * (1 + castle.def / 200 + lead(dGens) / 300) * (0.85 + Math.random() * 0.3);
    if (amb && amb.ok) {
      def *= 0.20;                                   // 大将を失い、備えが崩れた
      atk *= 1.25;                                   // 寄せ手は勢いに乗る
    } else if (amb && !amb.ok && army.faction === s.player) {
      s.chronicle.push({ y: s.year, m: s.month, text: `${amb.by.name}は敵の隙を窺ったが、機を得なかった。` });
    }
    const atkWon = atk > def;
    if (amb && amb.ok) {
      const fell = atkWon && amb.target;
      s.chronicle.push({ y: s.year, m: s.month,
        text: fell
          ? `${amb.by.name}が${castle.name}の本陣を衝いた。${amb.target.name}は討たれ、${s.factions[castle.faction].name}の軍は瓦解した。`
          : `${amb.by.name}が${castle.name}の本陣を衝いた。${s.factions[castle.faction].name}の備えは乱れた。` });
      if (fell) {
        const t2 = s.generals.find((x) => x.id === amb.target.id);
        if (t2) {
          s.generals = s.generals.filter((x) => x.id !== t2.id);
          if (t2.lord) {
            const nx = s.generals.filter((x) => x.faction === t2.faction && !x.captive).sort((a, z) => z.lead - a.lead)[0];
            if (nx) nx.lord = true;
          }
        }
        if (army.faction === s.player) s.msg = `${amb.by.name}が敵の本陣を衝き、${amb.target.name}を討ち取った。`;
      }
    }
    const r = Math.min(atk, def) / Math.max(atk, def);
    const aLoss = Math.round(army.men * (atkWon ? 0.16 * r + 0.06 : 0.3 + 0.2 * r));
    const dLoss = Math.round(dMen * (atkWon ? 0.34 + 0.2 * r : 0.14 * r + 0.05));
    army.men = Math.max(0, army.men - aLoss); army.local = Math.max(0, army.local - aLoss);
    castle.local = Math.max(0, castle.local - dLoss);
    s.chronicle.push({ y: s.year, m: s.month,
      text: `${castle.name}下で${s.factions[army.faction].name}と${s.factions[castle.faction].name}が戦い、${atkWon ? "攻め手" : "守り手"}が勝った（攻${fmt(aLoss)}人・守${fmt(dLoss)}人を失う）。` });
    if (atkWon && castle.local < 200) {
      sackCastle(s, castle, army, true);
    } else if (atkWon) {
      army.sieging = true;
      s.sieges = [...s.sieges.filter((x) => x.castleId !== castle.id), { castleId: castle.id, armyId: army.id, months: 0, decided: null }];
    } else {
      const home = s.castles.find((x) => x.id === army.from);
      if (home) { home.local += army.local; for (const gid of army.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; } }
      s.armies = s.armies.filter((x) => x.id !== army.id);
    }
    return s;
  });

  // 強攻＝城郭図の上での2D戦（GDD 9.3）
  const startAssault = (sg, gateParty, kits) => {
    if (g.autoPlay) return;
    const army = g.armies.find((x) => x.id === sg.armyId);
    const castle = g.castles.find((x) => x.id === sg.castleId);
    if (!army || !castle) return;
    const map = layoutCastleField(buildCastleMap(castle));
    setBattleMap(map);
    const atkGens = army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
    const defGens = g.generals.filter((x) => x.at === castle.id && x.faction === castle.faction);
    // 一隊の兵に上限を設ける。あふれた分は後詰として戦場の外に控える。
    const nAtk = Math.max(1, Math.min(atkGens.length, MAX_CORPS));
    const retSum = atkGens.slice(0, nAtk).reduce((a2, x) => a2 + x.retinue, 0);
    const room = Math.max(0, SIEGE_CORPS_CAP * nAtk - retSum);
    const useLocal = Math.min(Math.max(0, army.local), room);
    const reserveMen = Math.max(0, army.local - useLocal);
    let reserveRost = [];
    let commitRost = army.rost || null;
    if (army.rost && reserveMen > 0) {
      const cp = JSON.parse(JSON.stringify(army.rost));
      const tk = rosterTake(cp, useLocal);
      commitRost = tk.taken; reserveRost = tk.rest;
    }
    const playerIsAtk = army.faction === g.player;
    const atkColor = g.factions[army.faction].color, defColor = g.factions[castle.faction].color;
    const atkSide = playerIsAtk ? "P" : "E", defSide = playerIsAtk ? "E" : "P";

    const mk = (gens0, local, train, side, color, spots, srcRost) => {
      const gens = (gens0.length ? gens0
        : [{ id: `gar-${castle.id}-${side}`, name: `${castle.name}守備隊`, lead: 52, valor: 50, wit: 45, gov: 45, retinue: 0, retTrain: train }])
        .slice(0, MAX_CORPS);
      const n = gens.length, per = Math.floor(local / n);
      let pool = srcRost && srcRost.length ? JSON.parse(JSON.stringify(srcRost)) : null;
      return gens.map((gen, i) => {
        const sp = spots(i, n);
        const slice = pool ? (() => { const tk = rosterTake(pool, per); pool = tk.rest; return tk.taken; })() : null;
        return makeCorps(side, { ...gen, locRost: slice }, gen.retinue, per,
          Math.round(gen.retTrain * 0.7 + (gen.unity || 60) * 0.3),
          Math.round(train * 0.7 + (castle.najimi == null ? 70 : castle.najimi) * 0.3),
          sp.x, sp.y, sp.f, color);
      });
    };
    // 寄せ手は惣構の各門へ順に割り振り、その門の外に構える
    const outer = map.layers[0], og = outer.gates;
    const atk = mk(atkGens, useLocal, army.localTrain, atkSide, atkColor, (i, n) => {
      const gt = og[i % og.length];
      const a = axisOf(outer, gt);
      const rank = Math.floor(i / og.length);                 // 同じ門の何番目か
      const back = map.moat.band + outer.masu + map.t + 96 + rank * 76;
      const side = ((rank % 2) ? 1 : -1) * (rank ? 44 : 0);
      const p = fromUV(map, a, gateOpenU(gt) + side, a.half + back);
      return { x: p.x, y: p.y, f: Math.atan2(map.cy - p.y, map.cx - p.x) };
    }, commitRost);
    // 守り手は門の内側から順に詰める。門の数だけ受け持ちがある。
    const guard = [];
    for (const l of map.layers) for (const gt of l.gates) {
      const a = axisOf(l, gt);
      // 自分の壁と、一つ内側の曲輪の壁との間に立つ
      const nx = map.layers[l.i + 1];
      const innerEdge = nx ? (a.along === "x" ? nx.hh : nx.hw) + map.t : 0;
      const band = Math.max(20, a.half - innerEdge);
      const inset = Math.min(44 * (FIELD.w / BASE.w), band * 0.5);
      const p = fromUV(map, a, gt.off, a.half - inset);
      guard.push({ x: p.x, y: p.y, f: Math.atan2(p.y - map.cy, p.x - map.cx) + Math.PI });
    }
    guard.push({ x: map.cx, y: map.cy, f: Math.PI / 2 });
    const def = mk(defGens, Math.max(0, castle.local), castle.localTrain, defSide, defColor,
      (i, n) => {
        // 外の門から順に受け持たせ、余れば本丸へ
        const sp = guard[Math.min(guard.length - 1, i)];
        return { x: sp.x, y: sp.y, f: sp.f };
      }, castle.rost);

    if (kits) for (const c of atk) { const k = kits[c.id]; if (k && SIEGE_KIT[k]) c.kit = k; }
    const P = playerIsAtk ? atk : def, E = playerIsAtk ? def : atk;
    const bb = createBattle(P, E, atkSide);
    bb.mode = "castle";
    bb.map = map;
    bb.dusk = 1080;                 // 城攻めは一日がかり（十八分）
    for (const c of atk) { c.formation = "方陣"; placeSquads(c, true); }   // 狭い道を寄せるので固まる
    bb.gateParty = !!gateParty;
    // 守り手が打って出るか籠るか。優勢なら討って出る。
    const dMen = def.reduce((a, c) => a + corpsMen(c), 0);
    const aMen = atk.reduce((a, c) => a + corpsMen(c), 0);
    bb.sortie = playerIsAtk ? dMen > aMen * 0.85 : !!sg.sortie;
    bb.log.push({ t: 0, text: bb.sortie ? "守り手は城門を開いて討って出た。" : "守り手は曲輪に籠って寄せ手を待つ。" });
    if (castle.intrigue && playerIsAtk) {
      for (const c of bb.corps) if (c.side === defSide) { c.morale -= 20; for (const q of c.squads) q.cohesion -= 12; }
      const l0 = map.layers[0].gates[0]; l0.hp = 0; l0.broken = true;
      bb.log.push({ t: 0, text: "内応の手引きで大手門が開かれている。" });
    }
    setBattle({
      b: bb, armyId: army.id, castleId: castle.id, playerIsAtk, mode: "castle",
      reserveMen, reserveRost,
      pName: g.factions[playerIsAtk ? army.faction : castle.faction].name,
      eName: g.factions[playerIsAtk ? castle.faction : army.faction].name,
      pColor: playerIsAtk ? atkColor : defColor, eColor: playerIsAtk ? defColor : atkColor,
      place: castle.name,
    });
  };

  // 戦役の判断（GDD 7.2）。総大将が、遅参を待つか先に攻めかかるかを決める。
  const campaignAct = (camp, act) => {
    if (act === "攻") {
      const list = camp.arrived.map((id) => g.armies.find((x) => x.id === id)).filter(Boolean);
      if (!list.length) return;
      const dest = g.castles.find((c) => c.id === camp.target);
      const main = list.find((a) => a.id === camp.armies[0]) || list[0];
      setG((p2) => {
        const s = structuredClone(p2);
        const cc = s.campaigns.find((x) => x.id === camp.id);
        if (cc) cc.decided = `${s.year}-${s.month}`;
        return s;
      });
      startBattle(main, dest, camp);
      return;
    }
    setG((prev) => {
      const s = structuredClone(prev);
      const cc = s.campaigns.find((x) => x.id === camp.id);
      if (!cc) return s;
      cc.decided = `${s.year}-${s.month}`;
      const castle = s.castles.find((c) => c.id === cc.target);
      if (act === "待") {
        cc.waited++;
        // 待てば敵は備えを固め、こちらは兵糧と士気を減らす
        castle.def = Math.min(100, castle.def + 2);
        castle.food = Math.round(castle.food * 1.02);
        castle.localTrain = Math.min(100, castle.localTrain + 1.5);
        for (const id of cc.arrived) {
          const a = s.armies.find((x) => x.id === id);
          if (!a) continue;
          a.food -= Math.round(a.men * 0.11);
          if (a.food < 0) { a.food = 0; a.men = Math.round(a.men * 0.97); a.local = Math.round(a.local * 0.97); }
        }
        s.chronicle.push({ y: s.year, m: s.month,
          text: `${cc.leaderName}は遅参を待った。${castle.name}の備えは固くなった（${cc.waited}か月目）。` });
      } else {
        for (const id of cc.armies) {
          const a = s.armies.find((x) => x.id === id);
          if (!a) continue;
          const home = s.castles.find((x) => x.id === a.from);
          if (home) { home.local += a.local; for (const gid of a.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; } }
          s.armies = s.armies.filter((x) => x.id !== a.id);
        }
        s.campaigns = s.campaigns.filter((x) => x.id !== cc.id);
        s.chronicle.push({ y: s.year, m: s.month, text: `${cc.leaderName}は兵を退いた。${castle.name}の攻略は成らなかった。` });
      }
      return s;
    });
  };

  // 攻め口の方角。出陣元と目標の位置関係から東西南北に振り分ける。
  const attackFace = (fromId, toId) => {
    const a = nodeById(fromId), t = nodeById(toId);
    if (!a || !t) return "S";
    const dx = a.x - t.x, dy = a.y - t.y;      // 目標から見た攻め手の向き
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "E" : "W") : (dy > 0 ? "S" : "N");
  };
  // 城下に着いた。合戦の前に、寡兵ならば奇襲の策が献じられる（GDD 8.7）
  const startBattle = (army, dest, camp, ambush) => {
    // 見物のときは画面を開かず、同じ規則で自動に解く
    if (g.autoPlay) { autoResolve(army.id, dest.id); return; }
    if (ambush === undefined) {
      const plan = ambushPlan(g, army, dest);
      if (plan) { setRaid({ plan, army, dest, camp }); return; }   // 献策を問う
    }
    setBattleMap(null);
    setFieldSeed(army.from, dest.id);      // 街道ごとに戦場が決まる
    const atkGens = army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
    const defGens = g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive);
    const playerIsAtk = army.faction === g.player;
    const defLocal = Math.max(0, dest.local - Math.round(minGarrison(dest) * 0.4));
    // 出てくる兵の総数から戦場の広さを決める
    const aidMen = g.armies.filter((a) => a.id !== army.id && a.at === dest.id
      && (a.aid === army.faction || (camp && camp.arrived.includes(a.id)))).reduce((t, a) => t + a.men, 0);
    layoutField(army.men + aidMen + defLocal + defGens.reduce((t, x) => t + x.retinue, 0));
    // 攻め口の方角に応じ、盤の四辺のどこから寄せるかを決める（GDD 8.1）
    const face = attackFace(army.from, dest.id);
    const lineup = (isAtk, i, n) => {
      const near = 0.14, far = 0.86;                 // 盤の縁からの割合
      const t2 = (i - (n - 1) / 2) * Math.round(175 * (FIELD.w / BASE.w));
      const put = (ax, ay, f2) => ({ x: ax, y: ay, f: f2 });
      const S = () => put(FIELD.w / 2 + t2, isAtk ? FIELD.h * far : FIELD.h * near, isAtk ? -Math.PI / 2 : Math.PI / 2);
      const N = () => put(FIELD.w / 2 + t2, isAtk ? FIELD.h * near : FIELD.h * far, isAtk ? Math.PI / 2 : -Math.PI / 2);
      const E = () => put(isAtk ? FIELD.w * far : FIELD.w * near, FIELD.h / 2 + t2 * 0.66, isAtk ? Math.PI : 0);
      const W = () => put(isAtk ? FIELD.w * near : FIELD.w * far, FIELD.h / 2 + t2 * 0.66, isAtk ? 0 : Math.PI);
      return face === "N" ? N() : face === "E" ? E() : face === "W" ? W() : S();
    };
    const build = (gens0, local, train, side, yBase, facing, color, srcRost, isAtk) => {
      const gens = (gens0.length ? gens0 : [{ id: `gar-${dest.id}-${side}`, name: `${dest.name}守備隊`, lead: 52, valor: 50, wit: 45, gov: 45, retinue: 0, retTrain: train }])
        .slice(0, MAX_CORPS);
      const n = gens.length, per = Math.floor(local / n);
      const najimi = dest.najimi == null ? 70 : dest.najimi;
      // 地域家臣団の名簿を隊ごとに切り分ける（欠けた組は欠けたまま）
      let pool = srcRost && srcRost.length ? JSON.parse(JSON.stringify(srcRost)) : null;
      return gens.map((gen, i) => makeCorps(
        side, { ...gen, locRost: pool ? (() => { const tk = rosterTake(pool, per); pool = tk.rest; return tk.taken; })() : null },
        gen.retinue, per,
        Math.round(gen.retTrain * 0.7 + (gen.unity || 60) * 0.3),   // 直属は結束が効く
        Math.round(train * 0.7 + najimi * 0.3),                      // 地域は馴染が効く
        ...(() => { const p2 = lineup(isAtk, i, n); return [p2.x, p2.y, p2.f]; })(), color));
    };
    const atkColor = g.factions[army.faction].color, defColor = g.factions[dest.faction].color;
    const betray = dest.intrigue && army.faction === g.player;   // 内応（GDD 11.2）
    // 同着した他家の援軍と、戦役に加わった寄騎は、自前の旗色のまま同じ側に立つ（GDD 7.4）
    const allies = g.armies.filter((a) => a.id !== army.id && a.at === dest.id
      && (a.aid === army.faction || (camp && camp.arrived.includes(a.id))));
    const atkSide = playerIsAtk ? "P" : "E";
    const atkCorpsList = build(atkGens, army.local, army.localTrain, atkSide, playerIsAtk ? FIELD.h * 0.875 : FIELD.h * 0.14,
      playerIsAtk ? -Math.PI / 2 : Math.PI / 2, atkColor, army.rost, true);
    // 援軍は本隊の脇に並ぶ
    let off = 1;
    let slots = MAX_CORPS - atkCorpsList.length;      // 参陣できる残りの隊数
    for (const a of allies) {
      if (slots <= 0) break;
      const ag = a.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
      const col = g.factions[a.faction].color;
      const kind = a.faction === army.faction ? "自領援軍"
        : relOf(g, army.faction, a.faction).state === "同盟" ? "同盟軍" : "従属軍";
      const list = build(ag.slice(0, slots), a.local, a.localTrain, atkSide,
        playerIsAtk ? FIELD.h * 0.875 : FIELD.h * 0.14,
        playerIsAtk ? -Math.PI / 2 : Math.PI / 2, col);
      slots -= list.length;
      list.forEach((c, i) => {
        c.x = FIELD.w / 2 + (off + i) * Math.round(175 * (FIELD.w / BASE.w)) * (off % 2 ? 1 : -1);
        c.ally = kind; c.allyFaction = a.faction; c.armyId = a.id;
        placeSquads(c, true);
      });
      off++;
      atkCorpsList.push(...list);
    }
    const defList = build(defGens, defLocal, dest.localTrain, playerIsAtk ? "E" : "P",
      playerIsAtk ? FIELD.h * 0.14 : FIELD.h * 0.875, playerIsAtk ? Math.PI / 2 : -Math.PI / 2, defColor, dest.rost, false);
    const P = playerIsAtk ? atkCorpsList : defList;
    const E = playerIsAtk ? defList : atkCorpsList;
    const bb = createBattle(P, E, playerIsAtk ? "P" : "E");
    // 自陣がどちらの側かを控える。攻め口の方角で変わるので、下側に決め打ちできない。
    bb.face = face;
    bb.myFar = playerIsAtk;      // 寄せ手は遠い側（far）から入る
    if (betray) {
      for (const c of bb.corps) if (c.side === "E") { c.morale -= 18; for (const q of c.squads) q.cohesion -= 10; }
      bb.log.push({ t: 0, text: "城内の内応者が動き、守り手の士気が乱れている。" });
    }
    // 合戦の前に本陣を衝いた首尾を、盤の上に映す（GDD 8.7）
    if (ambush && ambush.done) {
      const mySide = ambush.atkIsPlayer ? "P" : "E";
      const foeSide = mySide === "P" ? "E" : "P";
      if (ambush.hit) {
        // 敵の総大将を討った。その隊は消え、残る敵は大きく崩れる。
        const tgt = ambush.target && bb.corps.find((c) => c.side === foeSide && c.id === ambush.target.id);
        if (tgt) { tgt.destroyed = true; tgt.order = "待機"; for (const q of tgt.squads) q.men = 0; }
        for (const c of bb.corps) {
          if (c.side !== foeSide || c === tgt) continue;
          c.morale = clamp(c.morale - 42, 5, 100);
          for (const q of c.squads) q.cohesion = clamp(q.cohesion - 26, 0, 100);
        }
        for (const c of bb.corps) if (c.side === mySide) c.morale = Math.min(100, c.morale + 12);
        bb.notices = [{ t: 0, kind: mySide === "P" ? "good" : "bad",
          text: `${ambush.head.name}が本陣を衝いた${ambush.target ? `。${ambush.target.name}討死` : ""}` }];
        bb.log.push({ t: 0, text: `${ambush.head.name}が敵の本陣を衝いた。${ambush.target ? `${ambush.target.name}は討たれ、` : ""}敵軍は崩れている。` });
        bb.ambushHit = true;
      } else {
        // 伏勢が露見した。こちらの士気が落ちる。
        for (const c of bb.corps) {
          if (c.side !== mySide) continue;
          c.morale = clamp(c.morale - 20, 5, 100);
          for (const q of c.squads) q.cohesion = clamp(q.cohesion - 10, 0, 100);
        }
        bb.notices = [{ t: 0, kind: mySide === "P" ? "bad" : "good", text: "伏勢が露見した" }];
        bb.log.push({ t: 0, text: `${ambush.head.name}の伏勢は露見した。味方の士気が落ちている。` });
      }
    }
    setBattle({
      b: bb, armyId: army.id, castleId: dest.id, playerIsAtk, campId: camp ? camp.id : null,
      pName: g.factions[playerIsAtk ? army.faction : dest.faction].name,
      eName: g.factions[playerIsAtk ? dest.faction : army.faction].name,
      pColor: playerIsAtk ? atkColor : defColor, eColor: playerIsAtk ? defColor : atkColor,
      place: dest.name,
    });
  };

  const finishAssault = (b, ctx) => {
    setBattleMap(null);
    setG((prev) => {
      const s = structuredClone(prev);
      const army = s.armies.find((x) => x.id === ctx.armyId);
      const castle = s.castles.find((x) => x.id === ctx.castleId);
      if (!castle) { setBattle(null); return s; }
      const atkSide = ctx.playerIsAtk ? "P" : "E";
      const won = !!b.captured || b.result === atkSide;
      const atkCorps = b.corps.filter((c) => c.side === atkSide);
      const defCorps = b.corps.filter((c) => c.side !== atkSide);
      writeBackRosters(s, b, [...atkCorps, ...defCorps], army, castle);
      for (const c of [...atkCorps, ...defCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (gen && !gen.rost) gen.retinue = Math.max(0, Math.round(gen.retinue - c.loss["直属"]));
      }
      const left = (corps) => Math.round(corps.reduce((a, c) => a + c.squads.filter((q) => q.origin === "地域").reduce((t, q) => t + q.men, 0), 0));
      const aLeft = left(atkCorps), dLeft = left(defCorps);
      // 戦場の外に控えていた後詰を軍へ戻す
      const back = ctx.reserveMen || 0;
      if (army) {
        if (ctx.reserveRost && ctx.reserveRost.length) army.rost = [...(army.rost || []), ...ctx.reserveRost];
        army.local = aLeft + back;
        if (army.rost) rosterSync(army, "rost", army.local, `arm-${army.id}`);
        army.men = army.local + atkCorps.reduce((a, c) => a + (s.generals.find((x) => x.id === c.id)?.retinue || 0), 0);
      }
      castle.local = Math.max(0, dLeft);
      if (castle.rost) rosterSync(castle, "rost", castle.local, `loc-${castle.id}`);
      const broke = b.map.gates.filter((gt) => gt.broken).length;
      castle.hp = Math.max(0, castle.hp - Math.round(castle.hp * 0.15 * broke));
      castle.def = Math.max(0, Math.round(castle.def * (1 - 0.08 * broke)));
      const aLoss = atkCorps.reduce((a, c) => a + c.loss["直属"] + c.loss["地域"], 0) | 0;
      const dLoss = defCorps.reduce((a, c) => a + c.loss["直属"] + c.loss["地域"], 0) | 0;
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${castle.name}への強攻。${broke}つの門が破れ、寄せ手${fmt(aLoss)}人・守り手${fmt(dLoss)}人を失った。${won ? "城は落ちた。" : "寄せ手は退けられた。"}` });
      if (won && army) { army.local = aLeft; sackCastle(s, castle, army, true); }
      // 武将の生死（GDD 12.3）
      for (const c of [...atkCorps, ...defCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (!gen || c.detach) continue;
        const lossRate = 1 - corpsMen(c) / Math.max(1, corpsMax(c));
        let risk = lossRate * 0.55 + (c.routed ? 0.2 : 0) + (c.destroyed ? 0.3 : 0) - gen.valor / 420 + Math.random() * 0.3 - 0.15;
        if (risk <= 0.66) continue;
        if (risk > 0.78) {
          // 討死。跡目は家督の定めに従う。
          notify(b, `${gen.name}、討死。`, c.side === "P" ? "bad" : "good");
          const heir = s.generals.find((x) => x.faction === gen.faction && x.id !== gen.id && !x.captive);
          if (heir) heir.retinue += Math.round(gen.retinue * 0.5);
          const wasLord = gen.lord;
          s.generals = s.generals.filter((x) => x.id !== gen.id);
          if (wasLord) {
            if (gen.faction === s.player) s.succession = { dead: gen, cause: "討死した" };
            else succeed(s, gen, "討死した");
          } else s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が討死した。` });
        } else {
          // 捕縛。盤上から消さず、捕虜として相手の手に落ちる（GDD 12.3）。
          const winner = c.side === "P"
            ? (ctx.playerIsAtk ? dest.faction : army.faction)
            : (ctx.playerIsAtk ? army.faction : dest.faction);
          const g2 = s.generals.find((x) => x.id === gen.id);
          if (!g2) continue;
          notify(b, `${gen.name}、捕縛。`, c.side === "P" ? "bad" : "good");
          g2.captive = { by: winner, from: g2.faction, at: dest.id, since: { y: s.year, m: s.month } };
          g2.retinue = Math.round(g2.retinue * 0.3);
          g2.at = dest.id;
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${gen.name}は${s.factions[winner].name}に捕らえられた。` });
        }
      }
      if (b.result === "P" && !ctx.playerIsAtk) {
        const hero = b.corps.filter((c) => c.side === "P").find((c) => c.feats.length || c.loss["直属"] > 60);
        const lord = hero && s.generals.find((x) => x.id === hero.id);
        if (lord && Math.random() < 0.6) s.promo = makePromotion(lord, s.generals);
      }
      return s;
    });
    setBattle(null);
  };

  // 合戦の損害を組の名簿へ書き戻す。欠けた組は欠けたまま残る。
  const writeBackRosters = (s, b, corpsList, army, castle) => {
    const survive = new Map();                       // 組の id → 生き残り
    for (const c of corpsList) for (const q of c.squads) {
      if (!q.src) continue;
      survive.set(q.src, (survive.get(q.src) || 0) + Math.max(0, Math.round(q.men)));
    }
    const apply = (rost) => {
      if (!rost) return [];
      for (const q of rost) if (survive.has(q.id)) q.m = survive.get(q.id);
      return rost.filter((q) => q.m > 0);
    };
    for (const c of corpsList) {
      const gen = s.generals.find((x) => x.id === c.id);
      if (gen && gen.rost) { gen.rost = apply(gen.rost); gen.retinue = rosterSum(gen.rost); }
    }
    if (army && army.rost) { army.rost = apply(army.rost); army.local = rosterSum(army.rost); }
    if (castle && castle.rost) { castle.rost = apply(castle.rost); }
  };

  const finishBattle = (b, ctx) => {
    if (ctx.mode === "castle") return finishAssault(b, ctx);
    setG((prev) => {
      const s = structuredClone(prev);
      const army = s.armies.find((x) => x.id === ctx.armyId);
      const castle = s.castles.find((x) => x.id === ctx.castleId);
      const draw = b.result === "日没";
      const playerWon = b.result === "P";
      const atkWon = draw ? false : (ctx.playerIsAtk ? playerWon : !playerWon);
      const side = (sd) => b.corps.filter((c) => c.side === sd);
      const atkCorps = ctx.playerIsAtk ? side("P") : side("E");
      const defCorps = ctx.playerIsAtk ? side("E") : side("P");
      writeBackRosters(s, b, [...atkCorps, ...defCorps], army, castle);
      for (const c of [...atkCorps, ...defCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (gen && !gen.rost) gen.retinue = Math.max(0, Math.round(gen.retinue - c.loss["直属"]));
      }
      const left = (corps) => Math.round(corps.reduce((a, c) => a + c.squads.filter((q) => q.origin === "地域").reduce((t, q) => t + q.men, 0), 0));
      const atkLeft = left(atkCorps), defLeft = left(defCorps);
      if (army) { army.local = atkLeft; army.men = atkLeft + atkCorps.reduce((a, c) => a + (s.generals.find((x) => x.id === c.id)?.retinue || 0), 0); }
      // 城に残った守備兵の名簿も欠けたまま持ち越す
      const keep = Math.round(minGarrison(castle) * 0.4);
      castle.local = Math.max(0, keep + defLeft);
      if (castle.rost) rosterSync(castle, "rost", castle.local, `loc-${castle.id}`);
      s.chronicle.push({ y: s.year, m: s.month,
        text: draw ? `${castle.name}下の野戦は日没により決着せず、両軍が兵を退いた（天候：${b.weather}）。`
          : `${castle.name}下の野戦。${atkWon ? "攻め手" : "守り手"}が勝利した（天候：${b.weather}${b.orderly ? "・統制撤退" : ""}）。` });
      // 武将の生死（GDD 12.3）
      for (const c of [...atkCorps, ...defCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (!gen || c.detach) continue;
        const lossRate = 1 - corpsMen(c) / Math.max(1, corpsMax(c));
        let risk = lossRate * 0.55 + (c.routed ? 0.2 : 0) + (c.destroyed ? 0.3 : 0)
          + ((c.frontTime || 0) > 40 ? 0.12 : 0) - gen.valor / 420 - (b.orderly ? 0.12 : 0);
        risk += Math.random() * 0.3 - 0.15;
        let fate = null;
        if (risk > 0.78) fate = "討死";
        else if (risk > 0.58 && Math.random() < captureChance(gen) * (1 + (c.routed ? 1.4 : 0))) fate = "捕縛";
        if (fate) notify(b, `${gen.name}、${fate}。`, c.side === "P" ? "bad" : "good");
        else if (risk > 0.52) fate = "重傷"; else if (risk > 0.34) fate = "軽傷";
        if (!fate) continue;
        if (fate === "捕縛") {
          // 捕らえた側の勢力と、その者を収める城
          const winner = b.result === "P" ? (ctx.playerIsAtk ? army.faction : castle.faction)
            : (ctx.playerIsAtk ? castle.faction : army.faction);
          const hold = winner === castle.faction ? castle.id
            : (s.castles.find((x) => x.faction === winner) || castle).id;
          const heir = s.generals.find((x) => x.faction === gen.faction && x.id !== gen.id && !x.captive);
          if (heir) heir.retinue += Math.round(gen.retinue * 0.5);
          if (gen.lord) {
            const next = s.generals.filter((x) => x.faction === gen.faction && x.id !== gen.id && !x.captive)
              .sort((a, z) => z.lead - a.lead)[0];
            if (next) { next.lord = true; gen.lord = false; }
          }
          makePrisoner(s, gen, winner, hold);
          s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が捕らえられた。` });
          if (winner === s.player) s.captives = [...(s.captives || []), gen.id];   // 処遇を問う
        } else if (fate === "討死") {
          const heir = s.generals.find((x) => x.faction === gen.faction && x.id !== gen.id);
          if (heir) heir.retinue += Math.round(gen.retinue * 0.5);
          s.generals = s.generals.filter((x) => x.id !== gen.id);
          if (gen.lord) {
            if (gen.faction === s.player) s.succession = { dead: gen, cause: "討死した" };
            else succeed(s, gen, "討死した");
          } else s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が討死した。` });
        } else if (fate === "重傷") {
          gen.hurt = 3; gen.unity = Math.max(20, (gen.unity || 60) - 8);
          s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が重傷を負い、しばらく戦えない。` });
        } else {
          s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が軽傷を負った。` });
        }
      }

      if (atkWon && army) {
        if (castle.local < 200) {
          army.local = atkLeft;
          sackCastle(s, castle, army, true);
        } else {
          army.sieging = true;
          s.sieges = [...s.sieges.filter((x) => x.castleId !== castle.id), { castleId: castle.id, armyId: army.id, months: 0, decided: null }];
        }
      } else if (army) {
        const home = s.castles.find((x) => x.id === army.from);
        if (home) { home.local += atkLeft; for (const gid of army.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; } }
        s.armies = s.armies.filter((x) => x.id !== army.id);
      }
      // 援軍は損害を反映して帰国させる
      for (const a of [...s.armies]) {
        const corpsOf = b.corps.filter((c) => c.armyId === a.id);
        if (!corpsOf.length) continue;
        const men = corpsOf.reduce((t, c) => t + c.squads.filter((q) => q.origin === "地域").reduce((u, q) => u + q.men, 0), 0);
        const home = s.castles.find((x) => x.id === a.from);
        if (home) { home.local += Math.round(men); for (const gid of a.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; } }
        s.armies = s.armies.filter((x) => x.id !== a.id);
        s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[a.faction].name}の援軍は${Math.round(men)}人を残して引き揚げた。` });
      }
      if (playerWon) {
        const hero = side("P").find((c) => c.feats.length || c.loss["直属"] > 60);
        const lord = hero && s.generals.find((x) => x.id === hero.id);
        if (lord && Math.random() < 0.7) s.promo = makePromotion(lord, s.generals);
      }
      s.pendingArrivals = (s.pendingArrivals || []).slice(1);
      if (ctx.campId) s.campaigns = (s.campaigns || []).filter((x) => x.id !== ctx.campId);
      return s;
    });
    setBattle(null);
  };

  const resolveSiege = (mode, gate, kits) => {
    setG((prev) => {
      const s = structuredClone(prev);
      const key = `${s.year}-${s.month}`;
      // 自勢力に関係しない包囲は自動で進める
      for (const other of s.sieges) {
        const a2 = s.armies.find((x) => x.id === other.armyId);
        const c2 = s.castles.find((x) => x.id === other.castleId);
        if (a2 && c2 && a2.faction !== s.player && c2.faction !== s.player) other.decided = key;
      }
      const sg = s.sieges.find((x) => x.decided !== key);
      if (!sg) return s;
      sg.decided = key;
      const castle = s.castles.find((x) => x.id === sg.castleId);
      const army = s.armies.find((x) => x.id === sg.armyId);
      if (!army) { s.sieges = s.sieges.filter((x) => x !== sg); return s; }
      army.sieging = true;
      if (mode === "兵糧攻め") {
        sg.months++;
        // 包囲率。取り囲む軍の数と兵力差で決まり、締め方と援軍の入りやすさを左右する。
        const besieging = s.armies.filter((x) => x.target === castle.id && x.sieging);
        const dGens = s.generals.filter((x) => x.at === castle.id && x.faction === castle.faction && !x.captive);
        const dMen = castle.local + dGens.reduce((a, x) => a + x.retinue, 0);
        const enc = clamp(0.28 + 0.18 * besieging.length + 0.36 * Math.min(1, army.men / Math.max(1, dMen * 1.5)), 0.2, 1);
        sg.enc = Math.round(enc * 100);
        castle.food = Math.max(0, castle.food - Math.round((castle.local * 0.35 + 600) * (0.6 + enc) * (castle.intrigue ? 1.8 : 1)));
        // 井戸が傷んでいれば水に窮する
        const well = castle.well == null ? 100 : castle.well;
        const thirst = well < 50 ? (50 - well) / 12 : 0;
        castle.min = Math.max(0, castle.min - (castle.intrigue ? 11 : 5) - thirst);
        if (thirst > 0 && sg.months % 2 === 0) {
          s.chronicle.push({ y: s.year, m: s.month, text: `${castle.name}は水に窮している（井戸${Math.round(well)}）。` });
        }
        // 疫病。長引くほど、また囲みが緩いほど起こりやすい。
        if (Math.random() < 0.045 * sg.months * (1.4 - enc)) {
          const a1 = Math.round(army.men * (0.04 + Math.random() * 0.05));
          const d1 = Math.round(castle.local * (0.05 + Math.random() * 0.06));
          army.men -= a1; army.local = Math.max(0, army.local - a1);
          castle.local = Math.max(0, castle.local - d1);
          castle.min = Math.max(0, castle.min - 4);
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${castle.name}の囲みに疫病が出た。寄せ手${fmt(a1)}人、城方${fmt(d1)}人を失った。` });
        }
        army.food -= Math.round(army.men * 0.09);
        if (castle.food <= 0 || castle.min < 25) {
          s.chronicle.push({ y: s.year, m: s.month, text: `兵糧尽き、${castle.name}は開城した。` });
          sackCastle(s, castle, army, false);     // 開城なので城下の荒れは軽い
        }
      } else if (mode === "強攻") {
        // 城門攻撃隊を出すと城防の効きが3割落ち、守り手の損害が25%増す。
        // 代わりに門へ取り付いた300人のうち4分の1が失われる。
        const gateOK = gate && army.men >= 540;
        const defPower = castle.local + castle.def * 14 * (gateOK ? 0.7 : 1);
        const ratio = army.men / Math.max(1, defPower);
        let aL = Math.round(army.men * clamp(0.34 / ratio, 0.08, 0.55));
        if (gateOK) aL = Math.round(aL * 0.85 + 300 * 0.25);
        const dL = Math.round(castle.local * clamp(0.5 * ratio, 0.1, 0.85) * (gateOK ? 1.25 : 1));
        army.men -= aL; army.local = Math.max(0, army.local - aL);
        castle.local = Math.max(0, castle.local - dL);
        castle.hp = Math.max(0, castle.hp - Math.round(dL * 1.5 * (gateOK ? 1.6 : 1)));
        if (gateOK) s.chronicle.push({ y: s.year, m: s.month, text: `${castle.name}の城門へ攻撃隊を差し向けた。` });
        if (castle.local < 120) {
          s.chronicle.push({ y: s.year, m: s.month, text: `${castle.name}、強攻により陥落。攻め手${fmt(aL)}人、守り手${fmt(dL)}人を失った。` });
          sackCastle(s, castle, army, true);
        } else {
          s.chronicle.push({ y: s.year, m: s.month, text: `${castle.name}への強攻は退けられた。攻め手${fmt(aL)}人を失った。` });
        }
      } else {
        const home = s.castles.find((x) => x.id === army.from);
        if (home) { home.local += army.local; for (const gid of army.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; } }
        s.armies = s.armies.filter((x) => x.id !== army.id);
        s.sieges = s.sieges.filter((x) => x !== sg);
      }
      return s;
    });
  };

  // 包囲中の選択。強攻を選べば城郭図の上での戦いに移る。
  // 第三引数は、強攻なら攻城の道具、防衛なら出撃の別。
  const onSiegeChoice = (mode, gate, extra) => {
    const kits = mode === "強攻" ? extra : null;
    const sortie = mode === "防衛" ? extra : null;
    const sg = g.sieges.find((x) => {
      if (x.decided === `${g.year}-${g.month}`) return false;
      const a2 = g.armies.find((y) => y.id === x.armyId), c2 = g.castles.find((y) => y.id === x.castleId);
      return a2 && c2 && (a2.faction === g.player || c2.faction === g.player);
    });
    if (!sg) return;
    const army = g.armies.find((x) => x.id === sg.armyId);
    const mark = () => setG((p) => {
      const s = structuredClone(p);
      const x = s.sieges.find((y) => y.castleId === sg.castleId);
      if (x) x.decided = `${s.year}-${s.month}`;
      return s;
    });
    if (mode === "強攻" && army && army.faction === g.player) { mark(); startAssault(sg, gate, kits); return; }
    if (mode === "防衛") {
      mark();
      // 寄せ手が攻めかかるかは向こうの判断。三度に一度ほど城壁に取り付く。
      if (Math.random() < 0.34) { startAssault({ ...sg, sortie }, army && army.men >= 540); return; }
      resolveSiege("兵糧攻め");
      return;
    }
    resolveSiege(mode, gate, kits);
  };

  const launchSortie = (p) => {
    if (!p.to || !findPath(p.from, p.to)) return;      // 行けない目標は受け付けない
    setG((prev) => {
      const s = structuredClone(prev);
      // 寄騎（援軍）を出す。各城は守備最低数と距離、従属度から派遣を決める（GDD 7.3）
      for (const req of (p.reinforce || [])) {
        const rc2 = s.castles.find((x) => x.id === req.castleId);
        if (!rc2) continue;
        if (req.reason) {
          s.chronicle.push({ y: s.year, m: s.month, text: `${rc2.name}は兵を出せなかった（${req.reason}）。` });
          continue;
        }
        if (Math.random() > req.chance) {
          const rel = s.relations[relKey(s.player, rc2.faction)];
          if (rel) rel.trust = clamp(rel.trust - 4, 0, 100);
          s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[rc2.faction].name}は寄騎の求めに応じなかった。` });
          continue;
        }
        const rgens = s.generals.filter((x) => x.at === rc2.id && x.faction === rc2.faction && !x.captive);
        const send = Math.min(req.men, Math.max(0, rc2.local));
        if (send < 100 || !rgens.length) continue;
        const take = [...rgens].sort((a, z) => z.lead - a.lead).slice(0, 1);
        rc2.local -= send;
        rc2.food -= Math.round(send * 0.6);
        for (const t of take) t.at = null;
        const path = findPath(rc2.id, p.to);
        s.armies.push({
          id: `r${Date.now()}${Math.round(Math.random() * 1e6)}`, faction: rc2.faction, from: rc2.id,
          gens: take.map((x) => x.id), local: send, localTrain: rc2.localTrain,
          rost: (() => { const tk = rosterTake(rc2.rost || newRoster(rc2.local + send, `loc-${rc2.id}`), send); rc2.rost = tk.rest; return tk.taken; })(),
          men: send + take.reduce((a, x) => a + x.retinue, 0), at: rc2.id,
          path, prog: 0, food: Math.round(send * 0.6), target: p.to, aid: s.player,
        });
        s.chronicle.push({ y: s.year, m: s.month,
          text: `${rc2.name}より寄騎${fmt(send)}人（${take[0].name}）が${nodeById(p.to).name}へ向かう（約${req.months}か月）。` });
      }
      const c = s.castles.find((x) => x.id === p.from);
      const dest = s.castles.find((x) => x.id === p.to);
      // 不可侵・同盟を破れば「裏切り」として信用と威信を失う
      if (dest && dest.faction !== s.player && atPeace(s, s.player, dest.faction)) {
        const r = s.relations[relKey(s.player, dest.faction)];
        r.state = "中立"; r.until = null; r.trust = 0;
        for (const k of Object.keys(s.relations)) if (k.includes(s.player)) s.relations[k].trust = clamp(s.relations[k].trust - 15, 0, 100);
        s.factions[s.player].prestige = clamp(s.factions[s.player].prestige - 12, 0, 100);
        for (const x of s.generals.filter((q) => q.faction === s.player && !q.lord)) x.loyal = Math.max(0, x.loyal - 5);
        s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[dest.faction].name}との約束を破って兵を出した。裏切りとして周辺勢力の警戒を招いた。` });
      }
      c.local -= p.local; c.food -= p.food;
      const mainId = `a${Date.now()}`;
      const takeMain = rosterTake(c.rost || newRoster(c.local + p.local, `loc-${c.id}`), p.local);
      c.rost = takeMain.rest;
      s.armies.push({
        id: mainId, faction: s.player, from: p.from, gens: p.gens, local: p.local, rost: takeMain.taken,
        localTrain: c.localTrain, men: p.local + p.gens.reduce((a, id) => a + s.generals.find((x) => x.id === id).retinue, 0),
        at: p.from, path: findPath(p.from, p.to), prog: 0, food: p.food, target: p.to,
      });
      for (const gid of p.gens) s.generals.find((x) => x.id === gid).at = null;
      // 戦役を起こす。総大将は出陣を発した城の城主。
      const lead = s.generals.find((x) => x.id === (c.lordId || p.gens[0]));
      const camp = {
        id: `c${Date.now()}`, target: p.to, from: p.from,
        leader: lead ? lead.id : p.gens[0], leaderName: lead ? lead.name : "総大将",
        armies: [mainId], arrived: [], y: s.year, m: s.month, decided: null, waited: 0,
      };
      for (const a of s.armies) if (a.aid === s.player && a.target === p.to && !camp.armies.includes(a.id)) camp.armies.push(a.id);
      s.campaigns = [...(s.campaigns || []), camp];
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${c.name}より出陣。総大将は${camp.leaderName}。${nodeById(p.to).name}を攻める。` });
      return s;
    });
    setModal(null);
  };

  const totalMen = mine.reduce((a, c) => a + c.local, 0) + myGens.filter((x) => x.at).reduce((a, x) => a + x.retinue, 0)
    + g.armies.filter((a) => a.faction === g.player).reduce((a, x) => a + x.men, 0);
  const openCamp = (g.campaigns || []).find((c) => c.decided !== `${g.year}-${g.month}` && c.arrived.length > 0);
  const openSiege = g.sieges.find((x) => {
    if (x.decided === `${g.year}-${g.month}`) return false;
    const a2 = g.armies.find((y) => y.id === x.armyId), c2 = g.castles.find((y) => y.id === x.castleId);
    return a2 && c2 && (a2.faction === g.player || c2.faction === g.player);
  });
  const selCastle = g.castles.find((c) => c.id === sel);

  // 合戦中は戦略画面の帯を出さず、画面全体を戦場にする（GDD 15.1）
  if (battle) return <BattleScreen key={battle.armyId} ctx={battle} land={land} onEnd={(bb) => finishBattle(bb, battle)} />;

  return (
    <div className="sp" style={{ height: "100dvh" }}>
      {!wide && (
      <div className="bar">
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span className="dot" style={{ background: pf.color }} />
          <b className="mn" style={{ fontSize: 16 }}>{pf.name}</b>
        </span>
        <span className="kv num"><b>{g.year}年 {g.month}月</b>
          <span style={{ background: "#EFEDE4", borderRadius: 3, padding: "1px 6px", fontSize: 11 }}>{SEASON(g.month)}</span></span>
        <span className="kv">石高 <b className="num">{man(mine.reduce((a, c) => a + c.koku, 0))} 万石</b></span>
        <span className="kv">兵数 <b className="num">{fmt(totalMen)}</b></span>
        <span className="kv">金銭 <b className="num">{fmt(pf.gold)} 貫</b></span>
        <span className="kv">拠点 <b className="num">{mine.length} 城</b></span>
        {(() => {
          const cr = courtRank(g, g.player);
          if (!cr) return null;
          return (
            <span className="kv" style={{ color: "#8A6A2A" }}>
              <b>{cr.key}</b>（兵×{cr.troop}）
            </span>
          );
        })()}
        {(() => {
          const lord = g.generals.find((x) => x.faction === g.player && x.lord && !x.captive);
          if (!lord || !needsGuardian(lord)) return null;
          const gd = actingHead(g, g.player);
          return (
            <span className="kv" style={{ color: "#8A5A3A" }}>
              当主 <b>{lord.name}</b>（{lord.age}歳）は幼年。
              {gd && gd.id !== lord.id ? <> <b>{gd.name}</b>が後見</> : " 後見なし"}
            </span>
          );
        })()}
        <span style={{ flex: 1 }} />
        <select className="sel" value={pf.mobilization}
          onChange={(e) => setG((p) => { const s = structuredClone(p); s.factions[s.player].mobilization = +e.target.value; return s; })}>
          {MOB_POLICY.map((m, i) => <option key={m.name} value={i}>{`動員：${m.name}（一万石 ${m.per}人）`}</option>)}
        </select>
        <button className="btn sm" onClick={() => setModal("chronicle")}>戦国記</button>
        <button className="btn sm" onClick={async () => { const ok = await onSave(g); setSavedMsg(ok ? "記録した" : "記録できない環境"); setTimeout(() => setSavedMsg(""), 2000); }}>
          記録{savedMsg ? `：${savedMsg}` : ""}
        </button>
        <button className="btn sm" onClick={onTitle}>タイトル</button>
        <button className="btn dark sm" disabled={!!battle || !!openSiege} onClick={nextMonth}>次月へ</button>
      </div>
      )}

      <div className="mapwrap" ref={wrapRef}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => (drag.current = null)}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        onWheel={(e) => { if (e.target === cvRef.current) zoom(e.deltaY < 0 ? 1.12 : 0.89); }}>
        <canvas ref={cvRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
        <div className="mapctl l" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
          <div className="mbtn" onClick={() => zoom(1.25)}><b>＋</b>拡大</div>
          <div className="mbtn" onClick={() => zoom(0.8)}><b>−</b>縮小</div>
          <div className="mbtn" onClick={() => focus(mine[0] && mine[0].id)}><b>◎</b>本拠</div>
          <div className="mbtn" onClick={whole}><b>⛶</b>全体図</div>
          <div className={`mbtn ${wide ? "on" : ""}`} onClick={() => setWide((v) => !v)}>
            <b>{wide ? "▤" : "⤢"}</b>{wide ? "戻す" : "広く"}
          </div>
        </div>
        {!wide && (
          <div className="mapctl r" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("factions")}><b>⚑</b>勢力情報</div>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("generals")}><b>☗</b>武将一覧</div>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("goal")}><b>◈</b>攻略目標</div>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("chronicle")}><b>▤</b>履歴</div>
          </div>
        )}
        {!wide && <canvas className="mini" ref={miniRef} onClick={whole} />}
        {wide && (
          <div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 6, display: "flex", gap: 8, alignItems: "center",
            background: "rgba(255,255,255,.94)", border: `1px solid ${U.line}`, borderRadius: 20, padding: "6px 12px", fontSize: 12 }}>
            <span className="dot" style={{ background: pf.color }} />
            <b className="mn">{pf.name}</b>
            <span className="num">{g.year}年{g.month}月</span>
            <span className="num">兵{fmt(totalMen)}</span>
            <button className="btn sm" disabled={!!battle || !!openSiege || !!openCamp} onClick={nextMonth}>次月へ</button>
          </div>
        )}
        {!sel && !wide && <div className="hint">城をタップすると詳細が開きます</div>}


        {selCastle && (
          <CastleSheet g={g} castle={selCastle} land={land} tab={tab} setTab={setTab}
            onClose={() => setSel(null)} onCommand={runCommand} onAppoint={appoint}
            onSortie={() => setModal("sortie")} onDiplo={doDiplo} onPlot={doPlot}
            onSpecial={doSpecial} onReward={reward} onCaptive={doCaptive} onFief={grantFief} onRetire={doRetire} onSettle={settleCaptive} onKenchi={doKenchi} />
        )}
        {modal === "sortie" && selCastle && <SortieDialog g={g} from={selCastle.id} onClose={() => setModal(null)} onGo={launchSortie} />}
        {modal === "report" && <MonthReport g={g} onClose={() => setModal(null)} />}
        {modal === "chronicle" && <Chronicle g={g} onClose={() => setModal(null)} />}
        {modal === "factions" && <FactionInfo g={g} onClose={() => setModal(null)} />}
        {modal === "generals" && <GeneralList g={g} onClose={() => setModal(null)} />}
        {modal === "goal" && <GoalPanel g={g} onClose={() => setModal(null)} />}
        {openCamp && !battle && <CampaignPanel g={g} camp={openCamp} onAct={campaignAct} />}
        {openSiege && !battle && !openCamp && <SiegePanel g={g} sg={openSiege} onChoose={onSiegeChoice} />}
        {(g.captives || []).length > 0 && (() => {
          const gen = g.generals.find((x) => x.id === g.captives[0]);
          if (!gen) { setG((p) => { const s = structuredClone(p); s.captives = s.captives.slice(1); return s; }); return null; }
          return <CaptiveDialog g={g} gen={gen} onDone={(how) => setG((p) => {
            const s = structuredClone(p);
            const q = s.generals.find((x) => x.id === gen.id);
            s.captives = (s.captives || []).filter((id) => id !== gen.id);
            if (!q) return s;
            const log = (t) => s.chronicle.push({ y: s.year, m: s.month, text: t });
            if (how === "登用") {
              q.faction = s.player; q.captive = null;
              q.loyal = clamp(45 + Math.random() * 20, 0, 100);
              q.retinue = Math.round(140 + Math.random() * 120);
              log(`${q.name}が降り、${s.factions[s.player].name}に属した。`);
            } else if (how === "逃す") {
              const home = s.castles.find((c) => c.faction === q.captive.from) || s.castles[0];
              q.captive = null; q.at = home.id; q.retinue = Math.round(180 + Math.random() * 120);
              q.loyal = clamp((q.loyal == null ? 60 : q.loyal) + 6, 0, 100);
              log(`${q.name}を放った。${home.name}へ帰った。`);
            } else if (how === "斬首") {
              s.generals = s.generals.filter((x) => x.id !== q.id);
              log(`${q.name}を斬った。`);
            } else {
              log(`${q.name}を捕虜として留め置いた。`);
            }
            return s;
          })} />;
        })()}
        {g.ransomOffer && (() => {
          const o = g.ransomOffer;
          const gen = g.generals.find((x) => x.id === o.genId);
          if (!gen) { setG((p) => { const s = structuredClone(p); s.ransomOffer = null; return s; }); return null; }
          const from = g.factions[o.from];
          return (
            <div className="modal">
              <div className="card">
                <div className="mn" style={{ fontSize: 18 }}>{from.name}より身代金の申し出</div>
                <div style={{ fontSize: 12.5, color: U.dim, marginTop: 8, lineHeight: 1.9 }}>
                  捕虜の<b>{gen.name}</b>（{o.rank}の器量）を返してほしいという。<br />
                  差し出す身代金は<b>金 {fmt(o.gold)}貫</b>と<b>兵糧 {fmt(o.food)}石</b>。
                </div>
                <div className="g2" style={{ marginTop: 12 }}>
                  <button className="btn dark" onClick={() => setG((p) => {
                    const s = structuredClone(p);
                    const q = s.generals.find((x) => x.id === o.genId);
                    if (q && q.captive) {
                      const paid = payRansom(s, q);
                      const rel = s.relations[relKey(s.player, o.from)];
                      if (rel) rel.trust = clamp(rel.trust + 5, 0, 100);
                      s.chronicle.push({ y: s.year, m: s.month,
                        text: `${s.factions[o.from].name}より身代金を受け、${q.name}を返した（金${fmt(paid.gold)}貫・兵糧${fmt(paid.food)}石）。` });
                    }
                    s.ransomOffer = null; return s;
                  })}>受ける</button>
                  <button className="btn" onClick={() => setG((p) => {
                    const s = structuredClone(p);
                    const rel = s.relations[relKey(s.player, o.from)];
                    if (rel) rel.trust = clamp(rel.trust - 6, 0, 100);
                    s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[o.from].name}の身代金の申し出を退けた。` });
                    s.ransomOffer = null; return s;
                  })}>退ける</button>
                </div>
              </div>
            </div>
          );
        })()}
        {raid && (() => {
          const r = raid.plan;
          const atkIsPlayer = raid.army.faction === g.player;
          const pct = Math.round(r.p * 100);
          const wx = r.weather === "雨" ? "雨が降っている" : r.weather === "雪" ? "雪が舞っている"
            : r.weather === "曇" ? "空は曇っている" : "空は晴れている";
          const tr = r.terr === "hill" ? "山がちの地" : "森の多い地";
          return (
            <div className="modal">
              <div className="card">
                <div className="mn" style={{ fontSize: 20 }}>{raid.dest.name}下・軍議</div>
                <div style={{ fontSize: 13, color: U.dim, margin: "10px 0", lineHeight: 1.9 }}>
                  味方 <b style={{ color: U.text }}>{fmt(r.myMen)}人</b>　対　
                  敵 <b style={{ color: U.text }}>{fmt(r.foeMen)}人</b>
                  （{(r.ratio * 10).toFixed(1)}割の兵）<br />
                  {wx}。{tr}である。
                </div>
                <div style={{ borderLeft: `3px solid ${U.line}`, paddingLeft: 12, margin: "12px 0", lineHeight: 1.9, fontSize: 14 }}>
                  <b>{r.head.name}</b>（知略{r.head.wit}・統率{r.head.lead}）が申し出ております。<br />
                  <span style={{ color: U.dim }}>
                    「正面から当たっては勝ち目がござらぬ。
                    {r.target ? `${r.target.name}の本陣を衝きまする。` : "敵の本陣を衝きまする。"}」
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  成算は<b style={{ color: pct >= 30 ? "#3E7A3A" : pct >= 15 ? "#C89A3A" : "#B0483C", fontSize: 17 }}>およそ{pct}％</b>。<br />
                  <span style={{ color: U.dim, fontSize: 12.5 }}>
                    当たれば敵の総大将を討ち、敵軍は崩れた形で合戦が始まる。<br />
                    外せば伏勢が露見し、味方の士気が落ちたまま戦うことになる。
                  </span>
                </div>
                <div className="g2" style={{ marginTop: 16 }}>
                  <button className="btn dark" onClick={() => {
                    const hit = Math.random() < r.p;
                    const { army, dest, camp } = raid;
                    setRaid(null);
                    if (hit && r.target) {
                      setG((p2) => {
                        const s2 = structuredClone(p2);
                        const t2 = s2.generals.find((x) => x.id === r.target.id);
                        if (t2) {
                          s2.generals = s2.generals.filter((x) => x.id !== t2.id);
                          if (t2.lord) {
                            const nx = s2.generals.filter((x) => x.faction === t2.faction && !x.captive)
                              .sort((a, z) => z.lead - a.lead)[0];
                            if (nx) nx.lord = true;
                          }
                          s2.chronicle.push({ y: s2.year, m: s2.month,
                            text: `${r.head.name}が${dest.name}の本陣を衝き、${t2.name}を討ち取った。` });
                        }
                        return s2;
                      });
                    }
                    startBattle(army, dest, camp, { done: true, hit, head: r.head, target: r.target, atkIsPlayer });
                  }}>本陣を衝く</button>
                  <button className="btn" onClick={() => {
                    const { army, dest, camp } = raid;
                    setRaid(null);
                    startBattle(army, dest, camp, null);
                  }}>正面から当たる</button>
                </div>
              </div>
            </div>
          );
        })()}
        {g.warSettle && (() => {
          const ws = g.warSettle;
          const gen = g.generals.find((x) => x.id === ws.queue[0]);
          const lord = ws.lordId ? g.generals.find((x) => x.id === ws.lordId) : null;
          const fname = (g.factions[ws.faction] || {}).name || "";
          if (!gen) {
            // すべて片づいた。滅亡を知らせて政務へ戻る。
            setG((p2) => {
              const s2 = structuredClone(p2);
              s2.warSettle = null;
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${fname}は最後の城を失い、滅亡した。` });
              s2.monthEvents = [...(s2.monthEvents || []), `${fname}を滅ぼした。`];
              s2.msg = `${fname}は滅亡した。`;
              return s2;
            });
            return null;
          }
          const isLord = gen.id === ws.lordId;
          const rec = isLord
            ? { ok: false, why: `${fname}を背負った当主。降って人に仕える身ではない` }
            : canRecruit(gen, lord);
          const nextOne = (s2) => {
            s2.warSettle = { ...s2.warSettle, queue: s2.warSettle.queue.slice(1) };
            if (!s2.warSettle.queue.length) {
              s2.warSettle = null;
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${fname}は最後の城を失い、滅亡した。` });
              s2.monthEvents = [...(s2.monthEvents || []), `${fname}を滅ぼした。`];
              s2.msg = `${fname}は滅亡した。`;
            }
          };
          const act2 = (kind) => setG((p2) => {
            const s2 = structuredClone(p2);
            const g2 = s2.generals.find((x) => x.id === gen.id);
            if (!g2) { nextOne(s2); return s2; }
            if (kind === "斬") {
              s2.generals = s2.generals.filter((x) => x.id !== g2.id);
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${g2.name}は斬られた。` });
            } else if (kind === "捕") {
              takeAsPrisoner(s2, g2, ws.winner, ws.castleId);
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${g2.name}は捕らわれ、${(s2.castles.find((c2) => c2.id === ws.castleId) || {}).name}に留め置かれた。` });
            } else {
              g2.faction = ws.winner; g2.lord = false; g2.captive = null;
              g2.loyal = loyaltyAfterRecruit(g2); g2.at = ws.castleId;
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${g2.name}は${s2.factions[ws.winner].name}に仕えた（忠誠${Math.round(g2.loyal)}）。` });
            }
            nextOne(s2);
            return s2;
          });
          return (
            <div className="modal">
              <div className="card">
                <div className="mn" style={{ fontSize: 20 }}>{fname}、滅亡</div>
                <div style={{ fontSize: 12, color: U.dim, margin: "6px 0 12px" }}>
                  残る{ws.queue.length}名の身の振り方を定めます。
                </div>
                <div style={{ borderLeft: `3px solid ${isLord ? "#C8A44A" : U.line}`, paddingLeft: 12, marginBottom: 12, lineHeight: 1.9 }}>
                  <b style={{ fontSize: 16 }}>{gen.name}</b>
                  {isLord && <span style={{ color: "#C8A44A", fontSize: 12, marginLeft: 6 }}>【旧当主】</span>}
                  <br />
                  <span className="num" style={{ fontSize: 12, color: U.dim }}>
                    {gen.age}歳／統{gen.lead}・武{gen.valor}・知{gen.wit}・政{gen.gov}
                    {isLord ? `／${fname}当主` : `／旧主への忠誠 ${Math.round(gen.loyal == null ? 60 : gen.loyal)}`}
                  </span>
                  {!rec.ok && rec.why && (
                    <div style={{ fontSize: 12, color: "#B0483C", marginTop: 6 }}>{rec.why}。</div>
                  )}
                  {rec.ok && (
                    <div style={{ fontSize: 12, color: "#3E7A3A", marginTop: 6 }}>
                      召し抱えれば、忠誠{loyaltyAfterRecruit(gen)}にて仕えましょう。
                    </div>
                  )}
                </div>
                {rec.ok && (
                  <button className="btn dark" style={{ width: "100%", marginBottom: 6 }} onClick={() => act2("登")}>召し抱える</button>
                )}
                <div className="g2">
                  <button className="btn" onClick={() => act2("捕")}>捕虜とする</button>
                  <button className="btn" onClick={() => act2("斬")}>斬る</button>
                </div>
                <div style={{ fontSize: 11, color: U.dim, marginTop: 10, lineHeight: 1.7 }}>
                  捕虜とすれば、城の「戦後の始末」で扶持を与え、心を開かせて召し抱える道が開けます。
                </div>
              </div>
            </div>
          );
        })()}
        {g.succession && (() => {
          const su = g.succession;
          const cands = heirCandidates(g, su.dead);
          if (!cands.length) {
            setG((p2) => { const s2 = structuredClone(p2);
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${su.dead.name}が${su.cause}。跡を継ぐ者なく、家は絶えた。` });
              s2.succession = null; return s2; });
            return null;
          }
          return (
            <div className="modal">
              <div className="card">
                <div className="mn" style={{ fontSize: 20 }}>{su.dead.name}、{su.cause}</div>
                <div style={{ fontSize: 12.5, color: U.dim, margin: "8px 0 12px", lineHeight: 1.8 }}>
                  跡目を定めねばならぬ。<br />
                  <span style={{ fontSize: 11.5 }}>
                    血筋の者が継げば家中は落ち着く。他家の出であれば忠誠が大きく下がり、
                    幼年であればさらに侮られる。
                  </span>
                </div>
                {cands.map(({ gen, blood }) => (
                  <button key={gen.id} className="btn"
                    style={{ width: "100%", textAlign: "left", marginBottom: 6, padding: "9px 12px" }}
                    onClick={() => setG((p2) => {
                      const s2 = structuredClone(p2);
                      const d2 = s2.generals.find((x) => x.id === su.dead.id);
                      succeed(s2, d2 || su.dead, su.cause, gen.id, false);
                      s2.generals = s2.generals.filter((x) => x.id !== su.dead.id);
                      s2.succession = null;
                      return s2;
                    })}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span className="mn" style={{ fontSize: 15 }}>
                        {gen.name}
                        <span style={{ fontSize: 11, color: blood ? "#3E7A3A" : "#B0483C", marginLeft: 8 }}>
                          {blood ? "血筋" : "他家の出"}{gen.age < 16 ? "・幼年" : ""}
                        </span>
                      </span>
                      <span className="num" style={{ fontSize: 11.5, color: U.dim }}>
                        {gen.age}歳／統{gen.lead}・武{gen.valor}・知{gen.wit}・政{gen.gov}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
        {g.promo && <PromotionDialog promo={g.promo} onDone={(name) => setG((p) => {
          const s = structuredClone(p);
          s.chronicle.push({ y: s.year, m: s.month, text: `${s.promo.oldName}、戦功により正式な武将に列し、${s.promo.lordName}より偏諱を賜って${name}と名乗る。` });
          s.promo = null; return s;
        })} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ 城詳細シート */
function CastleSheet({ g, castle: c, land, tab, setTab, onClose, onCommand, onAppoint, onSortie, onDiplo, onPlot, onSpecial, onReward, onCaptive, onFief, onRetire, onSettle, onKenchi }) {
  const f = g.factions[c.faction];
  const gens = g.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
  const ret = gens.reduce((a, x) => a + x.retinue, 0);
  const total = c.local + ret;
  const mine = c.faction === g.player;
  const lord = castellanOf(g, c);
  const [cmd, setCmd] = useState("開墾");
  const [genId, setGenId] = useState(null);
  const [plot, setPlot] = useState("偵察");
  const [plotTarget, setPlotTarget] = useState(null);
  const [diploTarget, setDiploTarget] = useState(null);
  const cur = genId && gens.some((x) => x.id === genId) ? genId : (gens[0] && gens[0].id);
  // 月の働きは武将ごとに数える。手の空いている者がいれば、まだ命じられる。
  const busy = (id) => !!g.orders[id];
  const freeGens = gens.filter((x) => !busy(x.id) && !x.captive);
  const done = freeGens.length === 0;
  const garrison = minGarrison(c);
  const cap = troopCap(c, f.mobilization, g || s);
  const open = mine || canSee(g, c);
  const V = (v, unit) => (open ? `${fmt(v)}${unit || ""}` : "？");
  const N = (v) => (open ? Math.round(v) : "？");
  const stop = (e) => e.stopPropagation();

  // 交渉の相手は近い家から並べる。百を超える家を名の順に並べても選べない。
  const myCastles = g.castles.filter((x) => x.faction === g.player);
  const distTo = (fid) => {
    const cs = g.castles.filter((x) => x.faction === fid);
    if (!cs.length || !myCastles.length) return 1e9;
    let best = 1e9;
    for (const a of myCastles) for (const b of cs) {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < best) best = d;
    }
    return best;
  };
  const foeFactions = Object.values(g.factions)
    .filter((x) => x.id !== g.player && g.castles.some((c2) => c2.faction === x.id))
    .map((x) => ({ ...x, dist: distTo(x.id) }))
    .sort((a, b) => a.dist - b.dist)
    .map((x) => ({ ...x, full: `${x.name}（${g.castles.filter((c2) => c2.faction === x.id).length}城・${relOf(g, g.player, x.id).state}）` }));
  const dt = (diploTarget && foeFactions.some((x) => x.id === diploTarget))
    ? diploTarget : (foeFactions[0] ? foeFactions[0].id : g.player);
  const rel = relOf(g, g.player, dt);
  const myKoku = g.castles.filter((x) => x.faction === g.player).reduce((a, x) => a + x.koku, 0);
  const youKoku = g.castles.filter((x) => x.faction === dt).reduce((a, x) => a + x.koku, 0);
  // 調略の相手も近い城から並べる
  const foeCastles = g.castles.filter((x) => x.faction !== g.player)
    .map((x) => ({ ...x, dist: myCastles.length ? Math.min(...myCastles.map((a) => Math.hypot(a.x - x.x, a.y - x.y))) : 0 }))
    .sort((a, b) => a.dist - b.dist);
  const pt = (plotTarget && foeCastles.some((x) => x.id === plotTarget))
    ? plotTarget : (foeCastles[0] && foeCastles[0].id);
  const running = g.plots.filter((x) => x.faction === g.player);
  const nearTowns = TOWNS.slice().sort((a, z) =>
    Math.hypot(px(a.lon) - c.x, py(a.lat) - c.y) - Math.hypot(px(z.lon) - c.x, py(z.lat) - c.y));

  return (
    <div className="sheet" onMouseDown={stop} onMouseUp={stop} onTouchStart={stop} onTouchEnd={stop} onWheel={stop}
      style={land ? {
        left: "auto", right: 0, top: 0, bottom: 0, width: 390, maxHeight: "100%",
        borderRadius: 0, borderTop: "none", borderLeft: `1px solid ${U.line}`, boxShadow: "-6px 0 24px rgba(0,0,0,.10)",
      } : undefined}>
      <div className="sheet-h">
        <button className="btn sm" onClick={onClose}>← 戻る</button>
        <span className="mn" style={{ fontSize: 22 }}>{c.name}</span>
        <span className="pill" style={{ background: f.color }}>{f.name}</span>
        {!mine && (
          <span className="pill" style={{ background: open ? "#5C8C4A" : "#8A8478" }}>
            {open ? "偵察済み" : "内情不明"}
          </span>
        )}
        {!mine && relOf(g, g.player, c.faction).state !== "中立" && (
          <span className="pill" style={{ background: "#4A6E8A" }}>
            {relOf(g, g.player, c.faction).state}
            {relOf(g, g.player, c.faction).until
              ? `（残${monthsBetween(g.year, g.month, relOf(g, g.player, c.faction).until.y, relOf(g, g.player, c.faction).until.m)}か月）` : ""}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {mine && <span style={{ fontSize: 11, color: U.dim }}>
          {done ? "本月の務めは済んだ" : `働ける者 ${freeGens.length}名`}
        </span>}
      </div>

      <div className="split" style={land ? { flexDirection: "column", gap: 10 } : undefined}>
        <div>
          <div className="tbl">
            <span className="k">城主</span>
            <span className="v mn">
              {open ? (lord ? lord.name : "―") : "？"}
              {open && lord && (
                <span style={{ fontSize: 11, color: U.dim, marginLeft: 6 }}>
                  {lord.lord
                    ? (needsGuardian(lord) ? `（当主・${lord.age}歳）` : "（当主）")
                    : isGuardian(g, lord) ? "（後見）"
                    : `（${rankName(lord, g)}・禄高${fmt(stipendOf(g, lord))}石）`}
                </span>
              )}
            </span>
            <span className="k">城主の格</span>
            <span className="v">
              {open ? <>禄高 {fmt(castleRankNeed(c))}石 以上</> : "？"}
              {open && (
                <span style={{ fontSize: 11, color: U.dim, marginLeft: 6 }}>
                  （この城の身代に応じた格）
                </span>
              )}
            </span>
            <span className="k">石高</span><span className="v">{V(c.koku)} / {V(c.kokuMax)} 石</span>
            <span className="k">人口</span><span className="v">{V(c.pop)}</span>
            <span className="k">兵数</span><span className="v">{V(total)}</span>
            <span className="k">武将</span><span className="v">{open ? `${gens.length} 名` : "？"}</span>
            <span className="k">兵糧</span><span className="v">{open ? `${fmt(c.food)} 石（${foodDays(c.food, total)} 日分）` : "？"}</span>
          </div>
          <div style={{ height: 10 }} />
          <div className="tbl">
            <span className="k">城防</span><span className="v">{N(c.def)} / 100</span>
            <span className="k">商業</span><span className="v">{N(c.comm)} / 100</span>
            <span className="k">民忠</span><span className="v">{N(c.min)} / 100</span>
            <span className="k">耐久</span><span className="v">{V(c.hp)}</span>
          </div>
          {!open && (
            <div style={{ fontSize: 12, color: U.dim, marginTop: 10, lineHeight: 1.6 }}>
              内情は掴めていない。調略の「偵察」を行うか、忍びの里を味方につければ分かる。
            </div>
          )}
          {open && (
            <>
              <div className="sec">兵力の内訳</div>
              <div className="row"><span>直属家臣団</span><span className="v">{fmt(ret)} 人</span></div>
              <div className="row"><span>地域家臣団（練度 {Math.round(c.localTrain)}）</span><span className="v">{fmt(c.local)} 人</span></div>
              <div className="row"><span>地域家臣団の馴染</span><span className="v">{Math.round(c.najimi == null ? 70 : c.najimi)} / 100</span></div>
              <div className="row"><span>守備最低数</span><span className="v">{fmt(garrison)} 人</span></div>
              <div className="row" style={{ color: f.color, fontWeight: 600 }}>
                <span>出征可能兵</span><span className="v">{fmt(Math.max(0, total - garrison))} 人</span>
              </div>
              <div className="meter"><i style={{ width: `${Math.min(100, (total / Math.max(1, cap)) * 100)}%`, background: f.color }} /></div>
              <div style={{ fontSize: 11, color: U.dim, marginTop: 4 }}>
                軍役上限 {fmt(cap)} 人（馴染が低いと動員も落ちる）
              </div>
              {c.intrigue && <div style={{ fontSize: 12, color: "#8A6A34", marginTop: 6 }}>この城には内応の密約が仕込まれている。</div>}
            </>
          )}
        </div>

        <div>
          <div className="sec">所属武将</div>
          {!open && <div style={{ fontSize: 12, color: U.dim }}>不明。</div>}
          {open && gens.length === 0 && <div style={{ fontSize: 12, color: U.dim }}>在城の武将はいない。</div>}
          {open && gens.map((x) => (
            <div key={x.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${U.line2}`, fontSize: 13, gap: 8 }}>
              <span className="mn" style={{ fontSize: 15 }}>
                {x.name}
                {x.lord ? (
                  <>
                    <span className="pill" style={{ background: f.color, marginLeft: 6 }}>当主</span>
                    {needsGuardian(x) && (
                      <span style={{ fontSize: 10.5, color: "#B0483C", marginLeft: 4 }}>
                        幼年（{x.age}歳）
                      </span>
                    )}
                  </>
                ) : isGuardian(g, x) ? (
                  <span className="pill" style={{ background: "#8A7A5A", marginLeft: 6 }}>後見</span>
                ) : (
                  <span style={{ fontSize: 10.5, color: U.dim, marginLeft: 6 }}>{rankName(x, g)}</span>
                )}
              </span>
              <span className="num" style={{ color: U.dim, fontSize: 11 }}>
                統{x.lead} 武{x.valor} 知{x.wit} 政{x.gov} 忠{x.loyal}／
                {x.lord ? `御料${fmt(goryoOf(g, x.faction).total)}石` : `禄高${fmt(stipendOf(g, x))}石`}
                ・直属{fmt(x.retinue)}
              </span>
            </div>
          ))}
          {/* 囚われの身にある者。使えぬが、この城に留め置かれている（GDD 12.3・12.4）*/}
          {open && (() => {
            const pris = g.generals.filter((x) => x.at === c.id && x.captive && x.captive.by === c.faction);
            if (!pris.length) return null;
            return (
              <>
                <div style={{ fontSize: 11.5, color: U.dim, margin: "10px 0 4px" }}>
                  この城に留め置かれている者（用いることはできません）
                </div>
                {pris.map((x) => (
                  <div key={x.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                    borderBottom: `1px solid ${U.line2}`, fontSize: 13, gap: 8, opacity: 0.62 }}>
                    <span className="mn" style={{ fontSize: 15 }}>
                      <span className="pill" style={{ background: "#8A7A6A", marginRight: 6 }}>囚</span>
                      {x.name}
                      <span style={{ fontSize: 11, color: U.dim, marginLeft: 6 }}>
                        旧{(g.factions[x.captive.from] || {}).name}
                      </span>
                    </span>
                    <span className="num" style={{ color: U.dim, fontSize: 11 }}>
                      統{x.lead} 武{x.valor} 知{x.wit} 政{x.gov}
                      {x.captive.ruin ? `／心 ${x.warLoyal || 0}／50` : `／忠${Math.round(x.loyal == null ? 60 : x.loyal)}`}
                    </span>
                  </div>
                ))}
              </>
            );
          })()}

          {mine && (
            <>
              <div className="sec">命令</div>
              <div className="g4" style={{ marginBottom: 10 }}>
                {["内政", "軍事", "人事", "外交", "調略", "特殊勢力"].map((k) => (
                  <button key={k} className={`btn sm ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{k}</button>
                ))}
              </div>

              {tab === "内政" && (done ? (
                <div style={{ fontSize: 12, color: U.dim }}>
                  この城の者はみな本月の務めを果たした。次月へ進めば、また働ける。
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6 }}>
                    手の空いている者 {freeGens.length}名／在城 {gens.filter((x) => !x.captive).length}名。
                    一人が一つの務めにあたります。
                  </div>
                  <div className="g4" style={{ marginBottom: 8 }}>
                    {["開墾", "治水", "商業", "築城", "訓練", "徴募"].map((k) => (
                      <button key={k} className={`btn sm ${cmd === k ? "on" : ""}`} onClick={() => setCmd(k)}>{k}</button>
                    ))}
                  </div>
                  <select className="sel" style={{ width: "100%", marginBottom: 8 }}
                    value={freeGens.some((x) => x.id === cur) ? cur : (freeGens[0] || {}).id || ""}
                    onChange={(e) => setGenId(e.target.value)}>
                    {freeGens.map((x) => (
                      <option key={x.id} value={x.id}>{`担当：${x.name}（統${x.lead} 政${x.gov} 知${x.wit}）`}</option>
                    ))}
                  </select>
                  <button className="btn dark" style={{ width: "100%" }}
                    disabled={!freeGens.length}
                    onClick={() => onCommand(c.id, cmd, freeGens.some((x) => x.id === cur) ? cur : freeGens[0].id)}>
                    {cmd}を実行
                  </button>
                  {/* 検地。一国を丸ごと押さえてはじめて行える（GDD 4.6） */}
                  {(() => {
                    if (!mine) return null;
                    const kuni = c.kuni;
                    if (!kuni) return null;
                    const holds = holdsProvince(g, g.player, kuni);
                    const done = kenchiDone(g, kuni);
                    const cs = g.castles.filter((x) => x.kuni === kuni);
                    const mineN = cs.filter((x) => x.faction === g.player).length;
                    const cost = kenchiCost(g, kuni);
                    const who = freeGens.length
                      ? [...freeGens].sort((a, b) => b.gov - a.gov)[0] : null;
                    return (
                      <>
                        <div className="sec">検地</div>
                        {done ? (
                          <div style={{ fontSize: 12, color: U.dim, lineHeight: 1.7 }}>
                            {kuni}にはすでに竿が入っている。
                          </div>
                        ) : !holds ? (
                          <div style={{ fontSize: 12, color: U.dim, lineHeight: 1.7 }}>
                            {kuni}の{cs.length}城のうち、当家のものは{mineN}城。<br />
                            <b style={{ color: "#B0483C" }}>一国を丸ごと押さえねば、竿は入れられない。</b><br />
                            <span style={{ fontSize: 11 }}>
                              国境をまたいで検地はできず、他家の城が一つでも残れば帳簿は改まりません。
                            </span>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: 12, color: U.dim, marginBottom: 8, lineHeight: 1.8 }}>
                              <b style={{ color: "#3E7A3A" }}>{kuni}一国を押さえた。竿を入れられる。</b><br />
                              国中{cs.length}城の実りが改まり、<b style={{ color: U.text }}>石高の限りも伸びます</b>。<br />
                              費用 金{fmt(cost.gold)}貫／民忠は九つ下がります。
                              {who && `　奉行：${who.name}（政務${who.gov}）`}
                            </div>
                            <button className="btn dark" style={{ width: "100%" }}
                              disabled={!who || g.factions[g.player].gold < cost.gold}
                              onClick={() => onKenchi(kuni, who.id)}>
                              {kuni}に竿を入れる
                            </button>
                          </>
                        )}
                      </>
                    );
                  })()}
                  {gens.filter((x) => busy(x.id)).length > 0 && (
                    <div style={{ fontSize: 11, color: U.dim, marginTop: 8, lineHeight: 1.6 }}>
                      本月すでに務めた者：{gens.filter((x) => busy(x.id)).map((x) => `${x.name}（${g.orders[x.id].cmd}）`).join("、")}
                    </div>
                  )}
                </>
              ))}

              {tab === "軍事" && (
                <>
                  <div style={{ fontSize: 12, color: U.dim, marginBottom: 8 }}>
                    出征可能兵 {fmt(Math.max(0, total - garrison))} 人。守備最低数は城に残ります。
                  </div>
                  <button className="btn dark" style={{ width: "100%" }} disabled={total - garrison < 200 || !gens.length} onClick={onSortie}>出陣</button>
                </>
              )}

              {tab === "人事" && (
                <>
                  <div style={{ fontSize: 12, color: U.dim, marginBottom: 8 }}>
                    城主を定めます。城主が代わると地域家臣団の馴染は下がり、月ごとに戻ります。
                  </div>
                  {(() => {
                    // 戦後の始末。滅んだ家から捕らえた将を、どう遇するか。
                    const pris = g.generals.filter((x) => x.captive && x.captive.ruin
                      && x.captive.by === g.player && x.at === c.id);
                    if (!pris.length) return null;
                    return (
                      <>
                        <div className="sec">戦後の始末</div>
                        <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 8, lineHeight: 1.7 }}>
                          滅ぼした家から捕らえた者です。囚われの月を重ねるごとに心がほぐれ（月に二）、
                          扶持を与えればさらに開きます（月に一度・四）。<b>五十に達すれば召し抱えられます。</b>
                        </div>
                        {pris.map((x) => {
                          const wl = x.warLoyal || 0;
                          const cost = Math.round(120 + (x.lead + x.gov + x.wit) * 1.4);
                          const food = Math.round(60 + x.retinue * 0.4);
                          return (
                            <div key={x.id} style={{ borderBottom: `1px solid ${U.line2}`, padding: "8px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <span className="mn" style={{ fontSize: 15 }}>
                                  {x.name}
                                  <span style={{ fontSize: 11, color: U.dim, marginLeft: 6 }}>
                                    旧{(g.factions[x.captive.from] || {}).name}
                                  </span>
                                </span>
                                <span className="num" style={{ fontSize: 12, color: wl >= 50 ? "#3E7A3A" : U.dim }}>
                                  心 {wl}／50
                                </span>
                              </div>
                              <div className="num" style={{ fontSize: 11, color: U.dim, marginTop: 2 }}>
                                統{x.lead}・武{x.valor}・知{x.wit}・政{x.gov}
                              </div>
                              <div className="g3" style={{ marginTop: 6 }}>
                                <button className="btn sm" disabled={wl < 50}
                                  onClick={() => onSettle(x.id, "登用")}>召し抱える</button>
                                <button className="btn sm" disabled={x.fed}
                                  onClick={() => onSettle(x.id, "扶持")}>
                                  扶持{x.fed ? "済" : ""}
                                </button>
                                <button className="btn sm" onClick={() => onSettle(x.id, "切腹")}>切腹</button>
                              </div>
                              {!x.fed && (
                                <div style={{ fontSize: 10.5, color: U.dim, marginTop: 3 }}>
                                  扶持には金{fmt(cost)}貫・兵糧{fmt(food)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                  {(() => {
                    const lord = g.generals.find((x) => x.faction === g.player && x.lord && !x.captive);
                    if (!lord || lord.at !== c.id) return null;
                    const cands = heirCandidates(g, lord).filter(({ gen }) => gen.age >= 12);
                    if (!cands.length) return null;
                    return (
                      <>
                        <div className="sec">家督を譲る（隠居）</div>
                        <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.7 }}>
                          存命のうちに譲れば、先代が後見に立つため<b>家中はほとんど揺れません</b>。
                          没してから継がせると、血筋でない者なら忠誠が九つ、幼年ならさらに五つ下がります。<br />
                          先代（{lord.name}・{lord.age}歳）は家臣として残り、直属の半ばを新当主に渡します。
                        </div>
                        {cands.slice(0, 4).map(({ gen, blood }) => (
                          <button key={gen.id} className="btn sm" style={{ width: "100%", textAlign: "left", marginBottom: 4 }}
                            onClick={() => onRetire(gen.id)}>
                            {gen.name}に譲る　
                            <span style={{ color: blood ? "#3E7A3A" : "#B0483C", fontSize: 11 }}>
                              {blood ? "血筋" : "他家の出"}{gen.age < 16 ? "・幼年" : ""}
                            </span>
                            <span className="num" style={{ color: U.dim, fontSize: 11 }}>
                              　{gen.age}歳／統{gen.lead}・武{gen.valor}・知{gen.wit}・政{gen.gov}
                            </span>
                          </button>
                        ))}
                      </>
                    );
                  })()}
                  <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 8, lineHeight: 1.7 }}>
                    この城の石高 <b style={{ color: U.text }}>{fmt(c.koku)}石</b>（配れる知行の限り）／
                    家臣に配った知行 {fmt(fiefBurden(g, c.id))}石<br />
                    この城の余禄 <b style={{ color: U.text }}>{fmt(extraIncome(c))}石</b>
                    （湊の運上・市の役銭・山の産）<br />
                    <span style={{ fontSize: 11 }}>
                      知行に余禄の分け前を加えたものが<b>禄高</b>で、身分はこれで定まります。
                      石高が増えれば、配れる知行も増えます。
                    </span>
                  </div>
                  {(() => { const rm = fiefRoom(g, g.player); return (
                    <div className="row" style={{ borderBottom: `1px solid ${U.line2}`, paddingBottom: 4 }}>
                      <span>配れる知行</span>
                      <span className="v num">{fmt(rm.left)}石 <span style={{ color: U.dim, fontSize: 11 }}>
                        （石高の四割 {fmt(rm.cap)}石のうち {fmt(rm.used)}石を配分済）</span></span>
                    </div>
                  ); })()}
                  {gens.filter((x) => !x.captive).map((x) => {
                    const want = fiefWanted(x), have = fiefOf(x);
                    const r = have / Math.max(1, want);
                    const mood = r >= 1.0 ? "満ちている" : r >= 0.75 ? "不足はない" : r >= 0.5 ? "不満がある" : "強い不満";
                    const col = r >= 0.75 ? U.dim : r >= 0.5 ? "#C89A3A" : "#B0483C";
                    return (
                      <div key={x.id} style={{ borderBottom: `1px solid ${U.line2}`, padding: "6px 0" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className={`btn sm ${lord && lord.id === x.id ? "on" : ""}`} style={{ flex: 1, textAlign: "left" }}
                            onClick={() => onAppoint(c.id, x.id)}>{x.name} を城主に</button>
                          <button className="btn sm" onClick={() => onReward(x.id)}>褒賞300貫</button>
                        </div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          <span style={{ color: "#8A7A5A" }}>{rankName(x, g)}</span>
                          {!x.lord && (() => {
                            if (x.lord) return <span style={{ color: U.dim, marginLeft: 6 }}>　御料{fmt(goryoOf(g, x.faction).total)}石</span>;
                            const st = stipendOf(g, x);
                            const nx = RANKS.filter((r) => r.min > st).sort((a, b) => a.min - b.min)[0];
                            return nx ? <span style={{ color: U.dim, marginLeft: 6 }}>
                              　禄高{fmt(st)}石（あと{fmt(nx.min - st)}石で{nx.key}）
                            </span> : <span style={{ color: U.dim, marginLeft: 6 }}>　禄高{fmt(st)}石</span>;
                          })()}
                        </div>
                        <div className="num" style={{ fontSize: 11.5, color: col, marginTop: 3 }}>
                          {isNameless(x) ? <span style={{ color: "#9B9384" }} title="名の伝わらぬ在地の長。実在の人名ではありません">〔伝〕</span> : null}
                          {x.retired ? <span style={{ color: "#8A7A5A" }}>【隠居】</span> : null}
                          {x.lord ? <span style={{ color: "#C8A44A" }}>【当主】</span> : null}
                          忠誠{Math.round(x.loyal == null ? 60 : x.loyal)}／知行 {fmt(have)}石
                          （望むところ {fmt(want)}石・{mood}）
                        </div>
                        <div className="g4" style={{ marginTop: 3 }}>
                          {[500, 1500, 4000].map((n) => (
                            <button key={n} className="btn sm" onClick={() => onFief(x.id, n)}>＋{fmt(n)}石</button>
                          ))}
                          <button className="btn sm" onClick={() => onFief(x.id, -1500)}>−1,500石</button>
                        </div>
                      </div>
                    );
                  })}
                  {g.generals.filter((x) => x.captive && x.captive.at === c.id && x.captive.by === c.faction).length > 0 && (
                    <>
                      <div className="sec">この城に留め置く捕虜</div>
                      {g.generals.filter((x) => x.captive && x.captive.at === c.id && x.captive.by === c.faction).map((x) => (
                        <div key={x.id} style={{ display: "flex", justifyContent: "space-between",
                          color: "#A9A499", fontSize: 12.5, padding: "4px 0" }}>
                          <span>【捕虜】{x.name}</span>
                          <span className="num">
                            統{x.lead}／武{x.valor}／知{x.wit}／政{x.gov}　
                            旧主への忠誠 {Math.round(x.loyal == null ? 60 : x.loyal)}
                          </span>
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: U.dim, marginTop: 4 }}>
                        捕虜は城主にも褒賞にも与れない。処遇は外交の「捕虜」で決める。
                      </div>
                    </>
                  )}
                </>
              )}

              {tab === "外交" && (
                <>
                  <select className="sel" style={{ width: "100%", marginBottom: 8 }} value={dt} onChange={(e) => setDiploTarget(e.target.value)}>
                    {foeFactions.map((x) => <option key={x.id} value={x.id}>{x.full}</option>)}
                  </select>
                  <div className="row"><span>現在の関係</span>
                    <span className="v">{rel.state}{rel.until ? `（残${monthsBetween(g.year, g.month, rel.until.y, rel.until.m)}か月）` : ""}</span></div>
                  <div className="row"><span>信用</span><span className="v">{Math.round(rel.trust)} / 100</span></div>
                  <div className="meter"><i style={{ width: `${rel.trust}%`, background: "#4A6E8A" }} /></div>
                  <div className="g3" style={{ marginTop: 10 }}>
                    {DIPLO.map((d) => {
                      const ok = d.need(rel, { koku: myKoku }, { koku: youKoku }) && g.factions[g.player].gold >= d.cost;
                      return <button key={d.key} className="btn sm" disabled={!ok} title={d.why}
                        onClick={() => onDiplo(dt, d.key)}>{d.key}</button>;
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: U.dim, marginTop: 8, lineHeight: 1.7 }}>
                    親善180貫／不可侵320貫・12か月／同盟520貫・24か月／従属400貫／臣従。<br />
                    約束を破って攻めれば裏切りとなり、信用・威信・家臣の忠誠が下がります。
                  </div>
                  {(() => {
                    const held = g.generals.filter((x) => x.captive && x.captive.by === g.player);
                    if (!held.length) {
                      return (
                        <>
                          <div className="sec">捕虜（0名）</div>
                          <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.7 }}>
                            捕らえた武将はいません。合戦や城攻めで敵将を捕らえると、ここで
                            登用・逃す・斬首・身代金を選べます。
                          </div>
                        </>
                      );
                    }
                    return (
                      <>
                        <div className="sec">捕虜（{held.length}名）</div>
                        {held.map((x) => {
                          const loy = Math.round(x.loyal == null ? 60 : x.loyal);
                          const from = g.factions[x.captive.from];
                          const bond = x.captive.bond || 0;
                          return (
                            <div key={x.id} style={{ borderBottom: `1px solid ${U.line2}`, padding: "6px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                                <span>【捕虜】{x.name}</span>
                                <span className="num" style={{ color: U.dim }}>
                                  {from ? from.name : "旧主"}への忠誠 {loy}
                                </span>
                              </div>
                              <div className="num" style={{ fontSize: 11.5, color: U.dim, marginTop: 2 }}>
                                統率{x.lead}／武勇{x.valor}／知略{x.wit}／政務{x.gov}
                                {bond > 0 ? "　旧主と厚い縁（忠誠が下がりにくい）" : bond < 0 ? "　旧主に含むところあり（忠誠が下がりやすい）" : ""}
                              </div>
                              <div className="g4" style={{ marginTop: 4 }}>
                                <button className="btn sm" disabled={loy > 40} title={loy > 40 ? "忠誠が40以下にならねば降らぬ" : ""}
                                  onClick={() => onCaptive(x.id, "登用")}>登用</button>
                                <button className="btn sm" onClick={() => onCaptive(x.id, "逃す")}>逃す</button>
                                <button className="btn sm" onClick={() => onCaptive(x.id, "斬首")}>斬首</button>
                                <button className="btn sm" onClick={() => onCaptive(x.id, "身代金")}
                                  title={`${ransomRank(x)}の器量。旧主の金銭・兵糧の${RANSOM_DIV[ransomRank(x)]}分の1を求める`}>
                                  身代金（{ransomRank(x)}）
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ fontSize: 11, color: U.dim, marginTop: 6, lineHeight: 1.7 }}>
                          捕虜は月ごとに旧主への忠誠を失います。40以下になれば降ります。
                        </div>
                      </>
                    );
                  })()}
                </>
              )}

              {tab === "調略" && (
                <>
                  <select className="sel" style={{ width: "100%", marginBottom: 8 }} value={pt || ""} onChange={(e) => setPlotTarget(e.target.value)}>
                    {foeCastles.slice(0, 30).map((x) => (
                      <option key={x.id} value={x.id}>
                        {`${x.name}（${g.factions[x.faction].name}）　約${marchMonths(c.id, x.id) || "?"}か月`}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: U.dim, marginBottom: 8 }}>
                    近い城から順に三十まで示します。手の者は遠国へは容易に入れません。
                  </div>
                  <div className="g3" style={{ marginBottom: 8 }}>
                    {PLOTS.map((x) => (
                      <button key={x.key} className={`btn sm ${plot === x.key ? "on" : ""}`} onClick={() => setPlot(x.key)}>{x.key}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: U.dim, marginBottom: 8, lineHeight: 1.8 }}>
                    {(PLOTS.find((x) => x.key === plot) || {}).desc}<br />
                    費用{(PLOTS.find((x) => x.key === plot) || {}).cost}貫／
                    判明まで{(PLOTS.find((x) => x.key === plot) || {}).months}か月／
                    要する知略 <b style={{ color: U.text }}>{(PLOTS.find((x) => x.key === plot) || {}).need}</b>／
                    見込みの上限 {Math.round(((PLOTS.find((x) => x.key === plot) || {}).cap || 0.85) * 100)}％
                  </div>
                  {(() => {
                    const d2 = PLOTS.find((x) => x.key === plot);
                    const who = freeGens.some((x) => x.id === cur) ? freeGens.find((x) => x.id === cur) : freeGens[0];
                    const tgt = g.castles.find((x) => x.id === pt);
                    if (!d2 || !who || !tgt) return null;
                    const need2 = d2.need + (tgt.min - 70) * d2.hard * 0.42;
                    const cap2 = d2.cap == null ? 0.85 : d2.cap;
                    const gap = who.wit - need2;
                    const p2 = gap >= 0
                      ? Math.min(cap2 + Math.max(0, gap) * 0.002, cap2 + 0.04)
                      : clamp(cap2 + gap * d2.hard * 0.055, 0.03, cap2);
                    const pct = Math.round(p2 * 100);
                    return (
                      <div style={{ fontSize: 12.5, marginBottom: 8, lineHeight: 1.8,
                        borderLeft: `3px solid ${pct >= 80 ? "#3E7A3A" : pct >= 45 ? "#C89A3A" : "#B0483C"}`, paddingLeft: 10 }}>
                        {who.name}（知略{who.wit}）が{tgt.name}へ仕掛ける見込み　
                        <b style={{ fontSize: 16, color: pct >= 80 ? "#3E7A3A" : pct >= 45 ? "#C89A3A" : "#B0483C" }}>
                          {pct}％
                        </b><br />
                        <span style={{ color: U.dim, fontSize: 11.5 }}>
                          この城は民忠{Math.round(tgt.min)}。堅い城ほど余分に知略を要します。
                          しくじれば半ばは露見し、信用が下がります。
                        </span>
                      </div>
                    );
                  })()}
                  <select className="sel" style={{ width: "100%", marginBottom: 8 }}
                    value={freeGens.some((x) => x.id === cur) ? cur : (freeGens[0] || {}).id || ""}
                    onChange={(e) => setGenId(e.target.value)}>
                    {freeGens.map((x) => <option key={x.id} value={x.id}>{`担当：${x.name}（知${x.wit}）`}</option>)}
                  </select>
                  <button className="btn dark" style={{ width: "100%" }}
                    disabled={!freeGens.length || !pt}
                    onClick={() => onPlot(pt, plot, freeGens.some((x) => x.id === cur) ? cur : freeGens[0].id)}>
                    {plot}を仕掛ける
                  </button>
                  {!freeGens.length && (
                    <div style={{ fontSize: 12, color: "#B0483C", marginTop: 8, lineHeight: 1.7 }}>
                      この城の者はみな本月の務めに就いており、調略に手を回せない。<br />
                      <span style={{ color: U.dim, fontSize: 11.5 }}>
                        内政と調略は同じ手を使う。謀を巡らすなら、誰かの手を空けておくこと。
                      </span>
                    </div>
                  )}
                  {running.length > 0 && (
                    <>
                      <div className="sec">進行中の調略</div>
                      {running.map((x, i) => (
                        <div className="row" key={i}>
                          <span>{(g.castles.find((y) => y.id === x.castleId) || {}).name}／{x.type}</span>
                          <span className="v">あと{x.monthsLeft}か月</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {tab === "特殊勢力" && (
                <>
                  {nearTowns.map((t) => {
                    const st = g.specials[t.id] || {};
                    const opts = SPECIAL_OPTIONS[t.kind] || [];
                    return (
                      <div key={t.id} style={{ borderBottom: `1px solid ${U.line2}`, paddingBottom: 8, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="mn" style={{ fontSize: 15 }}>{t.name}</span>
                          <span className="pill" style={{ background: "#8A8478" }}>{t.kind}</span>
                          <span style={{ fontSize: 12, color: U.dim }}>
                            {st.faction === g.player ? `関係：${st.state}` : st.faction ? `他勢力が${st.state}` : "中立"}
                            {st.anger > 0 ? `／反発${Math.round(st.anger)}` : ""}
                          </span>
                        </div>
                        <div className="g3" style={{ marginTop: 6 }}>
                          {opts.map((o) => (
                            <button key={o.key} className={`btn sm ${st.faction === g.player && st.state === o.key ? "on" : ""}`}
                              title={o.desc} disabled={g.factions[g.player].gold < (o.cost || 0)}
                              onClick={() => onSpecial(t.id, o.key)}>{o.key}</button>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: U.dim, marginTop: 4, lineHeight: 1.6 }}>
                          {opts.map((o) => `${o.key}：${o.desc}`).join("　")}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {g.ledger.length > 0 && (
                <>
                  <div className="sec">実行前 → 実行後</div>
                  {g.ledger.slice(0, 3).map((l, i) => (
                    <div className="led" key={i}>
                      <div style={{ marginBottom: 3 }}><b>{l.castle}／{l.cmd}</b>　担当 {l.general}　費用 {fmt(l.cost)}貫</div>
                      {l.lines.map((x, j) => {
                        if (x.text) return <div key={j}>{x.text}</div>;
                        const d = x.after - x.before;
                        return (
                          <div key={j} className="num">
                            {x.label}　{fmt(x.before)} → {fmt(x.after)}{x.unit}
                            {d !== 0 && <span className={d < 0 ? "dn" : "up"}>　{d > 0 ? "+" : ""}{fmt(d)}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SortieDialog({ g, from, onClose, onGo }) {
  const c = g.castles.find((x) => x.id === from);
  const gens = g.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
  const tooLow = [];
  const [picked, setPicked] = useState(gens.slice(0, 2).map((x) => x.id));
  const [to, setTo] = useState(() => {
    const foes = g.castles.filter((x) => x.faction !== c.faction);
    const near = foes.map((x) => ({ id: x.id, d: marchMonths(from, x.id) || 99 }))
      .sort((a, b) => a.d - b.d)[0];
    return near ? near.id : (foes[0] || {}).id;
  });
  const garrison = minGarrison(c);
  const retSum = picked.reduce((a, id) => { const x = gens.find((q) => q.id === id); return a + (x ? x.retinue : 0); }, 0);
  // 身分ごとに率いられる兵に限りがある（GDD 6.4）
  const cmdLimit = picked.reduce((a, id) => {
    const x = gens.find((q) => q.id === id);
    return a + (x ? troopLimit(x, g) : 0);
  }, 0);
  const availLocal = Math.max(0, Math.min(
    c.local,
    c.local + gens.reduce((a, x) => a + x.retinue, 0) - garrison - retSum,
    Math.max(0, cmdLimit - retSum),          // 将の器を超えては率いられぬ
  ));
  const [local, setLocal] = useState(0);
  const [aid, setAid] = useState([]);
  useEffect(() => { setLocal(Math.round(availLocal * 0.6)); }, [picked.length]); // eslint-disable-line
  const offers = to ? reinforceOffers(g, from, to) : [];
  const useLocal = Math.min(local, availLocal);
  const men = retSum + useLocal;
  const food = Math.round(men * 0.6);
  const path = findPath(from, to);
  const dist = path ? path.slice(1).reduce((a, n, i) => { const r = roadBetween(path[i], n); return a + (r ? r[2] / ROAD_SPEED[r[3]] : 10); }, 0) : 0;

  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>出陣　{c.name}</div>
        <div style={{ fontSize: 12, color: U.dim, marginBottom: 10 }}>
          総大将は{c.name}の城主。目標は自領のいずれかの城と街道でつながる城に限る。
        </div>
        <div className="sec">目標拠点</div>
        <select className="sel" style={{ width: "100%" }} value={to} onChange={(e) => setTo(e.target.value)}>
          {g.castles
            .filter((x) => x.id !== from && (x.faction === c.faction || canAttack(g, x.id)))
            .map((x) => ({ x, m: marchMonths(from, x.id) || 99 }))
            // 隣り合う城か、味方の城を伝って辿れる先にしか兵は出せぬ。
            // 遠国へ攻め入るには、まずその手前を切り取らねばならない。
            .filter(({ x, m }) => {
              if (x.faction === c.faction) return m <= 6;      // 味方の城へは寄せられる
              const path = findPath(from, x.id);
              if (!path) return false;
              // 途中の城がすべて味方（または同盟）でなければ通れない
              for (let i = 1; i < path.length - 1; i++) {
                const mid = g.castles.find((y) => y.id === path[i]);
                if (!mid) return false;
                if (mid.faction === c.faction) continue;
                const st = relOf(g, c.faction, mid.faction).state;
                if (st !== "同盟" && st !== "従属" && st !== "臣従") return false;
              }
              return m <= 6;
            })
            // 攻められている自城を先に並べる。救わねばならぬ城が埋もれては困る。
            .map(({ x, m }) => ({ x, m,
              peril: x.faction === c.faction
                && (g.sieges.some((sg) => sg.castleId === x.id)
                  || g.armies.some((a) => a.target === x.id && a.faction !== c.faction)) }))
            .sort((a, b) => (b.peril ? 1 : 0) - (a.peril ? 1 : 0) || a.m - b.m)
            .map(({ x, m, peril }) => (
              <option key={x.id} value={x.id}>
                {`${peril ? "【急】" : x.faction === c.faction ? "［味方］" : "［敵］"}${x.name}（${g.factions[x.faction].name}）　約${m}か月`}
              </option>
            ))}
        </select>
        {(() => {
          const t2 = g.castles.find((x) => x.id === to);
          if (!t2 || t2.faction !== c.faction) return null;
          const sieged = g.sieges.some((sg) => sg.castleId === t2.id);
          const coming = g.armies.filter((a) => a.target === t2.id && a.faction !== c.faction);
          if (!sieged && !coming.length) return null;
          return (
            <div style={{ fontSize: 12.5, color: "#B0483C", marginTop: 6, lineHeight: 1.8,
              borderLeft: "3px solid #B0483C", paddingLeft: 10 }}>
              <b>{t2.name}は危うい。</b><br />
              <span style={{ color: U.dim, fontSize: 11.5 }}>
                {sieged ? "囲まれています。着けば囲みを解くための野戦になります。" : ""}
                {coming.length ? `${coming.map((a) => g.factions[a.faction].name).join("・")}の軍が向かっています。` : ""}
                <br />援軍として入れば、城の守りに加わります。
              </span>
            </div>
          );
        })()}
        <div style={{ fontSize: 12, color: U.dim, marginTop: 6 }}>
          経路：{path ? path.map((n) => nodeById(n).name).join(" → ") : "経路なし"}　／　所要 約{Math.max(1, Math.ceil(dist / 300))}か月
        </div>
        {(() => {
          const t = g.castles.find((x) => x.id === to);
          return t && t.faction === c.faction
            ? <div style={{ fontSize: 12, color: "#B0483C", marginTop: 4 }}>味方の城です。到着しても合戦は起きず、兵は城へ合流します。</div>
            : null;
        })()}

        <div className="sec">参加武将（先頭が総大将）</div>
        {gens.map((x) => (
          <label key={x.id} style={{ display: "flex", gap: 9, alignItems: "center", padding: "5px 0", fontSize: 13 }}>
            <input type="checkbox" checked={picked.includes(x.id)}
              onChange={() => setPicked((p) => (p.includes(x.id) ? p.filter((y) => y !== x.id) : [...p, x.id]))} />
            <span className="mn" style={{ fontSize: 15 }}>{x.name}
              <span style={{ fontSize: 10.5, color: U.dim, marginLeft: 5 }}>{rankName(x, g)}</span>
            </span>
            <span className="num" style={{ color: U.dim, fontSize: 11 }}>統{x.lead} 武{x.valor} 知{x.wit}／直属{fmt(x.retinue)}</span>
          </label>
        ))}
        <div style={{ fontSize: 11, color: U.dim, marginTop: 6, lineHeight: 1.7 }}>
          率いられる兵には身分の限りがあります。
          物頭は五百人、侍大将は千六百人、家老は二千五百人、宿老は四千人まで。
          {(() => {
            const sum = picked.map((id) => gens.find((x) => x.id === id))
              .filter(Boolean).reduce((a, x) => a + troopLimit(x, g), 0);
            return <><br />選んだ将で率いられるのは <b style={{ color: U.text }}>{fmt(sum)}人</b>まで。</>;
          })()}
        </div>

        <div className="sec">地域家臣団の同行</div>
        <input type="range" min="0" max={availLocal} value={useLocal} onChange={(e) => setLocal(+e.target.value)} style={{ width: "100%" }} />
        <div className="row"><span>同行</span><span className="v">{fmt(useLocal)} / {fmt(availLocal)} 人</span></div>
        <div className="row"><span>城に残る兵</span>
          <span className="v">{fmt(c.local - useLocal + gens.filter((x) => !picked.includes(x.id)).reduce((a, x) => a + x.retinue, 0))} 人（最低 {fmt(garrison)}）</span></div>

        <div className="sec">寄騎を求める（GDD 7.3）</div>
        <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.6 }}>
          一方の陣に並べられるのは{MAX_CORPS}隊まで（関ヶ原の参陣数に合わせた上限）。
          本隊で{picked.length}隊を使うので、寄騎は残り{Math.max(0, MAX_CORPS - picked.length)}隊まで加われる。
          一隊が抱えられる兵は{fmt(MAX_CORPS_MEN)}人までで、あふれた分は隊として立てられない。
        </div>
        {offers.length === 0 && <div style={{ fontSize: 12, color: U.dim }}>援軍を求められる相手がいない。</div>}
        {offers.map((o) => (
          <label key={o.castleId} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", fontSize: 12.5 }}>
            <input type="checkbox"
              disabled={!!o.reason || (!aid.includes(o.castleId) && picked.length + aid.length >= MAX_CORPS)}
              checked={aid.includes(o.castleId)}
              onChange={() => setAid((p2) => (p2.includes(o.castleId) ? p2.filter((y) => y !== o.castleId) : [...p2, o.castleId]))} />
            <span>
              <span className="mn" style={{ fontSize: 14 }}>{o.name}</span>
              <span className="pill" style={{ background: g.factions[o.faction].color, marginLeft: 6 }}>{o.kind}</span>
              <span style={{ color: U.dim, marginLeft: 6 }}>
                {o.reason ? o.reason : `約${fmt(o.men)}人／到着まで約${o.months}か月${o.chance < 1 ? `／応じる見込み${Math.round(o.chance * 100)}%` : ""}`}
              </span>
            </span>
          </label>
        ))}

        <div className="sec">兵科内訳（50人組に分割）</div>
        <div className="g2">
          {ARMS.map((a) => (
            <div className="row" key={a.key}><span>{a.label}</span><span className="v">{fmt(men * a.ratio)}人／{Math.ceil((men * a.ratio) / 50)}組</span></div>
          ))}
        </div>
        <div className="row"><span>携行兵糧</span><span className="v">{fmt(food)} 石（城残 {fmt(c.food - food)}）</span></div>

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>取りやめ</button>
          <button className="btn dark" style={{ flex: 2 }} disabled={!to || !path || !picked.length || men < 200 || c.food < food}
            onClick={() => onGo({ from, to, gens: picked, local: useLocal, food,
              reinforce: offers.filter((o) => aid.includes(o.castleId)) })}>{fmt(men)}人で進発</button>
        </div>
        {c.food < food && <div style={{ color: "#B0483C", fontSize: 12, marginTop: 7 }}>兵糧が足りない。収穫を待つか、開墾を進める必要がある。</div>}
      </div>
    </div>
  );
}

function MonthReport({ g, onClose }) {
  const mine = g.castles.filter((c) => c.faction === g.player);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>{g.year}年{g.month}月　月初報告</div>
        {(() => {
          const fc = forecast(g, g.player);
          const warn = fc.months != null && fc.months <= 6;
          return (
            <>
              <div className="sec">来月の見通し</div>
              <div className="row"><span>金銭</span>
                <span className="v num">
                  {fmt(fc.gold)}貫　
                  <span style={{ color: fc.netGold >= 0 ? "#3E7A3A" : "#B0483C" }}>
                    {fc.netGold >= 0 ? "＋" : "−"}{fmt(Math.abs(fc.netGold))}
                  </span>
                  <span style={{ color: U.dim, fontSize: 11 }}>（入{fmt(fc.inGold)}／出{fmt(fc.outGold)}）</span>
                </span></div>
              <div className="row"><span>兵糧</span>
                <span className="v num">
                  {fmt(fc.food)}石　
                  <span style={{ color: fc.netFood >= 0 ? "#3E7A3A" : "#B0483C" }}>
                    {fc.netFood >= 0 ? "＋" : "−"}{fmt(Math.abs(fc.netFood))}
                  </span>
                  <span style={{ color: U.dim, fontSize: 11 }}>（入{fmt(fc.inFood)}／出{fmt(fc.outFood)}）</span>
                </span></div>
              <div className="row"><span>抱える兵</span><span className="v num">{fmt(fc.troops)}人</span></div>
              <div style={{ fontSize: 11.5, color: warn ? "#B0483C" : U.dim, marginTop: 4, lineHeight: 1.7 }}>
                {fc.harvest ? "来月は収穫の月。兵糧が三倍入る。" : ""}
                {fc.months != null
                  ? `　このままなら兵糧は約${fc.months}か月で尽きる。`
                  : fc.netFood < 0 ? "　兵糧は当面もつ。" : "　兵糧は増えている。"}
              </div>
            </>
          );
        })()}
        <div className="sec">領内</div>
        {mine.map((c) => {
          const men = c.local + g.generals.filter((x) => x.at === c.id && x.faction === g.player).reduce((a, x) => a + x.retinue, 0);
          const days = foodDays(c.food, men);
          const pv = (g.prev || {})[c.id];
          const D = (now, before, unit) => {
            const d = before == null ? 0 : Math.round(now - before);
            return <span className="num">{fmt(now)}{unit}{d !== 0 && <span className={d < 0 ? "dn" : "up"}> {d > 0 ? "+" : ""}{fmt(d)}</span>}</span>;
          };
          return (
            <div key={c.id} style={{ padding: "6px 0", borderBottom: `1px solid ${U.line2}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span className="mn" style={{ fontSize: 15 }}>{c.name}</span>
                <span style={{ color: days < 60 ? "#B0483C" : U.dim, fontSize: 12 }}>兵糧 {days} 日分</span>
              </div>
              <div style={{ fontSize: 12, color: U.dim, display: "flex", gap: 12, flexWrap: "wrap", marginTop: 3 }}>
                <span>石高 {D(c.koku, pv && pv.koku)}</span>
                <span>人口 {D(c.pop, pv && pv.pop)}</span>
                <span>兵糧 {D(c.food, pv && pv.food)}</span>
                <span>兵力 {D(men, pv && pv.men)}</span>
                <span>練度 {D(Math.round(c.localTrain), pv && Math.round(pv.localTrain))}</span>
                <span>民忠 {D(Math.round(c.min), pv && Math.round(pv.min))}</span>
              </div>
            </div>
          );
        })}
        <div className="row" style={{ borderTop: `1px solid ${U.line2}`, marginTop: 6, paddingTop: 6 }}>
          <span>金銭</span>
          <span className="v num">{fmt(g.factions[g.player].gold)} 貫
            {g.prevGold != null && g.factions[g.player].gold - g.prevGold !== 0 && (
              <span className={g.factions[g.player].gold - g.prevGold < 0 ? "dn" : "up"}>
                {" "}{g.factions[g.player].gold - g.prevGold > 0 ? "+" : ""}{fmt(g.factions[g.player].gold - g.prevGold)}
              </span>)}
          </span>
        </div>
        <div className="sec">報せ</div>
        {(g.monthEvents || []).length === 0 && <div style={{ fontSize: 12, color: U.dim }}>特に報せはない。</div>}
        {(g.monthEvents || []).map((e, i) => <div key={i} style={{ fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${U.line2}` }}>{e}</div>)}
        <button className="btn dark" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>評定を開く</button>
      </div>
    </div>
  );
}

function Chronicle({ g, onClose }) {
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 12 }}>戦国記</div>
        {[...g.chronicle].reverse().map((c, i) => (
          <div key={i} style={{ padding: "7px 0", borderBottom: `1px solid ${U.line2}`, fontSize: 13 }}>
            <span className="num" style={{ color: U.dim, marginRight: 10 }}>{c.y}年{c.m}月</span>
            <span className="mn">{c.text}</span>
          </div>
        ))}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

function FactionInfo({ g, onClose }) {
  const rows = Object.values(g.factions).map((f) => {
    const cs = g.castles.filter((c) => c.faction === f.id);
    const gs = g.generals.filter((x) => x.faction === f.id);
    return {
      f, koku: cs.reduce((a, c) => a + c.koku, 0),
      men: cs.reduce((a, c) => a + c.local, 0) + gs.filter((x) => x.at).reduce((a, x) => a + x.retinue, 0),
      castles: cs.length, gens: gs.length,
    };
  }).sort((a, b) => b.koku - a.koku);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 12 }}>勢力情報</div>
        {rows.map((r) => (
          <div key={r.f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${U.line2}`, flexWrap: "wrap" }}>
            <span className="dot" style={{ background: r.f.color }} />
            <span className="mn" style={{ fontSize: 16, flex: 1 }}>{r.f.full}
              {r.f.id === g.player && <span className="pill" style={{ background: r.f.color, marginLeft: 7 }}>自勢力</span>}</span>
            <span className="num" style={{ fontSize: 12, color: U.dim }}>
              {man(r.koku)}万石／兵{fmt(r.men)}／{r.castles}城／武将{r.gens}名／威信{Math.round(r.f.prestige || 50)}
              {r.f.id !== g.player && (() => {
                const rl = relOf(g, g.player, r.f.id);
                return `／${rl.state}・信用${Math.round(rl.trust)}${rl.until ? `（残${monthsBetween(g.year, g.month, rl.until.y, rl.until.m)}か月）` : ""}`;
              })()}
            </span>
          </div>
        ))}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

function GeneralList({ g, onClose }) {
  const gs = g.generals.filter((x) => x.faction === g.player);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 12 }}>武将一覧</div>
        {gs.map((x) => (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${U.line2}`, fontSize: 13, flexWrap: "wrap" }}>
            <span className="mn" style={{ fontSize: 15, width: 100 }}>
              {x.name}
              {isNameless(x) && <span style={{ color: "#9B9384", fontSize: 10, marginLeft: 2 }}>〔伝〕</span>}
            </span>
            <span className="num" style={{ color: U.dim, flex: 1 }}>統{x.lead} 武{x.valor} 知{x.wit} 政{x.gov} 忠{x.loyal}</span>
            <span style={{ color: U.dim }}>{x.at ? (g.castles.find((c) => c.id === x.at) || {}).name : "出征中"}</span>
            <span className="num">直属 {fmt(x.retinue)}</span>
          </div>
        ))}
        {gs.some((x) => isNameless(x)) && (
          <div style={{ fontSize: 11, color: U.dim, marginTop: 10, lineHeight: 1.7 }}>
            〔伝〕は名の伝わらぬ在地の長です。地名に「乙名」「按司」を添えた呼び名であり、実在の人名ではありません。
          </div>
        )}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

function GoalPanel({ g, onClose }) {
  const mine = g.castles.filter((c) => c.faction === g.player);
  const near = g.castles.filter((c) => c.faction !== g.player).map((r) => ({
    r, d: Math.min(...mine.map((m) => { const p = findPath(m.id, r.id); return p ? p.length : 99; })),
  })).sort((a, b) => a.d - b.d).slice(0, 4);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 6 }}>攻略目標</div>
        <div style={{ fontSize: 12, color: U.dim, marginBottom: 12 }}>
          当面の目標は尾張・美濃の統一。史実の順序は強制されません。
        </div>
        {near.map(({ r, d }) => {
          const men = r.local + g.generals.filter((x) => x.at === r.id && x.faction === r.faction).reduce((a, x) => a + x.retinue, 0);
          return (
            <div key={r.id} className="row">
              <span><span className="mn" style={{ fontSize: 15 }}>{r.name}</span>
                <span className="pill" style={{ background: g.factions[r.faction].color, marginLeft: 7 }}>{g.factions[r.faction].name}</span></span>
              <span className="v" style={{ color: U.dim, fontSize: 12 }}>兵{fmt(men)}／城防{Math.round(r.def)}／街道{d - 1}区間</span>
            </div>
          );
        })}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

function CampaignPanel({ g, camp, onAct }) {
  const dest = g.castles.find((c) => c.id === camp.target);
  if (!dest) return null;
  const arm = (id) => g.armies.find((x) => x.id === id);
  const arrived = camp.arrived.map(arm).filter(Boolean);
  const late = camp.armies.filter((id) => !camp.arrived.includes(id)).map(arm).filter(Boolean);
  const men = arrived.reduce((a, x) => a + x.men, 0);
  const lateMen = late.reduce((a, x) => a + x.men, 0);
  const defGens = g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive);
  const defMen = dest.local + defGens.reduce((a, x) => a + x.retinue, 0);
  const nameOf = (a) => {
    const gen = g.generals.find((x) => x.id === a.gens[0]);
    const home = g.castles.find((c) => c.id === a.from);
    return `${home ? home.name : "―"}の${gen ? gen.name : "手勢"}`;
  };
  const eta = (a) => {
    const m = marchMonths(a.path[0], camp.target);
    return m == null ? "?" : m;
  };
  return (
    <div className="modal">
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>{dest.name}攻め　軍議</div>
        <div style={{ fontSize: 12, color: U.dim, marginBottom: 10 }}>
          総大将 {camp.leaderName}（{(g.castles.find((c) => c.id === camp.from) || {}).name}）
          ／ {camp.y}年{camp.m}月に発向 ／ 待った月 {camp.waited}
        </div>

        <div className="sec">着陣した軍</div>
        {arrived.map((a) => (
          <div className="row" key={a.id}>
            <span>{nameOf(a)}</span>
            <span className="v">{fmt(a.men)}人／兵糧{Math.round((a.food / Math.max(1, a.men * 0.09)) * 30)}日</span>
          </div>
        ))}
        <div className="row" style={{ fontWeight: 600 }}><span>着陣の合計</span><span className="v">{fmt(men)}人</span></div>

        <div className="sec">まだ着かぬ軍（寄騎）</div>
        {late.length === 0 && <div style={{ fontSize: 12, color: U.dim }}>遅参はない。全軍がそろっている。</div>}
        {late.map((a) => (
          <div className="row" key={a.id}>
            <span>{nameOf(a)}</span>
            <span className="v" style={{ color: "#B0483C" }}>{fmt(a.men)}人／あと約{eta(a)}か月</span>
          </div>
        ))}

        <div className="sec">城方</div>
        <div className="row"><span>{dest.name}（{g.factions[dest.faction].name}）</span>
          <span className="v">{canSee(g, dest) ? `${fmt(defMen)}人／城防${Math.round(dest.def)}` : "内情不明"}</span></div>

        <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.7, margin: "12px 0" }}>
          待てば{fmt(lateMen)}人が加わるが、城方は毎月備えを固め、こちらは兵糧を減らす。
          先に攻めかかれば数は劣るが、備えの薄いうちに当たれる。決めるのは総大将である。
        </div>
        <div className="g3">
          <button className="btn dark" onClick={() => onAct(camp, "攻")} disabled={!arrived.length}>
            {late.length ? "待たずに攻めかかる" : "攻めかかる"}
          </button>
          <button className="btn" onClick={() => onAct(camp, "待")} disabled={!late.length}>遅参を待つ</button>
          <button className="btn" onClick={() => onAct(camp, "退")}>兵を退く</button>
        </div>
      </div>
    </div>
  );
}

function SiegePanel({ g, sg, onChoose }) {
  const [gate, setGate] = useState(false);
  const [kits, setKits] = useState({});
  const c = g.castles.find((x) => x.id === sg.castleId);
  const a = g.armies.find((x) => x.id === sg.armyId);
  if (!c || !a) return null;
  const mine = a.faction === g.player;
  const gateOK = a.men >= 540;
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 10 }}>{c.name}　包囲中（{sg.months}か月）</div>
        <div className="row"><span>攻め手（{g.factions[a.faction].name}）</span><span className="v">{fmt(a.men)}人／兵糧 {fmt(a.food)}石</span></div>
        <div className="row"><span>守り手（{g.factions[c.faction].name}）</span><span className="v">{fmt(c.local)}人／兵糧 {fmt(c.food)}石</span></div>
        <div className="row"><span>城防／民忠／耐久</span><span className="v">{Math.round(c.def)} / {Math.round(c.min)} / {fmt(c.hp)}</span></div>
        <div className="row"><span>包囲率</span><span className="v">{sg.enc == null ? "―" : `${sg.enc}%`}
          {sg.enc != null && sg.enc < 75 ? <span style={{ color: U.dim, fontSize: 11 }}>　後詰が入り得る</span> : null}</span></div>
        <div className="row"><span>城の井戸</span><span className="v">{Math.round(c.well == null ? 100 : c.well)} / 100</span></div>
        <div style={{ fontSize: 12, color: U.dim, margin: "12px 0" }}>
          強攻を選ぶと、城とその周辺の図へ移ります。城防に応じて曲輪が二重から四重になり、
          門の前には虎口が構えています。門を破って曲輪を進み、本丸を押さえれば落城です。
        </div>
        {mine ? (
          <>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, marginBottom: 10, lineHeight: 1.6 }}>
              <input type="checkbox" checked={gate && gateOK} disabled={!gateOK} onChange={() => setGate((v) => !v)} />
              <span>
                <b>城門攻撃隊を編成する</b>（槍・攻撃兵300以上が必要。現有 {fmt(a.men)}人{gateOK ? "" : "／不足"}）<br />
                <span style={{ color: U.dim }}>
                  門を破れば城防の効きが3割落ち、守り手の損害が25%増える。代わりに門へ取り付いた300人のうち4分の1が失われる。
                </span>
              </span>
            </label>
            <div className="sec">攻城の道具（強攻のときに使う）</div>
            <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.6 }}>
              槍組の一部を割いて担がせる。効くのは<b>門を破る速さ</b>と<b>城内からの被害</b>だけで、野戦の働きは変わらない。
            </div>
            {(a.gens || []).map((gid) => {
              const gg = g.generals.find((x) => x.id === gid);
              if (!gg) return null;
              const cur = (kits && kits[gid]) || "なし";
              return (
                <div key={gid} style={{ marginBottom: 6 }}>
                  <div className="mn" style={{ fontSize: 12.5 }}>{gg.name}</div>
                  <div className="g4" style={{ marginTop: 3 }}>
                    {Object.keys(SIEGE_KIT).map((k) => (
                      <button key={k} className={`btn sm ${cur === k ? "on" : ""}`}
                        onClick={() => setKits((v) => ({ ...v, [gid]: k }))}>{k}</button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: U.dim, marginBottom: 8 }}>
              {Object.entries(SIEGE_KIT).filter(([k]) => k !== "なし").map(([k, v]) => `${k}：${v.note}`).join("　")}
            </div>
            <div className="g3">
              <button className="btn" onClick={() => onChoose("兵糧攻め")}>兵糧攻め</button>
              <button className="btn" onClick={() => onChoose("強攻", gate && gateOK, kits)}>強攻</button>
              <button className="btn" onClick={() => onChoose("撤退")}>撤退</button>
            </div>
          </>
        ) : (
          <div className="g2">
            <button className="btn" onClick={() => onChoose("防衛", false, false)}>籠城して待つ</button>
            <button className="btn" onClick={() => onChoose("防衛", false, true)}>討って出る</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- 偏諱による命名 */
const SURNAMES = ["林", "佐脇", "岩室", "山口", "中野", "塙", "河尻", "毛利", "蜂屋", "生駒", "梁田", "赤川"];
const COMMON = ["源三", "又八", "小六", "藤七", "彦九郎", "孫市", "五郎左", "半助", "新七"];
const CHARS = ["勝", "貞", "秀", "忠", "政", "盛", "通", "直", "綱", "元", "泰", "房", "重", "光", "定"];
const FEATS = ["橋際で崩れかけた隊列を立て直し、敵の渡河を阻んだ。", "森の伏兵をいち早く見つけ、味方の側面を救った。", "退き口を開き、殿を務めて主将を逃がした。"];

function makePromotion(lord, allGens) {
  const sur = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const common = COMMON[Math.floor(Math.random() * COMMON.length)];
  const given = lord.name.slice(2);
  const henki = given[Math.floor(Math.random() * given.length)] || "長";
  const used = new Set(allGens.map((x) => x.name));
  const cands = [];
  let guard = 0;
  while (cands.length < 4 && guard++ < 60) {
    const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
    for (const n of [`${sur}${henki}${ch}`, `${sur}${ch}${henki}`]) if (!used.has(n) && !cands.includes(n)) cands.push(n);
  }
  if (!cands.length) cands.push(`${sur}${henki}勝`);
  return {
    oldName: `${sur}${common}`, lordName: lord.name, henki,
    candidates: cands.slice(0, 4), feat: FEATS[Math.floor(Math.random() * FEATS.length)],
  };
}

// 捕らえた武将の処遇を問う（GDD 12.3）
function CaptiveDialog({ g, gen, onDone }) {
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState(false);
  const loy = gen.loyal == null ? 60 : gen.loyal;
  const from = g.factions[gen.captive ? gen.captive.from : gen.faction];
  return (
    <div className="modal">
      <div className="card">
        <div className="mn" style={{ fontSize: 19 }}>{gen.name}を捕らえた</div>
        <div style={{ fontSize: 12.5, color: U.dim, marginTop: 6, lineHeight: 1.8 }}>
          {from ? from.name : "旧主"}の家臣。統率{gen.lead}／武勇{gen.valor}／知略{gen.wit}／政務{gen.gov}<br />
          旧主への忠誠 <b>{Math.round(loy)}</b>
          {failed && <span style={{ color: "#B0483C" }}>　── 降ることを拒んだ</span>}
        </div>
        {!tried && (
          <div style={{ fontSize: 11.5, color: U.dim, margin: "8px 0", lineHeight: 1.7 }}>
            忠誠40以下なら降る。41から70は運による。71以上は決して降らぬ。
          </div>
        )}
        <div className="g2" style={{ marginTop: 10 }}>
          {!tried && (
            <button className="btn dark" onClick={() => {
              if (persuadeResult(gen)) onDone("登用");
              else { setTried(true); setFailed(true); }
            }}>登用する</button>
          )}
          <button className="btn" onClick={() => onDone("逃す")}>逃す</button>
          <button className="btn" onClick={() => onDone("斬首")}>斬首する</button>
          <button className="btn" onClick={() => onDone("捕虜")}>捕虜とする</button>
        </div>
      </div>
    </div>
  );
}
function PromotionDialog({ promo, onDone }) {
  const [pick, setPick] = useState(promo.candidates[0]);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card" style={{ maxWidth: 460 }}>
        <div className="mn" style={{ fontSize: 21, marginBottom: 8 }}>正式武将への昇進</div>
        <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 14 }}>
          <span className="mn" style={{ fontSize: 17 }}>{promo.oldName}</span> が戦功を挙げた。<br />
          <span style={{ color: U.dim }}>{promo.feat}</span><br />
          {promo.lordName}より偏諱「<span className="mn" style={{ fontSize: 19 }}>{promo.henki}</span>」の一字を与え、諱を定める。
        </div>
        <div className="g2">
          {promo.candidates.map((n) => (
            <button key={n} className={`btn mn ${pick === n ? "on" : ""}`} style={{ fontSize: 17 }} onClick={() => setPick(n)}>{n}</button>
          ))}
        </div>
        <button className="btn dark" style={{ width: "100%", marginTop: 14 }} onClick={() => onDone(pick)}>{pick} と名乗らせる</button>
      </div>
    </div>
  );
}

/* 陣形の見取り図つき選択。50人組の実配置がそのまま図になる（GDD 8.4） */
function FormationDiagram({ form, color, size }) {
  const slots = layoutSlots(form, 12);
  const xs = slots.map((s) => s.x), ys = slots.map((s) => s.y);
  const x0 = Math.min(...xs) - 8, x1 = Math.max(...xs) + 8;
  const y0 = Math.min(...ys) - 8, y1 = Math.max(...ys) + 8;
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  return (
    <svg viewBox={`${x0} ${y0} ${w} ${h}`} width={size} height={size * 0.62}
      preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {slots.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={7} fill={color} opacity={0.85} />)}
    </svg>
  );
}
function FormationPicker({ corps, onPick }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, margin: "2px 0 5px" }}>陣形</div>
      <div className="g3">
        {FORMATIONS.map((f) => (
          <button key={f} className={`btn sm ${corps.formation === f ? "on" : ""}`} title={FORM_NOTE[f]}
            style={{ padding: "5px 3px", lineHeight: 1.2 }} onClick={() => onPick(f)}>
            <FormationDiagram form={f} color={corps.color} size={54} />
            <span style={{ fontSize: 11.5 }}>{f}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.6, marginTop: 5 }}>{FORM_NOTE[corps.formation]}</div>
    </div>
  );
}

/* --------------------------------------------------------------- 合戦画面 */
function BattleScreen({ ctx, land, onEnd }) {
  const canvasRef = useRef(null), terrainRef = useRef(null), bRef = useRef(ctx.b), wrapRef = useRef(null);
  const [, force] = useState(0);
  const [sel, setSel] = useState(null);
  const [speed, setSpeedState] = useState(0);
  const [phase, setPhase] = useState("deploy");
  const [panel, setPanel] = useState(true);
  const [selAll, setSelAll] = useState(false);
  const [wide, setWide] = useState(false);
  const [faceMode, setFaceMode] = useState(false);
  const faceRef = useRef(false);
  const speedRef = useRef(0), selRef = useRef(null), uiRef = useRef(0), allRef = useRef(false);
  const camRef = useRef({ x: FIELD.w / 2, y: FIELD.h / 2, s: 0.7 });
  const gesture = useRef(null);
  const setSpeed = (v) => { speedRef.current = v; setSpeedState(v); };
  const pickCorps = (v) => { selRef.current = v; setSel(v); if (v) { allRef.current = false; setSelAll(false); } };
  const setFace = (v) => { faceRef.current = v; setFaceMode(v); };

  const brokeRef = useRef(-1);
  const paintTerrain = () => {
    const t = terrainRef.current || document.createElement("canvas");
    t.width = FIELD.w; t.height = FIELD.h;
    const g2 = t.getContext("2d");
    if (ctx.mode === "castle" && ctx.b.map) drawCastleTerrain(g2, ctx.b.map);
    else drawFieldTerrain(g2);
    terrainRef.current = t;
  };
  useEffect(() => {
    paintTerrain();
    const t = terrainRef.current;
    const w = wrapRef.current;
    if (w && w.clientWidth) {
      camRef.current.s = clamp(Math.min(w.clientWidth / FIELD.w, w.clientHeight / FIELD.h) * 0.98, 0.2, 3);
    }
  }, []);

  // 戦場のドラッグが端末側のスクロールや戻る操作に伝わらないようにする
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const block = (e) => e.preventDefault();
    el.addEventListener("touchmove", block, { passive: false });
    el.addEventListener("touchstart", block, { passive: false });
    return () => { el.removeEventListener("touchmove", block); el.removeEventListener("touchstart", block); };
  }, [land, panel]);

  // Esc で選択解除（GDD 8.2）
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") pickCorps(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let alive = true, handle = 0, last = 0;
    const loop = (ts) => {
      if (!alive) return;
      const b = bRef.current;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      const sp = speedRef.current;
      if (b.phase === "fight" && sp > 0) stepBattle(b, dt * sp);
      // 門が破れたら城郭図を描き直す
      if (b.map) {
        const bk = b.map.gates.filter((g) => g.broken).length * 100000
          + b.map.fac.filter((f) => f.hp <= 0).length * 3000
          + Math.round(b.map.gates.reduce((a, g) => a + g.hp, 0) / 30);
        if (bk !== brokeRef.current) { brokeRef.current = bk; paintTerrain(); }
      }
      const cv = canvasRef.current, wrap = wrapRef.current;
      if (cv && wrap && terrainRef.current) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = wrap.clientWidth || 800, H = wrap.clientHeight || 500;
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
          cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        }
        drawBattle(cv.getContext("2d"), b, selRef.current, terrainRef.current, camRef.current, W, H, dpr, allRef.current);
      }
      if (b.phase === "over" && speedRef.current !== 0) setSpeed(0);
      if (ts - uiRef.current > 100) { uiRef.current = ts; force((n) => (n + 1) % 1000); }
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(handle); };
  }, []);

  const b = bRef.current;
  const selC = b.corps.find((c) => c.id === sel && !c.dead);

  /* ---- 座標変換とカメラ操作（GDD 8.2 / 15.2） ---- */
  const toField = (clientX, clientY) => {
    const wrap = wrapRef.current, r = wrap.getBoundingClientRect();
    const cam = camRef.current;
    return {
      x: (clientX - r.left - r.width / 2) / cam.s + cam.x,
      y: (clientY - r.top - r.height / 2) / cam.s + cam.y,
    };
  };
  const zoomAt = (k, clientX, clientY) => {
    const cam = camRef.current;
    const before = clientX == null ? null : toField(clientX, clientY);
    cam.s = clamp(cam.s * k, 0.25, 3.2);
    if (before) {
      const after = toField(clientX, clientY);
      cam.x += before.x - after.x; cam.y += before.y - after.y;
    }
    force((n) => (n + 1) % 1000);
  };
  const fitAll = () => {
    const w = wrapRef.current;
    const cam = camRef.current;
    cam.x = FIELD.w / 2; cam.y = FIELD.h / 2;
    if (w) cam.s = clamp(Math.min(w.clientWidth / FIELD.w, w.clientHeight / FIELD.h) * 0.98, 0.2, 3.2);
    force((n) => (n + 1) % 1000);
  };
  // 隊のどこを押しても選べるようにする。50人組の広がりと、頭上の武将名の札を当たり判定にする。
  const hitCorps = (p, ownOnly) => {
    const sc = Math.max(0.25, camRef.current.s);
    const cands = b.corps.filter((c) => !c.dead && !c.destroyed && (!ownOnly || c.side === "P"));
    let best = null, bd = 1e9;
    for (const c of cands) {
      // 武将名の札（隊の少し上）
      const lw = 46 / sc, lh = 13 / sc, ly = c.y - 30 / sc;
      if (Math.abs(p.x - c.x) < lw && Math.abs(p.y - ly) < lh) return c;
      // 50人組の広がり
      let d = Math.hypot(c.x - p.x, c.y - p.y);
      for (const q of c.squads) {
        if (q.men <= 0) continue;
        const dq = Math.hypot(q.x - p.x, q.y - p.y);
        if (dq < d) d = dq;
      }
      const R = Math.max(26 / sc, 30);
      if (d < R && d < bd) { bd = d; best = c; }
    }
    return best;
  };

  const pointerOf = (e) => (e.touches && e.touches.length ? e.touches[0] : e.changedTouches ? e.changedTouches[0] : e);
  const onDown = (e) => {
    if (e.touches && e.touches.length === 2) {
      const [a, c2] = [e.touches[0], e.touches[1]];
      gesture.current = { mode: "pinch", d: Math.hypot(a.clientX - c2.clientX, a.clientY - c2.clientY) };
      return;
    }
    const p = pointerOf(e);
    const f = toField(p.clientX, p.clientY);
    const own = hitCorps(f, true);
    // 部隊の上から始めたドラッグは移動・布陣、空白から始めたドラッグはカメラ移動
    gesture.current = {
      mode: own ? "unit" : "camera", corps: own || null, moved: 0,
      sx: p.clientX, sy: p.clientY, camX: camRef.current.x, camY: camRef.current.y,
    };
  };
  const onMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "pinch" && e.touches && e.touches.length === 2) {
      const [a, c2] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - c2.clientX, a.clientY - c2.clientY);
      if (g.d > 0) zoomAt(d / g.d, (a.clientX + c2.clientX) / 2, (a.clientY + c2.clientY) / 2);
      g.d = d;
      return;
    }
    const p = pointerOf(e);
    g.moved = Math.max(g.moved, Math.hypot(p.clientX - g.sx, p.clientY - g.sy));
    if (g.mode === "camera") {
      const cam = camRef.current;
      cam.x = g.camX - (p.clientX - g.sx) / cam.s;
      cam.y = g.camY - (p.clientY - g.sy) / cam.s;
    }
  };
  const orderTo = (c, f, foe) => {
    c.task = null;                       // 手動命令は分遣任務より優先する
    if (faceRef.current) {
      // 前進はせず、その場で向きだけ変えて陣形を組み直す
      c.faceTo = Math.atan2(f.y - c.y, f.x - c.x);
      c.order = "転回"; c.tx = c.x; c.ty = c.y;
      setFace(false);
      return;
    }
    if (b.phase === "deploy") {
      if (inOwnZone(b, f.x, f.y)) { c.x = f.x; c.y = f.y; c.tx = f.x; c.ty = f.y; placeSquads(c, true); }
      return;
    }
    if (foe) {
      const d = Math.hypot(c.x - foe.x, c.y - foe.y) || 1;
      // 指示したときはまっすぐ向かう。森へ入れ、山を登れ、川を渡れという命令もありうる。
      const gx = foe.x + ((c.x - foe.x) / d) * 38, gy = foe.y + ((c.y - foe.y) / d) * 38;
      issueOrder(b, c, { order: "接戦", tx: gx, ty: gy });
    } else {
      c.siegeAuto = false; c.gate = null;
      issueOrder(b, c, { order: "移動", tx: f.x, ty: f.y });
    }
  };
  const onUp = (e) => {
    const g = gesture.current; gesture.current = null;
    if (!g || g.mode === "pinch") return;
    const p = pointerOf(e);
    const f = toField(p.clientX, p.clientY);
    if (g.mode === "unit" && g.moved > 8) { orderTo(g.corps, f, null); return; }   // 部隊ドラッグ＝移動／布陣
    if (g.moved > 8) return;                                                       // カメラ移動だった
    const own = hitCorps(f, true);
    if (own && !allRef.current) { pickCorps(sel === own.id ? null : own.id); return; }  // 再タップで解除
    const foe = b.corps.find((c) => !c.dead && !c.destroyed && c.side === "E" && c.seen
      && Math.hypot(c.x - f.x, c.y - f.y) < 42 / Math.max(0.4, camRef.current.s));
    if (allRef.current) {
      // 全部隊選択中は、まとまりを保ったまま全隊へ同じ目標を与える
      const live = b.corps.filter((c) => c.side === "P" && !c.dead && !c.destroyed && !c.routed);
      const cx = live.reduce((a, c) => a + c.x, 0) / Math.max(1, live.length);
      const cy = live.reduce((a, c) => a + c.y, 0) / Math.max(1, live.length);
      for (const c of live) orderTo(c, { x: f.x + (c.x - cx), y: f.y + (c.y - cy) }, foe);
      return;
    }
    if (!selC) return;
    orderTo(selC, f, foe);
  };

  const allOrder = (o) => {
    for (const c of b.corps) {
      if (c.side !== "P" || c.dead || c.destroyed || c.routed) continue;
      c.task = null;
      if (o === "前進") { c.order = "前進"; c.wp = null; c.tx = c.x; c.ty = Math.max(120, c.y - 260); }
      if (o === "接戦") {
        c.order = "接戦";
        const foes = b.corps.filter((x) => x.side === "E" && !x.dead && !x.destroyed && x.seen);
        if (foes.length) {
          const t = foes.reduce((a, x) => (Math.hypot(x.x - c.x, x.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? x : a), foes[0]);
          const d = Math.hypot(c.x - t.x, c.y - t.y) || 1;
          c.tx = t.x + ((c.x - t.x) / d) * 38; c.ty = t.y + ((c.y - t.y) / d) * 38;   // 重ならない距離で止める
        }
      }
      if (o === "射撃") { c.order = "射撃"; c.tx = c.x; c.ty = c.y; }
      if (o === "待機") { c.order = "待機"; c.tx = c.x; c.ty = c.y; }
      if (o === "撤退") { c.order = "撤退"; c.withdraw = true; c.tx = c.x; c.ty = FIELD.h + 120; }
    }
    if (o === "撤退") { b.retreat = "P"; b.orderly = true; b.log.push({ t: b.t, text: "全軍に退き鉦。統制を保って戦場を離れる。" }); }
  };

  const livingP = b.corps.filter((c) => c.side === "P" && !c.dead && !c.destroyed);
  const pMen = livingP.reduce((s, c) => s + corpsMen(c), 0);
  const eMen = b.corps.filter((c) => c.side === "E" && !c.dead && !c.destroyed && (c.seen || !c.ambush))
    .reduce((s, c) => s + corpsMen(c), 0);
  const pMor = Math.round(livingP.reduce((s, c) => s + c.morale, 0) / Math.max(1, livingP.length));
  const opts = selC && !selC.detach ? detachOptions(b, selC) : [];
  const stop = (e) => e.stopPropagation();

  // 選択中の一隊へ個別命令を出す（GDD 8.2 の一括命令と対で使う）
  const nearestFoe = (c) => {
    const foes = b.corps.filter((x) => x.side === "E" && !x.dead && !x.destroyed && x.seen);
    if (!foes.length) return null;
    return foes.reduce((a, x) => (Math.hypot(x.x - c.x, x.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? x : a), foes[0]);
  };
  const corpsOrder = (c, o) => {
    if (c && isCastle && o !== "待機") { c.siegeAuto = false; c.gate = null; }
    if (!c || c.dead || c.destroyed || c.routed) return;
    c.task = null;
    const t = nearestFoe(c);
    const standoff = (foe, gap) => {
      const d = Math.hypot(c.x - foe.x, c.y - foe.y) || 1;
      return { tx: foe.x + ((c.x - foe.x) / d) * gap, ty: foe.y + ((c.y - foe.y) / d) * gap };
    };
    let patch;
    if (o === "前進") { c.wp = null; patch = { order: "前進", tx: c.x, ty: Math.max(60, c.y - 190) }; }
    else if (o === "接戦") patch = { order: "接戦", ...(t ? standoff(t, 38) : { tx: c.tx, ty: c.ty }) };
    else if (o === "突撃") patch = { order: "突撃", chargeT: c.formation === "鋒矢" ? 26 : 16, ...(t ? standoff(t, 20) : {}) };
    else if (o === "射撃") patch = { order: "射撃", tx: c.x, ty: c.y };
    else if (o === "守備") patch = { order: "守備", formation: "方陣", tx: c.x, ty: c.y, reformT: reformTime(c.gen) };
    else if (o === "後退") {
      if (t) { const d = Math.hypot(c.x - t.x, c.y - t.y) || 1;
        patch = { order: "移動", tx: c.x + ((c.x - t.x) / d) * 170, ty: c.y + ((c.y - t.y) / d) * 170 }; }
      else patch = { order: "移動", tx: c.x, ty: Math.min(FIELD.h - 40, c.y + 170) };
    } else patch = { order: "待機", tx: c.x, ty: c.y };
    issueOrder(b, c, patch);
    force((n) => (n + 1) % 1000);
  };
  const changeForm = (c, f) => {
    if (!c || c.formation === f) return;
    c.formation = f;
    c.reformT = reformTime(c.gen);   // 統率が高いほど速く組み直せる
    placeSquads(c, b.phase === "deploy");
    force((n) => (n + 1) % 1000);
  };
  const ORDERS = ["前進", "接戦", "突撃", "射撃", "守備", "後退", "待機"];
  const isCastle = ctx.mode === "castle" && !!b.map;
  const iAmAttacker = b.attacker === "P";
  // 城攻めの命令。門・本丸・施設を目標に据える。
  const castleGo = (c, kind, gate) => {
    const m = b.map;
    if (!m || !c) return;
    if (kind === "門を破る") {
      const gt = gate || ((c.gate && !c.gate.broken && (c.gate.layer === 0 || m.layers[c.gate.layer - 1].gates.some((x) => x.broken)))
        ? c.gate : nearestOpenGate(m, c.x, c.y));
      if (!gt) return;
      c.gate = gt; c.siegeAuto = true;      // 破ったら次の門へ自ら進む
      const l = m.layers[gt.layer], a = axisOf(l, gt);
      const gp = gatePos(m, l, gt);
      // すでに取り付いていれば呼び戻さない
      if (Math.hypot(c.x - gp.x, c.y - gp.y) < 100 * (FIELD.w / BASE.w)) { issueOrder(b, c, { order: "待機" }); return; }
      const wp = routeToCastleGate(m, gt, c.x, c.y);
      if (wp.length) {
        issueOrder(b, c, { order: "前進", tx: wp[0].x, ty: wp[0].y, keepPath: true });
        c.wp = wp;
      } else {
        const p = fromUV(m, a, gateOpenU(gt), a.half + m.t + gt.masu + m.t + 30);
        issueOrder(b, c, { order: "前進", tx: p.x, ty: p.y });
      }
    } else if (kind === "本丸へ") {
      c.siegeAuto = false;                   // 別命令。門攻めの自動追随はやめる
      const hon = m.layers[m.layers.length - 1];
      if (hon.gates.some((x) => x.broken)) {
        const hg = hon.gates.find((x) => x.broken);
        const a2 = axisOf(hon, hg);
        const wp = [...routeToCastleGate(m, hg, c.x, c.y),
          fromUV(m, a2, hg.off, a2.half - 40), { x: m.cx, y: m.cy }];
        issueOrder(b, c, { order: "前進", tx: wp[0].x, ty: wp[0].y, keepPath: true });
        c.wp = wp;
      } else castleGo(c, "門を破る");
    } else if (kind === "施設を崩す") {
      c.siegeAuto = false;
      const cand = m.fac.filter((f) => f.hp > 0 && (f.layer === 0 ? m.layers[0].gates.some((x) => x.broken)
        : m.layers[f.layer].gates.some((x) => x.broken) || m.layers[f.layer - 1].gates.some((x) => x.broken)));
      const f = cand.sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0];
      if (f) issueOrder(b, c, { order: "前進", tx: f.x, ty: f.y });
      else castleGo(c, "門を破る");
    }
    force((n) => (n + 1) % 1000);
  };
  const castleAll = (kind) => {
    for (const c of b.corps) {
      if (c.side !== "P" || c.dead || c.destroyed || c.routed || c.detach) continue;
      castleGo(c, kind);
    }
  };
  const CASTLE_ORDERS = ["門を破る", "本丸へ", "施設を崩す"];
  // 城方は門を閉ざして守る。外へ出るのは「打って出る」を選んだときだけ。
  const sortieOut = (c) => {
    if (!c || !b.map || iAmAttacker) return;
    const m = b.map;
    let li = 0;
    for (let i = m.layers.length - 1; i >= 0; i--) {
      if (inRect(c.x - m.cx, c.y - m.cy, m.layers[i].hw, m.layers[i].hh)) { li = i; break; }
    }
    const gt = m.layers[li].gates[0];
    const a2 = axisOf(m.layers[li], gt);
    const p2 = fromUV(m, a2, gt.off, a2.half + m.t + 90);
    c.sortie = true; c.holdGate = null;
    issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
    notify(b, `${c.gen.name}隊が城門を開いて討って出た。`, "info");
    force((n) => (n + 1) % 1000);
  };
  const sortieBack = (c) => {
    if (!c || !b.map) return;
    c.sortie = false;
    issueOrder(b, c, { order: "移動", tx: b.map.cx, ty: b.map.cy });
    force((n) => (n + 1) % 1000);
  };
  const orderHint = {
    前進: "隊列を保って前へ出る。", 接戦: "最寄りの敵と槍を合わせる。",
    突撃: "16秒だけ勢いをつけて当たる。速く強いが隊列と疲労を大きく損なう。",
    転回: "前進せず、その場で向きだけ変える。",
    射撃: "前へ出ず、弓と鉄砲で射程を保つ。", 守備: "方陣で密集し、受ける損害を抑える。",
    後退: "敵から距離を取り直す。", 待機: "その場で隊列を整える。",
  };

  const panelBody = (
    <>
      {b.phase === "deploy" && (
        <div style={{ display: "flex", flexDirection: land ? "column" : "row", gap: 8, alignItems: land ? "stretch" : "center", flexWrap: "wrap", width: "100%" }}>
          <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.65, flex: 1 }}>
            {ctx.mode === "castle"
              ? "寄せ手は大手口の前に布陣しています。門に取り付けば門扉が傷み、破れば次の曲輪へ進めます。本丸を押さえれば城は落ちます。"
              : "隊を選び、自陣（青い帯の中）をタップかドラッグして布陣。森に置いた隊は伏兵にできます。"}<br />
            駒＝10人。<b style={{ color: ctx.pColor }}>色＝勢力</b>、<b>明るく白縁＝直属</b>／<b>暗く黒縁＝地域</b>、
            <b>形＝兵科</b>（槍は三角、騎馬は細長、弓は背が凹む、鉄砲は中央に点）。<br />
            最後尾の段は予備隊で、前線が薄くなるまで前へ出ません。<br />
            天候は<b>{b.weather}</b>：{WEATHER[b.weather].note}
          </div>
          {selC && (
            <>
              {/* 城方の命令（GDD 9.4） */}
              {isCastle && selC.side !== b.attacker && (() => {
                const MAPX = MAP;
                if (!MAPX) return null;
                const held = selC.holdGate;
                const gates = MAPX.gates.filter((g) => !g.broken && g !== held);
                return (
                  <>
                    <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 4 }}>
                      城方の指図　{held ? `いま ${held.key}` : "本丸"}
                      {selC.sallied ? "・出撃中" : selC.chasing ? "・追い討ち中" : ""}
                    </div>
                    <div className="g2">
                      <button className="btn sm" disabled={!!selC.sallied}
                        onClick={() => { sallyOut(b, selC, MAPX); force((n) => (n + 1) % 1000); }}>
                        打って出る
                      </button>
                      <button className="btn sm"
                        onClick={() => { returnToGate(b, selC, MAPX); force((n) => (n + 1) % 1000); }}>
                        城へ戻る
                      </button>
                    </div>
                    <select className="sel" style={{ width: "100%", marginTop: 4, fontSize: 12 }}
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        const g = v === "本丸" ? "本丸" : MAPX.gates.find((x) => x.key === v);
                        if (g) { moveToGate(b, selC, MAPX, g); force((n) => (n + 1) % 1000); }
                        e.target.value = "";
                      }}>
                      <option value="">他の持ち場へ移る…</option>
                      {gates.map((g) => (
                        <option key={g.key} value={g.key}>
                          {g.key}（{Math.round((g.hp / g.max) * 100)}%）
                        </option>
                      ))}
                      <option value="本丸">本丸に立て籠る</option>
                    </select>
                  </>
                );
              })()}
              <FormationPicker corps={selC} onPick={(f) => changeForm(selC, f)} />
              <button className={`btn sm ${selC.ambush ? "on" : ""}`} disabled={terrainAt(selC.x, selC.y) !== "forest"}
                onClick={() => { selC.ambush = !selC.ambush; selC.revealed = !selC.ambush; }}>伏兵に置く</button>
            </>
          )}
          <button className="btn dark" onClick={() => { b.phase = "fight"; setPhase("fight"); setSpeed(0.3); }}>合戦開始</button>
        </div>
      )}

      {b.phase === "fight" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim }}>一括命令</div>
          <div className="g4">
            <button className="btn sm" onClick={() => {
              for (const c of b.corps) if (c.side === "P" && !c.dead && !c.destroyed) c.auto = true;
              force((n) => (n + 1) % 1000);
            }}>全軍委任</button>
            <button className="btn sm" onClick={() => {
              for (const c of b.corps) if (c.side === "P" && !c.dead && !c.destroyed) { c.auto = false; issueOrder(b, c, { order: "待機", tx: c.x, ty: c.y }); }
              force((n) => (n + 1) % 1000);
            }}>全軍委任解除</button>
            <button className={`btn sm ${selAll ? "on" : ""}`}
              onClick={() => { const v = !allRef.current; allRef.current = v; setSelAll(v); if (v) { selRef.current = null; setSel(null); } }}>
              全部隊選択
            </button>
            {isCastle && iAmAttacker ? (
              <>
                <button className="btn sm" onClick={() => castleAll("門を破る")}>全軍門を破る</button>
                <button className="btn sm" onClick={() => castleAll("施設を崩す")}>全軍施設を崩す</button>
                <button className="btn sm" onClick={() => castleAll("本丸へ")}>全軍本丸へ</button>
                <button className="btn sm" onClick={() => allOrder("接戦")}>全軍接戦</button>
                <button className="btn sm" onClick={() => allOrder("撤退")}>全軍撤退</button>
              </>
            ) : (
              <>
                <button className="btn sm" onClick={() => allOrder("前進")}>全軍前進</button>
                <button className="btn sm" onClick={() => allOrder("接戦")}>全軍接戦</button>
                <button className="btn sm" onClick={() => allOrder("射撃")}>全軍弓優先</button>
                <button className="btn sm" onClick={() => allOrder("待機")}>全軍待機</button>
                <button className="btn sm" onClick={() => allOrder("撤退")}>全軍撤退</button>
              </>
            )}
          </div>
          {isCastle && (
            <div style={{ borderTop: `1px solid ${U.line2}`, paddingTop: 6 }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim }}>
                城門の押し合い（城の傾き {Math.round((b.press || 0) * 100)}%）
              </div>
              {b.map.gates.filter((gt) => !gt.broken && (gt.layer === 0 || b.map.layers[gt.layer - 1].gates.some((x) => x.broken))).map((gt) => {
                const gp = gatePos(b.map, b.map.layers[gt.layer], gt);
                const q = b.corps.filter((c) => c.side === b.attacker && corpsMen(c) > 0 && c.id !== gt.slot
                  && Math.hypot(c.x - gp.x, c.y - gp.y) < 104 * (FIELD.w / BASE.w)).length;
                return (
                  <div key={gt.key} style={{ borderBottom: `1px solid ${U.line2}`, padding: "4px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span>{gt.key}</span><span className="num">{Math.round((gt.hp / gt.max) * 100)}%</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: U.dim }}>
                      {gt.hold ? `取付 ${gt.hold}${q ? `／控え${q}隊` : ""}` : "取り付いている隊はない"}
                      {gt.def ? `　内に城兵${fmt(Math.round(gt.def))}` : ""}
                    </div>
                    {selC && iAmAttacker && (
                      <button className="btn sm" style={{ width: "100%", marginTop: 3 }}
                        onClick={() => castleGo(selC, "門を破る", gt)}>{selC.gen.name}をこの門へ</button>
                    )}
                  </div>
                );
              })}
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 6 }}>城内の施設</div>
              {b.map.fac.map((f) => (
                <div key={f.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "1px 0" }}>
                  <span style={{ color: f.hp <= 0 ? U.dim : U.text }}>{f.name}</span>
                  <span className="num" style={{ color: f.hp <= 0 ? U.dim : U.text }}>
                    {f.hp <= 0 ? "崩落" : `${Math.round((f.hp / f.max) * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {selC ? (
            <>
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, borderTop: `1px solid ${U.line2}`, paddingTop: 6 }}>
                {selC.detach ? `${selC.gen.name}隊 ${selC.task || "分遣"}` : selC.name} の命令
              </div>
              <div className="num" style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.6 }}>
                {fmt(corpsMen(selC))}人／士気{Math.round(selC.morale)}／陣形
                {Math.round(selC.squads.reduce((a, q) => a + q.cohesion, 0) / Math.max(1, selC.squads.length))}／
                疲労{Math.round(selC.fatigue)}／{TERRAIN[terrainAt(selC.x, selC.y)].label}
                {selC.chargeT > 0 ? `／突撃中 残${Math.ceil(selC.chargeT)}秒` : ""}
                {selC.reformT > 0 ? `／陣形替え中 残${Math.ceil(selC.reformT)}秒` : ""}
                {selC.faceTo != null ? "／回頭中" : ""}
                {selC.pending ? `／伝令中 残${Math.ceil(selC.pending.t)}秒` : ""}
                {outOfCommand(b, selC) ? "／指揮圏外（命令が届かない）" : ""}
                {selC.pinch >= 2 ? `／${selC.pinch}方向から挟撃を受けている` : ""}
                {isCastle && selC.kit && selC.kit !== "なし" ? `／${selC.kit}` : ""}
                {isCastle && selC.gateFat > 3 ? `／門攻めの疲れ${Math.round(selC.gateFat)}` : ""}
              </div>
              <div className="num" style={{ fontSize: 11.5, color: U.text, lineHeight: 1.6 }}>
                統率 <b>{selC.gen.lead}</b>　武勇 <b>{selC.gen.valor}</b>　知略 <b>{selC.gen.wit}</b>
                <span style={{ color: U.dim }}>
                  　（統率＝指揮圏と伝令・陣形替えの速さ、武勇＝白兵の強さ、知略＝伏兵と分遣の判断）
                </span>
              </div>
              {isCastle && iAmAttacker && (
                <div className="g4">
                  {CASTLE_ORDERS.map((o) => (
                    <button key={o} className="btn sm" onClick={() => castleGo(selC, o)}>{o}</button>
                  ))}
                </div>
              )}
              {isCastle && !iAmAttacker && (
                <div className="g2">
                  <button className="btn sm" onClick={() => sortieOut(selC)}>打って出る</button>
                  <button className="btn sm" onClick={() => sortieBack(selC)}>城内へ戻る</button>
                </div>
              )}
              <button className={`btn sm ${selC.auto ? "on" : ""}`} style={{ width: "100%", marginBottom: 5 }}
                onClick={() => {
                  selC.auto = !selC.auto;
                  if (!selC.auto) issueOrder(b, selC, { order: "待機", tx: selC.x, ty: selC.y });
                  force((n) => (n + 1) % 1000);
                }}>
                {selC.auto ? "委任中（押すと解除）" : "この隊に委任する"}
              </button>
              <div className="g4">
                {ORDERS.map((o) => (
                  <button key={o} className={`btn sm ${selC.order === o || (o === "突撃" && selC.chargeT > 0) ? "on" : ""}`}
                    title={orderHint[o]} onClick={() => { setFace(false); corpsOrder(selC, o); }}>{o}</button>
                ))}
                <button className={`btn sm ${faceMode ? "on" : ""}`} title="前進せず、その場で向きだけ変えて陣形を組み直す"
                  onClick={() => setFace(!faceMode)}>転回</button>
              </div>
              {faceMode && (
                <div style={{ fontSize: 11.5, color: "#4A6E8A", lineHeight: 1.6 }}>
                  向けたい方角をタップしてください。その場で回頭し、陣形を組み直します。統率が高いほど速く据わります。
                </div>
              )}
              {/* 城方の命令（GDD 9.4） */}
              {isCastle && selC.side !== b.attacker && (() => {
                const MAPX = MAP;
                if (!MAPX) return null;
                const held = selC.holdGate;
                const gates = MAPX.gates.filter((g) => !g.broken && g !== held);
                return (
                  <>
                    <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 4 }}>
                      城方の指図　{held ? `いま ${held.key}` : "本丸"}
                      {selC.sallied ? "・出撃中" : selC.chasing ? "・追い討ち中" : ""}
                    </div>
                    <div className="g2">
                      <button className="btn sm" disabled={!!selC.sallied}
                        onClick={() => { sallyOut(b, selC, MAPX); force((n) => (n + 1) % 1000); }}>
                        打って出る
                      </button>
                      <button className="btn sm"
                        onClick={() => { returnToGate(b, selC, MAPX); force((n) => (n + 1) % 1000); }}>
                        城へ戻る
                      </button>
                    </div>
                    <select className="sel" style={{ width: "100%", marginTop: 4, fontSize: 12 }}
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        const g = v === "本丸" ? "本丸" : MAPX.gates.find((x) => x.key === v);
                        if (g) { moveToGate(b, selC, MAPX, g); force((n) => (n + 1) % 1000); }
                        e.target.value = "";
                      }}>
                      <option value="">他の持ち場へ移る…</option>
                      {gates.map((g) => (
                        <option key={g.key} value={g.key}>
                          {g.key}（{Math.round((g.hp / g.max) * 100)}%）
                        </option>
                      ))}
                      <option value="本丸">本丸に立て籠る</option>
                    </select>
                  </>
                );
              })()}
              <FormationPicker corps={selC} onPick={(f) => changeForm(selC, f)} />
              {!selC.detach && (
                <>
                  <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim }}>
                    分遣 {opts[0] ? `${opts[0].used}／${opts[0].cap}` : ""}
                  </div>
                  <div className="g2">
                    {opts.map((o) => (
                      <button key={o.key} className="btn sm" disabled={!o.ok} title={o.why}
                        onClick={() => { makeDetachment(b, selC, o.key); force((n) => (n + 1) % 1000); }}>
                        {o.key}
                      </button>
                    ))}
                  </div>
                  {/* 出した分遣隊を呼び戻す（GDD 8.7） */}
                  {(() => {
                    const mine = b.corps.filter((x) => x.detach && !x.dead && x.parentId === selC.id);
                    if (!mine.length) return null;
                    return (
                      <>
                        <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 4 }}>
                          出している分遣
                        </div>
                        {mine.map((x) => (
                          <button key={x.id} className="btn sm" style={{ width: "100%", marginBottom: 3 }}
                            disabled={x.task === "帰陣"}
                            onClick={() => { recallDetachment(b, x); force((n) => (n + 1) % 1000); }}>
                            {x.task === "帰陣" ? "帰陣中" : `${x.task || "分遣"}を本隊へ戻す`}
                            <span style={{ fontSize: 10, color: U.dim, marginLeft: 5 }}>{fmt(corpsMen(x))}人</span>
                          </button>
                        ))}
                      </>
                    );
                  })()}
                </>
              )}
              {/* 分遣隊そのものを選んだときも戻せる */}
              {selC.detach && selC.task !== "帰陣" && (
                <button className="btn sm" style={{ width: "100%" }}
                  onClick={() => { recallDetachment(b, selC); force((n) => (n + 1) % 1000); }}>
                  本隊へ戻す
                </button>
              )}
              {selC.detach && selC.task === "帰陣" && (
                <div style={{ fontSize: 11.5, color: U.dim }}>本隊へ帰陣中。</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.6, borderTop: `1px solid ${U.line2}`, paddingTop: 6 }}>
              隊をタップして選ぶと、その隊だけに前進・接戦・突撃・射撃・守備・後退を出せます。
              地面や敵をタップかドラッグでも命令できます。Escで選択解除。
            </div>
          )}
          <div style={{ fontSize: 11, color: U.dim, borderTop: `1px solid ${U.line2}`, paddingTop: 6 }}>
            {b.log.length ? b.log[b.log.length - 1].text : "　"}
          </div>
        </div>
      )}

      {b.phase === "over" && (
        <div style={{ display: "flex", flexDirection: land ? "column" : "row", gap: 8, alignItems: land ? "stretch" : "center", width: "100%" }}>
          <span className="mn" style={{ fontSize: 19, color: b.result === "P" ? "#3E7A3A" : b.result === "日没" ? "#7C7668" : "#B0483C" }}>
            {b.result === "P" ? "勝利" : b.result === "日没" ? "日没・両軍撤収" : b.orderly ? "撤退" : "敗北"}
          </span>
          <span style={{ fontSize: 12, color: U.dim, flex: 1 }}>
            損害　直属 {fmt(b.corps.filter((c) => c.side === "P").reduce((a, c) => a + c.loss["直属"], 0))}人／
            地域 {fmt(b.corps.filter((c) => c.side === "P").reduce((a, c) => a + c.loss["地域"], 0))}人
          </span>
          <button className="btn dark" onClick={() => onEnd(b)}>戦場を離れる</button>
        </div>
      )}
    </>
  );

  return (
    <div className="sp" style={{ height: "100dvh", background: U.paper, overscrollBehavior: "none" }} onMouseDown={stop} onMouseUp={stop}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: 0 }}>
        {!wide && (
        <div className="bar" style={{ padding: "6px 10px", gap: 10, fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dot" style={{ background: ctx.pColor }} /><b className="mn" style={{ fontSize: 14 }}>{ctx.pName}</b>
          </span>
          <span className="kv">兵 <b className="num">{fmt(pMen)}</b></span>
          <span className="kv">士気 <b className="num">{pMor}</b></span>
          <span className="mn" style={{ color: U.dim }}>対</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dot" style={{ background: ctx.eColor }} /><b className="mn" style={{ fontSize: 14 }}>{ctx.eName}</b>
          </span>
          <span className="kv">兵 <b className="num">{fmt(eMen)}</b></span>
          <span className="kv">{ctx.place}{ctx.mode === "castle" ? "城攻め" : "下"}・{b.weather}</span>
          {ctx.mode === "castle" && b.map && b.map.gates.map((gt) => (
            <span key={gt.key} style={{ fontSize: 11, color: U.dim }}>
              {gt.key}
              <b style={{ color: gt.broken ? "#B0483C" : gt.hp / gt.max > 0.4 ? U.text : "#C89A3A" }}>
                {gt.broken ? "破" : `${Math.round((gt.hp / gt.max) * 100)}%`}
              </b>
            </span>
          ))}
          {ctx.mode === "castle" && b.map && b.press != null && (
            <span style={{ fontSize: 11, color: U.dim }}>
              城の傾き<b style={{ color: b.press > 0.6 ? "#B0483C" : U.text }}>{Math.round(b.press * 100)}%</b>
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span className="kv num">
            {Math.floor(b.t / 60)}:{String(Math.floor(b.t % 60)).padStart(2, "0")}
            <span style={{ color: U.dim }}>／日没まで{Math.max(0, Math.ceil((b.dusk - b.t) / 60))}分</span>
          </span>
          {phase === "fight" && (
            <>
              <button className={`btn sm ${speed === 0 ? "on" : ""}`} onClick={() => setSpeed(0)}>停止</button>
              <button className={`btn sm ${speed === 0.12 ? "on" : ""}`} onClick={() => setSpeed(0.12)}>微速</button>
              <button className={`btn sm ${speed === 0.3 ? "on" : ""}`} onClick={() => setSpeed(0.3)}>低速</button>
              <button className={`btn sm ${speed === 0.6 ? "on" : ""}`} onClick={() => setSpeed(0.6)}>通常</button>
            </>
          )}
        </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: land ? "row" : "column" }}>
          <div ref={wrapRef} className="fieldwrap"
            style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative", background: "#B9C99C", overflow: "hidden" }}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => (gesture.current = null)}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
            onWheel={(e) => zoomAt(e.deltaY < 0 ? 1.12 : 0.89, e.clientX, e.clientY)}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
            {(b.notices || []).filter((n) => b.t - n.t < 6).slice(-3).map((n, i) => (
              <div key={`${n.t}-${i}`} className="mn"
                style={{ position: "absolute", left: "50%", transform: "translateX(-50%)",
                  top: 12 + i * 34, padding: "7px 16px", borderRadius: 8, fontSize: 15, whiteSpace: "nowrap",
                  background: n.kind === "bad" ? "rgba(176,72,60,0.93)" : n.kind === "good" ? "rgba(62,122,58,0.93)" : "rgba(40,40,36,0.9)",
                  color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.25)", pointerEvents: "none", zIndex: 5 }}>
                {n.text}
              </div>
            ))}
            {wide && (
              <div style={{ position: "absolute", right: 10, top: 10, zIndex: 6, display: "flex", gap: 6, alignItems: "center",
                background: "rgba(255,255,255,.94)", border: `1px solid ${U.line}`, borderRadius: 18, padding: "5px 10px", fontSize: 11.5 }}
                onMouseDown={stop} onMouseUp={stop}>
                <span className="dot" style={{ background: ctx.pColor }} /><b className="num">{fmt(pMen)}</b>
                <span style={{ color: U.dim }}>対</span>
                <span className="dot" style={{ background: ctx.eColor }} /><b className="num">{fmt(eMen)}</b>
                <span className="num" style={{ color: U.dim }}>{Math.floor(b.t / 60)}:{String(Math.floor(b.t % 60)).padStart(2, "0")}</span>
                {phase === "fight" && [["停", 0], ["微", 0.12], ["低", 0.3], ["通", 0.6]].map(([lb, v]) => (
                  <button key={lb} className={`btn sm ${speed === v ? "on" : ""}`} style={{ padding: "3px 6px" }}
                    onClick={() => setSpeed(v)}>{lb}</button>
                ))}
              </div>
            )}
            <div className="mapctl l" onMouseDown={stop} onMouseUp={stop} onTouchStart={stop} onTouchEnd={stop}>
              <div className="mbtn" onClick={() => zoomAt(1.3, null)}><b>＋</b>拡大</div>
              <div className="mbtn" onClick={() => zoomAt(0.77, null)}><b>−</b>縮小</div>
              <div className="mbtn" onClick={fitAll}><b>⛶</b>全体</div>
              <div className="mbtn" onClick={() => setPanel((v) => !v)}><b>▤</b>{panel ? "収納" : "展開"}</div>
              <div className={`mbtn ${wide ? "on" : ""}`} onClick={() => setWide((v) => !v)}>
                <b>{wide ? "▤" : "⤢"}</b>{wide ? "戻す" : "広く"}
              </div>
            </div>
          </div>

          {panel && (
            <div className="bpanel" onMouseDown={stop} onMouseUp={stop} onTouchStart={stop} onTouchEnd={stop}
              style={{
                flex: "0 0 auto", background: U.card, padding: "8px 10px", overflowY: "auto",
                width: land ? (wide ? 200 : 246) : "auto", maxHeight: land ? "none" : "40%",
                borderLeft: land ? `1px solid ${U.line}` : "none",
                borderTop: land ? "none" : `1px solid ${U.line}`,
              }}>
              {panelBody}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
