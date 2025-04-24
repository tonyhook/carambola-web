import { Component, input } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';

import { Client, ClientMedia, ClientPort, PartnerType, PortType, Vendor, VendorMedia, VendorPort } from '../../../core';
import { IsNewPipe } from '../../pipes/is-new.pipe';

@Component({
  selector: 'carambola-ad-entity',
  imports: [
    MatBadgeModule,
    MatIconModule,
    IsNewPipe,
  ],
  templateUrl: './ad-entity.component.html',
  styleUrls: ['./ad-entity.component.scss'],
})
export class AdEntityComponent {
  PartnerType = PartnerType;
  PortType = PortType;

  mode = input<string>('brief');
  type = input<string>('');
  debug = input<boolean>(false);

  client = input<Client>();
  clientMedia = input<ClientMedia>();
  clientPort = input<ClientPort>();
  vendor = input<Vendor>();
  vendorMedia = input<VendorMedia>();
  vendorPort = input<VendorPort>();

}
