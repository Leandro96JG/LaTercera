import { Order } from './order.service';
import { getPrimaryFrontendUrl } from '../config/env';

export interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
  simulated?: boolean;
}

export interface IEmailNotificationService {
  sendOrderReadyEmail(
    order: Order,
    downloadToken: string,
    customFrontendUrl?: string
  ): Promise<EmailSendResult>;
}

/**
 * Servicio de notificación por correo electrónico transaccional desacoplado.
 * Utiliza fetch nativo hacia la API de Resend sin librerías externas pesadas.
 * Si RESEND_API_KEY no está configurado, realiza un fallback a log estructurado.
 */
export class EmailNotificationService implements IEmailNotificationService {
  private readonly apiKey: string;
  private readonly fromEmail: string;

  constructor(
    apiKey: string = process.env.RESEND_API_KEY || '',
    fromEmail: string = process.env.RESEND_FROM_EMAIL || 'La Tercera Fotos <onboarding@resend.dev>'
  ) {
    this.apiKey = apiKey.trim();
    this.fromEmail = fromEmail.trim();
  }

  public async sendOrderReadyEmail(
    order: Order,
    downloadToken: string,
    customFrontendUrl?: string
  ): Promise<EmailSendResult> {
    const to = order.customer?.email?.trim();
    if (!to) {
      return { success: false, error: 'Email del cliente no provisto' };
    }

    const frontendUrl = customFrontendUrl
      ? customFrontendUrl.split(',')[0].trim().replace(/\/+$/, '')
      : getPrimaryFrontendUrl();
    const redirectUrl = `${frontendUrl}/pago-exitoso?token=${encodeURIComponent(downloadToken)}`;
    const albumTitle = order.albumTitleSnapshot || order.albumTitle || 'Álbum Fotográfico';
    const photoDetails = order.isFullAlbum
      ? 'Álbum Completo (Todas las fotografías en máxima resolución)'
      : `${order.photoCount || order.photoIds?.length || 1} fotografía(s) en máxima resolución`;

    // Si no hay API key configurada, realizar fallback con log estructurado seguro
    if (!this.apiKey) {
      console.log('[EmailService Fallback] Simulación de correo transaccional (RESEND_API_KEY no definida):', {
        to,
        albumTitle,
        orderId: order.id,
        redirectUrl
      });
      return { success: true, simulated: true };
    }

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tus fotos están listas</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F4F6; margin: 0; padding: 32px 16px; color: #18181B;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; border: 1px solid #E4E4E7; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Header Bento Oscuro -->
    <div style="background-color: #131316; padding: 32px 28px; text-align: center;">
      <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 6px 0; text-transform: uppercase;">
        LA TERCERA <span style="color: #FDB813;">•</span> FOTOGRAFÍA
      </h1>
      <p style="color: #A1A1AA; font-size: 12px; margin: 0; letter-spacing: 0.5px;">
        Jenifer "Yuyo" Espeche • Coberturas Deportivas & Eventos
      </p>
    </div>

    <!-- Contenido Principal -->
    <div style="padding: 36px 28px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #09090B; margin: 0 0 12px 0;">
        ¡Hola${order.customer?.name ? ` ${order.customer.name}` : ''}! 📸
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #52525B; margin: 0 0 24px 0;">
        Tu pago ha sido acreditado exitosamente. Tus fotografías originales ya fueron procesadas en máxima calidad HD y se encuentran listas para descargar.
      </p>

      <!-- Tarjeta Bento del Pedido -->
      <div style="background-color: #F4F4F5; border-radius: 16px; padding: 20px; margin-bottom: 28px; border: 1px solid #E4E4E7;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #71717A; padding: 4px 0; font-weight: 500;">Álbum:</td>
            <td style="color: #09090B; padding: 4px 0; font-weight: 700; text-align: right;">${albumTitle}</td>
          </tr>
          <tr>
            <td style="color: #71717A; padding: 4px 0; font-weight: 500;">Contenido:</td>
            <td style="color: #09090B; padding: 4px 0; font-weight: 600; text-align: right;">${photoDetails}</td>
          </tr>
          <tr>
            <td style="color: #71717A; padding: 4px 0; font-weight: 500;">N° de Orden:</td>
            <td style="color: #09090B; padding: 4px 0; font-family: monospace; font-size: 11px; text-align: right;">${order.id}</td>
          </tr>
        </table>
      </div>

      <!-- Botón de Descarga Principal -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${redirectUrl}" style="background-color: #09090B; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 700; padding: 16px 36px; border-radius: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);">
          ⬇️ Descargar Mis Fotografías
        </a>
      </div>

      <p style="font-size: 12px; line-height: 1.5; color: #71717A; margin: 0; text-align: center;">
        💡 <strong>Importante:</strong> Este enlace directo es válido por 72 horas. Si necesitas recuperar tus fotos más adelante, podrás hacerlo desde la sección <em>"Mis Compras"</em> en nuestro sitio web ingresando tu email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #FAFAFA; border-top: 1px solid #F4F4F5; padding: 20px 28px; text-align: center; font-size: 11px; color: #A1A1AA;">
      © ${new Date().getFullYear()} La Tercera • La Rioja, Argentina.<br>
      Fotografía profesional por Jenifer "Yuyo" Espeche.
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
LA TERCERA • FOTOGRAFÍA
¡Hola${order.customer?.name ? ` ${order.customer.name}` : ''}!

Tu compra de "${albumTitle}" ha sido confirmada.
Contenido: ${photoDetails}
N° de Orden: ${order.id}

Descarga tus fotografías desde el siguiente enlace directo (válido por 72h):
${redirectUrl}

Si necesitas recuperar tus fotos más adelante, puedes hacerlo desde "Mis Compras" en nuestra web con tu correo: ${to}.

La Tercera Fotografía • La Rioja, Argentina.
    `.trim();

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject: `📸 ¡Tus fotos de "${albumTitle}" están listas para descargar!`,
          html,
          text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[EmailService Error] Falló el envío en Resend (${response.status}): ${errorText}`);
        return { success: false, error: `Resend status ${response.status}: ${errorText}` };
      }

      const data = (await response.json()) as { id?: string };
      return { success: true, id: data?.id };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al enviar email';
      console.error(`[EmailService Error] Excepción al conectar con Resend: ${message}`);
      return { success: false, error: message };
    }
  }
}
