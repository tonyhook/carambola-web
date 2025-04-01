import { Component, effect, input, output } from '@angular/core';
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

  permission = input<string | null>('');
  permissionChange = output<string | null>();
  basePermission = input<string | null>('');
  disabled = input(false);
  confirmChange = input(false);

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
      const disabled = this.disabled();

      this.formGroup = this.formBuilder.group({
        'create': [{value: permission?.includes('c') || basePermission?.includes('c'), disabled: disabled || (!permission?.includes('c') && basePermission?.includes('c'))}, null],
        'read':   [{value: permission?.includes('r') || basePermission?.includes('r'), disabled: disabled || (!permission?.includes('r') && basePermission?.includes('r'))}, null],
        'update': [{value: permission?.includes('u') || basePermission?.includes('u'), disabled: disabled || (!permission?.includes('u') && basePermission?.includes('u'))}, null],
        'delete': [{value: permission?.includes('d') || basePermission?.includes('d'), disabled: disabled || (!permission?.includes('d') && basePermission?.includes('d'))}, null],
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

    this.permissionChange.emit(ops);

    if (this.confirmChange()) {
      this.resetForm();
    }
  }

  private resetForm() {
    const permission = this.permission();
    const basePermission = this.basePermission();
    const disabled = this.disabled();

    this.formGroup = this.formBuilder.group({
      'create': [{value: permission?.includes('c') || basePermission?.includes('c'), disabled: disabled || (!permission?.includes('c') && basePermission?.includes('c'))}, null],
      'read':   [{value: permission?.includes('r') || basePermission?.includes('r'), disabled: disabled || (!permission?.includes('r') && basePermission?.includes('r'))}, null],
      'update': [{value: permission?.includes('u') || basePermission?.includes('u'), disabled: disabled || (!permission?.includes('u') && basePermission?.includes('u'))}, null],
      'delete': [{value: permission?.includes('d') || basePermission?.includes('d'), disabled: disabled || (!permission?.includes('d') && basePermission?.includes('d'))}, null],
    });
  }

}
