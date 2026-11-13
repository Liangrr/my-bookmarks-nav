import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";

const GAMES = [
  { badge: "1024", name: "1024 合并", desc: "滑动相加合到 1024 · 预览 / 连击 / 撤销", url: "/subpackages/game1024/index" },
  { badge: "帥", name: "中国象棋", desc: "完整走法与将死判定 · 中文棋谱 · AI", url: "/subpackages/games/xiangqi/index" },
  { badge: "●○", name: "五子棋", desc: "15×15 自由规则 · 会堵活三的 AI", url: "/subpackages/games/gomoku/index" },
  { badge: "旗", name: "陆战棋（标准军棋）", desc: "5×12 棋盘 · 25 子布阵 · 铁路行营 · 暗棋裁判", url: "/subpackages/games/junqi/index" },
  { badge: "翻", name: "陆战棋 · 翻翻棋", desc: "50 枚暗子 · 翻子定阵营 · 挖光 3 雷扛军旗", url: "/subpackages/games/junqi-flip/index" },
];

export default function GamesHub() {
  return (
    <View className="page gm-hub">
      <Text className="title">游戏中心</Text>
      <Text className="sub">五款站内小游戏，与网页共用同一套共享纯逻辑；进度自动存档，随时接着玩。</Text>
      {GAMES.map((g) => (
        <View key={g.url} className="gm-hub-card" onClick={() => void Taro.navigateTo({ url: g.url })}>
          <View className="gm-hub-badge"><Text className="gm-hub-badge-text">{g.badge}</Text></View>
          <View className="gm-hub-body">
            <Text className="gm-hub-name">{g.name}</Text>
            <Text className="gm-hub-desc">{g.desc}</Text>
          </View>
          <Text className="gm-hub-go">开始 →</Text>
        </View>
      ))}
      <Text className="gm-hub-foot">棋类规则在各页面的「玩法规则」里；陆战棋有两种并列玩法——标准军棋暗棋（布阵 / 铁路 / 行营 / 程序裁判）与翻翻棋（50 枚暗子 / 翻子定阵营 / 挖雷扛旗）。军棋无官方统一规则，页面里逐条写明了所采用的通行口径。</Text>
    </View>
  );
}
