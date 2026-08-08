'use client';import * as Comlink from 'comlink';import type {AppData,OptimizationResult} from '@/types/domain';
type API={optimize:(d:AppData)=>OptimizationResult;validate:(d:AppData)=>string[]};
export function optimizerClient(){const worker=new Worker(new URL('./optimizer.worker.ts',import.meta.url),{type:'module'});return {api:Comlink.wrap<API>(worker),terminate:()=>worker.terminate()}}
