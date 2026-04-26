import { Component, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { Server, ServerAPI } from '../../../../core';
import { ServerDialogComponent } from '../server-dialog/server-dialog.component';

@Component({
  selector: 'carambola-server-manager',
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSort,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './server.component.html',
  styleUrls: ['./server.component.scss'],
})
export class ServerManagerComponent implements OnInit, OnDestroy {
  private dialog = inject(MatDialog);
  private serverAPI = inject(ServerAPI);

  displayedColumns: string[] = ['status', 'node', 'domain', 'servingTimestamp', 'trackingTimestamp', 'serverAction', 'servingAction', 'trackingAction', 'actions'];
  hoverRow: Server | null = null;

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  dataSource = new MatTableDataSource<Server>([]);
  refresher: ReturnType<typeof setInterval> | null = null;
  status = signal<Record<number, number>>({});

  ngOnInit() {
    this.query();

    this.refresher = setInterval(() => {
      this.serverAPI.getServerStatus().subscribe(data => {
        this.status.set(data);
      });
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refresher) {
      clearInterval(this.refresher);
    }
  }

  query() {
    this.serverAPI.getServerList().subscribe(servers => {
      this.dataSource.data = servers.sort((a, b) => {
        const keya = a.node;
        const keyb = b.node;
        if (keya < keyb) {
          return -1;
        } else if (keya > keyb) {
          return 1;
        }
        return 0;
      });
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });
  }

  mouseenter(row: Server) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  newServer() {
    const dialogRef = this.dialog.open<ServerDialogComponent, Server>(ServerDialogComponent, {
      data: null,
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
      width: '80vw',
      height: '80vh',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  modifyServer(server: Server) {
    const dialogRef = this.dialog.open<ServerDialogComponent, Server>(ServerDialogComponent, {
      data: server,
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  getStatus(node: number): number {
    const status = this.status();
    if (status[node] === undefined) {
      return -1;
    }
    return status[node];
  }

  service(row: Server, service: string, action: string) {
    const server: Server = row;

    if (server.id) {
      this.serverAPI.service(server.id, service, action).subscribe(() => {
        this.serverAPI.getServerList().subscribe(servers => {
          this.dataSource.data = servers.sort((a, b) => {
            const keya = a.node;
            const keyb = b.node;
            if (keya < keyb) {
              return -1;
            } else if (keya > keyb) {
              return 1;
            }
            return 0;
          });
        });
      });
    }
  }

}
