import { Component, effect, EventEmitter, input, Output, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { ClientPort, ClientPortAPI, Connection, ConnectionAPI, PartnerType, PortType, VendorPort, VendorPortAPI } from '../../../core';
import { ConnectionDialogComponent, ConnectionDialogData } from '../connection-dialog/connection-dialog.component';
import { Router } from '@angular/router';

@Component({
  selector: 'carambola-connection',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.scss'],
})
export class ConnectionComponent {
  private clientPortAPI = inject(ClientPortAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  private connectiontAPI = inject(ConnectionAPI);
  dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  connection: Connection | null = null;
  now = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');

  clientPort = input<ClientPort | null>(null);
  vendorPort = input<VendorPort | null>(null);
  mode = input<string>('vendor');
  readonly = input<boolean>(false);

  clientPortFull: ClientPort | null = null;
  vendorPortFull: VendorPort | null = null;

  @Output() connectionChanged: EventEmitter<Connection | null> = new EventEmitter<Connection | null>();

  constructor() {
    effect(() => {
      const mode = this.mode();
      const clientPort = this.clientPort();
      const vendorPort = this.vendorPort();

      if (mode === 'client') {
        if (clientPort) {
          this.clientPortAPI.getClientPort(clientPort!.id!).subscribe(clientPort => {
            this.clientPortFull = clientPort;
            this.connection = clientPort.connection
              .filter(connection => !connection.deleted)
              .filter(connection => !connection.vendorPort.deleted)
              .find(connection => connection.vendorPort.id === this.vendorPort()!.id) ?? null;
          });
        }
        if (vendorPort) {
          this.vendorPortAPI.getVendorPort(vendorPort!.id!).subscribe(vendorPort => {
            this.vendorPortFull = vendorPort;
          });
        }
      }
      if (mode === 'vendor') {
        if (clientPort) {
          this.clientPortAPI.getClientPort(clientPort.id!).subscribe(clientPort => {
            this.clientPortFull = clientPort;
          });
        }
        if (vendorPort) {
          this.vendorPortAPI.getVendorPort(vendorPort!.id!).subscribe(vendorPort => {
            this.vendorPortFull = vendorPort;
            this.connection = vendorPort.connection
              .filter(connection => !connection.deleted)
              .filter(connection => !connection.clientPort.deleted)
              .find(connection => connection.clientPort.id === this.clientPort()!.id) ?? null;
          });
        }
      }
    });
  }

  pause() {
    if (this.connection && this.connection.id) {
      this.connection.enabled = false;

      this.connectiontAPI.updateConnection(this.connection.id, this.connection).subscribe();
    }
  }

  resume() {
    if (!this.connection || !this.connection.id || !this.connection.clientPort.id) {
      return;
    }

    this.clientPortAPI.getClientPort(this.connection.clientPort.id).subscribe(clientPort => {
      if (clientPort.connection.filter(connection => connection.enabled).length >= 1 && clientPort.mode === PortType.PORT_TYPE_DIRECT) {
        this.snackBar.open('直通模式不允许同时对接多个下游端口，请先停用其它连接', undefined, {
          duration: 3000,
        });
      } else {
        if (this.connection && this.connection.id) {
          this.connection.enabled = true;

          this.connectiontAPI.updateConnection(this.connection.id, this.connection).subscribe();
        }
      }
    });
  }

  remove() {
    if (!this.connection || !this.connection.id) {
      return;
    }

    this.connectiontAPI.removeConnection(this.connection.id).subscribe(() => {
      this.connectionChanged.emit(null);
    });
  }

  create() {
    if (this.mode() === 'client' && !this.clientPort()) {
      return;
    }

    if (this.mode() === 'vendor' && !this.vendorPort()) {
      return;
    }

    const dialogRef = this.dialog.open<ConnectionDialogComponent, ConnectionDialogData, Connection>(ConnectionDialogComponent, {
      data: {
        clientPort: this.clientPort(),
        vendorPort: this.vendorPort(),
        connection: null,
        readonly: false,
      },
      minWidth: '70vw',
      minHeight: '70vh',
      maxWidth: '70vw',
      maxHeight: '70vh',
      width: '70vw',
      height: '70vh',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.connectiontAPI.addConnection(result).subscribe(result => {
          this.connectionChanged.emit(result);
        });
      }
    });
  }

  popup() {
    const dialogRef = this.dialog.open<ConnectionDialogComponent, ConnectionDialogData, Connection>(ConnectionDialogComponent, {
      data: {
        clientPort: this.clientPort(),
        vendorPort: this.vendorPort(),
        connection: this.connection,
        readonly: this.readonly(),
      },
      minWidth: '70vw',
      minHeight: '70vh',
      maxWidth: '70vw',
      maxHeight: '70vh',
      width: '70vw',
      height: '70vh',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.connectiontAPI.updateConnection(result.id!, result).subscribe(() => {
          this.connectionChanged.emit(result);
        });
      }
    });
  }

  pair(partner: string) {
    if (this.mode() === 'client' && partner === 'vendor' && this.vendorPort()) {
      const url = this.router.serializeUrl(this.router.createUrlTree(['admin', 'ad', 'vendorport'], { queryParams: { directMode: this.vendorPortFull!.vendor.mode === PartnerType.PARTNER_TYPE_DIRECT, port: this.vendorPortFull!.id, connection: 'connection' }}));
      window.open(url, '_blank');
    }
    if (this.mode() === 'vendor' && partner === 'client' && this.clientPort()) {
      const url = this.router.serializeUrl(this.router.createUrlTree(['admin', 'ad', 'clientport'], { queryParams: { directMode: this.clientPortFull!.client.mode === PartnerType.PARTNER_TYPE_DIRECT, port: this.clientPortFull!.id, connection: 'connection' }}));
      window.open(url, '_blank');
    }
  }

}
