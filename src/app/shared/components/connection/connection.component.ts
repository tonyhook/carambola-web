import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { ClientPort, ClientPortAPI, Connection, ConnectionAPI, PartnerType, PortType, VendorPort, VendorPortAPI } from '../../../core';
import { ConnectionDialogComponent, ConnectionDialogData } from '../connection-dialog/connection-dialog.component';

@Component({
  selector: 'carambola-connection',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  connection = signal<Connection | null>(null);
  now = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');

  clientPort = input<ClientPort | null>(null);
  vendorPort = input<VendorPort | null>(null);
  mode = input<string>('vendor');
  readonly = input<boolean>(false);

  clientPortFull = signal<ClientPort | null>(null);
  vendorPortFull = signal<VendorPort | null>(null);

  readonly connectionChanged = output<Connection | null>();

  constructor() {
    effect((onCleanup) => {
      const mode = this.mode();
      const clientPort = this.clientPort();
      const vendorPort = this.vendorPort();
      let active = true;

      this.connection.set(null);
      this.clientPortFull.set(null);
      this.vendorPortFull.set(null);

      if (mode === 'client') {
        if (clientPort) {
          const vendorPortId = vendorPort?.id;
          this.clientPortAPI.getClientPort(clientPort!.id!).subscribe(clientPort => {
            if (!active) {
              return;
            }

            this.clientPortFull.set(clientPort);
            this.connection.set(clientPort.connection
              .filter(connection => !connection.deleted)
              .filter(connection => !connection.vendorPort.deleted)
              .find(connection => connection.vendorPort.id === vendorPortId) ?? null);
          });
        }
        if (vendorPort) {
          this.vendorPortAPI.getVendorPort(vendorPort!.id!).subscribe(vendorPort => {
            if (!active) {
              return;
            }

            this.vendorPortFull.set(vendorPort);
          });
        }
      }
      if (mode === 'vendor') {
        if (clientPort) {
          this.clientPortAPI.getClientPort(clientPort.id!).subscribe(clientPort => {
            if (!active) {
              return;
            }

            this.clientPortFull.set(clientPort);
          });
        }
        if (vendorPort) {
          const clientPortId = clientPort?.id;
          this.vendorPortAPI.getVendorPort(vendorPort!.id!).subscribe(vendorPort => {
            if (!active) {
              return;
            }

            this.vendorPortFull.set(vendorPort);
            this.connection.set(vendorPort.connection
              .filter(connection => !connection.deleted)
              .filter(connection => !connection.clientPort.deleted)
              .find(connection => connection.clientPort.id === clientPortId) ?? null);
          });
        }
      }

      onCleanup(() => {
        active = false;
      });
    });
  }

  pause() {
    const connection = this.connection();
    if (connection && connection.id) {
      connection.enabled = false;
      this.connection.set({...connection});

      this.connectiontAPI.updateConnection(connection.id, connection).subscribe();
    }
  }

  resume() {
    const connection = this.connection();
    if (!connection || !connection.id || !connection.clientPort.id) {
      return;
    }

    this.clientPortAPI.getClientPort(connection.clientPort.id).subscribe(clientPort => {
      if (clientPort.connection.filter(connection => connection.enabled).length >= 1 && clientPort.mode === PortType.PORT_TYPE_DIRECT) {
        this.snackBar.open('直通模式不允许同时对接多个下游端口，请先停用其它连接', undefined, {
          duration: 3000,
        });
      } else {
        const currentConnection = this.connection();
        if (currentConnection && currentConnection.id) {
          currentConnection.enabled = true;
          this.connection.set({...currentConnection});

          this.connectiontAPI.updateConnection(currentConnection.id, currentConnection).subscribe();
        }
      }
    });
  }

  remove() {
    const connection = this.connection();
    if (!connection || !connection.id) {
      return;
    }

    this.connectiontAPI.removeConnection(connection.id).subscribe(() => {
      this.connection.set(null);
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
          this.connection.set(result);
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
        connection: this.connection(),
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
          this.connection.set(result);
          this.connectionChanged.emit(result);
        });
      }
    });
  }

  pair(partner: string) {
    if (this.mode() === 'client' && partner === 'vendor' && this.vendorPort()) {
      const vendorPortFull = this.vendorPortFull();
      if (!vendorPortFull) {
        return;
      }

      const url = this.router.serializeUrl(this.router.createUrlTree(['admin', 'ad', 'vendorport'], { queryParams: { directMode: vendorPortFull.vendor.mode === PartnerType.PARTNER_TYPE_DIRECT, port: vendorPortFull.id, connection: 'connection' }}));
      window.open(url, '_blank');
    }
    if (this.mode() === 'vendor' && partner === 'client' && this.clientPort()) {
      const clientPortFull = this.clientPortFull();
      if (!clientPortFull) {
        return;
      }

      const url = this.router.serializeUrl(this.router.createUrlTree(['admin', 'ad', 'clientport'], { queryParams: { directMode: clientPortFull.client.mode === PartnerType.PARTNER_TYPE_DIRECT, port: clientPortFull.id, connection: 'connection' }}));
      window.open(url, '_blank');
    }
  }

}
