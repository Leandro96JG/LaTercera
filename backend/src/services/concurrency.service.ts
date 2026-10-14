/**
 * Servicio de control de concurrencia y procesamiento por lotes (Worker Queue)
 * Previene el desbordamiento de memoria RAM (OOM) en Node.js al procesar lotes masivos (50+ fotos)
 * limitando el número de operaciones pesadas con Sharp en paralelo.
 */

export interface BatchProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
}

export interface TaskExecutionResult<R> {
  index: number;
  success: boolean;
  data?: R;
  error?: string;
}

export interface BatchResult<R> {
  total: number;
  successful: number;
  failed: number;
  results: Array<TaskExecutionResult<R>>;
  peakConcurrency: number;
  durationMs: number;
}

export interface ConcurrencyOptions {
  /** Límite de tareas simultáneas en ejecución (por defecto: 3) */
  concurrencyLimit?: number;
  /** Callback opcional de progreso */
  onProgress?: (progress: BatchProgress) => void;
}

/**
 * Ejecuta una lista de tareas asíncronas con concurrencia controlada (Worker Pool).
 * Garantiza que nunca se ejecuten más de `concurrencyLimit` tareas al mismo tiempo.
 */
export async function runConcurrentBatch<T, R>(
  items: T[],
  taskFn: (item: T, index: number) => Promise<R>,
  options: ConcurrencyOptions = {}
): Promise<BatchResult<R>> {
  const startTime = Date.now();
  const limit = Math.max(1, options.concurrencyLimit ?? 3);
  const total = items.length;

  if (total === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
      peakConcurrency: 0,
      durationMs: 0
    };
  }

  const results: Array<TaskExecutionResult<R>> = new Array(total);
  let nextIndex = 0;
  let activeWorkers = 0;
  let peakConcurrency = 0;
  let completed = 0;
  let successful = 0;
  let failed = 0;

  return new Promise<BatchResult<R>>((resolve) => {
    function launchNextWorker(): void {
      if (nextIndex >= total && activeWorkers === 0) {
        // Todas las tareas finalizaron
        resolve({
          total,
          successful,
          failed,
          results,
          peakConcurrency,
          durationMs: Date.now() - startTime
        });
        return;
      }

      while (activeWorkers < limit && nextIndex < total) {
        const currentIndex = nextIndex++;
        const item = items[currentIndex];
        activeWorkers++;
        if (activeWorkers > peakConcurrency) {
          peakConcurrency = activeWorkers;
        }

        taskFn(item, currentIndex)
          .then((data) => {
            results[currentIndex] = {
              index: currentIndex,
              success: true,
              data
            };
            successful++;
          })
          .catch((err) => {
            results[currentIndex] = {
              index: currentIndex,
              success: false,
              error: err instanceof Error ? err.message : String(err)
            };
            failed++;
          })
          .finally(() => {
            activeWorkers--;
            completed++;

            if (options.onProgress) {
              try {
                options.onProgress({
                  total,
                  completed,
                  successful,
                  failed
                });
              } catch {
                // Prevenir que errores en el callback detengan el worker
              }
            }

            // Lanzar la siguiente tarea disponible
            launchNextWorker();
          });
      }
    }

    launchNextWorker();
  });
}
