// 試験用の包み（分割後の src/ を読む）。
// 本体を機械的に動かすために、React の入口とともに一つにまとめて差し出す。
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import App from "../src/index.jsx";
export { React, createRoot, act, App };
export { SeaScreen, 海戦を仕立てる } from "../src/ui/SeaScreen.jsx";
// 盤をこしらえるための道具も差し出す。
// 画面を延々と押して所定の局面まで持っていくのは当てにならないので、
// 試験によっては盤を直に組み立て、記録として仕込んでから「続きから」で開く。
export { saveGame, loadGame, clearGame, 記録を並べる, 記録の見出し, 自動を逃がす, 枠一覧 } from "../src/save/save.js";
export { initState } from "../src/core/state.js";
export { layoutSea, makeFleet, createSeaBattle, stepSeaBattle, seaAI, 海戦を裁く, fleetShips, fleetCrew, 風向き, SEA, 海の状 } from "../src/battle/sea.js";
export { SHIPS, 船の割り } from "../src/data/ships.js";
export { navalPower, isCoastal, seaInterception, resolveSeaBattle, 湊の主, 渡海の船立て, 迎え撃つ船立て, 船立ての力, 一艘の乗り } from "../src/core/naval.js";
export { TOWNS } from "../src/data/castles.js";
export { 特殊勢力の可否, drawTownMark, 町の様子 } from "../src/core/town.js";
export { FACTIONS } from "../src/data/factions.js";
export { CASTLES } from "../src/data/castles.js";
export { px, py } from "../src/data/geo.js";
export { roadBetween, marchMonths, marchMonthsOf, findPathVia, nodeById } from "../src/core/paths.js";
export { ROADS, MARCH_PER_MONTH, ROAD_SPEED } from "../src/data/roads.js";
export { findPath } from "../src/core/paths.js";
export { 援けに着く, migrateSave, atPeace, relOf } from "../src/core/state.js";
export { resolveOffscreen } from "../src/govern/war.js";
export { 圧す, 解す } from "../src/save/pack.js";
export { advanceMonth } from "../src/govern/month.js";
export { 忠誠, diploStat } from "../src/core/rank.js";
export { 難を逃れる, captureChance } from "../src/core/capture.js";
export { succeed, is架空, bearChild, pickHeir } from "../src/core/house.js";
export { houseAlive, 主家, isVassal, 膝を屈している, canAskAid, underMyBanner } from "../src/core/state.js";
export { doDiplo, doPlot, doSpecial } from "../src/govern/commands.js";
export { DIPLO, PLOTS } from "../src/data/diplo.js";
// 合戦の中身を直に動かすための取り出し口。
// 画面を通すと、戦況の記録が流れて肝心の一行を取り逃がす。
// 隊がどの門を受け持ち、何の下知を受けているかは、ここから直に見るほかない。
export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, gatePos, 城の構え } from "../src/battle/castleMap.js";
export { layoutField, setFieldSeed, FIELD, terrainAt, TERRAIN, HILLS, FORESTS, WOODS, MARSH, VILLAGES, RIVER, hasRiver } from "../src/battle/field.js";
export { makeCorps, corpsMen, placeSquads, issueOrder, 退かせる, 退き先 } from "../src/battle/corps.js";
export { createBattle, stepBattle } from "../src/battle/engine.js";
export { battleAI } from "../src/battle/ai.js";
export { sideColor, ownZone, drawMon, 紋の核 } from "../src/battle/draw.js";
export { newRoster, rosterTake, rosterSum, 長の名, 長の階, 組の鍵, 階の段, 取り立てるべき組, 組頭の働きを記す } from "../src/core/roster.js";
export { makePromotion } from "../src/core/house.js";
