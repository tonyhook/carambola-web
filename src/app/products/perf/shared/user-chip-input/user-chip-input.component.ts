import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, effect, ElementRef, forwardRef, inject, input, signal, viewChild } from '@angular/core';
import { FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { User, UserAPI } from '../../../../core';

@Component({
  selector: 'carambola-perf-user-chip-input',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './user-chip-input.component.html',
  styleUrls: ['./user-chip-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UserChipInputComponent),
      multi: true,
    },
  ],
})
export class UserChipInputComponent {
  private userAPI = inject(UserAPI);

  label = input('用户');
  placeholder = input('增加用户');
  loadUsers = input(true);

  separatorKeysCodes: number[] = [ENTER, COMMA];
  searchControl = new FormControl<string | null>(null);
  readonly allUsers = signal<User[]>([]);
  readonly usernames = signal<string[]>([]);
  readonly disabled = signal(false);
  readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('inputElement');

  private usersLoaded = false;
  private onChange?: (value: string[]) => void;
  private onTouched?: () => void;

  constructor() {
    effect(() => {
      if (!this.loadUsers() || this.usersLoaded) {
        return;
      }

      this.usersLoaded = true;
      this.userAPI.getUserList().subscribe(users => this.allUsers.set(users));
    });
  }

  filteredUsers(): User[] {
    const value = this.searchControl.value?.toLowerCase() ?? '';
    const selected = new Set(this.usernames());

    return this.allUsers().filter(user => {
      return !selected.has(user.username) && (!value || user.username.toLowerCase().includes(value));
    });
  }

  writeValue(value: string[] | null): void {
    this.usernames.set([...(value ?? [])]);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    if (disabled) {
      this.searchControl.disable({emitEvent: false});
    } else {
      this.searchControl.enable({emitEvent: false});
    }
  }

  add(event: MatChipInputEvent): void {
    this.addUsername(event.value?.trim() ?? '');
    event.chipInput?.clear();
    this.searchControl.setValue(null);
  }

  remove(username: string): void {
    if (this.disabled()) {
      return;
    }

    this.update(this.usernames().filter(value => value !== username));
  }

  select(event: MatAutocompleteSelectedEvent): void {
    this.addUsername(event.option.value as string);
    const input = this.inputElement()?.nativeElement;
    if (input) {
      input.value = '';
    }
    this.searchControl.setValue(null);
    event.option.deselect();
  }

  markTouched(): void {
    this.onTouched?.();
  }

  private addUsername(username: string): void {
    if (!username || this.disabled() || this.usernames().includes(username)) {
      return;
    }

    this.update([...this.usernames(), username]);
  }

  private update(usernames: string[]): void {
    this.usernames.set(usernames);
    this.onChange?.([...usernames]);
    this.onTouched?.();
  }
}
