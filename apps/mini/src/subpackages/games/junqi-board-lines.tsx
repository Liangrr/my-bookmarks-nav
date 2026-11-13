import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import {
  JQ_CAMPS,
  JQ_COLS,
  JQ_FRONT_GAPS,
  JQ_HQS,
  JQ_ROWS,
  JQ_SEGMENTS,
  jqCol,
  jqRow,
} from "@shared-lib/junqi";

/**
 * 陆战棋 5×12 棋盘底图与尺寸常量：标准军棋暗棋、翻翻棋共用。
 * 小程序无可靠 SVG / CSS Grid，126 条线路改用 View + rotate 逐段绘制；
 * 按 750 设计宽写 px，Taro 构建时转 rpx，行内数值统一走 pxTransform。
 */
export const CELL_W = 132;
export const CELL_H = 121;
export const BOARD_W = CELL_W * JQ_COLS;
export const BOARD_H = CELL_H * JQ_ROWS;
export const px = (n: number) => Taro.pxTransform(n);
export const centerX = (i: number) => (jqCol(i) + 0.5) * CELL_W;
export const centerY = (i: number) => (jqRow(i) + 0.5) * CELL_H;

export function JunqiBoardLines() {
  return (
    <View className="gm-jq2-lines" style={{ width: px(BOARD_W), height: px(BOARD_H) }}>
      {JQ_SEGMENTS.map((seg, k) => {
        const x1 = centerX(seg.a);
        const y1 = centerY(seg.a);
        const x2 = centerX(seg.b);
        const y2 = centerY(seg.b);
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        return (
          <View
            key={k}
            className={`gm-jq2-line ${seg.kind}`}
            style={{ left: px(x1), top: px(y1), width: px(len), transform: `rotate(${angle}deg)` }}
          />
        );
      })}
      {JQ_CAMPS.map((i) => (
        <View
          key={`c${i}`}
          className="gm-jq2-camp"
          style={{ left: px(centerX(i) - 44), top: px(centerY(i) - 44) }}
        />
      ))}
      {JQ_HQS.map((i) => (
        <View
          key={`h${i}`}
          className="gm-jq2-hq"
          style={{ left: px(centerX(i) - 44), top: px(centerY(i) - 44) }}
        />
      ))}
      <View className="gm-jq2-front" style={{ left: 0, top: px(6 * CELL_H), width: px(BOARD_W) }} />
      {JQ_FRONT_GAPS.map((c) => (
        <View key={`m${c}`} className="gm-jq2-mountain" style={{ left: px(c * CELL_W), top: px(6 * CELL_H - 22) }}>
          <Text>山界</Text>
        </View>
      ))}
      {/* 阵地文字改由页面提示承担，避免被棋子遮住 */}
    </View>
  );
}
