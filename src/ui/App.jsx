import React, { useState, useEffect, useMemo } from "react";
import { initState } from "../core/state.js";
import { buildTerrainCanvas } from "../core/terrainCanvas.js";
import { SAVE_KEY, clearGame, loadGame, saveGame, 自動を逃がす, 記録の見出し, 記録を並べる } from "../save/save.js";
import { DaimyoSelect } from "./DaimyoSelect.jsx";
import { MapScreen } from "./MapScreen.jsx";
import { Title } from "./Title.jsx";
import { css } from "./css.js";
import { FACTIONS } from "../data/factions.js";
import { exportSave, importSave } from "../save/save.js";

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
      onImport={控えから戻す} /></>);
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

