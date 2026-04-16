import { PortType } from '../../core';

type NullableString = string | null | undefined;

const FORMAT_LABELS: Record<string, string> = {
  banner: '横幅',
  interstitial: '插屏',
  splash: '开屏',
  feeds: '信息流',
  video: '视频',
};

const BUDGET_LABELS: Record<string, string> = {
  unknown: '未知',
  k2: 'K2',
  tanx: 'Tanx',
  jd: '京东',
  qihang: '启航',
  dahanghai: '大航海',
  kuaishou: '快手',
  pinduoduo: '拼多多',
  huichuan: '汇川',
  game: '游戏',
  didi: '滴滴',
  iqiyi: '爱奇艺',
  baidu: '百度',
  meituan: '美团',
  juheshangcheng: '聚合电商',
  mangguo: '芒果',
};

const PLATFORM_LABELS: Record<string, string> = {
  android: 'Android',
  ios: 'iOS',
  harmony: 'HarmonyOS',
  harmonyos: 'HarmonyOS',
  鸿蒙: 'HarmonyOS',
  hmos: 'HarmonyOS',
};

function normalizedText(value: NullableString): string {
  return (value ?? '').trim();
}

function platformLabel(platform: NullableString): string {
  const normalizedPlatform = normalizedText(platform);
  if (!normalizedPlatform) {
    return 'OS';
  }

  const compactKey = normalizedPlatform.toLowerCase().replace(/[\s_-]+/g, '');
  if (PLATFORM_LABELS[compactKey]) {
    return PLATFORM_LABELS[compactKey];
  }

  return normalizedPlatform;
}

function formatLabel(format: NullableString): string {
  const normalizedFormat = normalizedText(format).toLowerCase();
  return FORMAT_LABELS[normalizedFormat] ?? '位置';
}

function budgetLabel(budget: NullableString): string {
  const normalizedBudget = normalizedText(budget).toLowerCase();
  return BUDGET_LABELS[normalizedBudget] ?? '预算';
}

function modeLabel(mode: number | null | undefined): string {
  if (mode === PortType.PORT_TYPE_SHARE) {
    return '分成';
  }

  return 'RTB';
}

export function buildPortNameTemplate(config: {
  appName?: NullableString;
  mediaName?: NullableString;
  platform?: NullableString;
  format?: NullableString;
  budget?: NullableString;
  mode?: number | null;
}): string {
  return [
    normalizedText(config.mediaName) || normalizedText(config.appName) || 'APP',
    platformLabel(config.platform),
    formatLabel(config.format),
    budgetLabel(config.budget),
    modeLabel(config.mode),
  ].join('-');
}
