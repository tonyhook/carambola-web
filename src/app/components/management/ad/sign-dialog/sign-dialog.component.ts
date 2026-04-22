import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { BillView, Client, ClientAPI, ClientPort, ClientPortAPI, Medium, PartnerType, PerformancePartner, Sign, SignStatus, Vendor, VendorAPI, VendorPort, VendorPortAPI } from '../../../../core';
import { AdEntityComponent } from '../../../../shared/components/ad-entity/ad-entity.component';
import { forkJoin } from 'rxjs';

export interface SignDialogData {
  vendor: Vendor;
  vendorPort: VendorPort;
  date: Date;
  action: string;
  mode: string;
  signs: Sign[],
  mediums: Medium[],
  performances: PerformancePartner[];
}

@Component({
  selector: 'carambola-sign-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    AdEntityComponent
  ],
  templateUrl: './sign-dialog.component.html',
  styleUrls: ['./sign-dialog.component.scss'],
})
export class SignDialogComponent {
  private formBuilder = inject(UntypedFormBuilder);
  private clientAPI = inject(ClientAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private vendorAPI = inject(VendorAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  dialogRef = inject<MatDialogRef<SignDialogComponent>>(MatDialogRef);
  data = inject<SignDialogData>(MAT_DIALOG_DATA);

  PartnerType = PartnerType;

  displayedColumns: string[] = [];

  vendor: Vendor;
  vendorPort: VendorPort;
  date: Date;
  action: string;
  mode: string;
  signs: Sign[];
  mediums: Medium[];
  performances: PerformancePartner[];

  clients: Client[] = [];
  clientPorts: ClientPort[] = [];
  clientMap: Map<number | null, Client> = new Map<number | null, Client>();
  clientPortMap: Map<number | null, ClientPort> = new Map<number | null, ClientPort>();
  vendors: Vendor[] = [];
  vendorPorts: VendorPort[] = [];
  vendorMap: Map<number | null, Vendor> = new Map<number | null, Vendor>();
  vendorPortMap: Map<number | null, VendorPort> = new Map<number | null, VendorPort>();

  formGroupRatio: UntypedFormGroup;
  requestRatio = 1;
  responseRatio = 1;
  impressionRatio = 1;
  clickRatio = 1;
  costRatio = 1;
  formGroupLevel: UntypedFormGroup;
  levelTop = 0.965;
  levelMiddle = 0.9675;
  levelBottom = 0.968;

  signViews: BillView[] = [];
  signViewOriginal: BillView = {
    time: '',
    start: new Date(),
    end: new Date(),
    client: 0,
    vendor: 0,
    clientMedia: 0,
    vendorMedia: 0,
    clientPort: 0,
    vendorPort: 0,
    request: null,
    response: null,
    impression: null,
    click: null,
    cost: null,
    status: -1,
    closed: 0,
    total: 0,
  };
  signViewOriginals: BillView[] = [];
  signViewMediumTotal: BillView = {
    time: '',
    start: new Date(),
    end: new Date(),
    client: 0,
    vendor: 0,
    clientMedia: 0,
    vendorMedia: 0,
    clientPort: 0,
    vendorPort: 0,
    request: null,
    response: null,
    impression: null,
    click: null,
    cost: null,
    status: -1,
    closed: 0,
    total: 0,
  };
  signViewPerformanceTotal: BillView = {
    time: '',
    start: new Date(),
    end: new Date(),
    client: 0,
    vendor: 0,
    clientMedia: 0,
    vendorMedia: 0,
    clientPort: 0,
    vendorPort: 0,
    request: null,
    response: null,
    impression: null,
    click: null,
    cost: null,
    status: -1,
    closed: 0,
    total: 0,
  };

  @ViewChild('table', {static: false}) table: ElementRef | null = null;
  dataSource = new MatTableDataSource<BillView>([]);

  constructor() {
    const data = this.data;

    this.vendor = data.vendor;
    this.vendorPort = data.vendorPort;
    this.date = data.date;
    this.action = data.action;
    this.mode = data.mode;
    this.signs = data.signs;
    this.mediums = data.mediums;
    this.performances = data.performances;

    this.formGroupRatio = this.formBuilder.group({
      'request': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
      'response': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
      'impression': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
      'click': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
      'cost': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
    });
    this.formGroupLevel = this.formBuilder.group({
      'top': [96.5, Validators.required],
      'middle': [96.75, Validators.required],
      'bottom': [96.8, Validators.required],
    });

    forkJoin([
      this.clientAPI.getClientList({
        filter: {
          mode: [this.mode],
        },
        searchKey: [],
        searchValue: '',
      }),
      this.vendorAPI.getVendorList({
        filter: {
          mode: [this.mode],
        },
        searchKey: [],
        searchValue: '',
      }),
      this.clientPortAPI.getClientPortList({
        filter: {
          clientMode: [this.mode],
        },
        searchKey: [],
        searchValue: '',
      }),
      this.vendorPortAPI.getVendorPortList({
        filter: {
          vendorMode: [this.mode],
        },
        searchKey: [],
        searchValue: '',
      }),
    ]).subscribe(results => {
      this.clients = results[0].filter(client => !client.deleted);
      this.vendors = results[1].filter(client => !client.deleted);
      this.clientPorts = results[2].filter(clientPort => !clientPort.deleted);
      this.vendorPorts = results[3].filter(clientPort => !clientPort.deleted);

      this.clientMap = new Map(this.clients.map(c => [c.id, c]));
      this.clientPortMap = new Map(this.clientPorts.map(cp => [cp.id, cp]));
      this.vendorMap = new Map(this.vendors.map(v => [v.id, v]));
      this.vendorPortMap = new Map(this.vendorPorts.map(vp => [vp.id, vp]));

      this.prepare();
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

  prepare() {
    if (this.action === 'create' || this.action === 'edit') {
      this.displayedColumns = ['partner', 'cost', 'impression', 'click', 'request', 'response'];
      this.signViews = [];

      if (this.signs.length > 0) {
        const signView: BillView = {
          time: '',
          start: new Date(),
          end: new Date(),
          client: 0,
          vendor: 0,
          clientMedia: 0,
          vendorMedia: 0,
          clientPort: 0,
          vendorPort: this.vendorPort.id!,
          request: this.signs[0].request,
          response: this.signs[0].response,
          impression: this.signs[0].impression,
          click: this.signs[0].click,
          cost: this.signs[0].cost,
          status: this.signs[0].status,
          closed: 0,
          total: 0,
        };

        this.signViews.push(signView);
      }

      this.signViewOriginal = {
        time: '',
        start: new Date(),
        end: new Date(),
        client: 0,
        vendor: 0,
        clientMedia: 0,
        vendorMedia: 0,
        clientPort: 0,
        vendorPort: 0,
        request: null,
        response: null,
        impression: null,
        click: null,
        cost: null,
        status: SignStatus.SIGN_STATUS_IGNORE,
        closed: 0,
        total: 0,
      };
      const signViewOriginalClient: number[] = [];

      this.signViewMediumTotal = {
        time: '',
        start: new Date(),
        end: new Date(),
        client: 0,
        vendor: 0,
        clientMedia: 0,
        vendorMedia: 0,
        clientPort: 0,
        vendorPort: 0,
        request: null,
        response: null,
        impression: null,
        click: null,
        cost: null,
        status: -2,
        closed: 0,
        total: 0,
      };
      for (const medium of this.mediums) {
        const signView: BillView = {
          time: '',
          start: new Date(),
          end: new Date(),
          client: 0,
          vendor: 0,
          clientMedia: 0,
          vendorMedia: 0,
          clientPort: medium.clientPort,
          vendorPort: this.vendorPort.id!,
          request: medium.request,
          response: medium.response,
          impression: medium.impression,
          click: medium.click,
          cost: medium.outcomeDownstream,
          status: -1,
          closed: 0,
          total: 0,
        };

        this.signViews.push(signView);

        if (medium.request !== null) {
          this.signViewMediumTotal.request = this.signViewMediumTotal.request === null ? medium.request : this.signViewMediumTotal.request + medium.request;
        }
        if (medium.response !== null) {
          this.signViewMediumTotal.response = this.signViewMediumTotal.response === null ? medium.response : this.signViewMediumTotal.response + medium.response;
        }
        if (medium.impression !== null) {
          this.signViewMediumTotal.impression = this.signViewMediumTotal.impression === null ? medium.impression : this.signViewMediumTotal.impression + medium.impression;
        }
        if (medium.click !== null) {
          this.signViewMediumTotal.click = this.signViewMediumTotal.click === null ? medium.click : this.signViewMediumTotal.click + medium.click;
        }
        if (medium.outcomeDownstream !== null) {
          this.signViewMediumTotal.cost = this.signViewMediumTotal.cost === null ? medium.outcomeDownstream : this.signViewMediumTotal.cost + medium.outcomeDownstream;
        }

        if (medium.request !== null) {
          this.signViewOriginal.request = this.signViewOriginal.request === null ? medium.request : this.signViewOriginal.request + medium.request;
        }
        if (medium.response !== null) {
          this.signViewOriginal.response = this.signViewOriginal.response === null ? medium.response : this.signViewOriginal.response + medium.response;
        }
        if (medium.impression !== null) {
          this.signViewOriginal.impression = this.signViewOriginal.impression === null ? medium.impression : this.signViewOriginal.impression + medium.impression;
        }
        if (medium.click !== null) {
          this.signViewOriginal.click = this.signViewOriginal.click === null ? medium.click : this.signViewOriginal.click + medium.click;
        }
        if (medium.outcomeDownstream !== null) {
          this.signViewOriginal.cost = this.signViewOriginal.cost === null ? medium.outcomeDownstream : this.signViewOriginal.cost + medium.outcomeDownstream;
        }

        signViewOriginalClient.push(medium.clientPort);
      }

      this.signViews.push(this.signViewMediumTotal);

      this.signViewPerformanceTotal = {
        time: '',
        start: new Date(),
        end: new Date(),
        client: 0,
        vendor: 0,
        clientMedia: 0,
        vendorMedia: 0,
        clientPort: 0,
        vendorPort: 0,
        request: null,
        response: null,
        impression: null,
        click: null,
        cost: null,
        status: -4,
        closed: 0,
        total: 0,
      };
      let signViewPerformanceNoResponse: BillView | null = null;
      for (const performance of this.performances) {
        const signView: BillView = {
          time: '',
          start: new Date(),
          end: new Date(),
          client: 0,
          vendor: 0,
          clientMedia: 0,
          vendorMedia: 0,
          clientPort: performance.clientPort,
          vendorPort: this.vendorPort.id!,
          request: performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE + performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ,
          response: performance.eventI + performance.eventJ,
          impression: performance.impression,
          click: performance.click,
          cost: performance.outcomeDownstream,
          status: -3,
          closed: 0,
          total: 0,
        };

        if (performance.clientPort === -1) {
          signViewPerformanceNoResponse = signView;
        } else {
          this.signViews.push(signView);
        }

        if (signView.request !== null) {
          this.signViewPerformanceTotal.request = this.signViewPerformanceTotal.request === null ? signView.request : this.signViewPerformanceTotal.request + signView.request;
        }
        if (signView.response !== null) {
          this.signViewPerformanceTotal.response = this.signViewPerformanceTotal.response === null ? signView.response : this.signViewPerformanceTotal.response + signView.response;
        }
        if (signView.impression !== null) {
          this.signViewPerformanceTotal.impression = this.signViewPerformanceTotal.impression === null ? signView.impression : this.signViewPerformanceTotal.impression + signView.impression;
        }
        if (signView.click !== null) {
          this.signViewPerformanceTotal.click = this.signViewPerformanceTotal.click === null ? signView.click : this.signViewPerformanceTotal.click + signView.click;
        }
        if (signView.cost !== null) {
          this.signViewPerformanceTotal.cost = this.signViewPerformanceTotal.cost === null ? signView.cost : this.signViewPerformanceTotal.cost + signView.cost;
        }

        if (performance.clientPort > 0 || this.mediums.length === 0) {
          if (signView.request !== null) {
            if (signViewOriginalClient.indexOf(performance.clientPort) < 0 || this.signViewOriginal.request === null) {
              this.signViewOriginal.request = this.signViewOriginal.request === null ? signView.request : this.signViewOriginal.request + signView.request;
            }
          }
          if (signView.response !== null) {
            if (signViewOriginalClient.indexOf(performance.clientPort) < 0 || this.signViewOriginal.response === null) {
              this.signViewOriginal.response = this.signViewOriginal.response === null ? signView.response : this.signViewOriginal.response + signView.response;
            }
          }
          if (signView.impression !== null) {
            if (signViewOriginalClient.indexOf(performance.clientPort) < 0 || this.signViewOriginal.impression === null) {
              this.signViewOriginal.impression = this.signViewOriginal.impression === null ? signView.impression : this.signViewOriginal.impression + signView.impression;
            }
          }
          if (signView.click !== null) {
            if (signViewOriginalClient.indexOf(performance.clientPort) < 0 || this.signViewOriginal.click === null) {
              this.signViewOriginal.click = this.signViewOriginal.click === null ? signView.click : this.signViewOriginal.click + signView.click;
            }
          }
          if (signView.cost !== null) {
            if (signViewOriginalClient.indexOf(performance.clientPort) < 0 || this.signViewOriginal.cost === null) {
              this.signViewOriginal.cost = this.signViewOriginal.cost === null ? signView.cost : this.signViewOriginal.cost + signView.cost;
            }
          }
        }
      }

      if (signViewPerformanceNoResponse !== null) {
        this.signViews.push(signViewPerformanceNoResponse);
      }
      if (this.mode === String(PartnerType.PARTNER_TYPE_PROGRAMMATIC)) {
        this.signViews.push(this.signViewPerformanceTotal);
      }

      // amend null field from performance (only when status is SIGN_STATUS_READY)
      if (this.signs.length > 0 && this.performances.length > 0 && this.signs[0].status === SignStatus.SIGN_STATUS_READY) {
        if (this.signViews[0].request === null) {
          this.signViews[0].request = this.signViewPerformanceTotal.request;
        }
        if (this.signViews[0].response === null) {
          this.signViews[0].response = this.signViewPerformanceTotal.response;
        }
        if (this.signViews[0].impression === null) {
          this.signViews[0].impression = this.signViewPerformanceTotal.impression;
        }
        if (this.signViews[0].click === null) {
          this.signViews[0].click = this.signViewPerformanceTotal.click;
        }
        if (this.signViews[0].cost === null) {
          this.signViews[0].cost = this.signViewPerformanceTotal.cost;
        }
      }

      // insert signView on the top of the table (only when status is SIGN_STATUS_PENDING)
      if (this.signs.length === 0 && this.performances.length > 0) {
        const signView: BillView = {
          time: '',
          start: new Date(),
          end: new Date(),
          client: 0,
          vendor: 0,
          clientMedia: 0,
          vendorMedia: 0,
          clientPort: 0,
          vendorPort: this.vendorPort.id!,
          request: this.signViewOriginal.request,
          response: this.signViewOriginal.response,
          impression: this.signViewOriginal.impression,
          click: this.signViewOriginal.click,
          cost: this.signViewOriginal.cost,
          status: SignStatus.SIGN_STATUS_CREATED,
          closed: 0,
          total: 0,
        };

        this.signViews.splice(0, 0, signView);
      }

      this.dataSource.data = this.signViews;

      this.requestRatio = Math.min(this.signViews[0].request! / this.signViewOriginal.request!, 1);
      this.responseRatio = Math.min(this.signViews[0].response! / this.signViewOriginal.response!, 1);
      this.impressionRatio = Math.min(this.signViews[0].impression! / this.signViewOriginal.impression!, 1);
      this.clickRatio = Math.min(this.signViews[0].click! / this.signViewOriginal.click!, 1);
      this.costRatio = Math.min(this.signViews[0].cost! / this.signViewOriginal.cost!, 1);

      this.signViews[0].request = Math.round(this.signViewOriginal.request! * this.requestRatio);
      this.signViews[0].response = Math.round(this.signViewOriginal.response! * this.responseRatio);
      this.signViews[0].impression = Math.round(this.signViewOriginal.impression! * this.impressionRatio);
      this.signViews[0].click = Math.round(this.signViewOriginal.click! * this.clickRatio);
      this.signViews[0].cost = Math.round(this.signViewOriginal.cost! * this.costRatio);

      this.formGroupRatio = this.formBuilder.group({
        'request': [Math.round((1 - this.requestRatio) * 10000) / 100, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
        'response': [Math.round((1 - this.responseRatio) * 10000) / 100, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
        'impression': [Math.round((1 - this.impressionRatio) * 10000) / 100, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
        'click': [Math.round((1 - this.clickRatio) * 10000) / 100, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
        'cost': [Math.round((1 - this.costRatio) * 10000) / 100, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
      });
      this.formGroupRatio.valueChanges.subscribe(() => {
        this.requestRatio = 1 - this.formGroupRatio.value.request / 100;
        this.responseRatio = 1 - this.formGroupRatio.value.response / 100;
        this.impressionRatio = 1 - this.formGroupRatio.value.impression / 100;
        this.clickRatio = 1 - this.formGroupRatio.value.click / 100;
        this.costRatio = 1 - this.formGroupRatio.value.cost / 100;

        this.signViews[0].request = Math.round(this.signViewOriginal.request! * this.requestRatio);
        this.signViews[0].response = Math.round(this.signViewOriginal.response! * this.responseRatio);
        this.signViews[0].impression = Math.round(this.signViewOriginal.impression! * this.impressionRatio);
        this.signViews[0].click = Math.round(this.signViewOriginal.click! * this.clickRatio);
        this.signViews[0].cost = Math.round(this.signViewOriginal.cost! * this.costRatio);
      });
    }

    if (this.action === 'stage' && this.mode === String(PartnerType.PARTNER_TYPE_DIRECT)) {
      this.displayedColumns = ['level', 'partner', 'cost', 'impression', 'click', 'request', 'response'];
      this.signViews = [];

      if (this.signs.length > 0) {
        for (const sign of this.signs) {
          const signView: BillView = {
            time: '',
            start: new Date(sign.date),
            end: new Date(sign.date),
            client: 0,
            vendor: 0,
            clientMedia: 0,
            vendorMedia: 0,
            clientPort: 0,
            vendorPort: sign.vendorPort,
            request: sign.request,
            response: sign.response,
            impression: sign.impression,
            click: sign.click,
            cost: sign.cost,
            status: sign.status,
            closed: 0,
            total: 0,
          };

          this.signViews.push(signView);
        }
      }

      this.dataSource.data = this.signViews.sort((a, b) => {
        const keya = a.cost;
        const keyb = b.cost;
        return (keyb ?? 0) - (keya ?? 0);
      });

      this.formGroupLevel = this.formBuilder.group({
        'top': [96.5, Validators.required],
        'middle': [96.75, Validators.required],
        'bottom': [96.8, Validators.required],
      });
    }

    if (this.action === 'stage' && this.mode === String(PartnerType.PARTNER_TYPE_PROGRAMMATIC)) {
      this.displayedColumns = ['partner', 'cost', 'impression', 'click', 'request', 'response'];
      this.signViews = [];
      this.signViewOriginals = [];

      const signViewOriginalClient: number[][] = [];

      if (this.signs.length > 0) {
        for (const [index, sign] of this.signs.entries()) {
          const signView: BillView = {
            time: '',
            start: new Date(sign.date),
            end: new Date(sign.date),
            client: 0,
            vendor: 0,
            clientMedia: 0,
            vendorMedia: 0,
            clientPort: 0,
            vendorPort: sign.vendorPort,
            request: sign.request,
            response: sign.response,
            impression: sign.impression,
            click: sign.click,
            cost: sign.cost,
            status: sign.status,
            closed: 0,
            total: 0,
          };

          this.signViews.push(signView);

          const signViewOriginal: BillView = {
            time: '',
            start: new Date(sign.date),
            end: new Date(sign.date),
            client: 0,
            vendor: 0,
            clientMedia: 0,
            vendorMedia: 0,
            clientPort: 0,
            vendorPort: sign.vendorPort,
            request: sign.request,
            response: sign.response,
            impression: sign.impression,
            click: sign.click,
            cost: sign.cost,
            status: sign.status,
            closed: 0,
            total: 0,
          };
          this.signViewOriginals.push(signViewOriginal);

          signViewOriginalClient.push([]);

          for (const medium of this.mediums) {
            if (medium.vendorPort !== signView.vendorPort) {
              continue;
            }

            signViewOriginalClient[index].push(medium.clientPort);
          }

          for (const performance of this.performances) {
            if (performance.vendorPort !== signView.vendorPort) {
              continue;
            }

            if (signViewOriginalClient[index].indexOf(performance.clientPort) < 0 || signView.request === null) {
              this.signViewOriginals[index].request = this.signViewOriginals[index].request === null ? performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE + performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ : this.signViewOriginals[index].request + performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE + performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ;
            }
            if (signViewOriginalClient[index].indexOf(performance.clientPort) < 0 || signView.response === null) {
              this.signViewOriginals[index].response = this.signViewOriginals[index].response === null ? performance.eventI + performance.eventJ : this.signViewOriginals[index].response + performance.eventI + performance.eventJ;
            }
            if (signViewOriginalClient[index].indexOf(performance.clientPort) < 0 || signView.impression === null) {
              this.signViewOriginals[index].impression = this.signViewOriginals[index].impression === null ? performance.impression : this.signViewOriginals[index].impression + performance.impression;
            }
            if (signViewOriginalClient[index].indexOf(performance.clientPort) < 0 || signView.click === null) {
              this.signViewOriginals[index].click = this.signViewOriginals[index].click === null ? performance.click : this.signViewOriginals[index].click + performance.click;
            }
            if (signViewOriginalClient[index].indexOf(performance.clientPort) < 0 || signView.cost === null) {
              this.signViewOriginals[index].cost = this.signViewOriginals[index].cost === null ? performance.outcomeDownstream : this.signViewOriginals[index].cost + performance.outcomeDownstream;
            }
          }

          // amend null field from performance (only when status is SIGN_STATUS_READY)
          if (this.performances.length > 0 && sign.status === SignStatus.SIGN_STATUS_READY) {
            if (signView.request === null) {
              signView.request = this.signViewOriginals[index].request;
            }
            if (signView.response === null) {
              signView.response = this.signViewOriginals[index].response;
            }
            if (signView.impression === null) {
              signView.impression = this.signViewOriginals[index].impression;
            }
            if (signView.click === null) {
              signView.click = this.signViewOriginals[index].click;
            }
            if (signView.cost === null) {
              signView.cost = this.signViewOriginals[index].cost;
            }
          }
        }
      }

      this.dataSource.data = this.signViews;

      this.formGroupRatio = this.formBuilder.group({
        'request': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
        'response': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
        'impression': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
        'click': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
        'cost': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
      });
      this.formGroupRatio.valueChanges.subscribe(() => {
        this.requestRatio = 1 - this.formGroupRatio.value.request / 100;
        this.responseRatio = 1 - this.formGroupRatio.value.response / 100;
        this.impressionRatio = 1 - this.formGroupRatio.value.impression / 100;
        this.clickRatio = 1 - this.formGroupRatio.value.click / 100;
        this.costRatio = 1 - this.formGroupRatio.value.cost / 100;
      });
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    if (!this.formGroupRatio.valid) {
      this.formGroupRatio.markAllAsTouched();
      return;
    }

    const signs: Sign[] = [];

    if (this.action === 'create' || this.action === 'edit') {
      const sign: Sign = {
        date: this.toISOStringWithTimezone(this.date),
        tagId: this.vendorPort.tagId,
        vendorPort: this.vendorPort.id!,
        request: Math.round(this.signViewOriginal.request! * this.requestRatio),
        response: Math.round(this.signViewOriginal.response! * this.responseRatio),
        impression: Math.round(this.signViewOriginal.impression! * this.impressionRatio),
        click: Math.round(this.signViewOriginal.click! * this.clickRatio),
        cost: Math.round(this.signViewOriginal.cost! * this.costRatio),
        status: this.signViews[0].status === SignStatus.SIGN_STATUS_READY ? SignStatus.SIGN_STATUS_CREATED : this.signViews[0].status,
      };

      signs.push(sign);
    }

    if (this.action === 'stage' && this.mode === String(PartnerType.PARTNER_TYPE_DIRECT)) {
      for (const [index, signView] of this.signViews.entries()) {
        const rank = index / this.signViews.length;
        let ratio = 1;
        if (rank >= 0.666) {
          ratio = this.levelBottom;
        } else if (rank >= 0.333) {
          ratio = this.levelMiddle;
        } else {
          ratio = this.levelTop;
        }
        const sign: Sign = {
          date: this.toISOStringWithTimezone(signView.start),
          tagId: this.vendorPortMap.get(signView.vendorPort)!.tagId,
          vendorPort: signView.vendorPort,
          request: signView.request,
          response: signView.response,
          impression: signView.impression!,
          click: signView.click,
          cost: Math.round(signView.cost! * ratio),
          status: signView.status,
        };

        signs.push(sign);
      }
    }

    if (this.action === 'stage' && this.mode === String(PartnerType.PARTNER_TYPE_PROGRAMMATIC)) {
      for (const signView of this.signViews) {
        const sign: Sign = {
          date: this.toISOStringWithTimezone(signView.start),
          tagId: this.vendorPortMap.get(signView.vendorPort)!.tagId,
          vendorPort: signView.vendorPort,
          request: Math.round(signView.request! * this.requestRatio),
          response: Math.round(signView.response! * this.responseRatio),
          impression: Math.round(signView.impression! * this.impressionRatio),
          click: Math.round(signView.click! * this.clickRatio),
          cost: Math.round(signView.cost! * this.costRatio),
          status: signView.status,
        };

        signs.push(sign);
      }
    }

    this.dialogRef.close(signs);
  }

}
