import { ChangeDetectorRef, Component, effect, inject, input } from '@angular/core';
import { NgxEchartsModule } from 'ngx-echarts';
import { EChartsType } from 'echarts/core';
import { EChartsOption, SeriesOption } from 'echarts/types/dist/shared';
import { forkJoin, of } from 'rxjs';

import { ClientPort, ClientPortAPI, PerformanceAPI, PerformancePartner, VendorPort, VendorPortAPI } from '../../../core';
import { AdEntityComponent } from '../ad-entity/ad-entity.component';

type FinanceMetricKey =
  | 'outcomeUpstream'
  | 'outcomeRebate'
  | 'outcomePlatform'
  | 'outcomeDownstream';

interface FinanceMetricDefinition {
  key: FinanceMetricKey;
  label: string;
  color: string;
}

type FinancePoint = Record<FinanceMetricKey | 'income', number>;

const MONEY_DIVISOR = 100000;

@Component({
  selector: 'carambola-chart-finance',
  imports: [
    NgxEchartsModule,
    AdEntityComponent,
  ],
  templateUrl: './chart-finance.component.html',
  styleUrls: ['./chart-finance.component.scss'],
})
export class ChartFinanceComponent {
  private performanceAPI = inject(PerformanceAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  private cdr = inject(ChangeDetectorRef);

  private readonly stackMetrics: FinanceMetricDefinition[] = [
    { key: 'outcomeUpstream', label: '上游支出', color: '#ef6c00' },
    { key: 'outcomeRebate', label: '返点支出', color: '#6a1b9a' },
    { key: 'outcomePlatform', label: '平台收益', color: '#00897b' },
    { key: 'outcomeDownstream', label: '下游支出', color: '#1565c0' },
  ];

  end = new Date(new Date().setHours(0, 0, 0, 0));
  start = new Date(new Date().setHours(0, 0, 0, 0) - 29 * 24 * 60 * 60 * 1000);

  clientPort = input<ClientPort | null>(null);
  vendorPort = input<VendorPort | null>(null);

  echarts!: EChartsType;
  dataReady = false;

  clientPortList: ClientPort[] = [];
  vendorPortList: VendorPort[] = [];
  performanceData: PerformancePartner[] = [];
  timestamps: Date[] = [];
  selectedPortId = 0;

  chartOption: EChartsOption = {};

  constructor() {
    effect(() => {
      const clientPort = this.clientPort();
      const vendorPort = this.vendorPort();

      this.resetState();

      if (clientPort) {
        this.loadClientPortData(clientPort.id!);
      } else if (vendorPort) {
        this.loadVendorPortData(vendorPort.id!);
      }
    });
  }

  onChartInit(event: EChartsType) {
    this.echarts = event;
  }

  selectPort(portId: number) {
    this.selectedPortId = portId;
    this.updateChart(portId);
    this.cdr.detectChanges();
  }

  private resetState() {
    this.dataReady = false;
    this.selectedPortId = 0;
    this.clientPortList = [];
    this.vendorPortList = [];
    this.performanceData = [];
    this.chartOption = {};
    this.prepareTimestampList();
  }

  private loadClientPortData(clientPortId: number) {
    this.performanceAPI.getPerformanceClientList(
      'day',
      true,
      this.toISOStringWithTimezone(this.start),
      this.toISOStringWithTimezone(this.end),
      {
        filter: {
          clientPort: [clientPortId.toString()],
        },
        searchKey: [],
        searchValue: '',
      },
    ).subscribe(result => {
      this.performanceData = result;
      const vendorPortIds = this.uniqueIds(result.map(item => item.vendorPort));
      const vendorRequests = vendorPortIds.map(vendorPortId => this.vendorPortAPI.getVendorPort(vendorPortId));

      (vendorRequests.length > 0 ? forkJoin(vendorRequests) : of([])).subscribe(vendorPorts => {
        this.vendorPortList = vendorPorts;
        this.finishLoading();
      });
    });
  }

  private loadVendorPortData(vendorPortId: number) {
    this.performanceAPI.getPerformanceVendorList(
      'day',
      true,
      this.toISOStringWithTimezone(this.start),
      this.toISOStringWithTimezone(this.end),
      {
        filter: {
          vendorPort: [vendorPortId.toString()],
        },
        searchKey: [],
        searchValue: '',
      },
    ).subscribe(result => {
      this.performanceData = result;
      const clientPortIds = this.uniqueIds(result.map(item => item.clientPort));
      const clientRequests = clientPortIds.map(clientPortId => this.clientPortAPI.getClientPort(clientPortId));

      (clientRequests.length > 0 ? forkJoin(clientRequests) : of([])).subscribe(clientPorts => {
        this.clientPortList = clientPorts;
        this.finishLoading();
      });
    });
  }

  private finishLoading() {
    this.updateChart(0);
    this.dataReady = true;
    this.cdr.detectChanges();
  }

  private updateChart(port: number) {
    const portPerformanceData = this.getSelectedPortPerformance(port);
    const performanceMap = this.aggregateByDate(portPerformanceData);

    const header = ['指标', ...this.timestamps.map(timestamp => this.formatDate(timestamp))];
    const stackMetricsReversed = [...this.stackMetrics].reverse();
    const stackRows = stackMetricsReversed.map(definition => {
      const row: (string | number)[] = [definition.label];

      this.timestamps.forEach(timestamp => {
        const point = performanceMap.get(this.formatDate(timestamp)) ?? this.createEmptyPoint();
        row.push(point[definition.key]);
      });

      return row;
    });

    const incomeRow: (string | number)[] = ['收入'];
    this.timestamps.forEach(timestamp => {
      const point = performanceMap.get(this.formatDate(timestamp)) ?? this.createEmptyPoint();
      incomeRow.push(point.income);
    });

    const series: SeriesOption[] = [
      {
        name: '收入',
        type: 'line' as const,
        smooth: true,
        seriesLayoutBy: 'row' as const,
        emphasis: { focus: 'series' as const },
        lineStyle: { type: 'dashed', width: 2 },
        symbol: 'none' as const,
        color: '#212121',
      },
      ...stackMetricsReversed.map(definition => ({
        name: definition.label,
        type: 'line' as const,
        stack: 'cost',
        smooth: true,
        areaStyle: {},
        seriesLayoutBy: 'row' as const,
        emphasis: { focus: 'series' as const },
        symbol: 'none' as const,
        color: definition.color,
      })),
    ];

    this.chartOption = {
      title: {
        text: '费用趋势',
        left: 'center',
      },
      legend: {
        top: 32,
        data: ['收入', ...this.stackMetrics.map(item => item.label)],
      },
      tooltip: {
        trigger: 'axis',
        valueFormatter: value => this.formatMoneyLabel(Number(value)),
      },
      dataset: {
        source: [header, incomeRow, ...stackRows],
      },
      xAxis: {
        type: 'category',
      },
      yAxis: {
        axisLabel: {
          formatter: (value: number) => this.formatMoneyAxis(value),
        },
      },
      grid: {
        left: 80,
        right: 50,
        top: 80,
        bottom: 60,
      },
      series,
    } satisfies EChartsOption;
  }

  private aggregateByDate(data: PerformancePartner[]) {
    const performanceMap = new Map<string, FinancePoint>();

    for (const performance of data) {
      const timeKey = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10);
      const point = performanceMap.get(timeKey) ?? this.createEmptyPoint();

      point.income += this.normalizeMoney(performance.income);
      point.outcomeUpstream += this.normalizeMoney(performance.outcomeUpstream);
      point.outcomeRebate += this.normalizeMoney(performance.outcomeRebate);
      point.outcomeDownstream += this.normalizeMoney(performance.outcomeDownstream);
      point.outcomePlatform =
        point.income - point.outcomeUpstream - point.outcomeRebate - point.outcomeDownstream;

      performanceMap.set(timeKey, point);
    }

    return performanceMap;
  }

  private getSelectedPortPerformance(port: number) {
    if (port === 0) {
      return this.performanceData;
    }

    if (this.clientPort()) {
      return this.performanceData.filter(item => item.vendorPort === port);
    }

    return this.performanceData.filter(item => item.clientPort === port);
  }

  private createEmptyPoint(): FinancePoint {
    return {
      income: 0,
      outcomeUpstream: 0,
      outcomeRebate: 0,
      outcomePlatform: 0,
      outcomeDownstream: 0,
    };
  }

  private uniqueIds(ids: number[]) {
    return [...new Set(ids.filter(id => id > 0))];
  }

  private normalizeMoney(value: number) {
    return Math.round((value / MONEY_DIVISOR) * 100) / 100;
  }

  private formatMoneyAxis(value: number) {
    return `${value}`;
  }

  private formatMoneyLabel(value: number) {
    return `${value.toFixed(2)}`;
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toISOStringWithTimezone(date: Date) {
    const tzo = date.getTimezoneOffset();
    const dif = tzo < 0 ? '+' : '-';
    const pad = (num: number) => (num < 10 ? '0' : '') + num;

    return date.getFullYear() +
      '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) +
      ':' + pad(date.getMinutes()) +
      ':' + pad(date.getSeconds()) +
      dif + pad(Math.floor(Math.abs(tzo) / 60)) +
      ':' + pad(Math.abs(tzo) % 60);
  }

  private prepareTimestampList() {
    this.timestamps = [];

    for (let t = this.end.getTime(); t >= this.start.getTime();) {
      const date = new Date(t);
      date.setMilliseconds(0);
      date.setSeconds(0);
      date.setMinutes(0);
      date.setHours(0);

      this.timestamps.push(date);
      t = date.getTime() - 86400000;
    }

    this.timestamps.reverse();
  }
}
