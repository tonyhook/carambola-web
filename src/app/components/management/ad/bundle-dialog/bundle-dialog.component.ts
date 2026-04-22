import { AfterViewInit, Component, effect, signal, ViewChild, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';

import { TenantService } from '../../../../services';
import { Client, ClientAPI, ClientMedia, ClientMediaAPI, ClientPort, ClientPortAPI, PartnerType, PerformanceAPI, PerformancePartner, PerformancePlaceholder, PerformanceView, Query, TrafficControl, TrafficControlAPI, TrafficControlIndicator, TrafficControlPeriod, Vendor, VendorAPI, VendorMedia, VendorMediaAPI, VendorPort, VendorPortAPI } from '../../../../core';
import { AdEntityComponent } from '../../../../shared';

export interface BundleDialogData {
  query: Query<PerformancePlaceholder>,
  interval: string,
  expand: boolean,
  start: Date,
  end: Date,
};

@Component({
  selector: 'carambola-bundle-dialog',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    MatCardModule,
    AdEntityComponent,
  ],
  templateUrl: './bundle-dialog.component.html',
  styleUrls: ['./bundle-dialog.component.scss'],
})
export class BundleDialogComponent implements AfterViewInit {
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  private trafficControlAPI = inject(TrafficControlAPI);
  private performanceAPI = inject(PerformanceAPI);
  private route = inject(ActivatedRoute);
  dialogRef = inject<MatDialogRef<BundleDialogComponent>>(MatDialogRef);

  displayedColumns = ['client', 'vendor', 'bundle', 'request', 'response', 'gfr', 'gfrv', 'impression', 'click', 'er', 'ctr', 'rv', 'actions'];
  dataSource = new MatTableDataSource<PerformanceView>([]);
  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;

  clients: Client[] = [];
  clientMedias: ClientMedia[] = [];
  clientPorts: ClientPort[] = [];
  vendors: Vendor[] = [];
  vendorMedias: VendorMedia[] = [];
  vendorPorts: VendorPort[] = [];

  clientMap: Map<number | null, Client> = new Map<number | null, Client>();
  clientMediaMap: Map<number | null, ClientMedia> = new Map<number | null, ClientMedia>();
  clientPortMap: Map<number | null, ClientPort> = new Map<number | null, ClientPort>();
  vendorMap: Map<number | null, Vendor> = new Map<number | null, Vendor>();
  vendorMediaMap: Map<number | null, VendorMedia> = new Map<number | null, VendorMedia>();
  vendorPortMap: Map<number | null, VendorPort> = new Map<number | null, VendorPort>();

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  direction: WritableSignal<string> = signal('client');

  performanceData: PerformancePartner[] = [];
  performanceViewData: PerformanceView[] = [];
  performanceViewMap: Map<string, PerformanceView> = new Map<string, PerformanceView>();

  trafficControlData: TrafficControl[] = [];
  trafficControlMap: Map<string, TrafficControl> = new Map<string, TrafficControl>();

  fetching = true;
  focus = false;
  dialogData: BundleDialogData;

  constructor() {
    const data = inject<BundleDialogData>(MAT_DIALOG_DATA);

    this.dialogData = data;

    effect(() => {
      const mode = this.mode();
      const tenant = this.tenantService.tenant();

      if (mode === PartnerType.PARTNER_TYPE_UNKNOWN) {
        return;
      }
      if (!tenant) {
        return;
      }

      forkJoin([
        this.clientAPI.getClientList({
          filter: {
            mode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
        this.clientMediaAPI.getClientMediaList({
          filter: {
            clientMode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
        this.clientPortAPI.getClientPortList({
          filter: {
            clientMode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
        this.vendorAPI.getVendorList({
          filter: {
            mode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
        this.vendorMediaAPI.getVendorMediaList({
          filter: {
            vendorMode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
        this.vendorPortAPI.getVendorPortList({
          filter: {
            vendorMode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
      ]).subscribe(results => {
        this.clients = results[0].filter(client => !client.deleted);
        this.clientMedias = results[1].filter(clientMedia => !clientMedia.deleted);
        this.clientPorts = results[2].filter(clientPort => !clientPort.deleted);
        this.vendors = results[3].filter(vendor => !vendor.deleted);
        this.vendorMedias = results[4].filter(vendorMedia => !vendorMedia.deleted);
        this.vendorPorts = results[5].filter(vendorPort => !vendorPort.deleted);

        this.clientMap = new Map(this.clients.map(c => [c.id, c]));
        this.clientMediaMap = new Map(this.clientMedias.map(cm => [cm.id, cm]));
        this.clientPortMap = new Map(this.clientPorts.map(cp => [cp.id, cp]));
        this.vendorMap = new Map(this.vendors.map(v => [v.id, v]));
        this.vendorMediaMap = new Map(this.vendorMedias.map(vm => [vm.id, vm]));
        this.vendorPortMap = new Map(this.vendorPorts.map(vp => [vp.id, vp]));

        if (this.direction() === 'client') {
          this.displayedColumns = ['client', 'vendor', 'bundle', 'request-valid', 'response', 'response-valid', 'gfr', 'gfrv', 'impression', 'click', 'er', 'ctr', 'rv', 'actions'];
        } else {
          this.displayedColumns = ['client', 'vendor', 'bundle', 'request', 'request-valid', 'response', 'gfr', 'gfrv', 'impression', 'click', 'er', 'ctr', 'rv', 'actions'];
        }

        forkJoin([
          this.direction() === 'client' ?
            this.performanceAPI.getPerformanceClientBundleList(
              this.dialogData.interval,
              true,
              this.toISOStringWithTimezone(this.dialogData.start),
              this.toISOStringWithTimezone(this.dialogData.end),
              this.dialogData.query
            )
          :
            this.performanceAPI.getPerformanceVendorBundleList(
              this.dialogData.interval,
              true,
              this.toISOStringWithTimezone(this.dialogData.start),
              this.toISOStringWithTimezone(this.dialogData.end),
              this.dialogData.query
            ),
          this.trafficControlAPI.getTrafficControlList(
            this.dialogData.query
          ),
        ]).subscribe(results => {
          this.performanceData = results[0];
          this.trafficControlData = results[1];

          this.fetching = false;

          this.updatePerformanceView();

          this.fetching = false;
        });
      });
    });
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

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      if (params['directMode']) {
        this.mode.set(params['directMode'] === 'true' ? PartnerType.PARTNER_TYPE_DIRECT : PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      } else {
        this.mode.set(PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      }

      if (params['direction']) {
        this.direction.set(params['direction'] === 'vendor' ? 'vendor' : 'client');
      } else {
        this.direction.set('client');
      }
    });
  }

  updatePerformanceView() {
    this.performanceViewData.length = 0;
    this.performanceViewMap.clear();

    this.trafficControlMap.clear();
    for (const trafficControl of this.trafficControlData) {
      if (trafficControl.bundle) {
        this.trafficControlMap.set(trafficControl.clientPort + '|' + trafficControl.vendorPort + '|' + trafficControl.bundle, trafficControl);
      }
    }

    for (const performance of this.performanceData) {
      let key = '';
      key += 'C' + this.clientPortMap.get(performance.clientPort)?.client.id + '|';
      key += 'CP' + performance.clientPort + '|';
      key += 'V' + this.vendorPortMap.get(performance.vendorPort)?.vendor.id + '|';
      key += 'VP' + performance.vendorPort + '|';
      key += 'B' + performance.bundle;

      if (!this.performanceViewMap.has(key)) {
        const performanceView: PerformanceView = {
          time: '',
          start: new Date(performance.time),
          end: new Date(performance.time),
          client: performance.clientPort === -1 ?
            -1
            :
            this.clientPortMap.get(performance.clientPort)?.client.id ?? 0,
          clientMedia: performance.clientPort === -1 ?
            -1
            :
            this.clientPortMap.get(performance.clientPort)?.clientMedia.id ?? 0,
          clientPort: performance.clientPort,
          vendor: performance.vendorPort === -1 ?
            -1
            :
            this.vendorPortMap.get(performance.vendorPort)?.vendor.id ?? 0,
          vendorMedia: performance.vendorPort === -1 ?
            -1
            :
            this.vendorPortMap.get(performance.vendorPort)?.vendorMedia.id ?? 0,
          vendorPort: performance.vendorPort,
          bundle: performance.bundle,
          request: 0,
          requestv: 0,
          response: 0,
          responsev: 0,
          impression: 0,
          click: 0,
          income: 0,
          outcomeUpstream: 0,
          outcomeRebate: 0,
          outcomeDownstream: 0,
        };

        this.performanceViewData.push(performanceView);
        this.performanceViewMap.set(key, performanceView);
      }

      const performanceView = this.performanceViewMap.get(key)!;
      if (performanceView.start > new Date(performance.time)) {
        performanceView.start = new Date(performance.time);
      }
      if (performanceView.end < new Date(performance.time)) {
        performanceView.end = new Date(performance.time);
      }
      if (this.direction() === 'client') {
        performanceView.request += performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE + performance.eventF + performance.eventK!;
        performanceView.response += performance.eventD + performance.eventE + performance.eventK!;
        performanceView.requestv += performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE + performance.eventF + performance.eventK!;
        performanceView.responsev += performance.eventD + performance.eventE;
      }
      if (this.direction() === 'vendor') {
        performanceView.request += performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE + performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ;
        performanceView.response += performance.eventI + performance.eventJ;
        performanceView.requestv += performance.eventH + performance.eventI + performance.eventJ;
        performanceView.responsev += performance.eventI + performance.eventJ;
      }
      performanceView.impression += performance.impression;
      performanceView.click += performance.click;
      performanceView.income += performance.income;
      performanceView.outcomeUpstream += performance.outcomeUpstream;
      performanceView.outcomeRebate += performance.outcomeRebate;
      performanceView.outcomeDownstream += performance.outcomeDownstream;
    }

    this.dataSource.data = this.performanceViewData.sort((a, b) => {
      const keya = a.clientPort + '|' + a.vendorPort;
      const keyb = b.clientPort + '|' + b.vendorPort;
      return keya > keyb ? -1 : 1;
    });
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'request-valid': return item.requestv ?? -1;
        case 'response-valid': return item.responsev ?? -1;
        case 'gfr': return item.requestv ? (1.0 * (item.response ?? 0) / item.requestv) : -1;
        case 'gfrv': return item.requestv ? (1.0 * (item.responsev ?? 0) / item.requestv) : -1;
        case 'er': return item.response ? (1.0 * (item.impression ?? 0) / item.response) : -1;
        case 'ctr': return item.impression ? (1.0 * (item.click ?? 0) / item.impression) : -1;
        case 'rv': return item.requestv ? (1.0 * (item.income ?? 0) / item.requestv / 10) : -1;
        case 'client': return item.clientPort ? this.getClientPortName(item.clientPort) : '';
        case 'vendor': return item.vendorPort ? this.getVendorPortName(item.vendorPort) : '';
        default: {
          const value = item[property as keyof typeof item];
          if (typeof value === 'number') {
            return value;
          } else {
            return value ? value.toString() : '';
          }
        }
      }
    };
    this.dataSource.filterPredicate = function (item, filter) {
      if (item.bundle) {
        return item.bundle.toLowerCase().includes(filter);
      } else {
        return false;
      }
    };
  }

  applyFilter(event: KeyboardEvent) {
    let filterValue = (event.target as HTMLInputElement).value;
    filterValue = filterValue.trim();
    filterValue = filterValue.toLowerCase();
    this.dataSource.filter = filterValue;
  }

  removeQps(clientPort: number, vendorPort: number, bundle: string) {
    const trafficControl = this.trafficControlMap.get(clientPort + '|' + vendorPort + '|' + bundle);
    if (trafficControl && trafficControl.id) {
      this.trafficControlAPI.removeTrafficControl(trafficControl.id).subscribe(() => {
        this.trafficControlMap.delete(clientPort + '|' + vendorPort + '|' + bundle);
      });
    }
  }

  updateQps(clientPort: number, vendorPort: number, bundle: string, qps: number) {
    const trafficControl = this.trafficControlMap.get(clientPort + '|' + vendorPort + '|' + bundle);
    if (trafficControl && trafficControl.id) {
      trafficControl.limitation = qps;

      this.trafficControlAPI.updateTrafficControl(trafficControl.id, trafficControl).subscribe(() => {
        this.trafficControlMap.set(clientPort + '|' + vendorPort + '|' + bundle, trafficControl);
      });
    } else {
      const trafficControl: TrafficControl = {
        id: null,
        clientPort: clientPort,
        vendorPort: vendorPort,
        bundle: bundle,
        indicator: TrafficControlIndicator.TC_INDICATOR_REQUEST,
        period: TrafficControlPeriod.TC_PERIOD_SECOND,
        limitation: qps,
      };

      this.trafficControlAPI.addTrafficControl(trafficControl).subscribe(trafficControl => {
        this.trafficControlMap.set(clientPort + '|' + vendorPort + '|' + bundle, trafficControl);
      });
    }
  }

  getQps(clientPort: number, vendorPort: number, bundle: string) {
    const trafficControl = this.trafficControlMap.get(clientPort + '|' + vendorPort + '|' + bundle);
    if (trafficControl && trafficControl.id) {
      return trafficControl.limitation;
    } else {
      return null;
    }
  }

  setQps(event: Event, clientPort: number, vendorPort: number, bundle: string) {
    if (event instanceof KeyboardEvent && event.key === 'Enter' || event instanceof FocusEvent && this.focus) {
      if (this.trafficControlMap.has(clientPort + '|' + vendorPort + '|' + bundle)) {
        const trafficControl = this.trafficControlMap.get(clientPort + '|' + vendorPort + '|' + bundle);
        if (trafficControl && (event.target as HTMLInputElement).value.length > 0 && +(event.target as HTMLInputElement).value === trafficControl.limitation) {
          (event.target as HTMLInputElement).blur();
          return;
        }
        if (!trafficControl && (event.target as HTMLInputElement).value.length === 0) {
          (event.target as HTMLInputElement).blur();
          return;
        }
      }

      if ((event.target as HTMLInputElement).value.length === 0) {
        this.removeQps(clientPort, vendorPort, bundle);
      } else {
        const qps = +(event.target as HTMLInputElement).value;
        if (qps >= 0) {
          this.updateQps(clientPort, vendorPort, bundle, qps);
        } else {
          (event.target as HTMLInputElement).value = '';
          this.removeQps(clientPort, vendorPort, bundle);
        }
      }

      this.focus = false;
      (event.target as HTMLInputElement).blur();
    }
  }

  getFocus() {
    this.focus = true;
  }

  download() {
    if (this.direction() === 'client') {
      this.performanceAPI.downloadPerformanceClientBundleList(
        this.dialogData.interval,
        this.toISOStringWithTimezone(this.dialogData.start),
        this.toISOStringWithTimezone(this.dialogData.end),
        this.dialogData.query
      ).subscribe(data => {
        const contentType = 'application/vnd.ms-excel';
        const blob = new Blob([data], { type: contentType });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'bundle-client.xlsx';
        a.click();

        window.URL.revokeObjectURL(url);
      });
    } else {
      this.performanceAPI.downloadPerformanceVendorBundleList(
        this.dialogData.interval,
        this.toISOStringWithTimezone(this.dialogData.start),
        this.toISOStringWithTimezone(this.dialogData.end),
        this.dialogData.query
      ).subscribe(data => {
        const contentType = 'application/vnd.ms-excel';
        const blob = new Blob([data], { type: contentType });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'bundle-client.xlsx';
        a.click();

        window.URL.revokeObjectURL(url);
      });
    }
  }

  getClientPortName(id: number) {
    const clientPort = this.clientPorts.find(clientPort => clientPort.id === id);
    if (clientPort) {
      return clientPort.name;
    } else {
      return '';
    }
  }

  getVendorPortName(id: number) {
    const vendorPort = this.vendorPorts.find(vendorPort => vendorPort.id === id);
    if (vendorPort) {
      return vendorPort.name;
    } else {
      return '';
    }
  }

}
