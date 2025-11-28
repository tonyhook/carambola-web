import { ChangeDetectorRef, Component, effect, inject, input } from '@angular/core';
import { NgxEchartsModule } from 'ngx-echarts';
import { EChartsType } from 'echarts/core';
import { EChartsOption, SeriesOption } from 'echarts/types/dist/shared';
import { forkJoin, of } from 'rxjs';

import { ClientPort, ClientPortAPI, PerformanceAPI, PerformancePartner, VendorPort, VendorPortAPI } from '../../../core';
import { AdEntityComponent } from '../ad-entity/ad-entity.component';

type TrafficMetricKey =
  | 'request'
  | 'validRequest'
  | 'response'
  | 'noBidding'
  | 'validResponse'
  | 'eventA' | 'eventB' | 'eventC' | 'eventD' | 'eventE'
  | 'eventF' | 'eventG' | 'eventH' | 'eventK' | 'eventL'
  | 'eventM' | 'eventN' | 'eventO';

interface TrafficMetricDefinition {
  key: TrafficMetricKey;
  label: string;
  color: string;
}

type TrafficPoint = Record<TrafficMetricKey, number>;

@Component({
  selector: 'carambola-chart-traffic',
  imports: [
    NgxEchartsModule,
    AdEntityComponent,
  ],
  templateUrl: './chart-traffic.component.html',
  styleUrls: ['./chart-traffic.component.scss'],
})
export class ChartTrafficComponent {
  private performanceAPI = inject(PerformanceAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  private cdr = inject(ChangeDetectorRef);

  private readonly clientFunnelMetrics: TrafficMetricDefinition[] = [
    { key: 'request', label: '请求', color: '#1565c0' },
    { key: 'validRequest', label: '有效请求', color: '#2e7d32' },
    { key: 'noBidding', label: '不出价', color: '#9e9e9e' },
    { key: 'response', label: '响应', color: '#ef6c00' },
    { key: 'validResponse', label: '有效响应', color: '#00897b' },
  ];

  private readonly clientFailedRequestMetrics: TrafficMetricDefinition[] = [
    { key: 'eventA', label: '超时', color: '#1565c0' },
    { key: 'eventB', label: '请求失败', color: '#ef6c00' },
    { key: 'eventG', label: '上行转换失败', color: '#2e7d32' },
    { key: 'eventH', label: '未知上游', color: '#c62828' },
    { key: 'eventL', label: '超流控', color: '#6a1b9a' },
    { key: 'eventM', label: '缺失关键字段', color: '#00838f' },
    { key: 'eventN', label: '反作弊拦截', color: '#ad1457' },
  ];

  private readonly clientLostResponseMetrics: TrafficMetricDefinition[] = [
    { key: 'eventF', label: '响应解析失败', color: '#5d4037' },
    { key: 'eventO', label: '请求被拒', color: '#37474f' },
  ];

  private readonly clientFailedResponseMetrics: TrafficMetricDefinition[] = [
    { key: 'eventK', label: '出价低于底价', color: '#e65100' },
  ];

  private readonly vendorFunnelMetrics: TrafficMetricDefinition[] = [
    { key: 'request', label: '请求', color: '#1565c0' },
    { key: 'validRequest', label: '有效请求', color: '#2e7d32' },
    { key: 'response', label: '响应', color: '#ef6c00' },
  ];

  private readonly vendorFailedRequestMetrics: TrafficMetricDefinition[] = [
    { key: 'eventA', label: '协议未知', color: '#1565c0' },
    { key: 'eventB', label: '协议版本错误', color: '#ef6c00' },
    { key: 'eventC', label: '无广告位', color: '#2e7d32' },
    { key: 'eventD', label: '未注册', color: '#00897b' },
    { key: 'eventE', label: '无匹配连接', color: '#6a1b9a' },
    { key: 'eventF', label: '超下游流控', color: '#00838f' },
    { key: 'eventG', label: '下游反作弊拦截', color: '#ad1457' },
  ];

  private readonly vendorLostResponseMetrics: TrafficMetricDefinition[] = [
    { key: 'eventH', label: '无响应', color: '#c62828' },
  ];

  end = new Date(new Date().setHours(0, 0, 0, 0));
  start = new Date(new Date().setHours(0, 0, 0, 0) - 29 * 24 * 60 * 60 * 1000);

  clientPort = input<ClientPort | null>(null);
  vendorPort = input<VendorPort | null>(null);

  echartsFunnel!: EChartsType;
  echartsFailedRequest!: EChartsType;
  echartsLostResponse!: EChartsType;
  echartsFailedResponse!: EChartsType;

  dataReady = false;

  clientPortList: ClientPort[] = [];
  vendorPortList: VendorPort[] = [];
  performanceData: PerformancePartner[] = [];
  timestamps: Date[] = [];
  selectedPortId = 0;

  chartFunnelOption: EChartsOption = {};
  chartFailedRequestOption: EChartsOption = {};
  chartLostResponseOption: EChartsOption = {};
  chartFailedResponseOption: EChartsOption = {};

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

  onChartFunnelInit(event: EChartsType) {
    this.echartsFunnel = event;
  }

  onChartFailedRequestInit(event: EChartsType) {
    this.echartsFailedRequest = event;
  }

  onChartLostResponseInit(event: EChartsType) {
    this.echartsLostResponse = event;
  }

  onChartFailedResponseInit(event: EChartsType) {
    this.echartsFailedResponse = event;
  }

  selectPort(portId: number) {
    this.selectedPortId = portId;
    this.updateCharts(portId);
    this.cdr.detectChanges();
  }

  private resetState() {
    this.dataReady = false;
    this.selectedPortId = 0;
    this.clientPortList = [];
    this.vendorPortList = [];
    this.performanceData = [];
    this.chartFunnelOption = {};
    this.chartFailedRequestOption = {};
    this.chartLostResponseOption = {};
    this.chartFailedResponseOption = {};
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
    this.updateCharts(0);
    this.dataReady = true;
    this.cdr.detectChanges();
  }

  private updateCharts(port: number) {
    const portPerformanceData = this.getSelectedPortPerformance(port);

    if (this.vendorPort()) {
      const trafficMap = this.aggregateVendorByDate(portPerformanceData);
      this.chartFunnelOption = this.createChartOption('流量漏斗', this.vendorFunnelMetrics, trafficMap);
      this.chartFailedRequestOption = this.createChartOption('请求失败原因', this.vendorFailedRequestMetrics, trafficMap);
      this.chartLostResponseOption = this.createChartOption('响应丢失原因', this.vendorLostResponseMetrics, trafficMap);
      return;
    }

    const trafficMap = this.aggregateClientByDate(portPerformanceData);
    this.chartFunnelOption = this.createChartOption('流量漏斗', this.clientFunnelMetrics, trafficMap);
    this.chartFailedRequestOption = this.createChartOption('请求失败原因', this.clientFailedRequestMetrics, trafficMap);
    this.chartLostResponseOption = this.createChartOption('响应丢失原因', this.clientLostResponseMetrics, trafficMap);
    this.chartFailedResponseOption = this.createChartOption('响应无效原因', this.clientFailedResponseMetrics, trafficMap);
  }

  private createChartOption(
    title: string,
    metrics: TrafficMetricDefinition[],
    trafficMap: Map<string, TrafficPoint>,
  ) {
    const header = ['指标', ...this.timestamps.map(timestamp => this.formatDate(timestamp))];
    const dataRows = metrics.map(definition => {
      const row: (string | number)[] = [definition.label];

      this.timestamps.forEach(timestamp => {
        const point = trafficMap.get(this.formatDate(timestamp)) ?? this.createEmptyPoint();
        row.push(point[definition.key]);
      });

      return row;
    });

    const series: SeriesOption[] = metrics.map(() => ({
      type: 'line' as const,
      smooth: true,
      seriesLayoutBy: 'row' as const,
      emphasis: { focus: 'series' as const },
    }));

    return {
      color: metrics.map(item => item.color),
      title: {
        text: title,
        left: 'center',
      },
      legend: {
        top: 32,
      },
      tooltip: {
        trigger: 'axis',
      },
      dataset: {
        source: [header, ...dataRows],
      },
      xAxis: {
        type: 'category',
      },
      yAxis: {},
      grid: {
        left: 80,
        right: 50,
        top: 80,
        bottom: 60,
      },
      series,
    } satisfies EChartsOption;
  }

  private aggregateClientByDate(data: PerformancePartner[]) {
    const performanceMap = new Map<string, TrafficPoint>();

    for (const performance of data) {
      const timeKey = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10);
      const point = performanceMap.get(timeKey) ?? this.createEmptyPoint();

      point.request += this.getClientRequestCount(performance);
      point.validRequest += this.getClientValidRequestCount(performance);
      point.response += this.getClientResponseCount(performance);
      point.validResponse += this.getClientValidResponseCount(performance);
      point.noBidding += performance.eventC;
      point.eventA += performance.eventA;
      point.eventB += performance.eventB;
      point.eventF += performance.eventF;
      point.eventG += performance.eventG;
      point.eventH += performance.eventH;
      point.eventK += performance.eventK;
      point.eventL += performance.eventL;
      point.eventM += performance.eventM;
      point.eventN += performance.eventN;
      point.eventO += performance.eventO;

      performanceMap.set(timeKey, point);
    }

    return performanceMap;
  }

  private aggregateVendorByDate(data: PerformancePartner[]) {
    const performanceMap = new Map<string, TrafficPoint>();

    for (const performance of data) {
      const timeKey = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10);
      const point = performanceMap.get(timeKey) ?? this.createEmptyPoint();

      point.request += this.getVendorRequestCount(performance);
      point.validRequest += this.getVendorValidRequestCount(performance);
      point.response += this.getVendorResponseCount(performance);
      point.eventA += performance.eventA;
      point.eventB += performance.eventB;
      point.eventC += performance.eventC;
      point.eventD += performance.eventD;
      point.eventE += performance.eventE;
      point.eventF += performance.eventF;
      point.eventG += performance.eventG;
      point.eventH += performance.eventH;

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

  private getClientRequestCount(performance: PerformancePartner) {
    return performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
      performance.eventF + performance.eventG + performance.eventH + performance.eventK + performance.eventL +
      performance.eventM + performance.eventN + performance.eventO;
  }

  private getClientValidRequestCount(performance: PerformancePartner) {
    return performance.eventC + performance.eventD + performance.eventE + performance.eventF +
      performance.eventK + performance.eventO;
  }

  private getClientResponseCount(performance: PerformancePartner) {
    return performance.eventD + performance.eventE + performance.eventK;
  }

  private getClientValidResponseCount(performance: PerformancePartner) {
    return performance.eventD + performance.eventE;
  }

  private getVendorRequestCount(performance: PerformancePartner) {
    return performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
      performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ;
  }

  private getVendorValidRequestCount(performance: PerformancePartner) {
    return performance.eventH + performance.eventI + performance.eventJ;
  }

  private getVendorResponseCount(performance: PerformancePartner) {
    return performance.eventI + performance.eventJ;
  }

  private createEmptyPoint(): TrafficPoint {
    return {
      request: 0,
      validRequest: 0,
      response: 0,
      noBidding: 0,
      validResponse: 0,
      eventA: 0, eventB: 0, eventC: 0, eventD: 0, eventE: 0,
      eventF: 0, eventG: 0, eventH: 0, eventK: 0, eventL: 0,
      eventM: 0, eventN: 0, eventO: 0,
    };
  }

  private uniqueIds(ids: number[]) {
    return [...new Set(ids.filter(id => id > 0))];
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
