import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { DateTime } from 'luxon';
import { getErrorMessage } from './lib/errors';

interface TestResult {
    threadId: number;
    status: 'pending' | 'success' | 'failed';
    message: string;
}

interface Professional {
    id: number;
    default_duration_minutes: number;
}

interface Availability {
    day_of_week: number;
    start_time: string;
}

interface LoadMetrics {
    totalRequests: number;
    successful: number;
    failed: number;
    totalTimeMs: number;
    avgLatencyMs: number;
}

export default function StressTest() {
    const [concurrencyResults, setConcurrencyResults] = useState<TestResult[]>([]);
    const [loadMetrics, setLoadMetrics] = useState<LoadMetrics | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    
    const [targetProfessional, setTargetProfessional] = useState<Professional | null>(null);
    const [targetAvailability, setTargetAvailability] = useState<Availability | null>(null);

    useEffect(() => {
        const fetchTargetEnvironment = async () => {
            try {
                // Fetch the first available professional
                const { data: profData, error: profError } = await supabase
                    .from('professionals')
                    .select('id, default_duration_minutes')
                    .limit(1)
                    .single();

                if (profError) throw new Error(profError.message);
                setTargetProfessional(profData);

                // Fetch a real schedule for this professional to bypass operational RPC checks
                const { data: availData, error: availError } = await supabase
                    .from('availabilities')
                    .select('day_of_week, start_time')
                    .eq('professional_id', profData.id)
                    .limit(1)
                    .single();

                if (availError) throw new Error('Professional has no working hours configured.');
                setTargetAvailability(availData);

            } catch (error) {
                console.error('Failed to initialize test harness:', getErrorMessage(error));
            }
        };
        
        fetchTargetEnvironment();
    }, []);

    const executeConcurrencyAttack = async () => {
        if (!targetProfessional || !targetAvailability) return;

        setIsTesting(true);
        setConcurrencyResults([]);
        setLoadMetrics(null);

        const today = DateTime.local({ zone: 'Europe/Malta' });
        
        // Strict Type Casting to satisfy Luxon's WeekdayNumbers interface
        const targetLuxonDow = (targetAvailability.day_of_week === 0 ? 7 : targetAvailability.day_of_week) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
        
        const [hours, minutes] = targetAvailability.start_time.split(':');
        
        // Calculate a strict invariant time exactly 1 month into the future
        const testDate = today.plus({ months: 1 })
            .set({ weekday: targetLuxonDow })
            .set({ hour: parseInt(hours), minute: parseInt(minutes), second: 0, millisecond: 0 });

        const startUtc = testDate.toUTC().toISO();
        const endUtc = testDate.plus({ minutes: targetProfessional.default_duration_minutes }).toUTC().toISO();

        if (!startUtc || !endUtc) {
            setIsTesting(false);
            return;
        }

        const THREAD_COUNT = 5;
        const initialResults: TestResult[] = Array.from({ length: THREAD_COUNT }, (_, i) => ({
            threadId: i + 1,
            status: 'pending',
            message: 'Firing RPC...'
        }));
        setConcurrencyResults(initialResults);

        // Build identical payloads simulating users hitting confirm at the exact same millisecond
        const rpcPayload = {
            p_professional_id: targetProfessional.id,
            p_room_number: 1,
            p_client_name: 'Concurrency Phantom',
            p_client_phone: '00000000',
            p_start_time_utc: startUtc,
            p_end_time_utc: endUtc,
            p_staff_username: 'System_Test'
        };

        const createPromise = async (threadId: number) => {
            const { error } = await supabase.rpc('book_appointment_secure', rpcPayload);
            if (error) {
                throw new Error(`Thread ${threadId} Rejected: ${error.message}`);
            }
            return `Thread ${threadId} Success: Appointment inserted safely.`;
        };

        try {
            // Fire all promises simultaneously
            const promises = Array.from({ length: THREAD_COUNT }, (_, i) => createPromise(i + 1));
            const results = await Promise.allSettled(promises);

            const finalResults: TestResult[] = results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return { threadId: index + 1, status: 'success', message: result.value };
                } else {
                    return { threadId: index + 1, status: 'failed', message: getErrorMessage(result.reason) };
                }
            });

            setConcurrencyResults(finalResults);

            // Automated Teardown
            await supabase.from('appointments').delete().eq('client_name', 'Concurrency Phantom');

        } catch (error) {
            console.error('Catastrophic failure in test harness:', getErrorMessage(error));
        } finally {
            setIsTesting(false);
        }
    };

    const executeVolumeLoadTest = async () => {
        if (!targetProfessional || !targetAvailability) return;

        setIsTesting(true);
        setLoadMetrics(null);
        setConcurrencyResults([]);

        const BATCH_SIZE = 15;
        const today = DateTime.local({ zone: 'Europe/Malta' });
        
        // Strict Type Casting to satisfy Luxon's WeekdayNumbers interface
        const targetLuxonDow = (targetAvailability.day_of_week === 0 ? 7 : targetAvailability.day_of_week) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
        const [hours, minutes] = targetAvailability.start_time.split(':');

        const promises = [];

        // Generate distinct, valid future appointments to bypass business logic locks and purely test DB write throughput
        for (let i = 1; i <= BATCH_SIZE; i++) {
            const testDate = today.plus({ months: 2, weeks: i })
                .set({ weekday: targetLuxonDow })
                .set({ hour: parseInt(hours), minute: parseInt(minutes), second: 0, millisecond: 0 });

            const startUtc = testDate.toUTC().toISO();
            const endUtc = testDate.plus({ minutes: targetProfessional.default_duration_minutes }).toUTC().toISO();

            const rpcPayload = {
                p_professional_id: targetProfessional.id,
                p_room_number: 1,
                p_client_name: `Volume Phantom ${i}`,
                p_client_phone: '11111111',
                p_start_time_utc: startUtc,
                p_end_time_utc: endUtc,
                p_staff_username: 'System_Test'
            };

            promises.push(supabase.rpc('book_appointment_secure', rpcPayload));
        }

        const startTime = performance.now();

        try {
            const results = await Promise.allSettled(promises);
            const endTime = performance.now();
            
            const durationMs = endTime - startTime;
            const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
            const failed = BATCH_SIZE - successful;

            setLoadMetrics({
                totalRequests: BATCH_SIZE,
                successful,
                failed,
                totalTimeMs: Math.round(durationMs),
                avgLatencyMs: Math.round(durationMs / BATCH_SIZE)
            });

            // Automated Teardown: Purge all volume test records
            await supabase.from('appointments').delete().like('client_name', 'Volume Phantom%');

        } catch (error) {
            console.error('Load test failure:', getErrorMessage(error));
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 h-full overflow-y-auto custom-scrollbar flex flex-col gap-6 pb-16 bg-pharmacy-cream">
            <div className="shrink-0 border-b border-pharmacy-ink/10 pb-4">
                <p className="text-xs font-semibold tracking-[0.2em] text-pharmacy-gold-dark uppercase">System Diagnostics</p>
                <h1 className="font-display text-3xl text-pharmacy-ink">Infrastructure Stress Tests</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 shrink-0">
                {/* Concurrency Test Panel */}
                <div className="bg-white p-6 rounded-xl border border-pharmacy-ink/10 shadow-sm flex flex-col gap-4">
                    <h2 className="font-display text-xl text-pharmacy-ink">1. Concurrency (Row Lock)</h2>
                    <p className="text-sm text-pharmacy-muted">
                        Fires 5 identical appointment insertions at the exact same millisecond for the same time slot. 
                        Validates PostgreSQL pessimistic locking (SELECT FOR UPDATE). Only 1 thread should succeed.
                    </p>
                    <button
                        onClick={executeConcurrencyAttack}
                        disabled={isTesting || !targetProfessional || !targetAvailability}
                        className="w-full mt-auto bg-pharmacy-gold text-pharmacy-green hover:bg-pharmacy-gold-dark hover:text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all disabled:opacity-50"
                    >
                        {isTesting ? 'Testing Concurrency...' : 'Launch Collision Test'}
                    </button>
                </div>

                {/* Volume Load Test Panel */}
                <div className="bg-white p-6 rounded-xl border border-pharmacy-ink/10 shadow-sm flex flex-col gap-4">
                    <h2 className="font-display text-xl text-pharmacy-ink">2. Database Throughput (Volume)</h2>
                    <p className="text-sm text-pharmacy-muted">
                        Generates a batch of 15 valid, sequential appointments and fires them simultaneously to test connection pooler limits and calculate average API response latency.
                    </p>
                    <button
                        onClick={executeVolumeLoadTest}
                        disabled={isTesting || !targetProfessional || !targetAvailability}
                        className="w-full mt-auto bg-pharmacy-green text-white hover:bg-pharmacy-green-light font-bold py-3 px-6 rounded-lg shadow-md transition-all disabled:opacity-50"
                    >
                        {isTesting ? 'Saturating API...' : 'Launch Volume Test'}
                    </button>
                </div>
            </div>

            {/* Results Output Section */}
            <div className="shrink-0">
                {concurrencyResults.length > 0 && (
                    <div className="flex flex-col gap-3 mt-4">
                        <h3 className="font-display text-lg text-pharmacy-ink">Concurrency Results:</h3>
                        {concurrencyResults.map((res) => (
                            <div
                                key={res.threadId}
                                className={`p-4 rounded-lg border font-mono text-sm shadow-sm ${
                                    res.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                    res.status === 'failed' ? 'bg-red-50 border-red-200 text-red-800' :
                                    'bg-pharmacy-cream-dark border-pharmacy-ink/10 text-pharmacy-muted animate-pulse'
                                }`}
                            >
                                <span className="font-bold mr-2">[THREAD 0{res.threadId}]</span>
                                {res.message}
                            </div>
                        ))}
                    </div>
                )}

                {loadMetrics && (
                    <div className="flex flex-col gap-4 mt-4 bg-white p-6 rounded-xl border border-pharmacy-ink/10 shadow-sm">
                        <h3 className="font-display text-lg text-pharmacy-ink">Throughput Telemetry:</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-pharmacy-cream p-4 rounded-lg border border-pharmacy-ink/5 flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-bold text-pharmacy-muted uppercase tracking-wider">Payload</span>
                                <span className="text-2xl font-bold text-pharmacy-ink">{loadMetrics.totalRequests} Req</span>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-bold text-emerald-600/80 uppercase tracking-wider">Successful</span>
                                <span className="text-2xl font-bold text-emerald-700">{loadMetrics.successful}</span>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-bold text-red-600/80 uppercase tracking-wider">Failed</span>
                                <span className="text-2xl font-bold text-red-700">{loadMetrics.failed}</span>
                            </div>
                            <div className="bg-pharmacy-cream-dark p-4 rounded-lg border border-pharmacy-ink/10 flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-bold text-pharmacy-muted uppercase tracking-wider">Avg Latency</span>
                                <span className="text-2xl font-mono text-pharmacy-ink">{loadMetrics.avgLatencyMs}ms</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}