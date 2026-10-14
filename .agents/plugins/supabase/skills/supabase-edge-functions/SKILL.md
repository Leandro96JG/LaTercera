---
name: supabase-edge-functions
description: >-
  Diseño, desarrollo y despliegue de Supabase Edge Functions con Deno y TypeScript.
  Úsalo cuando el usuario necesite crear funciones serverless de baja latencia, procesar webhooks externos (ej.: pagos),
  ejecutar lógica de backend cerca del usuario, o invocar Edge Functions desde el frontend o base de datos.
---

# Supabase Edge Functions: Serverless con Deno y TypeScript

Esta guía describe cómo implementar, probar y desplegar Edge Functions de nivel de producción en Supabase sobre el runtime Deno.

---

## 1. Estructura de Proyecto

```text
supabase/
└── functions/
    ├── process-payment/
    │   └── index.ts
    └── send-whatsapp-notification/
        └── index.ts
```

---

## 2. Anatomía de una Edge Function Segura

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lógica transaccional
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: "Orden no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, order }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## 3. Pruebas y Despliegue con Supabase CLI

```bash
# Probar la Edge Function localmente
npx supabase functions serve process-payment --env-file .env

# Desplegar la función al proyecto remoto
npx supabase functions deploy process-payment --no-verify-jwt

# Gestionar secretos de entorno para la función
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=tu_token
```
