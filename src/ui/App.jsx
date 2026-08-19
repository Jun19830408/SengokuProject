import React, { useState, useEffect, useMemo } from "react";
import { initState } from "../core/state.js";
import { buildTerrainCanvas } from "../core/terrainCanvas.js";
import { SAVE_KEY, clearGame, loadGame, saveGame, 記録を並べる } from "../save/save.js";
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
    await doSave(st, SAVE_KEY);
    setG(st); setScreen("map");
  };

  // 枠を選んで、その盤から始める
  const 記録から始める = async (key) => {
    const d = await loadGame(key);
    if (!d || !d.state) { window.alert("この枠は読めなかった。"); return; }
    setG(d.state); setScreen("map");
  };

  if (screen === "title") return (<><style>{css}</style>
    <Title saves={saves} onStart={() => setScreen("select")}
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

