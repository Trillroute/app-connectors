'use client';

import { useState, useEffect } from 'react';

type VariableMapping = {
    templateVar: string;
    codaField: string;
};

type CustomAutomation = {
    id: string;
    name: string;
    triggerEventType: string;
    gallaboxTemplateName: string;
    isActive: boolean;
    variableMappings: string;
    createdAt: string;
};

export default function BuilderPage() {
    const [automations, setAutomations] = useState<CustomAutomation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [triggerEventType, setTriggerEventType] = useState('');
    const [gallaboxTemplateName, setGallaboxTemplateName] = useState('');
    const [mappings, setMappings] = useState<VariableMapping[]>([{ templateVar: '', codaField: '' }]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAutomations();
    }, []);

    const fetchAutomations = async () => {
        try {
            const res = await fetch('/api/automations');
            const data = await res.json();
            if (data.success) {
                setAutomations(data.automations);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMapping = () => {
        setMappings([...mappings, { templateVar: '', codaField: '' }]);
    };

    const handleRemoveMapping = (index: number) => {
        const newMap = [...mappings];
        newMap.splice(index, 1);
        setMappings(newMap);
    };

    const handleMappingChange = (index: number, field: keyof VariableMapping, value: string) => {
        const newMap = [...mappings];
        newMap[index][field] = value;
        setMappings(newMap);
    };

    const handleSaveAutomation = async () => {
        setError(null);
        if (!name || !triggerEventType || !gallaboxTemplateName) {
            setError('Please fill out all required core fields.');
            return;
        }

        // Filter out empty mappings dynamically
        const filteredMappings = mappings.filter(m => m.templateVar.trim() && m.codaField.trim());

        try {
            const res = await fetch('/api/automations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    triggerEventType,
                    gallaboxTemplateName,
                    variableMappings: filteredMappings
                })
            });
            const data = await res.json();
            if (data.success) {
                // Reset Form
                setIsCreating(false);
                setName('');
                setTriggerEventType('');
                setGallaboxTemplateName('');
                setMappings([{ templateVar: '', codaField: '' }]);
                fetchAutomations();
            } else {
                setError(data.error || 'Failed to save automation.');
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            await fetch('/api/automations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !currentStatus })
            });
            fetchAutomations();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this automation?')) return;
        try {
            await fetch(`/api/automations?id=${id}`, { method: 'DELETE' });
            fetchAutomations();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Automation Builder</h1>
                        <p className="text-lg text-gray-500 mt-2">Design your own Coda-to-WhatsApp rules on the fly.</p>
                    </div>
                    <a href="/" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition">
                        &larr; Back to Dashboard
                    </a>
                </header>

                <main className="space-y-8">
                    {!isCreating ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-8 text-center">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Build a New Hook</h2>
                            <p className="text-sm text-gray-500 mb-6 max-w-lg mx-auto">Create a custom automation triggered by any arbitrary `eventType` originating from your Coda application.</p>
                            <button onClick={() => setIsCreating(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition">
                                + Create Automation
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden p-6 ring-1 ring-black ring-opacity-5">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Configure Blueprint</h2>
                                <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {error && <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>}

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Automation Title</label>
                                    <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g. Workshop Registration Reminder" className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Coda `eventType` Hook</label>
                                        <input value={triggerEventType} onChange={e => setTriggerEventType(e.target.value)} type="text" placeholder="e.g. WorkshopReg" className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                        <p className="text-xs text-gray-500 mt-1">This is the string your Coda button must emit as its eventType.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gallabox WhatsApp Template</label>
                                        <input value={gallaboxTemplateName} onChange={e => setGallaboxTemplateName(e.target.value)} type="text" placeholder="e.g. workshop_reminder" className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200 mt-6">
                                    <h3 className="text-md font-medium text-gray-900 mb-1">Dynamic Variables Mapping</h3>
                                    <p className="text-xs text-gray-500 mb-4">Map the incoming Coda keys (e.g. `studentName`) directly to the WhatsApp Template Variable expectations (e.g. `name`).</p>

                                    {mappings.map((mapping, idx) => (
                                        <div key={idx} className="flex space-x-3 mb-3 items-center">
                                            <input value={mapping.codaField} onChange={e => handleMappingChange(idx, 'codaField', e.target.value)} type="text" placeholder="Coda Variable (e.g., studentName)" className="flex-1 border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                            <span className="text-gray-400 font-bold">&rarr;</span>
                                            <input value={mapping.templateVar} onChange={e => handleMappingChange(idx, 'templateVar', e.target.value)} type="text" placeholder="Template Parameter (e.g., name)" className="flex-1 border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                            <button onClick={() => handleRemoveMapping(idx)} className="text-red-400 hover:text-red-600 transition">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))}

                                    <button onClick={handleAddMapping} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition">
                                        + Add Mapping
                                    </button>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button onClick={handleSaveAutomation} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition shadow-sm">
                                        Deploy Blueprint
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Automation List */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 mt-12 mb-4">Active Custom Blueprints</h2>
                        {isLoading ? (
                            <div className="text-sm text-gray-500 animate-pulse">Loading engine configurations...</div>
                        ) : automations.length === 0 ? (
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                                <span className="text-gray-400">No active custom blueprints deployed yet.</span>
                            </div>
                        ) : (
                            automations.map(auto => (
                                <div key={auto.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center space-x-3 mb-1">
                                            <h3 className="text-lg font-bold text-gray-900">{auto.name}</h3>
                                            <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                                                {auto.triggerEventType}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 font-mono text-xs">{auto.gallaboxTemplateName}</p>
                                        <div className="mt-3 flex space-x-2">
                                            {(() => {
                                                try {
                                                    const maps = JSON.parse(auto.variableMappings);
                                                    return maps.map((m: any, i: number) => (
                                                        <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                            {m.codaField} &rarr; {m.templateVar}
                                                        </span>
                                                    ));
                                                } catch (e) {
                                                    return <span className="text-xs text-red-500">Invalid JSON Map</span>;
                                                }
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-6">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm text-gray-500 font-medium">Status:</span>
                                            <button
                                                onClick={() => handleToggle(auto.id, auto.isActive)}
                                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${auto.isActive ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                            >
                                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${auto.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                        <button onClick={() => handleDelete(auto.id)} className="text-gray-400 hover:text-red-500 transition">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                </main>
            </div>
        </div>
    );
}
