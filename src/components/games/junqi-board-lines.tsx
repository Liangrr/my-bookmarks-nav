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

const cx = (i: number) => jqCol(i) + 0.5;
const cy = (i: number) => jqRow(i) + 0.5;

/**
 * 陆战棋 5×12 棋盘底图（SVG）：公路细线、铁路粗线、行营圆圈、大本营盾形、前线山界。
 * 标准军棋（暗棋 + 程序裁判）与翻翻棋共用同一张棋盘拓扑，故抽出成公共视图组件。
 * 阵地 / 前线文字不放进棋盘：会被棋子完全盖住，改由棋盘下方提示与规则说明承担。
 */
export function JunqiBoardLines() {
  return (
    <svg className="jq2-lines" viewBox={`0 0 ${JQ_COLS} ${JQ_ROWS}`} preserveAspectRatio="none" aria-hidden="true">
      {JQ_SEGMENTS.map((seg, k) => (
        <line
          key={k}
          x1={cx(seg.a)} y1={cy(seg.a)} x2={cx(seg.b)} y2={cy(seg.b)}
          className={seg.kind === "rail" ? "jq2-rail" : "jq2-road"}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {JQ_CAMPS.map((i) => (
        <circle key={`c${i}`} cx={cx(i)} cy={cy(i)} r={0.38} className="jq2-camp" vectorEffect="non-scaling-stroke" />
      ))}
      {JQ_HQS.map((i) => (
        <rect key={`h${i}`} x={cx(i) - 0.36} y={cy(i) - 0.36} width={0.72} height={0.72} rx={0.14} className="jq2-hq" vectorEffect="non-scaling-stroke" />
      ))}
      <line x1={0} y1={6} x2={JQ_COLS} y2={6} className="jq2-front" vectorEffect="non-scaling-stroke" />
      {JQ_FRONT_GAPS.map((c) => (
        <g key={`m${c}`} className="jq2-mountain">
          <path d={`M ${c + 0.5} 5.72 L ${c + 0.82} 6.28 L ${c + 0.18} 6.28 Z`} />
        </g>
      ))}
    </svg>
  );
}
