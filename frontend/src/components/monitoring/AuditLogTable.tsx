import React, { useEffect, useState } from 'react';

import { getAuditLog } from '@/lib/api/storefrontEditor';
import type { AuditLogEntry } from '@/modules/storefront/models/audit';

interface AuditLogTableProps {
  tenantId: string;
}

const AuditLogTable: React.FC<AuditLogTableProps> = ({ tenantId }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    getAuditLog(tenantId)
      .then((data: AuditLogEntry[]) => {
        setLogs(data.filter((log: AuditLogEntry) => log.resource_type === 'conversation'));
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Conversation Audit Log</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="px-2 py-1 border">Timestamp</th>
              <th className="px-2 py-1 border">Event Type</th>
              <th className="px-2 py-1 border">User</th>
              <th className="px-2 py-1 border">Conversation ID</th>
              <th className="px-2 py-1 border">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.timestamp + log.resource_id + log.action}>
                <td className="px-2 py-1 border">{log.timestamp}</td>
                <td className="px-2 py-1 border">{log.action}</td>
                <td className="px-2 py-1 border">{log.username}</td>
                <td className="px-2 py-1 border">{log.resource_id}</td>
                <td className="px-2 py-1 border">
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AuditLogTable;
