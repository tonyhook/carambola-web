export type EventValueKind = 'amount' | 'quantity';

const QUANTITY_EVENTS = new Set<string>([
]);

export function getEventValueKind(event: string): EventValueKind {
  // Davidia currently reports davidia_amount in cents; quantity events can be added here later.
  return QUANTITY_EVENTS.has(event) ? 'quantity' : 'amount';
}

export function getEventValueLabel(event: string): string {
  return getEventValueKind(event) === 'quantity' ? '数量' : '金额';
}

export function formatEventValue(event: string, value: number): string {
  if (getEventValueKind(event) === 'quantity') {
    return `${formatNumber(value)}个`;
  }

  return `${formatNumber(value / 100)}元`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
