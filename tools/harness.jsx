// 試験用の包み（分割後の src/ を読む）。
// 本体を機械的に動かすために、React の入口とともに一つにまとめて差し出す。
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import App from "../src/index.jsx";
export { React, createRoot, act, App };
export { SeaScreen, 海戦を仕立てる } from "../src/ui/SeaScreen.jsx";
export { CastleSheet } from "../src/ui/CastleSheet.jsx";
export { GeneralList } from "../src/ui/panels.jsx";
export { css } from "../src/ui/css.js";
export { BattleScreen, 早送りの速さ } from "../src/ui/BattleScreen.jsx";
export { MapScreen } from "../src/ui/MapScreen.jsx";
export { 出陣前の問い } from "../src/ui/Shutsujin.jsx";
export { 天下分け目の帳, 分け目の沙汰の帳 } from "../src/ui/panels.jsx";
export { 攻め寄せる問い, MonthReport, 城を委ねる問い, 軍の帳, SortieDialog, ReinforceDialog } from "../src/ui/panels.jsx";
// 盤をこしらえるための道具も差し出す。
// 画面を延々と押して所定の局面まで持っていくのは当てにならないので、
// 試験によっては盤を直に組み立て、記録として仕込んでから「続きから」で開く。
export { saveGame, loadGame, clearGame, 記録を並べる, 記録の見出し, 自動を逃がす, 枠一覧, SAVE_KEY, 枠の鍵, 記録の訳を読む } from "../src/save/save.js";
export { 置き場, 置き場の名 } from "../src/save/store.js";
export { initState } from "../src/core/state.js";
export { 城の年貢の割 } from "../src/core/gun.js";
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
export { 街道の性格 } from "../src/core/senjo.js";
export { 型を選ぶ, 野の型を決める, 型の表 } from "../src/battle/kata.js";
export { seedOf, 野の型, 陣の帯 } from "../src/battle/field.js";
export { 城の改名, 改まった名, 武将の改名, 改まった名乗り } from "../src/data/kaimei.js";
export { forecast, 援けに着く, migrateSave, atPeace, relOf, 軍の道, 本拠を追う, 奪われた本領を繕う, 旗の下を検め直す, 城主の札を据える, 二重の城主を解く, 城の名を改める, 武将の名を改める, 裏切りの出陣か } from "../src/core/state.js";
export { 臣従の主, 許しの要る主, 許されているか, 攻められるか, 許しを与える, 許しを解く, 容認するか, 済んだ許しを片づける } from "../src/core/yurushi.js";
export { 囲みの様子, 囲んでいる様子, 城の保ち, 寄せ手の保ち, 城の兵, 迫る軍, 民の離れ, 城に在る軍, 軍の中身, 強攻の見込み, 強攻の比, 囲みの食い, 蔵の限り, 籠る民の割, 蓄えの割, 蔵の下限 } from "../src/core/kakomi.js";
export { 守りの寄親, 守りを旗頭に任せるか, 城の寄親, 差配を預けた城, 大名が直に見る城, 預け高, 預けの段, 預けの率, 城の実入り, 旗頭の狙い, 旗頭に許す, 自ら采配するか, 旗頭は許されているか, 旗頭の済んだ許しを片づける, 旗頭の預け高, 旗頭に任せきりか, 旗頭に断る, 旗頭は断られたか, 旗頭の古い断りを片づける, 断りの直後か } from "../src/core/inin.js";
export { 旗頭の調略 } from "../src/govern/aiDiplo.js";
export { 移封の間合い, 拒む信用, 拒む減り, 家の城ら, 石高 as 城らの石高, 渡せる城ら, 移封できるか, 移封できる家ら, 移封の見立て, 移封する,
  招ける忠誠, 招きの咎め, 招けるか, 招ける者ら, 直参に招く } from "../src/core/ihou.js";
export { 謀反の目, 走る先, 謀反を起こす, 謀反の見回り } from "../src/core/muhon.js";
export { 遠征の兵糧, 陣中の月数, 陣中の食い扶持, 集結を待つか, 留守の蓄え } from "../src/govern/war.js";
export { ROAD_ADJ } from "../src/core/paths.js";
export { resolveOffscreen, resolveClashOffscreen, reinforceOffers, 運び賃, 運び賃を払う, sackCastle, 城を委ねる, 委ねる差配, 軍を解く, withdrawArmy, homeFor, 城に合流する, 在陣させる, 盤の乱れを繕う, restoreStrays, 滅んだ家を始末する, 城なき家を片づける, 将を除く, 着いた味方を束ねる, 旗頭の陣を払う, 方面の報せ } from "../src/govern/war.js";
export { 圧す, 解す } from "../src/save/pack.js";
export { advanceMonth, 出征の見立て, 攻めに要る兵, 近隣から兵を寄せる, 寄せを返す, 寄せられる見込み, 風雲の主家の上司, 主家の腰の倍, 主家の好機の余裕, 主家の好機の腰, 好機の余裕, 好機の腰, 城を救う援軍を出す, 城が危ういか, 援軍の望み, 二陣の見込み } from "../src/govern/month.js";
export { 城方の後詰ら, 野戦の後の後詰 } from "../src/core/engun.js";
export { 城攻めの比, 野で当たる比, 将の利, 将の器量, 城攻めの基の比, 野の比, 連戦の余り } from "../src/core/shussei.js";
export { troopCap, 軍役の器, 軍役の割増, extraIncome, goryoOf, fiefOf, 忠誠, diploStat, loyaltyDrift, castellanOf, rankName, 陣触れの届き, 陣触れに応じる, 国が隣り合うか, minGarrison, 身分の位, 総大将を定める, 大将を先頭に, 国主に任じる, 旗頭に任じる, 国主を繕う, 寄騎を繕う, 旗頭を繕う, 国主たち, 旗頭たち, stipendOf, 役の要る身分, 寄騎に取る, 寄騎を解く, 寄騎たち, 寄騎に取れるか, 城主か, 城主を据え替える, 城を明け渡す, 城を守る将, 守備隊の統率, 旗頭の受け持ち, 旗頭の届く国, 旗頭の的にできる家, 旗頭の的家, 旗頭の的家を定める, 的家の限り, 家の国ら, 旗の下の家か, 旗の下の当主か, 当主の国ら, 城の知行の余地, fiefRoom, fiefBurden, 旗頭を継がせる, 旗頭を継げる者, 方面の軍を移す, 家の尺, 身分の境, rankOf, RANKS, 城主を外された忠誠の減り } from "../src/core/rank.js";
export { 天守を見る, 天守の表 } from "../src/data/tenshu.js";
export { 難を逃れる, captureChance, 仕官を願えるか, 他家が召し抱える, 囚われた年, makePrisoner, takeAsPrisoner } from "../src/core/capture.js";
export { succeed, is架空, bearChild, pickHeir, LIFE_CAP, lifeSpan } from "../src/core/house.js";
export { FATED, LONG_LIVED } from "../src/data/newcomers.js";
export { REGIONS, GOKINAI } from "../src/data/provinces.js";
export { 従える比, 臣従させる比, 天下人の目安, 威信の効き } from "../src/data/diplo.js";
export { courtRank, 号令できるか, 旗の下か, 国を旗の下に, 旗の下の城数, 天下人の直轄, 天下人の版図 } from "../src/core/province.js";
export { いまの段, 段の上乗せ, 段, 家の地方, 地方の握り, 地方が隣り合うか, 京の城, 志の直轄, 志の版図, 足場の握り } from "../src/core/tenkabito.js";
export { 参陣の顔ぶれ, 号令を発せるか, 号令を発する, 済んだ号令を片づける, 出せる兵, 出せる地の兵, 旗の下の家ら, 号令の限り } from "../src/core/gourei.js";
export { 惣無事令を発する, 応諾を決める, 応じる目, 問われる家, 問わぬ家ら, 触れの届く家, 触れに従う気があるか, 外の国, 有力の目安, 朝敵か, 朝敵を解く, 朝敵を検め直す, 問い直しの間 } from "../src/core/sobuji.js";
export { 気風, 浸透, 家の当主, 攻めの腰, 要る兵力, 出せる軍の数, 調略の腰, 治めの腰, 好機か } from "../src/core/kiryou.js";
export { 主を探す } from "../src/core/state.js";
export { houseAlive, 主家, isVassal, 膝を屈している, canAskAid, underMyBanner, 同じ旗の下 } from "../src/core/state.js";
export { doDiplo, doPlot, doSpecial, appoint, doTrade } from "../src/govern/commands.js";
export { DIPLO, PLOTS } from "../src/data/diplo.js";
// 合戦の中身を直に動かすための取り出し口。
// 画面を通すと、戦況の記録が流れて肝心の一行を取り逃がす。
// 隊がどの門を受け持ち、何の下知を受けているかは、ここから直に見るほかない。
export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, toUV, gatePos, gateOpenU, inLayer, 城の構え, 門の控え口, 寄せ口, 門の内か, 門の向こうか } from "../src/battle/castleMap.js";
export { layoutField, setFieldSeed, setFieldKind, fieldScale, FIELD, terrainAt, TERRAIN, HILLS, MOUNTAINS, FORESTS, WOODS, MARSH, VILLAGES, RIVER, ROAD, ROADS as 野の道, RIVERS, 筋書きの野を組む, 筋書きを解く, hasRiver, hasMountain, 山が遮るか, 踏み込んだ地, genTerrain, 地の高さ, 高み, 率いの刻比 } from "../src/battle/field.js";
export { ARM_STATS } from "../src/battle/field.js";
export { outOfCommand, commandPost, commandRange, makeCorps, corpsMen, placeSquads, issueOrder, makeDetachment, detachOptions, 分遣の頃合い, 転回させる, 退かせる, 退き先, 盤に収める, 寄せ手の隊数 } from "../src/battle/corps.js";
export { 新絵か, 姿の札, 姿八, 姿の骨, 新絵の野, 野を焼く, 新絵の城の地, 城の地を焼く, 新絵の兵描き, 焼きの内訳, 新絵状態を進める, 組の見た目, 組頭の番, 本陣衆を見る, 盤の見た目, 持上高, 個人閾, 新絵の寄り限り, 個人で描くか, 見える組数, 見える人数, 組の予算, 人の予算 } from "../src/battle/shinga.js";
/* 野の道（試し：tests/kawa_watari.cjs） */
export { 野の道 as 野を行く道, 道のり, 渡り場の輪 } from "../src/battle/route.js";
export { createBattle, stepBattle, applyDamage, 放った跡, 前面まで, 触れる隔たり, 触れ隙, 触れ上限, 噛み間, 押し力, 塊として立つ, 隊の野の足 } from "../src/battle/engine.js";
// 一人働き（武将一人プレイ）のつなぎ：与平が討った兵を、理の人数と一人ずつの絵の両方で減らす
export { 兵を討つ, 組の兵を数える, 組の隊, 将を討つ, 総大将か } from "../src/hitori/tsunagi.js";
// 一人働きの背中越しの視点：盤の一人ずつの兵を、与平の背中越しの眺めへ写す
export { 歩の尺, 背中の速さ, 背中の突きの速さ, 与平の組を選ぶ, 与平の所, 眺めを集める, 背中を始める, 背中を描く, 与平を進める, 与平を立て直す, 与平の今, 与平の絵, 構えの間, 構えを解く間, 突く, 受ける, 物頭を据える, 降りの写し, 寄った所の組, 持ち場の間, 咎の目, 兵の太刀, 旗持の太刀, 馬廻の太刀, 将の太刀, 要る太刀, 合戦の勲功, 手勢の倒し, 持ち場の円を量る, 持ち場の隊, 一騎駆け, 一騎駆けの秒, 一騎駆けの残り, 率いている, 体力の戻り, 体力の戻りの間, 気づきの前, 気づきの背, 振り向きの速さ, 加勢の届き, 視を回す, 視を戻す, 視を回しているか, 視の仰の限り, 視の芯の高さ, 視の鍵の速さ, 手傷の小, 手傷の幅, 一騎駆けを終える, 集まりの着き, 集まりの限り, 駆け直しの気, 武勇の攻め, 武勇の守り, 敵の突きの当たり, 総突きの当たり, 敵の間近, 手勢の知らせの間, 寄りで動ける境 } from "../src/hitori/senaka.js";
export { 視のなぞりの横, 視のなぞりの縦 } from "../src/hitori/SenakaFuda.jsx";
export { 人形の段 } from "../src/hitori/ningyo.js";
export { GL筆を作る, 色を解く, 筆の選び手 } from "../src/hitori/gl_fude.js";
export { 筆の選びの様子 } from "../src/hitori/senaka.js";
export { 手勢の数, 手勢を組む, 手勢へ下知, 陣の回り, 付きの倍, 付きの寄せ秒, 付きの先回り, 手勢を委ねる, 手勢を留める, 下知の名, 下がる押し, 手勢を親に付ける, 付き従いの隔, 寄る押し, 詰まりの正面, 詰まりの真向き, 統率の効き, 実効の統率, 手勢の統率の初め, 押し込みの足, 抜けの足, 先回りの秒, 追い付きの隔, 追い付きの倍, 遠い追い付きの隔, 遠い追い付きの倍, 静まりの秒 } from "../src/hitori/tezei.js";
/* 風雲モード（一人の侍の立身）の理と屋敷の画面（試し：tests/fuun.cjs） */
export { 風雲の段, 段の番, 次の段, 盤の身分, 風雲の一人, 月の行い一覧, 月の行いの数, 上司を選ぶ, 若手の上司を選ぶ, 風雲の上司を決める, 風雲で選べるか, 風雲を始める, 風雲の月の初め, 上司を見直す, 風雲の戦か, 風雲の城攻めか, 風雲の隊を選ぶ, 風雲の城攻めの隊, 戦の勲功を記す, 取り立てを見る, 風雲の問いに答える, 首の勲功, 首の値, 討ち取りの勲功, 雑兵の勲功の割, 月の体力の戻り, 養生の戻り, 合戦ののちの伸び,
  武将の勲功, 武将の始めの知行, 加増の石, 覚えの倍, 武将の段か, 主人公の仮の武将, 主人公の禄高, 主人公の次の身分, 武将の支度, 禄高の身分を見る, 論功行賞を見る, 預かる隊の勲功,
  城主の段か, 主人公の武将, 主人公の城, 城主にする城を選ぶ, 主人公の武将を写す, 主人公を武将の帳に入れる, 城主に任じる, 城の政務, 城の預けの月分, 城の預けを積む, 城の政務を行う, 風雲の攻め先か,
  名乗りの支度, 名乗りを定める, 名乗りの限り, 宿老か, 宿老の役を見る, 自ら率いた勲功の倍, 主人公の齢, 主人公の始めの齢, 手勢の討ちの割, 内訳の文, 仕官の物語 } from "../src/hitori/fuun.js";
export { 架空の上役, 架空の上役の身分, 同じ組の数 } from "../src/hitori/kakuu.js";
export { 組織の木, 自分の筋, 身の上を見る } from "../src/hitori/soshiki.js";
export { 風雲の今の身分, 風雲の段の版 } from "../src/core/state.js";
export { 通称を起こす } from "../src/core/roster.js";
/* 風雲モードの家老から上（試し：tests/fuun_karou.cjs） */
export { 風雲の主のid, 風雲の主か, 風雲の主の城か, 風雲の主の軍か, 風雲の主の籠る城か, 風雲の城を取る勲功 } from "../src/core/state.js";
export { 国の国主, 国の旗頭, 旗頭の枠 } from "../src/core/rank.js";
/* 風雲：大名への道（試し：tests/fuun_daimyo.cjs） */
export { 風雲の大名か, 風雲で守られるか, 風雲の主を大名に } from "../src/core/state.js";
export { 友好の初め, 誼の費え, 調略の費え, 誼の上げ, 調略の下げ, 調略の見込み, 友好を見る, 下剋上の見込み, 独立の見込み, 家の城主ら, 誼を通じる, 城主を調略する,
  主人公の家を興す, 当主の城, 下剋上の在陣先か, 下剋上の構え, 下剋上を起こす, 下剋上を成す, 独立の構え, 独立する, 旧主の一族 } from "../src/hitori/daimyo.js";
/* 風雲：主人公の妻子（試し：tests/fuun_kazoku.cjs） */
export { 子の生まれる見込み, 子を生む齢の限り, 主人公の子の限り, 縁談の齢の限り, 主人公の姓, 子の盤の者, 子の齢, 子が生きるか, 子の呼び名, 主人公の妻, 妻を見る,
  縁談の相手, 縁談を申し入れる, 縁談に答える, 幼名を付ける, 子の生まれ, 子を盤に, 元服の名の候補, 元服を待つ子, 元服させる, 風雲の家の正月, 風雲の家の月 } from "../src/hitori/kazoku.js";
export { 妻子の欄, 縁談の問い, 元服の問い } from "../src/hitori/Kazoku.jsx";
export { 姫の齢, 姫の役, 家臣に嫁がせる, 縁談を受ける, 姫の年送り } from "../src/core/hime.js";
export { heirCandidates, 一族の格, 生まれる目 } from "../src/core/house.js";
export { FuunYashiki, 住まいの絵 } from "../src/hitori/FuunYashiki.jsx";
export { 名簿の形, 新参の値, 名簿の形を見る, 今の統率, 一人の扶持, 新参を作る, 候補を作る, 名簿の扶持, 手勢の統率を量る, 手勢の武勇を量る, 名簿の素質, 手勢の名簿を整える, 雇えるか, 手勢を雇う, 暇を出す, 戦の損を名簿に移す, 名簿の人数, 練れの伸び, 統率の伸び, 練れを伸ばす, 統率の伸びを量る,
  欠員を作る, 欠けの数, 欠けの和, 補充できるか, 補充する, みな補充する, 戦の伸びの倍, 伸びの倍を見る, 統率に足す } from "../src/hitori/tezei_meibo.js";
export { 風雲の上司表 } from "../src/hitori/fuun_joushi.js";
export { 城の箱を集める, 堀の帯 } from "../src/hitori/shiro_senaka.js";
export { 城で通れるか } from "../src/hitori/senaka.js";
export { 主命の重さ, 主命の組, 山賊の隊, 手の届く町ら, 主命を下す, 主命の月の初め, 主命の月が明けた, 山賊の盤を組む, 山賊退治の果て, 働きかけの見込み, 月を足す, 働きかけの下る目, 偵察の組, 偵察の敵, 山賊の間, 偵察の間, 今の月番, 月番を年月に, 予定を見る, 予定を据える, 山賊の月か, 偵察の月か, 山賊の務めを決める, 偵察の的を選ぶ, 偵察の盤を組む, 偵察の果て, 偵察を見合わせる } from "../src/hitori/shumei.js";
/* 一門の見分け（風雲の上司を選ぶ試し） */
export { isKin, isMainClan, isClan, houseName } from "../src/core/house.js";
export { 姓, 姓名 } from "../src/core/util.js";
export { 合戦一覧, 合戦を探す, 合戦を仕立てる, 合戦を畳む, 合戦の問いに答える, 指図の縛り, 筋書きの覚え, 合戦を控える, 合戦を戻す, 控えの鍵 } from "../src/battle/kassen.js";
export { 筋書き as 関ヶ原 } from "../src/data/sekigahara.js";
export { battleAI } from "../src/battle/ai.js";
export { sideColor, ownZone, drawMon, 紋の核, drawCastleTerrain, drawCastleBuildings, drawFieldTerrain, drawBattle, 画面の上, 射の端 } from "../src/battle/draw.js";
// 眺めを回す向きと、盤の所を眺めの所へ写す式（兵の絵の試し：矢の弧は画面の上へ）
export { 向きを据える, 視, 地の丈, 水面の丈, 水図があるか, 高さ図があるか } from "../src/battle/naname.js";
export { 家々を据える, 葦を据える } from "../src/battle/sato.js";
export { 木立を据える } from "../src/battle/mori.js";
export { 地の足, 障りの内, 幹の半 } from "../src/hitori/senaka.js";
export { 分け目の野, 野を探す, 陣立てを敷く, 隊の間合い } from "../src/data/wakemeba.js";
export { 分け目の限り, 分け目の暮れ, 挑む直轄, 挑まれる版図, 再び挑める信用, 直轄の石高, 版図の石高, 石高の順, 並びの隣か, 天下分け目を挑めるか, 挑める家ら, 挑める見込み, 器量くらべ, 野を選ぶ側, 分け目の顔ぶれ, 分け目の兵, 分け目の備えを組む, 集結の月数, 天下分け目を起こす, 分け目を進める, 割譲できる城ら, 取る城を見立てる, 割譲の限り, 再び挑める月, 逃散の割, 野の見立て, 兵を逃散させる, 上下の縁を解く, 敗れた将の始末, 城を割譲する, 分け目の沙汰 } from "../src/core/wakeme.js";
export { 分け目の盤を組む, 分け目の戦果 } from "../src/battle/wakemeikusa.js";
export { 天下分け目の采配, 挑むか, AIの選ぶ野, 盤を開かずに裁く } from "../src/govern/aiWakeme.js";
export { newRoster, rosterTake, rosterAdd, rosterSync, rosterSum, 長の名, 長の階, 組の鍵, 階の段, 取り立てるべき組, 組頭の働きを記す, 組頭の帳, 戦の跡, 戦の跡を記す, 名簿を繕う, 通し番号を据える, 組の番 } from "../src/core/roster.js";
export { makePromotion, 取り立てる, 子の器量 } from "../src/core/house.js";
/* 音の座の様子（場面の曲が選ばれたか）。試験では音の座を作らないので、鳴りはせず曲名だけ見る */
export { 音の設定 } from "../src/audio/oto.js";
export { 録音の座を据える, 録音を掛ける, 録音を絞る, 録音の様子 } from "../src/audio/rokuon.js";
export { 効果の札, 効果の指紋, 効果がある, 効果の座を据える, 効果を鳴らす, 締めを鳴らす, 兵の音を掛ける,
  効果を止める, 効果を先に読む, 効果の様子, 効果の控えを空にする, 地の周, 一打の間, 知らせの間, 一打の限り } from "../src/audio/kouka.js";
export { 能力を広げる } from "../src/core/util.js";
