---
name: angular-forms-validation
description: >-
  Formularios reactivos tipados y validaciones en Angular Moderno (v17/18/19/21+).
  Úsalo cuando el usuario necesite crear o refactorizar formularios, implementar `FormGroup` y `FormControl` tipados,
  crear validadores síncronos o asíncronos personalizados, o manejar errores de validación accesibles.
---

# Angular Reactive Forms: Tipado Estricto, Validadores y Experiencia de Usuario

Esta guía detalla la implementación de formularios reactivos seguros con TypeScript estricto y validaciones robustas.

---

## 1. Declaración de Formularios Tipados con `NonNullableFormBuilder`

Usar `inject(NonNullableFormBuilder)` garantiza que los valores nunca se conviertan accidentalmente en `null` al ejecutar `.reset()`:

```typescript
import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div>
        <label for="email">Correo electrónico:</label>
        <input id="email" formControlName="email" type="email" />
        @if (emailControl.touched && emailControl.errors?.['required']) {
          <span class="error">El correo es obligatorio.</span>
        }
        @if (emailControl.touched && emailControl.errors?.['email']) {
          <span class="error">Formato de correo inválido.</span>
        }
      </div>

      <div>
        <label for="phone">Teléfono / WhatsApp:</label>
        <input id="phone" formControlName="phone" type="tel" />
      </div>

      <button type="submit" [disabled]="form.invalid || isSubmitting()">
        Pagar
      </button>
    </form>
  `
})
export class CheckoutFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{8,20}$/)]]
  });

  get emailControl() {
    return this.form.controls.email;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, phone } = this.form.getRawValue();
    console.log('Procesando compra:', email, phone);
  }
}
```

---

## 2. Validadores Personalizados Reutilizables

### Validador Síncrono a Nivel de Formulario (Coherencia de Precios):
```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function priceCoherenceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const unitPrice = control.get('unitPrice')?.value;
    const fullAlbumPrice = control.get('fullAlbumPrice')?.value;

    if (unitPrice != null && fullAlbumPrice != null && Number(unitPrice) > Number(fullAlbumPrice)) {
      return { priceMismatch: 'El precio unitario no puede superar el precio del álbum completo.' };
    }
    return null;
  };
}
```

### Aplicación en el Formulario:
```typescript
readonly albumForm = this.fb.group(
  {
    title: ['', Validators.required],
    unitPrice: [1200, [Validators.required, Validators.min(100)]],
    fullAlbumPrice: [9500, [Validators.required, Validators.min(500)]]
  },
  { validators: [priceCoherenceValidator()] }
);
```

---

## 3. Manejo de Estados y Accesibilidad

1. **Estado `markAllAsTouched()`:** Al enviar el formulario con datos inválidos, ejecutar `this.form.markAllAsTouched()` para iluminar de inmediato los campos con errores.
2. **Atributos Accesibles:** Vincular mensajes de error con `aria-describedby` y `aria-invalid="true"` cuando el control contenga errores.
