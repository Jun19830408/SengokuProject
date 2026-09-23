// 試験用の包み（分割後の src/ を読む）。
// 本体を機械的に動かすために、React の入口とともに一つにまとめて差し出す。
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import App from "../src/index.jsx";
export { React, createRoot, act, App };
export { SeaScreen, 海戦を仕立てる } from "../src/ui/SeaScreen.jsx";
export { CastleSheet } from "../src/ui/CastleSheet.jsx";
export { BattleScreen } from "../src/ui/BattleScreen.jsx";
export { MapScreen } from "../src/ui/MapScreen.jsx";
export { 天下分け目の帳, 分け目の沙汰の帳 } from "../src/ui/panels.jsx";
export { 攻め寄せる問い, MonthReport } from "../src/ui/panels.jsx";
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
export { 城の改名, 改まった名, 武将の改名, 改まった名乗り } from "../src/data/kaimei.js";
export { 援けに着く, migrateSave, atPeace, relOf, 軍の道, 本拠を追う, 奪われた本領を繕う, 旗の下を検め直す, 城主の札を据える, 城の名を改める, 武将の名を改める, 裏切りの出陣か } from "../src/core/state.js";
export { 臣従の主, 許しの要る主, 許されているか, 攻められるか, 許しを与える, 許しを解く, 容認するか, 済んだ許しを片づける } from "../src/core/yurushi.js";
export { 城の寄親, 差配を預けた城, 大名が直に見る城, 預け高, 預けの段, 預けの率, 城の実入り, 旗頭の狙い, 旗頭に許す, 自ら采配するか, 旗頭は許されているか, 旗頭の済んだ許しを片づける, 旗頭の預け高, 旗頭に任せきりか, 旗頭に断る, 旗頭は断られたか, 旗頭の古い断りを片づける, 断りの直後か } from "../src/core/inin.js";
export { 旗頭の調略 } from "../src/govern/aiDiplo.js";
export { 移封の間合い, 拒む信用, 拒む減り, 家の城ら, 石高 as 城らの石高, 渡せる城ら, 移封できるか, 移封できる家ら, 移封の見立て, 移封する,
  招ける忠誠, 招きの咎め, 招けるか, 招ける者ら, 直参に招く } from "../src/core/ihou.js";
export { 謀反の目, 走る先, 謀反を起こす, 謀反の見回り } from "../src/core/muhon.js";
export { 遠征の兵糧 } from "../src/govern/war.js";
export { ROAD_ADJ } from "../src/core/paths.js";
export { resolveOffscreen, resolveClashOffscreen, reinforceOffers, 運び賃, 運び賃を払う, sackCastle, 城を委ねる, 委ねる差配, 軍を解く, withdrawArmy, homeFor, 城に合流する, 在陣させる, 盤の乱れを繕う, restoreStrays, 滅んだ家を始末する, 城なき家を片づける, 将を除く, 着いた味方を束ねる, 旗頭の陣を払う, 方面の報せ } from "../src/govern/war.js";
export { 圧す, 解す } from "../src/save/pack.js";
export { advanceMonth } from "../src/govern/month.js";
export { 忠誠, diploStat, loyaltyDrift, castellanOf, rankName, 陣触れの届き, 陣触れに応じる, 国が隣り合うか, minGarrison, 身分の位, 総大将を定める, 大将を先頭に, 国主に任じる, 旗頭に任じる, 国主を繕う, 寄騎を繕う, 旗頭を繕う, 国主たち, 旗頭たち, stipendOf, 役の要る身分, 寄騎に取る, 寄騎を解く, 寄騎たち, 寄騎に取れるか, 城主か, 城を守る将, 守備隊の統率, 旗頭の受け持ち, 旗頭の届く国, 旗頭の的にできる家, 旗頭の的家, 旗頭の的家を定める, 的家の限り, 家の国ら, 旗の下の家か, 旗の下の当主か, 当主の国ら, 城の知行の余地, fiefRoom, fiefBurden } from "../src/core/rank.js";
export { 難を逃れる, captureChance } from "../src/core/capture.js";
export { succeed, is架空, bearChild, pickHeir } from "../src/core/house.js";
export { REGIONS, GOKINAI } from "../src/data/provinces.js";
export { 従える比, 臣従させる比, 天下人の目安, 威信の効き } from "../src/data/diplo.js";
export { courtRank, 号令できるか, 旗の下か, 国を旗の下に, 旗の下の城数, 天下人の直轄, 天下人の版図 } from "../src/core/province.js";
export { いまの段, 段の上乗せ, 段, 家の地方, 地方の握り, 地方が隣り合うか, 京の城, 志の直轄, 志の版図, 足場の握り } from "../src/core/tenkabito.js";
export { 参陣の顔ぶれ, 号令を発せるか, 号令を発する, 済んだ号令を片づける, 出せる兵, 出せる地の兵, 旗の下の家ら, 号令の限り } from "../src/core/gourei.js";
export { 惣無事令を発する, 応諾を決める, 応じる目, 問われる家, 問わぬ家ら, 触れの届く家, 触れに従う気があるか, 外の国, 有力の目安, 朝敵か, 朝敵を解く, 朝敵を検め直す, 問い直しの間 } from "../src/core/sobuji.js";
export { 気風, 浸透, 家の当主, 攻めの腰, 要る兵力, 出せる軍の数, 調略の腰, 治めの腰, 好機か } from "../src/core/kiryou.js";
export { 主を探す } from "../src/core/state.js";
export { houseAlive, 主家, isVassal, 膝を屈している, canAskAid, underMyBanner, 同じ旗の下 } from "../src/core/state.js";
export { doDiplo, doPlot, doSpecial } from "../src/govern/commands.js";
export { DIPLO, PLOTS } from "../src/data/diplo.js";
// 合戦の中身を直に動かすための取り出し口。
// 画面を通すと、戦況の記録が流れて肝心の一行を取り逃がす。
// 隊がどの門を受け持ち、何の下知を受けているかは、ここから直に見るほかない。
export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, toUV, gatePos, gateOpenU, inLayer, 城の構え, 門の控え口 } from "../src/battle/castleMap.js";
export { layoutField, setFieldSeed, setFieldKind, FIELD, terrainAt, TERRAIN, HILLS, MOUNTAINS, FORESTS, WOODS, MARSH, VILLAGES, RIVER, ROAD, ROADS as 野の道, RIVERS, 筋書きの野を組む, 筋書きを解く, hasRiver, hasMountain, 山が遮るか, 踏み込んだ地, genTerrain } from "../src/battle/field.js";
export { makeCorps, corpsMen, placeSquads, issueOrder, 転回させる, 退かせる, 退き先, 盤に収める, 寄せ手の隊数 } from "../src/battle/corps.js";
export { createBattle, stepBattle, 前面まで, 触れる隔たり, 触れ隙, 押し力, 塊として立つ } from "../src/battle/engine.js";
export { 合戦一覧, 合戦を探す, 合戦を仕立てる, 合戦を畳む, 合戦の問いに答える, 指図の縛り, 筋書きの覚え, 合戦を控える, 合戦を戻す, 控えの鍵 } from "../src/battle/kassen.js";
export { 筋書き as 関ヶ原 } from "../src/data/sekigahara.js";
export { battleAI } from "../src/battle/ai.js";
export { sideColor, ownZone, drawMon, 紋の核 } from "../src/battle/draw.js";
export { 分け目の野, 野を探す, 陣立てを敷く, 隊の間合い } from "../src/data/wakemeba.js";
export { 分け目の限り, 分け目の暮れ, 挑む直轄, 挑まれる版図, 再び挑める信用, 直轄の石高, 版図の石高, 石高の順, 並びの隣か, 天下分け目を挑めるか, 挑める家ら, 挑める見込み, 器量くらべ, 野を選ぶ側, 分け目の顔ぶれ, 分け目の兵, 分け目の備えを組む, 集結の月数, 天下分け目を起こす, 分け目を進める, 割譲できる城ら, 取る城を見立てる, 割譲の限り, 再び挑める月, 逃散の割, 野の見立て, 兵を逃散させる, 上下の縁を解く, 敗れた将の始末, 城を割譲する, 分け目の沙汰 } from "../src/core/wakeme.js";
export { 分け目の盤を組む, 分け目の戦果 } from "../src/battle/wakemeikusa.js";
export { 天下分け目の采配, 挑むか, AIの選ぶ野, 盤を開かずに裁く } from "../src/govern/aiWakeme.js";
export { newRoster, rosterTake, rosterAdd, rosterSync, rosterSum, 長の名, 長の階, 組の鍵, 階の段, 取り立てるべき組, 組頭の働きを記す, 組頭の帳, 戦の跡, 戦の跡を記す } from "../src/core/roster.js";
export { makePromotion } from "../src/core/house.js";
