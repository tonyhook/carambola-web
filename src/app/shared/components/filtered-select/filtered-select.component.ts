import { booleanAttribute, Component, DestroyRef, effect, input, OnDestroy, signal, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormBuilder, FormControl, FormGroup, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { Subject } from 'rxjs';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

type FilteredSelectFormGroup = FormGroup<{
  value: FormControl<string | null>;
  filter: FormControl<string | null>;
}>;

@Component({
  selector: 'carambola-filtered-select',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
  ],
  templateUrl: './filtered-select.component.html',
  styleUrls: ['./filtered-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: FilteredSelectComponent
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: FilteredSelectComponent
    }
  ],
})
export class FilteredSelectComponent implements OnDestroy, ControlValueAccessor, Validator {
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  _onChange: (arg0: string | null) => void = () => {return};
  _onTouched: () => void = () => {return};
  _onValidatorChange: () => void = () => {return};

  readonly stateChanges = new Subject<void>();
  readonly filteredCandidates = signal<string[]>([]);

  oldValue: string | null = null;
  oldFilter = '';

  options = input<string[]>([]);
  label = input<string>('');
  // MatFormFieldControl requires a boolean `required` property, so the signal input
  // needs a separate field name while preserving the external binding.
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly requiredInput = input(false, { alias: 'required', transform: booleanAttribute });
  get required(): boolean {
    return this.requiredInput();
  }

  readonly select = viewChild<MatSelect>('select');

  formGroup: FilteredSelectFormGroup;

  constructor() {
    this.formGroup = this.formBuilder.group({
      value: this.formBuilder.control<string | null>(null, this.required ? Validators.required : []),
      filter: this.formBuilder.control<string | null>(null),
    });
    this.formGroup.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const value = this.formGroup.controls.value.value;
        const filter = this.formGroup.controls.filter.value;

        if (value !== this.oldValue) {
          this.oldValue = value;
          this._onChange(value);
        }
        if (filter !== this.oldFilter) {
          this.oldFilter = filter ?? '';
          this.filterCandidate();
        }
      }
    );

    effect(() => {
      if (this.required) {
        this.formGroup.controls['value'].setValidators(Validators.required);
      } else {
        this.formGroup.controls['value'].setValidators(null);
      }
      this.formGroup.controls['value'].updateValueAndValidity({emitEvent: false});
    });
    effect(() => {
      const options = this.options();

      this.filteredCandidates.set(options.slice());
    });
    effect(() => {
      const select = this.select();

      if (!select) {
        return;
      }

      select.compareWith = (a, b) => {
        if (!a || !b) {
          return false;
        }

        return a === b;
      };
    });
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  writeValue(obj: string): void {
    this.formGroup.controls.value.setValue(obj, {
      emitEvent: false,
    });
  }

  registerOnChange(fn: (arg0: string | null) => void) {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this._onValidatorChange = fn;
  }

  setDisabledState(disabled: boolean) {
    if (disabled) {
      this.formGroup.controls.value.disable();
    } else {
      this.formGroup.controls.value.enable();
    }
  }

  validate(): ValidationErrors | null {
    if (this.required) {
      if (this.formGroup.controls.value.value === null) {
        this.formGroup.markAllAsTouched();

        return {
          select: {
            valid: false,
          }
        };
      }
    }

    return null;
  }

  onTouched() {
    this._onTouched();
  }

  filterCandidate() {
    const search = this.formGroup.controls.filter.value;
    if (!search) {
      this.filteredCandidates.set(this.options().slice());
    } else {
      this.filteredCandidates.set(this.options().filter(option => {
        const filter = search;
        if (option === null) {
          return false;
        }
        if (filter === null) {
          return true;
        }
        if (option.indexOf(filter) < 0) {
          return false;
        } else {
          return true;
        }
      }));
    }
  }

}
