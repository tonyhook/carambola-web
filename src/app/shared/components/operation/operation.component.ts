import { Component, effect, input, model } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'carambola-operation',
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
  ],
  templateUrl: './operation.component.html',
  styleUrls: ['./operation.component.scss'],
})
export class OperationComponent {
  formGroup: UntypedFormGroup;

  permission = model<string | null>('');
  basePermission = input<string | null>('');

  constructor(
    private formBuilder: UntypedFormBuilder,
  ) {
    this.formGroup = this.formBuilder.group({
      'create': [{value: false, disabled: false}, null],
      'read':   [{value: false, disabled: false}, null],
      'update': [{value: false, disabled: false}, null],
      'delete': [{value: false, disabled: false}, null],
    });

    effect(() => {
      const permission = this.permission();
      const basePermission = this.basePermission();

      this.formGroup = this.formBuilder.group({
        'create': [{value: permission?.includes('c') || basePermission?.includes('c'), disabled: !permission?.includes('c') && basePermission?.includes('c')}, null],
        'read':   [{value: permission?.includes('r') || basePermission?.includes('r'), disabled: !permission?.includes('r') && basePermission?.includes('r')}, null],
        'update': [{value: permission?.includes('u') || basePermission?.includes('u'), disabled: !permission?.includes('u') && basePermission?.includes('u')}, null],
        'delete': [{value: permission?.includes('d') || basePermission?.includes('d'), disabled: !permission?.includes('d') && basePermission?.includes('d')}, null],
      });
    });
  }

  toggle() {
    let ops = '';

    if (this.formGroup.value.create) {
      ops += 'c';
    }
    if (this.formGroup.value.read) {
      ops += 'r';
    }
    if (this.formGroup.value.update) {
      ops += 'u';
    }
    if (this.formGroup.value.delete) {
      ops += 'd';
    }

    this.permission.set(ops);
  }

}
