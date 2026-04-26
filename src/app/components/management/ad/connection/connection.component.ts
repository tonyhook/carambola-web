import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';

import { ClientPort, ClientPortAPI, Connection, VendorPort, VendorPortAPI } from '../../../../core';
import { AdEntityComponent } from '../../../../shared';

@Component({
  selector: 'carambola-connection-manager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    AdEntityComponent
  ],
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.scss'],
})
export class ConnectionManagerComponent implements OnInit {
  private clientPortAPI = inject(ClientPortAPI);
  private vendorPortAPI = inject(VendorPortAPI);

  displayedColumns: string[] = ['client', 'vendor'];
  connections = signal<Connection[]>([]);

  clientPorts: ClientPort[] = [];
  vendorPorts: VendorPort[] = [];
  clientPortMap = signal(new Map<number, ClientPort>());
  vendorPortMap = signal(new Map<number, VendorPort>());

  ngOnInit() {
    forkJoin([
      this.clientPortAPI.getClientPortList(),
      this.vendorPortAPI.getVendorPortList(),
    ]).subscribe(data => {
      this.clientPorts = data[0];
      this.vendorPorts = data[1];

      this.clientPortMap.set(new Map(this.clientPorts.map(cp => [cp.id!, cp])));
      this.vendorPortMap.set(new Map(this.vendorPorts.map(vp => [vp.id!, vp])));

      let connections = this.clientPorts.map(clientPort => clientPort.connection).flat();
      connections = connections.reduce((unique, item) => {
        return unique.find(x => x.id === item.id) ? unique : [...unique, item];
      }, [] as Connection[]);
      connections.sort((a, b) => {
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

      this.connections.set(connections);
    });
  }

}
