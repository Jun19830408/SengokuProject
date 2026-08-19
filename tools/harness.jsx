// 試験用の包み（分割後の src/ を読む）。
// 本体を機械的に動かすために、React の入口とともに一つにまとめて差し出す。
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import App from "../src/index.jsx";
export { React, createRoot, act, App };
// 盤をこしらえるための道具も差し出す。
// 画面を延々と押して所定の局面まで持っていくのは当てにならないので、
// 試験によっては盤を直に組み立て、記録として仕込んでから「続きから」で開く。
export { initState } from "../src/core/state.js";
export { layoutSea, makeFleet, createSeaBattle, stepSeaBattle, seaAI, 海戦を裁く, fleetShips, fleetCrew, 風向き, SEA, 海の状 } from "../src/battle/sea.js";
export { SHIPS, 船の割り } from "../src/data/ships.js";
export { navalPower, isCoastal, seaInterception, resolveSeaBattle, 湊の主 } from "../src/core/naval.js";
export { TOWNS } from "../src/data/castles.js";
export { roadBetween } from "../src/core/paths.js";
export { findPath } from "../src/core/paths.js";
export { 援けに着く, migrateSave, atPeace, relOf } from "../src/core/state.js";
export { resolveOffscreen } from "../src/govern/war.js";
export { advanceMonth } from "../src/govern/month.js";
export { 忠誠, diploStat } from "../src/core/rank.js";
export { 難を逃れる, captureChance } from "../src/core/capture.js";
export { succeed, is架空, bearChild, pickHeir } from "../src/core/house.js";
export { houseAlive, 主家, isVassal, 膝を屈している, canAskAid, underMyBanner } from "../src/core/state.js";
export { doDiplo, doPlot } from "../src/govern/commands.js";
export { DIPLO, PLOTS } from "../src/data/diplo.js";
// 合戦の中身を直に動かすための取り出し口。
// 画面を通すと、戦況の記録が流れて肝心の一行を取り逃がす。
// 隊がどの門を受け持ち、何の下知を受けているかは、ここから直に見るほかない。
export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, gatePos } from "../src/battle/castleMap.js";
export { layoutField, setFieldSeed, FIELD, terrainAt, TERRAIN } from "../src/battle/field.js";
export { makeCorps, corpsMen, placeSquads, issueOrder, 退かせる, 退き先 } from "../src/battle/corps.js";
export { createBattle, stepBattle } from "../src/battle/engine.js";
export { battleAI } from "../src/battle/ai.js";
export { sideColor, ownZone } from "../src/battle/draw.js";
