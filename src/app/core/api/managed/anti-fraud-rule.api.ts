import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AntiFraudRule } from '../..';

@Injectable({
  providedIn: 'root',
})
export class AntiFraudRuleAPI {
  private http = inject(HttpClient);

  getAntiFraudRuleList(): Observable<AntiFraudRule[]> {
    return this.http.get<AntiFraudRule[]>(environment.apipath + '/api/managed/antifraudrule', { withCredentials: true });
  }

  getAntiFraudRule(code: string): Observable<AntiFraudRule> {
    return this.http.get<AntiFraudRule>(environment.apipath + '/api/managed/antifraudrule/code/' + code, { withCredentials: true });
  }

}
