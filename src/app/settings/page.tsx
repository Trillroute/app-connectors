'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
    const [testing, setTesting] = useState<Record<string, boolean>>({});

    const togglePasswordVisibility = (fieldName: string) => {
        setShowPasswords(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };

    const handleTest = async (integration: string) => {
        setTesting(prev => ({ ...prev, [integration]: true }));
        setMessage({ text: '', type: '' });

        try {
            const res = await fetch('/api/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ integration })
            });
            const data = await res.json();

            if (data.success) {
                setMessage({ text: data.message || `${integration} test successful!`, type: 'success' });
            } else {
                setMessage({ text: data.error || `Failed to test ${integration}`, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: `Error connecting to server for ${integration} test`, type: 'error' });
        } finally {
            setTesting(prev => ({ ...prev, [integration]: false }));
            setTimeout(() => setMessage({ text: '', type: '' }), 8000);
        }
    };

    const [settings, setSettings] = useState({
        EXOTEL_SID: '',
        EXOTEL_TOKEN: '',
        EXOTEL_API_KEY: '',
        EXOTEL_SUBDOMAIN: 'api.exotel.com',
        CODA_API_TOKEN: '',
        CODA_DOC_ID: '',
        CODA_CALL_LOGS_TABLE: 'CallLogs',
        GALLABOX_API_KEY: '',
        GALLABOX_ACCOUNT_ID: '',
        GALLABOX_CHANNEL_ID: '',
        GALLABOX_MISSED_CALL_TEMPLATE: 'missed_call_alert',
        GALLABOX_ENQUIRY_TEMPLATE: 'new_enquiry_alert',
        GALLABOX_TRIAL_CLASS_TEMPLATE: 'trial_class_booking_confirmation_no_profile',
        GALLABOX_ADMISSION_TEMPLATE: 'admission_confirmed_createnextapp2',
        GALLABOX_POLICY_OVERVIEW_TEMPLATE: 'policy_overview_for_admission',
        AUTOMATION_EXOTEL_ENABLED: 'true',
        AUTOMATION_CODA_ENABLED: 'true',
        AUTOMATION_TRIAL_CLASS_ENABLED: 'true',
        AUTOMATION_ADMISSION_ENABLED: 'true',
        AUTOMATION_POLICY_OVERVIEW_ENABLED: 'true'
    });

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) {
                    setSettings(prev => ({ ...prev, ...data.data }));
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();

            if (data.success) {
                setMessage({ text: 'Settings saved successfully!', type: 'success' });
            } else {
                setMessage({ text: data.error || 'Failed to save', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Error connecting to server', type: 'error' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading settings...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                            Integration Settings
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage your API keys for Coda and Gallabox
                        </p>
                    </div>
                    <a href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                        &larr; Back to Dashboard
                    </a>
                </header>

                {message.text && (
                    <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-8 bg-white shadow-sm border border-gray-200 rounded-xl p-6 sm:p-10">

                    {/* Exotel Section */}
                    <div className="pt-4">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-gray-900 border-gray-200">
                            <h2 className="text-lg font-semibold leading-6">Exotel Configuration</h2>
                            <button
                                type="button"
                                onClick={() => handleTest('exotel')}
                                disabled={testing['exotel'] || saving}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {testing['exotel'] ? 'Testing...' : 'Test Connection'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Account SID</label>
                                <input type="text" name="EXOTEL_SID" value={settings.EXOTEL_SID} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" placeholder="e.g. your_company_sid" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Subdomain (Region)</label>
                                <input type="text" name="EXOTEL_SUBDOMAIN" value={settings.EXOTEL_SUBDOMAIN} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" placeholder="e.g. api.exotel.com" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">API Key (Username)</label>
                                <input type="text" name="EXOTEL_API_KEY" value={settings.EXOTEL_API_KEY} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" placeholder="Paste your Exotel API Key" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">API Token (Password)</label>
                                <div className="relative mt-1">
                                    <input type={showPasswords['EXOTEL_TOKEN'] ? 'text' : 'password'} name="EXOTEL_TOKEN" value={settings.EXOTEL_TOKEN} onChange={handleChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50 pr-14" placeholder="Paste your Exotel API Token" />
                                    <button type="button" onClick={() => togglePasswordVisibility('EXOTEL_TOKEN')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-gray-500 hover:text-gray-700 focus:outline-none select-none">{showPasswords['EXOTEL_TOKEN'] ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coda Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-gray-900 border-gray-200">
                            <h2 className="text-lg font-semibold leading-6">Coda.io Configuration</h2>
                            <button
                                type="button"
                                onClick={() => handleTest('coda')}
                                disabled={testing['coda'] || saving}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {testing['coda'] ? 'Testing...' : 'Test Connection'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">API Token</label>
                                <div className="relative mt-1">
                                    <input type={showPasswords['CODA_API_TOKEN'] ? 'text' : 'password'} name="CODA_API_TOKEN" value={settings.CODA_API_TOKEN} onChange={handleChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50 pr-14" placeholder="Paste your Coda API token" />
                                    <button type="button" onClick={() => togglePasswordVisibility('CODA_API_TOKEN')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-gray-500 hover:text-gray-700 focus:outline-none select-none">{showPasswords['CODA_API_TOKEN'] ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Document ID</label>
                                <input type="text" name="CODA_DOC_ID" value={settings.CODA_DOC_ID} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" placeholder="e.g. AbC123Xyz" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Table Name/ID</label>
                                <input type="text" name="CODA_CALL_LOGS_TABLE" value={settings.CODA_CALL_LOGS_TABLE} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" />
                            </div>
                        </div>
                    </div>

                    {/* Gallabox Section */}
                    <div className="pt-4">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-gray-900 border-gray-200">
                            <h2 className="text-lg font-semibold leading-6">Gallabox WhatsApp Configuration</h2>
                            <button
                                type="button"
                                onClick={() => handleTest('gallabox')}
                                disabled={testing['gallabox'] || saving}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {testing['gallabox'] ? 'Testing...' : 'Test Connection'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">API Key</label>
                                <div className="relative mt-1">
                                    <input type={showPasswords['GALLABOX_API_KEY'] ? 'text' : 'password'} name="GALLABOX_API_KEY" value={settings.GALLABOX_API_KEY} onChange={handleChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50 pr-14" />
                                    <button type="button" onClick={() => togglePasswordVisibility('GALLABOX_API_KEY')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-gray-500 hover:text-gray-700 focus:outline-none select-none">{showPasswords['GALLABOX_API_KEY'] ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Account ID / Secret</label>
                                <div className="relative mt-1">
                                    <input type={showPasswords['GALLABOX_ACCOUNT_ID'] ? 'text' : 'password'} name="GALLABOX_ACCOUNT_ID" value={settings.GALLABOX_ACCOUNT_ID} onChange={handleChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50 pr-14" />
                                    <button type="button" onClick={() => togglePasswordVisibility('GALLABOX_ACCOUNT_ID')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-gray-500 hover:text-gray-700 focus:outline-none select-none">{showPasswords['GALLABOX_ACCOUNT_ID'] ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Channel ID</label>
                                <input type="text" name="GALLABOX_CHANNEL_ID" value={settings.GALLABOX_CHANNEL_ID} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Missed Call Template</label>
                                <input type="text" name="GALLABOX_MISSED_CALL_TEMPLATE" value={settings.GALLABOX_MISSED_CALL_TEMPLATE} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">New Enquiry Template</label>
                                <input type="text" name="GALLABOX_ENQUIRY_TEMPLATE" value={settings.GALLABOX_ENQUIRY_TEMPLATE} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Trial Class Template</label>
                                <input type="text" name="GALLABOX_TRIAL_CLASS_TEMPLATE" value={settings.GALLABOX_TRIAL_CLASS_TEMPLATE} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Admission Template</label>
                                <input type="text" name="GALLABOX_ADMISSION_TEMPLATE" value={settings.GALLABOX_ADMISSION_TEMPLATE} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Policy Template</label>
                                <input type="text" name="GALLABOX_POLICY_OVERVIEW_TEMPLATE" value={settings.GALLABOX_POLICY_OVERVIEW_TEMPLATE} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-gray-50" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
