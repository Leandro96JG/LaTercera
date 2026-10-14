import { describe, it, expect } from 'vitest';
import { runConcurrentBatch, BatchProgress } from '../src/services/concurrency.service';

describe('Concurrency & Batch Processing Service (Anti-OOM)', () => {
  it('debe procesar un lote de 50 tareas respetando estrictamente el límite de concurrencia de 3', async () => {
    const totalItems = 50;
    const items = Array.from({ length: totalItems }, (_, i) => `item_${i}`);
    let currentlyActive = 0;
    let maxObservedActive = 0;

    const result = await runConcurrentBatch(
      items,
      async (item, index) => {
        currentlyActive++;
        if (currentlyActive > maxObservedActive) {
          maxObservedActive = currentlyActive;
        }

        // Simular procesamiento asíncrono
        await new Promise((r) => setTimeout(r, 10));

        currentlyActive--;
        return `processed_${item}_at_${index}`;
      },
      { concurrencyLimit: 3 }
    );

    expect(result.total).toBe(50);
    expect(result.successful).toBe(50);
    expect(result.failed).toBe(0);
    expect(result.peakConcurrency).toBeLessThanOrEqual(3);
    expect(maxObservedActive).toBeLessThanOrEqual(3);
    expect(result.results.length).toBe(50);
    expect(result.results[0].data).toBe('processed_item_0_at_0');
  });

  it('debe ser resiliente ante fallos individuales sin cancelar el resto del lote', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const result = await runConcurrentBatch(
      items,
      async (val) => {
        if (val === 4 || val === 7) {
          throw new Error(`Error simulado en item ${val}`);
        }
        return val * 10;
      },
      { concurrencyLimit: 2 }
    );

    expect(result.total).toBe(10);
    expect(result.successful).toBe(8);
    expect(result.failed).toBe(2);

    const failedItems = result.results.filter((r) => !r.success);
    expect(failedItems.length).toBe(2);
    expect(failedItems[0].error).toContain('Error simulado en item 4');
    expect(failedItems[1].error).toContain('Error simulado en item 7');
  });

  it('debe emitir reportes de progreso acumulativo a través de onProgress', async () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const progressReports: BatchProgress[] = [];

    await runConcurrentBatch(
      items,
      async (letter) => {
        if (letter === 'c') throw new Error('Fallo c');
        return letter.toUpperCase();
      },
      {
        concurrencyLimit: 2,
        onProgress: (p) => progressReports.push({ ...p })
      }
    );

    expect(progressReports.length).toBe(5);
    const lastReport = progressReports[progressReports.length - 1];
    expect(lastReport.total).toBe(5);
    expect(lastReport.completed).toBe(5);
    expect(lastReport.successful).toBe(4);
    expect(lastReport.failed).toBe(1);
  });

  it('debe retornar resultados vacíos de inmediato si el array de entrada está vacío', async () => {
    const result = await runConcurrentBatch([], async () => 'test');
    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);
    expect(result.peakConcurrency).toBe(0);
  });
});
