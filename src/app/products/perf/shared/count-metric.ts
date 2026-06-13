import { CountView } from '../entity';

export const EVENT_IMPRESSION = '0001';
export const EVENT_CLICK = '0002';
export const EVENT_ACTIVATION = '2002';
export const EVENT_REGISTER = '2003';
// 付费窗口自激活当天起算。一笔付费只产生一个事件，落在它所属的那个窗口里，窗口之间不重叠、可以相加
export const PAY_WINDOWS: {event: string; label: string}[] = [
  {event: '2021', label: '首日付费'},
  {event: '2022', label: '三日付费'},
  {event: '2023', label: '七日付费'},
  {event: '2024', label: '十四日付费'},
];
// 其他付费：上游分不出窗口或超过十四日的付费
export const PAY_SEGMENTS: {event: string; label: string}[] = [
  ...PAY_WINDOWS,
  {event: '2015', label: '其他付费'},
];

// 留存窗口自激活次日起算
export const EVENT_RETENTION = '2004';
export const RETENTION_WINDOWS: {event: string; label: string}[] = [
  {event: EVENT_RETENTION, label: '次留量'},
  {event: '2018', label: '三留量'},
  {event: '2005', label: '七留量'},
  {event: '2025', label: '十四留量'},
];

export const FIXED_EVENTS: string[] = [
  EVENT_IMPRESSION,
  EVENT_CLICK,
  EVENT_ACTIVATION,
  EVENT_REGISTER,
  ...PAY_SEGMENTS.map(segment => segment.event),
  ...RETENTION_WINDOWS.map(window => window.event),
];

// count 为个数，money 单位为分，rate 按百分比显示
export type MetricKind = 'count' | 'money' | 'rate';

// 多个窗口合并在一格里的一段，各段用斜线隔开、各自可下钻
export interface MetricSegment {
  label: string;
  event: string;
  value: (row: CountView) => number | null;
}

export interface MetricColumn {
  key: string;
  label: string;
  kind: MetricKind;
  // 该列由事件明细支撑，可下钻查看最近事件
  event?: string;
  // 在有效数下方附带显示原始数（含重复上报）
  raw?: boolean;
  // 有值时按段显示，value 取第一段，排序也按第一段
  segments?: MetricSegment[];
  // 各行相加后不再成立的指标（去重人数），汇总行里不显示
  nonAdditive?: boolean;
  // 各段互不重叠时，汇总行只显示各段之和
  sumSegmentsInTotal?: boolean;
  value: (row: CountView) => number | null;
}

function count(row: CountView, event: string): number {
  return row.eventCounts?.[event] ?? 0;
}

function users(row: CountView, event: string): number {
  return row.eventUserCounts?.[event] ?? 0;
}

function amount(row: CountView, event: string): number {
  return row.eventAmounts?.[event] ?? 0;
}

function spend(row: CountView): number {
  return row.spend ?? 0;
}

function divide(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function segmentColumn(
  key: string,
  label: string,
  kind: MetricKind,
  raw: boolean,
  windows: {event: string; label: string}[],
  value: (row: CountView, event: string) => number,
): MetricColumn {
  const segments = windows.map(window => ({label: window.label, event: window.event, value: (row: CountView) => value(row, window.event)}));

  return {key, label, kind, raw, segments, value: segments[0].value};
}

export const METRIC_COLUMNS: MetricColumn[] = [
  // 媒体平台侧的消耗，暂无数据源
  {key: 'platformSpend', label: '平台花费', kind: 'money', value: () => null},
  {key: 'spend', label: '实际花费', kind: 'money', value: row => spend(row)},
  {key: 'impression', label: '曝光量', kind: 'count', event: EVENT_IMPRESSION, raw: true, value: row => count(row, EVENT_IMPRESSION)},
  {key: 'click', label: '点击量', kind: 'count', event: EVENT_CLICK, raw: true, value: row => count(row, EVENT_CLICK)},
  {key: 'ctr', label: '点击率', kind: 'rate', value: row => divide(count(row, EVENT_CLICK), count(row, EVENT_IMPRESSION))},
  {key: 'cpc', label: '点击成本', kind: 'money', value: row => divide(spend(row), count(row, EVENT_CLICK))},
  {key: 'activation', label: '激活数', kind: 'count', event: EVENT_ACTIVATION, raw: true, value: row => count(row, EVENT_ACTIVATION)},
  {key: 'activationCost', label: '激活成本', kind: 'money', value: row => divide(spend(row), count(row, EVENT_ACTIVATION))},
  {key: 'conversionRate', label: '转化率', kind: 'rate', value: row => divide(count(row, EVENT_ACTIVATION), count(row, EVENT_CLICK))},
  {key: 'register', label: '注册数', kind: 'count', event: EVENT_REGISTER, raw: true, value: row => count(row, EVENT_REGISTER)},
  {key: 'registerCost', label: '注册成本', kind: 'money', value: row => divide(spend(row), count(row, EVENT_REGISTER))},
  {key: 'registerRate', label: '注册率', kind: 'rate', value: row => divide(count(row, EVENT_REGISTER), count(row, EVENT_ACTIVATION))},
  segmentColumn('retention', '留存量 次/3/7/14', 'count', true, RETENTION_WINDOWS, (row, event) => count(row, event)),
  // 同时段相除：N 日留存来自 N 天前的激活，窗口越长错位越大，所以只给次留算率
  {key: 'retentionRate', label: '次留率', kind: 'rate', value: row => divide(count(row, EVENT_RETENTION), count(row, EVENT_ACTIVATION))},
  {
    ...segmentColumn('payUsers', '付费人数 1/3/7/14/其他', 'count', false, PAY_SEGMENTS, (row, event) => users(row, event)),
    // 同一设备在多个时段、渠道都付费时会被各行重复计数
    nonAdditive: true,
  },
  {
    ...segmentColumn('pay', '付费次数 1/3/7/14/其他', 'count', true, PAY_SEGMENTS, (row, event) => count(row, event)),
    sumSegmentsInTotal: true,
  },
  {
    ...segmentColumn('payAmount', '付费金额 1/3/7/14/其他', 'money', false, PAY_SEGMENTS, (row, event) => amount(row, event)),
    sumSegmentsInTotal: true,
  },
];

export function formatMetric(value: number | null, kind: MetricKind): string {
  if (value === null) {
    return '-';
  }

  switch (kind) {
    case 'count':
      return formatNumber(value, 0);
    case 'money':
      return formatNumber(value / 100, 2);
    case 'rate':
      return formatNumber(value * 100, 2) + '%';
  }
}

function formatNumber(value: number, digits: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
