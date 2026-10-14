# Directrices y Estándares de Arquitectura para Angular Moderno

Este documento define las reglas de ingeniería para desarrollar, refactorizar y probar aplicaciones en Angular Moderno (v17/18/19/21+).

---

## 1. Arquitectura de Componentes y Rendimiento

1. **Standalone Components:**
   - Todos los componentes, directivas y pipes deben ser **Standalone** (`standalone: true` o estándar por defecto en Angular 19+).
   - Prohibido el uso de `NgModule` para agrupar componentes del proyecto.
2. **Estrategia de Detección de Cambios OnPush:**
   - Todo componente DEBE declarar explícitamente `changeDetection: ChangeDetectionStrategy.OnPush`.
   - El refresco de la vista se basa en inmutabilidad y Signals, reduciendo ciclos de comprobación innecesarios.
3. **Flujo de Control Integrado (Built-in Control Flow):**
   - Utilizar exclusivamente la sintaxis nativa:
     - `@if (condicion) { ... } @else if (otra) { ... } @else { ... }`
     - `@for (item of items; track item.id) { ... } @empty { ... }` (el `track` es obligatorio y debe usar una clave única).
     - `@switch (valor) { @case (x) { ... } @default { ... } }`
   - **PROHIBIDO** el uso de directivas estructurales legadas (`*ngIf`, `*ngFor`, `*ngSwitch`).
4. **Vistas Diferidas (@defer):**
   - Emplear `@defer (on viewport)` o `@defer (on idle)` para componentes pesados (galerías, modales, gráficos, listas largas) acompañados de `@placeholder` y `@loading`.

---

## 2. Gestión de Estado Reactivo con Signals

1. **Signals Primarios y Derivados:**
   - Utilizar `signal()` para estado mutable local y `computed()` para valores derivados puros.
   - Mantener las funciones de `computed()` libres de efectos secundarios (*side-effects*).
2. **Manejo Controlado de Efectos (`effect()`):**
   - Usar `effect()` únicamente para sincronización externa (ej.: `localStorage`, llamadas a APIs de canvas/DOM, analytics).
   - Envolver lecturas que no deban disparar el efecto con `untracked()`.
3. **Interoperabilidad con RxJS:**
   - Para flujos complejos (búsquedas con debounce, websockets, eventos del DOM), transformar observables a signals con `toSignal()` de `@angular/core/rxjs-interop`.
   - Limpiar suscripciones automáticamente con `takeUntilDestroyed()`.

---

## 3. Entradas y Salidas de Componentes (Signal Inputs/Outputs)

1. **Signal Inputs:**
   - Emplear `input<T>()` o `input.required<T>()` en lugar del decorador legado `@Input()`.
2. **Outputs Modernos:**
   - Emplear `output<T>()` en lugar del decorador `@Output()` y `EventEmitter`.

---

## 4. Inyección de Dependencias y Formularios

1. **Función `inject()`:**
   - Usar `inject(Servicio)` en campos de clase en lugar de constructores inflados.
2. **Formularios Reactivos Estrictamente Tipados:**
   - Utilizar `FormGroup<{ ... }>` y `FormControl<T>` con tipos fuertes. Prohibido el uso de formularios no tipados (`UntypedFormGroup`).

---

## 5. Pruebas Unitarias con Vitest

1. **TestBed Moderno:**
   - Configurar pruebas con `TestBed.configureTestingModule` importando componentes standalone directamente.
   - Probar componentes con señales modificando el signal y ejecutando `fixture.detectChanges()`.
   - Emplear `provideHttpClientTesting()` para simular llamadas HTTP.

---

## 6. Estándares Oficiales de Google y Angular CLI (`best-practices`)

1. **Host Element Bindings:**
   - **PROHIBIDO** el uso de decoradores legados `@HostBinding` y `@HostListener`. Definir los bindings directamente en la propiedad `host` del decorador `@Component` o `@Directive`.
2. **Enlaces de Clases y Estilos:**
   - **PROHIBIDO** el uso de directivas legadas `ngClass` y `ngStyle`. Usar enlaces nativos `[class.nombre]="condicion"` y `[style.propiedad]="valor"`.
3. **Optimización de Imágenes:**
   - Emplear `NgOptimizedImage` (`ngSrc`) para imágenes estáticas desde CDN para optimizar LCP y precarga.
4. **Accesibilidad (a11y) y WCAG AA:**
   - Toda interfaz debe superar auditorías de **AXE** y satisfacer el nivel mínimo **WCAG AA** (contraste 4.5:1, gestión de foco en modales con `tabindex="-1"`, y etiquetas `aria-label` en botones interactivos con solo iconos).
5. **Inmutabilidad en Signals:**
   - **PROHIBIDO** el uso de `mutate()` en Signals; utilizar exclusivamente `update()` o `set()`.
