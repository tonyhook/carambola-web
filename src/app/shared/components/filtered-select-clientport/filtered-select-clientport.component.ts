import { booleanAttribute, ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, model, OnDestroy, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormBuilder, FormControl, FormGroup, NgControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { Subject } from 'rxjs';

import { ClientPort } from '../../../core';
import { AdEntityComponent } from '../ad-entity/ad-entity.component';

type FilteredSelectClientPortValue = ClientPort | ClientPort[] | null;
type FilteredSelectClientPortFormGroup = FormGroup<{
  selection: FormControl<FilteredSelectClientPortValue>;
  filter: FormControl<string | null>;
}>;

@Component({
  selector: 'carambola-filtered-select-clientport',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    AdEntityComponent,
  ],
  templateUrl: './filtered-select-clientport.component.html',
  styleUrls: ['./filtered-select-clientport.component.scss'],
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: FilteredSelectClientPortComponent
    },
  ],
})
export class FilteredSelectClientPortComponent implements OnDestroy, ControlValueAccessor, MatFormFieldControl<ClientPort | ClientPort[]> {
  private formBuilder = inject(FormBuilder);
  ngControl = inject(NgControl);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  // This is the start of MatFormFieldControl properties.

  // internal status
  static nextId = 0;
  readonly selectionInput = viewChild.required<MatSelect>('selection');
  readonly touched = signal(false);

  readonly _value = model<ClientPort | ClientPort[] | null>(null, {alias: 'value'});
  get value() {
    return this._value();
  }
  readonly stateChanges = new Subject<void>();
  readonly id = `filtered-select-clientport-${FilteredSelectClientPortComponent.nextId++}`;
  placeholder = '';
  focused = false;
  get empty() {
    const selection = this.formGroup.controls.selection.value;

    if (this.multiple()) {
      if (selection === null || (Array.isArray(selection) && selection.length === 0)) {
        return true;
      }
    } else {
      if (selection === null) {
        return true;
      }
    }
    return false;
  }
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }
  disabled = false;
  // MatFormFieldControl requires a boolean `required` property, so the signal input
  // needs a separate field name while preserving the external binding.
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly requiredInput = input(false, { alias: 'required', transform: booleanAttribute });
  get required(): boolean {
    return this.requiredInput();
  }
  get errorState(): boolean {
    return this.formGroup.invalid && this.touched();
  }
  readonly controlType = 'carambola-filtered-select-clientport';
  autofilled = false;
  userAriaDescribedBy = ''
  disableAutomaticLabeling = false;
  setDescribedByIds(ids: string[]): void {
    const controlElement = this.elementRef.nativeElement.querySelector(
      '.filtered-select-clientport-container',
    )!;
    controlElement.setAttribute('aria-describedby', ids.join(' '));
  }
  onContainerClick(event: MouseEvent): void {
    if (this.shouldIgnoreContainerClick(event)) {
      return;
    }

    this.selectionInput().focus();
    this.selectionInput().open();
  }

  // This is the end of MatFormFieldControl properties.
  // This is the start of ControlValueAccessor properties.

  _onChange: (arg0: ClientPort | ClientPort[] | null) => void = () => {return};
  _onTouched: () => void = () => {return};

  writeValue(value: ClientPort | ClientPort[] | null): void {
    this.changedByInternal = false;
    this.updateValue(value);
  }
  registerOnChange(fn: (arg0: ClientPort | ClientPort[] | null) => void): void {
    this._onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;

    if (this.disabled) {
      untracked(() => this.formGroup.disable({emitEvent: false}));
    } else {
      untracked(() => this.formGroup.enable({emitEvent: false}));
    }
    this.notifyStateChanged();
  }

  // This is the end of ControlValueAccessor properties.

  readonly filteredCandidates = signal<ClientPort[]>([]);
  oldFilter = '';

  options = input<ClientPort[]>([]);
  multiple = input<boolean>(false);

  formGroup: FilteredSelectClientPortFormGroup;

  changedByInternal = false;

  constructor() {
    this.ngControl.valueAccessor = this;
    this.formGroup = this.formBuilder.group({
      selection: this.formBuilder.control<FilteredSelectClientPortValue>(this.multiple() ? [] : null, this.required ? Validators.required : []),
      filter: this.formBuilder.control<string | null>(null),
    });
    this.formGroup.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const formSelection = this.formGroup.controls.selection.value;
        const selection = this._value();

        if (Array.isArray(formSelection) && Array.isArray(selection)) {
          const a = new Set([...formSelection.map((item) => item.id)]);
          const b = new Set([...(selection as ClientPort[]).map((item) => item.id)]);
          if (a.size !== b.size || ![...a].every((val) => b.has(val))) {
            this.changedByInternal = true;
            this.updateValue(formSelection);
          }
        }
        if (!Array.isArray(formSelection) && !Array.isArray(selection)) {
          if ((formSelection !== null && selection === null)
            || (formSelection === null && selection !== null)
            || (formSelection !== null && selection !== null && formSelection.id !== selection.id)) {
            this.changedByInternal = true;
            this.updateValue(formSelection);
          }
        }

        const filter = this.formGroup.controls.filter.value;

        if (filter !== this.oldFilter) {
          this.oldFilter = filter ?? '';
          this.filterCandidate();
        }
      }
    );

    effect(() => {
      const multiple = this.multiple();

      if (multiple) {
        this.formGroup.controls.selection.setValue([], {emitEvent: false});
      } else {
        this.formGroup.controls.selection.setValue(null, {emitEvent: false});
      }
    });
    effect(() => {
      if (this.required) {
        this.formGroup.controls.selection.setValidators(Validators.required);
      } else {
        this.formGroup.controls.selection.setValidators(null);
      }
      this.formGroup.controls.selection.updateValueAndValidity({emitEvent: false});
      this.notifyStateChanged();
    });
    effect(() => {
      const options = this.options();

      this.filteredCandidates.set(options.slice());
    });
    effect(() => {
      const selectionInput = this.selectionInput();

      selectionInput.compareWith = (a, b) => {
        if (!a || !b) {
          return false;
        }

        return a.id === b.id;
      };
    });
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  onFocusIn() {
    if (!this.focused) {
      this.focused = true;
      this.notifyStateChanged();
    }
  }

  onFocusOut(event: FocusEvent) {
    if (this.selectionInput().panelOpen) {
      return;
    }

    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && this.elementRef.nativeElement.contains(relatedTarget)) {
      return;
    }

    this.focused = false;
    this.touched.set(true);
    this._onTouched();
    this.notifyStateChanged();
  }

  onOpenedChange(opened: boolean) {
    this.focused = opened;

    if (!opened) {
      this.touched.set(true);
      this._onTouched();
    }
    this.notifyStateChanged();
  }

  onTouched() {
    this._onTouched();
  }

  updateValue(value: ClientPort | ClientPort[] | null): void {
    const current = this._value();

    if (value === null && current === null) {
      return;
    }
    if (Array.isArray(value) && Array.isArray(current)) {
      const a = new Set([...value.map((item) => item.id)]);
      const b = new Set([...current.map((item) => item.id)]);
      if (a.size === b.size && [...a].every((val) => b.has(val))) {
        this.changedByInternal = false;
        return;
      }
    }
    if (value && current && !Array.isArray(value) && !Array.isArray(current)) {
      if (value.id === current.id) {
        this.changedByInternal = false;
        return;
      }
    }

    this._value.set(value);

    this.formGroup.controls.selection.setValue(value, {emitEvent: false});

    if (this.changedByInternal) {
      this._onChange(value);
    }

    this.changedByInternal = false;
    this.notifyStateChanged();
  }

  private notifyStateChanged(): void {
    this.stateChanges.next();
  }

  private shouldIgnoreContainerClick(event: MouseEvent): boolean {
    const target = event.target as HTMLElement | null;

    return !!target && (
      target.tagName === 'MAT-OPTION'
      || target.classList.contains('cdk-overlay-backdrop')
      || !!target.closest('.mat-mdc-select-panel')
    );
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
        if (option.name.indexOf(filter) < 0 && (option.tagId !== null && option.tagId.indexOf(filter) < 0 || option.tagId === null)) {
          return false;
        } else {
          return true;
        }
      }));
    }
  }

}
