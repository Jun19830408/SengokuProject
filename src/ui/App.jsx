import React, { useState, useEffect, useMemo } from "react";
import { initState } from "../core/state.js";
import { buildTerrainCanvas } from "../core/terrainCanvas.js";
import { clearGame, loadGame, saveGame } from "../save/save.js";
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

  // 控えを読み込む。中身が確かなら、その盤から続きを始める。
  const 控えから戻す = async (file) => {
    let st = null;
    try { st = await importSave(file); } catch (e) { st = null; }
    if (!st) { window.alert("この控えは読めなかった。戦国の記録ではないかもしれぬ。"); return; }
    await doSave(st);
    setG(st); setScreen("map");
  };

  if (screen === "title") return (<><style>{css}</style>
    <Title saved={saved} onStart={() => setScreen("select")}
      onContinue={() => { setG(saved.state); setScreen("map"); }}
      onErase={async () => { await clearGame(); setSaved(null); }}
      onExport={() => saved && exportSave(saved.state, (FACTIONS[saved.state.player] || {}).name)}
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
      savedAt={saved ? saved.at : null} onTitle={() => setScreen("title")} /></>);
}

