'use client';

import * as Comlink from 'comlink';

import type { AppData, OptimizationResult } from '@/types/domain';

type OptimizerApi = {
  optimize: (data: AppData) => OptimizationResult;
  validate: (data: AppData) => string[];
};

export function optimizerClient() {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    throw new Error('Web Worker недоступен в текущем браузере.');
  }

  const worker = new Worker(
    new URL('./optimizer.worker.ts', import.meta.url),
    {
      type: 'module',
      name: 'rail-logistics-optimizer',
    },
  );

  return {
    api: Comlink.wrap<OptimizerApi>(worker),
    terminate: () => worker.terminate(),
  };
}
