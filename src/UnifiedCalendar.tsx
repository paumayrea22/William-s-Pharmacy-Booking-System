import { useState } from 'react';
import { DateTime } from 'luxon';

// Strict type definition with states directly in English
interface AgendaSlot {
    id: string;
    startTime: string; // Format HH:MM
    room: string;
    professionalName: string;
    professionalUsername: string; // E.g., 'D-Fsadni'
    status: 'available' | 'occupied';
    patientName?: string;
}

export default function UnifiedCalendar() {
    // Day control anchored to Malta time zone
    const [selectedDate, setSelectedDate] = useState<DateTime>(
        DateTime.now().setZone('Europe/Malta')
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Collection of time slots with unified states
    const [slots, setSlots] = useState<AgendaSlot[]>([
        {
            id: "slot-1",
            startTime: "09:00",
            room: "Room 1 - General Consultation",
            professionalName: "Dr. Fsadni",
            professionalUsername: "D-Fsadni",
            status: "occupied",
            patientName: "John Attard"
        },
        {
            id: "slot-2",
            startTime: "09:30",
            room: "Room 1 - General Consultation",
            professionalName: "Dr. Fsadni",
            professionalUsername: "D-Fsadni",
            status: "available"
        },
        {
            id: "slot-3",
            startTime: "10:00",
            room: "Room 2 - Pediatrics",
            professionalName: "Dra. Martha Spiteri",
            professionalUsername: "D-MSpiteri",
            status: "occupied",
            patientName: "Maria Borg"
        },
        {
            id: "slot-4",
            startTime: "10:30",
            room: "Room 2 - Pediatrics",
            professionalName: "Dra. Martha Spiteri",
            professionalUsername: "D-MSpiteri",
            status: "available"
        },
        {
            id: "slot-5",
            startTime: "11:00",
            room: "Room 1 - General Consultation",
            professionalName: "Dr. Fsadni",
            professionalUsername: "D-Fsadni",
            status: "available"
        }
    ]);

    // Local state mutation simulating secure backend response
    const handleManualInsertion = async (slotId: string) => {
        setIsLoading(true);
        try {
            // Atomic database persistence simulation
            console.log(`Opening insertion form for slot ID: ${slotId}`);
            
            setSlots(prevSlots => 
                prevSlots.map(slot => 
                    slot.id === slotId 
                        ? { ...slot, status: 'occupied', patientName: 'Assigned by Counter' } 
                        : slot
                )
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error processing manual insertion: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Date shifting under Europe/Malta time zone
    const changeDay = (direction: 'previous' | 'next') => {
        setSelectedDate(prev => 
            direction === 'next' ? prev.plus({ days: 1 }) : prev.minus({ days: 1 })
        );
    };

    return (
        <div className="w-full max-w-md mx-auto bg-slate-50 min-h-screen pb-12 flex flex-col font-sans">
            {/* Mobile web app header */}
            <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-lg font-bold tracking-tight">William's Pharmacy</h1>
                    <span className="text-xs font-semibold bg-blue-600 px-2 py-1 rounded-full text-blue-50">
                        Counter Staff (P-)
                    </span>
                </div>
                
                {/* Time selector with British English internationalization */}
                <div className="flex items-center justify-between bg-slate-800 rounded-lg p-1 mt-3">
                    <button 
                        onClick={() => changeDay('previous')}
                        className="p-3 text-slate-300 hover:text-white active:bg-slate-700 rounded-md transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                        ←
                    </button>
                    <span className="font-medium text-sm text-slate-100">
                        {selectedDate.setLocale('en-GB').toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
                    </span>
                    <button 
                        onClick={() => changeDay('next')}
                        className="p-3 text-slate-300 hover:text-white active:bg-slate-700 rounded-md transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                        →
                    </button>
                </div>
            </header>

            {/* Sequential list of schedule slots */}
            <main className="flex-1 p-4 space-y-3 overflow-y-auto">
                {slots.map((slot) => {
                    // Direct evaluation based exclusively on English literal
                    const isAvailable = slot.status === 'available';
                    
                    return (
                        <div 
                            key={slot.id}
                            className={`w-full rounded-xl border p-4 transition-all shadow-sm flex flex-col justify-between ${
                                isAvailable 
                                    ? 'bg-white border-emerald-200 hover:border-emerald-300' 
                                    : 'bg-slate-100 border-slate-200 opacity-75'
                            }`}
                        >
                            {/* Top block: time and room status info */}
                            <div className="flex items-start justify-between border-b border-slate-100 pb-2 mb-3">
                                <div className="flex items-center space-x-3">
                                    <span className="text-lg font-bold text-slate-800 tracking-tight">
                                        {slot.startTime}
                                    </span>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                                        isAvailable 
                                            ? 'bg-emerald-100 text-emerald-800' 
                                            : 'bg-slate-200 text-slate-700'
                                    }`}>
                                        {slot.status === 'available' ? 'Available' : 'Occupied'}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2 py-0.5 rounded">
                                    {slot.room}
                                </span>
                            </div>

                            {/* Middle block: staff credentials and patients */}
                            <div className="flex flex-col space-y-1.5 mb-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                        {slot.professionalUsername.split('-')[0]}-
                                    </span>
                                    <span className="text-sm font-semibold text-slate-700">
                                        {slot.professionalName}
                                    </span>
                                </div>
                                
                                {!isAvailable && slot.patientName && (
                                    <div className="text-sm text-slate-600 pl-7 flex items-center space-x-1">
                                        <span className="text-slate-400">Patient:</span>
                                        <span className="font-medium line-through text-slate-500">{slot.patientName}</span>
                                    </div>
                                )}
                            </div>

                            {/* Interactive actions adapted to 48px touch zones */}
                            <div className="w-full pt-1">
                                {isAvailable ? (
                                    <button
                                        onClick={() => handleManualInsertion(slot.id)}
                                        disabled={isLoading}
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