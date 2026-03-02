import prisma from '@/lib/prisma';
import { WebhookLog } from '@prisma/client';
import AutomationToggle from '@/components/AutomationToggle';

export const dynamic = 'force-dynamic';

function formatPayload(payloadStr: string) {
  try {
    const obj = JSON.parse(payloadStr);
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return payloadStr;
  }
}

export default async function DashboardPage() {
  const logs = await prisma.webhookLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50, // Get last 50 logs
  });

  const exotelLogs = logs.filter(l => l.source === 'exotel');
  const codaLogs = logs.filter(l => l.source === 'coda');
  const codaTrialLogs = logs.filter(l => l.source === 'coda-trial');
  const codaAdmissionLogs = logs.filter(l => l.source === 'coda-admission');
  const codaPolicyLogs = logs.filter(l => l.source === 'coda-policy');
  const codaNewAccountLogs = logs.filter(l => l.source === 'coda-new-account');
  const codaSyncDevLogs = logs.filter(l => l.source === 'coda-sync-dev');
  const codaSyncLogs = logs.filter(l => l.source === 'coda-sync-student' || l.source === 'coda-sync-schedule');

  const settingsRecords = await prisma.settings.findMany({
    where: { key: { in: ['AUTOMATION_EXOTEL_ENABLED', 'AUTOMATION_CODA_ENABLED', 'AUTOMATION_TRIAL_CLASS_ENABLED', 'AUTOMATION_ADMISSION_ENABLED', 'AUTOMATION_POLICY_OVERVIEW_ENABLED', 'AUTOMATION_NEW_ACCOUNT_ENABLED'] } }
  });
  const settingsMap = settingsRecords.reduce((acc: Record<string, string>, curr: { key: string, value: string }) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const exotelEnabled = settingsMap['AUTOMATION_EXOTEL_ENABLED'] !== 'false';
  const codaEnabled = settingsMap['AUTOMATION_CODA_ENABLED'] !== 'false';
  const trialClassEnabled = settingsMap['AUTOMATION_TRIAL_CLASS_ENABLED'] !== 'false';
  const admissionEnabled = settingsMap['AUTOMATION_ADMISSION_ENABLED'] !== 'false';
  const policyEnabled = settingsMap['AUTOMATION_POLICY_OVERVIEW_ENABLED'] !== 'false';
  const newAccountEnabled = settingsMap['AUTOMATION_NEW_ACCOUNT_ENABLED'] !== 'false';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              App Connectors
            </h1>
            <p className="text-lg text-gray-500 mt-2">
              Central Hub for your Business Automations
            </p>
          </div>
          <div className="flex space-x-3">
            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              Server Online
            </span>
          </div>
        </header>

        <main className="space-y-8">

          {/* Active Automations Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Active Automations</h2>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Automation Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Missed Call Rescheduler</h3>
                    <p className="text-sm text-gray-500">Exotel &rarr; Coda Logging &rarr; Gallabox WhatsApp Notice</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <AutomationToggle
                      settingKey="AUTOMATION_EXOTEL_ENABLED"
                      initialEnabled={exotelEnabled}
                    />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                    {exotelLogs.length} total runs
                  </span>
                </div>
              </div>

              {/* Automation Logs / Activity */}
              <div className="bg-gray-50/50">
                {exotelLogs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No activity recorded for this automation yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action / Error</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Detailed Payload</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {exotelLogs.map((log: WebhookLog) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                {log.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className="font-medium">{log.action || '-'}</span>
                              {log.error && <p className="text-xs text-red-600 mt-1 font-mono break-words">{log.error}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <details className="group cursor-pointer">
                                <summary className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold uppercase tracking-wide list-none flex items-center">
                                  <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  View Data
                                </summary>
                                <div className="mt-3 p-3 bg-gray-900 rounded-lg text-xs overflow-x-auto text-green-400 font-mono shadow-inner border border-gray-800">
                                  <pre>{formatPayload(log.payload)}</pre>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Automation 2: Coda to Gallabox */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              {/* Automation Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center font-bold text-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">New Enquiry Notifier</h3>
                    <p className="text-sm text-gray-500">Coda Webhook &rarr; Gallabox WhatsApp Notice</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <AutomationToggle
                      settingKey="AUTOMATION_CODA_ENABLED"
                      initialEnabled={codaEnabled}
                    />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                    {codaLogs.length} total runs
                  </span>
                </div>
              </div>

              {/* Automation Logs / Activity */}
              <div className="bg-gray-50/50">
                {codaLogs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No activity recorded for this automation yet. Coda awaits your first enquiry!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action / Error</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Detailed Payload</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {codaLogs.map((log: WebhookLog) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                {log.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className="font-medium">{log.action || '-'}</span>
                              {log.error && <p className="text-xs text-red-600 mt-1 font-mono break-words">{log.error}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <details className="group cursor-pointer">
                                <summary className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold uppercase tracking-wide list-none flex items-center">
                                  <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  View Data
                                </summary>
                                <div className="mt-3 p-3 bg-gray-900 rounded-lg text-xs overflow-x-auto text-green-400 font-mono shadow-inner border border-gray-800">
                                  <pre>{formatPayload(log.payload)}</pre>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Automation 3: Coda Trial Class to Gallabox */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              {/* Automation Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Trial Class Confirmation</h3>
                    <p className="text-sm text-gray-500">Coda Trial Webhook &rarr; Gallabox WhatsApp Notice</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <AutomationToggle
                      settingKey="AUTOMATION_TRIAL_CLASS_ENABLED"
                      initialEnabled={trialClassEnabled}
                    />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                    {codaTrialLogs.length} total runs
                  </span>
                </div>
              </div>

              {/* Automation Logs / Activity */}
              <div className="bg-gray-50/50">
                {codaTrialLogs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No activity recorded for this automation yet. Book a trial class to see it here!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action / Error</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Detailed Payload</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {codaTrialLogs.map((log: WebhookLog) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                {log.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className="font-medium">{log.action || '-'}</span>
                              {log.error && <p className="text-xs text-red-600 mt-1 font-mono break-words">{log.error}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <details className="group cursor-pointer">
                                <summary className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold uppercase tracking-wide list-none flex items-center">
                                  <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  View Data
                                </summary>
                                <div className="mt-3 p-3 bg-gray-900 rounded-lg text-xs overflow-x-auto text-green-400 font-mono shadow-inner border border-gray-800">
                                  <pre>{formatPayload(log.payload)}</pre>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Automation 5: Coda Admission Confirmation to Gallabox */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              {/* Automation Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Admission Confirmation</h3>
                    <p className="text-sm text-gray-500">Coda Admission Webhook &rarr; Gallabox WhatsApp Notice (15 Variables)</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <AutomationToggle
                      settingKey="AUTOMATION_ADMISSION_ENABLED"
                      initialEnabled={admissionEnabled}
                    />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                    {codaAdmissionLogs.length} total runs
                  </span>
                </div>
              </div>

              {/* Automation Logs / Activity */}
              <div className="bg-gray-50/50">
                {codaAdmissionLogs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No activity recorded for this automation yet. Confirm an admission to see it here!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action / Error</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Detailed Payload</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {codaAdmissionLogs.map((log: WebhookLog) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                {log.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className="font-medium">{log.action || '-'}</span>
                              {log.error && <p className="text-xs text-red-600 mt-1 font-mono break-words">{log.error}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <details className="group cursor-pointer">
                                <summary className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold uppercase tracking-wide list-none flex items-center">
                                  <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  View Data
                                </summary>
                                <div className="mt-3 p-3 bg-gray-900 rounded-lg text-xs overflow-x-auto text-green-400 font-mono shadow-inner border border-gray-800">
                                  <pre>{formatPayload(log.payload)}</pre>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Automation 6: Policy Overview to Gallabox */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              {/* Automation Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center font-bold text-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Policy Overview</h3>
                    <p className="text-sm text-gray-500">Coda Policy Webhook &rarr; Gallabox WhatsApp Notice (6 Variables)</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <AutomationToggle
                      settingKey="AUTOMATION_POLICY_OVERVIEW_ENABLED"
                      initialEnabled={policyEnabled}
                    />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                    {codaPolicyLogs.length} total runs
                  </span>
                </div>
              </div>

              {/* Automation Logs / Activity */}
              <div className="bg-gray-50/50">
                {codaPolicyLogs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No activity recorded for this automation yet. Trigger a policy webhook to see it here!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action / Error</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Detailed Payload</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {codaPolicyLogs.map((log: WebhookLog) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                {log.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className="font-medium">{log.action || '-'}</span>
                              {log.error && <p className="text-xs text-red-600 mt-1 font-mono break-words">{log.error}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <details className="group cursor-pointer">
                                <summary className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold uppercase tracking-wide list-none flex items-center">
                                  <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  View Data
                                </summary>
                                <div className="mt-3 p-3 bg-gray-900 rounded-lg text-xs overflow-x-auto text-green-400 font-mono shadow-inner border border-gray-800">
                                  <pre>{formatPayload(log.payload)}</pre>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Automation 7: New Account Created */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              {/* Automation Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center font-bold text-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">New Account Created</h3>
                    <p className="text-sm text-gray-500">Coda Action &rarr; Gallabox Welcome Message</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <AutomationToggle
                      settingKey="AUTOMATION_NEW_ACCOUNT_ENABLED"
                      initialEnabled={newAccountEnabled}
                    />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                    {codaNewAccountLogs.length} total runs
                  </span>
                </div>
              </div>

              {/* Automation Logs / Activity */}
              <div className="bg-gray-50/50">
                {codaNewAccountLogs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No activity recorded for this automation yet. Trigger a "New Account" webhook from Coda to see it here!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action / Error</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Detailed Payload</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {codaNewAccountLogs.map((log: WebhookLog) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                {log.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className="font-medium">{log.action || '-'}</span>
                              {log.error && <p className="text-xs text-red-600 mt-1 font-mono break-words">{log.error}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <details className="group cursor-pointer">
                                <summary className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold uppercase tracking-wide list-none flex items-center">
                                  <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  View Data
                                </summary>
                                <div className="mt-3 p-3 bg-gray-900 rounded-lg text-xs overflow-x-auto text-green-400 font-mono shadow-inner border border-gray-800">
                                  <pre>{formatPayload(log.payload)}</pre>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Automation 4: Coda Schedule Database Sync */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              {/* Automation Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Database Synchronization</h3>
                    <p className="text-sm text-gray-500">Real-time Coda Table to Local Database Updates</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                    {codaSyncLogs.length} synced rows
                  </span>
                </div>
              </div>

              {/* Automation Logs / Activity */}
              <div className="bg-gray-50/50">
                {codaSyncLogs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No database syncs recorded yet. Awaiting Coda Row Updates.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status / Action</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Detailed Payload</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {codaSyncLogs.map((log: WebhookLog) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.source.includes('student') ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                {log.source.replace('coda-sync-', '').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className="font-medium">{log.action || '-'}</span>
                              {log.error && <p className="text-xs text-red-600 mt-1 font-mono break-words">{log.error}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <details className="group cursor-pointer">
                                <summary className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold uppercase tracking-wide list-none flex items-center">
                                  <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  View Data
                                </summary>
                                <div className="mt-3 p-3 bg-gray-900 rounded-lg text-xs overflow-x-auto text-green-400 font-mono shadow-inner border border-gray-800">
                                  <pre>{formatPayload(log.payload)}</pre>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {/* DEV: Coda Sync Schema Inspector */}
            {codaSyncDevLogs.length > 0 && (
              <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden mt-8">
                <div className="px-6 py-5 border-b border-yellow-200 flex items-center justify-between bg-yellow-100/50">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-yellow-200 text-yellow-700 rounded-lg flex items-center justify-center font-bold text-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-yellow-900">DEV: Coda Sync Schema Inspector</h3>
                      <p className="text-sm text-yellow-700">Capturing raw row changes for Local Database building</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50/50">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-yellow-200">
                      <thead className="bg-yellow-100/30">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider w-2/3">Raw JSON Schema</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-yellow-100">
                        {codaSyncDevLogs.map((log: WebhookLog) => (
                          <tr key={log.id} className="hover:bg-yellow-50/50 transition-colors duration-150 ease-in-out">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <details className="group cursor-pointer" open>
                                <summary className="text-yellow-600 hover:text-yellow-800 text-xs font-semibold uppercase tracking-wide list-none flex items-center">
                                  <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  Inspect JSON
                                </summary>
                                <div className="mt-3 p-3 bg-gray-900 rounded-lg text-xs overflow-x-auto text-green-400 font-mono shadow-inner border border-gray-800">
                                  <pre>{formatPayload(log.payload)}</pre>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div >
    </div >
  );
}
