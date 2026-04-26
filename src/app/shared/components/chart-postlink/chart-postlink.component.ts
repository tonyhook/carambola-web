import { Component, effect, inject, input, signal } from '@angular/core';
import { EChartsType } from 'echarts/core';
import { EChartsOption, SeriesOption } from 'echarts/types/dist/shared';
import { NgxEchartsModule } from 'ngx-echarts';
import { forkJoin } from 'rxjs';

import { ClientPort, ClientPortAPI, PerformanceAPI, PerformancePartner, VendorPort, VendorPortAPI } from '../../../core';
import { AdEntityComponent } from "../ad-entity/ad-entity.component";

@Component({
  selector: 'carambola-chart-postlink',
  imports: [
    NgxEchartsModule,
    AdEntityComponent,
  ],
  templateUrl: './chart-postlink.component.html',
  styleUrls: ['./chart-postlink.component.scss'],
})
export class ChartPostlinkComponent {
  private performanceAPI = inject(PerformanceAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private vendorPortAPI = inject(VendorPortAPI);

  private eventTypeNames: Record<string, string> = {
    '503': 'deeplink尝试调起',
    '504': 'deeplink调起成功',
    '505': 'deeplink调起失败',
    '506': 'deeplink目标应用已安装',
    '507': 'deeplink目标应用未安装',
    '508': '访问落地页',
    '509': '关闭',
    '601': '开始下载',
    '602': '结束下载',
    '603': '开始安装',
    '604': '结束安装',
    '605': '打开激活',
    '606': '关闭下载',
    '607': '暂停下载',
    '608': '继续下载',
    '609': '下载删除',
    '701': '视频播放开始',
    '702': '视频播放25%',
    '703': '视频播放50%',
    '704': '视频播放75%',
    '705': '视频播放结束',
    '706': '视频播放3秒',
    '707': '视频播放5秒',
    '708': '视频播放暂停',
    '709': '视频播放继续',
    '710': '视频跳过',
    '711': '视频关闭',
    '712': '视频重播',
    '713': '视频静音',
    '714': '视频取消静音',
    '715': '视频全屏',
    '716': '视频退出全屏',
    '717': '视频上滑',
    '718': '视频下滑',
    '719': '视频加载成功',
    '720': '视频加载失败',
    '721': '视频封面点击',
    '722': '视频结束卡片展示',
    '723': '视频结束卡片点击',
    '724': '视频播放错误',
    '725': '视频浮窗',
    '726': '视频激励条件达成',
  };

  private eventTypeColors: Record<string, string> = {
    '503': '#1f77b4', '504': '#ff7f0e', '505': '#2ca02c', '506': '#d62728', '507': '#9467bd',
    '508': '#8c564b', '509': '#e377c2', '601': '#7f7f7f', '602': '#bcbd22', '603': '#17becf',
    '604': '#ff9896', '605': '#aec7e8', '606': '#ffbb78', '607': '#98df8a', '608': '#ff9896',
    '609': '#c5b0d5', '701': '#c49c94', '702': '#f7b6d2', '703': '#c7c7c7', '704': '#dbdb8d',
    '705': '#9edae5', '706': '#393b79', '707': '#5254a3', '708': '#6b6ecf', '709': '#9c9ede',
    '710': '#637939', '711': '#8ca252', '712': '#b5cf6b', '713': '#cedb9c', '714': '#8c6d31',
    '715': '#bd9e39', '716': '#e7ba52', '717': '#e7cb94', '718': '#843c39', '719': '#ad494a',
    '720': '#d6616b', '721': '#e7969c', '722': '#7b4173', '723': '#a55194', '724': '#ce6dbd',
    '725': '#de9ed6', '726': '#3182bd',
  };

  end = new Date(new Date().setHours(0, 0, 0, 0));
  start = new Date(new Date().setHours(0, 0, 0, 0) - 29 * 24 * 60 * 60 * 1000);

  clientPort = input<ClientPort | null>(null);
  vendorPort = input<VendorPort | null>(null);
  mode = input<string>('postlink');

  echarts!: EChartsType;
  dataReady = signal(false);
  bundleDataReady = signal(false);

  clientPortList = signal<ClientPort[]>([]);
  vendorPortList = signal<VendorPort[]>([]);
  performanceData = signal<PerformancePartner[]>([]);
  timestamps = signal<Date[]>([]);
  selectedPortId = signal(0);

  chartOption = signal<EChartsOption>({});

  constructor() {
    effect(() => {
      const clientPort = this.clientPort();
      const vendorPort = this.vendorPort();

      this.resetState();

      if (clientPort) {
        this.performanceAPI.getPerformanceClientBundleList(
          'day',
          false,
          this.toISOStringWithTimezone(this.start),
          this.toISOStringWithTimezone(this.end),
          {
            filter: {
              clientPort: [clientPort!.id!.toString()],
            },
            searchKey: [],
            searchValue: '',
          }
        ).subscribe(result => {
          this.performanceData.set(result);
          this.prepareTimestampList();
          this.updateChart(0, null, null);
          this.dataReady.set(true);

          this.performanceAPI.getPerformanceClientBundleList(
            'day',
            true,
            this.toISOStringWithTimezone(this.start),
            this.toISOStringWithTimezone(this.end),
            {
              filter: {
                clientPort: [clientPort!.id!.toString()],
              },
              searchKey: [],
              searchValue: '',
            }
          ).subscribe(result => {
            const vendorPortIdSet = result.map(item => item.vendorPort).reduce((unique, port) => {
              if (!unique.includes(port)) {
                unique.push(port);
              }
              return unique;
            }, [] as number[]);

            forkJoin([...vendorPortIdSet.map(vendorPortId => this.vendorPortAPI.getVendorPort(vendorPortId))])
            .subscribe(results => {
              this.vendorPortList.set(results);
            });

            this.performanceData.update(performanceData => [...performanceData, ...result]);
          });
        });
      }
      if (vendorPort) {
        this.performanceAPI.getPerformanceClientBundleList(
          'day',
          false,
          this.toISOStringWithTimezone(this.start),
          this.toISOStringWithTimezone(this.end),
          {
            filter: {
              vendorPort: [vendorPort!.id!.toString()],
            },
            searchKey: [],
            searchValue: '',
          }
        ).subscribe(result => {
          this.performanceData.set(result);
          this.prepareTimestampList();
          this.updateChart(0, null, null);
          this.dataReady.set(true);

          this.performanceAPI.getPerformanceClientBundleList(
            'day',
            true,
            this.toISOStringWithTimezone(this.start),
            this.toISOStringWithTimezone(this.end),
            {
              filter: {
                vendorPort: [vendorPort!.id!.toString()],
              },
              searchKey: [],
              searchValue: '',
            }
          ).subscribe(result => {
            const clientPortIdSet = result.map(item => item.clientPort).reduce((unique, port) => {
              if (!unique.includes(port)) {
                unique.push(port);
              }
              return unique;
            }, [] as number[]);

            forkJoin([...clientPortIdSet.map(clientPortId => this.clientPortAPI.getClientPort(clientPortId))])
            .subscribe(results => {
              this.clientPortList.set(results);
            });

            this.performanceData.update(performanceData => [...performanceData, ...result]);
          });
        });
      }
    });
  }

  onChartInit(event: EChartsType) {
    this.echarts = event;

    this.echarts.on('mouseover', 'series.line', (params) => {
      const hoveredDate = params.name as string;
      const hoveredEventName = params.seriesName as string;
      const hoveredEventCode = this.getEventTypeCode(hoveredEventName);

      this.updatePieChart(this.selectedPortId(), hoveredDate, hoveredEventCode);
    });
  }

  private resetState() {
    this.dataReady.set(false);
    this.bundleDataReady.set(false);
    this.clientPortList.set([]);
    this.vendorPortList.set([]);
    this.performanceData.set([]);
    this.timestamps.set([]);
    this.selectedPortId.set(0);
    this.chartOption.set({});
  }

  updateChart(port: number, time: string | null, event: string | null) {
    const performanceData = this.performanceData();
    if (performanceData.length === 0) {
      return;
    }

    let portPerformanceData: PerformancePartner[] = [];
    if (this.clientPort()) {
      portPerformanceData = performanceData.filter(item => item.vendorPort === port);
    }
    if (this.vendorPort()) {
      portPerformanceData = performanceData.filter(item => item.clientPort === port);
    }

    const performanceMap = new Map<string, PerformancePartner>();
    for (const performance of portPerformanceData) {
      const timeStr = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10);
      let existing = performanceMap.get(timeStr)!;
      if (!existing) {
        existing = {
          id: null,
          clientPort: performance.clientPort,
          vendorPort: performance.vendorPort,
          bundle: performance.bundle,
          time: performance.time,
          eventA: 0,
          eventB: 0,
          eventC: 0,
          eventD: 0,
          eventE: 0,
          eventF: 0,
          eventG: 0,
          eventH: 0,
          eventI: 0,
          eventJ: 0,
          eventK: 0,
          eventL: 0,
          eventM: 0,
          eventN: 0,
          eventO: 0,
          eventP: 0,
          general: {},
          impression: 0,
          click: 0,
          income: 0,
          outcomeUpstream: 0,
          outcomeRebate: 0,
          outcomeDownstream: 0,
          offer: 0
        };
      }

      existing.eventA += performance.eventA;
      existing.eventB += performance.eventB;
      existing.eventC += performance.eventC;
      existing.eventD += performance.eventD;
      existing.eventE += performance.eventE;
      existing.eventF += performance.eventF;
      existing.eventG += performance.eventG;
      existing.eventH += performance.eventH;
      existing.eventI += performance.eventI;
      existing.eventJ += performance.eventJ;
      existing.eventK += performance.eventK;
      existing.eventL += performance.eventL;
      existing.eventM += performance.eventM;
      existing.eventN += performance.eventN;
      existing.eventO += performance.eventO;
      existing.eventP += performance.eventP;
      existing.impression += performance.impression;
      existing.click += performance.click;
      existing.income += performance.income;
      existing.outcomeUpstream += performance.outcomeUpstream;
      existing.outcomeRebate += performance.outcomeRebate;
      existing.outcomeDownstream += performance.outcomeDownstream;
      existing.offer += performance.offer;

      for (const [key, value] of Object.entries(performance.general || {})) {
        existing.general[key] = (existing.general[key] || 0) + value;
      }

      performanceMap.set(timeStr, existing);
    }

    const generalEventTypes = new Set<string>();
    portPerformanceData.forEach(performance => {
      if (performance.general) {
        Object.keys(performance.general).forEach(key => generalEventTypes.add(key));
      }
    });

    const eventTypeArray = Array.from(generalEventTypes).sort();

    const timestamps = this.timestamps();
    const header = ['事件类型', ...timestamps.map(ts => this.formatDate(ts))];

    const dataRows = eventTypeArray.map(eventType => {
      const eventName = this.getEventTypeName(eventType);
      const row: (string | number)[] = [eventName];

      timestamps.forEach(timestamp => {
        const dateKey = this.formatDate(timestamp);
        const data = performanceMap.get(dateKey);
        const value = (data && data.general && data.general[eventType]) ? data.general[eventType] : 0;
        row.push(value);
      });

      return row;
    });

    const source = [header, ...dataRows];

    const lineSeries = eventTypeArray.map(() => ({
      type: 'line' as const,
      smooth: true,
      seriesLayoutBy: 'row' as const,
      emphasis: { focus: 'series' as const }
    }));

    const series: SeriesOption[] = [...lineSeries];

    if (eventTypeArray.length > 0) {
      const targetEventType = event || eventTypeArray[0];
      const bundleMap = new Map<string, number>();

      const targetDate = time || (timestamps.length > 0 ? this.formatDate(timestamps[timestamps.length - 1]) : null);

      if (targetDate) {
        portPerformanceData
          .filter(performance => this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10) === targetDate)
          .forEach(performance => {
            if (performance.general && performance.general[targetEventType]) {
              const bundle = performance.bundle || '未知';
              bundleMap.set(bundle, (bundleMap.get(bundle) || 0) + performance.general[targetEventType]);
            }
          });
      }

      if (bundleMap.size > 0) {
        const pieData = Array.from(bundleMap.entries()).map(([name, value]) => ({
          name,
          value
        }));

        series.push({
          type: 'pie' as const,
          id: 'pie',
          name: '',
          radius: '30%',
          center: ['50%', '25%'],
          emphasis: {
            focus: 'self' as const
          },
          label: {
            formatter: '{b}: {c} ({d}%)'
          },
          data: pieData
        });
      }
    }

    this.chartOption.set({
      color: eventTypeArray.map(et => this.eventTypeColors[et]).filter(c => c !== undefined) as string[],
      legend: {
        top: 10,
        selector: false,
        data: eventTypeArray.map(et => this.getEventTypeName(et))
      },
      tooltip: {
        trigger: 'axis'
      },
      dataset: {
        source
      },
      xAxis: {
        type: 'category',
        gridIndex: 0
      },
      yAxis: {
        gridIndex: 0
      },
      grid: {
        left: 80,
        right: 60,
        top: '55%',
        bottom: 60
      },
      series
    });
  }

  updatePieChart(port: number, time: string, event: string) {
    const performanceData = this.performanceData();
    if (!this.echarts || performanceData.length === 0) {
      return;
    }

    let portPerformanceData: PerformancePartner[] = [];
    if (this.clientPort()) {
      portPerformanceData = performanceData.filter(item => item.vendorPort === port);
    }
    if (this.vendorPort()) {
      portPerformanceData = performanceData.filter(item => item.clientPort === port);
    }
    const bundleMap = new Map<string, number>();

    portPerformanceData
      .filter(performance => this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10) === time)
      .forEach(performance => {
        if (performance.general && performance.general[event]) {
          const bundle = performance.bundle || '未知';
          bundleMap.set(bundle, (bundleMap.get(bundle) || 0) + performance.general[event]);
        }
      });

    const pieData = Array.from(bundleMap.entries()).map(([name, value]) => ({
      name,
      value
    }));

    this.echarts.setOption({
      series: [{
        id: 'pie',
        type: 'pie',
        name: '',
        radius: '30%',
        center: ['50%', '25%'],
        emphasis: {
          focus: 'self'
        },
        label: {
          formatter: '{b}: {c} ({d}%)'
        },
        data: pieData.length > 0 ? pieData : []
      }]
    });
  }

  selectPort(portId: number) {
    this.selectedPortId.set(portId);
    this.updateChart(portId, null, null);
  }

  getEventTypeName(eventType: string): string {
    return this.eventTypeNames[eventType] || eventType;
  }

  getEventTypeCode(eventName: string): string {
    const entry = Object.entries(this.eventTypeNames).find(([, name]) => name === eventName);
    return entry ? entry[0] : eventName;
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toISOStringWithTimezone(date: Date) {
    const tzo = date.getTimezoneOffset();
    const dif = tzo < 0 ? '+' : '-';
    const pad = function(num: number) {
      return (num < 10 ? '0' : '') + num;
    }

    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(Math.floor(Math.abs(tzo) / 60)) +
        ':' + pad(Math.abs(tzo) % 60);
  }

  prepareTimestampList() {
    const timestamps: Date[] = [];

    for (let t = this.end.getTime(); t >= this.start.getTime();) {
      const date = new Date(t);
      date.setMilliseconds(0);
      date.setSeconds(0);
      date.setMinutes(0);
      date.setHours(0);

      timestamps.push(date);
      t = date.getTime();
      t = t - 86400000;
    }

    this.timestamps.set(timestamps.reverse());
  }

}
