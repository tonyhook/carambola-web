import { Component, effect, input, model, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

type OperationFormGroup = FormGroup<{
  create: FormControl<boolean>;
  read: FormControl<boolean>;
  update: FormControl<boolean>;
  delete: FormControl<boolean>;
}>;

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
  private formBuilder = inject(FormBuilder);

  formGroup: OperationFormGroup;

  permission = model<string | null>('');
  basePermission = input<string | null>('');

  constructor() {
    this.formGroup = this.formBuilder.group({
      create: this.formBuilder.nonNullable.control(false),
      read: this.formBuilder.nonNullable.control(false),
      update: this.formBuilder.nonNullable.control(false),
      delete: this.formBuilder.nonNullable.control(false),
    });

    effect(() => {
      const permission = this.permission();
      const basePermission = this.basePermission();

      this.formGroup = this.formBuilder.group({
        create: this.formBuilder.nonNullable.control({value: !!permission?.includes('c') || !!basePermission?.includes('c'), disabled: !permission?.includes('c') && !!basePermission?.includes('c')}),
        read: this.formBuilder.nonNullable.control({value: !!permission?.includes('r') || !!basePermission?.includes('r'), disabled: !permission?.includes('r') && !!basePermission?.includes('r')}),
        update: this.formBuilder.nonNullable.control({value: !!permission?.includes('u') || !!basePermission?.includes('u'), disabled: !permission?.includes('u') && !!basePermission?.includes('u')}),
        delete: this.formBuilder.nonNullable.control({value: !!permission?.includes('d') || !!basePermission?.includes('d'), disabled: !permission?.includes('d') && !!basePermission?.includes('d')}),
      });
    });
  }

  toggle() {
    let ops = '';

    if (this.formGroup.controls.create.value) {
      ops += 'c';
    }
    if (this.formGroup.controls.read.value) {
      ops += 'r';
    }
    if (this.formGroup.controls.update.value) {
      ops += 'u';
    }
    if (this.formGroup.controls.delete.value) {
      ops += 'd';
    }

    this.permission.set(ops);
  }

}
