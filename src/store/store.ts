import {configureStore,createSlice,PayloadAction} from '@reduxjs/toolkit';
import type {AppData,OptimizationResult,Settings} from '@/types/domain';
const initialState:AppData={rows:[],fronts:[],capabilities:[],norms:[],settings:{backDays:2,forwardDays:2,defaultNorm:72}};
const slice=createSlice({name:'app',initialState,reducers:{loadData:(_,a:PayloadAction<AppData>)=>a.payload,setSettings:(s,a:PayloadAction<Partial<Settings>>)=>{s.settings={...s.settings,...a.payload}},setResult:(s,a:PayloadAction<OptimizationResult>)=>{s.result=a.payload},reset:()=>initialState}});
export const {loadData,setSettings,setResult,reset}=slice.actions;
export const store=configureStore({reducer:{app:slice.reducer}});
export type RootState=ReturnType<typeof store.getState>;export type AppDispatch=typeof store.dispatch;
