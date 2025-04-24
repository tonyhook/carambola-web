import { CommonModule } from '@angular/common';
import { booleanAttribute, Component, effect, ElementRef, input, model, OnDestroy, signal, untracked, viewChild, ViewChild, Input } from '@angular/core';
import { ControlValueAccessor, NgControl, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { ReplaySubject, Subject, take } from 'rxjs';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

import { VendorMedia } from '../../../core';
import { AdEntityComponent } from '../ad-entity/ad-entity.component';

@Component({
  selector: 'carambola-filtered-select-vendormedia',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    AdEntityComponent,
  ],
  templateUrl: './filtered-select-vendormedia.component.html',
  styleUrls: ['./filtered-select-vendormedia.component.scss'],
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: FilteredSelectVendorMediaComponent
    },
  ],
})
export class FilteredSelectVendorMediaComponent implements OnDestroy, ControlValueAccessor, MatFormFieldControl<VendorMedia | VendorMedia[]> {
  // This is the start of MatFormFieldControl properties.

  // internal status
  static nextId = 0;
  readonly selectionInput = viewChild.required<MatSelect>('selection');
  readonly touched = signal(false);

  readonly _value = model<VendorMedia | VendorMedia[] | null>(null, {alias: 'value'});
  get value() {
    return this._value();
  }
  readonly stateChanges = new Subject<void>();
  readonly id = `filtered-select-vendormedia-${FilteredSelectVendorMediaComponent.nextId++}`;
  placeholder = '';
  focused = false;
  get empty() {
    if (this.multiple()) {
      if (this.formGroup.value.selection === null || this.formGroup.value.selection.length === 0) {
        return true;
      }
    } else {
      if (this.formGroup.value.selection === null) {
        return true;
      }
    }
    return false;
  }
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }
  disabled = false;
  readonly requiredState = signal(false);
  @Input({ transform: booleanAttribute })
  set required(value: boolean) {
    this.requiredState.set(value);
  }
  get required(): boolean {
    return this.requiredState();
  }
  get errorState(): boolean {
    return this.formGroup.invalid && this.touched();
  }
  readonly controlType = 'carambola-filtered-select-vendormedia';
  autofilled = false;
  userAriaDescribedBy = ''
  disableAutomaticLabeling = false;
  setDescribedByIds(ids: string[]): void {
    const controlElement = this.elementRef.nativeElement.querySelector(
      '.filtered-select-vendormedia-container',
    )!;
    controlElement.setAttribute('aria-describedby', ids.join(' '));
  }
  onContainerClick(): void {
    this.selectionInput().open();
  }

  // This is the end of MatFormFieldControl properties.
  // This is the start of ControlValueAccessor properties.

  _onChange: (arg0: VendorMedia | VendorMedia[] | null) => void = () => {return};
  _onTouched: () => void = () => {return};

  writeValue(value: VendorMedia | VendorMedia[] | null): void {
    this.changedByInternal = false;
    this.updateValue(value);
  }
  registerOnChange(fn: (arg0: VendorMedia | VendorMedia[] | null) => void): void {
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
  }

  // This is the end of ControlValueAccessor properties.

  filteredCandidate$: ReplaySubject<VendorMedia[]> = new ReplaySubject<VendorMedia[]>(1);
  filteredCandidateCache: VendorMedia[] = [];
  oldFilter = '';

  options = input<VendorMedia[]>([]);
  multiple = input<boolean>(false);

  @ViewChild('selection', { static: true }) selection?: MatSelect;

  formGroup: UntypedFormGroup;

  changedByInternal = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    public ngControl: NgControl,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {
    this.ngControl.valueAccessor = this;
    this.formGroup = this.formBuilder.group({
      'selection': [this.multiple() ? [] : null, this.required ? Validators.required : null],
      'filter': [null, null],
    });
    this.formGroup.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        const selection = this._value();

        if (Array.isArray(data.selection) && Array.isArray(selection)) {
          const a = new Set([...(data.selection as VendorMedia[]).map((item) => item.id)]);
          const b = new Set([...(selection as VendorMedia[]).map((item) => item.id)]);
          if (a.size !== b.size || ![...a].every((val) => b.has(val))) {
            this.changedByInternal = true;
            this.updateValue(data.selection);
          }
        }
        if (!Array.isArray(data.selection) && !Array.isArray(selection)) {
          if ((data.selection !== null && selection === null)
            || (data.selection === null && selection !== null)
            || (data.selection !== null && selection !== null && data.selection.id !== selection.id)) {
            this.changedByInternal = true;
            this.updateValue(data.selection);
          }
        }

        if (this.formGroup.value.filter !== this.oldFilter) {
          this.oldFilter = this.formGroup.value.filter;
          this.filterCandidate();
        }
      }
    );
    this.filteredCandidate$.pipe(take(1), takeUntilDestroyed())
      .subscribe(() => {
        if (this.selection) {
          this.selection.compareWith = (a, b) => {
            if (!a || !b) {
              return false;
            }

            return a.id === b.id;
          };
        }
      }
    );

    effect(() => {
      const multiple = this.multiple();

      if (multiple) {
        this.formGroup.controls['selection'].setValue([], {emitEvent: false});
      } else {
        this.formGroup.controls['selection'].setValue(null, {emitEvent: false});
      }
    });
    effect(() => {
      if (this.required) {
        this.formGroup.controls['selection'].setValidators(Validators.required);
      } else {
        this.formGroup.controls['selection'].setValidators(null);
      }
      this.formGroup.controls['selection'].updateValueAndValidity({emitEvent: false});
    });
    effect(() => {
      const options = this.options();

      this.filteredCandidateCache = options.slice();
      this.filteredCandidate$.next(options.slice());
    });
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  onFocusIn() {
    if (!this.focused) {
      this.focused = true;
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
  }

  onOpenedChange(opened: boolean) {
    this.focused = opened;

    if (!opened) {
      this.touched.set(true);
      this._onTouched();
    }
  }

  onTouched() {
    this._onTouched();
  }

  updateValue(value: VendorMedia | VendorMedia[] | null): void {
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

    this.formGroup.controls['selection'].setValue(value, {emitEvent: false});

    if (this.changedByInternal) {
      this._onChange(value);
    }

    this.changedByInternal = false;
  }

  filterCandidate() {
    const search = this.formGroup.value.filter;
    if (!search) {
      this.filteredCandidateCache = this.options().slice();
      this.filteredCandidate$.next(this.filteredCandidateCache);
    } else {
      this.filteredCandidateCache = this.options().filter(option => {
        const filter = search;
        if (option === null) {
          return false;
        }
        if (filter === null) {
          return true;
        }
        if (option.name.indexOf(filter) < 0 && (option.apppackage !== null && option.apppackage.indexOf(filter) < 0 || option.apppackage === null)) {
          return false;
        } else {
          return true;
        }
      });
      this.filteredCandidate$.next(this.filteredCandidateCache);
    }
  }

}
