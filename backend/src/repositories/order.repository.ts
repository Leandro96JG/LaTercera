import { SupabaseClient } from '@supabase/supabase-js';
import { Order, OrderStatus } from '../services/order.service';

export interface IOrderRepository {
  createOrder(order: Order): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  listAllOrders(): Promise<Order[]>;
  updateOrderStatus(
    id: string,
    status: OrderStatus,
    paymentId?: string,
    downloadToken?: string
  ): Promise<Order | null>;
  findByPaymentId(paymentId: string): Promise<Order | null>;

  // Métodos de retrocompatibilidad
  create(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  update(order: Order): Promise<void>;
  updateStatus(
    id: string,
    status: OrderStatus,
    paymentId?: string,
    downloadToken?: string
  ): Promise<Order | null>;
  isEventProcessed(eventId: string): Promise<boolean>;
  markEventProcessed(eventId: string, orderId: string): Promise<void>;
}

/**
 * Implementación en memoria de IOrderRepository para pruebas unitarias y fallback offline
 */
export class MemoryOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map();
  private processedEvents: Map<string, string> = new Map(); // eventId -> orderId

  async createOrder(order: Order): Promise<Order> {
    const clone = { ...order, photoIds: [...order.photoIds] };
    this.orders.set(clone.id, clone);
    return clone;
  }

  async create(order: Order): Promise<Order> {
    return this.createOrder(order);
  }

  async getOrderById(id: string): Promise<Order | null> {
    const order = this.orders.get(id);
    return order ? { ...order, photoIds: [...order.photoIds] } : null;
  }

  async listAllOrders(): Promise<Order[]> {
    const list = Array.from(this.orders.values()).map(o => ({
      ...o,
      photoIds: [...o.photoIds]
    }));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findById(id: string): Promise<Order | null> {
    return this.getOrderById(id);
  }

  async findByPaymentId(paymentId: string): Promise<Order | null> {
    for (const order of this.orders.values()) {
      if (order.paymentId === paymentId) {
        return { ...order, photoIds: [...order.photoIds] };
      }
    }
    return null;
  }

  async update(order: Order): Promise<void> {
    this.orders.set(order.id, { ...order, photoIds: [...order.photoIds] });
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    paymentId?: string,
    downloadToken?: string
  ): Promise<Order | null> {
    const order = this.orders.get(id);
    if (!order) return null;

    order.status = status;
    if (paymentId) order.paymentId = paymentId;
    if (downloadToken) order.downloadToken = downloadToken;
    order.updatedAt = new Date().toISOString();

    return { ...order, photoIds: [...order.photoIds] };
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    paymentId?: string,
    downloadToken?: string
  ): Promise<Order | null> {
    return this.updateOrderStatus(id, status, paymentId, downloadToken);
  }

  async isEventProcessed(eventId: string): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  async markEventProcessed(eventId: string, orderId: string): Promise<void> {
    this.processedEvents.set(eventId, orderId);
  }
}

export interface SupabaseOrderRow {
  id: string;
  album_id: string;
  is_full_album?: boolean | null;
  photo_count?: number | null;
  unit_price?: number | string | null;
  subtotal?: number | string | null;
  discount?: number | string | null;
  discount_percentage?: number | string | null;
  total_amount?: number | string | null;
  currency?: string | null;
  customer_email: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  coupon_applied?: string | null;
  status: string;
  preference_id?: string | null;
  payment_id?: string | null;
  download_token?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Implementación PostgreSQL de IOrderRepository con Supabase
 */
export class SupabaseOrderRepository implements IOrderRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private mapRowToOrder(row: SupabaseOrderRow, photoIds: string[] = []): Order {
    return {
      id: row.id,
      albumId: row.album_id,
      photoIds,
      isFullAlbum: Boolean(row.is_full_album),
      photoCount: row.photo_count || 0,
      unitPrice: Number(row.unit_price) || 1200,
      subtotal: Number(row.subtotal) || 0,
      discount: Number(row.discount) || 0,
      discountPercentage: Number(row.discount_percentage) || 0,
      totalAmount: Number(row.total_amount) || 0,
      currency: 'ARS',
      customer: {
        email: row.customer_email,
        name: row.customer_name || undefined,
        phone: row.customer_phone || undefined
      },
      couponApplied: row.coupon_applied || undefined,
      status: row.status as OrderStatus,
      preferenceId: row.preference_id || undefined,
      paymentId: row.payment_id || undefined,
      downloadToken: row.download_token || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async createOrder(order: Order): Promise<Order> {
    // 1. Insertar orden principal
    const { error: orderError } = await this.supabase
      .from('orders')
      .insert({
        id: order.id,
        album_id: order.albumId,
        status: order.status,
        total_amount: order.totalAmount,
        currency: order.currency,
        unit_price: order.unitPrice,
        subtotal: order.subtotal,
        discount: order.discount,
        discount_percentage: order.discountPercentage,
        is_full_album: order.isFullAlbum,
        photo_count: order.photoCount,
        customer_email: order.customer.email,
        customer_name: order.customer.name,
        customer_phone: order.customer.phone,
        coupon_applied: order.couponApplied,
        preference_id: order.preferenceId,
        payment_id: order.paymentId,
        download_token: order.downloadToken,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      });

    if (orderError) {
      throw new Error(`[Supabase Error createOrder] ${orderError.message}`);
    }

    // 2. Insertar items individuales si no es full album
    if (!order.isFullAlbum && order.photoIds.length > 0) {
      // Aseguramos que las fotos existan en la tabla 'photos' para prevenir fallas de FK
      const photoUpserts = order.photoIds.map(pId => ({
        id: pId,
        album_id: order.albumId,
        filename: `${pId}.jpg`,
        original_path: `originals/${order.albumId}/${pId}.jpg`,
        preview_url: `previews/${order.albumId}/${pId}.webp`
      }));

      await this.supabase
        .from('photos')
        .upsert(photoUpserts, { onConflict: 'id', ignoreDuplicates: true });

      const items = order.photoIds.map(pId => ({
        order_id: order.id,
        photo_id: pId
      }));

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(items);

      if (itemsError) {
        console.error(`[Supabase Error order_items] ${itemsError.message}`);
      }
    }

    // 3. Si posee downloadToken, registrar en download_tokens
    if (order.downloadToken) {
      const resourceType = order.isFullAlbum ? 'album_zip' : 'photo';
      const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
      await this.supabase
        .from('download_tokens')
        .insert({
          token_hash: order.downloadToken,
          order_id: order.id,
          resource_type: resourceType,
          expires_at: expiresAt
        });
    }

    return order;
  }

  async create(order: Order): Promise<Order> {
    return this.createOrder(order);
  }

  async getOrderById(id: string): Promise<Order | null> {
    const { data: orderRow, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !orderRow) {
      return null;
    }

    // Obtener photoIds asociados
    const { data: itemRows } = await this.supabase
      .from('order_items')
      .select('photo_id')
      .eq('order_id', id);

    const photoIds = (itemRows || []).map(i => i.photo_id).filter(Boolean);
    return this.mapRowToOrder(orderRow, photoIds);
  }

  async listAllOrders(): Promise<Order[]> {
    const { data: orderRows, error } = await this.supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !orderRows || orderRows.length === 0) {
      return [];
    }

    const orderIds = orderRows.map(r => r.id);
    const itemsMap = new Map<string, string[]>();

    try {
      const { data: itemRows } = await this.supabase
        .from('order_items')
        .select('order_id, photo_id')
        .in('order_id', orderIds);

      if (itemRows) {
        for (const item of itemRows) {
          if (!itemsMap.has(item.order_id)) {
            itemsMap.set(item.order_id, []);
          }
          if (item.photo_id) {
            itemsMap.get(item.order_id)!.push(item.photo_id);
          }
        }
      }
    } catch {
      // Ignorar fallback defensivo si order_items falla
    }

    return orderRows.map(row => this.mapRowToOrder(row, itemsMap.get(row.id) || []));
  }

  async findById(id: string): Promise<Order | null> {
    return this.getOrderById(id);
  }

  async findByPaymentId(paymentId: string): Promise<Order | null> {
    const { data: orderRow, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (error || !orderRow) {
      return null;
    }

    const { data: itemRows } = await this.supabase
      .from('order_items')
      .select('photo_id')
      .eq('order_id', orderRow.id);

    const photoIds = (itemRows || []).map(i => i.photo_id).filter(Boolean);
    return this.mapRowToOrder(orderRow, photoIds);
  }

  async update(order: Order): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .update({
        status: order.status,
        payment_id: order.paymentId,
        preference_id: order.preferenceId,
        download_token: order.downloadToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (error) {
      throw new Error(`[Supabase Error updateOrder] ${error.message}`);
    }
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    paymentId?: string,
    downloadToken?: string
  ): Promise<Order | null> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };
    if (paymentId) updates.payment_id = paymentId;
    if (downloadToken) updates.download_token = downloadToken;

    const { data, error } = await this.supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Si se asignó un nuevo downloadToken, guardarlo en la tabla download_tokens
    if (downloadToken) {
      const isFullAlbum = Boolean(data.is_full_album);
      const resourceType = isFullAlbum ? 'album_zip' : 'photo';
      const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
      await this.supabase
        .from('download_tokens')
        .upsert({
          token_hash: downloadToken,
          order_id: id,
          resource_type: resourceType,
          expires_at: expiresAt
        });
    }

    return this.getOrderById(id);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    paymentId?: string,
    downloadToken?: string
  ): Promise<Order | null> {
    return this.updateOrderStatus(id, status, paymentId, downloadToken);
  }

  async isEventProcessed(eventId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('processed_webhook_events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }
    return true;
  }

  async markEventProcessed(eventId: string, orderId: string): Promise<void> {
    await this.supabase
      .from('processed_webhook_events')
      .insert({
        event_id: eventId,
        order_id: orderId
      });
  }
}
