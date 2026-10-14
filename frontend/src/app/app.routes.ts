import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'pago-exitoso',
    loadComponent: () =>
      import('./features/payment-success/payment-success.component').then(
        (m) => m.PaymentSuccessComponent
      ),
    title: 'Pago Exitoso • Descarga tus Fotos | La Tercera'
  },
  {
    path: 'checkout/success',
    redirectTo: 'pago-exitoso',
    pathMatch: 'full'
  }
];
