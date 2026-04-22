import { AfterViewInit, Component, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';

import { ClientPort, ClientPortAPI, Connection, VendorPort, VendorPortAPI } from '../../../../core';
import { AdEntityComponent } from '../../../../shared';

@Component({
  selector: 'carambola-connection-manager',
  imports: [
    MatTableModule,
    AdEntityComponent
  ],
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.scss'],
})
export class ConnectionManagerComponent implements AfterViewInit {
  private clientPortAPI = inject(ClientPortAPI);
  private vendorPortAPI = inject(VendorPortAPI);

  displayedColumns: string[] = ['client', 'vendor'];
  dataSource = new MatTableDataSource<Connection>([]);

  connectionData: Connection[] = [];

  clientPorts: ClientPort[] = [];
  vendorPorts: VendorPort[] = [];
  clientPortMap: Map<number, ClientPort> = new Map<number, ClientPort>();
  vendorPortMap: Map<number, VendorPort> = new Map<number, VendorPort>();

  ngAfterViewInit() {
    forkJoin([
      this.clientPortAPI.getClientPortList(),
      this.vendorPortAPI.getVendorPortList(),
    ]).subscribe(data => {
      this.clientPorts = data[0];
      this.vendorPorts = data[1];

      this.clientPortMap = new Map(this.clientPorts.map(cp => [cp.id!, cp]));
      this.vendorPortMap = new Map(this.vendorPorts.map(vp => [vp.id!, vp]));

      this.connectionData = this.clientPorts.map(clientPort => clientPort.connection).flat();
      this.connectionData = this.connectionData.reduce((unique, item) => {
        return unique.find(x => x.id === item.id) ? unique : [...unique, item];
      }, [] as Connection[]);
      this.connectionData.sort((a, b) => {
        const clientA = a.clientPort?.client?.name ?? '';
        const clientB = b.clientPort?.client?.name ?? '';

        const clientMediaA = a.clientPort?.clientMedia?.name ?? '';
        const clientMediaB = b.clientPort?.clientMedia?.name ?? '';

        const tagIdA = a.clientPort?.tagId ?? '';
        const tagIdB = b.clientPort?.tagId ?? '';

        if (clientA !== clientB) {
          return clientA.localeCompare(clientB);
        }
        if (clientMediaA !== clientMediaB) {
          return clientMediaA.localeCompare(clientMediaB);
        }
        return tagIdA.localeCompare(tagIdB);
      });

      this.dataSource.data = this.connectionData;
    });
  }

}
