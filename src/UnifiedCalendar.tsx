import React, { useState } from 'react';
import { DateTime } from 'luxon';

// Definición de tipos estricta con los estados directamente en inglés
interface SlotAgenda {
    id: string;
    horaInicio: string; // Formato HH:MM
    sala: string;
    profesionalNombre: string;
    profesionalUsername: string; // Ej: 'D-Fsadni'
    estado: 'available' | 'occupied'; // Literales corregidos a inglés internacional
    pacienteNombre?: string;
}

export default function UnifiedCalendar() {
    // Control del día anclado a la zona horaria de Malta
    const [fechaSeleccionada, setFechaSeleccionada] = useState<DateTime>(
        DateTime.now().setZone('Europe/Malta')
    );
    const [cargando, setCargando] = useState<boolean>(false);

    // Colección de ranuras horarias con los nuevos estados unificados
    const [slots, setSlots] = useState<SlotAgenda[]>([
        {
            id: "slot-1",
            horaInicio: "09:00",
            sala: "Room 1 - General Consultation",
            profesionalNombre: "Dr. Fsadni",
            profesionalUsername: "D-Fsadni",
            estado: "occupied",
            pacienteNombre: "John Attard"
        },
        {
            id: "slot-2",
            horaInicio: "09:30",
            sala: "Room 1 - General Consultation",
            profesionalNombre: "Dr. Fsadni",
            profesionalUsername: "D-Fsadni",
            estado: "available"
        },
        {
            id: "slot-3",
            horaInicio: "10:00",
            sala: "Room 2 - Pediatrics",
            profesionalNombre: "Dra. Martha Spiteri",
            profesionalUsername: "D-MSpiteri",
            estado: "occupied",
            pacienteNombre: "Maria Borg"
        },
        {
            id: "slot-4",
            horaInicio: "10:30",
            sala: "Room 2 - Pediatrics",
            profesionalNombre: "Dra. Martha Spiteri",
            profesionalUsername: "D-MSpiteri",
            estado: "available"
        },
        {
            id: "slot-5",
            horaInicio: "11:00",
            sala: "Room 1 - General Consultation",
            profesionalNombre: "Dr. Fsadni",
            profesionalUsername: "D-Fsadni",
            estado: "available"
        }
    ]);

    // Mutación local del estado simulando la respuesta segura del backend
    const gestionarInsercionManual = async (slotId: string) => {
        setCargando(true);
        try {
            // Simulación de persistencia atómica en la base de datos
            console.log(`Opening insertion form for slot ID: ${slotId}`);
            
            setSlots(prevSlots => 
                prevSlots.map(slot => 
                    slot.id === slotId 
                        ? { ...slot, estado: 'occupied', pacienteNombre: 'Assigned by Counter' } 
                        : slot
                )
            );
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : String(error);
            console.error(`Error processing manual insertion: ${mensajeError}`);
        } finally {
            setCargando(false);
        }
    };

    // Desplazamiento de fechas bajo el huso horario Europe/Malta
    const cambiarDia = (direccion: 'anterior' | 'siguiente') => {
        setFechaSeleccionada(prev => 
            direccion === 'siguiente' ? prev.plus({ days: 1 }) : prev.minus({ days: 1 })
        );
    };

    return (
        <div className="w-full max-w-md mx-auto bg-slate-50 min-h-screen pb-12 flex flex-col font-sans">
            {/* Cabecera de la aplicación web móvil */}
            <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-lg font-bold tracking-tight">William's Pharmacy</h1>
                    <span className="text-xs font-semibold bg-blue-600 px-2 py-1 rounded-full text-blue-50">
                        Counter Staff (P-)
                    </span>
                </div>
                
                {/* Selector temporal con internacionalización en inglés británico */}
                <div className="flex items-center justify-between bg-slate-800 rounded-lg p-1 mt-3">
                    <button 
                        onClick={() => cambiarDia('anterior')}
                        className="p-3 text-slate-300 hover:text-white active:bg-slate-700 rounded-md transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                        ←
                    </button>
                    <span className="font-medium text-sm text-slate-100">
                        {fechaSeleccionada.setLocale('en-GB').toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
                    </span>
                    <button 
                        onClick={() => cambiarDia('siguiente')}
                        className="p-3 text-slate-300 hover:text-white active:bg-slate-700 rounded-md transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                        →
                    </button>
                </div>
            </header>

            {/* Listado secuencial de franjas de la agenda */}
            <main className="flex-1 p-4 space-y-3 overflow-y-auto">
                {slots.map((slot) => {
                    // Evaluación directa basada exclusivamente en el literal en inglés
                    const esDisponible = slot.estado === 'available';
                    
                    return (
                        <div 
                            key={slot.id}
                            className={`w-full rounded-xl border p-4 transition-all shadow-sm flex flex-col justify-between ${
                                esDisponible 
                                    ? 'bg-white border-emerald-200 hover:border-emerald-300' 
                                    : 'bg-slate-100 border-slate-200 opacity-75'
                            }`}
                        >
                            {/* Bloque superior informativa de hora y estado de sala */}
                            <div className="flex items-start justify-between border-b border-slate-100 pb-2 mb-3">
                                <div className="flex items-center space-x-3">
                                    <span className="text-lg font-bold text-slate-800 tracking-tight">
                                        {slot.horaInicio}
                                    </span>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                                        esDisponible 
                                            ? 'bg-emerald-100 text-emerald-800' 
                                            : 'bg-slate-200 text-slate-700'
                                    }`}>
                                        {slot.estado === 'available' ? 'Available' : 'Occupied'}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2 py-0.5 rounded">
                                    {slot.sala}
                                </span>
                            </div>

                            {/* Bloque intermedio de credenciales del personal y pacientes */}
                            <div className="flex flex-col space-y-1.5 mb-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                        {slot.profesionalUsername.split('-')[0]}-
                                    </span>
                                    <span className="text-sm font-semibold text-slate-700">
                                        {slot.profesionalNombre}
                                    </span>
                                </div>
                                
                                {!esDisponible && slot.pacienteNombre && (
                                    <div className="text-sm text-slate-600 pl-7 flex items-center space-x-1">
                                        <span className="text-slate-400">Patient:</span>
                                        <span className="font-medium line-through text-slate-500">{slot.pacienteNombre}</span>
                                    </div>
                                )}
                            </div>

                            {/* Acciones interactivas adaptadas a zonas táctiles de 48px */}
                            <div className="w-full pt-1">
                                {esDisponible ? (
                                    <button
                                        onClick={() => gestionarInsercionManual(slot.id)}
                                        disabled={cargando}
                                        className="w-full bg-emerald-600 active:bg-emerald-700 text-white font-medium text-sm py-3 px-4 rounded-lg shadow-sm transition-colors active:scale-[0.99] transform min-h-[48px] flex items-center justify-center"
                                    >
                                        Assign Appointment
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full bg-slate-200 text-slate-400 font-medium text-sm py-3 px-4 rounded-lg cursor-not-allowed min-h-[48px] flex items-center justify-center"
                                    >
                                        Slot Occupied
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </main>
        </div>
    );
}