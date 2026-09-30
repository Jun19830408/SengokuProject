import React, { useState, useEffect, useMemo } from "react";
import { initState } from "../core/state.js";
import { buildTerrainCanvas } from "../core/terrainCanvas.js";
import { SAVE_KEY, clearGame, loadGame, saveGame, 自動を逃がす, 記録の見出し, 記録を並べる } from "../save/save.js";
import { DaimyoSelect } from "./DaimyoSelect.jsx";
import { MapScreen } from "./MapScreen.jsx";
import { Title } from "./Title.jsx";
import { KassenScreen } from "./KassenScreen.jsx";
import { css } from "./css.js";
import { FACTIONS } from "../data/factions.js";
import { exportSave, importSave } from "../save/save.js";
import { 場面を選ぶ, 起こし直す, 解錠する, 設定を読む, 止める as 音を止める } from "../audio/oto.js";

// 横画面を基本とする（GDD 15.2）。政務も合戦も横で扱う。
export function useLandscape() {
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
  /* 音の解錠（GDD 15.4）。

     携帯は、遊ぶ側が画面に触れるまで音を出せない決まりである。どこを触っても
     よいので、最初の一度で解く。以後は場面に応じて調べが替わる。 */
  useEffect(() => {
    設定を読む();
    if (typeof window === "undefined") return undefined;
    /* 一度で解けるとは限らない。Safari では座が眠ったまま起きることがあるので、
       触れるたびに起こし直す（走り出せば何もしない）。 */
    const 解く = () => { 解錠する(); 起こし直す(); };
    const 戻り = () => { if (!document.hidden) 起こし直す(); };
    window.addEventListener("pointerdown", 解く);
    window.addEventListener("touchend", 解く);
    window.addEventListener("keydown", 解く);
    document.addEventListener("visibilitychange", 戻り);
    return () => {
      window.removeEventListener("pointerdown", 解く);
      window.removeEventListener("touchend", 解く);
      window.removeEventListener("keydown", 解く);
      document.removeEventListener("visibilitychange", 戻り);
    };
  }, []);
  // 題名と大名選びは静か。政務と合戦の調べは、それぞれの画面が受け持つ。
  useEffect(() => { if (screen !== "map" && screen !== "kassen") 音を止める(); }, [screen]);
  const [g, setG] = useState(null);
  const [saves, setSaves] = useState([]);
  const land = useLandscape();
  const terrain = useMemo(() => (typeof document === "undefined" ? null : buildTerrainCanvas()), []);

  const 並べ直す = async () => setSaves(await 記録を並べる());
  useEffect(() => { 並べ直す(); }, []);
  /* 収める。枠を指さなければ自動の枠へ書く（月送りのたびに呼ばれるのはこちら）。 */
  const doSave = async (st, key) => {
    const ok = await saveGame(st, key);
    if (ok) await 並べ直す();
    return ok;
  };

  // 控えを読み込む。中身が確かなら、その盤から続きを始める。
  const 控えから戻す = async (file) => {
    let st = null;
    try { st = await importSave(file); } catch (e) { st = null; }
    if (!st) { window.alert("この控えは読めなかった。戦国の記録ではないかもしれぬ。"); return; }
    // 控えを入れるときも、いまの自動の枠を逃がしてから
    const r = await 自動を逃がす();
    if (r.空きなし || r.失敗) {
      if (!window.confirm("空いている枠が無いため、「自動」の記録は失われます。よろしいですか。")) return;
    }
    await doSave(st, SAVE_KEY);
    setG(st); setScreen("map");
  };

  /* 新しく始める前に、いま自動の枠にある盤を空き枠へ逃がす（GDD 15.3）。

     これをせずにいたため、新しく始めた途端――正しくは最初の月送りの折に――
     自動の枠が黙って上書きされ、進めていた盤が失われた。
     逃がせないとき（空き枠が無いとき）は、消える旨を告げて確かめる。 */
  const 新しく始める = async () => {
    const r = await 自動を逃がす();
    await 並べ直す();
    if (r.空きなし || r.失敗) {
      const h = 記録の見出し(r.d, FACTIONS);
      const 文 = h
        ? `いま「自動」には ${h.家}・${h.年}年${h.月}月（${h.城数}城）の記録があります。\n`
          + "空いている枠が無いため、新しく始めるとこの記録は失われます。\n\n"
          + "取っておきたいなら、取りやめて、要らない枠を消すか、控えを書き出してください。"
        : "「自動」の記録が失われます。よろしいですか。";
      if (!window.confirm(文)) return;
    } else if (r.逃がした) {
      const h = 記録の見出し(r.d, FACTIONS);
      window.alert(`いままでの盤（${h ? `${h.家}・${h.年}年${h.月}月` : "自動の記録"}）を「${r.名}」へ移しました。\n`
        + "新しく始めても消えません。");
    }
    setScreen("select");
  };

  // 枠を選んで、その盤から始める
  const 記録から始める = async (key) => {
    const d = await loadGame(key);
    if (!d || !d.state) { window.alert("この枠は読めなかった。"); return; }
    setG(d.state); setScreen("map");
  };

  if (screen === "title") return (<><style>{css}</style>
    <Title saves={saves} onStart={新しく始める}
      onLoad={記録から始める}
      onErase={async (key) => { await clearGame(key); await 並べ直す(); }}
      onExport={async (key) => {
        const d = await loadGame(key);
        if (d && d.state) exportSave(d.state, (FACTIONS[d.state.player] || {}).name);
      }}
      onImport={控えから戻す}
      onKassen={() => setScreen("kassen")} /></>);
  /* 合戦。国も月も無い、決まった一戦だけの遊び方（GDD 8.9）。 */
  if (screen === "kassen") return (<><style>{css}</style>
    <KassenScreen land={land} onTitle={() => setScreen("title")} /></>);
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
      saves={saves} onTitle={() => setScreen("title")} /></>);
}

