import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { AuthService } from '../../../services';

@Component({
  selector: 'carambola-admin-logout',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss'],
})
export class LogoutComponent {
  private authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }

}
