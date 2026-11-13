import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "游戏中心 - 星轨",
  description:
    "星轨站内小游戏合集：1024 数字合并、中国象棋、五子棋、标准陆战棋（军棋暗棋）、陆战棋翻翻棋。网页与小程序共用同一套共享纯逻辑，支持人机对战、双人同屏、撤销与自动存档。",
};

const GAMES = [
  {
    badge: "1024",
    name: "1024 数字合并",
    desc: "滑动相加合到 1024，下一块预览、连击加分、里程碑、有限撤销。",
    tags: ["单人", "成绩单", "每日挑战"],
    href: "/game-1024",
  },
  {
    badge: "帥",
    name: "中国象棋",
    desc: "完整走法与将死判定：蹩马腿、塞象眼、炮架、飞将，附中文棋谱与三档 AI。",
    tags: ["人机", "双人", "棋谱"],
    href: "/games/xiangqi",
  },
  {
    badge: "●○",
    name: "五子棋",
    desc: "15×15 自由规则，连五判胜。AI 会堵活三、抢活四，还会预演你的反击。",
    tags: ["人机", "双人", "15 路"],
    href: "/games/gomoku",
  },
  {
    badge: "旗",
    name: "陆战棋（标准军棋）",
    desc: "5×12 棋盘、25 子布阵、铁路与行营、暗棋由程序裁判，工兵挖雷、炸弹同归于尽、扛军旗定胜负。",
    tags: ["人机", "双人", "布阵", "战报"],
    href: "/games/junqi",
  },
  {
    badge: "翻",
    name: "陆战棋 · 翻翻棋",
    desc: "50 枚棋子全部倒扣，轮流翻子定阵营；翻子或走子二选一，挖光 3 雷才能扛军旗。",
    tags: ["人机", "双人", "暗子", "运气"],
    href: "/games/junqi-flip",
  },
];

export default function GamesPage() {
  return (
    <div className="container games-hub">
      <header className="games-hub-head">
        <h1>游戏中心</h1>
        <p>
          五款站内小游戏，网页与小程序共用同一套共享纯逻辑（<code>packages/shared-lib</code>），
          进度自动存档，随时换设备接着玩。
        </p>
      </header>
      <div className="games-hub-grid">
        {GAMES.map((game) => (
          <Link key={game.href} href={game.href} className="games-hub-card">
            <span className="games-hub-badge">{game.badge}</span>
            <span className="games-hub-name">{game.name}</span>
            <span className="games-hub-desc">{game.desc}</span>
            <span className="games-hub-tags">
              {game.tags.map((t) => <i key={t}>{t}</i>)}
            </span>
            <span className="games-hub-go">开始 →</span>
          </Link>
        ))}
      </div>
      <p className="games-hub-foot">
        棋类规则说明在每个页面的「玩法规则」里；陆战棋有两种并列玩法——标准军棋暗棋（布阵 / 铁路 / 行营 / 程序裁判）与翻翻棋（50 枚暗子 / 轮流翻子定阵营 / 挖雷扛旗）。军棋无官方统一规则，各页面逐条写明了所采用的通行口径。
      </p>
    </div>
  );
}
