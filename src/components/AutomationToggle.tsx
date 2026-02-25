'use client';

import { useState } from 'react';

export default function AutomationToggle({
    settingKey,
    initialEnabled,
    label,
    description
}: {
    settingKey: string;
    initialEnabled: boolean;
    label?: string;
    description?: string;
}) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        if (loading) return;
        setLoading(true);

        const newValue = !enabled;
        setEnabled(newValue); // Optimistic UI update

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [settingKey]: newValue ? 'true' : 'false' })
            });
            const data = await res.json();

            if (!data.success) {
                setEnabled(!newValue); // Revert on logic failure
                console.error("Failed to save toggle state:", data.error);
            }
        } catch (error) {
            setEnabled(!newValue); // Revert on network failure
            console.error("Error updating toggle:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between">
            {label && (
                <div className="mr-4">
                    <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
                    {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
                </div>
            )}
            <button
                type="button"
                onClick={toggle}
                disabled={loading}
                className={`${enabled ? 'bg-green-500' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50`}
                role="switch"
                aria-checked={enabled}
            >
                <span
                    aria-hidden="true"
                    className={`${enabled ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
            </button>
        </div>
    );
}
