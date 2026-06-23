import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface Professional {
    id: number;
    full_name: string;
    specialty: string;
    default_duration_minutes: number;
}

interface Availability {
    id: number;
    professional_id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
}

interface Appointment {
    id: number;
    professional_id: number;
    client_name: string;
    start_time_utc: string;
    end_time_utc: string;
    status: string;
}

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedProfessionalId: string;
    professionals: Professional[];
}

export default function AppointmentModal({ isOpen, onClose, onSuccess, selectedProfessionalId, professionals }: AppointmentModalProps) {
    const [currentUserRole, setCurrentUserRole] = useState<'PHARMACIST' | 'DOCTOR'>('PHARMACIST');
    const [staffUsername, setStaffUsername] = useState('System');
    
    // Core Form State
    const [modalProfessionalId, setModalProfessionalId] = useState(selectedProfessionalId);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [roomNumber, setRoomNumber] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // UI Panels & Selection
    const [activePanel, setActivePanel] = useState<'NONE' | 'DATE' | 'TIME'>('NONE');
    const [confirmedDate, setConfirmedDate] = useState<Date | null>(null);
    const [confirmedTime, setConfirmedTime] = useState<string | null>(null);
    const [tempDate, setTempDate] = useState<Date | null>(null);
    const [tempTime, setTempTime] = useState<string | null>(null);

    // Optimized Memory State
    const [monthAvailabilities, setMonthAvailabilities] = useState<Availability[]>([]);
    const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]);
    const [availableSlots, setAvailableSlots] = useState<{ time: string; isBooked: boolean }[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // 1. Initialization and RBAC Check
    useEffect(() => {
        if (!isOpen) return;
        
        setModalProfessionalId(selectedProfessionalId);
        setActivePanel('NONE');
        setConfirmedDate(null);
        setConfirmedTime(null);
        setClientName('');
        setClientPhone('');
        setErrorMessage('');
        setRoomNumber('1');

        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const username = user?.user_metadata?.username || 'System';
            setStaffUsername(username);
            
            if (username.startsWith('D-')) {
                setCurrentUserRole('DOCTOR');
                const doctorName = username.split('-')[1];
                const matchingProf = professionals.find(p => p.full_name.includes(doctorName));
                if (matchingProf) setModalProfessionalId(matchingProf.id.toString());
            } else {
                setCurrentUserRole('PHARMACIST');
            }
        };
        fetchUser();
    }, [isOpen, selectedProfessionalId, professionals]);

    // 2. Fetch Base Month Data
    useEffect(() => {
        if (!isOpen || !modalProfessionalId) return;

        const fetchMonthData = async () => {
            const [availRes, apptRes] = await Promise.all([
                supabase.from('availabilities').select('*').eq('professional_id', modalProfessionalId),
                supabase.from('appointments').select('*').eq('professional_id', modalProfessionalId)
                    .gte('start_time_utc', new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString())
                    .lte('start_time_utc', new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59).toISOString())
            ]);
            
            setMonthAvailabilities(availRes.data || []);
            setMonthAppointments(apptRes.data || []);
        };
        fetchMonthData();
    }, [modalProfessionalId, currentMonth, isOpen]);

    // 3. Slot Generation Engine
    useEffect(() => {
        if (!confirmedDate || !modalProfessionalId) return;
        
        const dayOfWeek = confirmedDate.getDay();
        const offset = confirmedDate.getTimezoneOffset();
        const localDate = new Date(confirmedDate.getTime() - (offset * 60 * 1000));
        const selectedDateString = localDate.toISOString().split('T')[0];
        
        const dayAvails = monthAvailabilities.filter(a => a.day_of_week === dayOfWeek);
        const currentProfessional = professionals.find(p => p.id.toString() === modalProfessionalId);
        const duration = currentProfessional ? currentProfessional.default_duration_minutes : 15;

        const generatedSlots: { time: string; isBooked: boolean }[] = [];

        dayAvails.forEach(avail => {
            let currentSlot = new Date(`${selectedDateString}T${avail.start_time}`);
            const endTime = new Date(`${selectedDateString}T${avail.end_time}`);

            while (currentSlot < endTime) {
                const timeString = currentSlot.toTimeString().substring(0, 5);
                const isBooked = monthAppointments.some(appt => {
                    const apptDate = new Date(appt.start_time_utc);
                    const apptOffset = apptDate.getTimezoneOffset();
                    const localApptDate = new Date(apptDate.getTime() - (apptOffset * 60 * 1000));
                    return localApptDate.toISOString().split('T')[0] === selectedDateString &&
                           apptDate.toTimeString().substring(0, 5) === timeString &&
                           appt.status !== 'cancelled';
                });

                generatedSlots.push({ time: timeString, isBooked });
                currentSlot = new Date(currentSlot.getTime() + duration * 60000);
            }
        });

        generatedSlots.sort((a, b) => a.time.localeCompare(b.time));
        setAvailableSlots(generatedSlots);
    }, [confirmedDate, monthAvailabilities, monthAppointments, modalProfessionalId, professionals]);

    if (!isOpen) return null;

    // Strict Phone Sanitization
    const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const onlyNumbers = e.target.value.replace(/\D/g, '');
        if (onlyNumbers.length <= 9) setClientPhone(onlyNumbers);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);

        if (!clientName.trim() || clientPhone.length < 8 || !confirmedDate || !confirmedTime) {
            setErrorMessage('All fields are required. Phone must be at least 8 digits.');
            setIsSubmitting(false);
            return;
        }

        const currentProfessional = professionals.find(p => p.id.toString() === modalProfessionalId);
        const durationMinutes = currentProfessional ? currentProfessional.default_duration_minutes : 15;

        const offset = confirmedDate.getTimezoneOffset();
        const localDate = new Date(confirmedDate.getTime() - (offset * 60 * 1000));
        const dateString = localDate.toISOString().split('T')[0];
        
        const startDateTime = new Date(`${dateString}T${confirmedTime}`);
        const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

        try {
            const { error: insertError } = await supabase.from('appointments').insert({
                professional_id: parseInt(modalProfessionalId),
                room_number: parseInt(roomNumber),
                client_name: clientName.trim(),
                client_phone: clientPhone,
                start_time_utc: startDateTime.toISOString(),
                end_time_utc: endDateTime.toISOString(),
                status: 'confirmed',
                created_by_username: staffUsername
            });

            if (insertError) throw insertError;
            
            onSuccess();
            onClose();
        } catch (error: any) {
            setErrorMessage(error.message || 'System error during reservation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calendar Generation Logic
    const getDayColorClass = (dateObj: Date, isSelected: boolean) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (isSelected) return 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300';
        if (dateObj < today) return 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';

        const dayAvails = monthAvailabilities.filter(a => a.day_of_week === dateObj.getDay());
        if (dayAvails.length === 0) return 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';

        let totalSlots = 0;
        let bookedSlots = 0;
        const currentProfessional = professionals.find(p => p.id.toString() === modalProfessionalId);
        const duration = currentProfessional ? currentProfessional.default_duration_minutes : 15;
        
        const offset = dateObj.getTimezoneOffset();
        const localDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
        const selectedDateString = localDate.toISOString().split('T')[0];

        dayAvails.forEach(avail => {
            let currentSlot = new Date(`${selectedDateString}T${avail.start_time}`);
            const endTime = new Date(`${selectedDateString}T${avail.end_time}`);
            while (currentSlot < endTime) {
                totalSlots++;
                const timeString = currentSlot.toTimeString().substring(0, 5);
                const isBooked = monthAppointments.some(appt => {
                    const apptDate = new Date(appt.start_time_utc);
                    const apptOffset = apptDate.getTimezoneOffset();
                    const localApptDate = new Date(apptDate.getTime() - (apptOffset * 60 * 1000));
                    return localApptDate.toISOString().split('T')[0] === selectedDateString &&
                           apptDate.toTimeString().substring(0, 5) === timeString &&
                           appt.status !== 'cancelled';
                });
                if (isBooked) bookedSlots++;
                currentSlot = new Date(currentSlot.getTime() + duration * 60000);
            }
        });

        if (totalSlots === 0) return 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';
        if (bookedSlots >= totalSlots) return 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-semibold';
        
        return 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:shadow-sm font-semibold transition-all';
    };

    const renderCalendarInner = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const jsDay = new Date(year, month, 1).getDay();
        const firstDayIndex = (jsDay + 6) % 7; 
        const days = [];

        for (let i = 0; i < firstDayIndex; i++) {
            days.push(<div key={`empty-${i}`} className="h-9"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            const isSelected = tempDate?.toDateString() === dateObj.toDateString();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isDisabled = (dateObj < today) || !monthAvailabilities.some(a => a.day_of_week === dateObj.getDay());

            days.push(
                <button
                    key={i}
                    onClick={() => !isDisabled && setTempDate(dateObj)}
                    disabled={isDisabled}
                    className={`h-9 w-full rounded-md text-sm transition-colors ${getDayColorClass(dateObj, isSelected)}`}
                >
                    {i}
                </button>
            );
        }

        return (
            <>
                <div className="flex items-center justify-between mb-4 px-2 shrink-0">
                    <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1 hover:bg-gray-100 rounded text-gray-600">←</button>
                    <span className="font-semibold text-gray-800">{currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-100 rounded text-gray-600">→</button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center mb-2 text-xs font-bold text-gray-400 shrink-0">
                    <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 shrink-0">
                    {days}
                </div>

                <div className="flex justify-center gap-4 mt-6 mb-2 text-xs font-medium text-gray-500 shrink-0">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200"></span> Unavailable</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span> Available</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></span> Booked</div>
                </div>
            </>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-4xl h-fit max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                
                {/* Left Panel: Primary Form */}
                <div className="w-1/2 p-6 border-r border-gray-100 bg-gray-50/30 flex flex-col">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 shrink-0">Book Appointment</h2>
                    
                    {errorMessage && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-600 font-medium shrink-0">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-4 flex-1 flex flex-col">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Attending Professional</label>
                            <select 
                                value={modalProfessionalId}
                                onChange={(e) => setModalProfessionalId(e.target.value)}
                                disabled={currentUserRole === 'DOCTOR'}
                                className="w-full rounded-lg border border-gray-300 p-2 text-gray-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                {professionals.map(prof => (
                                    <option key={prof.id} value={prof.id}>{prof.full_name} ({prof.specialty})</option>
                                ))}
                            </select>
                            {currentUserRole === 'DOCTOR' && <span className="text-xs text-blue-600 font-medium mt-1 inline-block">Role locked to current user</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Patient Full Name</label>
                            <input 
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                            <div className="flex shadow-sm rounded-lg overflow-hidden border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 bg-white">
                                <span className="flex items-center justify-center bg-gray-100 px-3 text-sm font-medium text-gray-600 border-r border-gray-300">
                                    +356
                                </span>
                                <input 
                                    type="text"
                                    value={clientPhone}
                                    onChange={handlePhoneInput}
                                    className="w-full p-2 focus:outline-none"
                                    placeholder="99998888"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                                <button 
                                    type="button"
                                    onClick={() => setActivePanel('DATE')}
                                    className={`w-full text-left rounded-lg border p-2 shadow-sm transition-colors ${activePanel === 'DATE' ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                                >
                                    {confirmedDate ? confirmedDate.toLocaleDateString('en-GB') : <span className="text-gray-400">Select day...</span>}
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                                <button 
                                    type="button"
                                    disabled={!confirmedDate}
                                    onClick={() => setActivePanel('TIME')}
                                    className={`w-full text-left rounded-lg border p-2 shadow-sm transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${activePanel === 'TIME' ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                                >
                                    {confirmedTime ? confirmedTime : <span className={!confirmedDate ? 'text-gray-400' : 'text-gray-500'}>Select time...</span>}
                                </button>
                            </div>
                        </div>

                        <div className="pt-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Clinic Room</label>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="room" value="1" checked={roomNumber === '1'} onChange={(e) => setRoomNumber(e.target.value)} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                                    <span className="text-sm text-gray-700 font-medium">Room 1</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="room" value="2" checked={roomNumber === '2'} onChange={(e) => setRoomNumber(e.target.value)} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                                    <span className="text-sm text-gray-700 font-medium">Room 2</span>
                                </label>
                            </div>
                        </div>

                        {/* Left Panel Footer Pinned */}
                        <div className="mt-auto pt-4 border-t border-gray-200 flex justify-between items-center shrink-0">
                            <button type="button" onClick={onClose} disabled={isSubmitting} className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition">
                                Cancel & Close
                            </button>
                            <button type="submit" disabled={isSubmitting || !clientName || clientPhone.length < 8 || !confirmedDate || !confirmedTime} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none transition-all">
                                {isSubmitting ? 'Saving...' : 'Confirm Appointment'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Panel: Shared Flex Context */}
                <div className="w-1/2 p-6 bg-white flex flex-col">
                    
                    {activePanel === 'NONE' && (
                        <div className="m-auto flex flex-col items-center justify-center text-gray-400">
                            <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <p className="text-center font-medium">Click on Date or Time<br/>to open the configuration panel.</p>
                        </div>
                    )}

                    {activePanel === 'DATE' && (
                        <>
                            <h3 className="text-lg font-bold text-gray-800 mb-6 shrink-0">Select Appointment Date</h3>
                            
                            {renderCalendarInner()}

                            {/* Right Panel Footer Pinned */}
                            <div className="mt-auto pt-4 border-t border-gray-200 flex justify-end shrink-0">
                                <button
                                    onClick={() => {
                                        if (tempDate) { setConfirmedDate(tempDate); setConfirmedTime(null); setActivePanel('NONE'); }
                                    }}
                                    disabled={!tempDate}
                                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm disabled:opacity-50 disabled:shadow-none shadow-md hover:bg-blue-700 transition-all"
                                >
                                    Save Date
                                </button>
                            </div>
                        </>
                    )}

                    {activePanel === 'TIME' && (
                        <>
                            <div className="shrink-0">
                                <h3 className="text-lg font-bold text-gray-800 mb-1">Select Time Slot</h3>
                                <p className="text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">Availability for {confirmedDate?.toLocaleDateString('en-GB')}</p>
                            </div>
                            
                            {availableSlots.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center">
                                    No available working hours for this professional today.
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="grid grid-cols-3 gap-3 pb-2">
                                        {availableSlots.map((slot, idx) => (
                                            <button
                                                key={idx}
                                                disabled={slot.isBooked}
                                                onClick={() => setTempTime(slot.time)}
                                                className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                                                    slot.isBooked 
                                                        ? 'bg-red-50 border-red-100 text-red-400 cursor-not-allowed line-through' 
                                                        : tempTime === slot.time
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-105'
                                                            : 'bg-white border-blue-100 text-blue-700 hover:border-blue-500 hover:text-blue-800 hover:bg-blue-50'
                                                }`}
                                            >
                                                {slot.time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Right Panel Footer Pinned */}
                            <div className="mt-auto pt-4 border-t border-gray-200 flex justify-end shrink-0">
                                <button
                                    onClick={() => { if (tempTime) { setConfirmedTime(tempTime); setActivePanel('NONE'); } }}
                                    disabled={!tempTime}
                                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm disabled:opacity-50 disabled:shadow-none shadow-md hover:bg-blue-700 transition-all"
                                >
                                    Save Time
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}